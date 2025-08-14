// =================================================================
// LM Studio Service - ローカルLLM（OpenAI互換API）サービス
// LMStudioで動作するGemma-3n-e4b/Gemma-3-4b/deepseek-r1/phi-4-mini-reasoning対応
// =================================================================

import { 
  LMStudioConfig, 
  LMStudioTextRequest, 
  validateLMStudioConfig, 
  LocalLLMConfigError 
} from './localLLMConfig';

export interface LMStudioResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LMStudioModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModelInfo[];
}

export class LMStudioService {
  private config: LMStudioConfig;
  private baseUrl: string;

  constructor(config: LMStudioConfig) {
    const validationErrors = validateLMStudioConfig(config);
    if (validationErrors.length > 0) {
      throw new LocalLLMConfigError(
        `LMStudio configuration error: ${validationErrors.join(', ')}`,
        'lmstudio'
      );
    }

    this.config = config;
    this.baseUrl = config.endpoint.replace(/\/$/, ''); // 末尾のスラッシュを除去
  }

  /**
   * OpenAI互換のテキスト生成
   */
  async generateText(request: LMStudioTextRequest): Promise<string> {
    try {
      const response = await this.makeRequest('/v1/chat/completions', {
        model: 'local-model', // LMStudioでは実際のモデル名は不要
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2048,
        top_p: request.topP ?? 1.0,
        frequency_penalty: request.frequencyPenalty ?? 0.0,
        presence_penalty: request.presencePenalty ?? 0.0,
        stop: request.stop,
        stream: false
      });

      const data = await response.json() as LMStudioResponse;
      
      if (!data.choices || data.choices.length === 0) {
        throw new LocalLLMConfigError('No response from LMStudio', 'lmstudio');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof LocalLLMConfigError) {
        throw error;
      }
      throw new LocalLLMConfigError(
        `LMStudio API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'lmstudio'
      );
    }
  }

  /**
   * 利用可能なモデル一覧を取得
   */
  async getAvailableModels(): Promise<LMStudioModelInfo[]> {
    try {
      const response = await this.makeRequest('/v1/models');
      const data = await response.json() as LMStudioModelsResponse;
      return data.data || [];
    } catch (error) {
      console.warn('Failed to get LMStudio models:', error);
      return [];
    }
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/v1/models');
      return response.ok;
    } catch (error) {
      console.warn('LMStudio connection test failed:', error);
      return false;
    }
  }

  /**
   * サーバー情報を取得
   */
  async getServerInfo(): Promise<{ status: string; model?: string; version?: string }> {
    try {
      const models = await this.getAvailableModels();
      const currentModel = models.length > 0 ? models[0].id : undefined;
      
      return {
        status: 'connected',
        model: currentModel,
        version: 'OpenAI Compatible'
      };
    } catch (error) {
      return {
        status: 'disconnected'
      };
    }
  }

  /**
   * UnifiedAIService統合用のインターフェース実装
   */
  async generateSlideContent(topic: string, slideCount?: number, enhancedOptions?: any): Promise<string> {
    let prompt = topic;
    
    // 拡張オプションがある場合は使用
    if (enhancedOptions?.enhancedPrompt) {
      prompt = enhancedOptions.enhancedPrompt;
    } else {
      // 基本的なスライド生成プロンプトを構築
      prompt = `Create a presentation about "${topic}" with ${slideCount || 5} slides. 
      
Please generate the content in Minified JSON format (no spaces or line breaks) with the following structure:
{"title":"Presentation Title","slides":[{"id":"slide-1","title":"Slide Title","content":"Slide content in Markdown format"}]}

Important: Output only the JSON, no additional text or explanations.`;
    }

    const systemPrompt = 'You are an expert presentation designer. Generate high-quality slide content in the specified format.';

    return await this.generateText({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: this.config.maxTokens || 4096
    });
  }

  /**
   * 共通HTTPリクエスト処理
   */
  private async makeRequest(endpoint: string, body?: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // APIキーが設定されている場合は追加
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers,
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // JSON解析に失敗した場合はそのまま
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new LocalLLMConfigError(
          'LMStudioサーバーに接続できません。サーバーが起動していることを確認してください。',
          'lmstudio'
        );
      }
      throw error;
    }
  }

  /**
   * 設定情報を取得
   */
  getConfig(): Readonly<LMStudioConfig> {
    return { ...this.config };
  }

  /**
   * プロバイダー情報を取得
   */
  getProviderInfo() {
    return {
      name: 'LM Studio',
      version: '1.0.0',
      capabilities: ['text_generation', 'chat_completion'],
      isLocal: true,
      endpoint: this.config.endpoint
    };
  }
}

/**
 * LMStudioServiceのファクトリ関数
 */
export function createLMStudioService(config: LMStudioConfig): LMStudioService {
  return new LMStudioService(config);
}

/**
 * 設定からLMStudioServiceを作成
 */
export function createLMStudioServiceFromSettings(): LMStudioService {
  // 実際の使用時は getUserSettings() から設定を取得
  // ここでは仮の設定を使用
  const config: LMStudioConfig = {
    endpoint: 'http://localhost:1234',
    modelDisplayName: 'Local LLM',
    maxTokens: 2048,
    temperature: 0.7
  };
  
  return createLMStudioService(config);
}

/**
 * LMStudioが利用可能かチェック
 */
export async function isLMStudioAvailable(endpoint: string = 'http://localhost:1234'): Promise<boolean> {
  try {
    const service = createLMStudioService({ endpoint });
    return await service.testConnection();
  } catch (error) {
    return false;
  }
}

/**
 * 推奨設定を取得
 */
export function getRecommendedLMStudioConfig(): LMStudioConfig {
  return {
    endpoint: 'http://localhost:1234',
    modelDisplayName: 'Gemma 3 4B',
    maxTokens: 4096,
    temperature: 0.7
  };
}