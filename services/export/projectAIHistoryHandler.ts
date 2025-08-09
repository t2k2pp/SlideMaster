// =================================================================
// Project AI History Handler - AI履歴処理専門サービス
// プロジェクトエクスポート・インポート時のAI履歴関連機能
// =================================================================

import JSZip from 'jszip';
import { Presentation, AIInteractionHistoryItem, AIInteractionType, AIInteractionStatus } from '../../types';

/**
 * Add AI interaction history to ZIP file
 */
export const addAIHistoryToZip = (zip: JSZip, presentation: Presentation): void => {
  try {
    // Add generation history if it exists (legacy)
    if (presentation.generationHistory && presentation.generationHistory.length > 0) {
      zip.file('generation_history.json', JSON.stringify(presentation.generationHistory, null, 2));
    }
    
    // Add AI interaction history if it exists
    if (presentation.aiInteractionHistory && presentation.aiInteractionHistory.length > 0) {
      const historyFolder = zip.folder('history');
      if (historyFolder) {
        // Complete AI interaction history
        historyFolder.file('ai_interactions.json', JSON.stringify(presentation.aiInteractionHistory, null, 2));
        
        // Summary statistics
        const stats = calculateInteractionStatistics(presentation.aiInteractionHistory);
        historyFolder.file('interaction_statistics.json', JSON.stringify(stats, null, 2));
        
        // Detailed logs by type
        const logsByType = groupInteractionsByType(presentation.aiInteractionHistory);
        Object.entries(logsByType).forEach(([type, interactions]) => {
          if (interactions.length > 0) {
            historyFolder.file(`${type}_interactions.json`, JSON.stringify(interactions, null, 2));
          }
        });
        
        // Cost analysis
        const costAnalysis = calculateCostAnalysis(presentation.aiInteractionHistory);
        historyFolder.file('cost_analysis.json', JSON.stringify(costAnalysis, null, 2));
        
        // CSV export for easy analysis
        const csvData = convertInteractionsToCSV(presentation.aiInteractionHistory);
        historyFolder.file('ai_interactions.csv', csvData);
        
        // Readable summary report
        const summaryReport = generateSummaryReport(presentation.aiInteractionHistory);
        historyFolder.file('INTERACTION_SUMMARY.md', summaryReport);
      }
    }
    
    console.log('📊 AI history added to export');
    
  } catch (error) {
    console.error('Error adding AI history to ZIP:', error);
    // Don't fail the entire export if history processing fails
  }
};

/**
 * Import AI interaction history from ZIP file
 */
