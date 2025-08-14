// =================================================================
// Complete AI History Service - AI履歴完全管理システム
// すべてのAI操作の送信・応答を漏れなく記録し個別ファイル化
// =================================================================

import { 
  AIInteractionHistoryItem, 
  AIInteractionType, 
  AIInteractionStatus,
  AIInteractionInput,
  AIInteractionOutput,
  AIInteractionCost,
  Presentation
} from '../../types';
import { APP_VERSION } from '../../utils/versionManager';

/**
 * プロンプト変換記録
 */
export interface PromptTransformation {
  id: string;
  originalInput: string;
  transformedPrompt: string;
  transformationType: 'enhancement' | 'style_injection' | 'context_addition' | 'system_prompt_addition';
  transformationRules: string[];
  timestamp: Date;
  metadata?: {
    slideContext?: string;
    imageContext?: string;
    designerStrategy?: string;
    themeInfluence?: string;
  };
}

/**
 * API呼び出し詳細記録
 */
export interface APICallDetails {
  callId: string;
  timestamp: Date;
  provider: string;
  model: string;
  endpoint: string;
  httpMethod: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  statusCode?: number;
  duration: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

/**
 * 完全性検証結果
 */
export interface CompletenessValidation {
  totalAPICalls: number;
  recordedInteractions: number;
  missingInteractions: string[];
  orphanedInteractions: string[];
  integrityScore: number; // 0-100
  recommendations: string[];
  validationTimestamp: Date;
}

/**
 * AI履歴の完全記録サービス
 * 既存のAIInteractionHistoryServiceを拡張し、完全性保証を追加
 */
export class CompleteAIHistoryService {
  private static instance: CompleteAIHistoryService | null = null;
  private currentPresentation: Presentation | null = null;
  private sessionId: string;
  private tempInteractionHistory: AIInteractionHistoryItem[] = [];
  private promptTransformations: Map<string, PromptTransformation[]> = new Map();
  private apiCallDetails: Map<string, APICallDetails> = new Map();
  private pendingInteractions: Map<string, Partial<AIInteractionHistoryItem>> = new Map();

  private constructor() {
    this.sessionId = this.generateSessionId();
    console.log(`🔥 CompleteAIHistoryService initialized with session: ${this.sessionId}`);
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): CompleteAIHistoryService {
    if (!this.instance) {
      this.instance = new CompleteAIHistoryService();
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
      console.log(`📦 Moving ${this.tempInteractionHistory.length} interactions from temporary storage to presentation`);
      this.currentPresentation.aiInteractionHistory.push(...this.tempInteractionHistory);
      this.tempInteractionHistory = [];
    }
  }

  /**
   * 新しいセッションを開始
   */
  startNewSession(): string {
    this.sessionId = this.generateSessionId();
    console.log(`🔄 Starting new AI history session: ${this.sessionId}`);
    return this.sessionId;
  }

  /**
   * AI対話の開始を記録（完全版）
   */
  startCompleteInteraction(
    type: AIInteractionType,
    provider: string,
    model: string,
    input: AIInteractionInput,
    options?: {
      slideId?: string;
      layerId?: string;
      parentId?: string;
      contextInfo?: any;
    }
  ): string {
    const id = this.generateInteractionId();
    
    const interaction: Partial<AIInteractionHistoryItem> = {
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
      metadata: {
        appVersion: APP_VERSION,
        contextInfo: options?.contextInfo,
        startTimestamp: Date.now()
      }
    };

    // 保留中のインタラクションとして記録
    this.pendingInteractions.set(id, interaction);
    
    console.log(`🚀 Started AI interaction: ${id} (${type}/${provider}/${model})`);
    return id;
  }

