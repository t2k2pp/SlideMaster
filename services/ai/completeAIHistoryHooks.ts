// =================================================================
// Complete AI History Hooks - AI履歴フック統合システム
// 既存のAI呼び出し箇所に完全履歴記録機能を注入
// =================================================================

import { completeAIHistory, PromptTransformation } from './completeAIHistoryService';
import { apiCallTracker } from './apiCallTracker';
import { AIInteractionType, AIInteractionInput, AIInteractionOutput, AIInteractionCost } from '../../types';

/**
 * AI呼び出しフック設定
 */
export interface AICallHookConfig {
  trackPromptTransformations: boolean;
  trackAPICallDetails: boolean;
  enableCompletenessValidation: boolean;
  logDetailedDebugInfo: boolean;
}

/**
 * AI呼び出しコンテキスト
 */
export interface AICallContext {
  slideId?: string;
  layerId?: string;
  parentId?: string;
  userId?: string;
  sessionInfo?: any;
  requestMetadata?: any;
}

/**
 * 完全AI履歴記録用のデコレーター関数
 */
export function withCompleteAIHistoryTracking<T extends any[], R>(
  originalFunction: (...args: T) => Promise<R>,
  config: {
    interactionType: AIInteractionType;
    provider: string;
    model: string;
    extractInput: (...args: T) => AIInteractionInput;
    extractOutput?: (result: R) => AIInteractionOutput;
    extractCost?: (result: R, ...args: T) => AIInteractionCost;
    extractContext?: (...args: T) => AICallContext;
  }
) {
  return async function(...args: T): Promise<R> {
    // 1. インタラクション開始記録
    const input = config.extractInput(...args);
    const context = config.extractContext ? config.extractContext(...args) : {};
    
    const interactionId = completeAIHistory.startCompleteInteraction(
      config.interactionType,
      config.provider,
      config.model,
      input,
      {
        slideId: context.slideId,
        layerId: context.layerId,
        parentId: context.parentId,
        contextInfo: {
          userId: context.userId,
          sessionInfo: context.sessionInfo,
          requestMetadata: context.requestMetadata,
          originalArgs: args.length < 5 ? args : '[LARGE_ARGS_TRUNCATED]'
        }
      }
    );

    console.log(`🔄 Complete AI History: Started tracking interaction ${interactionId}`);

    try {
      // 2. 元の関数を実行
      const result = await originalFunction(...args);

      // 3. 成功時の記録
      const output = config.extractOutput ? config.extractOutput(result) : {
        content: typeof result === 'string' ? result : JSON.stringify(result).substring(0, 1000),
        metadata: {
          resultType: typeof result,
          resultSize: typeof result === 'string' ? result.length : JSON.stringify(result).length
        }
      };

      const cost = config.extractCost ? config.extractCost(result, ...args) : undefined;

      completeAIHistory.completeInteraction(
        interactionId,
        'success',
        output,
        undefined,
        cost
      );

      console.log(`✅ Complete AI History: Successfully completed interaction ${interactionId}`);
      return result;

    } catch (error) {
      // 4. エラー時の記録
      const errorInfo = {
        code: 'AI_CALL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? {
          name: error.name,
          stack: error.stack?.substring(0, 500)
        } : { error: String(error) }
      };

      completeAIHistory.failInteraction(interactionId, errorInfo);
      
      console.log(`❌ Complete AI History: Failed interaction ${interactionId}:`, errorInfo.message);
      throw error;
    }
  };
}

/**
 * プロンプト変換記録フック
 */
export function recordPromptTransformation(
  interactionId: string,
  originalInput: string,
  transformedPrompt: string,
  transformationType: PromptTransformation['transformationType'],
  transformationRules: string[],
  metadata?: PromptTransformation['metadata']
): string {
  return completeAIHistory.recordPromptTransformation(
    interactionId,
    originalInput,
    transformedPrompt,
    transformationType,
    transformationRules,
    metadata
  );
}

/**
 * API呼び出し追跡フック
 */
export function trackAPICall<T>(
  interactionId: string,
  provider: string,
  model: string,
  endpoint: string,
  apiCallFunction: () => Promise<T>,
  options?: {
    method?: string;
    timeout?: number;
    retryCount?: number;
    requestBody?: any;
  }
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const callId = apiCallTracker.trackCallStart(
      interactionId,
      provider,
      model,
      endpoint,
      options?.method || 'POST',
      {
        timeout: options?.timeout,
        retryCount: options?.retryCount,
        contextInfo: {
          requestBody: options?.requestBody
        }
      }
    );

    try {
      const result = await apiCallFunction();
      
      apiCallTracker.trackCallEnd(callId, {
        success: true,
        statusCode: 200,
        responseBody: result
      });

      resolve(result);
    } catch (error) {
      const errorInfo = {
        code: error instanceof Error ? error.name || 'API_ERROR' : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown API error',
        stack: error instanceof Error ? error.stack : undefined
      };

      apiCallTracker.trackCallFailure(callId, errorInfo);
      reject(error);
    }
  });
}

