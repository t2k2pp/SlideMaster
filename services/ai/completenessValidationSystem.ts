// =================================================================
// Completeness Validation System - AI履歴完全性検証システム
// すべてのAI操作が漏れなく記録されていることを保証
// =================================================================

import { completeAIHistory, CompletenessValidation, PromptTransformation, APICallDetails } from './completeAIHistoryService';
import { apiCallTracker, CallStatistics } from './apiCallTracker';
import { AIInteractionHistoryItem, AIInteractionType } from '../../types';

/**
 * 検証レポートの詳細項目
 */
export interface DetailedValidationReport {
  // 基本検証結果
  completenessValidation: CompletenessValidation;
  
  // API呼び出し統計
  apiCallStatistics: CallStatistics;
  
  // 詳細分析
  detailedAnalysis: {
    interactionCompleteness: InteractionCompletenessReport;
    apiCallIntegrity: APICallIntegrityReport;
    dataConsistency: DataConsistencyReport;
    temporalAnalysis: TemporalAnalysisReport;
  };
  
  // 推奨アクション
  recommendations: ValidationRecommendation[];
  
  // 検証メタデータ
  validationMetadata: {
    timestamp: Date;
    validationDuration: number;
    systemVersion: string;
    validationLevel: 'basic' | 'detailed' | 'comprehensive';
  };
}

/**
 * インタラクション完全性レポート
 */
export interface InteractionCompletenessReport {
  totalInteractions: number;
  completeInteractions: number;
  incompleteInteractions: number;
  orphanedInteractions: number;
  duplicateInteractions: number;
  missingRequiredFields: string[];
  completenessRatio: number;
}

/**
 * API呼び出し整合性レポート
 */
export interface APICallIntegrityReport {
  totalAPICalls: number;
  linkedAPICalls: number;
  orphanedAPICalls: number;
  failedAPICalls: number;
  timeoutAPICalls: number;
  integrityRatio: number;
  averageResponseTime: number;
  errorPatterns: Array<{ error: string; count: number }>;
}

/**
 * データ一貫性レポート
 */
export interface DataConsistencyReport {
  providerConsistency: Array<{ provider: string; interactions: number; issues: string[] }>;
  modelConsistency: Array<{ model: string; interactions: number; issues: string[] }>;
  timestampConsistency: {
    validTimestamps: number;
    invalidTimestamps: number;
    chronologyIssues: number;
  };
  dataFormatConsistency: {
    validFormats: number;
    invalidFormats: number;
    formatIssues: string[];
  };
}

/**
 * 時間的分析レポート
 */
export interface TemporalAnalysisReport {
  timeRange: {
    earliest: Date | null;
    latest: Date | null;
    spanDays: number;
  };
  interactionFrequency: Array<{ date: string; count: number }>;
  peakUsageTime: string;
  unusualGaps: Array<{ start: Date; end: Date; durationHours: number }>;
}

/**
 * 検証推奨事項
 */
export interface ValidationRecommendation {
  type: 'error' | 'warning' | 'info' | 'optimization';
  category: 'completeness' | 'integrity' | 'consistency' | 'performance';
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  details?: any;
}

/**
 * 完全性検証システムメインクラス
 */
export class CompletenessValidationSystem {
  private static instance: CompletenessValidationSystem | null = null;

  private constructor() {
    console.log('🔍 CompletenessValidationSystem initialized');
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): CompletenessValidationSystem {
    if (!this.instance) {
      this.instance = new CompletenessValidationSystem();
    }
    return this.instance;
  }

