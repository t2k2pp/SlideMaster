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
    // コンテンツ（トピック）を尊重し、スタイルはタッチのみを指定
    const topic = imageContext?.topic || slideContent;
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    // contextIntelligenceResourcesからスタイル指示を取得し、{topic}を置換
    const stylePrompt = contextIntelligenceResources.styleStrategies.marketingOriented.imagePrompt
      .replace(/{topic}/g, topic);
    
    return `${stylePrompt}

${consistencyInstruction}

Create a visually striking and engaging image that accurately represents the topic while applying only the specified visual touch style.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['visual-impact', 'hero-focused', 'brand-centric'],
      imagePositioning: 'dominant' as const,
      textDensity: 'minimal' as const
    };
  }

  // 削除：コンテンツ分析による固定的なスタイル指示は廃止
  // スタイルはタッチのみを指定し、コンテンツ（トピック）は画像生成で尊重される

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