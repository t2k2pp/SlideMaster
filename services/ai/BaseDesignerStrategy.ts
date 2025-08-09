// =================================================================
// Base Designer Strategy - デザイナー戦略パターンの基底クラス
// 各デザイナー固有のスライド生成戦略を定義
// =================================================================

import { 
  DesignerStrategy,
  EnhancedSlideRequest
} from './aiServiceInterface';
import type { 
  PresentationPurpose,
  PresentationTheme,
  DesignerType
} from '../../types';

/**
 * デザイナー戦略の基底抽象クラス
 * 全てのデザイナー戦略が継承する共通機能を提供
 */
export abstract class BaseDesignerStrategy implements DesignerStrategy {
  abstract readonly designerId: DesignerType;
  abstract readonly designerName: string;

  /**
   * コンテンツ生成用プロンプトの構築
   * デザイナーの特性を反映したプロンプトを生成
   */
  abstract buildContentPrompt(request: EnhancedSlideRequest): string;

  /**
   * 画像生成用プロンプトの構築
   * デザイナーのスタイルを反映した画像プロンプトを生成
   */
  abstract buildImagePrompt(slideContent: string, imageContext: any): string;

  /**
   * レイアウト戦略の取得
   * デザイナー固有のレイアウト設定を返す
   */
  abstract getLayoutStrategy(): {
    preferredLayouts: string[];
    imagePositioning: 'dominant' | 'supporting' | 'minimal';
    textDensity: 'minimal' | 'balanced' | 'detailed';
  };

