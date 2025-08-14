// =================================================================
// Azure Image Service - 画像生成サービス
// Azure OpenAI DALL-E 3を使用した画像生成
// =================================================================

import { AzureOpenAIClient } from './azureOpenAIClient';
import { AzureOpenAIConfig, AzureImageGenerationRequest, validateImageGenerationRequest } from './azureOpenAIConfig';

export interface ImageGenerationOptions {
  prompt: string;
  size?: 'square' | 'landscape' | 'portrait';  // 統一サイズ
  quality?: 'low' | 'medium' | 'high';         // 統一品質
  style?: 'natural' | 'vivid';
  responseFormat?: 'url' | 'b64_json';
  modelName?: string;  // プロバイダー内部で使用
}

export interface SlideImageOptions extends ImageGenerationOptions {
  slideTitle?: string;
  slideContent?: string;
  imageType?: 'background' | 'illustration' | 'icon' | 'diagram';
}

export class AzureImageService {
  private client: AzureOpenAIClient;

  constructor(config: AzureOpenAIConfig) {
    this.client = new AzureOpenAIClient(config);
  }

  // 統一サイズをAzure固有サイズに変換
  private mapSizeToAzure(size: string | undefined, modelName: string): string {
    if (!size) return this.getDefaultAzureSize(modelName);
    
    switch (size) {
      case 'square':
        return '1024x1024';
      case 'landscape':
        return modelName === 'gpt-image-1' ? '1536x1024' : '1792x1024';
      case 'portrait':
        return modelName === 'gpt-image-1' ? '1024x1536' : '1024x1792';
      default:
        return this.getDefaultAzureSize(modelName);
    }
  }

  // 統一品質をAzure固有品質に変換
  private mapQualityToAzure(quality: string | undefined, modelName: string): string {
    if (!quality) return this.getDefaultAzureQuality(modelName);

    if (modelName === 'dall-e-3') {
      switch (quality) {
        case 'low':
        case 'medium':
          return 'standard';
        case 'high':
          return 'hd';
        default:
          return 'standard';
      }
    } else if (modelName === 'gpt-image-1') {
      switch (quality) {
        case 'low':
          return 'low';
        case 'medium':
          return 'medium';
        case 'high':
          return 'high';
        default:
          return 'medium';
      }
    }
    
    return 'standard'; // デフォルト
  }

  private getDefaultAzureSize(modelName: string): string {
    return '1024x1024'; // どのモデルでも対応する安全な値
  }

  private getDefaultAzureQuality(modelName: string): string {
    return modelName === 'gpt-image-1' ? 'medium' : 'standard';
  }

  async generateImage(options: ImageGenerationOptions): Promise<string> {
    const modelName = options.modelName || 'dall-e-3';
    
    const request: AzureImageGenerationRequest = {
      prompt: options.prompt,
      size: this.mapSizeToAzure(options.size, modelName),
      quality: this.mapQualityToAzure(options.quality, modelName),
      style: options.style,
      responseFormat: options.responseFormat,
      modelName: options.modelName
    };

    const validationErrors = validateImageGenerationRequest(request);
    if (validationErrors.length > 0) {
      throw new Error(`Image generation validation failed: ${validationErrors.join(', ')}`);
    }

    return this.client.generateImage(request);
  }

  async generateSlideImage(options: SlideImageOptions): Promise<string> {
    let enhancedPrompt = this.enhancePromptForSlide(options);
    
    // スライド用のデフォルト設定（統一インターフェース）
    const imageOptions: ImageGenerationOptions = {
      prompt: enhancedPrompt,
      size: options.size || 'landscape', // スライドには横長が適している
      quality: options.quality || 'high', // スライドには高品質が適している
      style: options.style || 'natural',
      responseFormat: options.responseFormat || 'b64_json',
      modelName: options.modelName
    };

    return this.generateImage(imageOptions);
  }

  async generateBackgroundImage(topic: string, style: 'professional' | 'creative' | 'minimal' | 'academic' = 'professional'): Promise<string> {
    const stylePrompts = {
      professional: 'professional, clean, corporate, modern, subtle gradient',
      creative: 'creative, artistic, vibrant, inspiring, dynamic',
      minimal: 'minimal, clean, simple, elegant, monochromatic',
      academic: 'academic, scholarly, formal, educational, classic'
    };

    const prompt = `Create a ${stylePrompts[style]} background image for a presentation about "${topic}". 
The image should be suitable as a slide background, with space for text overlay. 
The design should be sophisticated and not distracting from the content.
Avoid any text in the image.`;

    return this.generateSlideImage({
      prompt,
      imageType: 'background',
      size: '1792x1024',
      quality: 'hd',
      style: 'natural'
    });
  }