/**
 * UnifiedAIService のメソッドをラップする関数群
 */
export class CompleteAIHistoryWrapper {
  
  /**
   * generateText のラッピング
   */
  static wrapGenerateText(
    originalMethod: (prompt: string, options?: any) => Promise<string>,
    provider: string,
    model: string
  ) {
    return withCompleteAIHistoryTracking(
      originalMethod,
      {
        interactionType: 'text_generation',
        provider,
        model,
        extractInput: (prompt: string, options?: any) => ({
          prompt,
          context: options ? JSON.stringify(options) : undefined
        }),
        extractOutput: (result: string) => ({
          content: result,
          metadata: {
            contentLength: result.length,
            contentType: 'text'
          }
        })
      }
    );
  }

  /**
   * generateSlideContent のラッピング  
   */
  static wrapGenerateSlideContent(
    originalMethod: (topic: string, slideCount?: number, enhancedOptions?: any) => Promise<string>,
    provider: string,
    model: string
  ) {
    return withCompleteAIHistoryTracking(
      originalMethod,
      {
        interactionType: 'slide_generation',
        provider,
        model,
        extractInput: (topic: string, slideCount?: number, enhancedOptions?: any) => ({
          prompt: topic,
          context: JSON.stringify({
            slideCount,
            enhancedOptions: enhancedOptions ? {
              purpose: enhancedOptions.purpose,
              theme: enhancedOptions.theme,
              designer: enhancedOptions.designer,
              includeImages: enhancedOptions.includeImages
            } : undefined
          })
        }),
        extractOutput: (result: string) => ({
          content: result,
          metadata: {
            contentLength: result.length,
            contentType: 'marp_markdown',
            slideCount: (result.match(/^---/gm) || []).length + 1
          }
        }),
        extractContext: (topic: string, slideCount?: number, enhancedOptions?: any) => ({
          requestMetadata: {
            topic,
            slideCount,
            enhancedOptionsPresent: !!enhancedOptions
          }
        })
      }
    );
  }

  /**
   * generateImage のラッピング
   */
  static wrapGenerateImage(
    originalMethod: (prompt: string, options?: any) => Promise<string>,
    provider: string,
    model: string
  ) {
    return withCompleteAIHistoryTracking(
      originalMethod,
      {
        interactionType: 'image_generation',
        provider,
        model,
        extractInput: (prompt: string, options?: any) => ({
          prompt,
          context: options ? JSON.stringify(options) : undefined
        }),
        extractOutput: (result: string) => ({
          content: `[Generated Image - Base64 length: ${result.length}]`,
          attachments: {
            images: [result]
          },
          metadata: {
            contentType: 'image',
            imageSize: result.length
          }
        })
      }
    );
  }

  /**
   * generateSlideImage のラッピング
   */
  static wrapGenerateSlideImage(
    originalMethod: (prompt: string, options?: any) => Promise<string>,
    provider: string,
    model: string
  ) {
    return withCompleteAIHistoryTracking(
      originalMethod,
      {
        interactionType: 'slide_image_generation',
        provider,
        model,
        extractInput: (prompt: string, options?: any) => ({
          prompt,
          context: options ? JSON.stringify({
            slideTitle: options.slideTitle,
            slideContent: options.slideContent,
            imageType: options.imageType,
            size: options.size,
            quality: options.quality
          }) : undefined
        }),
        extractOutput: (result: string) => ({
          content: `[Generated Slide Image - Base64 length: ${result.length}]`,
          attachments: {
            images: [result]
          },
          metadata: {
            contentType: 'slide_image',
            imageSize: result.length
          }
        }),
        extractContext: (prompt: string, options?: any) => ({
          slideId: options?.slideId,
          layerId: options?.layerId,
          requestMetadata: {
            slideTitle: options?.slideTitle,
            imageType: options?.imageType
          }
        })
      }
    );
  }