  /**
   * コンテンツ後処理
   * 生成されたコンテンツをデザイナーの特性に応じて調整
   */
  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    try {
      // JSONパースしてnotesを追加
      const parsedContent = JSON.parse(rawContent);
      if (parsedContent.slides && Array.isArray(parsedContent.slides)) {
        parsedContent.slides = parsedContent.slides.map((slide: any, index: number) => {
          // 既存のnotesが空の場合のみ生成
          if (!slide.notes || slide.notes.trim() === '') {
            slide.notes = this.generateSpeakerNotes(slide, index, request);
          }
          return slide;
        });
      }
      return JSON.stringify(parsedContent, null, 2);
    } catch (error) {
      // JSONパースエラーの場合は元のコンテンツを返す
      return rawContent;
    }
  }

  /**
   * Speaker Notes生成
   * スライド内容に基づいてSpeaker Notesを生成
   */
  protected generateSpeakerNotes(slide: any, slideIndex: number, request: EnhancedSlideRequest): string {
    const slideTitle = slide.title || `スライド ${slideIndex + 1}`;
    const slideContent = this.extractTextFromSlide(slide);
    
    // デザイナータイプに応じたnotes生成
    return this.buildNotesForSlide(slideTitle, slideContent, slideIndex, request);
  }

  /**
   * スライドからテキストコンテンツを抽出
   */
  private extractTextFromSlide(slide: any): string {
    if (!slide.layers || !Array.isArray(slide.layers)) {
      return '';
    }
    
    return slide.layers
      .filter((layer: any) => layer.type === 'text' && layer.content)
      .map((layer: any) => layer.content.replace(/\n/g, ' '))
      .join(' ');
  }

  /**
   * スライド用Notes構築（デザイナー固有でオーバーライド可能）
   */
  protected buildNotesForSlide(title: string, content: string, slideIndex: number, request: EnhancedSlideRequest): string {
    const purposeContext = this.getPurposeBasedInstructions(request.purpose);
    
    if (slideIndex === 0) {
      return `【導入スライド】\n${title}について説明します。\n内容: ${content.substring(0, 100)}...\n発表時間: 1-2分\n注意点: 聴衆の注意を引くよう、はっきりと話してください。`;
    } else {
      return `【${title}】\n要点: ${content.substring(0, 150)}...\n発表のポイント: この内容を${purposeContext}説明してください。\n推奨発表時間: 1-2分`;
    }
  }

  /**
   * Title Slide生成
   * プレゼンテーション全体のタイトルスライドを生成
   */
  generateTitleSlide(request: EnhancedSlideRequest): any {
    const titleSlideContent = this.buildTitleSlideContent(request);
    const titleNotes = this.buildTitleSlideNotes(request);
    
    return {
      "id": "slide-title",
      "title": this.extractMainTitle(request.topic),
      "layers": titleSlideContent,
      "background": this.getTitleSlideBackground(),
      "aspectRatio": "16:9",
      "notes": titleNotes,
      "metadata": {
        "slideType": "title",
        "designerUsed": this.designerName,
        "generatedAt": new Date().toISOString()
      }
    };
  }

  /**
   * Title Slideのメインタイトル抽出
   */
  private extractMainTitle(topic: string): string {
    // 「について」「を」などの接続詞より前をメインタイトルとする
    const cleanTopic = topic.replace(/について.*$/, '')
                          .replace(/を.*$/, '')
                          .replace(/の.*解説.*$/, '')
                          .replace(/.*まとめ.*/, topic);
    
    return cleanTopic || topic;
  }

  /**
   * Title Slideのコンテンツ構築（デザイナー固有でオーバーライド可能）
   */
  protected buildTitleSlideContent(request: EnhancedSlideRequest): any[] {
    const mainTitle = this.extractMainTitle(request.topic);
    const currentDate = new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return [
      {
        "id": "title-layer-1",
        "type": "text",
        "content": mainTitle,
        "x": 10,
        "y": 25,
        "width": 80,
        "height": 25,
        "fontSize": 56,
        "textAlign": "center",
        "textColor": "#2c3e50",
        "fontWeight": "bold",
        "rotation": 0,
        "opacity": 1,
        "zIndex": 1
      },
      {
        "id": "title-layer-2", 
        "type": "text",
        "content": `プレゼンテーション\n\n${currentDate}`,
        "x": 10,
        "y": 65,
        "width": 80,
        "height": 20,
        "fontSize": 24,
        "textAlign": "center",
        "textColor": "#7f8c8d",
        "rotation": 0,
        "opacity": 0.8,
        "zIndex": 2
      }
    ];
  }

  /**
   * Title Slideの背景色取得（デザイナー固有でオーバーライド可能）
   */
  protected getTitleSlideBackground(): string {
    return "#f8f9fa";
  }

  /**
   * Title SlideのSpeaker Notes生成（デザイナー固有でオーバーライド可能）
   */
  protected buildTitleSlideNotes(request: EnhancedSlideRequest): string {
    const purposeContext = this.getPurposeBasedInstructions(request.purpose);
    
    return `【タイトルスライド】
${this.extractMainTitle(request.topic)}についてのプレゼンテーションを開始します。

発表の準備:
• 聴衆への挨拶と自己紹介
• プレゼンテーションの目的を明確に伝える
• 全体の構成や所要時間を予告

発表スタイル: ${purposeContext}
推奨時間: 1-2分
注意点: 第一印象が重要なので、明確で自信を持って話してください。`;
  }

  // =================================================================
  // 共通ユーティリティメソッド
  // =================================================================

  /**
   * 用途に応じた基本指示を生成
   */
  protected getPurposeBasedInstructions(purpose: PresentationPurpose): string {
    const purposeMap: Record<PresentationPurpose, string> = {
      'auto': 'トピックに最適な形式で',
      'business_presentation': 'ビジネスプレゼンテーション形式で、専門性と信頼性を重視して',
      'academic_presentation': '学術的プレゼンテーション形式で、論理性と正確性を重視して',
      'conference_presentation': '学会発表形式で、研究内容を明確に伝える構成で',
      'sales_presentation': '営業提案資料として、説得力のある構成で',
      'training_material': '研修教材として、理解しやすい段階的な構成で',
      'storytelling': 'ストーリーテリング形式で、物語性を重視して',
      'educational_content': '教育コンテンツとして、学習効果を高める構成で',
      'marketing_material': 'マーケティング資料として、魅力的で印象的な構成で',
      'technical_documentation': '技術資料として、正確性と詳細性を重視して',
      'game_book': 'ゲームブック形式で、選択肢や分岐を含む対話的な構成で',
      'children_book': '子ども向け絵本として、分かりやすく楽しい構成で',
      'report_summary': 'レポート要約として、要点を整理した簡潔な構成で',
      'pitch_deck': 'ピッチ資料として、投資家に訴求力のある構成で'
    };

    return purposeMap[purpose] || purposeMap['auto'];
  }

  /**
   * テーマに応じた視覚的指示を生成
   */
  protected getThemeBasedInstructions(theme: PresentationTheme): string {
    const themeMap: Record<PresentationTheme, string> = {
      'auto': '',
      'professional': 'プロフェッショナルで洗練されたトーンで',
      'creative': 'クリエイティブで革新的なアプローチで',
      'minimalist': 'シンプルで要点を絞った構成で',
      'playful': '親しみやすく楽しいトーンで',
      'storytelling': '物語性を重視した展開で',
      'children_bright': '子どもにも分かりやすく明るいトーンで',
      'children_pastel': '優しく温かみのあるトーンで',
      'academic': '学術的で厳格なトーンで',
      'medical': '医療分野の専門性を持って',
      'tech_modern': '技術的で現代的なアプローチで',
      'vintage_retro': 'クラシックで温かみのある表現で',
      'nature_organic': '自然で有機的な表現を用いて',
      'elegant_luxury': '上品で高級感のある表現で',
      'dark_modern': 'モダンでスタイリッシュな表現で',
      'bold_impact': '大胆でインパクトのある表現で',
      'neon_cyberpunk': 'サイバーパンクな未来的表現で',
      'traditional_japanese': '日本の伝統的な美意識を取り入れて',
      'hand_drawn': '手描きの温かみを感じさせる表現で',
      'magazine_glossy': '雑誌のような洗練された表現で'
    };

    return themeMap[theme] || '';
  }

  /**
   * スライド数に応じた構成指示を生成
   */
  protected getSlideCountInstructions(
    slideCount: number, 
    slideCountMode?: 'exact' | 'max' | 'min' | 'around'
  ): string {
    let baseInstruction = '';
    
    if (slideCount <= 3) {
      baseInstruction = '各スライドに十分な内容を盛り込み、詳細な説明を含めて';
    } else if (slideCount <= 8) {
      baseInstruction = '適度な情報量で、理解しやすい構成にして';
    } else {
      baseInstruction = '各スライドを簡潔にまとめ、全体として包括的な内容にして';
    }

    if (slideCountMode) {
      const modeMap = {
        'exact': `正確に${slideCount}枚のスライドで`,
        'max': `最大${slideCount}枚以内で`,
        'min': `最低${slideCount}枚以上で`,
        'around': `${slideCount}枚前後で`
      };
      baseInstruction = `${modeMap[slideCountMode]}、${baseInstruction}`;
    } else {
      baseInstruction = `${slideCount}枚のスライドで、${baseInstruction}`;
    }

    return baseInstruction;
  }

  /**
   * 画像設定に応じた視覚指示を生成
   */
  protected getImageInstructions(request: EnhancedSlideRequest): string {
    if (!request.includeImages) {
      return '';
    }

    const frequency = request.imageFrequency || 'every_slide';
    const frequencyMap = {
      'every_slide': '各スライドに',
      'every_2_slides': '2枚に1枚の頻度で',
      'every_3_slides': '3枚に1枚の頻度で',
      'every_5_slides': '5枚に1枚の頻度で（ゲームブックスタイル）',
      'sparse': '要所要所に'
    };

    const frequencyText = frequencyMap[frequency] || frequencyMap['every_slide'];
    
    let styleInstruction = '';
    if (request.imageSettings?.style && request.imageSettings.style !== 'auto') {
      const styleMap = {
        'anime': 'アニメ風の',
        'storybook': '絵本風の',
        'watercolor': '水彩画風の',
        'hand_drawn': '手描き風の',
        'realistic': '写実的な',
        'cartoon': 'カートゥーン調の',
        'traditional_japanese': '和風の',
        'cg_3d': '3D CGの',
        'minimalist': 'ミニマルな'
      };
      styleInstruction = styleMap[request.imageSettings.style] || '';
    }

    return `${frequencyText}${styleInstruction}関連画像を含めて`;
  }

  /**
   * 文章量に応じた適切なフォントサイズを計算
   */
  protected calculateOptimalFontSize(content: string, layerWidth: number = 80, layerHeight: number = 20): number {
    const textLength = content.length;
    const baseSize = 32; // 基本フォントサイズを大きく設定
    const maxSize = 48;
    const minSize = 20;
    
    // レイヤーサイズに基づく基本調整
    const sizeByArea = Math.max(16, Math.min(40, (layerWidth * layerHeight) / 30));
    
    // 文章量に基づく調整
    let sizeByLength: number;
    if (textLength < 30) {
      sizeByLength = maxSize; // 短文は大きく
    } else if (textLength < 80) {
      sizeByLength = baseSize; // 中程度
    } else if (textLength < 150) {
      sizeByLength = 28; // やや小さく
    } else {
      sizeByLength = minSize; // 長文は小さく
    }
    
    // 両方の要素を考慮した最終サイズ
    const finalSize = Math.min(Math.max(minSize, (sizeByArea + sizeByLength) / 2), maxSize);
    
    return Math.round(finalSize);
  }

  /**
   * 共通のJSON構造指示を生成
   */
  protected getJsonStructureInstructions(request?: any): string {
    const aspectRatio = request?.aspectRatio || '16:9'; // デフォルトは16:9
    return `
結果はJSON形式で以下の構造で出力してください：
{
  "title": "プレゼンテーションタイトル",
  "description": "プレゼンテーションの説明",
  "slides": [
    {
      "id": "slide-1",
      "title": "スライドタイトル",
      "layers": [
        {
          "id": "layer-1",
          "type": "text",
          "content": "スライドの主要コンテンツ",
          "x": 10,
          "y": 20,
          "width": 80,
          "height": 60,
          "fontSize": 32,
          "textAlign": "left",
          "textColor": "#000000"
        },
        {
          "id": "layer-2",
          "type": "image",
          "src": "",
          "alt": "[画像：サンプル画像の説明]",
          "x": 60,
          "y": 30,
          "width": 35,
          "height": 40
        }
      ],
      "background": "#ffffff",
      "aspectRatio": "${aspectRatio}",
      "notes": "スピーカーノート（設定されている場合）"
    }
  ]
}

重要なフォントサイズ指示：
- 短いテキスト（30文字未満）は40-48pxで大きく表示
- 中程度のテキスト（30-80文字）は32-40px
- 長いテキスト（150文字以上）でも最低20pxは確保
- タイトルは本文より10-20px大きく設定

**重要：画像について**
- imageレイヤーの"src"フィールドには画像URLを含めないでください
- "src": ""として空文字列にしてください
- プレースホルダーとして[画像：◯◯]のようなテキストを"content"または"alt"に記載してください
- icons8.com、unsplash.com、pixabay.com等の具体的なURLは使用禁止です`;
  }
}