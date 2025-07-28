// =================================================================
// AI Service Integration - 既存システムとの統合レイヤー
// 新AIプロバイダーシステムと既存コードの橋渡し
// =================================================================

import { 
  AIProviderFactory,
  createAIProvider,
  getCurrentAIProvider,
  getBestAIProvider,
  getRecommendedAIProvider
} from './aiProviderFactory';

import {
  AIProvider,
  AIProviderType,
  TextGenerationRequest,
  ImageGenerationRequest,
  VideoAnalysisRequest
} from './aiProviderInterface';

import { getUserSettings } from '../storageService';
import { aiHistory, calculateEstimatedCost } from '../aiInteractionHistoryService';

// 既存のGeminiサービスとの互換性を保つためのラッパー関数群

/**
 * 既存のgenerateText関数と互換性のあるテキスト生成
 */
export const generateTextWithAI = async (
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    provider?: AIProviderType;
  }
): Promise<string> => {
  // Start AI interaction history recording
  const providerType = options?.provider || 'auto';
  const interactionId = aiHistory.startInteraction(
    'text_generation',
    providerType === 'auto' ? 'unknown' : providerType,
    options?.model || 'auto',
    {
      prompt: prompt.substring(0, 1000), // Limit for storage
      context: options?.systemPrompt,
      settings: {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        provider: options?.provider
      }
    }
  );

  try {
    let provider: AIProvider;
    
    if (options?.provider) {
      // 特定のプロバイダーを指定
      const settings = getUserSettings();
      const config = AIProviderFactory['getProviderConfig'](options.provider, settings);
      provider = await createAIProvider(config);
    } else {
      // タスク別プロバイダーを取得
      provider = await AIProviderFactory.getProviderForTask('text');
    }

    const request: TextGenerationRequest = {
      prompt,
      model: options?.model || 'auto',
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      systemPrompt: options?.systemPrompt
    };

    const result = await provider.generateText(request);
    
    // Record successful completion in AI interaction history
    aiHistory.completeInteraction(
      interactionId,
      {
        content: result.substring(0, 500), // Limit for storage
        metadata: {
          contentType: 'text',
          modelUsed: options?.model || 'auto',
          quality: 1.0
        }
      },
      calculateEstimatedCost(provider.name, options?.model || 'auto', 1000, 2000)
    );
    
    // パフォーマンス測定
    AIProviderFactory.recordPerformance(
      provider.name,
      'text',
      Date.now() - Date.now(), // 実際の測定は要実装
      true
    );

    return result;
  } catch (error) {
    console.error('AI text generation failed:', error);
    
    // Record error in AI interaction history
    aiHistory.recordError(interactionId, {
      code: 'AI_TEXT_GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown AI text generation error',
      details: error
    });
    
    throw error;
  }
};

/**
 * 既存のgenerateImage関数と互換性のある画像生成
 */
export const generateImageWithAI = async (
  prompt: string,
  options?: {
    model?: string;
    size?: string;
    quality?: string;
    style?: string;
    n?: number;
    provider?: AIProviderType;
  }
): Promise<string> => {
  // Start AI interaction history recording
  const providerType = options?.provider || 'auto';
  const interactionId = aiHistory.startInteraction(
    'image_generation',
    providerType === 'auto' ? 'unknown' : providerType,
    options?.model || 'auto',
    {
      prompt: prompt.substring(0, 1000),
      settings: {
        size: options?.size,
        quality: options?.quality,
        style: options?.style,
        n: options?.n,
        provider: options?.provider
      }
    }
  );

  try {
    let provider: AIProvider;
    const startTime = Date.now();

    if (options?.provider) {
      const settings = getUserSettings();
      const config = AIProviderFactory['getProviderConfig'](options.provider, settings);
      provider = await createAIProvider(config);
    } else {
      // タスク別画像生成プロバイダーを取得
      provider = await AIProviderFactory.getProviderForTask('image');
    }

    const request: ImageGenerationRequest = {
      prompt,
      model: options?.model || 'auto',
      size: options?.size,
      quality: options?.quality,
      style: options?.style,
      n: options?.n
    };

    const result = await provider.generateImage(request);
    
    // Record successful completion in AI interaction history
    const responseTime = Date.now() - startTime;
    aiHistory.completeInteraction(
      interactionId,
      {
        content: `Generated image for: ${prompt.substring(0, 100)}...`,
        metadata: {
          contentType: 'image',
          modelUsed: options?.model || 'auto',
          processingTime: responseTime,
          quality: 1.0
        },
        attachments: {
          images: [result]
        }
      },
      calculateEstimatedCost(provider.name, options?.model || 'auto', 0, 0, 1, 0)
    );
    
    // パフォーマンス測定
    AIProviderFactory.recordPerformance(
      provider.name,
      'image',
      responseTime,
      true
    );

    return result;
  } catch (error) {
    console.error('AI image generation failed:', error);
    
    // Record error in AI interaction history
    aiHistory.recordError(interactionId, {
      code: 'AI_IMAGE_GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown AI image generation error',
      details: error
    });
    
    throw error;
  }
};

/**
 * 既存のanalyzeVideo関数と互換性のある動画分析
 */
