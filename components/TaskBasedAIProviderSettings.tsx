import React, { useCallback } from 'react';
import { UserSettings, ProviderAuthConfig, ProviderTaskAuth } from '../services/storageService';
import { MessageSquare, Image, Video, Brain } from 'lucide-react';
import { getAvailableModels, TaskType } from '../services/ai/modelRegistry';
import { AIProviderType } from '../services/ai/aiProviderInterface';

// --- 定数定義 ---
const PROVIDERS = {
  azure: { name: 'Azure OpenAI', icon: '🔵' },
  gemini: { name: 'Google Gemini', icon: '🟢' },
};

const TASK_DEFINITIONS = {
  text: { providers: ['azure', 'gemini'] as const, taskKey: 'textGeneration' as const },
  image: { providers: ['azure', 'gemini'] as const, taskKey: 'imageGeneration' as const },
  video: { providers: ['azure', 'gemini'] as const, taskKey: 'videoAnalysis' as const },
};

const AUTH_FIELDS: { [key in AIProviderType]?: { key: keyof ProviderTaskAuth, label: string, type: string }[] } = {
  azure: [
    { key: 'apiKey', label: 'APIキー', type: 'password' },
    { key: 'endpoint', label: 'エンドポイント', type: 'url' },
    { key: 'apiVersion', label: 'APIバージョン', type: 'text' },
  ],
  gemini: [
    { key: 'apiKey', label: 'APIキー', type: 'password' },
  ],
};

// モデル選択肢の定義（プロバイダー別・2025年最新版）
const MODEL_OPTIONS = {
  azure: {
    textGeneration: [
      // 最新の推論モデル（2025年）
      { value: 'o3-mini', label: 'o3-mini (最新推論モデル)' },
      { value: 'o4-mini', label: 'o4-mini (推論モデル)' },
      { value: 'o1', label: 'o1 (推論モデル)' },
      { value: 'o1-mini', label: 'o1-mini (推論モデル)' },
      // 最新のGPT-5.0シリーズ（2025年）
      { value: 'gpt-5', label: 'GPT-5 (最新)' },
      { value: 'gpt-5-mini', label: 'GPT-5-mini' },
      { value: 'gpt-5-nano', label: 'GPT-5-nano' },
      { value: 'gpt-5-chat', label: 'GPT-5-chat' },
      // 最新のGPT-4.1シリーズ（2025年）
      { value: 'gpt-4.1', label: 'GPT-4.1 (1Mトークン)' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1-mini' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1-nano' },
      // GPT-4oシリーズ
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o-mini' },
      // 従来モデル
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' },
    ],
    imageGeneration: [
      { value: 'gpt-image-1', label: 'GPT Image 1 (最新・2025年4月)' },
      { value: 'dall-e-3', label: 'DALL-E 3' },
    ],
    videoAnalysis: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
    ],
  },
  gemini: {
    textGeneration: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (最新)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-2.0-flash-thinking', label: 'Gemini 2.0 Flash Thinking' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
      { value: 'gemini-pro', label: 'Gemini Pro (レガシー)' },
    ],
    imageGeneration: [
      { value: 'imagen-3.0-generate-002', label: 'Imagen 3.0 (最新・高品質)' },
      { value: 'imagen-3.0-fast-generate-001', label: 'Imagen 3.0 Fast' },
      { value: 'imagen-3.0-capability-001', label: 'Imagen 3.0 Capability' },
      { value: 'gemini-2.0-flash-preview-image-generation', label: 'Gemini 2.0 Flash Image Gen (プレビュー)' },
      { value: 'imagen-4.0-generate', label: 'Imagen 4.0 (実験的)' },
    ],
    videoAnalysis: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (最新)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision (レガシー)' },
    ],
  },
};

// --- ヘルパー関数 ---
const getModelsForProvider = (provider: AIProviderType, task: keyof typeof TASK_DEFINITIONS) => {
  try {
    return getAvailableModels(provider, TASK_DEFINITIONS[task].taskKey as TaskType).map(m => m.id);
  } catch { return []; }
};

// --- 子コンポーネント ---
interface TaskSettingProps {
  task: keyof typeof TASK_DEFINITIONS;
  icon: React.ReactNode;
  title: string;
  settings: UserSettings;
  onSettingsChange: (updates: Partial<UserSettings>) => void;
}

