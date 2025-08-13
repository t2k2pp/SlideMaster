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
    // 教育向け：AI判断による適切な学習支援画像
    const learningContext = this.analyzeLearningContent(slideContent);
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    return `Create an educational image that helps students understand this content:

Content: ${slideContent}

Educational context: ${learningContext.type}
Learning objective: ${learningContext.objective}
Appropriate visual style: ${learningContext.visualStyle}

${consistencyInstruction}

${contextIntelligenceResources.styleStrategies.education.imagePrompt}

Make it engaging and age-appropriate for the learning context.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['education-friendly', 'step-by-step', 'large-text'],
      imagePositioning: 'dominant' as const,
      textDensity: 'minimal' as const
    };
  }

  private analyzeLearningContent(content: string): {
    type: string;
    objective: string;
    visualStyle: string;
  } {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('子ども') || lowerContent.includes('こども') || 
        lowerContent.includes('小学') || lowerContent.includes('幼児')) {
      return {
        type: 'children-education',
        objective: 'make complex topics simple and fun for children',
        visualStyle: 'colorful, cartoon-like, friendly characters'
      };
    }
    
    if (lowerContent.includes('手順') || lowerContent.includes('ステップ') || 
        lowerContent.includes('方法') || lowerContent.includes('やり方')) {
      return {
        type: 'step-by-step-learning',
        objective: 'show clear steps or processes',
        visualStyle: 'clear diagrams, numbered steps, process flow'
      };
    }
    
    return {
      type: 'general-education',
      objective: 'support understanding with clear visuals',
      visualStyle: 'educational illustrations, clear and simple'
    };
  }

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