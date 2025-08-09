// =================================================================
// Unified AI Service - プロバイダー独立の統一AIサービス
// ファクトリパターンでプロバイダーを抽象化
// =================================================================

import { AzureService, createAzureService } from './azureService';
import { GeminiService, createGeminiServiceFromSettings, createGeminiServiceForTask } from './geminiService';
import { getUserSettings } from '../storageService';
import { EnhancedSlideRequest, EnhancedAIService } from './aiServiceInterface';

// 統一されたAIサービスインターフェース
export interface UnifiedAIService extends EnhancedAIService {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string>;
  generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string>;
  generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string>;
  analyzeVideo(videoData: string, prompt?: string): Promise<string>;
  testConnection(): Promise<boolean>;
}

// 拡張生成オプション
export interface EnhancedGenerationOptions {
  enhancedPrompt?: string;
  purpose?: string;
  theme?: string;
  designer?: string;
  includeImages?: boolean;
}

export interface TextGenerationOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ImageGenerationOptions {
  size?: 'square' | 'landscape' | 'portrait';  // プロバイダー非依存の統一サイズ
  quality?: 'low' | 'medium' | 'high';         // プロバイダー非依存の統一品質
  style?: 'natural' | 'vivid';                 // 一般的なスタイル
}

export interface SlideImageOptions extends ImageGenerationOptions {
  slideTitle?: string;
  slideContent?: string;
  imageType?: 'background' | 'illustration' | 'icon' | 'diagram';
}

