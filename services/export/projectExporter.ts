import { Presentation, ExportResult, AIInteractionHistoryItem, AIInteractionType, AIInteractionStatus } from '../../types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { 
  createVersionMetadata, 
  getVersionString, 
  APP_VERSION, 
  CURRENT_FILE_FORMAT_VERSION 
} from '../../utils/versionManager';
import { checkAndUpgradePresentation, checkImportCompatibility } from '../storageService';
import {
  generateFilename,
  createErrorResult,
  createSuccessResult,
  validatePresentation
} from './exportUtils';
import { sanitizePresentationImages } from '../../utils/imageDataValidator';
import { notify } from '../../utils/notificationService';
import { handleProjectSaveError, handleProjectImportError } from '../../utils/errorHandler';

// =================================================================
// Project Export Service - SlideMaster project format export/import
// =================================================================

/**
 * Export presentation as SlideMaster project file (Original ZIP format)
 */
export const exportProject = async (presentation: Presentation): Promise<ExportResult> => {
  // Show loading notification
  const loadingToastId = notify.projectSave('start');
  
  try {
    validatePresentation(presentation);

    // Sanitize image data to ensure project can be saved even with failed image generation
    const { presentation: sanitizedPresentation, sanitizedCount, errors } = sanitizePresentationImages(presentation);
    
    if (sanitizedCount > 0) {
      console.warn(`Sanitized ${sanitizedCount} invalid image data entries during export:`, errors);
    }

    const zip = new JSZip();
    
    // Add presentation data (using sanitized version)
    zip.file('presentation.json', JSON.stringify(sanitizedPresentation, null, 2));
    
    // Add slide sources if they exist
    if (sanitizedPresentation.sources && sanitizedPresentation.sources.length > 0) {
      const sourcesFolder = zip.folder('sources');
      if (sourcesFolder) {
        sanitizedPresentation.sources.forEach((source, index) => {
          const sourceFilename = `${source.type}_${index + 1}_${source.name.replace(/[<>:"/\\|?*]/g, '_')}.md`;
          sourcesFolder.file(sourceFilename, source.content);
          
          // Add metadata for the source
          const sourceMetadata = {
            id: source.id,
            type: source.type,
            name: source.name,
            createdAt: source.createdAt,
            metadata: source.metadata || {}
          };
          sourcesFolder.file(`${sourceFilename}.json`, JSON.stringify(sourceMetadata, null, 2));
        });
      }
    }
    
    // Add generation history if it exists
    if (sanitizedPresentation.generationHistory && sanitizedPresentation.generationHistory.length > 0) {
      zip.file('generation_history.json', JSON.stringify(sanitizedPresentation.generationHistory, null, 2));
    }
    
    // Add AI interaction history if it exists
    if (sanitizedPresentation.aiInteractionHistory && sanitizedPresentation.aiInteractionHistory.length > 0) {
      const historyFolder = zip.folder('history');
      if (historyFolder) {
        // Complete AI interaction history
        historyFolder.file('ai_interactions.json', JSON.stringify(sanitizedPresentation.aiInteractionHistory, null, 2));
        
        // Summary statistics
        const stats = calculateInteractionStatistics(sanitizedPresentation.aiInteractionHistory);
        historyFolder.file('interaction_statistics.json', JSON.stringify(stats, null, 2));
        
        // Detailed logs by type
        const logsByType = groupInteractionsByType(sanitizedPresentation.aiInteractionHistory);
        Object.entries(logsByType).forEach(([type, interactions]) => {
          if (interactions.length > 0) {
            historyFolder.file(`${type}_interactions.json`, JSON.stringify(interactions, null, 2));
          }
        });
        
        // Cost analysis
        const costAnalysis = calculateCostAnalysis(sanitizedPresentation.aiInteractionHistory);
        historyFolder.file('cost_analysis.json', JSON.stringify(costAnalysis, null, 2));
        
        // CSV export for easy analysis
        const csvData = convertInteractionsToCSV(sanitizedPresentation.aiInteractionHistory);
        historyFolder.file('ai_interactions.csv', csvData);
        
        // Readable summary report
        const summaryReport = generateSummaryReport(sanitizedPresentation.aiInteractionHistory);
        historyFolder.file('INTERACTION_SUMMARY.md', summaryReport);
      }
    }
    
    // Add metadata with version information
    const metadata = {
      name: sanitizedPresentation.title,
      description: sanitizedPresentation.description,
      exportedWith: APP_VERSION,
      fileFormatVersion: getVersionString(CURRENT_FILE_FORMAT_VERSION),
      originalVersion: sanitizedPresentation.version ? getVersionString(sanitizedPresentation.version) : 'Unknown',
      createdAt: sanitizedPresentation.createdAt,
      updatedAt: sanitizedPresentation.updatedAt,
      slides: sanitizedPresentation.slides.length,
      theme: sanitizedPresentation.theme,
      compatibilityNotes: sanitizedPresentation.compatibilityNotes || [],
      imageSanitization: {
        sanitizedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Add README with sanitization info
    const readme = `# ${sanitizedPresentation.title}

## Description
${sanitizedPresentation.description}

## Project Details
- Created: ${new Date(sanitizedPresentation.createdAt).toLocaleDateString()}
- Last Updated: ${new Date(sanitizedPresentation.updatedAt).toLocaleDateString()}
- Total Slides: ${sanitizedPresentation.slides.length}
- Theme: ${sanitizedPresentation.theme}${sanitizedCount > 0 ? `
- Image Sanitization: ${sanitizedCount} invalid image data entries were replaced with placeholders` : ''}

## How to Import
1. Open SlideMaster
2. Click "Resume from Project"
3. Select this ZIP file

Generated by SlideMaster
`;
    zip.file('README.md', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = generateFilename(sanitizedPresentation, 'zip');
    saveAs(blob, filename);

    // Dismiss loading notification and show success
    notify.dismiss(loadingToastId);
    
    if (sanitizedCount > 0) {
      notify.projectSave('sanitized', filename, sanitizedCount);
    } else {
      notify.projectSave('success', filename);
    }

    return createSuccessResult(filename, 'zip');
  } catch (error) {
    // Dismiss loading notification and handle error
    notify.dismiss(loadingToastId);
    
    const filename = generateFilename(presentation, 'zip');
    const retryAction = () => exportProject(presentation);
    handleProjectSaveError(error, filename, retryAction);
    
    console.error('Project export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Import presentation from SlideMaster project file (Original ZIP format)
 */
export const importProject = async (file: File): Promise<{ 
  success: boolean; 
  presentation?: Presentation; 
  error?: string;
}> => {
  // Show loading notification
  const loadingToastId = notify.projectImport('start');
  
  try {
    if (!file.name.endsWith('.zip')) {
      throw new Error('プロジェクトファイルは.zip形式である必要があります');
    }

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Check if it's a valid SlideMaster project
    const presentationFile = zipContent.file('presentation.json');
    if (!presentationFile) {
      throw new Error('有効なSlideMasterプロジェクトファイルではありません（presentation.jsonが見つかりません）');
    }

    // Parse presentation data
    const presentationData = await presentationFile.async('text');
    const rawPresentation = JSON.parse(presentationData);

    // Check metadata for version information
    let metadata = null;
    const metadataFile = zipContent.file('metadata.json');
    if (metadataFile) {
      const metadataText = await metadataFile.async('text');
      metadata = JSON.parse(metadataText);
    }

    // Check version compatibility before processing
    const compatibility = checkImportCompatibility(rawPresentation);
    
    if (!compatibility.canImport) {
      if (compatibility.requiresUpgrade) {
        throw new Error(
          'このファイルは新しいバージョンで作成されています。アプリケーションを更新してください。'
        );
      } else {
        throw new Error(
          `互換性のないファイル形式です: ${compatibility.warnings.join(', ')}`
        );
      }
    }

    // Process and upgrade presentation if necessary
    let presentation = await checkAndUpgradePresentation(rawPresentation);

    // Sanitize image data after import to ensure compatibility
    const { presentation: sanitizedPresentation, sanitizedCount, errors } = sanitizePresentationImages(presentation);
    
    if (sanitizedCount > 0) {
      console.warn(`Sanitized ${sanitizedCount} invalid image data entries during import:`, errors);
    }
    
    presentation = sanitizedPresentation;

    // Log compatibility warnings if any
    if (compatibility.warnings.length > 0) {
      console.warn('Import warnings:', compatibility.warnings);
    }

    // Update timestamps
    presentation.updatedAt = new Date();

    // Generate new ID to avoid conflicts
    presentation.id = `presentation-${Date.now()}`;

    // Import AI interaction history if it exists
    await importAIInteractionHistory(zipContent, presentation);

    // Add import metadata
    if (!presentation.compatibilityNotes) {
      presentation.compatibilityNotes = [];
    }
    presentation.compatibilityNotes.push(
      `Imported from project file on ${new Date().toISOString()}`,
      ...(metadata ? [`Original version: ${metadata.originalVersion || 'Unknown'}`] : []),
      ...(compatibility.warnings.length > 0 ? [`Warnings: ${compatibility.warnings.join(', ')}`] : []),
      ...(sanitizedCount > 0 ? [`Image sanitization: ${sanitizedCount} invalid image entries replaced`] : [])
    );

    // Dismiss loading notification and show success
    notify.dismiss(loadingToastId);
    
    const hasWarnings = compatibility.warnings.length > 0 || sanitizedCount > 0;
    if (hasWarnings) {
      const allWarnings = [
        ...compatibility.warnings,
        ...(sanitizedCount > 0 ? [`${sanitizedCount}件の画像データを修正しました`] : [])
      ];
      notify.projectImport('warning', {
        filename: file.name,
        warnings: allWarnings,
        slidesCount: presentation.slides.length
      });
    } else {
      notify.projectImport('success', {
        filename: file.name,
        slidesCount: presentation.slides.length
      });
    }

    return {
      success: true,
      presentation,
    };
  } catch (error) {
    // Dismiss loading notification and handle error
    notify.dismiss(loadingToastId);
    handleProjectImportError(error, file.name);
    
    console.error('Project import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトファイルのインポートに失敗しました',
    };
  }
};

/**
 * Import presentation from legacy JSON format
 */
export const importProjectLegacy = async (file: File): Promise<{ 
  success: boolean; 
  presentation?: Presentation; 
  error?: string;
  warnings?: string[];
}> => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.type !== 'application/json') {
      throw new Error('Invalid file type. Please select a JSON file.');
    }

    // Read file content
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });

    // Parse JSON
    let importedData: any;
    try {
      importedData = JSON.parse(content);
    } catch (parseError) {
      throw new Error('Invalid JSON file. The file appears to be corrupted.');
    }

    // Check compatibility
    const compatibilityCheck = checkImportCompatibility(importedData);
    if (!compatibilityCheck.compatible) {
      throw new Error(`Incompatible file format: ${compatibilityCheck.reason}`);
    }

    // Upgrade if necessary
    const { presentation: upgradedPresentation, upgraded, warnings } = checkAndUpgradePresentation(importedData);

    // Sanitize image data after upgrade
    const { presentation: sanitizedPresentation, sanitizedCount, errors } = sanitizePresentationImages(upgradedPresentation);
    
    if (sanitizedCount > 0) {
      console.warn(`Sanitized ${sanitizedCount} invalid image data entries during legacy import:`, errors);
    }

    // Validate the imported presentation
    if (!sanitizedPresentation || typeof sanitizedPresentation !== 'object') {
      throw new Error('Invalid presentation data structure');
    }

    if (!sanitizedPresentation.id) {
      sanitizedPresentation.id = `imported-${Date.now()}`;
    }

    if (!sanitizedPresentation.title) {
      sanitizedPresentation.title = file.name.replace(/\.[^/.]+$/, '') || 'Imported Presentation';
    }

    if (!sanitizedPresentation.slides || !Array.isArray(sanitizedPresentation.slides)) {
      throw new Error('No valid slides found in the imported file');
    }

    // Update import metadata
    const versionMetadata = createVersionMetadata();
    sanitizedPresentation.updatedAt = new Date();
    sanitizedPresentation.lastModifiedWith = versionMetadata.lastModifiedWith;
    sanitizedPresentation.importedAt = new Date();
    sanitizedPresentation.importedFrom = file.name;
    
    // Add sanitization info to compatibility notes
    if (sanitizedCount > 0) {
      if (!sanitizedPresentation.compatibilityNotes) {
        sanitizedPresentation.compatibilityNotes = [];
      }
      sanitizedPresentation.compatibilityNotes.push(
        `Image sanitization during import: ${sanitizedCount} invalid image entries replaced`
      );
    }

    const allWarnings = [...warnings];
    if (sanitizedCount > 0) {
      allWarnings.push(`${sanitizedCount} invalid image data entries were sanitized during import`);
    }

    return {
      success: true,
      presentation: sanitizedPresentation as Presentation,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };

  } catch (error) {
    console.error('Project import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during import'
    };
  }
};

/**
 * Export presentation with backup metadata
 */
export const exportProjectWithBackup = async (
  presentation: Presentation,
  includeHistory: boolean = true
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    // Sanitize image data before backup
    const { presentation: sanitizedPresentation, sanitizedCount, errors } = sanitizePresentationImages(presentation);
    
    if (sanitizedCount > 0) {
      console.warn(`Sanitized ${sanitizedCount} invalid image data entries during backup export:`, errors);
    }

    // Create comprehensive backup data
    const versionMetadata = createVersionMetadata();
    const backupData = {
      ...sanitizedPresentation,
      backup: {
        createdAt: new Date().toISOString(),
        createdWith: versionMetadata.createdWith,
        appVersion: APP_VERSION,
        fileFormatVersion: CURRENT_FILE_FORMAT_VERSION,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      },
      metadata: {
        originalCreatedAt: sanitizedPresentation.createdAt,
        originalUpdatedAt: sanitizedPresentation.updatedAt,
        exportCount: (sanitizedPresentation as any).exportCount ? (sanitizedPresentation as any).exportCount + 1 : 1,
        slideCount: sanitizedPresentation.slides.length,
        layerCount: sanitizedPresentation.slides.reduce((total, slide) => total + slide.layers.length, 0),
        hasImages: sanitizedPresentation.slides.some(slide => 
          slide.layers.some(layer => layer.type === 'image')
        ),
        hasVideo: sanitizedPresentation.slides.some(slide => 
          slide.layers.some(layer => layer.type === 'video')
        ),
        imageSanitization: {
          sanitizedCount,
          errors: errors.length > 0 ? errors : undefined
        },
      }
    };

    // Optionally exclude generation history to reduce file size
    if (!includeHistory) {
      delete (backupData as any).generationHistory;
      delete (backupData as any).sources;
    }

    // Convert to JSON with formatting
    const jsonContent = JSON.stringify(backupData, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = generateFilename(sanitizedPresentation, 'json');
    saveAs(blob, filename);

    return createSuccessResult(filename, 'json');
  } catch (error) {
    console.error('Project backup export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Validate project file before import
 */
export const validateProjectFile = async (file: File): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  info?: {
    title?: string;
    slideCount?: number;
    fileFormatVersion?: string;
    createdWith?: string;
    fileSize: number;
  };
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors, warnings };
    }

    if (file.type !== 'application/json') {
      errors.push('Invalid file type. Expected JSON file.');
      return { valid: false, errors, warnings };
    }


    if (file.size === 0) {
      errors.push('File is empty.');
      return { valid: false, errors, warnings };
    }

    // Read and parse file
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      errors.push('Invalid JSON format. The file appears to be corrupted.');
      return { valid: false, errors, warnings };
    }

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      errors.push('Invalid file structure.');
      return { valid: false, errors, warnings };
    }

    if (!data.slides || !Array.isArray(data.slides)) {
      errors.push('No valid slides found in the file.');
      return { valid: false, errors, warnings };
    }

    if (data.slides.length === 0) {
      warnings.push('The presentation has no slides.');
    }

    // Check compatibility
    const compatibilityCheck = checkImportCompatibility(data);
    if (!compatibilityCheck.compatible) {
      if (compatibilityCheck.canUpgrade) {
        warnings.push(`File format is outdated but can be upgraded: ${compatibilityCheck.reason}`);
      } else {
        errors.push(`Incompatible file format: ${compatibilityCheck.reason}`);
        return { valid: false, errors, warnings };
      }
    }

    // Gather file info
    const info = {
      title: data.title,
      slideCount: data.slides.length,
      fileFormatVersion: data.fileFormatVersion || data.version,
      createdWith: data.createdWith || data.exportedWith,
      fileSize: file.size
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    };

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    return { valid: false, errors, warnings };
  }
};

