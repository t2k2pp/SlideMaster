// =================================================================
// Marketing Style Strategy - マーケティング重視スタイル
// ビジュアルインパクト、製品・サービス訴求、魅力的なデザイン
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export class MarketingStyleStrategy extends BaseDesignerStrategy {
  readonly designerId = 'marketing-oriented' as const;
  readonly designerName = 'Marketing Style';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);
    const jsonStructureInstructions = this.getJsonStructureInstructions(request);

    let template = contextIntelligenceResources.styleStrategies.marketingOriented.contentPrompt;
    return template
      .replace(/{topic}/g, request.topic)
      .replace(/{themeInstructions}/g, themeInstructions)
      .replace(/{slideCountInstructions}/g, slideCountInstructions)
      .replace(/{imageInstructions}/g, imageInstructions)
      .replace(/{jsonStructureInstructions}/g, jsonStructureInstructions);
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    // マーケティング向け：AI判断による魅力的な訴求画像
    const marketingContext = this.analyzeMarketingContent(slideContent);
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    return `Create a compelling marketing image that captures attention and communicates value:

Content: ${slideContent}

Marketing context: ${marketingContext.focus}
Target emotion: ${marketingContext.emotion}
Visual approach: ${marketingContext.approach}

${consistencyInstruction}

${contextIntelligenceResources.styleStrategies.marketingOriented.imagePrompt}

Make it visually striking and persuasive while maintaining professionalism.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['visual-impact', 'hero-focused', 'brand-centric'],
      imagePositioning: 'dominant' as const,
      textDensity: 'minimal' as const
    };
  }

  private analyzeMarketingContent(content: string): {
    focus: string;
    emotion: string;
    approach: string;
  } {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('製品') || lowerContent.includes('商品') || 
        lowerContent.includes('サービス') || lowerContent.includes('ブランド')) {
      return {
        focus: 'product-showcase',
        emotion: 'desire and trust',
        approach: 'product photography style, premium feel'
      };
    }
    
    if (lowerContent.includes('効果') || lowerContent.includes('メリット') || 
        lowerContent.includes('利益') || lowerContent.includes('価値')) {
      return {
        focus: 'benefits-highlighting',
        emotion: 'excitement and satisfaction',
        approach: 'before/after concepts, success imagery'
      };
    }
    
    return {
      focus: 'brand-communication',
      emotion: 'engagement and interest',
      approach: 'lifestyle imagery, aspirational visuals'
    };
  }

  /**
   * 画像一貫性レベルに応じた指示を生成
   */
  private getConsistencyInstruction(level: 'high' | 'medium' | 'low'): string {
    switch (level) {
      case 'high':
        return 'CONSISTENCY REQUIREMENT: Maintain strict brand consistency. Use the same color palette, photography style, typography treatment, and visual language throughout. All images should feel like part of a cohesive marketing campaign.';
      case 'medium':
        return 'CONSISTENCY REQUIREMENT: Keep consistent marketing tone and general visual approach. Use similar color schemes and maintain brand personality across images.';
      case 'low':
        return 'CONSISTENCY REQUIREMENT: Focus on individual impact over consistency. Each image should be optimized for maximum persuasive effect while maintaining professional quality.';
      default:
        return '';
    }
  }
}