  async generateIllustration(description: string, context?: string): Promise<string> {
    let prompt = `Create a clear, professional illustration of: ${description}. 
The illustration should be suitable for use in a business presentation.
Style: clean, modern, professional illustration with clear details.`;

    if (context) {
      prompt += ` Context: This will be used in a presentation about ${context}.`;
    }

    prompt += ' Avoid any text in the image.';

    return this.generateSlideImage({
      prompt,
      imageType: 'illustration',
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    });
  }

  async generateDiagram(diagramType: string, description: string): Promise<string> {
    const prompt = `Create a clean, professional ${diagramType} diagram showing: ${description}.
The diagram should be:
- Clear and easy to understand
- Suitable for business presentations
- Professional color scheme
- Well-organized layout
- No text labels (text will be added separately)
Style: modern, clean, professional diagram with clear visual hierarchy.`;

    return this.generateSlideImage({
      prompt,
      imageType: 'diagram',
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    });
  }

  async generateIcon(iconDescription: string, style: 'flat' | 'outline' | '3d' | 'minimal' = 'flat'): Promise<string> {
    const styleDescriptions = {
      flat: 'flat design, simple, clean, solid colors',
      outline: 'outline style, line art, minimalist, stroke-based',
      '3d': '3D rendered, dimensional, modern, sophisticated',
      minimal: 'extremely minimal, simple, geometric, essential elements only'
    };

    const prompt = `Create a ${styleDescriptions[style]} icon representing: ${iconDescription}.
The icon should be:
- Professional and clean
- Suitable for business presentations
- Clear and recognizable
- Centered composition
- No text or labels
High quality, crisp details, modern design.`;

    return this.generateSlideImage({
      prompt,
      imageType: 'icon',
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    });
  }

  private enhancePromptForSlide(options: SlideImageOptions): string {
    console.log('🔥 AZURE IMAGE SERVICE: enhancePromptForSlide called!');
    console.log('📝 Original prompt:', options.prompt);
    let enhancedPrompt = options.prompt;

    // スライドのコンテキスト情報を追加
    if (options.slideTitle) {
      enhancedPrompt += ` This image is for a slide titled: "${options.slideTitle}".`;
    }

    if (options.slideContent) {
      enhancedPrompt += ` Slide content context: ${options.slideContent.substring(0, 200)}...`;
    }

    // 画像タイプに応じた追加説明
    switch (options.imageType) {
      case 'background':
        enhancedPrompt += ' This should work as a presentation slide background with text overlay capability.';
        break;
      case 'illustration':
        enhancedPrompt += ' This should be a clear illustration to support the slide content.';
        break;
      case 'icon':
        enhancedPrompt += ' This should be a clean, professional icon.';
        break;
      case 'diagram':
        enhancedPrompt += ' This should be a clear, informative diagram.';
        break;
      default:
        enhancedPrompt += ' This should complement a professional presentation slide.';
    }

    // 🎯 Context-Aware Quality Enhancement (Context Intelligence Engine対応)
    // プロンプトにストーリー系キーワードが含まれている場合は、ストーリー特化品質を適用
    if (enhancedPrompt.toLowerCase().includes('storytelling') || 
        enhancedPrompt.toLowerCase().includes('storybook') ||
        enhancedPrompt.toLowerCase().includes('folk tale') ||
        enhancedPrompt.toLowerCase().includes('昔話') ||
        enhancedPrompt.toLowerCase().includes('物語')) {
      console.log('🎭 Storytelling context detected in image prompt - applying story-specific quality');
      enhancedPrompt += ' High quality illustration, perfect for storytelling presentation, warm and engaging visual style.';
    } else {
      enhancedPrompt += ' Professional quality, suitable for business presentations, clean and modern style.';
    }

    // 🌐 重要: 多言語対応 - 日本語テキスト画像生成を禁止
    enhancedPrompt += ' IMPORTANT: Create visual-focused image without Japanese text. Use visual elements, demonstrations, and universal symbols. Avoid embedding Japanese characters in the image. English text (if minimal) is acceptable for technical terms like "STEP 1", "START", "FINISH".';

    console.log('🎯 AZURE IMAGE SERVICE: Final enhanced prompt:', enhancedPrompt);
    console.log('📏 Final prompt length:', enhancedPrompt.length);
    return enhancedPrompt;
  }

  async generateMultipleVariations(basePrompt: string, count: number = 3): Promise<string[]> {
    const variations = [
      'Style A: modern and clean',
      'Style B: creative and engaging', 
      'Style C: professional and formal'
    ];

    const promises = variations.slice(0, count).map(async (variation, index) => {
      const enhancedPrompt = `${basePrompt} ${variation}`;
      return this.generateImage({
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      });
    });

    return Promise.all(promises);
  }
}