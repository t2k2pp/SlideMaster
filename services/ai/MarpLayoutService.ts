// =================================================================
// Marp Layout Service - 第2段階：MarpからMinified JSONレイアウト生成
// Marpコンテンツを受け取り、視覚的なJSONレイアウトを生成
// =================================================================

import type { MarpPresentation, MarpSlide } from './MarpContentService';
import type { EnhancedSlideRequest } from './aiServiceInterface';
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

🎯 **重要：コンテキストに基づく視覚コンテンツ戦略**

**プレゼンテーション用途**: ${options.purpose || 'general'} - ${purposeContext}
**テーマスタイル**: ${options.theme || 'professional'} - ${themeContext}

上記の用途とテーマを考慮し、各スライドで視覚要素が必要な場合は以下の判断基準に従ってください：

**SVG適用判断基準**:
1. **ビジネス・学術・技術系**: データ表現、プロセス図、概念図、構造図 → 積極的にSVG使用
2. **教育・解説系**: 理解促進のための図解、手順説明 → SVG推奨  
3. **ストーリー・創作系**: 装飾的な要素以外は基本的にImage優先
4. **子供向け**: 温かみのあるImage中心、必要最小限のSVG

**SVG生成すべき内容例**:
- 各種グラフ・チャート（売上、比較、推移など）
- フローチャート・プロセス図  
- 組織図・関係図・構造図
- ER図・システム図・アーキテクチャ図
- 概念図・理論図・モデル図
- アイコン・記号・矢印

**Image使用すべき内容例**:
- 写真・風景・人物
- 具体的な製品・物品
- 雰囲気作りの背景
- リアルな表現が必要なもの

**出力形式**:
- SVG必要時: "type": "svg", "content": "[実際のSVGコード]", "prompt": "SVG生成指示"
- Image必要時: "type": "image", "src": "", "prompt": "画像生成指示"

**重要**: 用途が「${options.purpose || 'general'}」であることを常に考慮し、不適切な視覚要素は避けてください。SVGが必要と判断した場合は、promptではなく実際のSVGコードをcontentに含めて出力してください。`;

    return enhancedPrompt;
  }

  /**
   * 用途コンテキストの構築
   */
  private buildPurposeContext(purpose?: string): string {
    const contexts = {
      'business_presentation': 'データ・プロセス・構造の可視化が重要。グラフや図表でSVG活用推奨',
      'academic_research': '理論・データ・関係性の正確な表現が必須。SVG図表が効果的',
      'educational_content': '理解促進のための分かりやすい図解が重要。概念図はSVG推奨', 
      'tutorial_guide': '手順・プロセスの明確な表現が必要。フローチャートはSVG最適',
      'marketing_pitch': 'インパクトのある表現が重要。データ表現はSVG、イメージはPhoto',
      'technical_documentation': '正確で詳細な技術図表が必要。システム図・ER図はSVG必須',
      'storytelling': '物語性と感情的表現が重要。基本的にImage中心',
      'children_content': '親しみやすい表現が重要。温かみのあるImage中心、最小限のSVG',
      'training_material': '理解しやすい図解が重要。プロセス・概念図はSVG推奨'
    };
    
    return contexts[purpose as keyof typeof contexts] || 'バランスの取れた視覚表現を心がける';
  }

  /**
   * テーマコンテキストの構築  
   */
  private buildThemeContext(theme?: string): string {
    const contexts = {
      'professional': '洗練されたビジネス表現。データ可視化でSVG活用',
      'academic': '学術的で正確な表現。理論図・データ図はSVG重要',
      'minimalist': 'シンプルで要点を絞った表現。必要最小限の効果的なSVG',
      'creative': '創造的で自由な表現。バランスの良いSVG/Image混在',
      'technical': '技術的で詳細な表現。システム・アーキテクチャ図でSVG必須',
      'storytelling': '物語性重視。感情的なImage中心',
      'children_bright': '子供向けの明るい表現。Image中心、補助的SVG',
      'medical': '医学的精度が重要。正確な図表でSVG活用'
    };
    
    return contexts[theme as keyof typeof contexts] || 'テーマに適した適切な視覚表現';
  }
}