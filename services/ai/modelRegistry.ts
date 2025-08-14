// =================================================================
// Model Registry - Azure OpenAI専用モデル定義
// Azure OpenAI デプロイメント情報とモデル管理
// =================================================================

import { AIProviderType } from './aiProviderInterface';

export interface ModelInfo {
  id: string;
  name: string;
  context?: string;
  cost?: 'none' | 'lowest' | 'low' | 'medium' | 'high';
  speed?: 'slowest' | 'slow' | 'medium' | 'fast' | 'fastest';
  features?: string[];
  enterprise?: boolean;
  reasoning?: boolean;
  latest?: boolean;
  multimodal?: boolean;
  local?: boolean;
}

export interface ProviderModels {
  textGeneration: ModelInfo[];
  imageGeneration: ModelInfo[];
  videoAnalysis: ModelInfo[];
}

// Azure OpenAI専用モデル情報
export const MODEL_REGISTRY_2025: Record<AIProviderType, ProviderModels> = {
  azure: {
    textGeneration: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context: '128K',
        cost: 'high',
        speed: 'medium',
        features: ['multimodal', 'reasoning'],
        reasoning: true,
        latest: true,
        multimodal: true,
        enterprise: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        context: '128K',
        cost: 'low',
        speed: 'fast',
        features: ['multimodal', 'cost-effective'],
        multimodal: true,
        enterprise: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        context: '128K',
        cost: 'medium',
        speed: 'fast',
        features: ['vision', 'function-calling'],
        enterprise: true,
      },
      {
        id: 'gpt-35-turbo',
        name: 'GPT-3.5 Turbo',
        context: '16K',
        cost: 'lowest',
        speed: 'fastest',
        features: ['cost-effective', 'fast'],
        enterprise: true,
      },
    ],
    imageGeneration: [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        features: ['high-quality', 'creative', 'precise-instructions'],
        latest: true,
        enterprise: true,
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        features: ['standard', 'versatile', 'cost-effective'],
        enterprise: true,
      },
    ],
    videoAnalysis: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o Vision',
        context: '128K',
        features: ['video-analysis', 'frame-understanding', 'temporal-analysis'],
        multimodal: true,
        latest: true,
        enterprise: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo Vision',
        context: '128K',
        features: ['detailed-analysis', 'object-detection', 'scene-understanding'],
        multimodal: true,
        enterprise: true,
      },
    ],
  },
};

export type TaskType = 'textGeneration' | 'imageGeneration' | 'videoAnalysis';

export function getAvailableModels(provider: AIProviderType, taskType: TaskType): ModelInfo[] {
  const providerModels = MODEL_REGISTRY_2025[provider];
  if (!providerModels) {
    return [];
  }
  
  return providerModels[taskType] || [];
}

export function getModelInfo(provider: AIProviderType, taskType: TaskType, modelId: string): ModelInfo | null {
  const models = getAvailableModels(provider, taskType);
  return models.find(model => model.id === modelId) || null;
}

export function getRecommendedModel(provider: AIProviderType, taskType: TaskType): ModelInfo | null {
  const models = getAvailableModels(provider, taskType);
  
  // 最新モデルを優先
  const latestModel = models.find(model => model.latest);
  if (latestModel) {
    return latestModel;
  }
  
  // 最新がない場合は最初のモデルを返す
  return models.length > 0 ? models[0] : null;
}

export function getSupportedProviders(): AIProviderType[] {
  return Object.keys(MODEL_REGISTRY_2025) as AIProviderType[];
}

export function isProviderSupported(provider: AIProviderType): boolean {
  return provider in MODEL_REGISTRY_2025;
}

export function getProviderCapabilities(provider: AIProviderType): {
  textGeneration: boolean;
  imageGeneration: boolean;
  videoAnalysis: boolean;
} {
  const providerModels = MODEL_REGISTRY_2025[provider];
  if (!providerModels) {
    return { textGeneration: false, imageGeneration: false, videoAnalysis: false };
  }
  
  return {
    textGeneration: providerModels.textGeneration.length > 0,
    imageGeneration: providerModels.imageGeneration.length > 0,
    videoAnalysis: providerModels.videoAnalysis.length > 0,
  };
}