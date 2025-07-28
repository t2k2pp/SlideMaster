// タスク別AIプロバイダー設定コンポーネント
import React from 'react';
import { UserSettings } from '../services/storageService';
import { MessageSquare, Image, Video, Brain, Lightbulb, Zap } from 'lucide-react';
import { getAvailableModels, TaskType } from '../services/ai/modelRegistry';
import { AIProviderType } from '../services/ai/aiProviderInterface';

interface TaskBasedAIProviderSettingsProps {
  settings: UserSettings;
  onSettingChange: (key: keyof UserSettings, value: any) => void;
}

// プロバイダー情報
const PROVIDERS = {
  gemini: { name: 'Gemini', icon: '🟢', description: '多機能・日本語対応優秀' },
  azure: { name: 'Azure OpenAI', icon: '🔵', description: 'エンタープライズ・高信頼性' },
  openai: { name: 'OpenAI', icon: '⚪', description: '最新モデル・最速アクセス' },
  claude: { name: 'Claude', icon: '🟠', description: 'コーディング・推論特化' },
  lmstudio: { name: 'LM Studio', icon: '🏠', description: 'ローカル実行・プライバシー' },
  fooocus: { name: 'Fooocus', icon: '🎨', description: 'ローカル画像生成' },
};

// タスク別利用可能プロバイダー（型キャスト）
const TASK_PROVIDERS = {
  text: ['gemini', 'azure', 'openai', 'claude', 'lmstudio'] as const,
  image: ['gemini', 'azure', 'openai', 'fooocus'] as const,
  video: ['gemini', 'azure', 'openai', 'claude', 'lmstudio'] as const,
};

// 実際のモデルレジストリからモデルを取得する関数
const getModelsForProvider = (provider: string, task: 'text' | 'image' | 'video') => {
  try {
    console.log(`Fetching models for provider: ${provider}, task: ${task}`);
    const models = getAvailableModels(provider as AIProviderType, task as TaskType);
    console.log(`Raw models from registry:`, models);
    const modelIds = models.map(model => model.id);
    console.log(`Model IDs:`, modelIds);
    return modelIds;
  } catch (error) {
    console.error('Failed to get models for provider', provider, task, error);
    // フォールバック用の基本モデル
    const fallbackModels = {
      gemini: {
        text: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
        image: ['imagen-4', 'imagen-3', 'gemini-2.0-flash-exp'],
        video: ['gemini-2.5-pro', 'gemini-2.5-flash'],
      },
      azure: {
        text: ['gpt-4.1', 'gpt-4o', 'o3-mini'],
        image: ['gpt-image-1', 'dall-e-3'],
        video: ['gpt-4o', 'gpt-4-turbo'],
      },
      openai: {
        text: ['gpt-4.1', 'gpt-4o', 'o3-mini', 'gpt-4o-mini'],
        image: ['gpt-image-1', 'dall-e-3'],
        video: ['gpt-4o', 'gpt-4-vision-preview'],
      },
      claude: {
        text: ['claude-3.7-sonnet', 'claude-3.5-sonnet', 'claude-3.5-haiku'],
        image: [],
        video: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
      },
      lmstudio: {
        text: ['deepseek-r1-0528', 'phi-4-mini-reasoning', 'gemma-3-4b', 'qwen3-8b', 'llama-3.3-8b', 'ministral-8b', 'custom-model'],
        image: [],
        video: ['llama-3.3-vision', 'qwen3-vision-8b', 'llava-next-8b'],
      },
      fooocus: {
        text: [],
        image: ['juggernaut-xl', 'realistic-vision-xl', 'anime-xl', 'flux-dev'],
        video: [],
      },
    };
    
    return fallbackModels[provider]?.[task] || [];
  }
};

// おすすめ設定
const RECOMMENDED_COMBINATIONS = [
  {
    name: '🎯 バランス重視',
    description: '品質・速度・コストのバランス',
    settings: { text: 'gemini', image: 'gemini', video: 'gemini' }
  },
  {
    name: '🏆 最高品質',
    description: '最高の性能を追求',
    settings: { text: 'claude', image: 'openai', video: 'gemini' }
  },
  {
    name: '🏠 プライバシー重視',
    description: 'ローカル実行でプライバシー保護',
    settings: { text: 'lmstudio', image: 'fooocus', video: 'lmstudio' }
  },
  {
    name: '⚡ 高速処理',
    description: '処理速度を最優先',
    settings: { text: 'openai', image: 'azure', video: 'azure' }
  },
  {
    name: '🏢 エンタープライズ',
    description: '企業利用に最適',
    settings: { text: 'azure', image: 'azure', video: 'azure' }
  },
];

