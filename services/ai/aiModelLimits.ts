// =================================================================
// AI Model Limits Configuration
// 各AIサービス・モデルの制限値を一元管理
// =================================================================

export interface ModelLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
  contextWindow: number;
  description: string;
  deprecated?: boolean;
  deprecationDate?: string;
}

export interface AIServiceLimits {
  [modelName: string]: ModelLimits;
}

export interface AllAIServiceLimits {
  gemini: AIServiceLimits;
  azureOpenAI: AIServiceLimits;
}

/**
 * 各AIサービスの実際の制限値
 * 公式ドキュメントに基づいて定期的に更新
 */
export const AI_MODEL_LIMITS: AllAIServiceLimits = {
  // Google Gemini
  gemini: {
    'gemini-2.0-flash': {
      maxInputTokens: 1048576, // 1M tokens
      maxOutputTokens: 8192,
      contextWindow: 1048576,
      description: 'Gemini 2.0 Flash - 最新高速モデル'
    },
    'gemini-1.5-pro': {
      maxInputTokens: 2097152, // 2M tokens
      maxOutputTokens: 8192,
      contextWindow: 2097152,
      description: 'Gemini 1.5 Pro - 高性能モデル'
    },
    'gemini-1.5-flash': {
      maxInputTokens: 1048576, // 1M tokens
      maxOutputTokens: 8192,
      contextWindow: 1048576,
      description: 'Gemini 1.5 Flash - 高速モデル'
    }
  },

  // Azure OpenAI
  azureOpenAI: {
    // GPT-4o シリーズ
    'gpt-4o-2024-11-20': {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      contextWindow: 128000,
      description: 'GPT-4o (2024-11-20) - 最新版'
    },
    'gpt-4o-2024-08-06': {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      contextWindow: 128000,
      description: 'GPT-4o (2024-08-06)'
    },
    'gpt-4o-2024-05-13': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      contextWindow: 128000,
      description: 'GPT-4o (2024-05-13) - 初期版',
      deprecated: true,
      deprecationDate: '2025-01-31'
    },
    'gpt-4o-mini': {
      maxInputTokens: 128000,
      maxOutputTokens: 16384,
      contextWindow: 128000,
      description: 'GPT-4o Mini - 軽量版'
    },

    // GPT-5 シリーズ (新規追加)
    'gpt-5': {
      maxInputTokens: 200000,
      maxOutputTokens: 32768,
      contextWindow: 200000,
      description: 'GPT-5 - 次世代モデル (近日提供予定)'
    },
    'gpt-5-turbo': {
      maxInputTokens: 200000,
      maxOutputTokens: 32768,
      contextWindow: 200000,
      description: 'GPT-5 Turbo - 高速版 (近日提供予定)'
    },

    // GPT-4 Turbo シリーズ
    'gpt-4-turbo-2024-04-09': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      contextWindow: 128000,
      description: 'GPT-4 Turbo (2024-04-09)'
    },
    'gpt-4-0125-preview': {
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      contextWindow: 128000,
      description: 'GPT-4 Turbo Preview'
    },

    // 従来のGPT-4
    'gpt-4': {
      maxInputTokens: 8192,
      maxOutputTokens: 4096,
      contextWindow: 8192,
      description: 'GPT-4 - 標準版'
    },
    'gpt-4-32k': {
      maxInputTokens: 32768,
      maxOutputTokens: 4096,
      contextWindow: 32768,
      description: 'GPT-4 32K - 長文対応'
    }
  }
};

/**
 * 安全マージンを考慮した推奨最大出力トークン数を取得
 * @param service AIサービス名
 * @param model モデル名
 * @param safetyMargin 安全マージン (0.0-1.0, デフォルト0.9)
 * @returns 推奨最大出力トークン数
 */
export function getRecommendedMaxTokens(
  service: 'gemini' | 'azureOpenAI',
  model: string,
  safetyMargin: number = 0.9
): number {
  const modelLimits = AI_MODEL_LIMITS[service]?.[model];
  
  if (!modelLimits) {
    console.warn(`⚠️ Unknown model: ${service}/${model}. Using default fallback.`);
    return service === 'gemini' ? 7372 : 14745; // 90% of common limits
  }

  const recommendedMax = Math.floor(modelLimits.maxOutputTokens * safetyMargin);
  
  console.log(`📊 Token limit for ${service}/${model}:`, {
    maxOutputTokens: modelLimits.maxOutputTokens,
    safetyMargin,
    recommendedMax
  });
  
  return recommendedMax;
}

/**
 * 指定されたAIサービスのモデル情報を取得
 * @param service AIサービス名
 * @param model モデル名
 * @returns モデル制限情報
 */
export function getModelLimits(
  service: 'gemini' | 'azureOpenAI',
  model: string
): ModelLimits | null {
  return AI_MODEL_LIMITS[service]?.[model] || null;
}

/**
 * 非推奨モデルの警告表示
 * @param service AIサービス名
 * @param model モデル名
 */
export function checkModelDeprecation(
  service: 'gemini' | 'azureOpenAI',
  model: string
): void {
  const limits = getModelLimits(service, model);
  
  if (limits?.deprecated) {
    console.warn(`⚠️ Model ${service}/${model} is deprecated.`, {
      description: limits.description,
      deprecationDate: limits.deprecationDate,
      recommendation: 'Consider upgrading to a newer model'
    });
  }
}

/**
 * 利用可能なモデル一覧を取得
 * @param service AIサービス名
 * @param includeDeprecated 非推奨モデルも含めるかどうか
 * @returns モデル名の配列
 */
export function getAvailableModels(
  service: 'gemini' | 'azureOpenAI',
  includeDeprecated: boolean = true
): string[] {
  const serviceModels = AI_MODEL_LIMITS[service];
  
  if (!serviceModels) {
    return [];
  }

  return Object.entries(serviceModels)
    .filter(([_, limits]) => includeDeprecated || !limits.deprecated)
    .map(([modelName]) => modelName);
}

/**
 * デフォルトフォールバック値
 * 未知のモデルの場合に使用される安全な値
 */
export const DEFAULT_TOKEN_LIMITS = {
  gemini: {
    maxOutputTokens: 7372, // Geminiの90%
    safeMargin: 0.9
  },
  azureOpenAI: {
    maxOutputTokens: 14745, // GPT-4oの90%
    safeMargin: 0.9
  }
} as const;