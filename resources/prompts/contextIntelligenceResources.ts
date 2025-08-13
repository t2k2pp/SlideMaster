// =================================================================
// Context Intelligence Engine - Simplified Style-Based System
// 
// 目的: 4つのシンプルなスタイルベースでプレゼンテーション生成を最適化
// スタイル: 
//   - simple: シンプルで洗練されたデザイン
//   - education: 教育向け、大きな文字とイラスト重視
//   - marketing-oriented: 製品・サービスを魅力的に見せるビジュアル重視
//   - research presentation-oriented: 論理的構成とインフォグラフィック
// =================================================================

export interface StyleAnalysis {
  systemPrompt: string;
  styles: {
    [key: string]: {
      name: string;
      description: string;
      characteristics: string[];
      imageStyle: string;
      layoutPriority: string;
    };
  };
  responseFormat: string;
}

export interface SimplifiedAnalysis {
  systemPrompt: string;
  analysisStructure: {
    styleSelection: {
      selectedStyle: string;
      reason: string;
      confidence: string;
    };
    presentationSettings: {
      suggestedSlideCount: string;
      needsPageNumbers: string;
      imageConsistencyLevel: string;
      reasoning: string;
    };
  };
  responseFormat: string;
}

export interface MarpLayoutGeneration {
  singleSlideLayoutPrompt: string;
}

export interface MarpContentGeneration {
  titleGenerationPrompt: string;
  marpPrompt: string;
  storyMarpPrompt: string;
}

export interface TopicProcessing {
  expansionPrompt: string;
  structuringPrompt: string;
}

export interface StyleStrategies {
  simple: {
    contentPrompt: string;
    imagePrompt: string;
    layoutGuidance: string;
  };
  education: {
    contentPrompt: string;
    imagePrompt: string;
    layoutGuidance: string;
  };
  marketingOriented: {
    contentPrompt: string;
    imagePrompt: string;
    layoutGuidance: string;
  };
  researchPresentationOriented: {
    contentPrompt: string;
    imagePrompt: string;
    layoutGuidance: string;
  };
  baseStrategy: {
    speakerNotesIntro: string;
    speakerNotesContent: string;
    titleSlideNotes: string;
    jsonStructureInstructions: string;
  };
}

export interface GeminiService {
  slideContentPrompt: string;
  systemPrompt: string;
}

export interface UnifiedAIService {
  systemPrompt: string;
}

export interface SVGGeneration {
  systemPrompt: string;
  userPrompt: string;
}

export interface AzureTextService {
  improvementPrompts: {
    [key: string]: string;
  };
  improveContentPrompt: string;
  speakerNotesSystemPrompt: string;
  speakerNotesPrompt: string;
  translationSystemPrompt: string;
  translationPrompt: string;
}

export interface ContextIntelligenceResources {
  styleAnalysis: StyleAnalysis;
  simplifiedAnalysis: SimplifiedAnalysis;
  marpLayoutGeneration: MarpLayoutGeneration;
  marpContentGeneration: MarpContentGeneration;
  topicProcessing: TopicProcessing;
  styleStrategies: StyleStrategies;
  geminiService: GeminiService;
  unifiedAIService: UnifiedAIService;
  svgGeneration: SVGGeneration;
  azureTextService: AzureTextService;
}

// =================================================================
// メインリソースオブジェクト
// =================================================================

