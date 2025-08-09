// =================================================================
// Azure OpenAI Client - APIクライアント
// Azure OpenAI REST APIとの通信を管理
// =================================================================

import { 
  AzureOpenAIConfig, 
  AzureOpenAIConfigError,
  AzureTextGenerationRequest,
  AzureImageGenerationRequest,
  AzureVideoAnalysisRequest,
  getDefaultSizeForModel,
  getDefaultQualityForModel
} from './azureOpenAIConfig';

export class AzureOpenAIConnectionError extends Error {
  constructor(message: string, public statusCode?: number, public cause?: Error) {
    super(message);
    this.name = 'AzureOpenAIConnectionError';
  }
}

export class AzureOpenAIAPIError extends Error {
  constructor(message: string, public statusCode: number, public errorCode?: string, public cause?: Error) {
    super(message);
    this.name = 'AzureOpenAIAPIError';
  }
}

export class AzureOpenAIRateLimitError extends AzureOpenAIAPIError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'AzureOpenAIRateLimitError';
  }
}

export class AzureOpenAIClient {
  private config: AzureOpenAIConfig;
  private baseUrl: string;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    this.baseUrl = `${config.endpoint.replace(/\/$/, '')}/openai/deployments`;
  }

  async generateText(request: AzureTextGenerationRequest): Promise<string> {
    const url = `${this.baseUrl}/${this.config.textDeploymentName}/chat/completions`;
    
    const requestBody = {
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt }
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop
    };

    try {
      const response = await this.makeRequest(url, requestBody);
      
      if (!response.choices || response.choices.length === 0) {
        throw new AzureOpenAIAPIError('No response generated', 500, 'NO_RESPONSE');
      }

      return response.choices[0].message?.content || '';
    } catch (error) {
      throw this.handleError(error, 'text generation');
    }
  }

  async generateImage(request: AzureImageGenerationRequest): Promise<string> {
    // 画像生成専用の設定を使用、なければテキスト生成設定をフォールバック
    const imageEndpoint = this.config.imageEndpoint || this.config.endpoint;
    const imageApiKey = this.config.imageApiKey || this.config.apiKey;
    const imageApiVersion = this.config.imageApiVersion || '2025-04-01-preview';
    
    const imageBaseUrl = `${imageEndpoint.replace(/\/$/, '')}/openai/deployments`;
    const url = `${imageBaseUrl}/${this.config.imageDeploymentName}/images/generations`;
    
    // モデル名に応じたデフォルトサイズとqualityを取得
    const modelName = request.modelName || 'dall-e-3'; // デフォルト
    const defaultSize = getDefaultSizeForModel(modelName);
    const defaultQuality = getDefaultQualityForModel(modelName);
    
    const requestBody = {
      prompt: request.prompt,
      size: request.size ?? defaultSize,
      quality: request.quality ?? defaultQuality,
      output_format: 'png',
      output_compression: 100,
      n: 1
    };

    try {
      // 画像生成専用のAPIバージョンとBearerトークン認証を使用
      const fullUrl = `${url}?api-version=${imageApiVersion}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${imageApiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
        throw new Error('Invalid response format from Azure OpenAI');
      }

      const imageData = responseData.data[0];
      
      // b64_jsonでレスポンスが返ってくる
      if (imageData.b64_json) {
        return `data:image/png;base64,${imageData.b64_json}`;
      } else if (imageData.url) {
        return imageData.url;
      } else {
        throw new Error('No image data found in response');
      }
    } catch (error) {
      throw this.handleError(error, 'image generation');
    }
  }

  async analyzeVideo(request: AzureVideoAnalysisRequest): Promise<string> {
    if (!this.config.videoDeploymentName) {
      throw new AzureOpenAIConfigError('Video deployment name is required for video analysis');
    }

    // 動画分析専用の設定を使用、なければテキスト生成設定をフォールバック
    const videoEndpoint = this.config.videoEndpoint || this.config.endpoint;
    const videoApiKey = this.config.videoApiKey || this.config.apiKey;
    const videoApiVersion = this.config.videoApiVersion || this.config.apiVersion || '2024-02-01';
    
    const videoBaseUrl = `${videoEndpoint.replace(/\/$/, '')}/openai/deployments`;
    const url = `${videoBaseUrl}/${this.config.videoDeploymentName}/chat/completions`;
    
    const requestBody = {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: request.prompt },
          { type: 'image_url', image_url: { url: request.videoData, detail: 'high' } }
        ]
      }],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7
    };

    try {
      const fullUrl = `${url}?api-version=${videoApiVersion}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': videoApiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      if (!responseData.choices || responseData.choices.length === 0) {
        throw new AzureOpenAIAPIError('No analysis generated', 500, 'NO_ANALYSIS');
      }

      return responseData.choices[0].message?.content || '';
    } catch (error) {
      throw this.handleError(error, 'video analysis');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testRequest: AzureTextGenerationRequest = {
        prompt: 'Hello',
        maxTokens: 1,
        temperature: 0
      };
      
      await this.generateText(testRequest);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async makeRequest(url: string, body: any): Promise<any> {
    const apiVersion = this.config.apiVersion || '2024-02-01';
    const fullUrl = `${url}?api-version=${apiVersion}`;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new AzureOpenAIRateLimitError(
          errorData.message || 'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      throw new AzureOpenAIAPIError(
        errorData.error?.message || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.error?.code
      );
    }

    return response.json();
  }

  private handleError(error: unknown, operation: string): Error {
    if (error instanceof AzureOpenAIAPIError || error instanceof AzureOpenAIConnectionError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return new AzureOpenAIConnectionError(
          `Network error during ${operation}: ${error.message}`,
          undefined,
          error
        );
      }

      return new AzureOpenAIConnectionError(
        `Failed to perform ${operation}: ${error.message}`,
        undefined,
        error
      );
    }

    return new AzureOpenAIConnectionError(`Unknown error during ${operation}`);
  }
}