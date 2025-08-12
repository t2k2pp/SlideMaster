// =================================================================
// Image Generation Manager - 統合画像生成管理システム
// Phase 4統合: 適正化バリデーション + SVG可視化 + 従来画像生成
// =================================================================

import { ImageContentValidator, type ValidationContext, type ImageValidationResult } from './ImageContentValidator';
import { SVGVisualizationService } from './SVGVisualizationService';

export interface ImageGenerationRequest {
  slideTitle?: string;
  slideContent: string;
  imagePrompt: string;
  topic: string;
  purpose?: string;
  options?: {
    size?: 'square' | 'landscape' | 'portrait';
    quality?: 'low' | 'medium' | 'high';
    style?: 'natural' | 'vivid';
  };
}

export interface ImageGenerationResponse {
  success: boolean;
  result?: {
    type: 'image' | 'svg' | 'skip';
    content: string; // URL for image, SVG content for svg, empty for skip
    originalPrompt?: string;
    modifiedPrompt?: string;
    reason?: string;
  };
  error?: string;
}

/**
 * 🎯 Phase 4統合: インテリジェント画像生成管理システム
 * バリデーション → 適切な生成方法選択 → 実行
 */
export class ImageGenerationManager {
  private validator: ImageContentValidator;
  private svgService: SVGVisualizationService;
  
  constructor(
    private generateImageFn?: (prompt: string, options?: any) => Promise<string>
  ) {
    this.validator = new ImageContentValidator();
    this.svgService = new SVGVisualizationService();
  }

  /**
   * 🚀 Phase 4統合: インテリジェント画像生成
   * 1. バリデーション → 2. 適切な方法選択 → 3. 実行
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    console.log('🎨 Starting intelligent image generation:', {
      topic: request.topic,
      prompt: request.imagePrompt.substring(0, 50) + '...'
    });

    try {
      // Phase 4.1: バリデーション実行
      const validationContext: ValidationContext = {
        slideTitle: request.slideTitle,
        slideContent: request.slideContent,
        imagePrompt: request.imagePrompt,
        topic: request.topic,
        purpose: request.purpose
      };

      const validation = this.validator.validateImageGeneration(validationContext);

      // バリデーション結果に基づく処理分岐
      switch (validation.suggestedAction) {
        case 'skip':
          console.log('⏭️ Image generation skipped:', validation.reason);
          return {
            success: true,
            result: {
              type: 'skip',
              content: '',
              reason: validation.reason
            }
          };

        case 'use_svg':
          console.log('📊 Generating SVG visualization:', validation.reason);
          return await this.handleSVGGeneration(request, validation);

        case 'generate':
          console.log('🖼️ Proceeding with image generation');
          return await this.handleImageGeneration(request, validation);

        default:
          throw new Error(`Unknown validation action: ${validation.suggestedAction}`);
      }

    } catch (error) {
      console.error('❌ Image generation manager error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * SVG可視化の処理
   */
  private async handleSVGGeneration(
    request: ImageGenerationRequest, 
    validation: ImageValidationResult
  ): Promise<ImageGenerationResponse> {
    try {
      let svgContent: string;

      if (validation.svgContent) {
        // バリデータが生成したSVGを使用
        svgContent = validation.svgContent;
        console.log('✅ Using validator-generated SVG');
      } else {
        // コンテンツから動的にSVG生成
        const generatedSVG = this.svgService.generateFromContent(request.slideContent);
        if (generatedSVG) {
          svgContent = generatedSVG;
          console.log('✅ Generated dynamic SVG from content');
        } else {
          console.log('⚠️ No extractable data, creating placeholder SVG');
          svgContent = this.createPlaceholderSVG(request.topic);
        }
      }

      return {
        success: true,
        result: {
          type: 'svg',
          content: svgContent,
          originalPrompt: request.imagePrompt,
          reason: validation.reason
        }
      };

    } catch (error) {
      console.error('❌ SVG generation failed:', error);
      // SVG生成失敗時は画像生成にフォールバック
      return await this.handleImageGeneration(request, {
        isAppropriate: true,
        suggestedAction: 'generate',
        reason: 'SVG generation failed, falling back to image'
      });
    }
  }

