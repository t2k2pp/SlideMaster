// =================================================================
// Vivid Creator Designer Strategy
// 大胆な構図、鮮やかな色彩、トレンド反映
// Philosophy: "Don't Be Boring"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class VividCreatorStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Vivid Creator' as const;
  readonly designerName = 'The Vivid Creator';

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

【デザイナー: The Vivid Creator】
哲学: "Don't Be Boring" - つまらないものは作らない

デザイン原則:
- 大胆な構図: 型にはまらない革新的なレイアウト
- 鮮やかな色彩: 記憶に残る印象的なカラーパレット
- トレンド反映: 最新のデザイントレンドを積極採用
- インパクト重視: 一目で印象に残るビジュアル表現

クリエイティブアプローチ:
1. 予想を裏切る意外性のある展開
2. 視覚的なサプライズ要素の組み込み
3. 記憶に残るキャッチーな表現
4. エネルギッシュで活力のあるトーン
5. 型破りなレイアウトの積極的採用

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

具体的な要求:
1. 各スライドに「驚き」の要素を1つ以上組み込む
2. 活気のあるアクションワードを多用
3. 比喩や例えを創造的に活用
4. 読み手の想像力を刺激する表現
5. エネルギッシュで前向きなメッセージ
6. 常識を破る新しい視点を提示
${imageInstructions}

レイアウト要求:
- 非対称で動的な構図を積極採用
- 鮮やかな色彩（#FF6B6B, #4ECDC4, #45B7D1, #96CEB4など）
- テキストサイズのバリエーションを大胆に使用
- グラデーションやシャドウ効果を効果的に活用
- 視線の流れを意識した動的配置

インパクト表現の指示:
- 「想像を超える」「革命的な」「驚愕の」
- 「今までにない」「画期的な」「劇的な変化」
- 「目からウロコ」「常識を覆す」「新次元」
- 感嘆符を効果的に使用（但し過度に使わない）

トレンド要素:
- ネオモルフィズム風の柔らかな立体感
- グラスモルフィズム風の透明感
- グラデーションの効果的な活用
- アシンメトリーレイアウト

${this.getJsonStructureInstructions(request)}

注意: 保守的な表現を避け、革新的で記憶に残る印象的なプレゼンテーションを作成すること。視覚的インパクトを最優先に。`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const creativeConcept = this.extractCreativeConcept(slideContent);
    const energyLevel = this.detectEnergyLevel(slideContent);
    const visualStyle = this.selectTrendyStyle();
    
    const styleInstructions = {
      'high': 'dynamic composition, vibrant colors, high energy, explosive impact',
      'medium': 'engaging visuals, bright colors, creative approach, modern style',
      'creative': 'artistic interpretation, unique perspective, innovative design'
    };

    const baseStyle = styleInstructions[energyLevel] || styleInstructions['creative'];
    
    return `Create a vivid, impactful image for: ${creativeConcept}. 
