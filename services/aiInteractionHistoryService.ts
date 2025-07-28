// =================================================================
// AI Interaction History Service - AI対話履歴管理システム
// =================================================================

import { 
  AIInteractionHistoryItem, 
  AIInteractionType, 
  AIInteractionStatus,
  AIInteractionInput,
  AIInteractionOutput,
  AIInteractionCost,
  Presentation
} from '../types';
import { APP_VERSION } from '../utils/versionManager';

/**
 * AI対話履歴管理サービス
 * すべてのAI操作のINPUT/OUTPUTを記録し、デバッグ・改善・コスト算出に活用
 */
export class AIInteractionHistoryService {
  private static instance: AIInteractionHistoryService | null = null;
  private currentPresentation: Presentation | null = null;
  private sessionId: string;
  private tempInteractionHistory: AIInteractionHistoryItem[] = []; // 一時的な履歴保存

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): AIInteractionHistoryService {
    if (!this.instance) {
      this.instance = new AIInteractionHistoryService();
    }
    return this.instance;
  }

  /**
   * 現在のプレゼンテーションを設定
   */
  setCurrentPresentation(presentation: Presentation): void {
    this.currentPresentation = presentation;
    if (!this.currentPresentation.aiInteractionHistory) {
      this.currentPresentation.aiInteractionHistory = [];
    }

    // 一時保存されていた履歴を移行
    if (this.tempInteractionHistory.length > 0) {
      console.log(`Moving ${this.tempInteractionHistory.length} interactions from temporary storage to presentation`);
      this.currentPresentation.aiInteractionHistory.push(...this.tempInteractionHistory);
      this.tempInteractionHistory = [];
    }
  }

  /**
   * 新しいセッションを開始
   */
  startNewSession(): string {
    this.sessionId = this.generateSessionId();
    return this.sessionId;
  }

  /**
   * AI対話の開始を記録
   */
  startInteraction(
    type: AIInteractionType,
    provider: string,
    model: string,
    input: AIInteractionInput,
    options?: {
      slideId?: string;
      layerId?: string;
      parentId?: string;
    }
  ): string {
    const id = this.generateInteractionId();
    
    const interaction: AIInteractionHistoryItem = {
      id,
      type,
      status: 'pending',
      timestamp: new Date(),
      provider,
      model,
      input,
      sessionId: this.sessionId,
      slideId: options?.slideId,
      layerId: options?.layerId,
      parentId: options?.parentId,
      appVersion: APP_VERSION,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };

    this.addInteraction(interaction);
    
    console.log(`📝 AI Interaction Started: ${type} (${provider}/${model}) - ID: ${id}`);
    return id;
  }

  /**
   * AI対話の成功完了を記録
   */
  completeInteraction(
    id: string,
    output: AIInteractionOutput,
    cost?: AIInteractionCost
  ): void {
    const interaction = this.findInteraction(id);
    if (!interaction) {
      console.warn(`AI Interaction not found: ${id}. Skipping completion record.`);
      return;
    }

    interaction.status = 'success';
    interaction.output = this.sanitizeOutput(output);
    interaction.cost = cost;

    // 処理時間を計算
    const processingTime = Date.now() - interaction.timestamp.getTime();
    if (interaction.output.metadata) {
      interaction.output.metadata.processingTime = processingTime;
    } else {
      interaction.output.metadata = { processingTime };
    }

    this.updateInteraction(interaction);
    
    console.log(`✅ AI Interaction Completed: ${interaction.type} - Processing time: ${processingTime}ms`);
  }

  /**
   * AI対話のエラーを記録
   */
  recordError(
    id: string,
    error: { code: string; message: string; details?: any }
  ): void {
    const interaction = this.findInteraction(id);
    if (!interaction) {
      console.warn(`AI Interaction not found: ${id}. Creating fallback error record.`);
      
      // フォールバック：インタラクションが見つからない場合でも記録
      this.createFallbackErrorRecord(id, error);
      return;
    }

    interaction.status = 'error';
    interaction.error = {
      code: error.code,
      message: error.message,
      details: this.sanitizeErrorDetails(error.details)
    };

    this.updateInteraction(interaction);
    
    console.log(`❌ AI Interaction Error: ${interaction.type} - ${error.message}`);
  }

  /**
   * AI対話のキャンセルを記録
   */
  cancelInteraction(id: string): void {
    const interaction = this.findInteraction(id);
    if (!interaction) {
      console.warn(`AI Interaction not found: ${id}`);
      return;
    }

    interaction.status = 'cancelled';
    this.updateInteraction(interaction);
    
    console.log(`⚠️ AI Interaction Cancelled: ${interaction.type}`);
  }

  /**
   * ユーザー評価を記録
   */
  recordUserRating(id: string, rating: number, feedback?: string): void {
    const interaction = this.findInteraction(id);
    if (!interaction) {
      console.warn(`AI Interaction not found: ${id}`);
      return;
    }

    interaction.userRating = rating;
    if (feedback) {
      interaction.userFeedback = feedback;
    }

    this.updateInteraction(interaction);
    
    console.log(`⭐ AI Interaction Rated: ${interaction.type} - ${rating}/5`);
  }

  /**
   * 履歴統計を取得
   */
  getStatistics(): {
    totalInteractions: number;
    successRate: number;
    averageProcessingTime: number;
    totalEstimatedCost: number;
    interactionsByType: Record<AIInteractionType, number>;
    interactionsByProvider: Record<string, number>;
    interactionsByStatus: Record<AIInteractionStatus, number>;
  } {
    if (!this.currentPresentation?.aiInteractionHistory) {
      return this.getEmptyStatistics();
    }

    const history = this.currentPresentation.aiInteractionHistory;
    const total = history.length;
    
    if (total === 0) {
      return this.getEmptyStatistics();
    }

    const successful = history.filter(h => h.status === 'success').length;
    const successRate = successful / total;

    const processingTimes = history
      .filter(h => h.output?.metadata?.processingTime)
      .map(h => h.output!.metadata!.processingTime!);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;

    const totalEstimatedCost = history
      .filter(h => h.cost)
      .reduce((total, h) => total + h.cost!.estimatedCost, 0);

    const interactionsByType = history.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1;
      return acc;
    }, {} as Record<AIInteractionType, number>);

    const interactionsByProvider = history.reduce((acc, h) => {
      acc[h.provider] = (acc[h.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const interactionsByStatus = history.reduce((acc, h) => {
      acc[h.status] = (acc[h.status] || 0) + 1;
      return acc;
    }, {} as Record<AIInteractionStatus, number>);

    return {
      totalInteractions: total,
      successRate,
      averageProcessingTime,
      totalEstimatedCost,
      interactionsByType,
      interactionsByProvider,
      interactionsByStatus
    };
  }

  /**
   * 履歴をエクスポート用に整理
   */
  exportHistory(): AIInteractionHistoryItem[] {
    return this.currentPresentation?.aiInteractionHistory || [];
  }

  /**
   * 履歴をクリア（新規プロジェクト時など）
   */
  clearHistory(): void {
    if (this.currentPresentation) {
      this.currentPresentation.aiInteractionHistory = [];
    }
    this.sessionId = this.generateSessionId();
  }

  // Private methods

  private addInteraction(interaction: AIInteractionHistoryItem): void {
    if (!this.currentPresentation) {
      console.warn('No current presentation set for AI interaction history. Using temporary storage.');
      // 一時的にメモリに保存（プレゼンテーション作成後に移行）
      if (!this.tempInteractionHistory) {
        this.tempInteractionHistory = [];
      }
      this.tempInteractionHistory.push(interaction);
      return;
    }

    if (!this.currentPresentation.aiInteractionHistory) {
      this.currentPresentation.aiInteractionHistory = [];
    }

    this.currentPresentation.aiInteractionHistory.push(interaction);
  }

  private findInteraction(id: string): AIInteractionHistoryItem | undefined {
    // 現在のプレゼンテーションから検索
    const presentationInteraction = this.currentPresentation?.aiInteractionHistory?.find(h => h.id === id);
    if (presentationInteraction) return presentationInteraction;

    // 一時保存からも検索
    const tempInteraction = this.tempInteractionHistory.find(h => h.id === id);
    if (tempInteraction) return tempInteraction;

    return undefined;
  }

  private updateInteraction(interaction: AIInteractionHistoryItem): void {
    // 現在のプレゼンテーションを優先して更新
    if (this.currentPresentation?.aiInteractionHistory) {
      const index = this.currentPresentation.aiInteractionHistory.findIndex(h => h.id === interaction.id);
      if (index >= 0) {
        this.currentPresentation.aiInteractionHistory[index] = interaction;
        return;
      }
    }

    // 一時保存からも検索して更新
    const tempIndex = this.tempInteractionHistory.findIndex(h => h.id === interaction.id);
    if (tempIndex >= 0) {
      this.tempInteractionHistory[tempIndex] = interaction;
    }
  }

  private generateInteractionId(): string {
    return `ai-interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmptyStatistics() {
    return {
      totalInteractions: 0,
      successRate: 0,
      averageProcessingTime: 0,
      totalEstimatedCost: 0,
      interactionsByType: {} as Record<AIInteractionType, number>,
      interactionsByProvider: {} as Record<string, number>,
      interactionsByStatus: {} as Record<AIInteractionStatus, number>
    };
  }

  /**
   * AI出力データを安全にサニタイズ
   */
  private sanitizeOutput(output: AIInteractionOutput): AIInteractionOutput {
    const sanitized = { ...output };

    // 画像データのサニタイズ
    if (sanitized.attachments?.images) {
      sanitized.attachments.images = sanitized.attachments.images.filter(img => {
        if (!img || typeof img !== 'string' || img.trim().length === 0) {
          console.warn('Invalid image data in AI output, filtering out');
          return false;
        }
        return true;
      });
    }

    // コンテンツサイズの制限
    if (sanitized.content && sanitized.content.length > 10000) {
      sanitized.content = sanitized.content.substring(0, 10000) + '...[truncated]';
    }

    return sanitized;
  }

  /**
   * エラー詳細を安全にサニタイズ
   */
  private sanitizeErrorDetails(details: any): any {
    if (!details) return details;

    try {
      // 循環参照やシリアライズ不可能なオブジェクトを処理
      return JSON.parse(JSON.stringify(details, (key, value) => {
        // 関数やundefinedは除外
        if (typeof value === 'function' || value === undefined) {
          return '[Function/Undefined]';
        }
        // 大きすぎる文字列は切り詰め
        if (typeof value === 'string' && value.length > 1000) {
          return value.substring(0, 1000) + '...[truncated]';
        }
        return value;
      }));
    } catch (error) {
      return { error: 'Failed to serialize error details', original: String(details) };
    }
  }

  /**
   * フォールバック用のエラー記録を作成
   */
  private createFallbackErrorRecord(id: string, error: { code: string; message: string; details?: any }): void {
    const fallbackInteraction: AIInteractionHistoryItem = {
      id,
      type: 'custom',
      status: 'error',
      timestamp: new Date(),
      provider: 'unknown',
      model: 'unknown',
      input: {
        prompt: 'Unknown - Fallback error record',
        context: 'This interaction was not properly initialized'
      },
      error: {
        code: error.code,
        message: error.message,
        details: this.sanitizeErrorDetails(error.details)
      },
      appVersion: APP_VERSION,
      sessionId: this.sessionId
    };

    this.addInteraction(fallbackInteraction);
    console.log(`📝 Created fallback error record for interaction: ${id}`);
  }
}

// 便利な関数をエクスポート
export const aiHistory = AIInteractionHistoryService.getInstance();

/**
 * 簡単なコスト計算ヘルパー関数
 */
export const calculateEstimatedCost = (
  provider: string,
  model: string,
  inputTokens: number = 0,
  outputTokens: number = 0,
  imageCount: number = 0,
  videoSeconds: number = 0
): AIInteractionCost => {
  // 大まかなコスト計算（実際の価格は変動するため概算）
  let estimatedCost = 0;

  // プロバイダー別コスト計算
  switch (provider.toLowerCase()) {
    case 'gemini':
      estimatedCost = (inputTokens * 0.000001) + (outputTokens * 0.000002);
      if (imageCount > 0) estimatedCost += imageCount * 0.002;
      break;
    
    case 'openai':
    case 'azure':
      if (model.includes('gpt-4')) {
        estimatedCost = (inputTokens * 0.00003) + (outputTokens * 0.00006);
      } else {
        estimatedCost = (inputTokens * 0.000001) + (outputTokens * 0.000002);
      }
      if (imageCount > 0) estimatedCost += imageCount * 0.02;
      break;
    
    case 'claude':
      estimatedCost = (inputTokens * 0.000008) + (outputTokens * 0.000024);
      break;
    
    case 'lmstudio':
    case 'fooocus':
      estimatedCost = 0; // ローカル実行のため無料
      break;
    
    default:
      estimatedCost = 0;
  }

  return {
    provider,
    model,
    inputTokens,
    outputTokens,
    imageCount,
    videoSeconds,
    estimatedCost,
    currency: 'USD'
  };
};