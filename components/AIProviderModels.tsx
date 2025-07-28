// タスク別AIプロバイダー・モデル設定コンポーネント
import React from 'react';
import { UserSettings } from '../services/storageService';

interface AIProviderModelsProps {
  settings: UserSettings;
  onSettingChange: (key: keyof UserSettings, value: any) => void;
}

// プロバイダー別利用可能モデル
const PROVIDER_MODELS = {
  gemini: {
    textGeneration: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: '最新・最高性能' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: '高速・バランス重視' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: '軽量・高速' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'マルチモーダル対応' },
      { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro Latest', description: '安定版' },
      { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest', description: '高速版' },
    ],
    imageGeneration: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental', description: 'テキスト+画像生成' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'テキスト+画像生成' },
      { value: 'imagen-4', label: 'Imagen 4', description: '最新画像生成' },
      { value: 'imagen-3', label: 'Imagen 3', description: '高品質画像生成' },
    ],
    videoAnalysis: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: '高精度分析' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: '高速分析' },
      { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro Latest', description: '安定分析' },
    ]
  },
  azure: {
    textGeneration: [
      { value: 'gpt-4.1', label: 'GPT-4.1', description: '最新・最高性能' },
      { value: 'gpt-4o', label: 'GPT-4o', description: 'マルチモーダル対応' },
      { value: 'o3-mini', label: 'o3-mini', description: '推論特化・コスト効率' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '高速・大容量' },
    ],
    imageGeneration: [
      { value: 'gpt-image-1', label: 'GPT-Image-1', description: '最新画像生成' },
      { value: 'dall-e-3', label: 'DALL-E 3', description: '高品質画像生成' },
    ],
    videoAnalysis: [
      { value: 'gpt-4o', label: 'GPT-4o', description: 'Vision対応' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '高速分析' },
    ]
  },
  openai: {
    textGeneration: [
      { value: 'gpt-4.1', label: 'GPT-4.1', description: '最新・最高性能' },
      { value: 'gpt-4o', label: 'GPT-4o', description: 'マルチモーダル対応' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'コスト効率重視' },
      { value: 'o3-mini', label: 'o3-mini', description: '推論特化' },
      { value: 'o1-mini', label: 'o1-mini', description: '推論モデル' },
    ],
    imageGeneration: [
      { value: 'gpt-image-1', label: 'GPT-Image-1', description: '最新画像生成' },
      { value: 'dall-e-3', label: 'DALL-E 3', description: '高品質画像生成' },
    ],
    videoAnalysis: [
      { value: 'gpt-4o', label: 'GPT-4o', description: 'Vision対応' },
      { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision Preview', description: 'ビジョン特化' },
    ]
  },
  claude: {
    textGeneration: [
      { value: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', description: '最新・ハイブリッド推論' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: '高性能・コーディング特化' },
      { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', description: '高速・コスト効率' },
    ],
    imageGeneration: [
      { value: 'unsupported', label: '画像生成未対応', description: 'Claudeは画像生成をサポートしていません' },
    ],
    videoAnalysis: [
      { value: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', description: '高精度分析' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: 'バランス重視' },
    ]
  },
  lmstudio: {
    textGeneration: [
      { value: 'llama-3.2', label: 'Llama 3.2', description: 'ローカル高性能' },
      { value: 'mixtral-8x7b', label: 'Mixtral 8x7B', description: 'エキスパートモデル' },
      { value: 'codellama-34b', label: 'CodeLlama 34B', description: 'コーディング特化' },
      { value: 'auto', label: '読み込み済みモデル', description: 'LM Studioで現在読み込まれているモデル' },
    ],
    imageGeneration: [
      { value: 'unsupported', label: '画像生成未対応', description: 'LM Studioはテキスト生成専用です' },
    ],
    videoAnalysis: [
      { value: 'llava-13b', label: 'LLaVA 13B', description: 'ビジョン対応' },
      { value: 'llava-7b', label: 'LLaVA 7B', description: '軽量ビジョン' },
    ]
  },
  fooocus: {
    textGeneration: [
      { value: 'unsupported', label: 'テキスト生成未対応', description: 'Fooucusは画像生成専用です' },
    ],
    imageGeneration: [
      { value: 'juggernaut-xl', label: 'Juggernaut XL', description: 'SDXL高品質' },
      { value: 'realistic-vision-xl', label: 'Realistic Vision XL', description: 'リアル系' },
      { value: 'anime-xl', label: 'Anime XL', description: 'アニメ調' },
      { value: 'flux-dev', label: 'Flux Dev', description: '最新モデル' },
    ],
    videoAnalysis: [
      { value: 'unsupported', label: '動画分析未対応', description: 'Fooucusは画像生成専用です' },
    ]
  }
};

export const AIProviderModels: React.FC<AIProviderModelsProps> = ({ settings, onModelChange }) => {
  const currentProvider = settings.aiProvider || 'gemini';
  const providerModels = PROVIDER_MODELS[currentProvider];

  if (!providerModels) {
    return <div className="text-red-400">未対応のプロバイダーです</div>;
  }

  return (
    <div className="space-y-4">
      {/* テキスト生成モデル */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">テキスト生成</label>
        <select
          value={settings.aiModels?.textGeneration || providerModels.textGeneration[0]?.value || ''}
          onChange={(e) => onModelChange('aiModels', {
            ...(settings.aiModels || {}),
            textGeneration: e.target.value
          })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
          disabled={providerModels.textGeneration[0]?.value === 'unsupported'}
        >
          {providerModels.textGeneration.map((model) => (
            <option key={model.value} value={model.value} className="bg-gray-800 text-white">
              {model.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {providerModels.textGeneration.find(m => m.value === (settings.aiModels?.textGeneration || providerModels.textGeneration[0]?.value))?.description}
        </p>
      </div>

      {/* 画像生成モデル */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">画像生成</label>
        <select
          value={settings.aiModels?.imageGeneration || providerModels.imageGeneration[0]?.value || ''}
          onChange={(e) => onModelChange('aiModels', {
            ...(settings.aiModels || {}),
            imageGeneration: e.target.value
          })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
          disabled={providerModels.imageGeneration[0]?.value === 'unsupported'}
        >
          {providerModels.imageGeneration.map((model) => (
            <option key={model.value} value={model.value} className="bg-gray-800 text-white">
              {model.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {providerModels.imageGeneration.find(m => m.value === (settings.aiModels?.imageGeneration || providerModels.imageGeneration[0]?.value))?.description}
        </p>
      </div>

      {/* 動画分析モデル */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">動画分析</label>
        <select
          value={settings.aiModels?.videoAnalysis || providerModels.videoAnalysis[0]?.value || ''}
          onChange={(e) => onModelChange('aiModels', {
            ...(settings.aiModels || {}),
            videoAnalysis: e.target.value
          })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
          disabled={providerModels.videoAnalysis[0]?.value === 'unsupported'}
        >
          {providerModels.videoAnalysis.map((model) => (
            <option key={model.value} value={model.value} className="bg-gray-800 text-white">
              {model.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {providerModels.videoAnalysis.find(m => m.value === (settings.aiModels?.videoAnalysis || providerModels.videoAnalysis[0]?.value))?.description}
        </p>
      </div>
    </div>
  );
};