export const TaskBasedAIProviderSettings: React.FC<TaskBasedAIProviderSettingsProps> = ({ 
  settings, 
  onSettingChange 
}) => {
  // ローカル状態でプロバイダー設定を管理
  const [localProviders, setLocalProviders] = React.useState({
    text: settings.aiProviderText || settings.aiProvider || 'gemini',
    image: settings.aiProviderImage || settings.aiProvider || 'gemini', 
    video: settings.aiProviderVideo || settings.aiProvider || 'gemini',
  });

  // 親の設定が変更された時にローカル状態を同期
  React.useEffect(() => {
    setLocalProviders({
      text: settings.aiProviderText || settings.aiProvider || 'gemini',
      image: settings.aiProviderImage || settings.aiProvider || 'gemini', 
      video: settings.aiProviderVideo || settings.aiProvider || 'gemini',
    });
  }, [settings.aiProviderText, settings.aiProviderImage, settings.aiProviderVideo, settings.aiProvider]);

  const currentSettings = localProviders;
  
  console.log(`🔍 Current settings calculated:`, currentSettings);
  console.log(`📋 Raw settings:`, {
    aiProviderText: settings.aiProviderText,
    aiProviderImage: settings.aiProviderImage,
    aiProviderVideo: settings.aiProviderVideo,
    aiProvider: settings.aiProvider
  });

  const handleProviderChange = (task: 'text' | 'image' | 'video', provider: string) => {
    console.log(`🔄 Provider change requested: ${task} -> ${provider}`);
    const settingKey = `aiProvider${task.charAt(0).toUpperCase() + task.slice(1)}` as keyof UserSettings;
    console.log(`📝 Setting key: ${settingKey}`);
    console.log(`📊 Current settings before change:`, { 
      aiProviderText: settings.aiProviderText,
      aiProviderImage: settings.aiProviderImage,
      aiProviderVideo: settings.aiProviderVideo,
      aiProvider: settings.aiProvider
    });
    
    // ローカル状態を即座に更新
    setLocalProviders(prev => ({
      ...prev,
      [task]: provider
    }));
    
    // 親の状態も更新
    onSettingChange(settingKey, provider);
    
    // モデルもデフォルトに変更
    const taskModelKey = `${task}Generation` as keyof NonNullable<UserSettings['aiModels']>;
    const availableModels = getModelsForProvider(provider, task);
    const defaultModel = availableModels[0];
    console.log(`🎯 Setting default model for ${task}: ${defaultModel}`);
    if (defaultModel) {
      onSettingChange('aiModels', {
        ...(settings.aiModels || {}),
        [taskModelKey]: defaultModel
      });
    }
  };

  const handleModelChange = (task: 'text' | 'image' | 'video', model: string) => {
    const taskModelKey = `${task}Generation` as keyof NonNullable<UserSettings['aiModels']>;
    onSettingChange('aiModels', {
      ...(settings.aiModels || {}),
      [taskModelKey]: model
    });
  };

  const applyRecommendation = (recommendation: typeof RECOMMENDED_COMBINATIONS[0]) => {
    onSettingChange('aiProviderText', recommendation.settings.text);
    onSettingChange('aiProviderImage', recommendation.settings.image);
    onSettingChange('aiProviderVideo', recommendation.settings.video);
    
    // モデルもデフォルトに設定
    const newAiModels = { ...(settings.aiModels || {}) };
    Object.entries(recommendation.settings).forEach(([task, provider]) => {
      const taskModelKey = `${task}Generation` as keyof NonNullable<UserSettings['aiModels']>;
      const availableModels = getModelsForProvider(provider, task as 'text' | 'image' | 'video');
      const defaultModel = availableModels[0];
      if (defaultModel) {
        newAiModels[taskModelKey] = defaultModel;
      }
    });
    onSettingChange('aiModels', newAiModels);
  };

  const TaskSetting = ({ 
    task, 
    icon, 
    title, 
    description 
  }: { 
    task: 'text' | 'image' | 'video';
    icon: React.ReactNode;
    title: string;
    description: string;
  }) => {
    // 現在のプロバイダーを取得（リアクティブ）
    const currentProvider = currentSettings[task];
    const availableProviders = TASK_PROVIDERS[task];
    
    console.log(`🎯 TaskSetting ${task}: currentProvider = ${currentProvider}`);
    console.log(`🎯 TaskSetting ${task}: localProviders = ${JSON.stringify(localProviders)}`);
    console.log(`🎯 TaskSetting ${task}: settings from parent = ${JSON.stringify({
      text: settings.aiProviderText,
      image: settings.aiProviderImage, 
      video: settings.aiProviderVideo
    })}`);
    
    // プロバイダーが変更されるたびにモデルリストを再計算
    const availableModels = React.useMemo(() => {
      console.log(`Getting models for ${task} provider: ${currentProvider}`);
      const models = getModelsForProvider(currentProvider, task);
      console.log(`Available models for ${currentProvider}:`, models);
      return models;
    }, [currentProvider, task]);
    
    // 現在のモデルが利用可能かチェック
    const storedModel = settings.aiModels?.[`${task}Generation` as keyof NonNullable<UserSettings['aiModels']>];
    const currentModel = React.useMemo(() => {
      if (storedModel && availableModels.includes(storedModel)) {
        return storedModel;
      }
      // 現在のモデルが利用できない場合、デフォルトに切り替え
      const defaultModel = availableModels[0];
      if (defaultModel && storedModel !== defaultModel) {
        console.log(`Switching model for ${task} from ${storedModel} to ${defaultModel}`);
        // 自動的にデフォルトモデルに更新
        setTimeout(() => handleModelChange(task, defaultModel), 0);
      }
      return defaultModel || '';
    }, [storedModel, availableModels, task]);
    
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        
        {/* プロバイダー選択 */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-300 mb-2">プロバイダー</label>
          <select
            key={`${task}-provider-${currentProvider}`}
            value={currentProvider}
            onChange={(e) => {
              console.log(`🔄 Select onChange for ${task}: ${currentProvider} -> ${e.target.value}`);
              handleProviderChange(task, e.target.value);
            }}
            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {availableProviders.map(provider => (
              <option key={provider} value={provider} className="bg-gray-800 text-white">
                {PROVIDERS[provider as keyof typeof PROVIDERS]?.icon} {PROVIDERS[provider as keyof typeof PROVIDERS]?.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {PROVIDERS[currentProvider as keyof typeof PROVIDERS]?.description}
          </p>
        </div>

        {/* モデル選択 */}
        {availableModels.length > 0 ? (
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">モデル</label>
            <select
              value={currentModel || ''}
              onChange={(e) => handleModelChange(task, e.target.value)}
              className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {availableModels.map(model => (
                <option key={model} value={model} className="bg-gray-800">
                  {model}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            このプロバイダーは{title}に対応していません
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* おすすめ設定 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          おすすめ設定
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {RECOMMENDED_COMBINATIONS.map((rec, index) => (
            <button
              key={index}
              onClick={() => applyRecommendation(rec)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors"
            >
              <div className="font-medium text-sm">{rec.name}</div>
              <div className="text-xs text-gray-400 mt-1">{rec.description}</div>
              <div className="flex gap-1 mt-2 text-xs">
                <span>{PROVIDERS[rec.settings.text as keyof typeof PROVIDERS]?.icon}</span>
                <span>{PROVIDERS[rec.settings.image as keyof typeof PROVIDERS]?.icon}</span>
                <span>{PROVIDERS[rec.settings.video as keyof typeof PROVIDERS]?.icon}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* タスク別設定 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4" />
          タスク別プロバイダー設定
        </h3>
        
        <div className="grid gap-4">
          <TaskSetting
            task="text"
            icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
            title="テキスト生成"
            description="スライド作成、文章生成、コード生成"
          />
          
          <TaskSetting
            task="image"
            icon={<Image className="w-5 h-5 text-green-400" />}
            title="画像生成"
            description="イラスト、図表、アイコン生成"
          />
          
          <TaskSetting
            task="video"
            icon={<Video className="w-5 h-5 text-purple-400" />}
            title="動画分析"
            description="動画解析、フレーム抽出、内容理解"
          />
        </div>
      </div>

      {/* 現在の設定表示 */}
      <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">現在の設定</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-blue-400 mb-1">テキスト</div>
            <div className="text-xs">
              {PROVIDERS[currentSettings.text as keyof typeof PROVIDERS]?.icon} {PROVIDERS[currentSettings.text as keyof typeof PROVIDERS]?.name}
            </div>
          </div>
          <div className="text-center">
            <div className="text-green-400 mb-1">画像</div>
            <div className="text-xs">
              {PROVIDERS[currentSettings.image as keyof typeof PROVIDERS]?.icon} {PROVIDERS[currentSettings.image as keyof typeof PROVIDERS]?.name}
            </div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 mb-1">動画</div>
            <div className="text-xs">
              {PROVIDERS[currentSettings.video as keyof typeof PROVIDERS]?.icon} {PROVIDERS[currentSettings.video as keyof typeof PROVIDERS]?.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};