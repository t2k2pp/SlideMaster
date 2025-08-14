// =================================================================
// AI Service Interface - 将来のマルチプロバイダー対応用インターフェース
// 現在はAzure OpenAI専用だが、将来の拡張を考慮した設計
// =================================================================

// 基本的なAIサービスインターフェース
export interface IAIService {
  // テキスト生成
  generateText(options: TextGenerationOptions): Promise<string>;
  generateSlideContent(topic: string, slideCount?: number): Promise<string>;
  improveSlideContent(currentContent: string, improvementType: ImprovementType): Promise<string>;
  generateSpeakerNotes(slideContent: string): Promise<string>;
  translateSlideContent(content: string, targetLanguage: string): Promise<string>;

  // 画像生成
  generateImage(options: ImageGenerationOptions): Promise<string>;
  generateSlideImage(options: SlideImageOptions): Promise<string>;
  generateBackgroundImage(topic: string, style?: BackgroundStyle): Promise<string>;
  generateIllustration(description: string, context?: string): Promise<string>;
  generateDiagram(diagramType: string, description: string): Promise<string>;
  generateIcon(iconDescription: string, style?: IconStyle): Promise<string>;

  // ビデオ分析
  analyzeVideo(options: VideoAnalysisOptions): Promise<string>;
  analyzeVideoForSlides(options: VideoAnalysisOptions): Promise<VideoSlideAnalysis>;
  extractKeyMoments(options: VideoAnalysisOptions): Promise<string[]>;
  generateSlideContentFromVideo(options: VideoAnalysisOptions, slideCount?: number): Promise<string>;

  // ユーティリティ
  testConnection(): Promise<boolean>;
  getConfig(): Readonly<ServiceConfig>;
}

// 共通型定義
export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  responseFormat?: 'url' | 'b64_json';
}

export interface SlideImageOptions extends ImageGenerationOptions {
  slideTitle?: string;
  slideContent?: string;
  imageType?: ImageType;
}

export interface VideoAnalysisOptions {
  videoData: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  analysisType?: AnalysisType;
}

export interface VideoSlideAnalysis {
  summary: string;
  keyPoints: string[];
  suggestedSlides: number;
  topics: string[];
  presentationStyle: string;
  targetAudience: string;
  duration: string;
  qualityAssessment: QualityAssessment;
}

export interface QualityAssessment {
  audioQuality: string;
  visualQuality: string;
  contentClarity: string;
  engagement: string;
}

export interface ServiceConfig {
  endpoint?: string;
  apiKey: string;
  apiVersion?: string;
  [key: string]: any; // プロバイダー固有の設定
}

// 列挙型
export type ImprovementType = 'clarity' | 'engagement' | 'structure' | 'brevity';
export type BackgroundStyle = 'professional' | 'creative' | 'minimal' | 'academic';
export type IconStyle = 'flat' | 'outline' | '3d' | 'minimal';
export type ImageType = 'background' | 'illustration' | 'icon' | 'diagram';
export type AnalysisType = 'content' | 'presentation' | 'educational' | 'marketing';

// Azure OpenAI専用の型（現在の実装）
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'natural' | 'vivid';

// プロバイダータイプ（ローカルLLM対応）
export type AIProviderType = 'azure' | 'gemini' | 'lmstudio' | 'fooocus';

// エラー型
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public provider?: AIProviderType,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// 統合プレゼンテーション作成オプション
export interface CompletePresentationOptions {
  slideCount?: number;
  includeImages?: boolean;
  imageStyle?: BackgroundStyle;
  includeBackground?: boolean;
  includeSpeakerNotes?: boolean;
}

export interface CompletePresentationResult {
  content: string;
  backgroundImage?: string;
  slideImages?: string[];
  speakerNotes?: string;
}

// 将来のプロバイダー追加時の拡張ポイント
export interface IAIServiceFactory {
  createService(providerType: AIProviderType, config: ServiceConfig): IAIService;
  validateConfig(providerType: AIProviderType, config: ServiceConfig): string[];
  getDefaultConfig(providerType: AIProviderType): Partial<ServiceConfig>;
  getSupportedProviders(): AIProviderType[];
}

// 現在のAzure OpenAI専用実装への適合
export interface AzureServiceAdapter extends IAIService {
  createCompletePresentation(topic: string, options?: CompletePresentationOptions): Promise<CompletePresentationResult>;
}

// =================================================================
// Enhanced AI Service Interface - デザイナー戦略パターン対応
// UIの設定項目を完全活用するための拡張インターフェース
// =================================================================

import type { SlideGenerationRequest, Presentation, Slide } from '../../types';

