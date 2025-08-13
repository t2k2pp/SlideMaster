// =================================================================
// Simple Style Strategy - シンプルで洗練されたデザイン
// 論理的構成、データ可視化重視、ビジネス・学術・技術系に適応
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export class SimpleStyleStrategy extends BaseDesignerStrategy {
  readonly designerId = 'simple' as const;
  readonly designerName = 'Simple Style';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);
    const jsonStructureInstructions = this.getJsonStructureInstructions(request);

    let template = contextIntelligenceResources.styleStrategies.simple.contentPrompt;
    return template
      .replace(/{topic}/g, request.topic)
      .replace(/{themeInstructions}/g, themeInstructions)
      .replace(/{slideCountInstructions}/g, slideCountInstructions)
      .replace(/{imageInstructions}/g, imageInstructions)
      .replace(/{jsonStructureInstructions}/g, jsonStructureInstructions);
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    // コンテンツ（トピック）を尊重し、スタイルはタッチのみを指定
    const topic = imageContext?.topic || slideContent;
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    // contextIntelligenceResourcesからスタイル指示を取得し、{topic}を置換
    const stylePrompt = contextIntelligenceResources.styleStrategies.simple.imagePrompt
      .replace(/{topic}/g, topic);
    
    return `${stylePrompt}

${consistencyInstruction}

Create a professional, clean image that accurately represents the topic while applying only the specified visual touch style.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['structured-hierarchy', 'simple-clean', 'data-focused'],
      imagePositioning: 'supporting' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Simple style特有の後処理
    let processed = super.postProcessContent(rawContent, request);
    
    // シンプルで洗練された色彩の適用
    processed = this.applySimpleColors(processed);
    
    // 論理的構造の強化
    processed = this.enhanceLogicalStructure(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  // 削除：コンテンツ分析による固定的なスタイル指示は廃止
  // スタイルはタッチのみを指定し、コンテンツ（トピック）は画像生成で尊重される

  private applySimpleColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      const simpleColors = {
        background: '#FFFFFF',     // 純白
        primary: '#2563EB',        // プロフェッショナルブルー
        secondary: '#64748B',      // 洗練されたグレー
        text: '#1E293B',           // 読みやすい濃いグレー
        accent: '#0EA5E9'          // アクセントブルー
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          slide.background = simpleColors.background;
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                if (layerIndex === 0) {
                  layer.textColor = simpleColors.primary; // タイトル
                } else {
                  layer.textColor = simpleColors.text; // 本文
                }
              }
              return layer;
            });
          }
          
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private enhanceLogicalStructure(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, slideIndex: number) => {
          // 論理的構造マーカーの追加
          if (slide.layers && slide.layers.length > 1) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text' && layerIndex > 0 && layer.content) {
                // 階層構造の明確化
                if (!layer.content.trim().startsWith('•') && 
                    !layer.content.trim().startsWith('#') &&
                    layerIndex > 1) {
                  layer.content = `• ${layer.content}`;
                }
              }
              return layer;
            });
          }
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  /**
   * 画像一貫性レベルに応じた指示を生成
   */
  private getConsistencyInstruction(level: 'high' | 'medium' | 'low'): string {
    switch (level) {
      case 'high':
        return 'CONSISTENCY REQUIREMENT: Maintain very high visual consistency across all images. Use the same color palette, art style, lighting, and visual approach throughout the presentation. All images should look like they belong to the same design system.';
      case 'medium':
        return 'CONSISTENCY REQUIREMENT: Maintain moderate visual consistency. Use similar color tones and general style approach, but allow some variation in specific visual elements.';
      case 'low':
        return 'CONSISTENCY REQUIREMENT: Focus on content relevance over visual consistency. Each image should be optimized for its specific content while maintaining basic professional quality.';
      default:
        return '';
    }
  }
}