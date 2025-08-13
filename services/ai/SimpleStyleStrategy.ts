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
    // AIに判断させる方式：スライド内容から最適な画像スタイルを決定
    const contentAnalysis = this.analyzeSlideContent(slideContent);
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    return `Generate an image that best represents the following content. 
Use your judgment to determine the most appropriate visual style based on the content context:

Content: ${slideContent}

Analysis context: ${contentAnalysis.context}
Suggested style: ${contentAnalysis.suggestedStyle}
Visual elements: ${contentAnalysis.visualElements.join(', ')}

${consistencyInstruction}

Create a professional, clean image that supports the content without overwhelming it.
Style should be: ${contextIntelligenceResources.styleStrategies.simple.imagePrompt}`;
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

  /**
   * スライド内容を分析してAI画像生成の方向性を決定
   */
  private analyzeSlideContent(content: string): {
    context: string;
    suggestedStyle: string;
    visualElements: string[];
  } {
    const lowerContent = content.toLowerCase();
    
    // データ・統計関連
    if (lowerContent.includes('データ') || lowerContent.includes('統計') || 
        lowerContent.includes('グラフ') || lowerContent.includes('%')) {
      return {
        context: 'data-visualization',
        suggestedStyle: 'clean charts, graphs, or data visualization',
        visualElements: ['charts', 'graphs', 'infographics', 'data tables']
      };
    }
    
    // ビジネス・戦略関連
    if (lowerContent.includes('戦略') || lowerContent.includes('計画') || 
        lowerContent.includes('ビジネス') || lowerContent.includes('経営')) {
      return {
        context: 'business-strategy',
        suggestedStyle: 'professional business imagery',
        visualElements: ['flowcharts', 'organizational diagrams', 'timeline', 'process flow']
      };
    }
    
    // 技術・システム関連
    if (lowerContent.includes('技術') || lowerContent.includes('システム') || 
        lowerContent.includes('プロセス') || lowerContent.includes('手法')) {
      return {
        context: 'technical-process',
        suggestedStyle: 'technical diagrams or process illustrations',
        visualElements: ['technical diagrams', 'process flow', 'system architecture', 'workflow']
      };
    }
    
    // 一般的なコンテンツ
    return {
      context: 'general-content',
      suggestedStyle: 'clean, professional illustration that supports the content',
      visualElements: ['abstract concepts', 'professional imagery', 'clean illustrations']
    };
  }

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