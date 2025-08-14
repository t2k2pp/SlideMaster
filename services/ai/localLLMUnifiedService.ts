// =================================================================
// Local LLM Unified Service - ローカルLLM対応統合サービス
// LMStudio と Fooocus を UnifiedAIService インターフェースで統合
// =================================================================

import { UnifiedAIService, TextGenerationOptions, ImageGenerationOptions, SlideImageOptions, EnhancedGenerationOptions } from './unifiedAIService';
import { LMStudioService, createLMStudioService } from './lmStudioService';
import { FoocusService, createFoocusService } from './foocusService';
import { getUserSettings } from '../storageService';
import { mapProviderTaskAuthToLMStudio, mapProviderTaskAuthToFooocus } from './localLLMConfig';
import { ExtendedUserSettings } from './localLLMTypes';

/**
 * LMStudio実装クラス（テキスト生成専用）
 */
export class LMStudioUnifiedService implements UnifiedAIService {
  private lmStudioService: LMStudioService;
  private currentModel: string;

  constructor() {
    const settings = getUserSettings() as ExtendedUserSettings;
    const lmStudioAuth = settings.providerAuth?.lmstudio?.textGeneration;
    
    if (!lmStudioAuth?.endpoint) {
      throw new Error('LMStudio endpoint is not configured');
    }

    // 現在使用中のモデル名を取得
    this.currentModel = lmStudioAuth.modelName || 'Local LLM';

    // LMStudioServiceを作成
    const config = mapProviderTaskAuthToLMStudio(lmStudioAuth);
    this.lmStudioService = createLMStudioService(config);
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    return await this.lmStudioService.generateText({
      prompt,
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    throw new Error('LMStudio does not support image generation. Use Fooocus for image generation.');
  }

  async generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string> {
    if (enhancedOptions?.enhancedPrompt) {
      console.log('🎯 LMStudioUnifiedService: Using enhanced prompt!');
      console.log('📝 Enhanced prompt length:', enhancedOptions.enhancedPrompt.length);
      
      const result = await this.lmStudioService.generateText({
        prompt: enhancedOptions.enhancedPrompt,
        systemPrompt: 'あなたは優秀なプレゼンテーションデザイナーです。指定された形式でスライドコンテンツを生成してください。',
        temperature: 0.7
      });
      
      console.log('✅ LMStudioUnifiedService: Enhanced prompt generation completed!');
      return result;
    } else {
      console.error('❌ LMStudioUnifiedService: Enhanced prompt is required');
      throw new Error('強化プロンプトが必要です。適切なプロンプトを指定してください。');
    }
  }

  async generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string> {
    throw new Error('LMStudio does not support image generation. Use Fooocus for image generation.');
  }

  async analyzeVideo(videoData: string, prompt?: string): Promise<string> {
    throw new Error('LMStudio does not support video analysis. Use Azure OpenAI or Gemini for video analysis.');
  }

  getMaxTokens(safetyMargin: number = 0.9): number {
    // LMStudioの場合、モデルに依存するが、一般的な値を返す
    return Math.floor(8192 * safetyMargin);
  }

  getModelInfo() {
    return {
      service: 'lmstudio',
      model: this.currentModel,
      limits: {
        maxTokens: 8192,
        isLocal: true,
        supportedTasks: ['text']
      }
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.lmStudioService.testConnection();
    } catch (error) {
      return false;
    }
  }
}

/**
 * Fooocus実装クラス（画像生成専用）
 */
export class FoocusUnifiedService implements UnifiedAIService {
  private foocusService: FoocusService;
  private currentModel: string;

  constructor() {
    const settings = getUserSettings() as ExtendedUserSettings;
    const foocusAuth = settings.providerAuth?.fooocus?.imageGeneration;
    
    if (!foocusAuth?.endpoint) {
      throw new Error('Fooocus endpoint is not configured');
    }

    // 現在使用中のモデル名を取得
    this.currentModel = foocusAuth.modelName || 'Stable Diffusion';

    // FoocusServiceを作成
    const config = mapProviderTaskAuthToFooocus(foocusAuth);
    this.foocusService = createFoocusService(config);
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    throw new Error('Fooocus does not support text generation. Use LMStudio for text generation.');
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    return await this.foocusService.generateSlideImage(prompt, {
      size: options?.size,
      quality: options?.quality === 'low' ? 'low' : options?.quality === 'high' ? 'high' : 'medium',
      style: options?.style
    });
  }

  async generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string> {
    throw new Error('Fooocus does not support text generation. Use LMStudio for slide content generation.');
  }

  async generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string> {
    console.log('🚨 CRITICAL DEBUG: FoocusUnifiedService.generateSlideImage called!');
    console.log('📝 Input prompt:', prompt);
    console.log('🔧 Options:', options);
    
    return await this.foocusService.generateSlideImage(prompt, {
      size: options?.size,
      quality: options?.quality === 'low' ? 'low' : options?.quality === 'high' ? 'high' : 'medium',
      style: options?.style,
      slideTitle: options?.slideTitle,
      slideContent: options?.slideContent,
      imageType: options?.imageType
    });
  }

  async analyzeVideo(videoData: string, prompt?: string): Promise<string> {
    throw new Error('Fooocus does not support video analysis. Use Azure OpenAI or Gemini for video analysis.');
  }

  getMaxTokens(safetyMargin: number = 0.9): number {
    // Foocusは画像生成のみなので、テキスト用のトークン制限は関係なし
    return 0;
  }

  getModelInfo() {
    return {
      service: 'fooocus',
      model: this.currentModel,
      limits: {
        maxTokens: 0,
        isLocal: true,
        supportedTasks: ['image']
      }
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.foocusService.testConnection();
    } catch (error) {
      return false;
    }
  }
}

/**
 * ローカルLLM統合サービスファクトリ
 */
export function createLocalLLMUnifiedService(provider: 'lmstudio' | 'fooocus'): UnifiedAIService {
  switch (provider) {
    case 'lmstudio':
      return new LMStudioUnifiedService();
    case 'fooocus':
      return new FoocusUnifiedService();
    default:
      throw new Error(`Unsupported local LLM provider: ${provider}`);
  }
}

/**
 * ローカルLLMの接続状態をチェック
 */
export async function checkLocalLLMStatus(): Promise<{
  lmstudio: { available: boolean; endpoint: string; error?: string };
  fooocus: { available: boolean; endpoint: string; error?: string };
}> {
  const settings = getUserSettings() as ExtendedUserSettings;
  
  const lmstudioAuth = settings.providerAuth?.lmstudio?.textGeneration;
  const foocusAuth = settings.providerAuth?.fooocus?.imageGeneration;
  
  const results = {
    lmstudio: {
      available: false,
      endpoint: lmstudioAuth?.endpoint || 'http://localhost:1234',
      error: undefined as string | undefined
    },
    fooocus: {
      available: false,
      endpoint: foocusAuth?.endpoint || 'http://localhost:7865',
      error: undefined as string | undefined
    }
  };

  // LMStudioの接続チェック
  if (lmstudioAuth?.endpoint) {
    try {
      const lmstudioService = new LMStudioUnifiedService();
      results.lmstudio.available = await lmstudioService.testConnection();
    } catch (error) {
      results.lmstudio.error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    results.lmstudio.error = 'Endpoint not configured';
  }

  // Foocusの接続チェック
  if (foocusAuth?.endpoint) {
    try {
      const foocusService = new FoocusUnifiedService();
      results.fooocus.available = await foocusService.testConnection();
    } catch (error) {
      results.fooocus.error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    results.fooocus.error = 'Endpoint not configured';
  }

  return results;
}

/**
 * ローカルLLMサービス情報を取得
 */
export async function getLocalLLMInfo(): Promise<{
  lmstudio?: { models: string[]; serverInfo: any };
  fooocus?: { models: string[]; serverInfo: any };
}> {
  const info: any = {};
  
  try {
    const lmstudioService = new LMStudioUnifiedService();
    const lmstudioModels = await (lmstudioService as any).lmStudioService.getAvailableModels();
    const lmstudioServerInfo = await (lmstudioService as any).lmStudioService.getServerInfo();
    
    info.lmstudio = {
      models: lmstudioModels.map((m: any) => m.id),
      serverInfo: lmstudioServerInfo
    };
  } catch (error) {
    console.warn('Failed to get LMStudio info:', error);
  }
  
  try {
    const foocusService = new FoocusUnifiedService();
    const foocusModels = await (foocusService as any).foocusService.getAvailableModels();
    const foocusServerInfo = await (foocusService as any).foocusService.getServerInfo();
    
    info.fooocus = {
      models: foocusModels.map((m: any) => m.name),
      serverInfo: foocusServerInfo
    };
  } catch (error) {
    console.warn('Failed to get Fooocus info:', error);
  }
  
  return info;
}