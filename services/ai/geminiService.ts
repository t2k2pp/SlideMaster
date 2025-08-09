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
      imageModel: 'imagen-3.0-generate-002', // Google公式のMODEL_ID
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
      const url = `${this.config.baseUrl}/models/${this.config.textModel}:generateContent`;
      
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
          maxOutputTokens: request.maxTokens || 8192,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.textApiKey,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // デバッグ用ログ
      console.log('🔍 Gemini API Response:', JSON.stringify(data, null, 2));
      
      // 応答構造の多様性に対応
      let rawText = '';
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        // 標準的なGemini API形式
        rawText = data.candidates[0].content.parts[0].text;
        console.log('✅ Using standard Gemini format');
      } else if (data.candidates?.[0]?.content?.text) {
        // 簡略化された形式
        rawText = data.candidates[0].content.text;
        console.log('✅ Using simplified Gemini format');
      } else if (data.candidates?.[0]?.text) {
        // 最も簡略化された形式
        rawText = data.candidates[0].text;
        console.log('✅ Using minimal Gemini format');
      } else {
        // MAX_TOKENSやその他の理由で内容が空の場合の処理
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason;
        
        if (finishReason === 'MAX_TOKENS') {
          console.warn('⚠️ Gemini response truncated due to MAX_TOKENS');
          // MAX_TOKENSの場合はmaxTokensを増やして再試行を推奨するエラーメッセージ
          throw new Error('Response was truncated due to token limit. Try increasing maxTokens or simplifying the prompt.');
        } else if (finishReason === 'STOP') {
          console.warn('⚠️ Gemini response finished with STOP but no text content');
          // STOPの場合は空のレスポンスとして処理
          rawText = '';
        } else {
          console.error('❌ Invalid Gemini response structure:', data);
          console.error('❌ Finish reason:', finishReason);
          throw new Error(`Invalid response format from Gemini API (finish reason: ${finishReason || 'unknown'})`);
        }
      }
      console.log('📝 Raw Gemini text:', rawText);
      
      // Gemini専用: Markdownコードブロックを除去
      const cleanedText = this.cleanGeminiResponse(rawText);
      console.log('✨ Cleaned Gemini text:', cleanedText);
      
      return cleanedText;
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
      const modelName = request.modelName || this.config.imageModel || 'imagen-3.0-generate-002';
      
      console.log('🎨 Attempting image generation with model:', modelName);
      
      // Imagen APIの場合（推奨）
      if (modelName.startsWith('imagen-')) {
        try {
          return await this.generateImageWithImagen(request, modelName);
        } catch (imagenError) {
          console.warn('⚠️ Imagen API failed, trying Gemini Flash fallback:', imagenError);
          
          // フォールバック: Gemini Flash Image Generation
          try {
            return await this.generateImageWithGeminiFlash(request, 'gemini-2.0-flash-preview-image-generation');
          } catch (flashError) {
            console.error('❌ Both Imagen and Gemini Flash failed');
            throw imagenError; // 元のエラーを投げる
          }
        }
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
    // Imagen APIは現在Gemini APIと統合され、generateContentエンドポイントを使用
    const url = `${this.config.baseUrl}/models/${modelName}:generateContent`;
    
    console.log('🎨 Using Imagen API endpoint:', url);
    
    const requestBody = {
      contents: [{
        parts: [{
          text: `Generate an image: ${request.prompt}. Style: high quality, detailed, professional.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
      }
    };

    console.log('📝 Imagen request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.imageApiKey,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Imagen API Error Response:', errorData);
      throw new Error(`Imagen API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Imagen API Response:', JSON.stringify(data, null, 2));
    
    // Imagen API統合後の応答形式を処理
    if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const mimeType = data.candidates[0].content.parts[0].inlineData.mimeType || 'image/jpeg';
      const imageData = data.candidates[0].content.parts[0].inlineData.data;
      console.log('✅ Successfully extracted image data');
      return `data:${mimeType};base64,${imageData}`;
    }
    
    // 旧形式の応答もサポート（後方互換性）
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      console.log('✅ Using legacy Imagen format');
      return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
    
    throw new Error('Invalid response format from Imagen API - no image data found');
  }

  private async generateImageWithGeminiFlash(request: GeminiImageRequest, modelName: string): Promise<string> {
    const url = `${this.config.baseUrl}/models/${modelName}:generateContent`;
    
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
        'x-goog-api-key': this.config.imageApiKey,
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

**Minified JSON形式（スペース・改行なし）**で以下の構造で出力してください。トークン数節約が重要です：
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
      maxTokens: 8192
    });
  }

  // =================================================================
  // 動画分析
  // =================================================================

  async analyzeVideo(request: GeminiVideoRequest): Promise<string> {
    try {
      // Gemini Pro Visionを使用した動画分析
      const url = `${this.config.baseUrl}/models/${this.config.videoModel}:generateContent`;
      
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
          maxOutputTokens: 8000,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.videoApiKey,
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

      const rawText = data.candidates[0].content.parts[0].text;
      
      // Gemini専用: Markdownコードブロックを除去
      return this.cleanGeminiResponse(rawText);
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

  /**
   * Gemini専用: Markdownコードブロックや余分な文字を除去
   * Azure OpenAIには影響しないGemini専用処理
   */
  private cleanGeminiResponse(text: string): string {
    if (!text) return text;
    
    // Markdownコードブロックを除去
    let cleaned = text.replace(/^```(?:json|javascript|html|css|text)?\s*\n?/gm, '');
    cleaned = cleaned.replace(/\n?```\s*$/gm, '');
    
    // 前後の空白文字を除去
    cleaned = cleaned.trim();
    
    // Context Intelligence Engine用の単語抽出
    // 単語のみが期待される場合（maxTokens < 50の場合）は最初の単語のみ抽出
    if (text.length < 200) { // 短い応答の場合
      const words = cleaned.split(/\s+/);
      const firstWord = words[0];
      
      // 有効なキーワードかチェック（Context Intelligence用）
      const validKeywords = [
        'story', 'technical', 'business', 'academic', 'creative',
        'The Emotional Storyteller', 'The Corporate Strategist', 'logical', 
        'The Academic Visualizer', 'storytelling', 'professional', 'minimalist',
        'academic', 'tech_modern', 'creative', 'playful', 'children_bright',
        'business_presentation', 'educational_content', 'tutorial_guide',
        'marketing_pitch', 'academic_research', 'training_material'
      ];
      
      if (validKeywords.includes(firstWord)) {
        return firstWord;
      }
    }
    
    return cleaned;
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
    imageModel: (geminiAuth.imageGeneration?.modelName === 'imagen-3.0-generate') ? 'imagen-3.0-generate-002' : (geminiAuth.imageGeneration?.modelName || 'imagen-3.0-generate-002'),
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
      // 既存設定に古いMODEL_IDがある場合は正しいものに置き換え
      const savedModel = geminiAuth?.imageGeneration?.modelName;
      if (savedModel === 'imagen-3.0-generate') {
        model = 'imagen-3.0-generate-002';
      } else if (savedModel === 'imagen-4.0-generate') {
        // Imagen 4.0は実験的だが、そのまま使用を許可
        model = savedModel;
      } else {
        model = savedModel || 'imagen-3.0-generate-002';
      }
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
    imageModel: (geminiAuth?.imageGeneration?.modelName === 'imagen-3.0-generate') ? 'imagen-3.0-generate-002' : (geminiAuth?.imageGeneration?.modelName || 'imagen-3.0-generate-002'),
    videoModel: geminiAuth?.videoAnalysis?.modelName || 'gemini-2.5-flash',
  });
}