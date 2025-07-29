import React, { useState } from 'react';
import { X, Key, Shield, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Info, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { AIProviderType } from '../services/ai/aiProviderInterface';

interface MultiProviderApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyUpdate: (provider: AIProviderType, apiKey: string, additionalConfig?: any) => void;
  currentSettings: {
    geminiApiKey?: string;
    azureApiKey?: string;
    azureEndpoint?: string;
    openaiApiKey?: string;
    claudeApiKey?: string;
    lmStudioEndpoint?: string;
    fooucusEndpoint?: string;
  };
}

interface ProviderConfig {
  name: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
  additionalFields?: Array<{
    key: string;
    label: string;
    placeholder: string;
    type?: string;
  }>;
  helpUrl?: string;
  helpText?: string;
}

const PROVIDER_CONFIGS: Record<AIProviderType, ProviderConfig> = {
  gemini: {
    name: 'Gemini (Google)',
    description: '多機能なAI、日本語対応が優秀',
    icon: '🟢',
    requiresApiKey: true,
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpText: 'Google AI StudioでAPIキーを取得してください'
  },
  azure: {
    name: 'Azure OpenAI (Microsoft)',
    description: 'エンタープライズグレード、高い信頼性',
    icon: '🔵',
    requiresApiKey: true,
    additionalFields: [
      { key: 'azureEndpoint', label: 'Azure Endpoint', placeholder: 'https://your-resource.openai.azure.com' }
    ],
    helpText: 'Azure OpenAIリソースのAPIキーとエンドポイントが必要です'
  },
  openai: {
    name: 'OpenAI Direct',
    description: '最新モデルに最速でアクセス可能',
    icon: '⚪',
    requiresApiKey: true,
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'OpenAI Platform でAPIキーを取得してください'
  },
  claude: {
    name: 'Claude (Anthropic)',
    description: 'コーディング・推論に特化、思考プロセス可視化',
    icon: '🟠',
    requiresApiKey: true,
    helpUrl: 'https://console.anthropic.com/',
    helpText: 'Anthropic Console でAPIキーを取得してください'
  },
  lmstudio: {
    name: 'LM Studio (Local)',
    description: 'ローカル実行、プライバシー重視',
    icon: '🏠',
    requiresApiKey: false,
    additionalFields: [
      { key: 'lmStudioEndpoint', label: 'LM Studio Endpoint', placeholder: 'http://localhost:1234', type: 'url' }
    ],
    helpText: 'LM Studioを起動し、サーバーモードでモデルを読み込んでください'
  },
  fooocus: {
    name: 'Fooocus (Local Image)',
    description: 'ローカル画像生成、Stable Diffusion',
    icon: '🎨',
    requiresApiKey: false,
    additionalFields: [
      { key: 'fooucusEndpoint', label: 'Fooocus Endpoint', placeholder: 'http://localhost:7865', type: 'url' }
    ],
    helpText: 'Fooucusを起動し、APIモードで実行してください'
  }
};

