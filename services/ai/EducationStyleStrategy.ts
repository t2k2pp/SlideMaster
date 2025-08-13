// =================================================================
// Education Style Strategy - 教育向けスタイル
// 大きな文字、イラスト重視、分かりやすい構成
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export class EducationStyleStrategy extends BaseDesignerStrategy {
  readonly designerId = 'education' as const;
  readonly designerName = 'Education Style';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);
    const jsonStructureInstructions = this.getJsonStructureInstructions(request);

    let template = contextIntelligenceResources.styleStrategies.education.contentPrompt;
    return template
      .replace(/{topic}/g, request.topic)
      .replace(/{themeInstructions}/g, themeInstructions)
      .replace(/{slideCountInstructions}/g, slideCountInstructions)
      .replace(/{imageInstructions}/g, imageInstructions)
      .replace(/{jsonStructureInstructions}/g, jsonStructureInstructions);
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    // 各スライドの具体的な内容を使用（全体のトピックではなく）
    const specificContent = slideContent;
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    // contextIntelligenceResourcesからスタイル指示を取得し、{topic}を個別スライド内容に置換
    const stylePrompt = contextIntelligenceResources.styleStrategies.education.imagePrompt
      .replace(/{topic}/g, specificContent);
    
    return `${stylePrompt}

${consistencyInstruction}

Create an engaging, educational image that accurately represents the specific slide content while applying only the specified visual touch style.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['education-friendly', 'step-by-step', 'large-text'],
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
        return 'CONSISTENCY REQUIREMENT: Use the same illustration style, character design (if applicable), color scheme, and visual approach throughout. All educational images should feel like they come from the same textbook or learning material.';
      case 'medium':
        return 'CONSISTENCY REQUIREMENT: Maintain similar educational art style and color harmony. Characters or elements should have consistent design language.';
      case 'low':
        return 'CONSISTENCY REQUIREMENT: Focus on educational effectiveness over visual consistency. Each image should be optimized for learning but maintain basic cohesion.';
      default:
        return '';
    }
  }
}