// =================================================================
// Azure OpenAI Service - 統合サービス
// Azure OpenAI専用の統合AIサービス（将来のマルチプロバイダー対応準備済み）
// =================================================================

import { AzureOpenAIConfig, validateAzureOpenAIConfig, getDefaultAzureOpenAIConfig } from './azureOpenAI/azureOpenAIConfig';
import { AzureTextService, TextGenerationOptions } from './azureOpenAI/azureTextService';
import { AzureImageService, ImageGenerationOptions, SlideImageOptions } from './azureOpenAI/azureImageService';
import { AzureVideoService, VideoAnalysisOptions, SlideVideoAnalysis } from './azureOpenAI/azureVideoService';
import { AzureOpenAIClient } from './azureOpenAI/azureOpenAIClient';

export interface AzureServiceConfig {
  endpoint: string;
  apiKey: string;
  apiVersion?: string;
  textDeploymentName: string;
  imageDeploymentName: string;
  videoDeploymentName?: string;
  // 画像生成専用設定（オプション）
  imageEndpoint?: string;
  imageApiKey?: string;
  imageApiVersion?: string;
  // 動画分析専用設定（オプション）
  videoEndpoint?: string;
  videoApiKey?: string;
  videoApiVersion?: string;
}

export class AzureServiceError extends Error {
  constructor(message: string, public code?: string, public cause?: Error) {
    super(message);
    this.name = 'AzureServiceError';
  }
}

export class AzureService {
  private config: AzureOpenAIConfig;
  private textService: AzureTextService;
  private imageService: AzureImageService;
  private videoService: AzureVideoService;
  private client: AzureOpenAIClient;