// プロバイダー固有のエラー
export class AIServiceError extends Error {
  constructor(message: string, public provider?: string, public code?: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Gemini実装クラス - タスク別APIキー対応
class GeminiUnifiedService implements UnifiedAIService {
  private textService: GeminiService;
  private imageService: GeminiService;
  private videoService: GeminiService;

  constructor() {
    const settings = getUserSettings();
    const geminiAuth = settings.providerAuth?.gemini;
    
    // 最低限テキスト生成のAPIキーは必要
    if (!geminiAuth?.textGeneration?.apiKey) {
      throw new AIServiceError('Gemini API key is not configured', 'gemini', 'CONFIG_MISSING');
    }

    // タスク別のサービスを作成（各々のAPIキーを使用）
    try {
      this.textService = createGeminiServiceForTask('text');
      this.imageService = createGeminiServiceForTask('image');
      this.videoService = createGeminiServiceForTask('video');
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to initialize Gemini services',
        'gemini',
        'INITIALIZATION_ERROR'
      );
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    try {
      return await this.textService.generateText({
        prompt,
        systemPrompt: options?.systemPrompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'テキスト生成に失敗しました',
        'gemini',
        'TEXT_GENERATION_ERROR'
      );
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    try {
      return await this.imageService.generateImage({
        prompt,
        size: options?.size || 'square',
        quality: options?.quality || 'medium',
        style: options?.style,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : '画像生成に失敗しました',
        'gemini',
        'IMAGE_GENERATION_ERROR'
      );
    }
  }

  async generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string> {
    try {
      // 拡張オプションが提供された場合は拡張プロンプトを使用
      if (enhancedOptions?.enhancedPrompt) {
        console.log('🎯 GeminiUnifiedAIService: Using enhanced prompt!');
        console.log('📝 Enhanced prompt length:', enhancedOptions.enhancedPrompt.length);
        console.log('🎨 Enhanced options:', {
          purpose: enhancedOptions.purpose,
          theme: enhancedOptions.theme,
          designer: enhancedOptions.designer,
          includeImages: enhancedOptions.includeImages
        });
        
        const result = await this.textService.generateText({
          prompt: enhancedOptions.enhancedPrompt,
          systemPrompt: 'あなたは優秀なプレゼンテーションデザイナーです。指定された形式でスライドコンテンツを生成してください。',
          temperature: 0.7,
          maxTokens: 4000
        });
        
        console.log('✅ GeminiUnifiedAIService: Enhanced prompt generation completed!');
        return result;
      } else {
        console.log('⚠️ GeminiUnifiedAIService: No enhanced prompt provided, using fallback...');
        // 従来の方式を維持（後方互換性）
        return await this.textService.generateSlideContent(topic, slideCount);
      }
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'スライドコンテンツ生成に失敗しました',
        'gemini',
        'SLIDE_GENERATION_ERROR'
      );
    }
  }

  async generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string> {
    try {
      return await this.imageService.generateSlideImage({
        prompt,
        size: options?.size || 'landscape',
        quality: options?.quality || 'high',
        style: options?.style,
        slideTitle: options?.slideTitle,
        slideContent: options?.slideContent,
        imageType: options?.imageType,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'スライド画像生成に失敗しました',
        'gemini',
        'SLIDE_IMAGE_GENERATION_ERROR'
      );
    }
  }

  async analyzeVideo(videoData: string, prompt?: string): Promise<string> {
    try {
      return await this.videoService.analyzeVideo({
        videoData,
        prompt: prompt || 'この動画の内容を分析してください。',
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : '動画分析に失敗しました',
        'gemini',
        'VIDEO_ANALYSIS_ERROR'
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // テキスト生成サービスでテストを実行（最も基本的なサービス）
      return await this.textService.testConnection();
    } catch (error) {
      return false;
    }
  }
}

// Azure OpenAI実装クラス
class AzureUnifiedService implements UnifiedAIService {
  private azureService: AzureService;

  constructor() {
    const settings = getUserSettings();
    const azureAuth = settings.providerAuth?.azure;
    
    if (!azureAuth?.textGeneration?.apiKey || !azureAuth?.textGeneration?.endpoint) {
      throw new AIServiceError('Azure OpenAI設定が不完全です', 'azure', 'CONFIG_MISSING');
    }

    // デプロイメント名のチェック
    const textDeploymentName = settings.aiModels?.textGeneration;
    if (!textDeploymentName || textDeploymentName.trim() === '') {
      throw new AIServiceError('テキスト生成のデプロイメント名が設定されていません。設定画面で「デプロイメント名」を入力してください。', 'azure', 'DEPLOYMENT_NAME_MISSING');
    }

    // 画像生成専用設定を使用、なければテキスト生成設定をフォールバック
    const imageAuth = azureAuth.imageGeneration || azureAuth.textGeneration;
    // 動画分析専用設定を使用、なければテキスト生成設定をフォールバック
    const videoAuth = azureAuth.videoAnalysis || azureAuth.textGeneration;

    this.azureService = createAzureService({
      endpoint: azureAuth.textGeneration.endpoint,
      apiKey: azureAuth.textGeneration.apiKey,
      apiVersion: azureAuth.textGeneration.apiVersion || '2024-02-01',
      textDeploymentName: textDeploymentName,
      imageDeploymentName: settings.aiModels?.imageGeneration || '',
      videoDeploymentName: settings.aiModels?.videoAnalysis || settings.aiModels?.textGeneration || '',
      // 画像生成専用設定
      imageEndpoint: imageAuth.endpoint,
      imageApiKey: imageAuth.apiKey,
      imageApiVersion: imageAuth.apiVersion,
      // 動画分析専用設定
      videoEndpoint: videoAuth.endpoint,
      videoApiKey: videoAuth.apiKey,
      videoApiVersion: videoAuth.apiVersion,
    });
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    try {
      return await this.azureService.generateText({
        prompt,
        systemPrompt: options?.systemPrompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'テキスト生成に失敗しました',
        'azure',
        'TEXT_GENERATION_ERROR'
      );
    }
  }

  async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string> {
    try {
      const settings = getUserSettings();
      const imageAuth = settings.providerAuth?.azure?.imageGeneration;
      const modelName = imageAuth?.modelName || 'dall-e-3'; // デフォルト
      
      return await this.azureService.generateImage({
        prompt,
        size: options?.size || 'square',     // 統一インターフェース
        quality: options?.quality || 'medium', // 統一インターフェース
        style: options?.style,
        modelName,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : '画像生成に失敗しました',
        'azure',
        'IMAGE_GENERATION_ERROR'
      );
    }
  }

  async generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string> {
    try {
      // 拡張オプションが提供された場合は拡張プロンプトを使用
      if (enhancedOptions?.enhancedPrompt) {
        console.log('🎯 UnifiedAIService: Using enhanced prompt!');
        console.log('📝 Enhanced prompt length:', enhancedOptions.enhancedPrompt.length);
        console.log('🎨 Enhanced options:', {
          purpose: enhancedOptions.purpose,
          theme: enhancedOptions.theme,
          designer: enhancedOptions.designer,
          includeImages: enhancedOptions.includeImages
        });
        
        const result = await this.azureService.generateText({
          prompt: enhancedOptions.enhancedPrompt,
          systemPrompt: 'あなたは優秀なプレゼンテーションデザイナーです。指定された形式でスライドコンテンツを生成してください。',
          temperature: 0.7,
          maxTokens: 4000
        });
        
        console.log('✅ UnifiedAIService: Enhanced prompt generation completed!');
        return result;
      } else {
        console.log('⚠️ UnifiedAIService: No enhanced prompt provided, using fallback...');
        // 従来の方式を維持（後方互換性）
        return await this.azureService.generateSlideContent(topic, slideCount);
      }
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'スライドコンテンツ生成に失敗しました',
        'azure',
        'SLIDE_GENERATION_ERROR'
      );
    }
  }

  async generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string> {
    try {
      const settings = getUserSettings();
      const imageAuth = settings.providerAuth?.azure?.imageGeneration;
      const modelName = imageAuth?.modelName || 'dall-e-3'; // デフォルト
      
      // 設定からデフォルト値を取得
      const imageSettings = settings.imageGenerationSettings;
      const defaultSize = imageSettings?.defaultSize || 'landscape';
      const defaultQuality = imageSettings?.defaultQuality || 'high';
      
      return await this.azureService.generateSlideImage({
        prompt,
        size: options?.size || defaultSize,
        quality: options?.quality || defaultQuality,
        style: options?.style,
        slideTitle: options?.slideTitle,
        slideContent: options?.slideContent,
        imageType: options?.imageType,
        modelName,
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'スライド画像生成に失敗しました',
        'azure',
        'SLIDE_IMAGE_GENERATION_ERROR'
      );
    }
  }

  async analyzeVideo(videoData: string, prompt?: string): Promise<string> {
    try {
      return await this.azureService.analyzeVideo({
        videoData,
        prompt: prompt || 'この動画の内容を分析してください。',
      });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : '動画分析に失敗しました',
        'azure',
        'VIDEO_ANALYSIS_ERROR'
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.azureService.testConnection();
    } catch (error) {
      return false;
    }
  }
}

// タスク別プロバイダー対応のファクトリ関数
export function createTaskSpecificAIService(taskType: 'text' | 'image' | 'video'): UnifiedAIService {
  const settings = getUserSettings();
  
  // タスク別プロバイダー設定を取得
  let provider: string;
  switch (taskType) {
    case 'text':
      provider = settings.aiProviderText || 'azure';
      break;
    case 'image':
      provider = settings.aiProviderImage || 'azure';
      break;
    case 'video':
      provider = settings.aiProviderVideo || 'azure';
      break;
    default:
      provider = 'azure';
  }
  
  switch (provider) {
    case 'azure':
      return new AzureUnifiedService();
    case 'gemini':
      return new GeminiUnifiedService();
    // 将来の拡張ポイント:
    // case 'lmstudio':
    //   return new LMStudioUnifiedService();
    default:
      throw new AIServiceError(`サポートされていないAIプロバイダーです: ${provider}`, 'unknown', 'UNSUPPORTED_PROVIDER');
  }
}

// 後方互換性のため残しておく（デフォルトはテキスト生成プロバイダーを使用）
export function createUnifiedAIService(): UnifiedAIService {
  return createTaskSpecificAIService('text');
}

// タスク別シングルトンインスタンス管理
const aiServiceInstances: { [key: string]: UnifiedAIService } = {};

export function getAIService(taskType: 'text' | 'image' | 'video' = 'text'): UnifiedAIService {
  const key = taskType;
  if (!aiServiceInstances[key]) {
    aiServiceInstances[key] = createTaskSpecificAIService(taskType);
  }
  return aiServiceInstances[key];
}

// 設定変更時にインスタンスをリセット
export function resetAIService(): void {
  Object.keys(aiServiceInstances).forEach(key => {
    delete aiServiceInstances[key];
  });
}

// 後方互換性のため（デフォルトはテキスト生成）
export function getTextAIService(): UnifiedAIService {
  return getAIService('text');
}

export function getImageAIService(): UnifiedAIService {
  return getAIService('image');
}

export function getVideoAIService(): UnifiedAIService {
  return getAIService('video');
}

// 便利関数 - タスク別サービスを使用
export async function generateSlideImage(prompt: string, options?: SlideImageOptions): Promise<string> {
  console.log('🚨 CRITICAL DEBUG: generateSlideImage called!');
  console.log('📝 Input prompt:', prompt);
  console.log('🔧 Options:', options);
  console.log('📍 Call stack trace:', new Error().stack);
  
  const aiService = getImageAIService();
  return aiService.generateSlideImage(prompt, options);
}

export async function generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
  const aiService = getTextAIService();
  return aiService.generateText(prompt, options);
}

export async function generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: EnhancedGenerationOptions): Promise<string> {
  const aiService = getTextAIService();
  return aiService.generateSlideContent(topic, slideCount, enhancedOptions);
}

export async function analyzeVideo(videoData: string, prompt?: string): Promise<string> {
  const aiService = getVideoAIService();
  return aiService.analyzeVideo(videoData, prompt);
}

// タスク別APIキー検証機能
export function hasValidAPIKey(taskType: 'text' | 'image' | 'video' = 'text'): boolean {
  try {
    const settings = getUserSettings();
    let provider: string;
    let taskKey: string;
    
    switch (taskType) {
      case 'text':
        provider = settings.aiProviderText || 'azure';
        taskKey = 'textGeneration';
        break;
      case 'image':
        provider = settings.aiProviderImage || 'azure';
        taskKey = 'imageGeneration';
        break;
      case 'video':
        provider = settings.aiProviderVideo || 'azure';
        taskKey = 'videoAnalysis';
        break;
      default:
        return false;
    }
    
    switch (provider) {
      case 'azure':
        const azureAuth = settings.providerAuth?.azure?.[taskKey];
        const hasBasicAuth = !!(azureAuth?.apiKey && azureAuth?.endpoint);
        // Azure の場合はデプロイメント名も必要
        if (taskType === 'text') {
          const deploymentName = settings.aiModels?.textGeneration;
          return hasBasicAuth && !!(deploymentName && deploymentName.trim() !== '');
        }
        return hasBasicAuth;
      case 'gemini':
        const geminiAuth = settings.providerAuth?.gemini?.[taskKey];
        return !!(geminiAuth?.apiKey);
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

// 設定の詳細なチェックと不足項目の報告
export function validateAIConfiguration(taskType: 'text' | 'image' | 'video' = 'text'): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const settings = getUserSettings();
  
  let provider: string;
  let taskKey: string;
  
  switch (taskType) {
    case 'text':
      provider = settings.aiProviderText || 'azure';
      taskKey = 'textGeneration';
      break;
    case 'image':
      provider = settings.aiProviderImage || 'azure';
      taskKey = 'imageGeneration';
      break;
    case 'video':
      provider = settings.aiProviderVideo || 'azure';
      taskKey = 'videoAnalysis';
      break;
    default:
      errors.push('無効なタスクタイプです');
      return { valid: false, errors };
  }
  
  switch (provider) {
    case 'azure':
      const azureAuth = settings.providerAuth?.azure?.[taskKey];
      if (!azureAuth?.apiKey) {
        errors.push(`Azure OpenAI APIキーが設定されていません（${taskType}）`);
      }
      if (!azureAuth?.endpoint) {
        errors.push(`Azure OpenAI エンドポイントが設定されていません（${taskType}）`);
      }
      if (taskType === 'text') {
        const deploymentName = settings.aiModels?.textGeneration;
        if (!deploymentName || deploymentName.trim() === '') {
          errors.push('テキスト生成のデプロイメント名が設定されていません');
        }
      }
      break;
    case 'gemini':
      const geminiAuth = settings.providerAuth?.gemini?.[taskKey];
      if (!geminiAuth?.apiKey) {
        errors.push(`Gemini APIキーが設定されていません（${taskType}）`);
      }
      break;
    default:
      errors.push(`サポートされていないプロバイダーです: ${provider}`);
  }
  
  return { valid: errors.length === 0, errors };
}

export async function testAPIConnection(taskType: 'text' | 'image' | 'video' = 'text'): Promise<boolean> {
  try {
    if (!hasValidAPIKey(taskType)) {
      return false;
    }
    
    const aiService = getAIService(taskType);
    return await aiService.testConnection();
  } catch (error) {
    return false;
  }
}

// 統合サービスの基本的な動作テスト
export async function runBasicTest(): Promise<{ success: boolean; results: any }> {
  const results: any = {};
  
  try {
    // 設定チェック
    results.hasValidConfig = hasValidAPIKey();
    
    if (!results.hasValidConfig) {
      return { 
        success: false, 
        results: { ...results, error: 'Azure OpenAI設定が不完全です' }
      };
    }
    
    // 接続テスト
    results.connectionTest = await testAPIConnection();
    
    if (results.connectionTest) {
      // 簡単なテキスト生成テスト
      try {
        const testText = await generateText('Hello', { maxTokens: 10 });
        results.textGeneration = { success: true, length: testText.length };
      } catch (error) {
        results.textGeneration = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
    
    return { 
      success: results.connectionTest && results.textGeneration?.success, 
      results 
    };
    
  } catch (error) {
    return { 
      success: false, 
      results: { ...results, error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// ビデオからスライド生成の統合機能
export async function generateSlidesFromVideo(
  videoFile: File, 
  options: VideoGenerationOptions
): Promise<{ presentation: any }> {
  const aiService = getAIService();
  
  // ビデオをbase64に変換
  const videoData = await fileToBase64(videoFile);
  
  // ビデオ分析
  const analysisPrompt = `この動画を分析して、${options.slideCount || 5}枚のプレゼンテーションスライドを生成してください。
テーマ: ${options.theme}
画像を含める: ${options.includeImages ? 'はい' : 'いいえ'}

各スライドには以下を含めてください：
- タイトル
- 主要なポイント（3-5個）
- 簡潔で分かりやすい説明

JSON形式で以下の構造で出力してください：
{
  "title": "プレゼンテーションタイトル",
  "slides": [
    {
      "title": "スライドタイトル",
      "content": "スライド内容（Markdown形式）"
    }
  ]
}`;

  const analysisResult = await aiService.analyzeVideo(videoData, analysisPrompt);
  
  // JSON解析とプレゼンテーション構造の構築
  try {
    const parsedResult = JSON.parse(analysisResult);
    const presentation = {
      id: `video-${Date.now()}`,
      title: parsedResult.title || 'ビデオから生成されたプレゼンテーション',
      slides: parsedResult.slides.map((slide: any, index: number) => ({
        id: `slide-${index}`,
        title: slide.title,
        content: slide.content,
        layers: [],
        theme: options.theme,
        aspectRatio: options.aspectRatio || '16:9'
      }))
    };
    
    return { presentation };
  } catch (error) {
    throw new AIServiceError('ビデオ分析結果の解析に失敗しました', 'unified', 'PARSE_ERROR');
  }
}

export interface VideoGenerationOptions {
  theme: string;
  aspectRatio: string;
  includeImages: boolean;
  slideCount?: number;
}

// ファイルをbase64に変換するヘルパー関数
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}