// =================================================================
// Marp Layout Service - 第2段階：MarpからMinified JSONレイアウト生成
// Marpコンテンツを受け取り、視覚的なJSONレイアウトを生成
// =================================================================

import type { MarpPresentation, MarpSlide } from './MarpContentService';
import type { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';
// Visual content decision is now handled by AI in the layout prompt

export interface LayoutOptions {
  theme?: string;
  designer?: string;
  aspectRatio?: string;
  includeImages?: boolean;
  customLayoutRules?: string;
  purpose?: string; // for visual content decision
}

export interface SlideLayer {
  id: string;
  type: 'text' | 'image' | 'svg';
  content?: string; // for text and svg
  src?: string; // for image
  prompt?: string; // AI generation prompt
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  objectFit?: 'cover' | 'contain' | 'fill';
  objectPosition?: string;
  zIndex?: number;
  // SVG-specific properties
  viewBox?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface JSONSlide {
  id: string;
  title: string;
  layers: SlideLayer[];
  background: string;
  aspectRatio: string;
  template: string;
  notes?: string;
}

export interface JSONPresentation {
  title: string;
  description: string;
  slides: JSONSlide[];
}

export class MarpLayoutService {
  constructor() {
  }

  /**
   * 🔄 スライド毎のJSONレイアウト生成用プロンプトを構築（トークン制限対策）
   */
  buildSingleSlideLayoutPrompt(slide: MarpSlide, slideIndex: number, options: LayoutOptions = {}): string {
    const {
      theme = 'professional',
      designer = 'The Academic Visualizer',
      aspectRatio = '16:9',
      includeImages = true,
      customLayoutRules = ''
    } = options;

    // デザイナー別のレイアウト指針
    const designerLayoutGuidance = this.getDesignerLayoutGuidance(designer);
    
    // テーマ別の色彩設計
    const themeColors = this.getThemeColors(theme);

    const slideType = slideIndex === 0 ? 'title_slide' : 'content_slide';
    const slideInfo = `"${slide.title}" (${slideType})
内容: ${slide.content}${slide.imagePrompt ? `
画像: ${slide.imagePrompt}` : ''}${slide.notes ? `
ノート: ${slide.notes}` : ''}`;

    const imageInstruction = includeImages ? '画像レイヤーを適切に配置し、promptを設定' : '画像は含めない';
    const slideNumber = slideIndex + 1;

    // TypeScriptリソースからプロンプトテンプレートを取得して変数を置換
    let promptTemplate = contextIntelligenceResources.marpLayoutGeneration.singleSlideLayoutPrompt;
    
    return promptTemplate
      .replace(/{designer}/g, designer)
      .replace(/{theme}/g, theme)
      .replace(/{aspectRatio}/g, aspectRatio)
      .replace(/{designerLayoutGuidance}/g, designerLayoutGuidance)
      .replace(/{themeColors}/g, themeColors)
      .replace(/{slideInfo}/g, slideInfo)
      .replace(/{imageInstruction}/g, imageInstruction)
      .replace(/{customLayoutRules}/g, customLayoutRules)
      .replace(/{slideNumber}/g, slideNumber.toString())
      .replace(/{slideType}/g, slideType);
  }

  /**
   * 🆕 単一スライドJSONレスポンスのパース
   */
  parseSingleSlideResponse(jsonResponse: string, slideIndex: number): JSONSlide {
    try {
      const validatedJson = this.validateAndFixJSON(jsonResponse);
      const parsed = JSON.parse(validatedJson);
      
      // 単一スライドオブジェクトとして検証
      if (!parsed.id) parsed.id = `slide_${slideIndex + 1}`;
      if (!parsed.title) parsed.title = `Slide ${slideIndex + 1}`;
      if (!parsed.layers) parsed.layers = [];
      if (!parsed.background) parsed.background = '#f8f9fa';
      if (!parsed.aspectRatio) parsed.aspectRatio = '16:9';
      if (!parsed.template) parsed.template = slideIndex === 0 ? 'title_slide' : 'content_slide';
      
      // レイヤーの検証と修復
      parsed.layers = parsed.layers.map((layer: any, layerIndex: number) => {
        if (!layer.id) layer.id = `layer_${layerIndex + 1}`;
        if (!layer.type) layer.type = 'text';
        
        // 座標の検証とクランプ
        layer.x = this.clampCoordinate(layer.x, 0, 100);
        layer.y = this.clampCoordinate(layer.y, 0, 100);
        layer.width = this.clampCoordinate(layer.width, 1, 100);
        layer.height = this.clampCoordinate(layer.height, 1, 100);
        
        return layer;
      });
      
      return parsed as JSONSlide;
      
    } catch (error) {
      console.error('Single slide JSON parsing error:', error);
      throw new Error(`Failed to parse single slide JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 従来の全スライド一括処理（後方互換性のため保持）
   */
  buildLayoutPrompt(marpPresentation: MarpPresentation, options: LayoutOptions = {}): string {
    console.warn('⚠️ Using legacy buildLayoutPrompt - consider switching to buildSingleSlideLayoutPrompt');
    // 最初のスライドのみで代用
    if (marpPresentation.slides.length > 0) {
      return this.buildSingleSlideLayoutPrompt(marpPresentation.slides[0], 0, options);
    }
    throw new Error('No slides available for layout generation');
  }

  /**
   * レイアウトレスポンスのパース（従来版 - 後方互換性用）
   */
  parseLayoutResponse(jsonResponse: string): JSONPresentation {
    try {
      const validatedJson = this.validateAndFixJSON(jsonResponse);
      const parsed = JSON.parse(validatedJson);
      
      if (!parsed.slides) {
        // 単一スライドレスポンスの場合、配列にラップ
        return {
          title: parsed.title || 'Generated Presentation',
          description: parsed.description || parsed.title || 'Generated Presentation',
          slides: [parsed as JSONSlide]
        };
      }

      // 全スライドの検証
      const validatedSlides = parsed.slides.map((slide: any, index: number) => {
        if (!slide.id) slide.id = `slide_${index + 1}`;
        if (!slide.title) slide.title = `Slide ${index + 1}`;
        if (!slide.layers) slide.layers = [];
        if (!slide.background) slide.background = '#f8f9fa';
        if (!slide.aspectRatio) slide.aspectRatio = '16:9';
        if (!slide.template) {
          slide.template = index === 0 ? 'title_slide' : 'content_slide';
        }
        
        return slide as JSONSlide;
      });
      
      return {
        title: parsed.title,
        description: parsed.description || parsed.title,
        slides: validatedSlides,
      };
      
    } catch (error) {
      console.error('Layout JSON parsing error:', error);
      throw new Error(`Failed to parse layout JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private clampCoordinate(value: any, min: number, max: number): number {
    const num = typeof value === 'number' ? value : parseFloat(value) || min;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * JSON完全性チェックと修復
   * トークン制限による途中終了JSONの検出と修復を試行
   */
  private validateAndFixJSON(jsonResponse: string): string {
    const trimmed = jsonResponse.trim();
    
    console.log('🔍 JSON Validation: Checking response completeness...');
    console.log('📊 Response length:', trimmed.length);
    console.log('🏁 Ends with:', trimmed.slice(-10));
    
    // 1. 空レスポンスチェック
    if (!trimmed) {
      throw new Error('Empty JSON response received');
    }
    
    // 2. JSON開始チェック
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      console.log('⚠️ JSON does not start with { or [, looking for JSON start...');
      const jsonStart = trimmed.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No valid JSON start found in response');
      }
      const extractedJson = trimmed.substring(jsonStart);
      console.log('✅ Extracted JSON from position', jsonStart);
      return this.validateAndFixJSON(extractedJson);
    }
    
    // 3. 完全性チェック - 正常終了パターン
    if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
      try {
        JSON.parse(trimmed);
        console.log('✅ JSON validation passed');
        return trimmed;
      } catch (error) {
        console.log('❌ JSON parse failed despite proper ending:', error);
        // パースエラーでも修復試行
      }
    }
    
    // 4. 不完全なJSON修復試行
    console.log('🔧 Attempting JSON repair...');
    
    const fixedJson = this.attemptSimpleJSONFix(trimmed);
    if (fixedJson) {
      return fixedJson;
    }
    
    // 5. より高度な修復試行
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (parseError) {
      const advancedFix = this.attemptAdvancedJSONFix(trimmed, parseError as Error);
      if (advancedFix) {
        return advancedFix;
      }
    }
    
    console.error('❌ All JSON repair attempts failed');
    throw new Error(`Failed to parse or repair JSON response. Length: ${trimmed.length}`);
  }

  /**
   * シンプルなJSON修復試行
   * 括弧の不整合や未終了文字列の基本的修復
   */
  private attemptSimpleJSONFix(incompleteJson: string): string | null {
    console.log('🔧 Attempting simple JSON repair...');
    
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;
    
    // 括弧の状態を分析
    for (let i = 0; i < incompleteJson.length; i++) {
      const char = incompleteJson[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }
    
    console.log(`🔍 Bracket analysis: braces=${openBraces}, brackets=${openBrackets}, inString=${inString}`);
    
    // 文字列の途中で終了している場合は修復困難
    if (inString) {
      console.log('⚠️ JSON ends inside a string - attempting string closure');
      let fixed = incompleteJson + '"';
      
      // 再度ブラケット分析
      return this.attemptSimpleJSONFix(fixed);
    }
    
    // 必要な終了括弧を追加
    let fixed = incompleteJson;
    
    // 配列の閉じ括弧を追加
    for (let i = 0; i < openBrackets; i++) {
      fixed += ']';
    }
    
    // オブジェクトの閉じ括弧を追加
    for (let i = 0; i < openBraces; i++) {
      fixed += '}';
    }
    
    // 修復後の検証
    try {
      JSON.parse(fixed);
      console.log('✅ Simple repair successful');
      return fixed;
    } catch (error) {
      console.log('❌ Simple repair failed:', error);
      return null;
    }
  }

  /**
   * 高度なJSON修復試行
   * パースエラーの詳細情報を使用した修復
   */
  private attemptAdvancedJSONFix(jsonString: string, parseError: Error): string | null {
    console.log('🔧 Attempting advanced JSON repair...');
    console.log('📝 Parse error:', parseError.message);
    
    // エラーメッセージから位置情報を抽出
    const positionMatch = parseError.message.match(/position (\d+)/);
    if (positionMatch) {
      const errorPos = parseInt(positionMatch[1]);
      console.log(`📍 Error at position: ${errorPos}`);
      
      // エラー位置周辺の情報
      const contextStart = Math.max(0, errorPos - 50);
      const contextEnd = Math.min(jsonString.length, errorPos + 50);
      const context = jsonString.substring(contextStart, contextEnd);
      console.log(`🔍 Error context: "${context}"`);
      
      // エラー位置まででJSONを切り取り、修復試行
      const truncatedJson = jsonString.substring(0, errorPos);
      return this.attemptSimpleJSONFix(truncatedJson);
    }
    
    // Unterminated string error の場合
    if (parseError.message.includes('Unterminated string')) {
      console.log('🔍 Detected unterminated string error');
      
      // 最後の不完全な文字列を除去して修復試行
      const lastQuoteIndex = jsonString.lastIndexOf('"');
      if (lastQuoteIndex > 0) {
        const beforeLastQuote = jsonString.substring(0, lastQuoteIndex);
        const nextQuoteIndex = beforeLastQuote.lastIndexOf('"');
        if (nextQuoteIndex > 0) {
          const truncatedJson = jsonString.substring(0, nextQuoteIndex + 1);
          return this.attemptSimpleJSONFix(truncatedJson);
        }
      }
    }
    
    return null;
  }

  /**
   * EnhancedSlideRequestからLayoutOptionsを生成
   */
  static fromEnhancedRequest(request: EnhancedSlideRequest): LayoutOptions {
    return {
      theme: request.theme,
      designer: request.designer,
      aspectRatio: request.aspectRatio || '16:9',
      includeImages: true, // デフォルトで画像を含める
      purpose: request.purpose
    };
  }

  /**
   * デザイナー別のレイアウト指針を取得
   */
  private getDesignerLayoutGuidance(designer: string): string {
    const guidance = {
      'The Academic Visualizer': `
- 情報密度: 高（多層レイヤー構成）
- 体系化: 明確な情報階層とグルーピング
- 構造的配置: グリッドベースの整然としたレイアウト
- 視覚的要素: 図表、チャート、インフォグラフィック重視`,

      'The Corporate Strategist': `
- プロフェッショナル: 洗練されたビジネス文書スタイル
- 効率性: 要点を明確に伝える簡潔な構成
- 信頼性: 統一感のあるフォーマットとカラーパレット
- データ重視: 数値、グラフ、実績の効果的な表示`,

      'The Emotional Storyteller': `
- 感情訴求: 魅力的なビジュアルとつかみのあるレイアウト
- ストーリー性: 流れのある構成と視線誘導
- 親しみやすさ: 温かみのある配色とフォント選択
- インパクト: 大胆な画像配置と印象的な見出し`,

      'amateur': `
- 親しみやすい: カジュアルで気取らない配置
- 実用性: 分かりやすく実践的な情報配置
- 手作り感: 温かみのある非完璧な配置バランス
- シンプル: 複雑すぎない、親近感のあるデザイン`
    };

    return guidance[designer as keyof typeof guidance] || guidance['The Academic Visualizer'];
  }

  /**
   * テーマ別の色彩設計を取得
   */
  private getThemeColors(theme: string): string {
    const colors = {
      'professional': `
- メイン: #2c5aa0 (プロフェッショナルブルー)
- サブ: #6c757d (ニュートラルグレー)  
- アクセント: #28a745 (信頼のグリーン)
- 背景: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)`,

      'academic': `
- メイン: #495057 (アカデミックグレー)
- サブ: #6f42c1 (学術パープル)
- アクセント: #fd7e14 (知的オレンジ)
- 背景: linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%)`,

      'creative': `
- メイン: #e83e8c (クリエイティブピンク)
- サブ: #6610f2 (アーティスティックバイオレット)
- アクセント: #20c997 (フレッシュティール)
- 背景: linear-gradient(135deg, #fff3cd 0%, #f8d7da 100%)`,

      'storytelling': `
- メイン: #fd7e14 (ストーリーオレンジ)
- サブ: #6c757d (ナラティブグレー)
- アクセント: #20c997 (エモーショナルティール)
- 背景: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)`,

      'minimalist': `
- メイン: #212529 (ミニマルブラック)
- サブ: #6c757d (サブトルグレー)  
- アクセント: #007bff (クリーンブルー)
- 背景: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)`,

      'vibrant': `
- メイン: #dc3545 (バイブラントレッド)
- サブ: #ffc107 (エナジェティックイエロー)
- アクセント: #28a745 (ライブリーグリーン)
- 背景: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)`,

      'tech_modern': `
- メイン: #1a202c (ダーク)
- サブ: #4a5568 (グレー)
- アクセント: #00d4aa (ターコイズ)
- 背景: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)`
    };
    
    return colors[theme as keyof typeof colors] || colors['professional'];
  }

  // Visual content decision is now handled by AI in enhanceLayoutPromptWithVisualDecisions

  /**
   * 🆕 AI判断によるSVG/Image自動選択とSVG生成統合
   */
  enhanceLayoutPromptWithVisualDecisions(
    basePrompt: string, 
    marpPresentation: MarpPresentation,
    options: LayoutOptions
  ): string {
    // 用途とテーマからコンテキストを構築
    const purposeContext = this.buildPurposeContext(options.purpose);
    const themeContext = this.buildThemeContext(options.theme);
    
    const enhancedPrompt = basePrompt + `

**🎨 視覚的コンテンツの自動判断指針:**

**用途コンテキスト:**
${purposeContext}

**テーマコンテキスト:** 
${themeContext}

**SVG vs 画像の判断基準:**

**📊 SVG生成が適している場合:**
- データ可視化（グラフ、チャート、図表）
- 概念図、フローチャート、組織図
- アイコン、シンプルなイラスト
- 抽象的な表現（矢印、幾何学模様）

**📸 画像生成が適している場合:**
- 実在する物体、人物、風景
- 複雑なテクスチャや写実的表現
- 商品、料理、建物などの具体的なもの
- 感情表現や雰囲気重視のビジュアル

**🛠️ SVG生成時の仕様:**
- viewBox="0 0 400 300" を基準とする
- レスポンシブ対応のSVG
- 適切な色彩（テーマカラーを活用）
- 簡潔で理解しやすいデザイン

**各スライドの画像判断:**
${this.buildSlideImageAnalysis(marpPresentation)}

**重要:** 画像タイプを適切に判断し、以下のように設定してください：
- SVG場合: "type": "svg", "content": "<svg>...</svg>"
- 画像場合: "type": "image", "prompt": "生成用プロンプト"
`;

    return enhancedPrompt;
  }

  private buildPurposeContext(purpose?: string): string {
    const contexts = {
      '教育・学習支援': '学習効果を高める視覚的補助、理解促進のための図解重視',
      'ビジネス・営業プレゼンテーション': 'プロフェッショナルな印象、データの説得力、信頼性重視',
      'ストーリーテリング・物語の共有': '感情に訴える視覚的表現、物語性のある構成',
      '研修・トレーニング資料': '実践的で分かりやすい図解、手順の可視化',
      'レポート・報告書': '正確なデータ表現、客観的で信頼できる視覚化',
      'その他': 'バランスの取れた汎用的な視覚表現'
    };

    return contexts[purpose as keyof typeof contexts] || contexts['その他'];
  }

  private buildThemeContext(theme?: string): string {
    const contexts = {
      'academic': 'シンプルで洗練された学術的表現、情報の明確な整理',
      'professional': 'ビジネス標準の落ち着いた表現、信頼性重視',
      'creative': '創造性と独創性を重視した大胆な表現',
      'storytelling': '物語性と感情的つながりを重視した温かい表現',
      'minimalist': 'ミニマルで洗練された、要素を絞った表現',
      'vibrant': 'エネルギッシュで活動的な、注目を引く表現'
    };

    return contexts[theme as keyof typeof contexts] || contexts['professional'];
  }

  private buildSlideImageAnalysis(presentation: MarpPresentation): string {
    return presentation.slides.map((slide, index) => {
      const slideType = index === 0 ? 'タイトルスライド' : 'コンテンツスライド';
      return `**スライド${index + 1}** (${slideType}): "${slide.title}"
- 内容: ${slide.content.substring(0, 100)}${slide.content.length > 100 ? '...' : ''}
- 画像提案: ${slide.imagePrompt || '画像なし'}`;
    }).join('\n');
  }

  /**
   * フォールバック用のレイアウトプロンプト（YAML読み込み失敗時）
   */
  private buildFallbackLayoutPrompt(slide: MarpSlide, slideIndex: number, options: LayoutOptions = {}): string {
    const {
      theme = 'professional',
      designer = 'The Academic Visualizer',
      aspectRatio = '16:9',
      includeImages = true,
      customLayoutRules = ''
    } = options;

    const designerLayoutGuidance = this.getDesignerLayoutGuidance(designer);
    const themeColors = this.getThemeColors(theme);

    const slideType = slideIndex === 0 ? 'title_slide' : 'content_slide';
    const slideInfo = `"${slide.title}" (${slideType})
内容: ${slide.content}${slide.imagePrompt ? `
画像: ${slide.imagePrompt}` : ''}${slide.notes ? `
ノート: ${slide.notes}` : ''}`;

    return `以下の単一Marpスライドを、視覚的に魅力的なJSONレイアウトに変換してください。

**デザイナー:** ${designer}
**テーマ:** ${theme}
**アスペクト比:** ${aspectRatio}

**レイアウト指針:**
${designerLayoutGuidance}

**色彩設計:**
${themeColors}

**スライド情報:**
${slideInfo}

**重要な要件:**
1. **座標系:** x, y, width, height は全て0-100の数値（パーセンテージ座標系）
2. **レイヤー構成:** 各スライドは2-4個のレイヤーで構成
3. **画像配置:** ${includeImages ? '画像レイヤーを適切に配置し、promptを設定' : '画像は含めない'}
4. **フォント階層:** タイトル(48-72px)、サブタイトル(28-36px)、本文(24-32px)
5. **zIndex:** 重なり順序を適切に設定（高い値が前面）

**レイアウトパターン:**
- title_slide: 中央配置タイトル + サブタイトル
- image_right: 左テキスト(50%) + 右画像(45%)
- image_left: 左画像(45%) + 右テキスト(50%)
- text_only: 全幅テキスト配置
- split_content: 上下または左右分割レイアウト

${customLayoutRules}

必ず以下のJSON形式で単一スライドとして回答してください:

{
  "id": "slide_${slideIndex + 1}",
  "title": "スライドタイトル",
  "layers": [
    {
      "id": "layer_1",
      "type": "text",
      "content": "テキスト内容",
      "x": 10,
      "y": 20,
      "width": 80,
      "height": 15,
      "fontSize": 48,
      "textColor": "#333333",
      "textAlign": "center",
      "zIndex": 1
    }
  ],
  "background": "#f8f9fa",
  "aspectRatio": "${aspectRatio}",
  "template": "${slideType}"
};`;
  }
}