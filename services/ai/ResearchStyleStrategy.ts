// =================================================================
// Research Style Strategy - 研究発表向けスタイル
// 論理的構成、フレームワーク図表、学術的な情報表示
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export class ResearchStyleStrategy extends BaseDesignerStrategy {
  readonly designerId = 'research-presentation-oriented' as const;
  readonly designerName = 'Research Style';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);
    const jsonStructureInstructions = this.getJsonStructureInstructions(request);

    let template = contextIntelligenceResources.styleStrategies.researchPresentationOriented.contentPrompt;
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
    const stylePrompt = contextIntelligenceResources.styleStrategies.researchPresentationOriented.imagePrompt
      .replace(/{topic}/g, specificContent);
    
    return `${stylePrompt}

${consistencyInstruction}

Create a clear, accurate image that supports academic understanding while accurately representing the specific slide content and applying only the specified visual touch style.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['academic-structure', 'research-format', 'data-heavy'],
      imagePositioning: 'supporting' as const,
      textDensity: 'detailed' as const
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
        return 'CONSISTENCY REQUIREMENT: Maintain strict academic visual standards. Use the same diagram style, color coding system, typography, and chart formatting throughout. All visuals should look like they belong to the same research publication.';
      case 'medium':
        return 'CONSISTENCY REQUIREMENT: Keep consistent academic tone and visual approach. Use similar chart styles, color schemes, and maintain scholarly presentation standards.';
      case 'low':
        return 'CONSISTENCY REQUIREMENT: Focus on content accuracy and clarity over visual consistency. Each image should be optimized for academic understanding while maintaining professional standards.';
      default:
        return '';
    }
  }
}