const TaskSetting: React.FC<TaskSettingProps> = React.memo(({
  task,
  icon,
  title,
  settings,
  onSettingsChange
}) => {
  const { providers, taskKey } = TASK_DEFINITIONS[task];
  const providerKey = `aiProvider${task.charAt(0).toUpperCase() + task.slice(1)}` as keyof UserSettings;
  const currentProvider = settings[providerKey] as AIProviderType || 'azure';
  
  const availableModels = React.useMemo(() => getModelsForProvider(currentProvider, task), [currentProvider, task]);
  const currentModel = settings.aiModels?.[taskKey] || '';

  const handleProviderChange = (provider: AIProviderType) => {
    // 現在のプロバイダーの設定を保存
    const currentProviderModels = { ...(settings.providerModels || {}) };
    if (!currentProviderModels[currentProvider]) {
      currentProviderModels[currentProvider] = {};
    }
    currentProviderModels[currentProvider][taskKey] = currentModel;
    
    // 切り替え先プロバイダーの保存済み設定を復元
    const savedModelForNewProvider = settings.providerModels?.[provider]?.[taskKey];
    let modelToUse = '';
    
    if (savedModelForNewProvider) {
      // 保存済みの設定値がある場合は復元
      modelToUse = savedModelForNewProvider;
    } else {
      // 保存済み設定がない場合はデフォルト値
      if (provider === 'gemini') {
        const defaultGeminiModels = {
          textGeneration: 'gemini-2.5-flash',
          imageGeneration: 'imagen-3.0-generate-002',
          videoAnalysis: 'gemini-2.5-flash'
        };
        modelToUse = defaultGeminiModels[taskKey] || 'gemini-2.5-flash';
      } else {
        modelToUse = ''; // Azureの場合は空（ユーザーがデプロイメント名を入力）
      }
    }
    
    onSettingsChange({
      [providerKey]: provider,
      aiModels: { ...(settings.aiModels || {}), [taskKey]: modelToUse },
      providerModels: currentProviderModels
    });
  };

  const handleModelChange = (model: string) => {
    // モデル変更時は、現在のプロバイダーの設定も同時に保存
    const updatedProviderModels = { ...(settings.providerModels || {}) };
    if (!updatedProviderModels[currentProvider]) {
      updatedProviderModels[currentProvider] = {};
    }
    updatedProviderModels[currentProvider][taskKey] = model;
    
    onSettingsChange({ 
      aiModels: { ...(settings.aiModels || {}), [taskKey]: model },
      providerModels: updatedProviderModels
    });
  };

  const handleAuthChange = (field: keyof ProviderTaskAuth, value: string) => {
    const newProviderAuth = JSON.parse(JSON.stringify(settings.providerAuth || {}));
    if (!newProviderAuth[currentProvider]) newProviderAuth[currentProvider] = {};
    if (!newProviderAuth[currentProvider][taskKey]) newProviderAuth[currentProvider][taskKey] = {};
    newProviderAuth[currentProvider][taskKey][field] = value;
    onSettingsChange({ providerAuth: newProviderAuth });
  };

  const authFields = AUTH_FIELDS[currentProvider] || [];
  const currentAuth = settings.providerAuth?.[currentProvider]?.[taskKey] || {};

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
      <div className="flex items-center gap-3"><h4 className="font-medium">{icon} {title}</h4></div>
      <select value={currentProvider} onChange={(e) => handleProviderChange(e.target.value as AIProviderType)} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm">
        {providers.map(p => <option key={p} value={p} className="bg-gray-800">{PROVIDERS[p].icon} {PROVIDERS[p].name}</option>)}
      </select>
      {authFields.map(field => (
        <div key={field.key}>
          <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
          <input type={field.type} value={(currentAuth as any)[field.key] || ''} onChange={(e) => handleAuthChange(field.key, e.target.value)} placeholder={field.label} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm" />
        </div>
      ))}
      
      {currentProvider === 'azure' ? (
        <>
          <div>
            <label className="block text-xs text-gray-400 mb-1">デプロイメント名</label>
            <input type="text" value={currentModel} onChange={(e) => handleModelChange(e.target.value)} placeholder="ご自身のデプロイメント名を入力" className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">モデル名</label>
            <select value={currentAuth.modelName || ''} onChange={(e) => handleAuthChange('modelName', e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm">
              <option value="" className="bg-gray-800">モデルを選択してください</option>
              {MODEL_OPTIONS[currentProvider]?.[taskKey]?.map(model => (
                <option key={model.value} value={model.value} className="bg-gray-800">{model.label}</option>
              ))}
            </select>
          </div>
        </>
      ) : currentProvider === 'gemini' ? (
        <div>
          <label className="block text-xs text-gray-400 mb-1">モデル名</label>
          <select value={currentAuth.modelName || ''} onChange={(e) => handleAuthChange('modelName', e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm">
            <option value="" className="bg-gray-800">モデルを選択してください</option>
            {MODEL_OPTIONS[currentProvider]?.[taskKey]?.map(model => (
              <option key={model.value} value={model.value} className="bg-gray-800">{model.label}</option>
            ))}
          </select>
        </div>
      ) : availableModels.length > 0 ? (
        <div>
          <label className="block text-xs text-gray-400 mb-1">モデル</label>
          <select value={currentModel} onChange={(e) => handleModelChange(e.target.value)} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm">
            {availableModels.map(model => <option key={model} value={model} className="bg-gray-800">{model}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  );
});

// --- 親コンポーネント ---
export const TaskBasedAIProviderSettings: React.FC<{ settings: UserSettings; onSettingsChange: (updates: Partial<UserSettings>) => void; }> = ({ settings, onSettingsChange }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-medium flex items-center gap-2"><Brain className="w-4 h-4" />タスク別プロバイダー設定</h3>
    <div className="grid gap-4">
      <TaskSetting task="text" icon={<MessageSquare size={16}/>} title="テキスト生成" settings={settings} onSettingsChange={onSettingsChange} />
      <TaskSetting task="image" icon={<Image size={16}/>} title="画像生成" settings={settings} onSettingsChange={onSettingsChange} />
      <TaskSetting task="video" icon={<Video size={16}/>} title="動画分析" settings={settings} onSettingsChange={onSettingsChange} />
    </div>
  </div>
);