  /**
   * 包括的検証を実行
   */
  async performComprehensiveValidation(): Promise<DetailedValidationReport> {
    const startTime = Date.now();
    console.log('🔍 Starting comprehensive AI history validation...');

    try {
      // 1. 基本完全性検証
      const completenessValidation = completeAIHistory.validateCompleteness();
      
      // 2. API呼び出し統計取得
      const apiCallStatistics = apiCallTracker.getStatistics();
      
      // 3. 詳細分析の実行
      const detailedAnalysis = await this.performDetailedAnalysis();
      
      // 4. 推奨事項の生成
      const recommendations = this.generateRecommendations(completenessValidation, apiCallStatistics, detailedAnalysis);
      
      // 5. 検証レポート作成
      const validationDuration = Date.now() - startTime;
      const report: DetailedValidationReport = {
        completenessValidation,
        apiCallStatistics,
        detailedAnalysis,
        recommendations,
        validationMetadata: {
          timestamp: new Date(),
          validationDuration,
          systemVersion: '1.0.0',
          validationLevel: 'comprehensive'
        }
      };

      console.log(`✅ Comprehensive validation completed in ${validationDuration}ms`);
      console.log(`📊 Validation Summary: ${recommendations.filter(r => r.type === 'error').length} errors, ${recommendations.filter(r => r.type === 'warning').length} warnings`);
      
      return report;

    } catch (error) {
      console.error('❌ Comprehensive validation failed:', error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 詳細分析実行
   */
  private async performDetailedAnalysis(): Promise<DetailedValidationReport['detailedAnalysis']> {
    const [
      interactionCompleteness,
      apiCallIntegrity,
      dataConsistency,
      temporalAnalysis
    ] = await Promise.all([
      this.analyzeInteractionCompleteness(),
      this.analyzeAPICallIntegrity(),
      this.analyzeDataConsistency(),
      this.analyzeTemporalPatterns()
    ]);

    return {
      interactionCompleteness,
      apiCallIntegrity,
      dataConsistency,
      temporalAnalysis
    };
  }

  /**
   * インタラクション完全性分析
   */
  private async analyzeInteractionCompleteness(): Promise<InteractionCompletenessReport> {
    const allInteractions = completeAIHistory.getAllInteractions();
    const totalInteractions = allInteractions.length;
    
    // 完了したインタラクション
    const completeInteractions = allInteractions.filter(i => 
      i.status !== 'pending' && i.id && i.timestamp && i.type && i.provider && i.model
    ).length;
    
    // 不完全なインタラクション
    const incompleteInteractions = totalInteractions - completeInteractions;
    
    // 重複インタラクション検出
    const interactionIds = allInteractions.map(i => i.id);
    const uniqueIds = new Set(interactionIds);
    const duplicateInteractions = interactionIds.length - uniqueIds.size;
    
    // 必須フィールド不足チェック
    const missingRequiredFields: string[] = [];
    allInteractions.forEach(interaction => {
      if (!interaction.id) missingRequiredFields.push('id');
      if (!interaction.timestamp) missingRequiredFields.push('timestamp');
      if (!interaction.type) missingRequiredFields.push('type');
      if (!interaction.provider) missingRequiredFields.push('provider');
      if (!interaction.model) missingRequiredFields.push('model');
    });
    
    const completenessRatio = totalInteractions > 0 ? completeInteractions / totalInteractions : 1;
    
    return {
      totalInteractions,
      completeInteractions,
      incompleteInteractions,
      orphanedInteractions: 0, // TODO: Implement orphaned detection
      duplicateInteractions,
      missingRequiredFields: [...new Set(missingRequiredFields)],
      completenessRatio
    };
  }

  /**
   * API呼び出し整合性分析
   */
  private async analyzeAPICallIntegrity(): Promise<APICallIntegrityReport> {
    const stats = apiCallTracker.getStatistics();
    const debugInfo = apiCallTracker.getDebugInfo();
    
    // エラーパターン分析
    const errorPatterns = Object.entries(stats.errorsByCode)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
    
    // 孤立したAPI呼び出し（インタラクションに紐づかない）
    const allInteractions = completeAIHistory.getAllInteractions();
    const linkedCallIds = new Set<string>();
    allInteractions.forEach(interaction => {
      interaction.metadata?.apiCallIds?.forEach(id => linkedCallIds.add(id));
    });
    
    const totalAPICalls = stats.totalCalls;
    const linkedAPICalls = linkedCallIds.size;
    const orphanedAPICalls = totalAPICalls - linkedAPICalls;
    const integrityRatio = totalAPICalls > 0 ? linkedAPICalls / totalAPICalls : 1;
    
    return {
      totalAPICalls,
      linkedAPICalls,
      orphanedAPICalls,
      failedAPICalls: stats.failedCalls,
      timeoutAPICalls: debugInfo.pendingCalls.length, // Approximation
      integrityRatio,
      averageResponseTime: stats.averageResponseTime,
      errorPatterns
    };
  }

  /**
   * データ一貫性分析
   */
  private async analyzeDataConsistency(): Promise<DataConsistencyReport> {
    const allInteractions = completeAIHistory.getAllInteractions();
    
    // プロバイダー一貫性チェック
    const providerStats = new Map<string, { interactions: number; issues: string[] }>();
    
    // モデル一貫性チェック
    const modelStats = new Map<string, { interactions: number; issues: string[] }>();
    
    // タイムスタンプ一貫性チェック
    let validTimestamps = 0;
    let invalidTimestamps = 0;
    let chronologyIssues = 0;
    
    // データフォーマット一貫性チェック
    let validFormats = 0;
    let invalidFormats = 0;
    const formatIssues: string[] = [];
    
    let previousTimestamp: Date | null = null;
    
    allInteractions.forEach((interaction, index) => {
      // プロバイダー統計
      if (!providerStats.has(interaction.provider)) {
        providerStats.set(interaction.provider, { interactions: 0, issues: [] });
      }
      const providerStat = providerStats.get(interaction.provider)!;
      providerStat.interactions++;
      
      // モデル統計
      if (!modelStats.has(interaction.model)) {
        modelStats.set(interaction.model, { interactions: 0, issues: [] });
      }
      const modelStat = modelStats.get(interaction.model)!;
      modelStat.interactions++;
      
      // タイムスタンプ検証
      if (interaction.timestamp instanceof Date && !isNaN(interaction.timestamp.getTime())) {
        validTimestamps++;
        
        // 時系列チェック
        if (previousTimestamp && interaction.timestamp < previousTimestamp) {
          chronologyIssues++;
        }
        previousTimestamp = interaction.timestamp;
      } else {
        invalidTimestamps++;
      }
      
      // データフォーマット検証
      try {
        if (interaction.input && interaction.input.prompt) {
          validFormats++;
        } else {
          invalidFormats++;
          formatIssues.push(`Interaction ${interaction.id}: Missing or invalid input format`);
        }
      } catch (error) {
        invalidFormats++;
        formatIssues.push(`Interaction ${interaction.id}: Format validation error`);
      }
    });
    
    return {
      providerConsistency: Array.from(providerStats.entries())
        .map(([provider, stats]) => ({ provider, ...stats })),
      modelConsistency: Array.from(modelStats.entries())
        .map(([model, stats]) => ({ model, ...stats })),
      timestampConsistency: {
        validTimestamps,
        invalidTimestamps,
        chronologyIssues
      },
      dataFormatConsistency: {
        validFormats,
        invalidFormats,
        formatIssues: formatIssues.slice(0, 10) // 最初の10件のみ
      }
    };
  }

  /**
   * 時間的パターン分析
   */
  private async analyzeTemporalPatterns(): Promise<TemporalAnalysisReport> {
    const allInteractions = completeAIHistory.getAllInteractions();
    const validInteractions = allInteractions.filter(i => 
      i.timestamp instanceof Date && !isNaN(i.timestamp.getTime())
    );
    
    if (validInteractions.length === 0) {
      return {
        timeRange: { earliest: null, latest: null, spanDays: 0 },
        interactionFrequency: [],
        peakUsageTime: 'No data available',
        unusualGaps: []
      };
    }
    
    // 時間範囲分析
    const timestamps = validInteractions.map(i => i.timestamp.getTime()).sort((a, b) => a - b);
    const earliest = new Date(timestamps[0]);
    const latest = new Date(timestamps[timestamps.length - 1]);
    const spanDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
    
    // 頻度分析（日別）
    const frequencyMap = new Map<string, number>();
    validInteractions.forEach(interaction => {
      const dateKey = interaction.timestamp.toISOString().split('T')[0];
      frequencyMap.set(dateKey, (frequencyMap.get(dateKey) || 0) + 1);
    });
    
    const interactionFrequency = Array.from(frequencyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // ピーク使用時間分析（時間帯別）
    const hourCounts = new Array(24).fill(0);
    validInteractions.forEach(interaction => {
      const hour = interaction.timestamp.getHours();
      hourCounts[hour]++;
    });
    
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakUsageTime = `${peakHour}:00 - ${peakHour + 1}:00`;
    
    // 異常なギャップ検出（6時間以上の空白）
    const unusualGaps: Array<{ start: Date; end: Date; durationHours: number }> = [];
    for (let i = 1; i < validInteractions.length; i++) {
      const gap = validInteractions[i].timestamp.getTime() - validInteractions[i - 1].timestamp.getTime();
      const gapHours = gap / (1000 * 60 * 60);
      
      if (gapHours > 6) {
        unusualGaps.push({
          start: validInteractions[i - 1].timestamp,
          end: validInteractions[i].timestamp,
          durationHours: Math.round(gapHours * 10) / 10
        });
      }
    }
    
    return {
      timeRange: { earliest, latest, spanDays },
      interactionFrequency,
      peakUsageTime,
      unusualGaps: unusualGaps.slice(0, 5) // 最初の5件のみ
    };
  }

  /**
   * 推奨事項生成
   */
  private generateRecommendations(
    completenessValidation: CompletenessValidation,
    apiCallStats: CallStatistics,
    detailedAnalysis: DetailedValidationReport['detailedAnalysis']
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];
    
    // 完全性に関する推奨事項
    if (completenessValidation.integrityScore < 95) {
      recommendations.push({
        type: 'error',
        category: 'completeness',
        message: `整合性スコアが低すぎます: ${completenessValidation.integrityScore}%`,
        priority: 'high',
        actionRequired: true,
        details: { score: completenessValidation.integrityScore }
      });
    }
    
    if (completenessValidation.missingInteractions.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'completeness',
        message: `${completenessValidation.missingInteractions.length}件の未完了インタラクションがあります`,
        priority: 'medium',
        actionRequired: true,
        details: { count: completenessValidation.missingInteractions.length }
      });
    }
    
    // API呼び出しに関する推奨事項
    if (apiCallStats.failedCalls > 0) {
      const failureRate = apiCallStats.failedCalls / apiCallStats.totalCalls;
      recommendations.push({
        type: failureRate > 0.1 ? 'error' : 'warning',
        category: 'integrity',
        message: `${apiCallStats.failedCalls}件のAPI呼び出しが失敗しています（失敗率: ${(failureRate * 100).toFixed(1)}%）`,
        priority: failureRate > 0.1 ? 'high' : 'medium',
        actionRequired: failureRate > 0.1,
        details: { failedCalls: apiCallStats.failedCalls, failureRate }
      });
    }
    
    // データ一貫性に関する推奨事項
    if (detailedAnalysis.dataConsistency.timestampConsistency.invalidTimestamps > 0) {
      recommendations.push({
        type: 'warning',
        category: 'consistency',
        message: `${detailedAnalysis.dataConsistency.timestampConsistency.invalidTimestamps}件の無効なタイムスタンプがあります`,
        priority: 'medium',
        actionRequired: false,
        details: detailedAnalysis.dataConsistency.timestampConsistency
      });
    }
    
    // パフォーマンスに関する推奨事項
    if (apiCallStats.averageResponseTime > 5000) {
      recommendations.push({
        type: 'info',
        category: 'performance',
        message: `平均応答時間が長すぎます: ${apiCallStats.averageResponseTime}ms`,
        priority: 'low',
        actionRequired: false,
        details: { averageResponseTime: apiCallStats.averageResponseTime }
      });
    }
    
    // 最適化提案
    if (detailedAnalysis.interactionCompleteness.completenessRatio > 0.95) {
      recommendations.push({
        type: 'info',
        category: 'optimization',
        message: 'データ品質が良好です。継続的な監視を推奨します',
        priority: 'low',
        actionRequired: false
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * クイック検証（軽量版）
   */
  async performQuickValidation(): Promise<{ isHealthy: boolean; issues: string[]; recommendations: string[] }> {
    console.log('⚡ Performing quick validation...');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // 基本完全性チェック
      const completenessValidation = completeAIHistory.validateCompleteness();
      
      if (completenessValidation.integrityScore < 90) {
        issues.push(`整合性スコア低下: ${completenessValidation.integrityScore}%`);
        recommendations.push('詳細検証を実行してください');
      }
      
      // API統計チェック
      const apiStats = apiCallTracker.getStatistics();
      const failureRate = apiStats.totalCalls > 0 ? apiStats.failedCalls / apiStats.totalCalls : 0;
      
      if (failureRate > 0.1) {
        issues.push(`API失敗率が高すぎます: ${(failureRate * 100).toFixed(1)}%`);
        recommendations.push('API設定とネットワーク接続を確認してください');
      }
      
      if (apiStats.pendingCalls > 5) {
        issues.push(`保留中のAPI呼び出しが多すぎます: ${apiStats.pendingCalls}件`);
        recommendations.push('保留中の処理を確認してください');
      }
      
      const isHealthy = issues.length === 0;
      
      console.log(`⚡ Quick validation completed: ${isHealthy ? 'Healthy' : 'Issues found'}`);
      
      return { isHealthy, issues, recommendations };
      
    } catch (error) {
      console.error('❌ Quick validation failed:', error);
      return {
        isHealthy: false,
        issues: ['検証システムエラー'],
        recommendations: ['システム管理者に連絡してください']
      };
    }
  }

  /**
   * 検証レポートのエクスポート
   */
  exportValidationReport(report: DetailedValidationReport): string {
    const exportData = {
      ...report,
      exportTimestamp: new Date().toISOString(),
      formatVersion: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 検証レポートの人間が読める形式での生成
   */
  generateHumanReadableReport(report: DetailedValidationReport): string {
    let markdown = `# AI履歴完全性検証レポート\n\n`;
    markdown += `**検証実行時刻**: ${report.validationMetadata.timestamp.toLocaleString('ja-JP')}\n`;
    markdown += `**検証レベル**: ${report.validationMetadata.validationLevel}\n`;
    markdown += `**処理時間**: ${report.validationMetadata.validationDuration}ms\n\n`;
    
    // サマリー
    markdown += `## 検証サマリー\n\n`;
    markdown += `- **整合性スコア**: ${report.completenessValidation.integrityScore}%\n`;
    markdown += `- **総インタラクション数**: ${report.detailedAnalysis.interactionCompleteness.totalInteractions}\n`;
    markdown += `- **完了インタラクション数**: ${report.detailedAnalysis.interactionCompleteness.completeInteractions}\n`;
    markdown += `- **総API呼び出し数**: ${report.apiCallStatistics.totalCalls}\n`;
    markdown += `- **成功率**: ${((report.apiCallStatistics.successfulCalls / Math.max(1, report.apiCallStatistics.totalCalls)) * 100).toFixed(1)}%\n\n`;
    
    // 推奨事項
    markdown += `## 推奨事項\n\n`;
    if (report.recommendations.length === 0) {
      markdown += `問題は検出されませんでした。✅\n\n`;
    } else {
      report.recommendations.forEach((rec, index) => {
        const emoji = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        markdown += `${index + 1}. ${emoji} **${rec.category}** (${rec.priority}): ${rec.message}\n`;
        if (rec.actionRequired) {
          markdown += `   - 対応が必要です\n`;
        }
      });
      markdown += `\n`;
    }
    
    // 詳細統計
    markdown += `## 詳細統計\n\n`;
    markdown += `### インタラクション完全性\n`;
    markdown += `- 完全性率: ${(report.detailedAnalysis.interactionCompleteness.completenessRatio * 100).toFixed(1)}%\n`;
    markdown += `- 不完全なインタラクション: ${report.detailedAnalysis.interactionCompleteness.incompleteInteractions}件\n`;
    markdown += `- 重複インタラクション: ${report.detailedAnalysis.interactionCompleteness.duplicateInteractions}件\n\n`;
    
    markdown += `### API呼び出し統計\n`;
    markdown += `- 平均応答時間: ${report.apiCallStatistics.averageResponseTime.toFixed(1)}ms\n`;
    markdown += `- 失敗したAPI呼び出し: ${report.apiCallStatistics.failedCalls}件\n`;
    markdown += `- 保留中のAPI呼び出し: ${report.apiCallStatistics.pendingCalls}件\n\n`;
    
    return markdown;
  }
}

// シングルトンインスタンスをエクスポート
export const completenessValidation = CompletenessValidationSystem.getInstance();