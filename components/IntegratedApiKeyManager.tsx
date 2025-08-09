import React, { useState, useEffect } from 'react';
import { Key, Shield, Eye, EyeOff, Info, AlertCircle, CheckCircle, Wifi, ExternalLink } from 'lucide-react';
import { AIProviderType } from '../services/ai/aiProviderInterface';

interface IntegratedApiKeyManagerProps {
  onSettingChange: (key: string, value: any) => void;
}

// 用途別AI認証設定インターフェース（新しい変数名でコンパイルエラーによる修正漏れを防ぐ）
interface TaskAuthConfig {
  authToken: string;        // 旧: apiKey
  serviceUrl?: string;      // 旧: endpoint  
  deploymentId?: string;    // 旧: modelName
  orgIdentifier?: string;   // 旧: organization (OpenAI用)
  apiVersion?: string;      // Azure OpenAI APIバージョン
}

interface MultiTaskAIConfig {
  // 用途別設定（テキスト生成、画像生成、動画解析）
  geminiAI: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
  azureOpenAI: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
  openaiDirect: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
  claudeAI: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
  localLMStudio: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
  localFooocus: {
    textGeneration: TaskAuthConfig;
    imageGeneration: TaskAuthConfig;
    videoAnalysis: TaskAuthConfig;
  };
}

// AI利用タイプの定義（新しい名前でコンパイルエラーによる修正漏れを防ぐ）
type AIUsageType = 'textGeneration' | 'imageGeneration' | 'videoAnalysis';

interface AIProviderSpec {
  displayName: string;         // 旧: name
  description: string;
  iconEmoji: string;          // 旧: icon
  requiresAuth: boolean;      // 旧: requiresApiKey
  supportedUsages: AIUsageType[];  // 旧: supportedTasks
  configFields: Array<{
    fieldKey: string;         // 旧: key
    displayLabel: string;     // 旧: label
    inputPlaceholder: string; // 旧: placeholder
    inputType?: string;       // 旧: type
    isSecretField?: boolean;  // 旧: isSecret
    usageTypes?: AIUsageType[]; // 旧: tasks
  }>;
  documentationUrl?: string;  // 旧: helpUrl
  setupInstructions?: string; // 旧: helpText
}