  /**
   * 従来の画像生成の処理
   */
  private async handleImageGeneration(
    request: ImageGenerationRequest,
    validation: ImageValidationResult
  ): Promise<ImageGenerationResponse> {
    if (!this.generateImageFn) {
      return {
        success: false,
        error: 'Image generation function not provided'
      };
    }

    try {
      const promptToUse = validation.suggestedPrompt || request.imagePrompt;
      const imageUrl = await this.generateImageFn(promptToUse, request.options);

      console.log('✅ Image generation completed successfully');

      return {
        success: true,
        result: {
          type: 'image',
          content: imageUrl,
          originalPrompt: request.imagePrompt,
          modifiedPrompt: validation.suggestedPrompt ? promptToUse : undefined,
          reason: validation.reason
        }
      };

    } catch (error) {
      console.error('❌ Image generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image generation failed'
      };
    }
  }

  /**
   * プレースホルダーSVGの作成
   */
  private createPlaceholderSVG(topic: string): string {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('育て方') || topicLower.includes('栽培') || topicLower.includes('植物')) {
      return this.createPlantPlaceholderSVG();
    } else if (topicLower.includes('料理') || topicLower.includes('レシピ')) {
      return this.createCookingPlaceholderSVG();
    } else if (topicLower.includes('ビジネス') || topicLower.includes('データ')) {
      return this.createBusinessPlaceholderSVG();
    } else {
      return this.createGenericPlaceholderSVG();
    }
  }

  private createPlantPlaceholderSVG(): string {
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f0f8f0"/>
      <circle cx="150" cy="160" r="60" fill="#8B4513"/>
      <rect x="140" y="80" width="20" height="80" fill="#228B22"/>
      <ellipse cx="120" cy="60" rx="15" ry="20" fill="#32CD32"/>
      <ellipse cx="180" cy="60" rx="15" ry="20" fill="#32CD32"/>
      <ellipse cx="150" cy="40" rx="18" ry="25" fill="#32CD32"/>
      <text x="150" y="190" text-anchor="middle" font-size="12" fill="#666">🌱 栽培・園芸</text>
    </svg>`;
  }

  private createCookingPlaceholderSVG(): string {
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#fff8f0"/>
      <circle cx="150" cy="120" r="50" fill="#FFB347"/>
      <rect x="130" y="100" width="40" height="40" fill="#FF6347"/>
      <circle cx="135" cy="105" r="3" fill="#FFF"/>
      <circle cx="165" cy="105" r="3" fill="#FFF"/>
      <path d="M 140 125 Q 150 135 160 125" stroke="#FFF" stroke-width="2" fill="none"/>
      <text x="150" y="190" text-anchor="middle" font-size="12" fill="#666">🍳 料理・レシピ</text>
    </svg>`;
  }

  private createBusinessPlaceholderSVG(): string {
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f8f9fa"/>
      <rect x="50" y="150" width="40" height="30" fill="#4A90E2"/>
      <rect x="110" y="130" width="40" height="50" fill="#50C878"/>
      <rect x="170" y="110" width="40" height="70" fill="#FFB347"/>
      <rect x="230" y="140" width="40" height="40" fill="#FF6B6B"/>
      <text x="150" y="190" text-anchor="middle" font-size="12" fill="#666">📊 ビジネス・データ</text>
    </svg>`;
  }

  private createGenericPlaceholderSVG(): string {
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f5f5f5"/>
      <circle cx="150" cy="100" r="40" fill="#ddd" stroke="#bbb" stroke-width="2"/>
      <text x="150" y="105" text-anchor="middle" font-size="24" fill="#999">📋</text>
      <text x="150" y="180" text-anchor="middle" font-size="12" fill="#666">コンテンツ</text>
    </svg>`;
  }

  /**
   * バッチ画像生成（複数スライド対応）
   */
  async generateImagesForSlides(requests: ImageGenerationRequest[]): Promise<ImageGenerationResponse[]> {
    console.log(`🚀 Starting batch image generation for ${requests.length} slides`);
    
    const results: ImageGenerationResponse[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      console.log(`📷 Processing slide ${i + 1}/${requests.length}`);
      const result = await this.generateImage(requests[i]);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch generation completed: ${successful}/${requests.length} successful`);

    return results;
  }
}