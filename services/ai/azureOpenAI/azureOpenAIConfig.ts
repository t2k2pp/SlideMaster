// =================================================================
// Azure OpenAI Configuration - 設定管理
// Azure OpenAI専用設定とバリデーション
// =================================================================

export interface AzureOpenAIConfig {
  endpoint: string;                    // Azure OpenAI リソースのエンドポイント
  apiKey: string;                     // APIキー
  apiVersion?: string;                // APIバージョン（デフォルト: '2024-02-01'）
  textDeploymentName: string;         // テキスト生成用デプロイメント名
  imageDeploymentName: string;        // 画像生成用デプロイメント名
  videoDeploymentName?: string;       // ビデオ分析用デプロイメント名（オプション）
  // 画像生成専用設定（オプション）
  imageEndpoint?: string;             // 画像生成専用エンドポイント
  imageApiKey?: string;               // 画像生成専用APIキー
  imageApiVersion?: string;           // 画像生成専用APIバージョン
  // 動画分析専用設定（オプション）
  videoEndpoint?: string;             // 動画分析専用エンドポイント
  videoApiKey?: string;               // 動画分析専用APIキー
  videoApiVersion?: string;           // 動画分析専用APIバージョン
}

export interface AzureTextGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;               // 0.0 - 2.0
  maxTokens?: number;                // 最大トークン数
  topP?: number;                     // 0.0 - 1.0
  frequencyPenalty?: number;         // -2.0 - 2.0
  presencePenalty?: number;          // -2.0 - 2.0
  stop?: string[];                   // ストップシーケンス
}

export interface AzureImageGenerationRequest {
  prompt: string;
  size?: string;                                    // Azure固有のサイズ（1024x1024など）
  quality?: string;                                 // Azure固有の品質（standard/hd, low/medium/high/autoなど）
  style?: 'natural' | 'vivid';                      // スタイル設定
  responseFormat?: 'url' | 'b64_json';              // レスポンス形式
  modelName?: string;                               // モデル名（dall-e-3, gpt-image-1など）
}

export interface AzureVideoAnalysisRequest {
  videoData: string;                 // base64エンコードされた動画データ
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export class AzureOpenAIConfigError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'AzureOpenAIConfigError';
  }
}

export const validateAzureOpenAIConfig = (config: AzureOpenAIConfig): string[] => {
  const errors: string[] = [];

  if (!config.endpoint) {
    errors.push('Azure OpenAI endpoint is required');
  } else if (!config.endpoint.startsWith('https://')) {
    errors.push('Azure OpenAI endpoint must be HTTPS URL');
  }

  if (!config.apiKey) {
    errors.push('Azure OpenAI API key is required');
  } else if (config.apiKey.length < 10) {
    errors.push('Azure OpenAI API key appears to be invalid');
  }

  if (!config.textDeploymentName) {
    errors.push('Text generation deployment name is required');
  }

  if (!config.imageDeploymentName) {
    errors.push('Image generation deployment name is required');
  }

  if (config.apiVersion && !/^\d{4}-\d{2}-\d{2}(-preview)?$/.test(config.apiVersion)) {
    errors.push('Invalid API version format (expected: YYYY-MM-DD or YYYY-MM-DD-preview)');
  }

  return errors;
};

export const getDefaultAzureOpenAIConfig = (): Partial<AzureOpenAIConfig> => ({
  apiVersion: '2024-02-01',
  textDeploymentName: '',
  imageDeploymentName: '',
});

export const validateTextGenerationRequest = (request: AzureTextGenerationRequest): string[] => {
  const errors: string[] = [];

  if (!request.prompt || request.prompt.trim().length === 0) {
    errors.push('Prompt is required');
  }

  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
    errors.push('Temperature must be between 0.0 and 2.0');
  }

  if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 32768)) {
    errors.push('Max tokens must be between 1 and 32768');
  }

  if (request.topP !== undefined && (request.topP < 0 || request.topP > 1)) {
    errors.push('Top P must be between 0.0 and 1.0');
  }

  if (request.frequencyPenalty !== undefined && (request.frequencyPenalty < -2 || request.frequencyPenalty > 2)) {
    errors.push('Frequency penalty must be between -2.0 and 2.0');
  }

  if (request.presencePenalty !== undefined && (request.presencePenalty < -2 || request.presencePenalty > 2)) {
    errors.push('Presence penalty must be between -2.0 and 2.0');
  }

  return errors;
};

export const validateImageGenerationRequest = (request: AzureImageGenerationRequest): string[] => {
  const errors: string[] = [];

  // 基本的なバリデーションのみ（API側でより詳細な検証が行われる）
  if (!request.prompt || request.prompt.trim().length === 0) {
    errors.push('Image prompt is required');
  }

  if (request.prompt && request.prompt.length > 4000) {
    errors.push('Image prompt must be less than 4000 characters');
  }

  // モデル固有のパラメータ検証は、知っているモデルのみに限定
  // 未知のモデルはAPI側のエラーレスポンスに委ねる
  const modelName = request.modelName || 'dall-e-3';
  
  // 既知のモデルのみ、明らかに間違っている値をチェック
  if (request.size && modelName === 'dall-e-3') {
    const knownDallE3Sizes = ['1024x1024', '1792x1024', '1024x1792'];
    if (!knownDallE3Sizes.includes(request.size)) {
      // 警告のみ（エラーにしない）
      console.warn(`Unusual size for DALL-E 3: ${request.size}. Known sizes: ${knownDallE3Sizes.join(', ')}`);
    }
  }

  if (request.quality && modelName === 'gpt-image-1') {
    const knownGptImage1Qualities = ['low', 'medium', 'high', 'auto'];
    if (!knownGptImage1Qualities.includes(request.quality)) {
      console.warn(`Unusual quality for gpt-image-1: ${request.quality}. Known qualities: ${knownGptImage1Qualities.join(', ')}`);
    }
  }

  // 一般的なスタイルとフォーマットのみ厳密にチェック
  const validStyles = ['natural', 'vivid'] as const;
  if (request.style && !validStyles.includes(request.style)) {
    errors.push(`Invalid style. Must be one of: ${validStyles.join(', ')}`);
  }

  const validFormats = ['url', 'b64_json'] as const;
  if (request.responseFormat && !validFormats.includes(request.responseFormat)) {
    errors.push(`Invalid response format. Must be one of: ${validFormats.join(', ')}`);
  }

  return errors;
};

// モデル別の使用可能サイズを取得
export const getValidSizesForModel = (modelName: string): string[] => {
  switch (modelName) {
    case 'dall-e-3':
      return ['1024x1024', '1792x1024', '1024x1792'];
    case 'gpt-image-1':
      return ['1024x1024', '1024x1536', '1536x1024'];
    default:
      return ['1024x1024']; // デフォルト
  }
};

// モデル名に応じたデフォルトサイズを取得
export const getDefaultSizeForModel = (modelName: string): string => {
  return getValidSizesForModel(modelName)[0];
};

// モデル別の使用可能なQualityパラメータを取得
export const getValidQualitiesForModel = (modelName: string): string[] => {
  switch (modelName) {
    case 'dall-e-3':
      return ['standard', 'hd'];
    case 'gpt-image-1':
      return ['low', 'medium', 'high', 'auto'];
    default:
      return ['standard']; // デフォルト
  }
};

// モデル名に応じたデフォルトQualityを取得
export const getDefaultQualityForModel = (modelName: string): string => {
  switch (modelName) {
    case 'dall-e-3':
      return 'standard';
    case 'gpt-image-1':
      return 'medium';
    default:
      return 'standard';
  }
};