  constructor(config: AzureServiceConfig) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion || '2024-02-01',
      textDeploymentName: config.textDeploymentName,
      imageDeploymentName: config.imageDeploymentName,
      videoDeploymentName: config.videoDeploymentName,
      // 画像生成専用設定を追加
      imageEndpoint: config.imageEndpoint,
      imageApiKey: config.imageApiKey,
      imageApiVersion: config.imageApiVersion,
      // 動画分析専用設定を追加
      videoEndpoint: config.videoEndpoint,
      videoApiKey: config.videoApiKey,
      videoApiVersion: config.videoApiVersion
    };

    const validationErrors = validateAzureOpenAIConfig(this.config);
    if (validationErrors.length > 0) {
      throw new AzureServiceError(`Configuration validation failed: ${validationErrors.join(', ')}`, 'CONFIG_ERROR');
    }

    this.client = new AzureOpenAIClient(this.config);
    this.textService = new AzureTextService(this.config);
    this.imageService = new AzureImageService(this.config);
    this.videoService = new AzureVideoService(this.config);
  }

  // ========================
  // テキスト生成メソッド
  // ========================

  async generateText(options: TextGenerationOptions): Promise<string> {
    try {
      return await this.textService.generateText(options);
    } catch (error) {
      throw this.handleError(error, 'text generation');
    }
  }

  async generateSlideContent(topic: string, slideCount?: number): Promise<string> {
    try {
      return await this.textService.generateSlideContent(topic, slideCount);
    } catch (error) {
      throw this.handleError(error, 'slide content generation');
    }
  }

  async improveSlideContent(
    currentContent: string, 
    improvementType: 'clarity' | 'engagement' | 'structure' | 'brevity'
  ): Promise<string> {
    try {
      return await this.textService.improveSlideContent(currentContent, improvementType);
    } catch (error) {
      throw this.handleError(error, 'slide content improvement');
    }
  }

  async generateSpeakerNotes(slideContent: string): Promise<string> {
    try {
      return await this.textService.generateSpeakerNotes(slideContent);
    } catch (error) {
      throw this.handleError(error, 'speaker notes generation');
    }
  }

  async translateSlideContent(content: string, targetLanguage: string): Promise<string> {
    try {
      return await this.textService.translateSlideContent(content, targetLanguage);
    } catch (error) {
      throw this.handleError(error, 'slide content translation');
    }
  }

  // ========================
  // 画像生成メソッド
  // ========================

  async generateImage(options: ImageGenerationOptions): Promise<string> {
    try {
      return await this.imageService.generateImage(options);
    } catch (error) {
      throw this.handleError(error, 'image generation');
    }
  }

  async generateSlideImage(options: SlideImageOptions): Promise<string> {
    try {
      return await this.imageService.generateSlideImage(options);
    } catch (error) {
      throw this.handleError(error, 'slide image generation');
    }
  }

  async generateBackgroundImage(
    topic: string, 
    style?: 'professional' | 'creative' | 'minimal' | 'academic'
  ): Promise<string> {
    try {
      return await this.imageService.generateBackgroundImage(topic, style);
    } catch (error) {
      throw this.handleError(error, 'background image generation');
    }
  }

  async generateIllustration(description: string, context?: string): Promise<string> {
    try {
      return await this.imageService.generateIllustration(description, context);
    } catch (error) {
      throw this.handleError(error, 'illustration generation');
    }
  }

  async generateDiagram(diagramType: string, description: string): Promise<string> {
    try {
      return await this.imageService.generateDiagram(diagramType, description);
    } catch (error) {
      throw this.handleError(error, 'diagram generation');
    }
  }

  async generateIcon(
    iconDescription: string, 
    style?: 'flat' | 'outline' | '3d' | 'minimal'
  ): Promise<string> {
    try {
      return await this.imageService.generateIcon(iconDescription, style);
    } catch (error) {
      throw this.handleError(error, 'icon generation');
    }
  }

  // ========================
  // ビデオ分析メソッド
  // ========================

  async analyzeVideo(options: VideoAnalysisOptions): Promise<string> {
    try {
      return await this.videoService.analyzeVideo(options);
    } catch (error) {
      throw this.handleError(error, 'video analysis');
    }
  }

  async analyzeVideoForSlides(options: VideoAnalysisOptions): Promise<SlideVideoAnalysis> {
    try {
      return await this.videoService.analyzeForSlideGeneration(options);
    } catch (error) {
      throw this.handleError(error, 'video analysis for slides');
    }
  }

  async extractKeyMoments(options: VideoAnalysisOptions): Promise<string[]> {
    try {
      return await this.videoService.extractKeyMoments(options);
    } catch (error) {
      throw this.handleError(error, 'key moments extraction');
    }
  }

  async generateSlideContentFromVideo(options: VideoAnalysisOptions, slideCount?: number): Promise<string> {
    try {
      return await this.videoService.generateSlideContentFromVideo(options, slideCount);
    } catch (error) {
      throw this.handleError(error, 'slide content from video generation');
    }
  }

  // ========================
  // ユーティリティメソッド
  // ========================

  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch (error) {
      return false;
    }
  }

  getConfig(): Readonly<AzureOpenAIConfig> {
    return { ...this.config };
  }

  static getDefaultConfig(): Partial<AzureServiceConfig> {
    const defaults = getDefaultAzureOpenAIConfig();
    return {
      apiVersion: defaults.apiVersion,
      textDeploymentName: defaults.textDeploymentName || '',
      imageDeploymentName: defaults.imageDeploymentName || ''
    };
  }

  static validateConfig(config: AzureServiceConfig): string[] {
    const azureConfig: AzureOpenAIConfig = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion,
      textDeploymentName: config.textDeploymentName,
      imageDeploymentName: config.imageDeploymentName,
      videoDeploymentName: config.videoDeploymentName
    };

    return validateAzureOpenAIConfig(azureConfig);
  }

  // ========================
  // 高レベル統合メソッド
  // ========================

  async createCompletePresentation(topic: string, options?: {
    slideCount?: number;
    includeImages?: boolean;
    imageStyle?: 'professional' | 'creative' | 'minimal' | 'academic';
    includeBackground?: boolean;
    includeSpeakerNotes?: boolean;
  }): Promise<{
    content: string;
    backgroundImage?: string;
    slideImages?: string[];
    speakerNotes?: string;
  }> {
    const slideCount = options?.slideCount || 5;
    
    try {
      // スライドコンテンツ生成
      const content = await this.generateSlideContent(topic, slideCount);
      
      const result: any = { content };

      // 背景画像生成（オプション）
      if (options?.includeBackground) {
        result.backgroundImage = await this.generateBackgroundImage(
          topic, 
          options.imageStyle || 'professional'
        );
      }

      // スライド用画像生成（オプション）
      if (options?.includeImages) {
        const imagePrompts = this.extractImagePromptsFromContent(content);
        result.slideImages = await Promise.all(
          imagePrompts.map(prompt => 
            this.generateSlideImage({
              prompt,
              size: '1024x1024',
              quality: 'standard',
              style: 'natural'
            })
          )
        );
      }

      // スピーカーノート生成（オプション）
      if (options?.includeSpeakerNotes) {
        result.speakerNotes = await this.generateSpeakerNotes(content);
      }

      return result;
    } catch (error) {
      throw this.handleError(error, 'complete presentation creation');
    }
  }

  private extractImagePromptsFromContent(content: string): string[] {
    // スライドコンテンツから画像生成プロンプトを抽出
    // 実際の実装では、より洗練された解析を行う
    const lines = content.split('\n');
    const prompts: string[] = [];
    
    lines.forEach(line => {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        const title = line.replace(/^#+\s*/, '');
        prompts.push(`Professional illustration for slide titled: ${title}`);
      }
    });

    return prompts.slice(0, 5); // 最大5つの画像
  }

  private handleError(error: unknown, operation: string): AzureServiceError {
    if (error instanceof AzureServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new AzureServiceError(
        `Failed to perform ${operation}: ${error.message}`,
        'OPERATION_FAILED',
        error
      );
    }

    return new AzureServiceError(`Unknown error during ${operation}`, 'UNKNOWN_ERROR');
  }
}

// AI温度設定のデフォルト値
export const AI_TEMPERATURE_DEFAULTS = {
  slideCount: 0.3,
  dataAnalysis: 0.2,
  structuredOutput: 0.1,
  manualGeneration: 0.5,
  documentation: 0.4,
  slideStructure: 0.3,
  contentOptimization: 0.6,
  existingStoryAdaptation: 0.7,
  themeSelection: 0.4,
  imageGeneration: 0.8,
  creativeWriting: 0.9,
  originalStory: 1.0
};

// デフォルトインスタンス作成用ヘルパー
export const createAzureService = (config: AzureServiceConfig): AzureService => {
  return new AzureService(config);
};