export const importAIHistoryFromZip = async (zip: JSZip, presentation: Presentation): Promise<void> => {
  try {
    // Import legacy generation history
    const generationHistoryFile = zip.file('generation_history.json');
    if (generationHistoryFile) {
      const historyData = await generationHistoryFile.async('text');
      const generationHistory = JSON.parse(historyData);
      presentation.generationHistory = generationHistory;
      console.log(`Imported ${generationHistory.length} legacy generation history items`);
    }

    // Import new AI interaction history
    const historyFolder = zip.folder('history');
    if (!historyFolder) return;

    const aiInteractionsFile = historyFolder.file('ai_interactions.json');
    if (aiInteractionsFile) {
      const historyData = await aiInteractionsFile.async('text');
      const interactions = JSON.parse(historyData) as AIInteractionHistoryItem[];
      
      // Validate and sanitize the interactions
      const validInteractions = interactions.filter(interaction => {
        return interaction && 
               interaction.id && 
               interaction.timestamp && 
               interaction.type &&
               interaction.status;
      });

      presentation.aiInteractionHistory = validInteractions;
      console.log(`Imported ${validInteractions.length} AI interactions from history folder`);
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
};

// =================================================================
// AI History Analysis Functions
// =================================================================

function calculateInteractionStatistics(history: AIInteractionHistoryItem[]) {
  const total = history.length;
  const successful = history.filter(h => h.status === 'success').length;
  const failed = history.filter(h => h.status === 'error').length;
  const cancelled = history.filter(h => h.status === 'cancelled').length;
  
  const successRate = total > 0 ? successful / total : 0;
  const failureRate = total > 0 ? failed / total : 0;
  
  // Calculate total estimated cost
  const totalEstimatedCost = history.reduce((sum, h) => sum + (h.cost?.estimatedCost || 0), 0);
  
  // Group by provider
  const providerStats = history.reduce((acc, h) => {
    const provider = h.provider || 'unknown';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by interaction type
  const typeStats = history.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + 1;
    return acc;
  }, {} as Record<AIInteractionType, number>);
  
  return {
    summary: {
      totalInteractions: total,
      successful,
      failed,
      cancelled,
      successRate,
      failureRate,
      totalEstimatedCost
    },
    byProvider: providerStats,
    byType: typeStats
  };
}

function groupInteractionsByType(history: AIInteractionHistoryItem[]): Record<string, AIInteractionHistoryItem[]> {
  return history.reduce((acc, interaction) => {
    const type = interaction.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(interaction);
    return acc;
  }, {} as Record<string, AIInteractionHistoryItem[]>);
}

function calculateCostAnalysis(history: AIInteractionHistoryItem[]) {
  // Filter interactions that have cost information
  const interactions = history.filter(h => h.cost);
  
  const totalCost = interactions.reduce((sum, h) => sum + h.cost!.estimatedCost, 0);
  const totalTokens = interactions.reduce((sum, h) => 
    sum + (h.cost!.inputTokens || 0) + (h.cost!.outputTokens || 0), 0);
  const totalImages = interactions.reduce((sum, h) => sum + (h.cost!.imageCount || 0), 0);

  const costByProvider = interactions.reduce((acc, h) => {
    const provider = h.provider || 'unknown';
    acc[provider] = (acc[provider] || 0) + h.cost!.estimatedCost;
    return acc;
  }, {} as Record<string, number>);

  const costByType = interactions.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + h.cost!.estimatedCost;
    return acc;
  }, {} as Record<AIInteractionType, number>);

  return {
    totalCost,
    totalTokens,
    totalImages,
    costByProvider,
    costByType,
    averageCostPerInteraction: interactions.length > 0 ? totalCost / interactions.length : 0
  };
}

function convertInteractionsToCSV(history: AIInteractionHistoryItem[]): string {
  const headers = [
    'ID', 'Type', 'Status', 'Provider', 'Timestamp', 'Duration (ms)', 
    'Input Tokens', 'Output Tokens', 'Image Count', 'Estimated Cost'
  ];
  
  const rows = history.map(h => [
    h.id,
    h.type,
    h.status,
    h.provider || '',
    h.timestamp.toISOString(),
    h.duration || '',
    h.cost?.inputTokens || 0,
    h.cost?.outputTokens || 0,
    h.cost?.imageCount || 0,
    h.cost?.estimatedCost || 0
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
    
  return csvContent;
}

function generateSummaryReport(history: AIInteractionHistoryItem[]): string {
  const stats = calculateInteractionStatistics(history);
  const costAnalysis = calculateCostAnalysis(history);
  
  const report = `# AI Interaction Summary Report

Generated: ${new Date().toISOString()}

## Overview
- **Total Interactions**: ${stats.summary.totalInteractions}
- **Success Rate**: ${(stats.summary.successRate * 100).toFixed(1)}%
- **Total Estimated Cost**: $${stats.summary.totalEstimatedCost.toFixed(4)}
- **Total Tokens Processed**: ${costAnalysis.totalTokens.toLocaleString()}
- **Total Images Generated**: ${costAnalysis.totalImages.toLocaleString()}

## Breakdown by Type
${Object.entries(stats.byType)
  .map(([type, count]) => `- **${type}**: ${count} interactions`)
  .join('\n')}

## Breakdown by Provider
${Object.entries(stats.byProvider)
  .map(([provider, count]) => `- **${provider}**: ${count} interactions`)
  .join('\n')}

## Cost Analysis
- **Average Cost per Interaction**: $${costAnalysis.averageCostPerInteraction.toFixed(4)}

### Cost by Provider
${Object.entries(costAnalysis.costByProvider)
  .map(([provider, cost]) => `- **${provider}**: $${cost.toFixed(4)}`)
  .join('\n')}

### Cost by Type
${Object.entries(costAnalysis.costByType)
  .map(([type, cost]) => `- **${type}**: $${cost.toFixed(4)}`)
  .join('\n')}

---
*This report was automatically generated by SlideMaster*
`;

  return report;
}