// =================================================================
// AI Provider Factory - プロバイダー選択・生成・最適化システム
// 2025年対応マルチプロバイダー統合システム
// =================================================================

import { 
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  AIProviderError,
  AIProviderConfigError,
  AIProviderConnectionError,
  getProviderCapabilities,
  isProviderCapable,
  validateAIProviderConfig
} from './aiProviderInterface';

import { 
  getRecommendedModel,
  getRecommendedModelForUseCase,
  TaskType,
  Priority,
  ModelInfo,
  findModel
} from './modelRegistry';

// ユーザー設定インポート（既存のstorageServiceから）
import { getUserSettings, UserSettings } from '../storageService';

// プロバイダー実装のインポート
import { GeminiProvider } from './geminiProvider';
import { AzureOpenAIProvider } from './azureProvider';
import { OpenAIProvider } from './openaiProvider';
import { ClaudeProvider } from './claudeProvider';
import { LMStudioProvider } from './lmStudioProvider';
import { FooucusProvider } from './fooucusProvider';

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();
  private static configCache: Map<AIProviderType, AIProviderConfig> = new Map();
  private static performanceMetrics: Map<AIProviderType, ProviderMetrics> = new Map();

  // プロバイダー作成
  static async createProvider(config: AIProviderConfig): Promise<AIProvider> {
    const key = this.getProviderKey(config);
    
    // キャッシュから取得
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    // 設定検証
    const errors = validateAIProviderConfig(config);
    if (errors.length > 0) {
      throw new AIProviderConfigError(
        `Invalid configuration: ${errors.join(', ')}`,
        config.name
      );
    }

    let provider: AIProvider;

    try {
      // プロバイダー実装
      switch (config.name) {
        case 'gemini':
          provider = new GeminiProvider(config);
          break;
        
        case 'azure':
          provider = new AzureOpenAIProvider(config);
          break;
        
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        
        case 'claude':
          provider = new ClaudeProvider(config);
          break;
        
        case 'lmstudio':
          provider = new LMStudioProvider(config);
          break;
        
        case 'fooocus':
          provider = new FooucusProvider(config);
          break;
        
        default:
          throw new AIProviderConfigError(
            `Unsupported AI provider: ${config.name}`,
            config.name
          );
      }
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new AIProviderConnectionError(
        `Failed to create provider ${config.name}: ${error.message}`,
        config.name,
        error as Error
      );
    }

    // 設定検証
    const isValid = await provider.validateConfig(config);
    if (!isValid) {
      throw new AIProviderConnectionError(
        `Provider validation failed for ${config.name}`,
        config.name
      );
    }

    // キャッシュに保存
    this.providers.set(key, provider);
    this.configCache.set(config.name, config);
    
    // パフォーマンス測定開始
    this.initializeMetrics(config.name);

    return provider;
  }

  // 現在の設定に基づいてプロバイダー取得（レガシー）
  static async getCurrentProvider(): Promise<AIProvider> {
    const settings = getUserSettings();
    const config = this.buildConfigFromSettings(settings);
    
    return await this.createProvider(config);
  }

  // タスク別プロバイダー取得
  static async getProviderForTask(task: 'text' | 'image' | 'video'): Promise<AIProvider> {
    const settings = getUserSettings();
    let providerType: AIProviderType;

    // タスク別プロバイダー設定から取得
    switch (task) {
      case 'text':
        providerType = settings.aiProviderText || settings.aiProvider || 'gemini';
        break;
      case 'image':
        providerType = settings.aiProviderImage || settings.aiProvider || 'gemini';
        break;
      case 'video':
        providerType = settings.aiProviderVideo || settings.aiProvider || 'gemini';
        break;
      default:
        providerType = settings.aiProvider || 'gemini';
    }

    const config = this.getProviderConfig(providerType, settings);
    return await this.createProvider(config);
  }

  // 最適なプロバイダー自動選択
  static async getBestProvider(
    task: TaskType,
    priority: Priority = 'quality',
    userPreferences?: Partial<AIProviderConfig>[]
  ): Promise<{ provider: AIProvider; model: ModelInfo; estimatedCost: number }> {
    const settings = getUserSettings();
    const availableProviders = userPreferences || this.getConfiguredProviders(settings);
    
    const candidates = await Promise.all(
      availableProviders
        .filter(config => config.name && isProviderCapable(config.name, this.getCapabilityKey(task)))
        .map(async (config) => {
          try {
            const fullConfig = this.buildFullConfig(config as AIProviderConfig, settings);
            const provider = await this.createProvider(fullConfig);
            const model = getRecommendedModel(fullConfig.name, task, priority);
            
            if (!model) {
              return null;
            }

            const estimatedCost = await provider.estimateCost({ task, model: model.id });
            const score = this.calculateScore(model, priority, estimatedCost, fullConfig.name);
            
            return {
              provider,
              model,
              estimatedCost,
              score,
              config: fullConfig
            };
          } catch (error) {
            console.warn(`Failed to evaluate provider ${config.name}:`, error);
            return null;
          }
        })
    );

    const validCandidates = candidates.filter(c => c !== null);
    
    if (validCandidates.length === 0) {
      throw new AIProviderError(
        `No suitable providers available for task: ${task}`,
        'unknown'
      );
    }

    // スコア順でソート
    validCandidates.sort((a, b) => b!.score - a!.score);
    const best = validCandidates[0]!;

    return {
      provider: best.provider,
      model: best.model,
      estimatedCost: best.estimatedCost
    };
  }

  // 用途別推奨プロバイダー取得
  static async getRecommendedProviderForUseCase(
    useCase: 'presentation' | 'coding' | 'analysis' | 'creative' | 'enterprise'
  ): Promise<Array<{ provider: AIProvider; model: ModelInfo; task: TaskType }>> {
    const recommendations = getRecommendedModelForUseCase(useCase);
    const results = [];

    for (const rec of recommendations) {
      try {
        const settings = getUserSettings();
        const config = this.getProviderConfig(rec.provider, settings);
        const provider = await this.createProvider(config);
        
        results.push({
          provider,
          model: rec.model,
          task: rec.task
        });
      } catch (error) {
        console.warn(
          `Failed to create recommended provider ${rec.provider} for use case ${useCase}:`,
          error
        );
      }
    }

    return results;
  }

  // プロバイダー性能測定
  static recordPerformance(
    providerType: AIProviderType,
    task: TaskType,
    responseTime: number,
    success: boolean,
    cost?: number
  ): void {
    const metrics = this.performanceMetrics.get(providerType);
    if (!metrics) return;

    metrics.totalRequests++;
    if (success) {
      metrics.successCount++;
      metrics.totalResponseTime += responseTime;
      metrics.averageResponseTime = metrics.totalResponseTime / metrics.successCount;
      
      if (cost !== undefined) {
        metrics.totalCost += cost;
        metrics.averageCost = metrics.totalCost / metrics.successCount;
      }
    } else {
      metrics.errorCount++;
    }

    metrics.lastUpdated = new Date();
  }

  // パフォーマンス統計取得
  static getPerformanceStats(providerType: AIProviderType): ProviderMetrics | null {
    return this.performanceMetrics.get(providerType) || null;
  }

  // 設定からプロバイダー設定を構築
  private static buildConfigFromSettings(settings: UserSettings): AIProviderConfig {
    const providerType = (settings.aiProvider || 'gemini') as AIProviderType;
    return this.getProviderConfig(providerType, settings);
  }

  // プロバイダー別設定取得
  private static getProviderConfig(
    providerType: AIProviderType,
    settings: UserSettings
  ): AIProviderConfig {
    const config: AIProviderConfig = {
      name: providerType,
      apiKey: this.getApiKeyForProvider(providerType, settings),
      models: settings.aiModels || this.getDefaultModels(providerType),
    };

    // プロバイダー固有設定
    switch (providerType) {
      case 'azure':
        config.endpoint = settings.azureEndpoint;
        config.deployments = settings.azureDeployments;
        break;
      
      case 'openai':
        config.organization = settings.openaiOrganization;
        break;
      
      case 'lmstudio':
        config.endpoint = settings.lmStudioEndpoint || 'http://localhost:1234';
        config.localPort = settings.lmStudioPort || 1234;
        break;
      
      case 'fooocus':
        config.endpoint = settings.fooucusEndpoint || 'http://localhost:7865';
        config.localPort = settings.fooucusPort || 7865;
        break;
    }

    return config;
  }

  // API Key取得
  private static getApiKeyForProvider(
    providerType: AIProviderType,
    settings: UserSettings
  ): string {
    const capabilities = getProviderCapabilities(providerType);
    
    if (!capabilities.requiresApiKey) {
      return ''; // ローカルプロバイダーはAPI Key不要
    }

    switch (providerType) {
      case 'gemini':
        return localStorage.getItem('slidemaster_user_api_key') || '';
      case 'azure':
        return settings.azureApiKey || '';
      case 'openai':
        return settings.openaiApiKey || '';
      case 'claude':
        return settings.claudeApiKey || '';
      default:
        return '';
    }
  }

  // デフォルトモデル設定
  private static getDefaultModels(providerType: AIProviderType): any {
    const defaults = {
      gemini: {
        textGeneration: 'gemini-2.5-flash',
        imageGeneration: 'gemini-2.0-flash',
        videoAnalysis: 'gemini-2.5-flash'
      },
      azure: {
        textGeneration: 'gpt-4o',
        imageGeneration: 'dall-e-3',
        videoAnalysis: 'gpt-4o'
      },
      openai: {
        textGeneration: 'gpt-4o',
        imageGeneration: 'dall-e-3',
        videoAnalysis: 'gpt-4o'
      },
      claude: {
        textGeneration: 'claude-3.5-sonnet',
        imageGeneration: '', // 未対応
        videoAnalysis: 'claude-3.5-sonnet'
      },
      lmstudio: {
        textGeneration: 'deepseek-r1-0528',
        imageGeneration: '', // 未対応
        videoAnalysis: 'llama-3.3-vision'
      },
      fooocus: {
        textGeneration: '', // 未対応
        imageGeneration: 'juggernaut-xl',
        videoAnalysis: '' // 未対応
      }
    };

    return defaults[providerType];
  }

  // 設定済みプロバイダー取得
  private static getConfiguredProviders(settings: UserSettings): Partial<AIProviderConfig>[] {
    const configured: Partial<AIProviderConfig>[] = [];

    // 設定済みAPIキーがあるプロバイダーを取得
    const providerTypes: AIProviderType[] = ['gemini', 'azure', 'openai', 'claude', 'lmstudio', 'fooocus'];
    
    for (const provider of providerTypes) {
      const capabilities = getProviderCapabilities(provider);
      
      if (!capabilities.requiresApiKey) {
        // ローカルプロバイダーは常に利用可能
        configured.push({ name: provider });
      } else {
        const apiKey = this.getApiKeyForProvider(provider, settings);
        if (apiKey) {
          configured.push({ name: provider });
        }
      }
    }

    return configured;
  }

  // プロバイダーキー生成
  private static getProviderKey(config: AIProviderConfig): string {
    return `${config.name}-${config.apiKey || 'no-key'}-${config.endpoint || 'default'}`;
  }

  // スコア計算
  private static calculateScore(
    model: ModelInfo,
    priority: Priority,
    cost: number,
    providerType: AIProviderType
  ): number {
    let score = 0;
    
    // 優先度別基本スコア
    switch (priority) {
      case 'cost':
        score = cost === 0 ? 100 : Math.max(0, 100 - cost * 10);
        break;
      case 'quality':
        score = model.cost === 'high' ? 100 : model.cost === 'medium' ? 80 : 60;
        break;
      case 'speed':
        score = model.speed === 'fastest' ? 100 : model.speed === 'fast' ? 80 : 60;
        break;
      case 'privacy':
        score = model.local ? 100 : 50;
        break;
    }
    
    // ボーナスポイント
    if (model.enterprise) score += 10;
    if (model.reasoning) score += 15;
    if (model.latest) score += 5;
    if (model.multimodal) score += 5;
    
    // パフォーマンス履歴による調整
    const metrics = this.performanceMetrics.get(providerType);
    if (metrics && metrics.totalRequests > 0) {
      const successRate = metrics.successCount / metrics.totalRequests;
      score *= successRate;
    }

    return score;
  }

  // 機能キー取得
  private static getCapabilityKey(task: TaskType): string {
    return `${task}Generation` as keyof ReturnType<typeof getProviderCapabilities>;
  }

  // 完全な設定を構築
  private static buildFullConfig(
    partial: AIProviderConfig,
    settings: UserSettings
  ): AIProviderConfig {
    return {
      ...this.getProviderConfig(partial.name, settings),
      ...partial
    };
  }

  // メトリクス初期化
  private static initializeMetrics(providerType: AIProviderType): void {
    if (!this.performanceMetrics.has(providerType)) {
      this.performanceMetrics.set(providerType, {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        totalCost: 0,
        averageCost: 0,
        lastUpdated: new Date()
      });
    }
  }
}

// パフォーマンス測定用インターフェース
interface ProviderMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  totalCost: number;
  averageCost: number;
  lastUpdated: Date;
}

// 便利な関数をエクスポート
export const createAIProvider = AIProviderFactory.createProvider.bind(AIProviderFactory);
export const getCurrentAIProvider = AIProviderFactory.getCurrentProvider.bind(AIProviderFactory);
export const getProviderForTask = AIProviderFactory.getProviderForTask.bind(AIProviderFactory);
export const getBestAIProvider = AIProviderFactory.getBestProvider.bind(AIProviderFactory);
export const getRecommendedAIProvider = AIProviderFactory.getRecommendedProviderForUseCase.bind(AIProviderFactory);