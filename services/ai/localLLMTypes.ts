// =================================================================
// Local LLM Types - ローカルLLM対応の型定義拡張
// 既存のstorageService.tsを拡張してローカルLLMプロバイダーをサポート
// =================================================================

import { UserSettings as BaseUserSettings, ProviderAuthConfig as BaseProviderAuthConfig, ProviderTaskAuth } from '../storageService';

// 拡張されたプロバイダー型
export type ExtendedAIProviderType = 'azure' | 'gemini' | 'lmstudio' | 'fooocus';

// タスク別プロバイダー選択の拡張
export type TextProviderType = 'azure' | 'gemini' | 'lmstudio';
export type ImageProviderType = 'azure' | 'gemini' | 'fooocus';
export type VideoProviderType = 'azure' | 'gemini'; // ローカルLLMは動画分析未対応

// 拡張されたProviderAuthConfig
export interface ExtendedProviderAuthConfig extends BaseProviderAuthConfig {
  lmstudio?: { [task: string]: ProviderTaskAuth };
  fooocus?: { [task: string]: ProviderTaskAuth };
}

// 拡張されたUserSettings
export interface ExtendedUserSettings extends Omit<BaseUserSettings, 'aiProviderText' | 'aiProviderImage' | 'aiProviderVideo' | 'providerAuth' | 'providerModels'> {
  // ローカルLLMプロバイダーを含む選択肢
  aiProviderText?: TextProviderType;
  aiProviderImage?: ImageProviderType;
  aiProviderVideo?: VideoProviderType;
  
  // 拡張された認証設定
  providerAuth?: ExtendedProviderAuthConfig;
  
  // プロバイダー別モデル設定の拡張
  providerModels?: {
    azure?: { textGeneration?: string; imageGeneration?: string; videoAnalysis?: string; };
    gemini?: { textGeneration?: string; imageGeneration?: string; videoAnalysis?: string; };
    lmstudio?: { textGeneration?: string; };
    fooocus?: { imageGeneration?: string; };
  };
}

// ローカルLLMの接続設定
export interface LocalLLMConnectionConfig {
  lmstudio: {
    endpoint: string;
    modelDisplayName: string;
    isConnected: boolean;
    lastChecked?: Date;
  };
  fooocus: {
    endpoint: string;
    modelName: string;
    isConnected: boolean;
    lastChecked?: Date;
  };
}

// プロバイダー情報の統一インターフェース
export interface ProviderInfo {
  id: ExtendedAIProviderType;
  name: string;
  description: string;
  icon: string;
  isLocal: boolean;
  supportedTasks: Array<'text' | 'image' | 'video'>;
  authFields: Array<{
    key: keyof ProviderTaskAuth;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
}

// 拡張されたプロバイダー情報
export const EXTENDED_PROVIDER_INFO: Record<ExtendedAIProviderType, ProviderInfo> = {
  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Microsoft Azure OpenAI Service',
    icon: '🔵',
    isLocal: false,
    supportedTasks: ['text', 'image', 'video'],
    authFields: [
      { key: 'apiKey', label: 'APIキー', type: 'password', required: true },
      { key: 'endpoint', label: 'エンドポイント', type: 'url', required: true, placeholder: 'https://your-resource.openai.azure.com/' },
      { key: 'apiVersion', label: 'APIバージョン', type: 'text', required: false, placeholder: '2024-02-01' },
    ]
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini AI Platform',
    icon: '🟢',
    isLocal: false,
    supportedTasks: ['text', 'image', 'video'],
    authFields: [
      { key: 'apiKey', label: 'APIキー', type: 'password', required: true, placeholder: 'AIza...' },
    ]
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'ローカルLLM（OpenAI互換API）',
    icon: '🏠',
    isLocal: true,
    supportedTasks: ['text'],
    authFields: [
      { key: 'endpoint', label: 'エンドポイント', type: 'url', required: true, placeholder: 'http://localhost:1234' },
      { key: 'apiKey', label: 'APIキー', type: 'password', required: false, placeholder: 'オプション' },
      { key: 'modelName', label: 'モデル表示名', type: 'text', required: false, placeholder: 'Gemma 3 4B' },
    ]
  },
  fooocus: {
    id: 'fooocus',
    name: 'Fooocus',
    description: 'ローカル画像生成（Stable Diffusion）',
    icon: '🎨',
    isLocal: true,
    supportedTasks: ['image'],
    authFields: [
      { key: 'endpoint', label: 'エンドポイント', type: 'url', required: true, placeholder: 'http://localhost:7865' },
      { key: 'apiKey', label: '認証トークン', type: 'password', required: false, placeholder: 'オプション' },
      { key: 'modelName', label: 'モデル名', type: 'text', required: false, placeholder: 'Stable Diffusion XL' },
    ]
  }
};

// タスク定義の拡張
export const EXTENDED_TASK_DEFINITIONS = {
  text: { 
    providers: ['azure', 'gemini', 'lmstudio'] as const, 
    taskKey: 'textGeneration' as const 
  },
  image: { 
    providers: ['azure', 'gemini', 'fooocus'] as const, 
    taskKey: 'imageGeneration' as const 
  },
  video: { 
    providers: ['azure', 'gemini'] as const, 
    taskKey: 'videoAnalysis' as const 
  },
};

// ローカルLLMの状態管理
export interface LocalLLMStatus {
  lmstudio: {
    isRunning: boolean;
    endpoint: string;
    modelLoaded?: string;
    error?: string;
  };
  fooocus: {
    isRunning: boolean;
    endpoint: string;
    modelLoaded?: string;
    error?: string;
  };
}

// デフォルトのローカルLLM設定
export const DEFAULT_LOCAL_LLM_SETTINGS = {
  lmstudio: {
    endpoint: 'http://localhost:1234',
    modelDisplayName: 'Local LLM',
    isConnected: false,
  },
  fooocus: {
    endpoint: 'http://localhost:7865',
    modelName: 'Stable Diffusion',
    isConnected: false,
  }
};

// 設定バリデーション
export const validateExtendedProviderAuth = (
  provider: ExtendedAIProviderType, 
  task: string, 
  auth: ProviderTaskAuth
): string[] => {
  const errors: string[] = [];
  const providerInfo = EXTENDED_PROVIDER_INFO[provider];
  
  for (const field of providerInfo.authFields) {
    if (field.required && !auth[field.key]) {
      errors.push(`${field.label}は必須です`);
    }
    
    if (field.type === 'url' && auth[field.key]) {
      try {
        new URL(auth[field.key] as string);
      } catch (e) {
        errors.push(`${field.label}のURL形式が正しくありません`);
      }
    }
  }
  
  return errors;
};