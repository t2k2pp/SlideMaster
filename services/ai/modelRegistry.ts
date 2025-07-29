// =================================================================
// Model Registry - 2025年最新AIモデル定義・管理
// 全プロバイダーの最新モデル情報と推奨システム
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

// 2025年7月26日時点での最新モデル情報
export const MODEL_REGISTRY_2025: Record<AIProviderType, ProviderModels> = {
  gemini: {
    textGeneration: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        context: '1M',
        cost: 'high',
        speed: 'medium',
        features: ['thinking', 'long-context'],
        reasoning: true,
        latest: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        context: '1M',
        cost: 'low',
        speed: 'fast',
        features: ['thinking', 'balanced'],
        reasoning: true,
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        context: '1M',
        cost: 'lowest',
        speed: 'fastest',
        features: ['cost-efficient', 'fastest'],
        latest: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        context: '1M',
        cost: 'low',
        speed: 'fast',
        features: ['multimodal', 'tool-use'],
        multimodal: true,
      },
    ],
    imageGeneration: [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Experimental',
        features: ['text+image', 'native-generation'],
        multimodal: true,
        latest: true,
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        features: ['text+image', 'native-generation'],
        multimodal: true,
      },
      {
        id: 'imagen-4',
        name: 'Imagen 4',
        features: ['high-quality', 'photorealistic'],
      },
      {
        id: 'imagen-3',
        name: 'Imagen 3',
        features: ['standard', 'versatile'],
      },
    ],
    videoAnalysis: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        context: '1M',
        features: ['long-video', 'detailed-analysis'],
        latest: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        context: '1M',
        features: ['fast-analysis', 'balanced'],
      },
    ],
  },
  azure: {
    textGeneration: [
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        context: '1M',
        cost: 'high',
        speed: 'medium',
        enterprise: true,
        latest: true,
        features: ['advanced-reasoning', 'long-context'],
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context: '128K',
        cost: 'medium',
        speed: 'fast',
        enterprise: true,
        multimodal: true,
        features: ['multimodal', 'efficient'],
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        context: '200K',
        cost: 'low',
        speed: 'fast',
        reasoning: true,
        enterprise: true,
        features: ['reasoning', 'cost-effective'],
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        context: '128K',
        cost: 'medium',
        speed: 'fast',
        enterprise: true,
        features: ['vision', 'function-calling'],
      },
    ],
    imageGeneration: [
      {
        id: 'gpt-image-1',
        name: 'GPT-image-1 (Latest)',
        features: ['precise-instructions', 'improved-quality'],
        latest: true,
        enterprise: true,
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        features: ['creative', 'versatile'],
        enterprise: true,
      },
    ],
    videoAnalysis: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o Vision',
        features: ['frame-analysis', 'temporal-understanding'],
        enterprise: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo Vision',
        features: ['detailed-analysis', 'object-tracking'],
        enterprise: true,
      },
    ],
  },
  openai: {
    textGeneration: [
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        context: '1M',
        cost: 'high',
        speed: 'medium',
        latest: true,
        features: ['advanced-reasoning', 'long-context'],
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context: '128K',
        cost: 'medium',
        speed: 'fast',
        multimodal: true,
        features: ['multimodal', 'efficient'],
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        context: '128K',
        cost: 'lowest',
        speed: 'fastest',
        features: ['cost-effective', 'fast'],
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        context: '200K',
        cost: 'low',
        speed: 'medium',
        reasoning: true,
        features: ['reasoning', 'problem-solving'],
      },
      {
        id: 'o1-mini',
        name: 'o1-mini',
        context: '128K',
        cost: 'medium',
        speed: 'slow',
        reasoning: true,
        features: ['advanced-reasoning', 'step-by-step'],
      },
    ],
    imageGeneration: [
      {
        id: 'gpt-image-1',
        name: 'GPT-image-1 (Latest)',
        features: ['precise-instructions', 'improved-quality'],
        latest: true,
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        features: ['creative', 'versatile'],
      },
    ],
    videoAnalysis: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o Vision',
        features: ['advanced-vision', 'temporal-analysis'],
      },
    ],
  },
  claude: {
    textGeneration: [
      {
        id: 'claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        context: '200K',
        cost: 'high',
        speed: 'medium',
        features: ['hybrid-reasoning', 'coding', 'computer-use'],
        reasoning: true,
        latest: true,
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        context: '200K',
        cost: 'medium',
        speed: 'fast',
        features: ['computer-use', 'coding', 'analysis'],
      },
      {
        id: 'claude-3.5-haiku',
        name: 'Claude 3.5 Haiku',
        context: '200K',
        cost: 'low',
        speed: 'fast',
        features: ['fast', 'efficient'],
      },
    ],
    imageGeneration: [], // Claudeは画像生成未対応
    videoAnalysis: [
      {
        id: 'claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        features: ['advanced-analysis', 'detailed-description'],
        latest: true,
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        features: ['vision', 'document-analysis'],
      },
    ],
  },
  lmstudio: {
    textGeneration: [
      {
        id: 'deepseek-r1-0528',
        name: 'DeepSeek R1 (0528)',
        context: '128K',
        cost: 'none',
        speed: 'medium',
        features: ['reasoning', 'local', 'privacy', '推論特化'],
        reasoning: true,
        local: true,
        latest: true,
      },
      {
        id: 'phi-4-mini-reasoning',
        name: 'Phi-4 Mini Reasoning',
        context: '128K',
        cost: 'none',
        speed: 'fast',
        features: ['reasoning', 'local', 'lightweight', '4B'],
        reasoning: true,
        local: true,
        latest: true,
      },
      {
        id: 'gemma-3-4b',
        name: 'Gemma 3 4B',
        context: '8K',
        cost: 'none',
        speed: 'fastest',
        features: ['local', 'lightweight', 'efficient', '4B'],
        local: true,
        latest: true,
      },
      {
        id: 'gemma-3n-e4b',
        name: 'Gemma 3n E4B',
        context: '8K',
        cost: 'none',
        speed: 'fastest',
        features: ['local', 'enhanced', 'efficient', '4B'],
        local: true,
        latest: true,
      },
      {
        id: 'qwen3-8b',
        name: 'Qwen3 8B',
        context: '32K',
        cost: 'none',
        speed: 'fast',
        features: ['local', 'multilingual', 'versatile', '8B'],
        local: true,
        latest: true,
      },
      {
        id: 'llama-3.3-8b',
        name: 'Llama 3.3 8B',
        context: '128K',
        cost: 'none',
        speed: 'fast',
        features: ['local', 'balanced', 'efficient', '8B'],
        local: true,
        latest: true,
      },
      {
        id: 'ministral-8b',
        name: 'Ministral 8B',
        context: '128K',
        cost: 'none',
        speed: 'fast',
        features: ['local', 'knowledge-dense', 'efficient', '8B'],
        local: true,
        latest: true,
      },
      {
        id: 'custom-model',
        name: 'カスタムモデル (ChatGPT互換API)',
        context: '可変',
        cost: 'none',
        speed: 'medium',
        features: ['local', 'custom', 'chatgpt-compatible'],
        local: true,
      },
      // レガシーモデル（後方互換性のため）
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1 (旧版)',
        context: '128K',
        cost: 'none',
        speed: 'medium',
        features: ['reasoning', 'local', 'privacy', 'legacy'],
        reasoning: true,
        local: true,
      },
      {
        id: 'llama-3.2',
        name: 'Llama 3.2 (旧版)',
        context: '128K',
        cost: 'none',
        speed: 'fast',
        features: ['local', 'multimodal', 'legacy'],
        multimodal: true,
        local: true,
      },
      {
        id: 'phi-3',
        name: 'Phi 3 (旧版)',
        context: '128K',
        cost: 'none',
        speed: 'fastest',
        features: ['local', 'lightweight', 'legacy'],
        local: true,
      },
    ],
    imageGeneration: [], // LM Studioは画像生成未対応
    videoAnalysis: [
      {
        id: 'llama-3.3-vision',
        name: 'Llama 3.3 Vision (最新)',
        context: '128K',
        cost: 'none',
        features: ['multimodal', 'local', 'efficient', 'latest'],
        multimodal: true,
        local: true,
        latest: true,
      },
      {
        id: 'qwen3-vision-8b',
        name: 'Qwen3 Vision 8B',
        context: '32K',
        cost: 'none',
        features: ['multimodal', 'local', 'multilingual', '8B'],
        multimodal: true,
        local: true,
        latest: true,
      },
      {
        id: 'llava-next-8b',
        name: 'LLaVA-Next 8B',
        context: '128K',
        cost: 'none',
        features: ['vision', 'local', 'enhanced', '8B'],
        multimodal: true,
        local: true,
        latest: true,
      },
      // レガシーモデル
      {
        id: 'llava-1.6',
        name: 'LLaVA 1.6 (旧版)',
        context: '128K',
        cost: 'none',
        features: ['vision', 'local', 'multimodal', 'legacy'],
        multimodal: true,
        local: true,
      },
      {
        id: 'llama-3.2-vision',
        name: 'Llama 3.2 Vision (旧版)',
        context: '128K',
        cost: 'none',
        features: ['multimodal', 'local', 'efficient', 'legacy'],
        multimodal: true,
        local: true,
      },
    ],
  },
  fooocus: {
    textGeneration: [], // Fooucusはテキスト生成未対応
    imageGeneration: [
      {
        id: 'juggernaut-xl',
        name: 'Juggernaut XL',
        features: ['photorealistic', 'local', 'sdxl', 'high-quality'],
        local: true,
      },
      {
        id: 'sd-xl-base',
        name: 'Stable Diffusion XL Base',
        features: ['versatile', 'local', 'sdxl', 'standard'],
        local: true,
      },
      {
        id: 'sd-xl-refiner',
        name: 'SDXL Refiner',
        features: ['enhancement', 'local', 'refiner', 'quality-boost'],
        local: true,
      },
      {
        id: 'realistic-vision-xl',
        name: 'Realistic Vision XL',
        features: ['photorealistic', 'local', 'portrait'],
        local: true,
      },
      {
        id: 'anime-xl',
        name: 'Anime XL',
        features: ['anime', 'local', 'stylized', 'illustration'],
        local: true,
      },
    ],
    videoAnalysis: [], // Fooucusは動画分析未対応
  },
};

