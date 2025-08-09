// =================================================================
// Amateur Designer Strategy
// 4パターンローテーション、単調な構成、予測可能な配置
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

【デザイナー: Amateur Designer】
哲学: "Simple and Predictable" - シンプルで予測可能な構成

デザイン原則:
- 4パターンローテーション: 基本的な4つのレイアウトを機械的に繰り返し
- 単調な構成: 統一性重視、変化は最小限
- 予測可能な配置: 一目で理解できる標準的なレイアウト
- 安全重視: 冒険しない、確実な表現方法

基本アプローチ:
1. テンプレート化された構成の使用
2. 標準的な表現方法の採用
3. 装飾を控えめにした実用重視
4. 読みやすさと理解しやすさを最優先
5. 複雑な表現は避けてシンプルに

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

具体的な要求:
1. 各スライドは基本的な情報伝達のみに集中
2. 箇条書きを多用し、構造を明確化
3. 専門用語は避け、分かりやすい言葉を使用
4. 装飾的表現は最小限に抑制
5. 標準的なビジネス表現を採用
6. 情報量は適度に抑制（詰め込みすぎない）
${imageInstructions}

レイアウト要求:
- 4つの基本パターンを順番に適用
- パターン1: タイトル上、コンテンツ中央
- パターン2: タイトル上、コンテンツ左寄せ
- パターン3: タイトル上、コンテンツ中央（箇条書き）
- パターン4: タイトル上、コンテンツ左右2列
- 色彩は控えめ（白、グレー、黒を基調）
- フォントサイズは標準的な階層構造

基本表現の指示:
- 「重要なポイント」「主な内容」「まとめ」
- 「以下の通りです」「次のようになります」
- 「ポイント1」「ポイント2」「ポイント3」
- 「ご質問はございませんか」

${this.getJsonStructureInstructions(request)}

注意: 創造性や独創性よりも、分かりやすさと安定性を最優先に構成すること。`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const basicConcept = this.extractBasicConcept(slideContent);
    
    return `Create a simple, basic image for: ${basicConcept}. 