// =================================================================
// AI Interaction History Export Helper Functions
// =================================================================

/**
 * AI対話履歴の統計を計算
 */
function calculateInteractionStatistics(history: AIInteractionHistoryItem[]) {
  const total = history.length;
  const successful = history.filter(h => h.status === 'success').length;
  const failed = history.filter(h => h.status === 'error').length;
  const cancelled = history.filter(h => h.status === 'cancelled').length;
  
  const processingTimes = history
    .filter(h => h.output?.metadata?.processingTime)
    .map(h => h.output!.metadata!.processingTime!);
  
  const totalCost = history
    .filter(h => h.cost)
    .reduce((sum, h) => sum + h.cost!.estimatedCost, 0);

  const providerStats = history.reduce((acc, h) => {
    acc[h.provider] = (acc[h.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeStats = history.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + 1;
    return acc;
  }, {} as Record<AIInteractionType, number>);

  return {
    summary: {
      totalInteractions: total,
      successfulInteractions: successful,
      failedInteractions: failed,
      cancelledInteractions: cancelled,
      successRate: total > 0 ? successful / total : 0,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0,
      totalEstimatedCost: totalCost
    },
    byProvider: providerStats,
    byType: typeStats,
    timeRange: {
      firstInteraction: history.length > 0 ? history[0].timestamp : null,
      lastInteraction: history.length > 0 ? history[history.length - 1].timestamp : null
    }
  };
}

/**
 * AI対話履歴をタイプ別にグループ化
 */
function groupInteractionsByType(history: AIInteractionHistoryItem[]): Record<string, AIInteractionHistoryItem[]> {
  return history.reduce((acc, interaction) => {
    if (!acc[interaction.type]) {
      acc[interaction.type] = [];
    }
    acc[interaction.type].push(interaction);
    return acc;
  }, {} as Record<string, AIInteractionHistoryItem[]>);
}

/**
 * コスト分析を計算
 */
function calculateCostAnalysis(history: AIInteractionHistoryItem[]) {
  const interactions = history.filter(h => h.cost);
  
  const totalCost = interactions.reduce((sum, h) => sum + h.cost!.estimatedCost, 0);
  const totalTokens = interactions.reduce((sum, h) => 
    sum + (h.cost!.inputTokens || 0) + (h.cost!.outputTokens || 0), 0);
  const totalImages = interactions.reduce((sum, h) => sum + (h.cost!.imageCount || 0), 0);
  
  const costByProvider = interactions.reduce((acc, h) => {
    const provider = h.cost!.provider;
    acc[provider] = (acc[provider] || 0) + h.cost!.estimatedCost;
    return acc;
  }, {} as Record<string, number>);

  const costByType = interactions.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + h.cost!.estimatedCost;
    return acc;
  }, {} as Record<string, number>);

  return {
    summary: {
      totalEstimatedCost: totalCost,
      totalTokensUsed: totalTokens,
      totalImagesGenerated: totalImages,
      averageCostPerInteraction: interactions.length > 0 ? totalCost / interactions.length : 0
    },
    byProvider: costByProvider,
    byType: costByType,
    currency: 'USD'
  };
}

