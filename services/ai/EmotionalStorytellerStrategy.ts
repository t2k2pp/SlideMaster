// =================================================================
// Emotional Storyteller Designer Strategy
// 画像主導配置、魅力的な見せ方、感情的インパクト重視
// Philosophy: "Every Slide Tells a Story"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class EmotionalStorytellerStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Emotional Storyteller' as const;
  readonly designerName = 'The Emotional Storyteller';

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

【The Emotional Storyteller - レイアウト専門】
あなたの専門知識を最大限活用し、「${request.topic}」について最も有用で正確な内容を提供してください。

レイアウト指針:
- 感情的インパクトを重視した魅力的な見せ方
- 画像を大きく配置（40-60%の領域活用）
- つかみのある構成と流れ
- 読み手の心を動かす配置

${purposeInstructions}、${themeInstructions}${slideCountInstructions}。
${imageInstructions}

${this.getJsonStructureInstructions(request)}`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const emotionalTone = this.detectEmotionalTone(slideContent);
    const storyElement = this.extractStoryElement(slideContent);
    
    const styleInstructions = {
      'warm': 'warm emotional illustration, inviting atmosphere, heartwarming',
      'inspiring': 'inspirational visual, uplifting mood, motivational elements',
      'dramatic': 'dramatic composition, emotional tension, compelling visuals',
      'gentle': 'gentle illustration, soft atmosphere, comforting mood'
    };

    const baseStyle = styleInstructions[emotionalTone] || styleInstructions['warm'];
    
    return `Create an emotional storytelling image for: ${storyElement}. 
Style: ${baseStyle}, narrative-driven composition, emotionally engaging.
Color palette: warm and inviting colors (golden #FFD700, warm red #FF6B6B, soft blue #74C0FC).
Composition: story-focused, character-driven, emotionally resonant.
Mood: engaging, heartfelt, memorable storytelling atmosphere.
Visual priority: emotional connection over technical accuracy.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['image-dominant', 'narrative-flow', 'emotional-focus'],
      imagePositioning: 'dominant' as const,
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

  private detectEmotionalTone(content: string): 'warm' | 'inspiring' | 'dramatic' | 'gentle' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('挑戦') || lowerContent.includes('成長') || lowerContent.includes('目標')) {
      return 'inspiring';
    } else if (lowerContent.includes('困難') || lowerContent.includes('問題') || lowerContent.includes('課題')) {
      return 'dramatic';
    } else if (lowerContent.includes('温かい') || lowerContent.includes('優しい') || lowerContent.includes('平和')) {
      return 'gentle';
    } else {
      return 'warm';
    }
  }

  private extractStoryElement(content: string): string {
    // コンテンツから主要なストーリー要素を抽出
    const sentences = content.split(/[。．!\?？]/).filter(s => s.trim().length > 0);
    const keyElement = sentences[0] || content;
    
    return keyElement.substring(0, 100).trim() || 'story element';
  }
}