export default function MultiProviderApiKeyManager({ 
  isOpen, 
  onClose, 
  onApiKeyUpdate, 
  currentSettings 
}: MultiProviderApiKeyManagerProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: currentSettings.geminiApiKey || '',
    azure: currentSettings.azureApiKey || '',
    openai: currentSettings.openaiApiKey || '',
    claude: currentSettings.claudeApiKey || '',
  });
  const [additionalConfigs, setAdditionalConfigs] = useState<Record<string, any>>({
    azureEndpoint: currentSettings.azureEndpoint || '',
    lmStudioEndpoint: currentSettings.lmStudioEndpoint || 'http://localhost:1234',
    fooucusEndpoint: currentSettings.fooucusEndpoint || 'http://localhost:7865',
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const currentProvider = PROVIDER_CONFIGS[selectedProvider];

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleAdditionalConfigChange = (key: string, value: string) => {
    setAdditionalConfigs(prev => ({ ...prev, [key]: value }));
  };

  const toggleShowApiKey = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = () => {
    const apiKey = apiKeys[selectedProvider] || '';
    const additionalConfig: any = {};
    
    console.log('💾 Save button clicked for provider:', selectedProvider);
    console.log('💾 Current apiKeys:', apiKeys);
    console.log('💾 Selected provider API key:', apiKey);
    console.log('💾 Current additionalConfigs:', additionalConfigs);
    
    // 追加設定を収集
    if (currentProvider.additionalFields) {
      currentProvider.additionalFields.forEach(field => {
        additionalConfig[field.key] = additionalConfigs[field.key] || '';
      });
    }

    console.log('💾 Final additionalConfig:', additionalConfig);
    console.log('💾 Calling onApiKeyUpdate with:', { provider: selectedProvider, apiKey, additionalConfig });
    
    onApiKeyUpdate(selectedProvider, apiKey, additionalConfig);
    onClose();
  };

  const validateApiKey = (provider: string, key: string): boolean => {
    if (!PROVIDER_CONFIGS[provider as AIProviderType].requiresApiKey) return true;
    return key.trim().length > 0;
  };

  const getProviderStatus = (provider: AIProviderType): 'configured' | 'partial' | 'unconfigured' => {
    const config = PROVIDER_CONFIGS[provider];
    
    if (!config.requiresApiKey) {
      // ローカルプロバイダーの場合、エンドポイント設定をチェック
      const endpointKey = config.additionalFields?.[0]?.key;
      return (endpointKey && additionalConfigs[endpointKey]) ? 'configured' : 'partial';
    } else {
      const hasApiKey = apiKeys[provider]?.trim().length > 0;
      const hasAdditionalConfig = !config.additionalFields || 
        config.additionalFields.every(field => additionalConfigs[field.key]?.trim().length > 0);
      
      // APIキーが必須の場合の論理
      if (hasApiKey && hasAdditionalConfig) return 'configured';
      if (hasApiKey && !hasAdditionalConfig) return 'partial'; // APIキーあり、追加設定不完全
      return 'unconfigured'; // APIキーなしは常に未設定
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">マルチAIプロバイダー設定</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* プロバイダー選択サイドバー */}
          <div className="w-1/3 border-r bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-4">AIプロバイダー</h3>
            <div className="space-y-2">
              {Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => {
                const status = getProviderStatus(provider as AIProviderType);
                return (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider as AIProviderType)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedProvider === provider
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white hover:bg-blue-50'
                    } border`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <div className="font-medium text-sm text-gray-700">{config.name}</div>
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {status === 'configured' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {status === 'partial' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {status === 'unconfigured' && <X className="h-4 w-4 text-red-500" />}
                        {!config.requiresApiKey && (
                          <Wifi className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ステータス説明 */}
            <div className="mt-6 text-xs text-gray-600">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>設定完了</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span>一部設定済み</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <X className="h-3 w-3 text-red-500" />
                <span>未設定</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="h-3 w-3 text-blue-500" />
                <span>ローカル実行</span>
              </div>
            </div>
          </div>

          {/* 設定詳細エリア */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* プロバイダー情報 */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{currentProvider.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-600">{currentProvider.name}</h3>
                  <p className="text-sm text-gray-600">{currentProvider.description}</p>
                </div>
              </div>
            </div>

            {/* セキュリティ通知 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">セキュリティについて</p>
                  <p>入力されたAPIキーはサーバーに送信されず、ブラウザ内でのみ使用されます。</p>
                </div>
              </div>
            </div>

            {/* APIキー入力 (必要な場合のみ) */}
            {currentProvider.requiresApiKey && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APIキー
                </label>
                <div className="relative">
                  <input
                    type={showApiKeys[selectedProvider] ? 'text' : 'password'}
                    value={apiKeys[selectedProvider] || ''}
                    onChange={(e) => handleApiKeyChange(selectedProvider, e.target.value)}
                    placeholder="APIキーを入力してください"
                    className={`w-full pr-10 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      apiKeys[selectedProvider] && !validateApiKey(selectedProvider, apiKeys[selectedProvider])
                        ? 'border-red-300 bg-red-50 text-gray-700 ' 
                        : apiKeys[selectedProvider] && validateApiKey(selectedProvider, apiKeys[selectedProvider])
                        ? 'border-green-300 bg-green-50 text-gray-700 ' 
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowApiKey(selectedProvider)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys[selectedProvider] ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 追加設定フィールド */}
            {currentProvider.additionalFields && (
              <div className="space-y-4 mb-6">
                {currentProvider.additionalFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={additionalConfigs[field.key] || ''}
                      onChange={(e) => handleAdditionalConfigChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ヘルプ情報 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">設定方法</span>
                </div>
                {currentProvider.helpUrl && (
                  <a
                    href={currentProvider.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    公式サイト →
                  </a>
                )}
              </div>
              {currentProvider.helpText && (
                <p className="text-sm text-slate-700 mt-2">{currentProvider.helpText}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <button
            onClick={() => {
              console.log('🧹 Clear button clicked for provider:', selectedProvider);
              console.log('🧹 Current apiKeys before clear:', apiKeys);
              console.log('🧹 Current additionalConfigs before clear:', additionalConfigs);
              
              // ローカル状態をクリア
              setApiKeys(prev => ({ ...prev, [selectedProvider]: '' }));
              if (currentProvider.additionalFields) {
                const resetConfig = { ...additionalConfigs };
                currentProvider.additionalFields.forEach(field => {
                  resetConfig[field.key] = '';
                });
                setAdditionalConfigs(resetConfig);
              }
              
              // 即座にlocalStorageにも反映（空文字で保存）
              const additionalConfig: any = {};
              if (currentProvider.additionalFields) {
                currentProvider.additionalFields.forEach(field => {
                  additionalConfig[field.key] = '';
                });
              }
              
              console.log('🧹 Calling onApiKeyUpdate with:', { provider: selectedProvider, apiKey: '', additionalConfig });
              onApiKeyUpdate(selectedProvider, '', additionalConfig);
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            クリア
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}