export const contextIntelligenceResources: ContextIntelligenceResources = {
  // スタイル分析プロンプト
  styleAnalysis: {
    systemPrompt: `あなたはプレゼンテーションスタイル選択のエキスパートです。
以下のトピックを分析し、最適なプレゼンテーションスタイルを4つの選択肢から選択してください。`,

    styles: {
      simple: {
        name: "simple",
        description: "シンプルで洗練されたデザイン、グラフや表を使いやすいレイアウト、論理的な構成をサポート",
        characteristics: [
          "スタイリッシュでクリーンなデザイン",
          "データ可視化に適したレイアウト", 
          "論理的な情報構成",
          "アジェンダ、結論、次のステップなどの構造化されたページ",
          "ビジネス・学術・技術系に適する"
        ],
        imageStyle: "プロフェッショナル、クリーンなビジュアル、図表・グラフ・チャート重視",
        layoutPriority: "構造性と可読性を重視、シンプルな配色"
      },
      education: {
        name: "education",
        description: "文字サイズを大きくし、イラストやアイコンを多めに配置する教育・学習向けスタイル",
        characteristics: [
          "大きく読みやすい文字サイズ",
          "イラストやアイコンを多用",
          "図解やステップ形式のレイアウト",
          "専門的なグラフより分かりやすいビジュアル",
          "子供向けコンテンツでは親しみやすい画像も許可"
        ],
        imageStyle: "分かりやすいイラスト重視、図解・ステップ説明、子供向けなら「childish imagery OK」",
        layoutPriority: "視認性と理解しやすさを重視"
      },
      marketingOriented: {
        name: "marketing-oriented", 
        description: "製品やサービスを魅力的に見せるための写真や動画を配置しやすいビジュアル重視スタイル",
        characteristics: [
          "ビジュアルインパクトを重視",
          "製品・サービス写真を中心としたレイアウト",
          "魅力的なデザインとカラースキーム",
          "商品写真風のプレースホルダー画像",
          "最終的には実際の製品写真に差し替え前提"
        ],
        imageStyle: "商品写真風、魅力的な製品ビジュアル、マーケティング素材として使用可能",
        layoutPriority: "視覚的インパクトと魅力を重視"
      },
      researchPresentationOriented: {
        name: "research-presentation-oriented",
        description: "図表や数式をきれいに配置できる研究発表向けスタイル",
        characteristics: [
          "論理的な研究発表構成（イントロ→方法→結果→考察→結論）",
          "図表や数式の美しい配置", 
          "PDCAサイクル、SWOT図などのビジネスフレームワーク対応",
          "インフォグラフィックス的な情報表示",
          "論理的思考を補助するビジュアル"
        ],
        imageStyle: "インフォグラフィック、論理補助図表、PDCA・SWOT等フレームワーク図",
        layoutPriority: "論理性と構造化された情報表示を重視"
      }
    },

    responseFormat: `**Minified JSON形式（スペース・改行・インデントなし）**で回答してください。トークン数節約のため、整形は不要です。
{
  "selectedStyle": "simple|education|marketing-oriented|research-presentation-oriented",
  "reason": "選択理由の説明",
  "confidence": "0.0-1.0の数値"
}`
  },

  // 簡素化された分析プロンプト
  simplifiedAnalysis: {
    systemPrompt: `トピック: "{topic}"
    
以下を1回で分析し、**Minified JSON形式（スペース・改行・インデントなし）**で回答してください。トークン数節約のため、整形は不要です。`,

    analysisStructure: {
      styleSelection: {
        selectedStyle: "simple|education|marketing-oriented|research-presentation-oriented",
        reason: "選択理由",
        confidence: "0.0-1.0の数値"
      },
      presentationSettings: {
        suggestedSlideCount: "推奨スライド数(5-20)",
        needsPageNumbers: "true/false",
        imageConsistencyLevel: "low|medium|high",
        reasoning: "設定理由"
      }
    },

    responseFormat: `**Minified JSON形式（スペース・改行・インデントなし）**のみで回答し、説明文は含めないでください。トークン数節約のため、整形は不要です。`
  },

  // Marp レイアウト生成プロンプト
  marpLayoutGeneration: {
    singleSlideLayoutPrompt: `以下の単一Marpスライドを、視覚的に魅力的なJSONレイアウトに変換してください。

**デザイナー:** {designer}
**テーマ:** {theme}
**アスペクト比:** {aspectRatio}

**レイアウト指針:**
{designerLayoutGuidance}

**色彩設計:**
{themeColors}

**スライド情報:**
{slideInfo}

**重要な要件:**
1. **座標系:** x, y, width, height は全て0-100の数値（パーセンテージ座標系）
2. **レイヤー構成:** 各スライドは2-4個のレイヤーで構成
3. **画像配置:** {imageInstruction}
4. **フォント階層:** タイトル(48-72px)、サブタイトル(28-36px)、本文(24-32px)
5. **zIndex:** 重なり順序を適切に設定（高い値が前面）

**レイアウトパターン:**
- title_slide: 中央配置タイトル + サブタイトル
- image_right: 左テキスト(50%) + 右画像(45%)
- image_left: 左画像(45%) + 右テキスト(50%)
- text_only: 全幅テキスト配置
- split_content: 上下または左右分割レイアウト

{customLayoutRules}

**重要：コンテンツフォーマット制限**
- contentフィールドでは、HTMLタグを一切使用しないでください
- <div>、<span>、<br>、style属性などは禁止です
- 代わりにMarkdown記法を使用してください（**太字**、### 見出し、- リストなど）
- プレーンテキストまたはMarkdown記法のみ使用可能

**Minified JSON形式（スペース・改行・インデントなし）**で単一スライドとして回答してください。トークン数節約のため、整形は不要です:

{
  "id": "slide_{slideNumber}",
  "title": "スライドタイトル",
  "layers": [
    {
      "id": "layer_1",
      "type": "text",
      "content": "テキスト内容（HTMLタグ禁止、Markdown可）",
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
  "aspectRatio": "{aspectRatio}",
  "template": "{slideType}"
}`
  },

  // MarpContent生成プロンプト
  marpContentGeneration: {
    titleGenerationPrompt: `以下の条件に基づいて、最適なプレゼンテーションタイトルを1つ生成してください。

**条件:**
- 内容: {topic}
- 用途: {purpose}
- テーマ: {theme}
- デザイナー: {designer}
- スライド数: {slideCount}枚

**タイトル要件（重要）:**
- 必ず15-25文字以内で収める
- 内容が一目で分かる簡潔な表現
- 対象者と用途に適している
- 覚えやすく親しみやすい

**絶対条件:**
- タイトルのみを1行で出力
- 説明文、解説、前置きは一切不要
- 25文字を超える場合は必ず短縮する

**出力例:**
ロジカルシンキング研修（15文字）
データ分析入門講座（10文字）`,

    marpPrompt: `「{topic}」について{slideCount}枚のプレゼンテーション資料を作成してください。
タイトルは"{generatedTitle}"を使用してください。

あなたの専門知識を活用して、最も有用で正確な内容を提供してください。

Marp形式で出力：

---
title: {generatedTitle}
description: {generatedTitle}について
theme: {theme}
---

# {generatedTitle}
## サブタイトル

---

# 2枚目のスライド
内容...
{imageInstruction}
**ノート:** スピーカーノート

以降{slideCount}枚まで続ける。

{customInstructions}`,

    storyMarpPrompt: `「{topic}」について{slideCount}枚のスライドを作成してください。
タイトルは"{generatedTitle}"を使用してください。

Marp形式で出力：

---
title: {generatedTitle}
description: {generatedTitle}
theme: storytelling
---

# {generatedTitle}
## サブタイトル

{imageInstruction}
**ノート:** スピーカーノート

---

# 2枚目のスライド
内容...

{imageInstruction}
**ノート:** スピーカーノート

以降{slideCount}枚まで続ける。`
  },

  // TopicProcessor プロンプト
  topicProcessing: {
    expansionPrompt: `以下のトピックを、ユーザーの元の意図を正確に保持したまま、スライド作成に適した内容に展開してください。

入力トピック: "{topic}"

展開の原則:
- ユーザーが求めている内容の本質を変えない
- 物語・創作系の場合は、ストーリーの魅力を重視
- 教育・ビジネス系の場合のみ、学習効果や実用性を考慮
- 元のトーンと方向性を保持

簡潔で自然な展開内容（150-300文字程度）:`,

    structuringPrompt: `以下の文章を分析し、MECE原則（漏れなく重複なく）に基づいて構造化してください。

入力文章:
"{topic}"

構造化の指針:
1. 主要テーマを特定
2. 内容を論理的カテゴリに分類
3. 重複を排除し、漏れをチェック
4. プレゼンテーション向けの論理的順序で整理
5. 各要素が相互排他的（Mutually Exclusive）かつ網羅的（Collectively Exhaustive）

出力形式:
- 明確な構造で整理
- スライド作成に適した内容
- 論理的な流れを持つ構成`
  },

  // スタイル戦略プロンプト
  styleStrategies: {
    simple: {
      contentPrompt: `トピック: {topic}

【Simple Style - シンプルで洗練された構成】
あなたの専門知識を最大限活用し、「{topic}」について最も有用で正確な内容を提供してください。

スタイル指針:
- スタイリッシュでクリーンなデザイン
- データ可視化に適したレイアウト
- 論理的な情報構成（アジェンダ、結論、次のステップ等の構造化）
- 構造性と可読性を重視、シンプルな配色

{slideCountInstructions}。
{imageInstructions}

{jsonStructureInstructions}`,

      imagePrompt: "プロフェッショナル、クリーンなビジュアル、図表・グラフ・チャート重視、{topic}に関連する高品質でビジネス適用可能な画像",
      
      layoutGuidance: "構造性重視のレイアウト、情報の階層化、余白を活用したクリーンなデザイン"
    },

    education: {
      contentPrompt: `トピック: {topic}

【Education Style - 教育・学習向け構成】
あなたの専門知識を最大限活用し、「{topic}」について最も分かりやすく教育的な内容を提供してください。

スタイル指針:
- 大きく読みやすい文字サイズ
- イラストやアイコンを多用した分かりやすい構成
- 図解やステップ形式のレイアウト
- 専門的なグラフより直感的に理解しやすいビジュアル
- 視認性と理解しやすさを重視

{slideCountInstructions}。
{imageInstructions}

{jsonStructureInstructions}`,

      imagePrompt: "分かりやすいイラスト重視、図解・ステップ説明、{topic}の教育に適した親しみやすい画像。子供向けコンテンツの場合は childish imagery OK",
      
      layoutGuidance: "視認性重視、大きなフォントサイズ、イラスト・アイコンを多用した分かりやすいレイアウト"
    },

    marketingOriented: {
      contentPrompt: `トピック: {topic}

【Marketing-Oriented Style - ビジュアル重視構成】
あなたの専門知識を最大限活用し、「{topic}」について最も魅力的でインパクトのある内容を提供してください。

スタイル指針:
- ビジュアルインパクトを重視した構成
- 製品・サービス写真を中心としたレイアウト
- 魅力的なデザインとカラースキーム
- 商品写真風のプレースホルダー画像使用
- 視覚的インパクトと魅力を重視

{slideCountInstructions}。
{imageInstructions}

{jsonStructureInstructions}`,

      imagePrompt: "商品写真風、魅力的な製品ビジュアル、{topic}に関連するマーケティング素材として使用可能な高品質画像",
      
      layoutGuidance: "視覚的インパクト重視、大きな画像エリア、魅力的な色使いとレイアウト"
    },

    researchPresentationOriented: {
      contentPrompt: `トピック: {topic}

【Research Presentation-Oriented Style - 研究発表向け構成】  
あなたの専門知識を最大限活用し、「{topic}」について最も論理的で研究発表に適した内容を提供してください。

スタイル指針:
- 論理的な研究発表構成（イントロダクション→方法→結果→考察→結論）
- 図表や数式の美しい配置
- PDCAサイクル、SWOT図などのビジネスフレームワーク対応
- インフォグラフィックス的な効果的情報表示
- 論理性と構造化された情報表示を重視

{slideCountInstructions}。  
{imageInstructions}

{jsonStructureInstructions}`,

      imagePrompt: "インフォグラフィック、論理補助図表、PDCA・SWOT等フレームワーク図、{topic}の論理的説明を補助する構造化されたビジュアル",
      
      layoutGuidance: "論理性重視、構造化された情報配置、フレームワーク図表を活用したレイアウト"
    },

    baseStrategy: {
      speakerNotesIntro: `【導入スライド】
{title}について説明します。
内容: {content}
発表時間: 1-2分
注意点: 聴衆の注意を引くよう、はっきりと話してください。`,

      speakerNotesContent: `【{title}】
要点: {content}
発表のポイント: この内容を{purposeContext}説明してください。
推奨発表時間: 1-2分`,

      titleSlideNotes: `【タイトルスライド】
{mainTitle}についてのプレゼンテーションを開始します。

発表の準備:
• 聴衆への挨拶と自己紹介
• プレゼンテーションの目的を明確に伝える
• 全体の構成や所要時間を予告

発表スタイル: {purposeContext}
推奨時間: 1-2分
注意点: 第一印象が重要なので、明確で自信を持って話してください。`,

      imageInstructions: `画像について: {frequencyText}適切な{styleInstruction}画像を配置してください。画像は内容と一致し、スライドの理解を助けるものにしてください。`,

      jsonStructureInstructions: `
結果は**Minified JSON形式（スペース・改行・インデントなし）**で以下の構造で出力してください。トークン数節約のため、整形は不要です：

**重要：コンテンツフォーマット制限**
- contentフィールドでは、HTMLタグを一切使用しないでください
- <div>、<span>、<br>、style属性などは禁止です
- 代わりにMarkdown記法を使用してください（**太字**、### 見出し、- リストなど）
- プレーンテキストまたはMarkdown記法のみ使用可能

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
          "content": "スライドの主要コンテンツ（HTMLタグ禁止、Markdown可）",
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
          "prompt": "画像生成用プロンプト",
          "x": 60,
          "y": 30,
          "width": 35,
          "height": 40
        }
      ],
      "background": "#ffffff",
      "aspectRatio": "16:9"
    }
  ]
}`
    }
  },

  // Gemini Service プロンプト
  geminiService: {
    slideContentPrompt: `以下のトピックについて、{slideCount}枚のプレゼンテーションスライドを作成してください。

トピック: {topic}

**Minified JSON形式（スペース・改行・インデントなし）**で以下の構造で出力してください。トークン数節約のため、整形は不要です：
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
      "aspectRatio": "16:9"
    }
  ]
}

各スライドは情報が豊富で、視覚的に魅力的になるように作成してください。`,

    systemPrompt: "あなたは優秀なプレゼンテーションデザイナーです。与えられたトピックについて、構造化された分かりやすいスライドを作成してください。"
  },

  // Unified AI Service プロンプト
  unifiedAIService: {
    systemPrompt: "あなたは優秀なプレゼンテーションデザイナーです。指定された形式でスライドコンテンツを生成してください。"
  },

  // SVG生成サービス プロンプト
  svgGeneration: {
    systemPrompt: `あなたは高品質なSVGコンテンツを生成する専門家です。

以下の指針でSVGを作成してください：

**技術要件**:
- 完全で有効なSVGタグで囲む
- viewBox="0 0 {width} {height}"を設定
- レスポンシブ対応のwidth="{width}" height="{height}"
- クリーンで最適化されたコード

**デザイン原則**:
- {style}スタイルで作成
- {colorScheme}配色を使用
- {complexity}レベルの複雑さ
- プレゼンテーション用途に適した視認性

**出力例**:
<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3b82f6"/>
</svg>`,

    userPrompt: `以下の要求に基づいてSVGを作成してください：

{prompt}

**重要**: SVGタグのみを出力し、説明文は不要です。`
  },

  // Azure テキストサービス プロンプト
  azureTextService: {
    improvementPrompts: {
      clarity: "あなたは明確性を重視するプレゼンテーション専門家です。内容をより分かりやすく、理解しやすく改善してください。",
      engagement: "あなたは聴衆の関心を引くプレゼンテーション専門家です。内容をより魅力的で興味深いものに改善してください。",
      structure: "あなたは論理的構成を重視するプレゼンテーション専門家です。内容の構成と流れを改善してください。",
      brevity: "あなたは簡潔性を重視するプレゼンテーション専門家です。内容を簡潔で要点を絞ったものに改善してください。"
    },

    improveContentPrompt: `以下のスライド内容を「{improvementType}」の観点から改善してください：

{currentContent}

改善されたコンテンツのみを出力してください。説明や分析は不要です。`,

    speakerNotesSystemPrompt: "あなたはプレゼンテーション支援の専門家です。スライド内容に基づいて、発表者向けの詳細なスピーカーノートを作成してください。",

    speakerNotesPrompt: `以下のスライド内容について、発表者向けのスピーカーノートを作成してください：

{slideContent}

以下の要素を含めてください：
- 話すべき要点
- 強調すべきポイント
- 想定される質問への準備
- タイミングや間の取り方
- 聴衆との関わり方`,

    translationSystemPrompt: `あなたは専門的な翻訳者です。プレゼンテーション内容を正確に{targetLangName}に翻訳してください。
専門用語は適切に翻訳し、文化的なニュアンスも考慮してください。`,

    translationPrompt: `以下のスライド内容を{targetLangName}に翻訳してください：

{content}`
  }
};

// デフォルトエクスポート
export default contextIntelligenceResources;