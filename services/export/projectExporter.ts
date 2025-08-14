import { Presentation, ExportResult, AIInteractionHistoryItem, AIInteractionType, AIInteractionStatus } from '../../types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { 
  createVersionMetadata, 
  getVersionString, 
  APP_VERSION, 
  CURRENT_FILE_FORMAT_VERSION 
} from '../../utils/versionManager';
import { checkAndUpgradePresentation, checkImportCompatibility, getUserSettings, UserSettings, ImageGenerationSettings } from '../storageService';
import {
  generateFilename,
  createErrorResult,
  createSuccessResult,
  validatePresentation
} from './exportUtils';
import { sanitizePresentationImages } from '../../utils/imageDataValidator';
import { notify } from '../../utils/notificationService';
import { handleProjectSaveError, handleProjectImportError } from '../../utils/errorHandler';
import { addProjectImages } from './projectImageHandler';
import { addAIHistoryToZip, importAIHistoryFromZip } from './projectAIHistoryHandler';

// =================================================================
// Project Export Service - SlideMaster project format export/import
// =================================================================

// プロジェクトファイルに含める設定情報の型定義（将来のマルチプロバイダー対応を考慮）
export interface ProjectAISettings {
  // 現在のプロバイダー選択（将来の拡張に対応）
  aiProviderText?: 'azure' | 'gemini' | 'openai' | 'claude' | 'lmstudio';
  aiProviderImage?: 'azure' | 'gemini' | 'openai' | 'fooocus';
  aiProviderVideo?: 'azure' | 'gemini' | 'openai' | 'claude';
  
  // モデル選択（プロバイダー非依存）
  aiModels?: {
    textGeneration?: string;
    imageGeneration?: string;
    videoAnalysis?: string;
  };
  
  // 画像生成設定
  imageGenerationSettings?: ImageGenerationSettings;
  
  // プロバイダー固有設定（APIキーは除外、構造のみ保存）
  providerConfig?: {
    azure?: {
      hasTextGeneration: boolean;
      hasImageGeneration: boolean;
      hasVideoAnalysis: boolean;
      textModel?: string;
      imageModel?: string;
      videoModel?: string;
    };
    gemini?: {
      hasTextGeneration: boolean;
      hasImageGeneration: boolean;
      hasVideoAnalysis: boolean;
      textModel?: string;
      imageModel?: string;
      videoModel?: string;
    };
    openai?: {
      hasTextGeneration: boolean;
      hasImageGeneration: boolean;
      hasVideoAnalysis: boolean;
      textModel?: string;
      imageModel?: string;
    };
    claude?: {
      hasTextGeneration: boolean;
      hasVideoAnalysis: boolean;
      textModel?: string;
    };
    lmstudio?: {
      hasTextGeneration: boolean;
      endpoint?: string;  // APIキーではないエンドポイント情報は保存可能
      models?: string[];
    };
    fooocus?: {
      hasImageGeneration: boolean;
      endpoint?: string;
      models?: string[];
    };
  };
  
  // プレゼンテーション作成時の設定コンテキスト
  creationContext?: {
    primaryProvider: string;
    modelsUsed: string[];
    settingsSnapshot: Date;
  };
}

/**
 * 現在のユーザー設定からプロジェクト用のAI設定を生成（APIキーは除外）
 */
