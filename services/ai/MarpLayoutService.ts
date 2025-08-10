// =================================================================
// Marp Layout Service - 第2段階：MarpからMinified JSONレイアウト生成
// Marpコンテンツを受け取り、視覚的なJSONレイアウトを生成
// =================================================================

import type { MarpPresentation, MarpSlide } from './MarpContentService';
import type { EnhancedSlideRequest } from './aiServiceInterface';
import { decideVisualContentType, type VisualContentRequest } from './visualContentDecisionEngine';

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
  /**
   * MarpプレゼンテーションからJSONレイアウト生成用プロンプトを構築
   */
  buildLayoutPrompt(marpPresentation: MarpPresentation, options: LayoutOptions = {}): string {
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

    const slidesInfo = marpPresentation.slides.map((slide, index) => {
      const slideType = index === 0 ? 'title_slide' : 'content_slide';
      return `スライド${index + 1}: "${slide.title}" (${slideType})
内容: ${slide.content.substring(0, 150)}${slide.content.length > 150 ? '...' : ''}${slide.imagePrompt ? `
画像: ${slide.imagePrompt}` : ''}${slide.notes ? `
ノート: ${slide.notes}` : ''}`;
    }).join('\n\n');

    return `以下のMarp形式プレゼンテーションを、視覚的に魅力的なJSONレイアウトに変換してください。

**デザイナー:** ${designer}
**テーマ:** ${theme}
**アスペクト比:** ${aspectRatio}

**レイアウト指針:**
${designerLayoutGuidance}

**色彩設計:**
${themeColors}

**元のスライド情報:**
${slidesInfo}

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
- text_focus: 全幅テキスト + 小さな装飾画像
- split_content: 上下または左右に内容を分割

${customLayoutRules ? `**追加レイアウトルール:** ${customLayoutRules}` : ''}

**出力形式（Minified JSON - スペース・改行なし）:**
{"title":"プレゼンテーションタイトル","description":"プレゼンテーション説明","slides":[{"id":"slide-1","title":"タイトル","layers":[{"id":"title-layer-1","type":"text","content":"メインタイトル","x":10,"y":35,"width":80,"height":30,"fontSize":64,"textColor":"#1a365d","textAlign":"center","zIndex":2}],"background":"linear-gradient(135deg, #667eea 0%, #764ba2 100%)","aspectRatio":"${aspectRatio}","template":"title_slide","notes":"発表者ノート"}]}

**絶対条件:**
- JSON形式のみ出力（前後の説明文禁止）
- Minified形式（スペース・改行なし）
- 全座標は0-100の範囲
- 各画像レイヤーにはpromptプロパティ必須（${includeImages ? '有効' : '無効'}）
- トークン数最小化を優先`;
  }

  /**
   * Enhanced Slide Requestからレイアウトオプションを変換
   */
  static fromEnhancedRequest(request: EnhancedSlideRequest): LayoutOptions {
    return {
      theme: request.theme,
      designer: request.designer,
      aspectRatio: '16:9', // デフォルト
      includeImages: request.includeImages,
      customLayoutRules: request.customInstructions,
      purpose: request.purpose, // SVG/Image決定に使用
    };
  }

  /**
   * 生成されたJSONレスポンスをパースして検証
   */
  parseLayoutResponse(jsonResponse: string): JSONPresentation {
    try {
      // JSONをパース
      const parsed = JSON.parse(jsonResponse);
      
      // 基本構造の検証
      if (!parsed.title || !parsed.slides || !Array.isArray(parsed.slides)) {
        throw new Error('Invalid JSON structure: missing title or slides array');
      }
      
      // 各スライドの検証と正規化
      const validatedSlides: JSONSlide[] = parsed.slides.map((slide: any, index: number) => {
        if (!slide.id) {
          slide.id = `slide-${index + 1}`;
        }
        
        if (!slide.title) {
          slide.title = `スライド ${index + 1}`;
        }
        
        if (!slide.layers || !Array.isArray(slide.layers)) {
          slide.layers = [];
        }
        
        // レイヤーの検証
        slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
          if (!layer.id) {
            layer.id = `${slide.id}-layer-${layerIndex + 1}`;
          }
          
          // 座標の検証と正規化
          layer.x = this.clampCoordinate(layer.x, 0, 100);
          layer.y = this.clampCoordinate(layer.y, 0, 100);
          layer.width = this.clampCoordinate(layer.width, 1, 100);
          layer.height = this.clampCoordinate(layer.height, 1, 100);
          
          // zIndexデフォルト
          if (typeof layer.zIndex !== 'number') {
            layer.zIndex = 1;
          }
          
          return layer;
        });
        
        // デフォルト値の設定
        if (!slide.background) {
          slide.background = '#ffffff';
        }
        
        if (!slide.aspectRatio) {
          slide.aspectRatio = '16:9';
        }
        
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

  private getDesignerLayoutGuidance(designer: string): string {
    const guidance = {
      'The Emotional Storyteller': `
- 感情的インパクトを重視した大胆なレイアウト
- 画像を大きく配置（60-70%の領域）
- フォントサイズは大きめで読みやすく
- 暖色系の背景グラデーション
- ストーリーの流れを視覚的に表現`,
      
      'The Corporate Strategist': `
- ビジネス文書らしい整然としたレイアウト
- 左右分割や上下分割を基本とする
- データや図表スペースを確保
- 落ち着いた色調（紺、グレー、白）
- 読みやすさと信頼性を重視`,
      
      'The Academic Visualizer': `
- 学術的で体系的なレイアウト
- テキストエリアを広めに確保
- 図表や画像は補助的な配置
- シンプルで清潔感のあるデザイン
- 情報の階層構造を明確に表現`,
      
      'The Amateur Designer': `
- 親しみやすく自由度の高いレイアウト
- 非対称や動きのある配置も活用
- ポップな色使いや楽しい要素
- 画像とテキストのバランスを重視
- 堅くならない自然な配置`
    };
    
    return guidance[designer as keyof typeof guidance] || guidance['The Academic Visualizer'];
  }

  private getThemeColors(theme: string): string {
    const colors = {
      'professional': `
- メイン: #1a365d (濃紺)
- サブ: #4a5568 (グレー)  
- アクセント: #3182ce (青)
- 背景: #ffffff (白) または linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
      
      'minimalist': `
- メイン: #2d3748 (チャコール)
- サブ: #718096 (薄グレー)
- アクセント: #48bb78 (緑)
- 背景: #f7fafc (極薄グレー) または #ffffff (白)`,
      
      'academic': `
- メイン: #2c5282 (アカデミックブルー)
- サブ: #4a5568 (グレー)
- アクセント: #805ad5 (紫)
- 背景: #ffffff (白) または #f8f9fa (極薄グレー)`,
      
      'creative': `
- メイン: #6b46c1 (紫)
- サブ: #ec4899 (ピンク)
- アクセント: #10b981 (エメラルド)
- 背景: linear-gradient(135deg, #667eea 0%, #764ba2 100%) または #ffffff`,
      
      'tech_modern': `
- メイン: #1a202c (ダーク)
- サブ: #4a5568 (グレー)
- アクセント: #00d4aa (ターコイズ)
- 背景: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)`,
    };
    
    return colors[theme as keyof typeof colors] || colors['professional'];
  }

  /**
   * 🆕 視覚要素のコンテンツタイプを自動決定
   */
  private decideVisualContentType(
    prompt: string,
    slideContext: string,
    position: { x: number; y: number; width: number; height: number },
    options: LayoutOptions
  ): 'svg' | 'image' {
    const request: VisualContentRequest = {
      prompt,
      slideContext,
      purpose: options.purpose,
      theme: options.theme,
      position
    };

    const decision = decideVisualContentType(request);
    
    console.log('🎨 Visual content decision:', {
      prompt: prompt.substring(0, 50) + '...',
      decision: decision.contentType,
      confidence: decision.confidence.toFixed(2),
      reasoning: decision.reasoning
    });

    return decision.contentType;
  }

  /**
   * 🆕 プロンプト内の視覚要素を分析しSVG/Imageを自動選択
   */
  enhanceLayoutPromptWithVisualDecisions(
    basePrompt: string, 
    marpPresentation: MarpPresentation,
    options: LayoutOptions
  ): string {
    // レイアウトプロンプトにSVG/Image決定指針を追加
    const enhancedPrompt = basePrompt + `

🎯 **重要：視覚コンテンツの自動選択指針**

各スライドの視覚要素について、以下の基準でtypeを決定してください：

**SVGを選択すべき場合 (type: "svg")**:
- アイコン、ロゴ、記号
- グラフ、チャート、図表、ダイアグラム
- フローチャート、組織図
- 抽象的な概念図、幾何学図形
- シンプルなイラスト、線画
- UI要素（ボタン、矢印など）

**Imageを選択すべき場合 (type: "image")**:
- 写真、リアルな画像
- 複雑な背景やテクスチャ
- 人物、風景、建物
- 詳細で写実的な表現が必要なもの

**出力JSONでのtype指定**:
- SVG選択時: "type": "svg", "content": "<svg>...</svg>", "prompt": "生成用プロンプト"
- Image選択時: "type": "image", "src": "", "prompt": "生成用プロンプト"

**決定例**:
- "売上グラフ" → type: "svg"
- "会社ロゴ" → type: "svg"  
- "オフィス写真" → type: "image"
- "人物ポートレート" → type: "image"

各視覚要素のtypeを適切に判断してJSONに含めてください。`;

    return enhancedPrompt;
  }
}