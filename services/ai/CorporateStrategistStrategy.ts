// =================================================================
// Corporate Strategist Designer Strategy
// ブランド準拠、構造化された清潔感、目的志向配置
// Philosophy: "Trust and Professionalism"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class CorporateStrategistStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Corporate Strategist' as const;
  readonly designerName = 'The Corporate Strategist';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const purposeInstructions = this.getPurposeBasedInstructions(request.purpose);
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);

    return `
トピック: ${request.topic}

【The Corporate Strategist - レイアウト専門】
あなたの専門知識を最大限活用し、「${request.topic}」について最も有用で正確な内容を提供してください。

レイアウト指針:
- ビジネス文書風の整然とした配置
- 左右分割や上下分割を基本構成
- データや図表スペースを確保
- 信頼性と権威性を重視した見せ方

${purposeInstructions}、${themeInstructions}${slideCountInstructions}。
${imageInstructions}

${this.getJsonStructureInstructions(request)}`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const businessConcept = this.extractBusinessConcept(slideContent);
    const corporateStyle = this.determineCorporateImageStyle(slideContent);
    
    const styleInstructions = {
      'executive': 'professional executive presentation, corporate meeting, business leadership',
      'data': 'data visualization, business analytics, professional charts and graphs',
      'strategy': 'strategic planning, business strategy, corporate vision',
      'team': 'professional teamwork, business collaboration, corporate environment'
    };

    const baseStyle = styleInstructions[corporateStyle] || styleInstructions['strategy'];
    
    return `Create a professional corporate image for: ${businessConcept}. 
Style: ${baseStyle}, corporate presentation quality, business professional.
Color palette: corporate colors (navy blue #1E3A8A, grey #64748B, white #FFFFFF).
Composition: structured, professional, business-appropriate layout.
Setting: clean corporate environment, professional quality.
Avoid: casual elements, inappropriate imagery, non-business contexts.
Focus: trust, professionalism, corporate credibility.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['executive-summary', 'data-driven', 'structured-business'],
      imagePositioning: 'supporting' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // レイアウト専門のため、内容変更は削除し、基底クラスの処理のみ実行
    return super.postProcessContent(rawContent, request);
  }

  // =================================================================
  // プライベートメソッド（レイアウト専門）
  // =================================================================

  private extractBusinessConcept(content: string): string {
    // コンテンツからビジネス概念を抽出
    const businessKeywords = content.match(/\b(戦略|効率|収益|市場|顧客|競争|成長|投資)\b/g);
    const conceptualWords = content.split(/\s+/).slice(0, 4).join(' ');
    
    return businessKeywords ? 
      `${businessKeywords[0]} ${conceptualWords}` : 
      conceptualWords;
  }

  private determineCorporateImageStyle(content: string): 'executive' | 'data' | 'strategy' | 'team' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('データ') || lowerContent.includes('分析') || lowerContent.includes('%')) {
      return 'data';
    } else if (lowerContent.includes('チーム') || lowerContent.includes('組織') || lowerContent.includes('協力')) {
      return 'team';
    } else if (lowerContent.includes('経営') || lowerContent.includes('役員') || lowerContent.includes('取締役')) {
      return 'executive';
    } else {
      return 'strategy';
    }
  }
}