/**
 * AI対話履歴をCSV形式に変換
 */
function convertInteractionsToCSV(history: AIInteractionHistoryItem[]): string {
  const headers = [
    'ID', 'Type', 'Status', 'Timestamp', 'Provider', 'Model',
    'Input Prompt', 'Output Content', 'Processing Time (ms)', 
    'Estimated Cost (USD)', 'User Rating', 'Session ID'
  ];

  const rows = history.map(h => [
    h.id,
    h.type,
    h.status,
    h.timestamp.toISOString(),
    h.provider,
    h.model,
    `"${h.input.prompt.replace(/"/g, '""')}"`, // CSV escape
    `"${h.output?.content?.substring(0, 200).replace(/"/g, '""') || ''}"`, // 最初の200文字のみ
    h.output?.metadata?.processingTime || '',
    h.cost?.estimatedCost || '',
    h.userRating || '',
    h.sessionId || ''
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * 読みやすいサマリーレポートを生成
 */
function generateSummaryReport(history: AIInteractionHistoryItem[]): string {
  const stats = calculateInteractionStatistics(history);
  const costAnalysis = calculateCostAnalysis(history);
  
  return `# AI Interaction History Summary

## Overview
- **Total Interactions**: ${stats.summary.totalInteractions}
- **Success Rate**: ${(stats.summary.successRate * 100).toFixed(1)}%
- **Total Estimated Cost**: $${costAnalysis.summary.totalEstimatedCost.toFixed(4)}
- **Time Period**: ${stats.timeRange.firstInteraction} to ${stats.timeRange.lastInteraction}

## Interactions by Type
${Object.entries(stats.byType)
  .sort(([,a], [,b]) => b - a)
  .map(([type, count]) => `- **${type}**: ${count} interactions`)
  .join('\n')}

## Interactions by Provider
${Object.entries(stats.byProvider)
  .sort(([,a], [,b]) => b - a)
  .map(([provider, count]) => `- **${provider}**: ${count} interactions`)
  .join('\n')}

## Cost Breakdown by Provider
${Object.entries(costAnalysis.byProvider)
  .sort(([,a], [,b]) => b - a)
  .map(([provider, cost]) => `- **${provider}**: $${cost.toFixed(4)}`)
  .join('\n')}

## Performance Metrics
- **Average Processing Time**: ${stats.summary.averageProcessingTime.toFixed(0)}ms
- **Average Cost per Interaction**: $${costAnalysis.summary.averageCostPerInteraction.toFixed(4)}
- **Total Tokens Used**: ${costAnalysis.summary.totalTokensUsed.toLocaleString()}
- **Total Images Generated**: ${costAnalysis.summary.totalImagesGenerated}

## Files in This Export
- \`ai_interactions.json\` - Complete interaction history
- \`interaction_statistics.json\` - Detailed statistics
- \`cost_analysis.json\` - Cost breakdown analysis
- \`ai_interactions.csv\` - Data in CSV format for analysis
- \`[type]_interactions.json\` - Interactions grouped by type

Generated on ${new Date().toISOString()}
`;
}

/**
 * プロジェクトZIPファイルからAI対話履歴をインポート
 */
async function importAIInteractionHistory(
  zipContent: JSZip,
  presentation: Presentation
): Promise<void> {
  try {
    // Check if history folder exists
    const historyFolder = zipContent.folder('history');
    if (!historyFolder) {
      // Check for direct ai_interactions.json file (legacy support)
      const legacyHistoryFile = zipContent.file('ai_interactions.json');
      if (legacyHistoryFile) {
        const historyData = await legacyHistoryFile.async('text');
        const interactions: AIInteractionHistoryItem[] = JSON.parse(historyData);
        presentation.aiInteractionHistory = interactions;
        console.log(`Imported ${interactions.length} AI interactions (legacy format)`);
      }
      return;
    }

    // Import main AI interaction history
    const aiInteractionsFile = historyFolder.file('ai_interactions.json');
    if (aiInteractionsFile) {
      const historyData = await aiInteractionsFile.async('text');
      const interactions: AIInteractionHistoryItem[] = JSON.parse(historyData);
      
      // Convert string timestamps back to Date objects
      interactions.forEach(interaction => {
        interaction.timestamp = new Date(interaction.timestamp);
      });
      
      presentation.aiInteractionHistory = interactions;
      console.log(`Imported ${interactions.length} AI interactions from history folder`);
    }

    // Log statistics if available
    const statsFile = historyFolder.file('interaction_statistics.json');
    if (statsFile) {
      const statsData = await statsFile.async('text');
      const stats = JSON.parse(statsData);
      console.log('AI Interaction Statistics:', {
        totalInteractions: stats.summary.totalInteractions,
        successRate: `${(stats.summary.successRate * 100).toFixed(1)}%`,
        totalCost: `$${stats.summary.totalEstimatedCost.toFixed(4)}`
      });
    }

  } catch (error) {
    console.warn('Failed to import AI interaction history:', error);
    // Don't fail the entire import if history import fails
  }
}