function createProjectAISettings(userSettings: UserSettings): ProjectAISettings {
  const projectSettings: ProjectAISettings = {
    // プロバイダー選択
    aiProviderText: userSettings.aiProviderText,
    aiProviderImage: userSettings.aiProviderImage,
    aiProviderVideo: userSettings.aiProviderVideo,
    
    // モデル設定
    aiModels: userSettings.aiModels ? { ...userSettings.aiModels } : undefined,
    
    // 画像生成設定
    imageGenerationSettings: userSettings.imageGenerationSettings ? 
      { ...userSettings.imageGenerationSettings } : undefined,
    
    // プロバイダー設定構造（APIキーは除外）
    providerConfig: {},
    
    // 作成時のコンテキスト
    creationContext: {
      primaryProvider: userSettings.aiProviderText || 'azure',
      modelsUsed: [
        userSettings.aiModels?.textGeneration,
        userSettings.aiModels?.imageGeneration,
        userSettings.aiModels?.videoAnalysis
      ].filter(Boolean) as string[],
      settingsSnapshot: new Date()
    }
  };

  // プロバイダー固有設定の構造を保存（APIキーは除外）
  if (userSettings.providerAuth) {
    // Azure設定
    if (userSettings.providerAuth.azure) {
      projectSettings.providerConfig!.azure = {
        hasTextGeneration: !!userSettings.providerAuth.azure.textGeneration,
        hasImageGeneration: !!userSettings.providerAuth.azure.imageGeneration,
        hasVideoAnalysis: !!userSettings.providerAuth.azure.videoAnalysis,
        textModel: userSettings.providerAuth.azure.textGeneration?.modelName,
        imageModel: userSettings.providerAuth.azure.imageGeneration?.modelName,
        videoModel: userSettings.providerAuth.azure.videoAnalysis?.modelName,
      };
    }
    
    // 将来のGemini設定復活に備えた構造（現在は存在しないが将来の拡張用）
    if ((userSettings.providerAuth as any).gemini) {
      projectSettings.providerConfig!.gemini = {
        hasTextGeneration: !!(userSettings.providerAuth as any).gemini.textGeneration,
        hasImageGeneration: !!(userSettings.providerAuth as any).gemini.imageGeneration,
        hasVideoAnalysis: !!(userSettings.providerAuth as any).gemini.videoAnalysis,
        textModel: (userSettings.providerAuth as any).gemini.textGeneration?.modelName,
        imageModel: (userSettings.providerAuth as any).gemini.imageGeneration?.modelName,
        videoModel: (userSettings.providerAuth as any).gemini.videoAnalysis?.modelName,
      };
    }
    
    // 将来のOpenAI設定復活に備えた構造（現在は存在しないが将来の拡張用）
    if ((userSettings.providerAuth as any).openai) {
      projectSettings.providerConfig!.openai = {
        hasTextGeneration: !!(userSettings.providerAuth as any).openai.textGeneration,
        hasImageGeneration: !!(userSettings.providerAuth as any).openai.imageGeneration,
        hasVideoAnalysis: !!(userSettings.providerAuth as any).openai.videoAnalysis,
        textModel: (userSettings.providerAuth as any).openai.textGeneration?.modelName,
        imageModel: (userSettings.providerAuth as any).openai.imageGeneration?.modelName,
      };
    }
    
    // 将来のClaude設定復活に備えた構造（現在は存在しないが将来の拡張用）
    if ((userSettings.providerAuth as any).claude) {
      projectSettings.providerConfig!.claude = {
        hasTextGeneration: !!(userSettings.providerAuth as any).claude.textGeneration,
        hasVideoAnalysis: !!(userSettings.providerAuth as any).claude.videoAnalysis,
        textModel: (userSettings.providerAuth as any).claude.textGeneration?.modelName,
      };
    }
    
    // 将来のLM Studio設定復活に備えた構造（現在は存在しないが将来の拡張用）
    if ((userSettings.providerAuth as any).lmstudio) {
      projectSettings.providerConfig!.lmstudio = {
        hasTextGeneration: !!(userSettings.providerAuth as any).lmstudio.textGeneration,
        endpoint: (userSettings.providerAuth as any).lmstudio.textGeneration?.endpoint,
        models: (userSettings.providerAuth as any).lmstudio.textGeneration?.modelName ? 
          [(userSettings.providerAuth as any).lmstudio.textGeneration.modelName] : undefined,
      };
    }
    
    // 将来のFooocus設定復活に備えた構造（現在は存在しないが将来の拡張用）
    if ((userSettings.providerAuth as any).fooocus) {
      projectSettings.providerConfig!.fooocus = {
        hasImageGeneration: !!(userSettings.providerAuth as any).fooocus.imageGeneration,
        endpoint: (userSettings.providerAuth as any).fooocus.imageGeneration?.endpoint,
        models: (userSettings.providerAuth as any).fooocus.imageGeneration?.modelName ? 
          [(userSettings.providerAuth as any).fooocus.imageGeneration.modelName] : undefined,
      };
    }
  }

  return projectSettings;
}

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
    
    // Extract and add image files from IndexedDB
    await addProjectImages(zip, sanitizedPresentation);
    
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
    
    // Add AI interaction history
    addAIHistoryToZip(zip, sanitizedPresentation);
    
    // Get current user settings for AI configuration
    const currentUserSettings = getUserSettings();
    const projectAISettings = createProjectAISettings(currentUserSettings);
    
    // Add metadata with version information and AI settings
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
      },
      // AI設定情報を追加（将来のマルチプロバイダー対応を考慮）
      aiSettings: projectAISettings
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    // AI設定を専用ファイルとしても保存（詳細情報用）
    zip.file('ai_settings.json', JSON.stringify(projectAISettings, null, 2));

    // Add README with sanitization info and AI settings
    const readme = `# ${sanitizedPresentation.title}

## Description
${sanitizedPresentation.description}

## Project Details
- Created: ${new Date(sanitizedPresentation.createdAt).toLocaleDateString()}
- Last Updated: ${new Date(sanitizedPresentation.updatedAt).toLocaleDateString()}
- Total Slides: ${sanitizedPresentation.slides.length}
- Theme: ${sanitizedPresentation.theme}${sanitizedCount > 0 ? `
- Image Sanitization: ${sanitizedCount} invalid image data entries were replaced with placeholders` : ''}

## AI Configuration (at time of export)
- Primary Text Provider: ${projectAISettings.aiProviderText || 'Not configured'}
- Primary Image Provider: ${projectAISettings.aiProviderImage || 'Not configured'}
- Primary Video Provider: ${projectAISettings.aiProviderVideo || 'Not configured'}
- Text Model: ${projectAISettings.aiModels?.textGeneration || 'Not specified'}
- Image Model: ${projectAISettings.aiModels?.imageGeneration || 'Not specified'}
- Video Model: ${projectAISettings.aiModels?.videoAnalysis || 'Not specified'}

**Note**: API keys are not included in this project file for security reasons. You will need to configure your API keys separately when importing this project.

## Available Providers Configuration
${Object.entries(projectAISettings.providerConfig || {})
  .filter(([_, config]) => config && Object.values(config).some(v => v))
  .map(([provider, config]) => {
    const capabilities = [];
    if (config?.hasTextGeneration) capabilities.push('Text Generation');
    if (config?.hasImageGeneration) capabilities.push('Image Generation');
    if (config?.hasVideoAnalysis) capabilities.push('Video Analysis');
    return `- **${provider.charAt(0).toUpperCase() + provider.slice(1)}**: ${capabilities.join(', ')}`;
  }).join('\n') || '- No providers configured'}

## How to Import
1. Open SlideMaster
2. Click "Resume from Project"
3. Select this ZIP file
4. Configure your API keys in Settings if needed

Generated by SlideMaster v${APP_VERSION}
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

    // Import AI settings if they exist
    const importedAISettings = await importAISettings(zipContent);

    // Add import metadata
    if (!presentation.compatibilityNotes) {
      presentation.compatibilityNotes = [];
    }
    presentation.compatibilityNotes.push(
      `Imported from project file on ${new Date().toISOString()}`,
      ...(metadata ? [`Original version: ${metadata.originalVersion || 'Unknown'}`] : []),
      ...(compatibility.warnings.length > 0 ? [`Warnings: ${compatibility.warnings.join(', ')}`] : []),
      ...(sanitizedCount > 0 ? [`Image sanitization: ${sanitizedCount} invalid image entries replaced`] : []),
      ...(importedAISettings ? ['AI settings available for restoration - check Settings to apply'] : [])
    );

    // Store imported AI settings in presentation metadata for potential restoration
    if (importedAISettings) {
      (presentation as any).importedAISettings = importedAISettings;
    }

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
    aiSettings?: {
      hasSettings: boolean;
      providers: string[];
      primaryProvider?: string;
      compatibilityWarnings: string[];
    };
  };
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors, warnings };
    }

    // Support both ZIP and JSON file formats
    const isZipFile = file.name.endsWith('.zip') || file.type === 'application/zip';
    const isJsonFile = file.name.endsWith('.json') || file.type === 'application/json';

    if (!isZipFile && !isJsonFile) {
      errors.push('Invalid file type. Expected ZIP or JSON file.');
      return { valid: false, errors, warnings };
    }

    if (file.size === 0) {
      errors.push('File is empty.');
      return { valid: false, errors, warnings };
    }

    // Handle ZIP file validation
    if (isZipFile) {
      return await validateZipProjectFile(file, errors, warnings);
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

/**
 * Validate ZIP format project file
 */
async function validateZipProjectFile(
  file: File, 
  errors: string[], 
  warnings: string[]
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  info?: {
    title?: string;
    slideCount?: number;
    fileFormatVersion?: string;
    createdWith?: string;
    fileSize: number;
    aiSettings?: {
      hasSettings: boolean;
      providers: string[];
      primaryProvider?: string;
      compatibilityWarnings: string[];
    };
  };
}> {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Check for required files
    const presentationFile = zipContent.file('presentation.json');
    if (!presentationFile) {
      errors.push('Invalid SlideMaster project: presentation.json not found');
      return { valid: false, errors, warnings };
    }

    // Parse presentation data
    const presentationData = await presentationFile.async('text');
    let presentation: any;
    try {
      presentation = JSON.parse(presentationData);
    } catch (parseError) {
      errors.push('Invalid presentation.json: corrupted JSON data');
      return { valid: false, errors, warnings };
    }

    // Basic presentation validation
    if (!presentation.slides || !Array.isArray(presentation.slides)) {
      errors.push('No valid slides found in the presentation');
      return { valid: false, errors, warnings };
    }

    if (presentation.slides.length === 0) {
      warnings.push('The presentation has no slides');
    }

    // Check metadata
    let metadata = null;
    const metadataFile = zipContent.file('metadata.json');
    if (metadataFile) {
      try {
        const metadataText = await metadataFile.async('text');
        metadata = JSON.parse(metadataText);
      } catch (error) {
        warnings.push('Metadata file is corrupted');
      }
    }

    // Check AI settings
    let aiSettingsInfo = {
      hasSettings: false,
      providers: [] as string[],
      primaryProvider: undefined as string | undefined,
      compatibilityWarnings: [] as string[]
    };

    const aiSettingsFile = zipContent.file('ai_settings.json');
    if (aiSettingsFile || (metadata && metadata.aiSettings)) {
      try {
        let aiSettings: ProjectAISettings;
        if (aiSettingsFile) {
          const settingsData = await aiSettingsFile.async('text');
          aiSettings = JSON.parse(settingsData);
        } else {
          aiSettings = metadata.aiSettings;
        }

        aiSettingsInfo.hasSettings = true;
        aiSettingsInfo.primaryProvider = aiSettings.aiProviderText;
        
        // Collect configured providers
        const configuredProviders = [];
        if (aiSettings.providerConfig) {
          Object.entries(aiSettings.providerConfig).forEach(([provider, config]) => {
            if (config && Object.values(config).some(v => v)) {
              configuredProviders.push(provider);
            }
          });
        }
        aiSettingsInfo.providers = configuredProviders;

        // Check for compatibility warnings
        const currentSettings = getUserSettings();
        const currentProviders = Object.keys(currentSettings.providerAuth || {});
        
        const missingProviders = aiSettingsInfo.providers.filter(
          provider => !currentProviders.includes(provider)
        );
        
        if (missingProviders.length > 0) {
          aiSettingsInfo.compatibilityWarnings.push(
            `Missing providers: ${missingProviders.join(', ')}`
          );
          warnings.push(
            `This project was created with providers not currently configured: ${missingProviders.join(', ')}`
          );
        }

        if (aiSettings.aiProviderText && aiSettings.aiProviderText !== currentSettings.aiProviderText) {
          aiSettingsInfo.compatibilityWarnings.push(
            `Project uses ${aiSettings.aiProviderText} for text generation, current setting is ${currentSettings.aiProviderText}`
          );
        }

      } catch (error) {
        warnings.push('AI settings file is corrupted');
      }
    }

    // Check compatibility
    const compatibilityCheck = checkImportCompatibility(presentation);
    if (!compatibilityCheck.canImport) {
      if (compatibilityCheck.requiresUpgrade) {
        errors.push('File was created with a newer version. Please update the application.');
        return { valid: false, errors, warnings };
      } else {
        errors.push(`Incompatible file format: ${compatibilityCheck.warnings.join(', ')}`);
        return { valid: false, errors, warnings };
      }
    }

    if (compatibilityCheck.warnings && compatibilityCheck.warnings.length > 0) {
      warnings.push(...compatibilityCheck.warnings);
    }

    // Gather file info
    const info = {
      title: presentation.title || metadata?.name,
      slideCount: presentation.slides.length,
      fileFormatVersion: metadata?.fileFormatVersion || presentation.fileFormatVersion || presentation.version,
      createdWith: metadata?.exportedWith || presentation.createdWith || metadata?.createdWith,
      fileSize: file.size,
      aiSettings: aiSettingsInfo.hasSettings ? aiSettingsInfo : undefined
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
}

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
 * プロジェクトZIPファイルからAI設定をインポート
 */
async function importAISettings(zipContent: JSZip): Promise<ProjectAISettings | null> {
  try {
    // Check for dedicated AI settings file first
    const aiSettingsFile = zipContent.file('ai_settings.json');
    if (aiSettingsFile) {
      const settingsData = await aiSettingsFile.async('text');
      const aiSettings: ProjectAISettings = JSON.parse(settingsData);
      console.log('Imported AI settings from ai_settings.json:', {
        textProvider: aiSettings.aiProviderText,
        imageProvider: aiSettings.aiProviderImage,
        videoProvider: aiSettings.aiProviderVideo,
        availableProviders: Object.keys(aiSettings.providerConfig || {})
      });
      return aiSettings;
    }

    // Check for AI settings in metadata (fallback)
    const metadataFile = zipContent.file('metadata.json');
    if (metadataFile) {
      const metadataText = await metadataFile.async('text');
      const metadata = JSON.parse(metadataText);
      if (metadata.aiSettings) {
        console.log('Imported AI settings from metadata.json');
        return metadata.aiSettings as ProjectAISettings;
      }
    }

    console.log('No AI settings found in project file');
    return null;

  } catch (error) {
    console.warn('Failed to import AI settings:', error);
    return null;
  }
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

// Image processing is now handled by projectImageHandler.ts