// 拡張されたスライド生成リクエスト（SlideGenerationRequestベース）
export interface EnhancedSlideRequest extends SlideGenerationRequest {
  // SlideGenerationRequestの全パラメータを継承:
  // - topic, slideCount, theme, purpose, designer
  // - includeImages, imageSettings, pageNumbers
  // - speakerNotes など全てを活用
  
  // 追加のメタデータ
  generationId?: string;           // 生成セッションID
  userId?: string;                 // ユーザーID（将来のパーソナライゼーション用）
  previousContext?: string;        // 前回の生成コンテキスト
  customInstructions?: string;     // ユーザー固有の指示
}

// 動画からのスライド生成リクエスト
export interface VideoSlideRequest {
  videoFile: File;                 // 動画ファイル
  scenario: string;                // 動画の用途（manual, corporate, education など）
  theme: string;                   // テーマ
  aspectRatio: string;             // アスペクト比
  includeImages: boolean;          // 画像を含めるか
  slideCount?: number;             // スライド数（autoの場合は未定義）
  autoSlideCount: boolean;         // 自動スライド数決定
  slideCountSpecification?: 'exact' | 'max' | 'min' | 'around';
  
  // 追加のメタデータ
  generationId?: string;
  customInstructions?: string;
}

// スライド生成結果
export interface SlideGenerationResult {
  success: boolean;
  presentation?: Presentation;
  slides?: Slide[];
  
  // メタデータ
  generationId: string;
  timestamp: Date;
  
  // 生成統計
  statistics?: {
    processingTimeMs: number;
    tokenCount?: number;
    imageCount?: number;
    estimatedCost?: number;
  };
  
  // エラー情報
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  // 生成品質指標
  qualityMetrics?: {
    contentRelevance: number;     // 0-1: コンテンツの関連性
    structuralCoherence: number;  // 0-1: 構造の一貫性
    designConsistency: number;    // 0-1: デザインの一貫性
  };
  
  // 使用された戦略情報
  strategyUsed?: {
    designer: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
  };
}

// 拡張されたAIサービスインターフェース
export interface EnhancedAIService {
  /**
   * スライドコンテンツの生成
   * デザイナー戦略、用途、テーマなどの全設定を考慮
   */
  generateSlideContent(request: EnhancedSlideRequest): Promise<SlideGenerationResult>;
  
  /**
   * 動画からのスライド生成
   * 動画用途に応じた分析戦略を適用
   */
  generateVideoSlides(request: VideoSlideRequest): Promise<SlideGenerationResult>;
  
  /**
   * スライド画像の生成
   * コンテキストとテーマを考慮した画像生成
   */
  generateSlideImages(
    slides: Slide[], 
    theme: string, 
    imageSettings: any
  ): Promise<{ [slideId: string]: string }>;
  
  /**
   * 接続テスト
   */
  testConnection(): Promise<boolean>;
  
  /**
   * プロバイダー情報の取得
   */
  getProviderInfo(): {
    name: string;
    version: string;
    capabilities: string[];
  };
}

// デザイナー戦略インターフェース
export interface DesignerStrategy {
  /**
   * デザイナーの識別子
   */
  readonly designerId: string;
  
  /**
   * デザイナーの名前
   */
  readonly designerName: string;
  
  /**
   * コンテンツ生成用プロンプトの構築
   */
  buildContentPrompt(request: EnhancedSlideRequest): string;
  
  /**
   * 画像生成用プロンプトの構築
   */
  buildImagePrompt(slideContent: string, imageContext: any): string;
  
  /**
   * レイアウト戦略の取得
   */
  getLayoutStrategy(): {
    preferredLayouts: string[];
    imagePositioning: 'dominant' | 'supporting' | 'minimal';
    textDensity: 'minimal' | 'balanced' | 'detailed';
  };
  
  /**
   * コンテンツ後処理
   */
  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string;
  
  /**
   * Title Slide生成
   */
  generateTitleSlide(request: EnhancedSlideRequest): any;
}

// ファクトリインターフェース
export interface SlideGenerationFactory {
  /**
   * スライド生成器の作成
   */
  createSlideGenerator(request: EnhancedSlideRequest): Promise<EnhancedAIService>;
  
  /**
   * 動画スライド生成器の作成
   */
  createVideoSlideGenerator(request: VideoSlideRequest): Promise<EnhancedAIService>;
  
  /**
   * 利用可能なプロバイダーの一覧取得
   */
  getAvailableProviders(): string[];
  
  /**
   * 利用可能なデザイナー戦略の一覧取得
   */
  getAvailableDesigners(): string[];
}

// 拡張エラー定義
export class EnhancedAIServiceError extends AIServiceError {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public designer?: string,
    public details?: any
  ) {
    super(message, code, provider as AIProviderType);
    this.name = 'EnhancedAIServiceError';
    this.designer = designer;
    this.details = details;
  }
}