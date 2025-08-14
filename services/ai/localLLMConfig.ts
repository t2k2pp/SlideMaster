// =================================================================
// Local LLM Configuration - ローカルLLM設定管理
// LMStudio（OpenAI互換）とFooocus（画像生成）のサポート
// =================================================================

export interface LMStudioConfig {
  endpoint: string;                    // LMStudioサーバーエンドポイント（例: http://localhost:1234）
  apiKey?: string;                    // APIキー（必要に応じて）
  modelDisplayName?: string;          // 表示用モデル名（Gemma-3-4b等）
  maxTokens?: number;                 // 最大トークン数
  temperature?: number;               // 温度設定
}

export interface FoocusConfig {
  endpoint: string;                   // Foocusサーバーエンドポイント（例: http://localhost:7865）
  modelName?: string;                 // 使用モデル名（Stable Diffusion等）
  authToken?: string;                 // 認証トークン（必要に応じて）
  defaultStyle?: string;              // デフォルトスタイル
  defaultQuality?: 'draft' | 'standard' | 'high' | 'extreme';
}

export interface LMStudioTextRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface FoocusImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  style?: string;
  quality?: 'draft' | 'standard' | 'high' | 'extreme';
  model?: string;
}

// ローカルLLMプロバイダーのバリデーション
export class LocalLLMConfigError extends Error {
  constructor(message: string, public provider?: string) {
    super(message);
    this.name = 'LocalLLMConfigError';
  }
}

export const validateLMStudioConfig = (config: LMStudioConfig): string[] => {
  const errors: string[] = [];

  if (!config.endpoint) {
    errors.push('LMStudio endpoint is required');
  } else {
    try {
      const url = new URL(config.endpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('LMStudio endpoint must be HTTP or HTTPS URL');
      }
    } catch (e) {
      errors.push('Invalid LMStudio endpoint URL format');
    }
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32768)) {
    errors.push('Max tokens must be between 1 and 32768');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('Temperature must be between 0.0 and 2.0');
  }

  return errors;
};

export const validateFoocusConfig = (config: FoocusConfig): string[] => {
  const errors: string[] = [];

  if (!config.endpoint) {
    errors.push('Fooocus endpoint is required');
  } else {
    try {
      const url = new URL(config.endpoint);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Fooocus endpoint must be HTTP or HTTPS URL');
      }
    } catch (e) {
      errors.push('Invalid Fooocus endpoint URL format');
    }
  }

  const validQualities = ['draft', 'standard', 'high', 'extreme'];
  if (config.defaultQuality && !validQualities.includes(config.defaultQuality)) {
    errors.push(`Invalid quality. Must be one of: ${validQualities.join(', ')}`);
  }

  return errors;
};

export const getDefaultLMStudioConfig = (): Partial<LMStudioConfig> => ({
  endpoint: 'http://localhost:1234',
  modelDisplayName: 'Local LLM',
  maxTokens: 2048,
  temperature: 0.7,
});

export const getDefaultFoocusConfig = (): Partial<FoocusConfig> => ({
  endpoint: 'http://localhost:7865',
  modelName: 'Stable Diffusion',
  defaultQuality: 'standard',
  defaultStyle: 'default',
});

// 推奨ローカルモデル情報
export const RECOMMENDED_LOCAL_MODELS = {
  lmstudio: [
    {
      id: 'gemma-3n-e4b',
      name: 'Gemma 3n E4B',
      description: '軽量で高性能なテキスト生成モデル',
      size: '~4GB',
      recommended: true
    },
    {
      id: 'gemma-3-4b',
      name: 'Gemma 3 4B',
      description: 'バランスの取れたテキスト生成モデル',
      size: '~4GB',
      recommended: true
    },
    {
      id: 'deepseek-r1',
      name: 'DeepSeek R1',
      description: '推論に特化した高性能モデル',
      size: '~7GB',
      recommended: false
    },
    {
      id: 'phi-4-mini-reasoning',
      name: 'Phi 4 Mini Reasoning',
      description: 'Microsoft製の軽量推論モデル',
      size: '~3GB',
      recommended: true
    }
  ],
  fooocus: [
    {
      id: 'stable-diffusion-xl',
      name: 'Stable Diffusion XL',
      description: '高品質な画像生成モデル',
      size: '~7GB',
      recommended: true
    },
    {
      id: 'stable-diffusion-turbo',
      name: 'Stable Diffusion Turbo',
      description: '高速画像生成モデル',
      size: '~5GB',
      recommended: false
    }
  ]
};

// ローカルLLMプロバイダー用の統一化された設定マッピング
export interface LocalLLMProviderConfig {
  lmstudio: LMStudioConfig;
  fooocus: FoocusConfig;
}

export type LocalLLMProviderType = keyof LocalLLMProviderConfig;

// 設定の統一化（既存のProviderTaskAuth形式に合わせる）
export const mapLMStudioToProviderTaskAuth = (config: LMStudioConfig) => ({
  apiKey: config.apiKey || '',
  endpoint: config.endpoint,
  apiVersion: 'v1', // OpenAI互換
  modelName: config.modelDisplayName || 'Local LLM'
});

export const mapFoocusToProviderTaskAuth = (config: FoocusConfig) => ({
  apiKey: config.authToken || '',
  endpoint: config.endpoint,
  apiVersion: 'v1',
  modelName: config.modelName || 'Stable Diffusion'
});

export const mapProviderTaskAuthToLMStudio = (auth: any): LMStudioConfig => ({
  endpoint: auth.endpoint || 'http://localhost:1234',
  apiKey: auth.apiKey,
  modelDisplayName: auth.modelName || 'Local LLM',
  maxTokens: 2048,
  temperature: 0.7
});

export const mapProviderTaskAuthToFooocus = (auth: any): FoocusConfig => ({
  endpoint: auth.endpoint || 'http://localhost:7865',
  authToken: auth.apiKey,
  modelName: auth.modelName || 'Stable Diffusion',
  defaultQuality: 'standard'
});