export const analyzeVideoWithAI = async (
  videoData: string,
  prompt: string,
  options?: {
    model?: string;
    provider?: AIProviderType;
  }
): Promise<string> => {
  // Start AI interaction history recording
  const providerType = options?.provider || 'auto';
  const interactionId = aiHistory.startInteraction(
    'video_analysis',
    providerType === 'auto' ? 'unknown' : providerType,
    options?.model || 'auto',
    {
      prompt: prompt.substring(0, 1000),
      context: `Video data size: ${(videoData.length / 1024 / 1024).toFixed(2)}MB`,
      settings: {
        model: options?.model,
        provider: options?.provider
      }
    }
  );

  try {
    let provider: AIProvider;
    const startTime = Date.now();

    if (options?.provider) {
      const settings = getUserSettings();
      const config = AIProviderFactory['getProviderConfig'](options.provider, settings);
      provider = await createAIProvider(config);
    } else {
      // タスク別動画分析プロバイダーを取得
      provider = await AIProviderFactory.getProviderForTask('video');
    }

    const request: VideoAnalysisRequest = {
      videoData,
      prompt,
      model: options?.model || 'auto'
    };

    const result = await provider.analyzeVideo(request);
    
    // Record successful completion in AI interaction history
    const responseTime = Date.now() - startTime;
    aiHistory.completeInteraction(
      interactionId,
      {
        content: `Video analysis completed: ${result.substring(0, 200)}...`,
        metadata: {
          contentType: 'video_analysis',
          modelUsed: options?.model || 'auto',
          processingTime: responseTime,
          quality: 1.0,
          videoSeconds: Math.floor(videoData.length / 1024 / 1024) // Rough estimate
        }
      },
      calculateEstimatedCost(provider.name, options?.model || 'auto', 1000, 2000, 0, Math.floor(videoData.length / 1024 / 1024))
    );
    
    // パフォーマンス測定
    AIProviderFactory.recordPerformance(
      provider.name,
      'video',
      responseTime,
      true
    );

    return result;
  } catch (error) {
    console.error('AI video analysis failed:', error);
    
    // Record error in AI interaction history
    aiHistory.recordError(interactionId, {
      code: 'AI_VIDEO_ANALYSIS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown AI video analysis error',
      details: error
    });
    
    throw error;
  }
};

/**
 * 用途別推奨プロバイダー取得のヘルパー関数
 */
export const getRecommendedProviders = async (
  useCase: 'presentation' | 'coding' | 'analysis' | 'creative' | 'enterprise'
) => {
  try {
    return await getRecommendedAIProvider(useCase);
  } catch (error) {
    console.error('Failed to get recommended providers:', error);
    return [];
  }
};

/**
 * 利用可能なプロバイダーの状態チェック
 */
export const checkProviderStatus = async (): Promise<{
  [key in AIProviderType]?: {
    available: boolean;
    configured: boolean;
    error?: string;
  }
}> => {
  const settings = getUserSettings();
  const providers: AIProviderType[] = ['gemini', 'azure', 'openai', 'claude', 'lmstudio', 'fooocus'];
  const status: any = {};

  for (const providerType of providers) {
    try {
      const config = AIProviderFactory['getProviderConfig'](providerType, settings);
      const provider = await createAIProvider(config);
      const isValid = await provider.validateConfig(config);
      
      status[providerType] = {
        available: true,
        configured: isValid,
      };
    } catch (error) {
      status[providerType] = {
        available: false,
        configured: false,
        error: error.message
      };
    }
  }

  return status;
};

/**
 * プロバイダー切り替えのヘルパー関数
 */
export const switchProvider = async (
  providerType: AIProviderType
): Promise<boolean> => {
  try {
    const settings = getUserSettings();
    const config = AIProviderFactory['getProviderConfig'](providerType, settings);
    
    // プロバイダーの設定をテスト
    const provider = await createAIProvider(config);
    const isValid = await provider.validateConfig(config);
    
    if (isValid) {
      // 設定を更新
      const updatedSettings = {
        ...settings,
        aiProvider: providerType
      };
      
      // 設定を保存（実際のsaveUserSettings関数を使用）
      const { saveUserSettings } = await import('../storageService');
      saveUserSettings(updatedSettings);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to switch to provider ${providerType}:`, error);
    return false;
  }
};

/**
 * マルチプロバイダー対応の設定検証
 */
export const validateAllProviderConfigs = async () => {
  const status = await checkProviderStatus();
  const settings = getUserSettings();
  
  const report = {
    currentProvider: settings.aiProvider || 'gemini',
    totalProviders: Object.keys(status).length,
    configuredProviders: Object.values(status).filter(s => s.configured).length,
    availableProviders: Object.values(status).filter(s => s.available).length,
    issues: Object.entries(status)
      .filter(([_, s]) => s.error)
      .map(([provider, s]) => ({ provider, error: s.error }))
  };

  return report;
};

// 既存コードとの互換性のため、従来の関数名でエクスポート
export {
  generateTextWithAI as generateText,
  generateImageWithAI as generateImage,
  analyzeVideoWithAI as analyzeVideo
};

// 新しいAIシステムの機能を段階的に公開するためのフラグ
export const AI_SYSTEM_FLAGS = {
  MULTI_PROVIDER_ENABLED: true,
  AUTO_PROVIDER_SELECTION: true,
  PERFORMANCE_MONITORING: true,
  COST_OPTIMIZATION: true,
  PROVIDER_FALLBACK: false, // Phase 2で有効化予定
};