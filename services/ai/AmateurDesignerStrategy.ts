// =================================================================
// Amateur Designer Strategy
// 親しみやすく自由度の高い配置、カジュアルな見せ方
// Philosophy: "Simple and Predictable"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class AmateurDesignerStrategy extends BaseDesignerStrategy {
  readonly designerId = 'amateur' as const;
  readonly designerName = 'Amateur Designer';

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

【Amateur Designer - レイアウト専門】
あなたの専門知識を最大限活用し、「${request.topic}」について最も有用で正確な内容を提供してください。

レイアウト指針:
- 親しみやすく自由度の高い配置
- カジュアルで話しかけるような見せ方  
- 非対称や動きのある配置も活用
- 堅くならない自然な配置

${purposeInstructions}、${themeInstructions}${slideCountInstructions}。
${imageInstructions}

${this.getJsonStructureInstructions(request)}`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const basicConcept = this.extractBasicConcept(slideContent);
    
    return `Create a simple, approachable image for: ${basicConcept}. 
Style: simple illustration, amateur-friendly design, casual approach.
Color palette: basic friendly colors (white, light grey, simple blue #4A90E2, warm tones).
Composition: straightforward, approachable, not overly complex.
Mood: friendly, casual, accessible to everyone.
Quality: clean and simple, not professional-grade but appealing.
Avoid: complex layouts, corporate formality, intimidating elements.
Focus: approachability, simplicity, warmth.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['simple-patterns', 'basic-structure', 'friendly-approach'],
      imagePositioning: 'balanced' as const,
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

  private extractBasicConcept(content: string): string {
    // コンテンツから基本概念を抽出（シンプルに）
    const words = content.split(/\s+/);
    return words.slice(0, 3).join(' '); // 最初の3単語のみ
  }
}