// モデル推奨システム
export type TaskType = 'text' | 'image' | 'video';
export type Priority = 'cost' | 'quality' | 'speed' | 'privacy';

export const getRecommendedModel = (
  provider: AIProviderType,
  task: TaskType,
  priority: Priority = 'quality'
): ModelInfo | null => {
  // videoタスクは特別にvideoAnalysisに対応
  const taskKey = task === 'video' ? 'videoAnalysis' : `${task}Generation` as keyof ProviderModels;
  const models = MODEL_REGISTRY_2025[provider][taskKey];

  if (!models || models.length === 0) {
    return null;
  }

  switch (priority) {
    case 'cost':
      return models.find(m => m.cost === 'none') ||
             models.find(m => m.cost === 'lowest') ||
             models.find(m => m.cost === 'low') ||
             models[0];
    
    case 'quality':
      return models.find(m => m.latest && m.cost === 'high') ||
             models.find(m => m.cost === 'high') ||
             models.find(m => m.latest) ||
             models[0];
    
    case 'speed':
      return models.find(m => m.speed === 'fastest') ||
             models.find(m => m.speed === 'fast') ||
             models[0];
    
    case 'privacy':
      return models.find(m => m.local) ||
             models[0];
    
    default:
      return models[0];
  }
};

// 用途別推奨モデル取得
export const getRecommendedModelForUseCase = (
  useCase: 'presentation' | 'coding' | 'analysis' | 'creative' | 'enterprise'
): { provider: AIProviderType; model: ModelInfo; task: TaskType }[] => {
  const recommendations: { provider: AIProviderType; model: ModelInfo; task: TaskType }[] = [];

  switch (useCase) {
    case 'presentation':
      // プレゼン作成：バランス重視
      recommendations.push(
        { provider: 'gemini', model: getRecommendedModel('gemini', 'text', 'speed')!, task: 'text' },
        { provider: 'gemini', model: getRecommendedModel('gemini', 'image', 'quality')!, task: 'image' }
      );
      break;
    
    case 'coding':
      // コーディング：Claude特化
      recommendations.push(
        { provider: 'claude', model: getRecommendedModel('claude', 'text', 'quality')!, task: 'text' }
      );
      break;
    
    case 'analysis':
      // 分析：高性能モデル
      recommendations.push(
        { provider: 'openai', model: getRecommendedModel('openai', 'text', 'quality')!, task: 'text' },
        { provider: 'claude', model: getRecommendedModel('claude', 'video', 'quality')!, task: 'video' }
      );
      break;
    
    case 'creative':
      // 創造的作業：多様性重視
      recommendations.push(
        { provider: 'openai', model: getRecommendedModel('openai', 'text', 'quality')!, task: 'text' },
        { provider: 'openai', model: getRecommendedModel('openai', 'image', 'quality')!, task: 'image' }
      );
      break;
    
    case 'enterprise':
      // 企業利用：Azure推奨
      recommendations.push(
        { provider: 'azure', model: getRecommendedModel('azure', 'text', 'quality')!, task: 'text' },
        { provider: 'azure', model: getRecommendedModel('azure', 'image', 'quality')!, task: 'image' }
      );
      break;
  }

  return recommendations.filter(r => r.model !== null);
};

// プロバイダー別モデル取得
export const getAvailableModels = (provider: AIProviderType, task: TaskType): ModelInfo[] => {
  // videoタスクは特別にvideoAnalysisに対応
  const taskKey = task === 'video' ? 'videoAnalysis' : `${task}Generation` as keyof ProviderModels;
  return MODEL_REGISTRY_2025[provider][taskKey] || [];
};

// モデル検索
export const findModel = (provider: AIProviderType, modelId: string): ModelInfo | null => {
  const allTasks: TaskType[] = ['text', 'image', 'video'];
  
  for (const task of allTasks) {
    const models = getAvailableModels(provider, task);
    const found = models.find(m => m.id === modelId);
    if (found) return found;
  }
  
  return null;
};

// モデル比較機能
export const compareModels = (
  models: Array<{ provider: AIProviderType; modelId: string }>
): Array<{ provider: AIProviderType; model: ModelInfo | null; capabilities: string[] }> => {
  return models.map(({ provider, modelId }) => {
    const model = findModel(provider, modelId);
    const capabilities = model?.features || [];
    
    return {
      provider,
      model,
      capabilities,
    };
  });
};