const AI_PROVIDER_SPECIFICATIONS: Record<AIProviderType, AIProviderSpec> = {
  gemini: {
    displayName: 'Gemini (Google)',
    description: '多機能なAI、日本語対応が優秀',
    iconEmoji: '🟢',
    requiresAuth: true,
    supportedUsages: ['textGeneration', 'imageGeneration', 'videoAnalysis'],
    configFields: [
      { fieldKey: 'authToken', displayLabel: 'APIキー', inputPlaceholder: 'Gemini APIキーを入力', isSecretField: true, usageTypes: ['textGeneration', 'imageGeneration', 'videoAnalysis'] }
    ],
    documentationUrl: 'https://aistudio.google.com/app/apikey',
    setupInstructions: 'Google AI StudioでAPIキーを取得してください（テキスト・画像・動画で共通）'
  },
  azure: {
    displayName: 'Azure OpenAI (Microsoft)',
    description: 'エンタープライズグレード、高い信頼性',
    iconEmoji: '🔵',
    requiresAuth: true,
    supportedUsages: ['textGeneration', 'imageGeneration'],
    configFields: [
      { fieldKey: 'authToken', displayLabel: 'APIキー', inputPlaceholder: 'Azure APIキーを入力', isSecretField: true, usageTypes: ['textGeneration', 'imageGeneration'] },
      { fieldKey: 'serviceUrl', displayLabel: 'エンドポイント', inputPlaceholder: 'https://your-resource.openai.azure.com', usageTypes: ['textGeneration', 'imageGeneration'] },
      { fieldKey: 'deploymentId', displayLabel: 'デプロイメント名', inputPlaceholder: 'gpt-4o, dall-e-3 など', usageTypes: ['textGeneration', 'imageGeneration'] },
      { fieldKey: 'apiVersion', displayLabel: 'APIバージョン', inputPlaceholder: '2024-02-01 (省略可)', usageTypes: ['textGeneration', 'imageGeneration'] }
    ],
    setupInstructions: 'Azure OpenAIリソースの設定。テキストと画像で異なるリソースを使用する場合は別々に設定してください'
  },
  openai: {
    displayName: 'OpenAI Direct',
    description: '最新モデルに最速でアクセス可能',
    iconEmoji: '⚪',
    requiresAuth: true,
    supportedUsages: ['textGeneration', 'imageGeneration'],
    configFields: [
      { fieldKey: 'authToken', displayLabel: 'APIキー', inputPlaceholder: 'OpenAI APIキーを入力', isSecretField: true, usageTypes: ['textGeneration', 'imageGeneration'] },
      { fieldKey: 'orgIdentifier', displayLabel: 'Organization ID', inputPlaceholder: 'org-xxxxxxxx（任意）', usageTypes: ['textGeneration', 'imageGeneration'] }
    ],
    documentationUrl: 'https://platform.openai.com/api-keys',
    setupInstructions: 'OpenAI Platform でAPIキーを取得してください（テキストと画像で共通）'
  },
  claude: {
    displayName: 'Claude (Anthropic)',
    description: 'コーディング・推論に特化、思考プロセス可視化',
    iconEmoji: '🟠',
    requiresAuth: true,
    supportedUsages: ['textGeneration'],
    configFields: [
      { fieldKey: 'authToken', displayLabel: 'APIキー', inputPlaceholder: 'Claude APIキーを入力', isSecretField: true, usageTypes: ['textGeneration'] }
    ],
    documentationUrl: 'https://console.anthropic.com/',
    setupInstructions: 'Anthropic Console でAPIキーを取得してください（テキスト生成のみ対応）'
  },
  lmstudio: {
    displayName: 'LM Studio (Local)',
    description: 'ローカル実行、プライバシー重視',
    iconEmoji: '🏠',
    requiresAuth: false,
    supportedUsages: ['textGeneration', 'videoAnalysis'],
    configFields: [
      { fieldKey: 'serviceUrl', displayLabel: 'エンドポイント', inputPlaceholder: 'http://localhost:1234', inputType: 'url', usageTypes: ['textGeneration', 'videoAnalysis'] }
    ],
    setupInstructions: 'LM Studioを起動し、サーバーモードでモデルを読み込んでください'
  },
  fooocus: {
    displayName: 'Fooocus (Local Image)',
    description: 'ローカル画像生成、Stable Diffusion',
    iconEmoji: '🎨',
    requiresAuth: false,
    supportedUsages: ['imageGeneration'],
    configFields: [
      { fieldKey: 'serviceUrl', displayLabel: 'エンドポイント', inputPlaceholder: 'http://localhost:7865', inputType: 'url', usageTypes: ['imageGeneration'] }
    ],
    setupInstructions: 'Fooucusを起動し、APIモードで実行してください（画像生成専用）'
  }
};

const AI_CONFIG_STORAGE_KEY = 'slidemaster_multitask_ai_config'; // 新しいキー名でコンパイルエラーによる修正漏れを防ぐ

