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
import { MarpContentService, type MarpContentOptions, type MarpPresentation } from './MarpContentService';
import { MarpLayoutService, type LayoutOptions, type JSONPresentation, type JSONSlide } from './MarpLayoutService';
import { getTextAIService } from './unifiedAIService';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

/**
 * デザイナー戦略の基底抽象クラス
 * 全てのデザイナー戦略が継承する共通機能を提供
 * 新機能：Marp→JSON二段階処理によるトークン最適化
 */
export abstract class BaseDesignerStrategy implements DesignerStrategy {
  abstract readonly designerId: DesignerType;
  abstract readonly designerName: string;
  
  // Marp→JSON二段階処理サービス
  protected marpContentService = new MarpContentService();
  protected marpLayoutService = new MarpLayoutService();
  constructor() {
  }

  /**
   * コンテンツ生成用プロンプトの構築
   * デザイナーの特性を反映したプロンプトを生成
   */
  abstract buildContentPrompt(request: EnhancedSlideRequest): string;
  
  /**
   * 🆕 Marp→JSON二段階スライド生成（推奨メソッド）
   * Step1: Marpコンテンツ生成 → Step2: JSONレイアウト生成
   * トークン数を大幅削減し、安定した品質を実現
   */
  async generateSlidesWithMarpApproach(request: EnhancedSlideRequest): Promise<string> {
    console.log('🎯 Starting Marp→JSON two-phase slide generation');
    console.log('📋 Request details:', {
      topic: request.topic,
      slideCount: request.slideCount,
      designer: request.designer,
      theme: request.theme
    });
    
    try {
      // Phase 1: プレゼンテーションタイトル生成
      const marpOptions = MarpContentService.fromEnhancedRequest(request);
      
      // 統合分析結果を MarpOptions に追加
      if (request.isStoryContent !== undefined) {
        (marpOptions as any).isStoryContent = request.isStoryContent;
        (marpOptions as any).contentType = request.contentType;
        console.log('📚 Passing unified analysis to MarpContentService:', {
          isStoryContent: request.isStoryContent,
          contentType: request.contentType
        });
      }
      
      const titlePrompt = this.marpContentService.buildTitleGenerationPrompt(marpOptions);
      
      console.log('🎯 Phase 1: Generating presentation title...');
      console.log('📋 Topic length:', request.topic.length, 'characters');
      console.log('📝 Title generation prompt length:', titlePrompt.length);
      
      const aiService = getTextAIService();
      const generatedTitle = await aiService.generateText(titlePrompt, {
        temperature: 0.7
      });
      
      const cleanTitle = generatedTitle.trim().replace(/^["']|["']$/g, ''); // クォート除去
      console.log('✅ Phase 1 completed: Title generated');
      console.log('🎯 Generated title:', cleanTitle);
      console.log('📏 Title length:', cleanTitle.length, 'characters');

      // Phase 2: Marpコンテンツ生成（確定タイトル使用）
      const marpPrompt = this.marpContentService.buildMarpPrompt(marpOptions, cleanTitle);
      
      console.log('📝 Phase 2: Generating Marp content with confirmed title...');
      console.log('🎨 Marp prompt length:', marpPrompt.length);
      
      const marpResponse = await aiService.generateText(marpPrompt, {
        temperature: 0.7
      });
      
      console.log('✅ Phase 2 completed: Marp content generated');
      console.log('📊 Marp response length:', marpResponse.length);
      
      // Marp応答をパース
      const marpPresentation = this.marpContentService.parseMarpResponse(marpResponse);
      console.log('🔍 Parsed Marp presentation:', {
        title: marpPresentation.title,
        slideCount: marpPresentation.slides?.length || 0,
        hasImages: marpPresentation.slides?.some(s => s?.imagePrompt) || false
      });
      
      // Phase 2: スライド毎JSONレイアウト生成（トークン制限対策）
      const layoutOptions = MarpLayoutService.fromEnhancedRequest(request);
      console.log('🎨 Phase 2: Generating JSON layout per slide...');
      
      const generatedSlides: JSONSlide[] = [];
      
      if (!marpPresentation.slides || marpPresentation.slides.length === 0) {
        throw new Error('No slides found in Marp presentation');
      }
      
      for (let i = 0; i < marpPresentation.slides.length; i++) {
        const slide = marpPresentation.slides[i];
        console.log(`🎨 Processing slide ${i + 1}/${marpPresentation.slides.length}: ${slide.title}`);
        
        const slidePrompt = this.marpLayoutService.buildSingleSlideLayoutPrompt(slide, i, layoutOptions);
        console.log('🎨 Single slide prompt length:', slidePrompt.length);
        
        const slideJsonResponse = await aiService.generateText(slidePrompt, {
          temperature: 0.5
        });
        
        console.log(`✅ Slide ${i + 1} JSON generated, length:`, slideJsonResponse.length);
        
        // 単一スライドのJSONをパース
        const slideJson = this.marpLayoutService.parseSingleSlideResponse(slideJsonResponse, i);
        generatedSlides.push(slideJson);
      }
      
      // 全スライドをプレゼンテーションに統合
      const jsonPresentation = {
        title: marpPresentation.title,
        description: marpPresentation.title,
        slides: generatedSlides
      };
      
      console.log('✅ Phase 2 completed: All slides processed individually');
      
      // 最終的なJSONを文字列として返す
      const finalJson = JSON.stringify(jsonPresentation);
      console.log('🏁 Marp→JSON two-phase generation completed successfully');
      console.log('📊 Final JSON length:', finalJson.length);
      
      return finalJson;
      
    } catch (error) {
      console.error('❌ Marp→JSON generation failed:', error);
      
      // トークン制限エラーの場合の詳細処理
      if (error instanceof Error && (
        error.message.includes('token limit') || 
        error.message.includes('Unterminated string') ||
        error.message.includes('truncated')
      )) {
        console.log('🔄 Detected token limit issue, trying reduced complexity...');
        
        // より少ないスライド数での再試行
        const reducedRequest = {
          ...request,
          slideCount: Math.max(3, Math.floor(request.slideCount * 0.6)) // 60%に削減
        };
        
        try {
          console.log(`📉 Retrying with reduced slide count: ${reducedRequest.slideCount}`);
          return await this.generateSlidesWithMarpApproach(reducedRequest);
        } catch (retryError) {
          console.log('❌ Reduced complexity retry also failed, falling back to traditional generation');
        }
      }
      
      // すべてのリトライに失敗した場合はエラー
      console.error('❌ All generation approaches failed');
      throw new Error('スライド生成に失敗しました。AIサービスの設定や接続を確認してください。');
    }
  }

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
      // JSONパースしてnotesを追加＋動的フォントサイズ適用
      const parsedContent = JSON.parse(rawContent);
      if (parsedContent.slides && Array.isArray(parsedContent.slides)) {
        
        // コンテンツタイプを推定
        const contentType = this.detectContentType(request);
        console.log('🔤 Applying dynamic font sizing with context:', contentType);
        
        parsedContent.slides = parsedContent.slides.map((slide: any, index: number) => {
          // 1. Speaker Notes生成
          if (!slide.notes || slide.notes.trim() === '') {
            slide.notes = this.generateSpeakerNotes(slide, index, request);
          }
          
          // 2. 動的フォントサイズ適用
          if (slide.layers && Array.isArray(slide.layers)) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text' && layer.content) {
                const textType = this.detectTextType(layer, slide, index);
                const optimizedFontSize = this.calculateOptimalFontSize(
                  layer.content,
                  layer.width || 80,
                  layer.height || 20,
                  textType,
                  contentType
                );
                
                console.log(`🎯 Font size optimized: ${layer.fontSize || 'unset'} → ${optimizedFontSize}px for ${textType}`);
                layer.fontSize = optimizedFontSize;
              }
              return layer;
            });
          }
          
          return slide;
        });
      }
      return JSON.stringify(parsedContent, null, 2);
    } catch (error) {
      console.error('⚠️ Post-processing error:', error);
      return rawContent;
    }
  }

  /**
   * 🎯 コンテンツタイプ検出
   * PresentationPurposeから適切なコンテンツタイプを推定
   */
  private detectContentType(request: EnhancedSlideRequest): 'story' | 'business' | 'academic' | 'technical' {
    const designer = request.designer || request.selectedDesigner;
    
    // 新しい4スタイルシステムに基づくマッピング
    switch (designer) {
      case 'education':
        return 'academic';
      
      case 'research-presentation-oriented':
        return 'academic';
      
      case 'marketing-oriented':
        return 'business';
      
      case 'simple':
      default:
        return 'business';
    }
  }

  /**
   * 🎯 テキストタイプ検出
   * レイヤーの位置・内容からテキストの役割を推定
   */
  private detectTextType(layer: any, slide: any, slideIndex: number): 'title' | 'subtitle' | 'body' | 'caption' {
    const content = layer.content || '';
    const y = layer.y || 0;
    const height = layer.height || 20;
    const fontSize = layer.fontSize || 32;
    
    // スライドタイトルの場合
    if (slideIndex === 0 && y < 30 && fontSize > 40) {
      return 'title';
    }
    
    // 位置とサイズベースの判定
    if (y < 25 && (fontSize > 35 || content.length < 50)) {
      return 'title';
    }
    
    if (y < 40 && y >= 25 && fontSize > 30) {
      return 'subtitle';
    }
    
    if (y > 80 || height < 15 || fontSize < 22) {
      return 'caption';
    }
    
    return 'body';
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
    const purposeContext = 'プレゼンテーション形式で';
    
    if (slideIndex === 0) {
      let template = contextIntelligenceResources.styleStrategies.baseStrategy.speakerNotesIntro;
      return template
        .replace(/{title}/g, title)
        .replace(/{content}/g, content.substring(0, 100) + '...');
    } else {
      let template = contextIntelligenceResources.styleStrategies.baseStrategy.speakerNotesContent;
      return template
        .replace(/{title}/g, title)
        .replace(/{content}/g, content.substring(0, 150) + '...')
        .replace(/{purposeContext}/g, purposeContext);
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
      "id": "slide-1",
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
    const purposeContext = 'プレゼンテーション形式で';
    const mainTitle = this.extractMainTitle(request.topic);
    
    let template = contextIntelligenceResources.styleStrategies.baseStrategy.titleSlideNotes;
    return template
      .replace(/{mainTitle}/g, mainTitle)
      .replace(/{purposeContext}/g, purposeContext);
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

    let template = contextIntelligenceResources.styleStrategies.baseStrategy.imageInstructions;
    return template
      .replace(/{frequencyText}/g, frequencyText)
      .replace(/{styleInstruction}/g, styleInstruction);
  }

  /**
   * 🔤 高度な動的フォントサイズ計算システム
   * コンテンツ、レイアウト、役割を総合的に考慮した最適化
   */
  protected calculateOptimalFontSize(
    content: string, 
    layerWidth: number = 80, 
    layerHeight: number = 20,
    textType: 'title' | 'subtitle' | 'body' | 'caption' = 'body',
    contextType: 'story' | 'business' | 'academic' | 'technical' = 'business'
  ): number {
    const textLength = content.length;
    const wordsCount = content.split(/\s+/).length;
    const hasLineBreaks = content.includes('\n');
    
    console.log(`🔤 Calculating font size for ${textType}:`, {
      textLength,
      wordsCount,
      hasLineBreaks,
      layerArea: layerWidth * layerHeight,
      contextType
    });

    // 1. 基本サイズ設定（役割別）
    const baseSizes = {
      title: { max: 56, base: 42, min: 32 },
      subtitle: { max: 48, base: 36, min: 26 },
      body: { max: 40, base: 28, min: 20 },
      caption: { max: 28, base: 20, min: 16 }
    };

    const sizeConfig = baseSizes[textType];

    // 2. コンテキスト別調整係数
    const contextMultipliers = {
      story: { title: 1.1, subtitle: 1.05, body: 1.0, caption: 0.95 }, // ストーリーは読みやすく
      business: { title: 1.0, subtitle: 1.0, body: 1.0, caption: 1.0 }, // 標準
      academic: { title: 0.95, subtitle: 0.95, body: 0.9, caption: 0.9 }, // 学術的は情報密度高め
      technical: { title: 0.9, subtitle: 0.9, body: 0.85, caption: 0.85 } // 技術資料は詳細重視
    };

    const contextMultiplier = contextMultipliers[contextType][textType];

    // 3. レイアウトエリアに基づく調整
    const layerArea = layerWidth * layerHeight;
    const areaFactor = Math.min(1.2, Math.max(0.7, layerArea / 1600)); // 1600 = 80*20 (標準サイズ)

    // 4. 文章量による段階的調整
    let lengthFactor: number;
    if (textLength <= 20) {
      lengthFactor = 1.3; // 極短文は大きく（キャッチフレーズ等）
    } else if (textLength <= 50) {
      lengthFactor = 1.1; // 短文は少し大きく
    } else if (textLength <= 100) {
      lengthFactor = 1.0; // 標準
    } else if (textLength <= 200) {
      lengthFactor = 0.9; // 中文は少し小さく
    } else if (textLength <= 350) {
      lengthFactor = 0.8; // 長文は小さく
    } else {
      lengthFactor = 0.7; // 極長文はかなり小さく
    }

    // 5. 改行の存在による調整
    const lineBreakFactor = hasLineBreaks ? 0.95 : 1.0;

    // 6. 単語密度による調整（日本語では参考値）
    const wordDensityFactor = wordsCount > 0 ? Math.max(0.8, Math.min(1.1, 50 / wordsCount)) : 1.0;

    // 7. 最終計算
    const calculatedSize = 
      sizeConfig.base * 
      contextMultiplier * 
      areaFactor * 
      lengthFactor * 
      lineBreakFactor * 
      wordDensityFactor;

    // 8. 範囲制限と丸め
    const finalSize = Math.round(
      Math.min(sizeConfig.max, Math.max(sizeConfig.min, calculatedSize))
    );

    console.log(`✅ Font size calculated: ${finalSize}px`, {
      originalBase: sizeConfig.base,
      factors: {
        context: contextMultiplier,
        area: areaFactor,
        length: lengthFactor,
        lineBreak: lineBreakFactor,
        wordDensity: wordDensityFactor
      },
      calculated: calculatedSize,
      final: finalSize
    });

    return finalSize;
  }

  /**
   * 🎯 レガシー互換性維持のための旧メソッド
   * 既存コードとの互換性を保つ
   */
  protected calculateDynamicFontSize(content: string, layerWidth: number = 80, layerHeight: number = 20): number {
    return this.calculateOptimalFontSize(content, layerWidth, layerHeight, 'body', 'business');
  }

  /**
   * 共通のJSON構造指示を生成
   */
  protected getJsonStructureInstructions(request?: any): string {
    const aspectRatio = request?.aspectRatio || '16:9'; // デフォルトは16:9
    return `
結果は**Minified JSON形式（スペース・改行・インデントなし）**で以下の構造で出力してください。トークン数節約のため、整形は不要です：
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

  // フォールバック関数
  private buildFallbackNotes(title: string, content: string, slideIndex: number, purposeContext: string): string {
    if (slideIndex === 0) {
      return `【導入スライド】\n${title}について説明します。\n内容: ${content.substring(0, 100)}...\n発表時間: 1-2分\n注意点: 聴衆の注意を引くよう、はっきりと話してください。`;
    } else {
      return `【${title}】\n要点: ${content.substring(0, 150)}...\n発表のポイント: この内容を${purposeContext}説明してください。\n推奨発表時間: 1-2分`;
    }
  }

  private buildFallbackTitleNotes(mainTitle: string, purposeContext: string): string {
    return `【タイトルスライド】
${mainTitle}についてのプレゼンテーションを開始します。

発表の準備:
• 聴衆への挨拶と自己紹介
• プレゼンテーションの目的を明確に伝える
• 全体の構成や所要時間を予告

発表スタイル: ${purposeContext}
推奨時間: 1-2分
注意点: 第一印象が重要なので、明確で自信を持って話してください。`;
  }
}