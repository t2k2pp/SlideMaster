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
    // 研究発表向け：AI判断による論理的支援画像
    const researchContext = this.analyzeResearchContent(slideContent);
    
    // 画像一貫性設定を考慮
    const consistencyLevel = imageContext?.imageConsistencyLevel || 'medium';
    const consistencyInstruction = this.getConsistencyInstruction(consistencyLevel);
    
    return `Create a research-appropriate visual that supports academic understanding:

Content: ${slideContent}

Research context: ${researchContext.category}
Academic focus: ${researchContext.focus}
Visualization type: ${researchContext.visualType}

${consistencyInstruction}

${contextIntelligenceResources.styleStrategies.researchPresentationOriented.imagePrompt}

Prioritize clarity, accuracy, and academic appropriateness over visual appeal.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['academic-structure', 'research-format', 'data-heavy'],
      imagePositioning: 'supporting' as const,
      textDensity: 'detailed' as const
    };
  }

  private analyzeResearchContent(content: string): {
    category: string;
    focus: string;
    visualType: string;
  } {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('データ') || lowerContent.includes('統計') || 
        lowerContent.includes('結果') || lowerContent.includes('分析')) {
      return {
        category: 'data-analysis',
        focus: 'empirical evidence and statistical findings',
        visualType: 'charts, graphs, statistical visualizations'
      };
    }
    
    if (lowerContent.includes('理論') || lowerContent.includes('モデル') || 
        lowerContent.includes('フレームワーク') || lowerContent.includes('概念')) {
      return {
        category: 'theoretical-framework',
        focus: 'conceptual models and theoretical structures',
        visualType: 'conceptual diagrams, framework illustrations'
      };
    }
    
    if (lowerContent.includes('手法') || lowerContent.includes('方法') || 
        lowerContent.includes('プロセス') || lowerContent.includes('アプローチ')) {
      return {
        category: 'methodology',
        focus: 'research methods and processes',
        visualType: 'process flow, methodology diagrams'
      };
    }
    
    return {
      category: 'general-research',
      focus: 'academic knowledge communication',
      visualType: 'academic-style illustrations, clean diagrams'
    };
  }

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