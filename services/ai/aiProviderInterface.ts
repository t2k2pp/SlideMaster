// =================================================================
// AI Provider Interface - 共通AIプロバイダーインターフェース
// 2025年対応マルチプロバイダー統合システム
// =================================================================

export type AIProviderType = 'gemini' | 'azure' | 'openai' | 'claude' | 'lmstudio' | 'fooocus';

export interface AIModelConfig {
  textGeneration: string;
  imageGeneration: string;
  videoAnalysis: string;
}

export interface AIProviderConfig {
  name: AIProviderType;
  apiKey: string;
  models: AIModelConfig;
  endpoint?: string; // Azure/Claude/LM Studio/Fooocus用
  deployments?: Record<string, string>; // Azure用
  organization?: string; // OpenAI用
  localPort?: number; // LM Studio/Fooocus用
  modelPath?: string; // LM Studio用（ローカルモデルファイルパス）
}

export interface TextGenerationRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  style?: string;
  n?: number;
  negativePrompt?: string; // Fooocus用
  seed?: number;
  sharpness?: number; // Fooocus用
  guidanceScale?: number; // Fooocus用
  aspectRatio?: string; // Fooocus用
}

export interface VideoAnalysisRequest {
  videoData: string; // base64
  prompt: string;
  model: string;
}

export interface AIProvider {
  name: AIProviderType;
  generateText(request: TextGenerationRequest): Promise<string>;
  generateImage(request: ImageGenerationRequest): Promise<string>;
  analyzeVideo(request: VideoAnalysisRequest): Promise<string>;
  validateConfig(config: AIProviderConfig): Promise<boolean>;
  getAvailableModels(): Promise<{ [key: string]: string[] }>;
  estimateCost(request: any): Promise<number>; // コスト見積もり機能
}

// プロバイダー固有のエラー型
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProviderType,
    public errorCode?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIProviderConfigError extends AIProviderError {
  constructor(message: string, provider: AIProviderType, cause?: Error) {
    super(message, provider, 'CONFIG_ERROR', cause);
    this.name = 'AIProviderConfigError';
  }
}

export class AIProviderConnectionError extends AIProviderError {
  constructor(message: string, provider: AIProviderType, cause?: Error) {
    super(message, provider, 'CONNECTION_ERROR', cause);
    this.name = 'AIProviderConnectionError';
  }
}

export class AIProviderRateLimitError extends AIProviderError {
  constructor(message: string, provider: AIProviderType, cause?: Error) {
    super(message, provider, 'RATE_LIMIT_ERROR', cause);
    this.name = 'AIProviderRateLimitError';
  }
}

export class AIProviderQuotaExceededError extends AIProviderError {
  constructor(message: string, provider: AIProviderType, cause?: Error) {
    super(message, provider, 'QUOTA_EXCEEDED_ERROR', cause);
    this.name = 'AIProviderQuotaExceededError';
  }
}

// プロバイダー能力定義
export interface AIProviderCapabilities {
  textGeneration: boolean;
  imageGeneration: boolean;
  videoAnalysis: boolean;
  multimodal: boolean;
  localExecution: boolean;
  requiresApiKey: boolean;
  supportsBatch: boolean;
  supportsStreaming: boolean;
}

// 共通ユーティリティ関数
export const getProviderCapabilities = (provider: AIProviderType): AIProviderCapabilities => {
  const capabilities: Record<AIProviderType, AIProviderCapabilities> = {
    gemini: {
      textGeneration: true,
      imageGeneration: true,
      videoAnalysis: true,
      multimodal: true,
      localExecution: false,
      requiresApiKey: true,
      supportsBatch: true,
      supportsStreaming: false,
    },
    azure: {
      textGeneration: true,
      imageGeneration: true,
      videoAnalysis: true,
      multimodal: true,
      localExecution: false,
      requiresApiKey: true,
      supportsBatch: true,
      supportsStreaming: true,
    },
    openai: {
      textGeneration: true,
      imageGeneration: true,
      videoAnalysis: true,
      multimodal: true,
      localExecution: false,
      requiresApiKey: true,
      supportsBatch: true,
      supportsStreaming: true,
    },
    claude: {
      textGeneration: true,
      imageGeneration: false,
      videoAnalysis: true,
      multimodal: true,
      localExecution: false,
      requiresApiKey: true,
      supportsBatch: false,
      supportsStreaming: true,
    },
    lmstudio: {
      textGeneration: true,
      imageGeneration: false,
      videoAnalysis: true,
      multimodal: true,
      localExecution: true,
      requiresApiKey: false,
      supportsBatch: false,
      supportsStreaming: true,
    },
    fooocus: {
      textGeneration: false,
      imageGeneration: true,
      videoAnalysis: false,
      multimodal: false,
      localExecution: true,
      requiresApiKey: false,
      supportsBatch: false,
      supportsStreaming: false,
    },
  };

  return capabilities[provider];
};

export const isProviderCapable = (provider: AIProviderType, capability: keyof AIProviderCapabilities): boolean => {
  return getProviderCapabilities(provider)[capability];
};

export const getProviderDisplayName = (provider: AIProviderType): string => {
  const displayNames: Record<AIProviderType, string> = {
    gemini: 'Google Gemini',
    azure: 'Azure OpenAI',
    openai: 'OpenAI Direct',
    claude: 'Anthropic Claude',
    lmstudio: 'LM Studio',
    fooocus: 'Fooocus',
  };

  return displayNames[provider];
};

// バリデーション関数
export const validateAIProviderConfig = (config: AIProviderConfig): string[] => {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Provider name is required');
  }

  const capabilities = getProviderCapabilities(config.name);
  
  if (capabilities.requiresApiKey && !config.apiKey) {
    errors.push(`API key is required for ${getProviderDisplayName(config.name)}`);
  }

  if (config.name === 'azure') {
    if (!config.endpoint) {
      errors.push('Azure endpoint is required');
    }
    if (!config.deployments) {
      errors.push('Azure deployments configuration is required');
    }
  }

  if ((config.name === 'lmstudio' || config.name === 'fooocus') && !config.localPort) {
    errors.push(`Local port is required for ${getProviderDisplayName(config.name)}`);
  }

  return errors;
};