  /**
   * プロンプト変換過程を記録
   */
  recordPromptTransformation(
    interactionId: string,
    originalInput: string,
    transformedPrompt: string,
    transformationType: PromptTransformation['transformationType'],
    transformationRules: string[],
    metadata?: PromptTransformation['metadata']
  ): string {
    const transformationId = this.generateTransformationId();
    
    const transformation: PromptTransformation = {
      id: transformationId,
      originalInput,
      transformedPrompt,
      transformationType,
      transformationRules,
      timestamp: new Date(),
      metadata
    };

    // インタラクションIDに紐づけて保存
    if (!this.promptTransformations.has(interactionId)) {
      this.promptTransformations.set(interactionId, []);
    }
    this.promptTransformations.get(interactionId)!.push(transformation);

    console.log(`🔄 Recorded prompt transformation: ${transformationId} for interaction ${interactionId}`);
    console.log(`   Type: ${transformationType}, Rules: ${transformationRules.length}`);
    
    return transformationId;
  }

  /**
   * API呼び出し詳細を記録
   */
  recordAPICallDetails(
    interactionId: string,
    callDetails: Omit<APICallDetails, 'callId' | 'timestamp'>
  ): string {
    const callId = this.generateAPICallId();
    
    const details: APICallDetails = {
      callId,
      timestamp: new Date(),
      ...callDetails
    };

    this.apiCallDetails.set(callId, details);

    // インタラクションのメタデータに関連付け
    const interaction = this.pendingInteractions.get(interactionId);
    if (interaction?.metadata) {
      if (!interaction.metadata.apiCalls) {
        interaction.metadata.apiCalls = [];
      }
      interaction.metadata.apiCalls.push(callId);
    }

    console.log(`📞 Recorded API call details: ${callId} for interaction ${interactionId}`);
    return callId;
  }

  /**
   * AI対話の完了を記録
   */
  completeInteraction(
    id: string,
    status: 'success' | 'error' | 'cancelled',
    output?: AIInteractionOutput,
    error?: { code: string; message: string; details?: any },
    cost?: AIInteractionCost,
    userRating?: number
  ): void {
    const pendingInteraction = this.pendingInteractions.get(id);
    if (!pendingInteraction) {
      console.error(`❌ Cannot complete interaction ${id}: not found in pending`);
      return;
    }

    // 処理時間計算
    const endTimestamp = Date.now();
    const startTimestamp = pendingInteraction.metadata?.startTimestamp;
    const duration = startTimestamp ? endTimestamp - startTimestamp : undefined;

    // 完全なインタラクション記録を作成
    const completeInteraction: AIInteractionHistoryItem = {
      ...pendingInteraction as AIInteractionHistoryItem,
      status,
      output,
      error,
      cost,
      userRating,
      duration,
      metadata: {
        ...pendingInteraction.metadata,
        endTimestamp,
        completionTime: new Date(),
        promptTransformationIds: this.promptTransformations.get(id)?.map(t => t.id) || [],
        apiCallIds: pendingInteraction.metadata?.apiCalls || []
      }
    };

    // メイン履歴に追加
    this.addInteractionToHistory(completeInteraction);

    // 保留中リストから削除
    this.pendingInteractions.delete(id);

    console.log(`✅ Completed AI interaction: ${id} (${status})`);
    if (duration) {
      console.log(`   Duration: ${duration}ms`);
    }
    if (cost) {
      console.log(`   Cost: $${cost.estimatedCost.toFixed(4)}`);
    }
  }

  /**
   * 失敗したインタラクションを記録
   */
  failInteraction(
    id: string,
    error: { code: string; message: string; details?: any }
  ): void {
    this.completeInteraction(id, 'error', undefined, error);
  }

  /**
   * インタラクションを履歴に追加
   */
  private addInteractionToHistory(interaction: AIInteractionHistoryItem): void {
    if (this.currentPresentation?.aiInteractionHistory) {
      this.currentPresentation.aiInteractionHistory.push(interaction);
    } else {
      this.tempInteractionHistory.push(interaction);
    }
  }

