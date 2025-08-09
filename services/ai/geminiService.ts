// =================================================================
// Gemini AI Service - Google Gemini API統合
// UnifiedAIServiceインターフェース準拠
// =================================================================

import { getUserSettings } from '../storageService';

export interface GeminiConfig {
  // タスク別APIキー対応
  textApiKey?: string;
  imageApiKey?: string;  
  videoApiKey?: string;
  // 後方互換性のため
  apiKey?: string;
  baseUrl?: string;
  textModel?: string;
  imageModel?: string;
  videoModel?: string;
}

export interface GeminiTextRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiImageRequest {
  prompt: string;
  size?: 'square' | 'landscape' | 'portrait';
  quality?: 'low' | 'medium' | 'high';
  style?: 'natural' | 'vivid';
  modelName?: string;
}

export interface GeminiSlideImageRequest extends GeminiImageRequest {
  slideTitle?: string;
  slideContent?: string;
  imageType?: 'background' | 'illustration' | 'icon' | 'diagram';
}

export interface GeminiVideoRequest {
  videoData: string;
  prompt?: string;
}

export class GeminiService {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      textModel: 'gemini-2.5-flash',
      imageModel: 'imagen-3.0-generate',
      videoModel: 'gemini-2.5-flash',
      // 後方互換性：apiKeyが指定されている場合は全タスクで使用
      textApiKey: config.textApiKey || config.apiKey,
      imageApiKey: config.imageApiKey || config.apiKey,
      videoApiKey: config.videoApiKey || config.apiKey,
      ...config,
    };
  }

  // =================================================================
  // テキスト生成
  // =================================================================

  async generateText(request: GeminiTextRequest): Promise<string> {
    try {
      const url = `${this.config.baseUrl}/models/${this.config.textModel}:generateContent?key=${this.config.textApiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{
            text: request.systemPrompt ? 
              `${request.systemPrompt}\n\n${request.prompt}` : 
              request.prompt
          }]
        }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 2048,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini text generation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate text with Gemini');
    }
  }

  // =================================================================
  // 画像生成（Imagen 3/4、Gemini Flash Image Generation対応）
  // =================================================================

  async generateImage(request: GeminiImageRequest): Promise<string> {
    try {
      const modelName = request.modelName || this.config.imageModel || 'imagen-3.0-generate';
      
      // Imagen APIの場合
      if (modelName.startsWith('imagen-')) {
        return await this.generateImageWithImagen(request, modelName);
      }
      
      // Gemini Flash Image Generationの場合
      if (modelName === 'gemini-2.0-flash-preview-image-generation') {
        return await this.generateImageWithGeminiFlash(request, modelName);
      }
      
      throw new Error(`Unsupported image generation model: ${modelName}`);
    } catch (error) {
      console.error('Gemini image generation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate image with Gemini');
    }
  }

  private async generateImageWithImagen(request: GeminiImageRequest, modelName: string): Promise<string> {
    const url = `${this.config.baseUrl}/models/${modelName}:predict?key=${this.config.imageApiKey}`;
    
    // サイズマッピング（Imagen API形式）
    const aspectRatioMap = {
      'square': '1:1',
      'landscape': '16:9',
      'portrait': '9:16'
    };
    
    const requestBody = {
      instances: [{
        prompt: request.prompt,
      }],
      parameters: {
        aspectRatio: aspectRatioMap[request.size || 'square'],
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Imagen API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      throw new Error('Invalid response format from Imagen API');
    }

    // Base64画像データをData URLに変換
    return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
  }

  private async generateImageWithGeminiFlash(request: GeminiImageRequest, modelName: string): Promise<string> {
    const url = `${this.config.baseUrl}/models/${modelName}:generateContent?key=${this.config.imageApiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: `Generate an image: ${request.prompt}`,
        }]
      }],
      generationConfig: {
        temperature: 0.7,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini Flash Image Generation Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Gemini Flash Image Generationは現在プレビュー段階のため、
    // レスポンス形式が変更される可能性があります
    if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const mimeType = data.candidates[0].content.parts[0].inlineData.mimeType || 'image/jpeg';
      const imageData = data.candidates[0].content.parts[0].inlineData.data;
      return `data:${mimeType};base64,${imageData}`;
    }
    
    throw new Error('Invalid response format from Gemini Flash Image Generation');
  }

  async generateSlideImage(request: GeminiSlideImageRequest): Promise<string> {
    // スライド特化型の画像生成
    const enhancedPrompt = this.enhanceImagePromptForSlide(request);
    
    return this.generateImage({
      ...request,
      prompt: enhancedPrompt
    });
  }

  // =================================================================
  // スライドコンテンツ生成
  // =================================================================

  async generateSlideContent(topic: string, slideCount?: number): Promise<string> {
    const prompt = `以下のトピックについて、${slideCount || 5}枚のプレゼンテーションスライドを作成してください。

トピック: ${topic}

以下のJSON形式で出力してください：
{
  "title": "プレゼンテーションタイトル",
  "description": "プレゼンテーションの説明",
  "slides": [
    {
      "id": "slide-1",
      "title": "スライドタイトル",
      "layers": [
        {
          "id": "layer-1",
          "type": "text",
          "content": "スライドの内容",
          "x": 10,
          "y": 20,
          "width": 80,
          "height": 60,
          "fontSize": 32,
          "textAlign": "left",
          "textColor": "#000000"
        }
      ],
      "background": "#ffffff"
    }
  ]
}

各スライドは情報が豊富で、視覚的に魅力的になるように作成してください。`;

    return this.generateText({
      prompt,
      systemPrompt: 'あなたは優秀なプレゼンテーションデザイナーです。与えられたトピックについて、構造化された分かりやすいスライドを作成してください。',
      temperature: 0.7,
      maxTokens: 4000
    });
  }

  // =================================================================
  // 動画分析
  // =================================================================

  async analyzeVideo(request: GeminiVideoRequest): Promise<string> {
    try {
      // Gemini Pro Visionを使用した動画分析
      const url = `${this.config.baseUrl}/models/${this.config.videoModel}:generateContent?key=${this.config.videoApiKey}`;
      
      // Base64データからmimeTypeを抽出
      const mimeType = this.extractMimeTypeFromBase64(request.videoData);
      const base64Data = request.videoData.split(',')[1] || request.videoData;
      
      const requestBody = {
        contents: [{
          parts: [
            {
              text: request.prompt || 'この動画の内容を詳しく分析し、説明してください。'
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini Video Analysis Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini video analysis error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to analyze video with Gemini');
    }
  }

  // =================================================================
  // 接続テスト
  // =================================================================

  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.generateText({
        prompt: 'Hello, this is a connection test.',
        maxTokens: 10
      });
      return testResponse.length > 0;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private enhanceImagePromptForSlide(request: GeminiSlideImageRequest): string {
    let enhancedPrompt = request.prompt;

    if (request.slideTitle) {
      enhancedPrompt += ` for slide titled: "${request.slideTitle}"`;
    }

    if (request.slideContent) {
      const contentSummary = request.slideContent.substring(0, 100);
      enhancedPrompt += ` related to: ${contentSummary}`;
    }

    if (request.imageType) {
      const typeMap = {
        'background': 'subtle background image',
        'illustration': 'clear illustration',
        'icon': 'simple icon',
        'diagram': 'informative diagram'
      };
      enhancedPrompt += ` as ${typeMap[request.imageType]}`;
    }

    return enhancedPrompt;
  }

  private extractMimeTypeFromBase64(dataUrl: string): string {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'video/mp4';
  }
}

// =================================================================
// ファクトリ関数
// =================================================================

export function createGeminiService(config: GeminiConfig): GeminiService {
  return new GeminiService(config);
}

export function createGeminiServiceFromSettings(): GeminiService {
  const settings = getUserSettings();
  const geminiAuth = settings.providerAuth?.gemini;
  
  // 最低限テキスト生成のAPIキーは必要
  if (!geminiAuth?.textGeneration?.apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  return new GeminiService({
    // タスク別APIキーを使用
    textApiKey: geminiAuth.textGeneration.apiKey,
    imageApiKey: geminiAuth.imageGeneration?.apiKey || geminiAuth.textGeneration.apiKey, // フォールバック
    videoApiKey: geminiAuth.videoAnalysis?.apiKey || geminiAuth.textGeneration.apiKey,   // フォールバック
    textModel: geminiAuth.textGeneration.modelName || 'gemini-2.5-flash',
    imageModel: geminiAuth.imageGeneration?.modelName || 'imagen-3.0-generate',
    videoModel: geminiAuth.videoAnalysis?.modelName || 'gemini-2.5-flash',
  });
}

// タスク専用のファクトリ関数（より明確）
export function createGeminiServiceForTask(taskType: 'text' | 'image' | 'video'): GeminiService {
  const settings = getUserSettings();
  const geminiAuth = settings.providerAuth?.gemini;
  
  let apiKey: string;
  let model: string;
  
  switch (taskType) {
    case 'text':
      apiKey = geminiAuth?.textGeneration?.apiKey || '';
      model = geminiAuth?.textGeneration?.modelName || 'gemini-2.5-flash';
      break;
    case 'image':
      apiKey = geminiAuth?.imageGeneration?.apiKey || geminiAuth?.textGeneration?.apiKey || '';
      model = geminiAuth?.imageGeneration?.modelName || 'imagen-3.0-generate';
      break;
    case 'video':
      apiKey = geminiAuth?.videoAnalysis?.apiKey || geminiAuth?.textGeneration?.apiKey || '';
      model = geminiAuth?.videoAnalysis?.modelName || 'gemini-2.5-flash';
      break;
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
  
  if (!apiKey) {
    throw new Error(`Gemini API key for ${taskType} is not configured`);
  }

  return new GeminiService({
    textApiKey: taskType === 'text' ? apiKey : geminiAuth?.textGeneration?.apiKey || apiKey,
    imageApiKey: taskType === 'image' ? apiKey : geminiAuth?.imageGeneration?.apiKey || apiKey,
    videoApiKey: taskType === 'video' ? apiKey : geminiAuth?.videoAnalysis?.apiKey || apiKey,
    textModel: geminiAuth?.textGeneration?.modelName || 'gemini-2.5-flash',
    imageModel: geminiAuth?.imageGeneration?.modelName || 'imagen-3.0-generate',
    videoModel: geminiAuth?.videoAnalysis?.modelName || 'gemini-2.5-flash',
  });
}