Style: simple illustration, basic design, amateur level.
Color palette: basic colors (white, light grey, dark grey, simple blue).
Composition: straightforward, centered, no complex layouts.
Quality: standard, functional, not artistic.
Elements: basic shapes, simple icons, minimal decoration.
Focus: clear communication over visual appeal.
No advanced design techniques, keep it simple and functional.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['basic-template', 'simple-structure', 'standard-format'],
      imagePositioning: 'supporting' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Amateur Designer特有の後処理
    let processed = rawContent;
    
    // 4パターンレイアウトの適用
    processed = this.applyFourPatternLayout(processed);
    
    // 基本的な色彩の適用
    processed = this.applyBasicColors(processed);
    
    // 標準的な表現の適用
    processed = this.applyStandardExpressions(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private extractBasicConcept(content: string): string {
    // コンテンツから基本概念を抽出（シンプルに）
    const words = content.split(/\s+/);
    return words.slice(0, 3).join(' '); // 最初の3単語のみ
  }

  private applyFourPatternLayout(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, slideIndex: number) => {
          const patternNumber = (slideIndex % 4) + 1;
          
          if (slide.layers) {
            const patternLayout = this.getFourPatternLayout(patternNumber, slide.layers.length);
            
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                const position = patternLayout[layerIndex] || patternLayout[0];
                Object.assign(layer, position);
                
                // 基本的なフォントサイズ（文章量に応じて調整）
                const layerWidth = patternLayout[layerIndex]?.width || 80;
                const layerHeight = patternLayout[layerIndex]?.height || 20;
                layer.fontSize = this.getBasicFontSize(layerIndex, layer.content, layerWidth, layerHeight);
                
                // パターンに応じたテキスト配置
                layer.textAlign = this.getPatternTextAlign(patternNumber, layerIndex);
              }
              return layer;
            });
          }
          
          // パターン情報をメタデータに保存
          if (!slide.metadata) slide.metadata = {};
          slide.metadata.layoutPattern = patternNumber;
          
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private applyBasicColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      const basicColors = {
        background: '#FFFFFF',    // 白
        title: '#333333',         // ダークグレー
        text: '#666666',          // グレー
        accent: '#4A90E2'         // ベーシックブルー
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          slide.background = basicColors.background;
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                if (layerIndex === 0) {
                  layer.textColor = basicColors.title; // タイトル
                } else {
                  layer.textColor = basicColors.text; // 本文
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

  private applyStandardExpressions(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text' && layer.content) {
                if (layerIndex > 0) {
                  // 本文に標準的な接続詞を追加
                  layer.content = this.addStandardConnectors(layer.content, layerIndex);
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

  private getFourPatternLayout(patternNumber: number, layerCount: number): Array<{
    x: number; y: number; width: number; height: number;
  }> {
    const margin = 10;
    
    switch (patternNumber) {
      case 1: // パターン1: タイトル上、コンテンツ中央
        return [
          { x: margin, y: 10, width: 100 - 2 * margin, height: 15 }, // タイトル
          { x: margin + 5, y: 30, width: 100 - 2 * margin - 10, height: 40 }, // メインコンテンツ
          { x: margin + 5, y: 75, width: 100 - 2 * margin - 10, height: 15 }, // 補足
        ].slice(0, layerCount);
        
      case 2: // パターン2: タイトル上、コンテンツ左寄せ
        return [
          { x: margin, y: 10, width: 100 - 2 * margin, height: 15 }, // タイトル
          { x: margin, y: 30, width: 70, height: 40 }, // メインコンテンツ
          { x: margin, y: 75, width: 70, height: 15 }, // 補足
        ].slice(0, layerCount);
        
      case 3: // パターン3: タイトル上、コンテンツ中央（箇条書き）
        return [
          { x: margin, y: 10, width: 100 - 2 * margin, height: 15 }, // タイトル
          { x: margin + 10, y: 35, width: 100 - 2 * margin - 20, height: 35 }, // リスト
          { x: margin + 10, y: 75, width: 100 - 2 * margin - 20, height: 15 }, // 補足
        ].slice(0, layerCount);
        
      case 4: // パターン4: タイトル上、コンテンツ左右2列
      default:
        return [
          { x: margin, y: 10, width: 100 - 2 * margin, height: 15 }, // タイトル
          { x: margin, y: 30, width: 45, height: 40 }, // 左コンテンツ
          { x: 55, y: 30, width: 35, height: 40 }, // 右コンテンツ
        ].slice(0, layerCount);
    }
  }

  private getPatternTextAlign(patternNumber: number, layerIndex: number): string {
    if (layerIndex === 0) return 'center'; // タイトルは常に中央
    
    switch (patternNumber) {
      case 1:
      case 3:
        return 'center'; // 中央寄せパターン
      case 2:
      case 4:
      default:
        return 'left'; // 左寄せパターン
    }
  }

  private getBasicFontSize(layerIndex: number, content?: string, width?: number, height?: number): number {
    // 文章量に応じた動的サイズ計算を使用
    if (content && width && height) {
      const optimalSize = this.calculateOptimalFontSize(content, width, height);
      
      // レイヤーの種類による調整
      if (layerIndex === 0) {
        return Math.min(optimalSize + 8, 48); // タイトルは少し大きく
      } else {
        return optimalSize;
      }
    }
    
    // フォールバック（従来の固定サイズより大きく設定）
    const sizes = [36, 28, 24]; // 基本サイズを上げる
    return sizes[Math.min(layerIndex, sizes.length - 1)];
  }

  private addStandardConnectors(text: string, layerIndex: number): string {
    const connectors = [
      'まず、',
      '次に、',
      'また、',
      'さらに、',
      '最後に、',
      'なお、'
    ];
    
    // 全ての文に接続詞を追加するわけではない（機械的になりすぎるのを防ぐ）
    if (layerIndex <= 3 && Math.random() > 0.5) {
      const connector = connectors[Math.min(layerIndex - 1, connectors.length - 1)];
      return `${connector}${text}`;
    }
    
    return text;
  }
}