  /**
   * 完全性検証を実行
   */
  validateCompleteness(): CompletenessValidation {
    const allInteractions = this.getAllInteractions();
    const pendingCount = this.pendingInteractions.size;
    const completedCount = allInteractions.length;
    const totalCalls = this.apiCallDetails.size;

    // 孤立したAPIコールを検出
    const linkedCallIds = new Set<string>();
    allInteractions.forEach(interaction => {
      interaction.metadata?.apiCallIds?.forEach(id => linkedCallIds.add(id));
    });
    
    const orphanedCalls = Array.from(this.apiCallDetails.keys())
      .filter(callId => !linkedCallIds.has(callId));

    // 完全性スコア計算
    const integrityScore = Math.max(0, Math.min(100, 
      ((completedCount / Math.max(1, completedCount + pendingCount)) * 100) - (orphanedCalls.length * 5)
    ));

    const recommendations: string[] = [];
    if (pendingCount > 0) {
      recommendations.push(`${pendingCount}件の未完了インタラクションがあります`);
    }
    if (orphanedCalls.length > 0) {
      recommendations.push(`${orphanedCalls.length}件の孤立したAPIコールがあります`);
    }
    if (integrityScore < 95) {
      recommendations.push('データの整合性に問題がある可能性があります');
    }

    const validation: CompletenessValidation = {
      totalAPICalls: totalCalls,
      recordedInteractions: completedCount,
      missingInteractions: Array.from(this.pendingInteractions.keys()),
      orphanedInteractions: orphanedCalls,
      integrityScore,
      recommendations,
      validationTimestamp: new Date()
    };

    console.log(`🔍 Completeness validation result: ${integrityScore}% integrity`);
    return validation;
  }

  /**
   * すべてのインタラクションを取得
   */
  getAllInteractions(): AIInteractionHistoryItem[] {
    const interactions: AIInteractionHistoryItem[] = [];
    
    if (this.currentPresentation?.aiInteractionHistory) {
      interactions.push(...this.currentPresentation.aiInteractionHistory);
    }
    
    interactions.push(...this.tempInteractionHistory);
    
    return interactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * プロンプト変換履歴を取得
   */
  getPromptTransformations(interactionId?: string): Map<string, PromptTransformation[]> {
    if (interactionId) {
      const transformations = this.promptTransformations.get(interactionId);
      if (transformations) {
        return new Map([[interactionId, transformations]]);
      }
      return new Map();
    }
    return new Map(this.promptTransformations);
  }

  /**
   * API呼び出し詳細を取得
   */
  getAPICallDetails(callId?: string): Map<string, APICallDetails> {
    if (callId) {
      const details = this.apiCallDetails.get(callId);
      if (details) {
        return new Map([[callId, details]]);
      }
      return new Map();
    }
    return new Map(this.apiCallDetails);
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    const interactions = this.getAllInteractions();
    const transformationsCount = Array.from(this.promptTransformations.values())
      .reduce((sum, arr) => sum + arr.length, 0);
    
    return {
      totalInteractions: interactions.length,
      pendingInteractions: this.pendingInteractions.size,
      completedInteractions: interactions.filter(i => i.status !== 'pending').length,
      successfulInteractions: interactions.filter(i => i.status === 'success').length,
      failedInteractions: interactions.filter(i => i.status === 'error').length,
      totalPromptTransformations: transformationsCount,
      totalAPICallDetails: this.apiCallDetails.size,
      sessionId: this.sessionId
    };
  }

  /**
   * クリーンアップ（メモリ管理）
   */
  cleanup(): void {
    // 古いデータを削除（24時間以上前）
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    // 完了済みの古いAPIコール詳細を削除
    for (const [callId, details] of this.apiCallDetails.entries()) {
      if (details.timestamp.getTime() < cutoff) {
        this.apiCallDetails.delete(callId);
      }
    }
    
    console.log(`🧹 Cleaned up old API call details`);
  }

  // =================================================================
  // Private Helper Methods
  // =================================================================

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateInteractionId(): string {
    return `interaction-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateTransformationId(): string {
    return `transform-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateAPICallId(): string {
    return `apicall-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

// シングルトンインスタンスをエクスポート
export const completeAIHistory = CompleteAIHistoryService.getInstance();