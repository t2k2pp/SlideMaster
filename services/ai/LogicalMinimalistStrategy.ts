// =================================================================
// Logical Minimalist Designer Strategy
// 極端なミニマリズム、グリッドシステム厳守、モノクローム基調
// Philosophy: "Form Follows Function"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class LogicalMinimalistStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Logical Minimalist' as const;
  readonly designerName = 'The Logical Minimalist';

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

【デザイナー: The Logical Minimalist】
哲学: "Form Follows Function" - 機能が形を決定する

デザイン原則:
- 極端なミニマリズム: 不要な要素は一切排除
- 情報の効率的伝達: 最も重要な情報のみを選択
- グリッドシステム厳守: 整然とした構造的レイアウト
- モノクローム基調: 白・黒・グレーを基調とした色彩

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

具体的な要求:
1. 各スライドのテキスト量を最小限に抑制（キーワードと必須情報のみ）
2. 箇条書きは3点以下に制限
3. フォントサイズは統一感を重視（階層を明確化）
4. 余白を多用して視覚的な呼吸を確保
5. 装飾的要素は完全に排除
6. 論理的な情報の流れを重視
${imageInstructions}

レイアウト要求:
- テキストエリアは上部2/3に配置
- 画像は下部1/3または右側1/3に配置
- 中央寄せを基本とし、左揃えは論理的階層がある場合のみ
- 色は黒 (#000000) と白 (#ffffff) のみ使用

${this.getJsonStructureInstructions(request)}

注意: 情報の効率性を最優先し、視覚的な装飾は一切行わないこと。`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const baseStyle = 'minimalist black and white, clean lines, geometric shapes, high contrast';
    const contentKeywords = this.extractKeywords(slideContent);
    
    return `Create a minimalist image for: ${contentKeywords}. 
Style: ${baseStyle}, professional diagram style, simple icons, no decorative elements.
Color scheme: monochrome (black, white, grey only).
Composition: clean, structured, grid-based layout.
No text in image.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['single-column', 'two-column-structured', 'header-content'],
      imagePositioning: 'supporting' as const,
      textDensity: 'minimal' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Logical Minimalist特有の後処理
    let processed = rawContent;
    
    // テキスト量の削減処理
    processed = this.reduceTextDensity(processed);
    
    // 論理構造の強化
    processed = this.enforceLogicalStructure(processed);
    
    // 色彩の制限
    processed = this.enforceMonochromeColors(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private extractKeywords(content: string): string {
    // コンテンツから重要なキーワードを抽出
    const words = content.split(/\s+/);
    return words.slice(0, 3).join(' '); // 最初の3単語を使用
  }

  private reduceTextDensity(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text' && layer.content) {
                // テキストを要点のみに縮約
                const sentences = layer.content.split(/[。．]/);
                layer.content = sentences.slice(0, 2).join('。') + '。';
                
                // フォントサイズを統一
                // 標準フォントサイズ（文章量と領域サイズに応じて調整）
                const gridPosition = this.calculateGridPosition(layerIndex, slide.layers.length);
                layer.fontSize = this.getStandardFontSize(layer.content, gridPosition.width, gridPosition.height);
              }
              return layer;
            });
          }
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content; // JSON解析失敗時はそのまま返す
    }
  }

  private enforceLogicalStructure(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                // グリッドシステムに基づく配置
                const gridPosition = this.calculateGridPosition(layerIndex, slide.layers.length);
                layer.x = gridPosition.x;
                layer.y = gridPosition.y;
                layer.width = gridPosition.width;
                layer.height = gridPosition.height;
                
                // テキスト配置
                layer.textAlign = layerIndex === 0 ? 'center' : 'left'; // タイトルは中央、本文は左
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

  private enforceMonochromeColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          // 背景は常に白
          slide.background = '#ffffff';
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text') {
                // テキストは常に黒
                layer.textColor = '#000000';
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

  private getStandardFontSize(content: string, width: number = 80, height: number = 20): number {
    // 文章量に応じた動的サイズ計算を使用
    const optimalSize = this.calculateOptimalFontSize(content, width, height);
    
    // ミニマリスト特有の調整（控えめだが読みやすく）
    const textLength = content.length;
    if (textLength < 20) {
      return Math.min(optimalSize + 6, 40); // タイトルは適度に大きく
    } else if (textLength < 50) {
      return Math.max(optimalSize, 26); // サブタイトルは読みやすく
    } else {
      return Math.max(optimalSize, 20); // 本文も十分な大きさを確保
    }
  }

  private calculateGridPosition(layerIndex: number, totalLayers: number): {
    x: number; y: number; width: number; height: number;
  } {
    // グリッドシステムに基づく配置計算
    const margin = 10;
    
    switch (layerIndex) {
      case 0: // タイトル
        return { x: margin, y: margin, width: 100 - 2 * margin, height: 20 };
      case 1: // メインコンテンツ
        return { x: margin, y: 35, width: 100 - 2 * margin, height: 40 };
      default: // 追加コンテンツ
        const yPosition = 35 + 40 + (layerIndex - 2) * 15;
        return { x: margin, y: yPosition, width: 100 - 2 * margin, height: 12 };
    }
  }

  /**
   * 🔧 論理的・技術的コンテンツ特化のSpeaker Notes生成
   */
  protected buildNotesForSlide(title: string, content: string, slideIndex: number, request: EnhancedSlideRequest): string {
    const topic = request.topic.toLowerCase();
    const isTechnical = topic.includes('ai') || topic.includes('gpt') || topic.includes('技術') || topic.includes('システム') || topic.includes('api');
    
    if (slideIndex === 0) {
      // 導入スライド用
      if (isTechnical) {
        return `【技術概要】
${title}について論理的かつ明確に説明します。技術的な内容なので、専門用語は適切に説明し、聴衆の理解度を確認しながら進めてください。

発表のポイント:
• 技術的背景を簡潔に説明
• 重要な概念や用語を明確に定義
• 聴衆の技術レベルに応じて詳細度を調整

内容: ${content.substring(0, 120)}...
推奨時間: 2-3分
注意: 専門用語には適度な説明を加える`;
      } else {
        return `【論理的導入】
${title}について、構造化されたアプローチで説明します。要点を明確に整理し、論理的な流れで発表してください。

内容: ${content.substring(0, 120)}...
発表時間: 2-3分
アプローチ: 論理的、簡潔、要点重視`;
      }
    } else {
      // 詳細スライド用
      if (isTechnical) {
        return `【技術詳細 - ${title}】
この項目の技術的な詳細を説明します。複雑な概念は段階的に説明し、必要に応じて具体例を用いてください。

技術発表のポイント:
• 重要な技術仕様や機能を強調
• 従来技術との比較があれば言及
• 実用性や影響について触れる

内容: ${content.substring(0, 150)}...
推奨時間: 1.5-2分
注意: 図表やデータがあれば積極的に参照`;
      } else {
        return `【${title}】
この要点について論理的に説明します。データや事実に基づいて、簡潔かつ明確に発表してください。

要点: ${content.substring(0, 150)}...
発表スタイル: 論理的、事実重視、簡潔
推奨時間: 1.5-2分`;
      }
    }
  }
}