Style: ${baseStyle}, ${visualStyle}, cutting-edge design.
Color palette: bold and vibrant (electric blue #4ECDC4, coral #FF6B6B, lime #96CEB4, sunset orange #FFA726).
Composition: asymmetric, dynamic, rule-breaking layout.
Mood: energetic, innovative, memorable, attention-grabbing.
Effects: gradients, subtle shadows, modern depth.
No text in image, pure visual impact focus.
Trending design elements: ${this.getTrendingElements()}`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['asymmetric', 'dynamic-flow', 'creative-grid'],
      imagePositioning: 'dominant' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Vivid Creator特有の後処理
    let processed = rawContent;
    
    // 動的レイアウトの適用
    processed = this.applyDynamicLayout(processed);
    
    // インパクト表現の追加
    processed = this.addImpactExpressions(processed);
    
    // 鮮やかな色彩の適用
    processed = this.applyVividColors(processed);
    
    // トレンド要素の追加
    processed = this.addTrendingElements(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private extractCreativeConcept(content: string): string {
    // コンテンツからクリエイティブな概念を抽出
    const actionWords = content.match(/\b(創造|革新|変革|挑戦|突破|発見|実現)\b/g);
    const keyPhrases = content.split(/[。．！？]/).filter(s => s.length > 10).slice(0, 2);
    
    const conceptBase = keyPhrases.join(' ') || content.substring(0, 50);
    const creativeModifier = actionWords ? actionWords[0] : '革新的な';
    
    return `${creativeModifier} ${conceptBase}`;
  }

  private detectEnergyLevel(content: string): 'high' | 'medium' | 'creative' {
    const highEnergyWords = ['革命', '爆発', '劇的', '衝撃', '驚愕'];
    const mediumEnergyWords = ['新しい', '革新', '創造', '挑戦'];
    
    const lowerContent = content.toLowerCase();
    
    if (highEnergyWords.some(word => lowerContent.includes(word))) {
      return 'high';
    } else if (mediumEnergyWords.some(word => lowerContent.includes(word))) {
      return 'medium';
    } else {
      return 'creative';
    }
  }

  private selectTrendyStyle(): string {
    const trendyStyles = [
      'neumorphism-inspired soft depth',
      'glassmorphism transparency effects',
      'gradient mesh backgrounds',
      'abstract geometric shapes',
      'organic flowing forms',
      'cyber-punk aesthetics'
    ];
    
    return trendyStyles[Math.floor(Math.random() * trendyStyles.length)];
  }

  private getTrendingElements(): string {
    const elements = [
      'floating elements, subtle shadows',
      'geometric overlays, transparency layers',
      'organic curves, flowing gradients',
      'neon accents, glowing effects'
    ];
    
    return elements[Math.floor(Math.random() * elements.length)];
  }

  private applyDynamicLayout(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, slideIndex: number) => {
          if (slide.layers) {
            // 動的レイアウトパターンの適用
            const layoutPattern = this.getDynamicLayoutPattern(slideIndex, slide.layers.length);
            
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                const position = layoutPattern[layerIndex] || layoutPattern[0];
                Object.assign(layer, position);
                
                // フォントサイズのバリエーション（動的調整）
                layer.fontSize = this.getVividFontSize(layerIndex, layer.content || '', position.width, position.height);
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

  private addImpactExpressions(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text' && layer.content) {
                layer.content = this.enhanceWithImpactWords(layer.content, layerIndex);
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

  private applyVividColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      // Vivid Creatorのカラーパレット
      const vividColors = {
        backgrounds: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
        texts: ['#FFFFFF', '#2C3E50', '#34495E'],
        accents: ['#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C']
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          // 背景色をローテーション
          slide.background = vividColors.backgrounds[index % vividColors.backgrounds.length];
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                if (layerIndex === 0) {
                  // タイトルは白または濃い色
                  layer.textColor = vividColors.texts[0];
                } else {
                  // 本文はアクセントカラー
                  layer.textColor = vividColors.accents[layerIndex % vividColors.accents.length];
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

  private addTrendingElements(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          // トレンド要素のメタデータを追加
          if (!slide.metadata) slide.metadata = {};
          slide.metadata.trendingStyle = this.selectTrendyStyle();
          slide.metadata.visualEffects = ['gradient', 'shadow', 'asymmetric'];
          
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private getDynamicLayoutPattern(slideIndex: number, layerCount: number): Array<{
    x: number; y: number; width: number; height: number;
  }> {
    // 非対称で動的なレイアウトパターン
    const patterns = [
      // パターン1: 左上主導
      [
        { x: 5, y: 5, width: 60, height: 25 },    // タイトル
        { x: 10, y: 35, width: 50, height: 20 },  // メインコンテンツ
        { x: 65, y: 25, width: 30, height: 35 },  // サブコンテンツ
      ],
      // パターン2: 中央分散
      [
        { x: 20, y: 10, width: 60, height: 20 },  // タイトル
        { x: 5, y: 40, width: 40, height: 25 },   // 左コンテンツ
        { x: 55, y: 45, width: 40, height: 20 },  // 右コンテンツ
      ],
      // パターン3: 右重心
      [
        { x: 30, y: 5, width: 65, height: 25 },   // タイトル
        { x: 5, y: 35, width: 45, height: 30 },   // 左コンテンツ
        { x: 55, y: 35, width: 40, height: 30 },  // 右コンテンツ
      ]
    ];
    
    const pattern = patterns[slideIndex % patterns.length];
    return pattern.slice(0, layerCount);
  }

  private getVividFontSize(layerIndex: number, content: string, width?: number, height?: number): number {
    // 文章量に応じた動的サイズ計算を使用
    if (width && height) {
      const optimalSize = this.calculateOptimalFontSize(content, width, height);
      
      // Vivid Creator特有の大胆な調整
      if (layerIndex === 0) {
        // タイトルは特に大胆に
        return Math.min(optimalSize + 12, 52);
      } else if (layerIndex === 1) {
        // メインコンテンツは目立つように
        return Math.max(optimalSize + 4, 26);
      } else {
        // サブコンテンツも十分な大きさを確保
        return Math.max(optimalSize, 20);
      }
    }
    
    // フォールバック（大胆なサイズ設定）
    const textLength = content.length;
    if (layerIndex === 0) {
      return textLength < 20 ? 48 : 40; // タイトルをより大胆に
    } else if (layerIndex === 1) {
      return 28; // メインコンテンツを大きく
    } else {
      return 22; // サブコンテンツも読みやすく
    }
  }

  private enhanceWithImpactWords(text: string, layerIndex: number): string {
    if (layerIndex === 0) {
      // タイトルにインパクト表現を追加
      const impactPrefixes = ['🚀 ', '⚡ ', '🎯 ', '💫 '];
      const randomPrefix = impactPrefixes[Math.floor(Math.random() * impactPrefixes.length)];
      return `${randomPrefix}${text}`;
    }
    
    // 本文にエネルギッシュな表現を追加
    const energeticEnhancements = [
      { from: /重要/, to: '超重要' },
      { from: /良い/, to: '素晴らしい' },
      { from: /できる/, to: '実現できる' },
      { from: /効果/, to: '劇的な効果' }
    ];
    
    let enhanced = text;
    const randomEnhancement = energeticEnhancements[Math.floor(Math.random() * energeticEnhancements.length)];
    enhanced = enhanced.replace(randomEnhancement.from, randomEnhancement.to);
    
    return enhanced;
  }
}