export const IntegratedApiKeyManager: React.FC<IntegratedApiKeyManagerProps> = ({ 
  onSettingChange 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('gemini');
  const [selectedTask, setSelectedTask] = useState<AIUsageType>('textGeneration');
  const [settings, setSettings] = useState<MultiTaskAIConfig>(() => {
    // ローカルストレージから直接読み込み
    const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 新しい形式かチェック
        if (parsed.geminiAI && typeof parsed.geminiAI === 'object' && parsed.geminiAI.textGeneration) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse API settings:', e);
      }
    }
    
    // デフォルト設定または旧形式からの移行
    const legacyKey = localStorage.getItem('slidemaster_user_api_key') || '';
    return {
      geminiAI: {
        textGeneration: { authToken: legacyKey },
        imageGeneration: { authToken: legacyKey },
        videoAnalysis: { authToken: legacyKey }
      },
      azureOpenAI: {
        textGeneration: { authToken: '', serviceUrl: '', deploymentId: '', apiVersion: '' },
        imageGeneration: { authToken: '', serviceUrl: '', deploymentId: '', apiVersion: '' },
        videoAnalysis: { authToken: '', serviceUrl: '', deploymentId: '', apiVersion: '' }
      },
      openaiDirect: {
        textGeneration: { authToken: '', orgIdentifier: '' },
        imageGeneration: { authToken: '', orgIdentifier: '' },
        videoAnalysis: { authToken: '', orgIdentifier: '' }
      },
      claudeAI: {
        textGeneration: { authToken: '' },
        imageGeneration: { authToken: '' },
        videoAnalysis: { authToken: '' }
      },
      localLMStudio: {
        textGeneration: { serviceUrl: 'http://localhost:1234' },
        imageGeneration: { serviceUrl: 'http://localhost:1234' },
        videoAnalysis: { serviceUrl: 'http://localhost:1234' }
      },
      localFooocus: {
        textGeneration: { serviceUrl: 'http://localhost:7865' },
        imageGeneration: { serviceUrl: 'http://localhost:7865' },
        videoAnalysis: { serviceUrl: 'http://localhost:7865' }
      }
    };
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // プロバイダータイプから設定キーを取得するヘルパー関数
  const getProviderConfigKey = (provider: AIProviderType): keyof MultiTaskAIConfig => {
    const keyMap: Record<AIProviderType, keyof MultiTaskAIConfig> = {
      gemini: 'geminiAI',
      azure: 'azureOpenAI',
      openai: 'openaiDirect',
      claude: 'claudeAI',
      lmstudio: 'localLMStudio',
      fooocus: 'localFooocus'
    };
    return keyMap[provider];
  };

  // 設定変更時にローカルストレージに即座に保存
  const handleFieldChange = (fieldKey: string, value: string) => {
    const providerKey = getProviderConfigKey(selectedProvider);
    const newSettings = { ...settings };
    
    // 深い更新を行う
    newSettings[providerKey] = {
      ...newSettings[providerKey],
      [selectedTask]: {
        ...newSettings[providerKey][selectedTask],
        [fieldKey]: value
      }
    };
    
    setSettings(newSettings);
    
    // ローカルストレージに即座に保存（空の値でも保存）
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(newSettings));
    
    // Geminiの場合は従来のキーにも保存（後で削除予定）
    if (selectedProvider === 'gemini' && fieldKey === 'authToken') {
      if (value.trim() === '') {
        localStorage.removeItem('slidemaster_user_api_key');
      } else {
        localStorage.setItem('slidemaster_user_api_key', value);
      }
    }
    
    // 親コンポーネントにも設定変更を通知
    onSettingChange(`${providerKey}.${selectedTask}.${fieldKey}`, value);
  };

  const toggleShowSecret = (fieldKey: string) => {
    setShowSecrets(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const getProviderStatus = (provider: AIProviderType): 'configured' | 'partial' | 'unconfigured' => {
    const providerSpec = AI_PROVIDER_SPECIFICATIONS[provider];
    const providerKey = getProviderConfigKey(provider);
    const taskConfig = settings[providerKey][selectedTask];
    
    const requiredFields = providerSpec.configFields.filter(field => 
      field.isSecretField || providerSpec.requiresAuth
    );
    const optionalFields = providerSpec.configFields.filter(field => 
      !field.isSecretField && !providerSpec.requiresAuth
    );
    
    const hasRequiredFields = requiredFields.every(field => 
      taskConfig[field.fieldKey as keyof TaskAuthConfig]?.toString().trim()
    );
    const hasOptionalFields = optionalFields.every(field => 
      taskConfig[field.fieldKey as keyof TaskAuthConfig]?.toString().trim()
    );
    
    if (!providerSpec.requiresAuth) {
      return hasOptionalFields ? 'configured' : 'unconfigured';
    }
    
    if (hasRequiredFields && hasOptionalFields) return 'configured';
    if (hasRequiredFields) return 'partial';
    return 'unconfigured';
  };

  const clearProvider = (provider: AIProviderType) => {
    const providerSpec = AI_PROVIDER_SPECIFICATIONS[provider];
    const providerKey = getProviderConfigKey(provider);
    const newSettings = { ...settings };
    
    // 選択されたタスクの設定をクリア
    const clearedTaskConfig: TaskAuthConfig = {};
    providerSpec.configFields.forEach(field => {
      clearedTaskConfig[field.fieldKey as keyof TaskAuthConfig] = '';
    });
    
    newSettings[providerKey] = {
      ...newSettings[providerKey],
      [selectedTask]: clearedTaskConfig
    };
    
    setSettings(newSettings);
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(newSettings));
    
    // Geminiの場合は従来のキーもクリア
    if (provider === 'gemini') {
      localStorage.removeItem('slidemaster_user_api_key');
    }
  };

  const currentProviderSpec = AI_PROVIDER_SPECIFICATIONS[selectedProvider];

  return (
    <div className="bg-white/5 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">APIキー設定</h3>
        <div className="bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-300">ローカル保存</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* プロバイダー選択 */}
        <div className="lg:col-span-1">
          <h4 className="text-sm font-medium mb-3 text-gray-300">AIプロバイダー</h4>
          <div className="space-y-2">
            {Object.entries(AI_PROVIDER_SPECIFICATIONS).map(([provider, providerSpec]) => {
              const status = getProviderStatus(provider as AIProviderType);
              return (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider as AIProviderType)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedProvider === provider
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{providerSpec.iconEmoji}</span>
                      <div>
                        <div className="font-medium text-xs text-gray-200">{providerSpec.displayName}</div>
                        <div className="text-xs text-gray-400">{providerSpec.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {status === 'configured' && <CheckCircle className="h-3 w-3 text-green-400" />}
                      {status === 'partial' && <AlertCircle className="h-3 w-3 text-yellow-400" />}
                      {status === 'unconfigured' && <div className="h-3 w-3 rounded-full bg-gray-600" />}
                      {!providerSpec.requiresAuth && (
                        <Wifi className="h-3 w-3 text-blue-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ステータス説明 */}
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span>設定完了</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-3 w-3 text-yellow-400" />
              <span>一部設定済み</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-gray-600" />
              <span>未設定</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-3 w-3 text-blue-400" />
              <span>ローカル実行</span>
            </div>
          </div>
        </div>

        {/* 設定フィールド */}
        <div className="lg:col-span-2">
          {/* タスク選択タブ */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 text-gray-300">利用用途</h4>
            <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
              {currentProviderSpec.supportedUsages.map((usage) => (
                <button
                  key={usage}
                  onClick={() => setSelectedTask(usage)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    selectedTask === usage
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {usage === 'textGeneration' && 'テキスト生成'}
                  {usage === 'imageGeneration' && '画像生成'}
                  {usage === 'videoAnalysis' && '動画解析'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <span className="text-xl">{currentProviderSpec.iconEmoji}</span>
            <div>
              <h4 className="font-semibold text-gray-200">{currentProviderSpec.displayName}</h4>
              <p className="text-sm text-gray-400">{currentProviderSpec.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {currentProviderSpec.configFields
              .filter(field => !field.usageTypes || field.usageTypes.includes(selectedTask))
              .map((field) => {
                const providerKey = getProviderConfigKey(selectedProvider);
                const currentValue = settings[providerKey][selectedTask][field.fieldKey as keyof TaskAuthConfig] || '';
                
                return (
                  <div key={field.fieldKey}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {field.displayLabel}
                      {field.isSecretField && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.isSecretField && !showSecrets[field.fieldKey] ? 'password' : field.inputType || 'text'}
                        value={currentValue}
                        onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                        placeholder={field.inputPlaceholder}
                        className="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {field.isSecretField && (
                        <button
                          type="button"
                          onClick={() => toggleShowSecret(field.fieldKey)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                        >
                          {showSecrets[field.fieldKey] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* ヘルプ情報 */}
          <div className="mt-6 bg-slate-500/10 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200">設定方法</span>
              </div>
              <div className="flex space-x-3">
                {currentProviderSpec.documentationUrl && (
                  <a
                    href={currentProviderSpec.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                  >
                    公式サイト
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => clearProvider(selectedProvider)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  クリア
                </button>
              </div>
            </div>
            {currentProviderSpec.setupInstructions && (
              <p className="text-sm text-gray-300">{currentProviderSpec.setupInstructions}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};