  /**
   * analyzeVideo のラッピング
   */
  static wrapAnalyzeVideo(
    originalMethod: (videoData: string, prompt?: string) => Promise<string>,
    provider: string,
    model: string
  ) {
    return withCompleteAIHistoryTracking(
      originalMethod,
      {
        interactionType: 'video_analysis',
        provider,
        model,
        extractInput: (videoData: string, prompt?: string) => ({
          prompt: prompt || 'Analyze this video',
          context: `Video data length: ${videoData.length}`,
          attachments: {
            videos: [`[Video Data - ${videoData.length} bytes]`]
          }
        }),
        extractOutput: (result: string) => ({
          content: result,
          metadata: {
            contentLength: result.length,
            contentType: 'video_analysis_result'
          }
        })
      }
    );
  }
}

/**
 * プロンプト強化システムとの統合
 */
export function trackPromptEnhancement(
  interactionId: string,
  originalTopic: string,
  enhancedPrompt: string,
  enhancementRules: string[],
  contextInfo?: {
    theme?: string;
    designer?: string;
    purpose?: string;
    slideContext?: string;
  }
): string {
  return completeAIHistory.recordPromptTransformation(
    interactionId,
    originalTopic,
    enhancedPrompt,
    'enhancement',
    enhancementRules,
    {
      slideContext: contextInfo?.slideContext,
      designerStrategy: contextInfo?.designer,
      themeInfluence: contextInfo?.theme
    }
  );
}

/**
 * デザイナーストラテジーレベルでの追跡
 */
export function trackDesignerStrategy(
  interactionId: string,
  strategyName: string,
  originalRequest: any,
  processedRequest: any,
  appliedTransformations: string[]
): string {
  return completeAIHistory.recordPromptTransformation(
    interactionId,
    JSON.stringify(originalRequest),
    JSON.stringify(processedRequest),
    'style_injection',
    appliedTransformations,
    {
      designerStrategy: strategyName,
      slideContext: `Strategy: ${strategyName}`
    }
  );
}

/**
 * フック設定のデフォルト値
 */
export const defaultHookConfig: AICallHookConfig = {
  trackPromptTransformations: true,
  trackAPICallDetails: true,
  enableCompletenessValidation: true,
  logDetailedDebugInfo: true
};

/**
 * グローバルフック設定管理
 */
let globalHookConfig: AICallHookConfig = { ...defaultHookConfig };

export function setGlobalHookConfig(config: Partial<AICallHookConfig>): void {
  globalHookConfig = { ...globalHookConfig, ...config };
}

export function getGlobalHookConfig(): AICallHookConfig {
  return { ...globalHookConfig };
}

/**
 * フック適用状況の監視
 */
export interface HookStatus {
  totalHooksApplied: number;
  activeInteractions: number;
  completedInteractions: number;
  failedInteractions: number;
  lastHookApplied: Date | null;
}

let hookStatus: HookStatus = {
  totalHooksApplied: 0,
  activeInteractions: 0,
  completedInteractions: 0,
  failedInteractions: 0,
  lastHookApplied: null
};

export function getHookStatus(): HookStatus {
  return { ...hookStatus };
}

export function updateHookStatus(update: Partial<HookStatus>): void {
  hookStatus = { ...hookStatus, ...update };
  if (update.totalHooksApplied || update.lastHookApplied) {
    hookStatus.lastHookApplied = new Date();
  }
}

/**
 * デバッグ用: 履歴記録の完全性チェック
 */
export async function validateTrackingCompleteness(): Promise<{
  isComplete: boolean;
  missingItems: string[];
  recommendations: string[];
}> {
  const validation = completeAIHistory.validateCompleteness();
  const apiStats = apiCallTracker.getStatistics();
  
  const missingItems: string[] = [];
  const recommendations: string[] = [];

  // 基本的な完全性チェック
  if (validation.integrityScore < 95) {
    missingItems.push(`Integrity score is low: ${validation.integrityScore}%`);
  }

  if (validation.missingInteractions.length > 0) {
    missingItems.push(`${validation.missingInteractions.length} incomplete interactions`);
    recommendations.push('Complete pending interactions');
  }

  if (validation.orphanedInteractions.length > 0) {
    missingItems.push(`${validation.orphanedInteractions.length} orphaned API calls`);
    recommendations.push('Link orphaned API calls to interactions');
  }

  // API呼び出し統計チェック
  if (apiStats.failedCalls > 0) {
    recommendations.push(`Review ${apiStats.failedCalls} failed API calls`);
  }

  if (apiStats.pendingCalls > 0) {
    recommendations.push(`Monitor ${apiStats.pendingCalls} pending API calls`);
  }

  return {
    isComplete: missingItems.length === 0,
    missingItems,
    recommendations
  };
}