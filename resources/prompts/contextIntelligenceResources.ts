// =================================================================
// Context Intelligence Engine - TypeScript Prompt Resources
// 
// 目的: AIによる完全分析でキーワードマッチング排除
// 原則: 
//   - 生成AIの理解能力を最大活用
//   - ルールベース判定を完全排除  
//   - コンテクストベース判定に切り替え
// =================================================================

export interface ContentTypeAnalysis {
  systemPrompt: string;
  categories: {
    [key: string]: {
      description: string;
      examples: string[];
      specialRules?: string[];
    };
  };
  classificationHints: {
    [key: string]: string;
  };
  responseFormat: string;
}

export interface DesignerSelection {
  systemPrompt: string;
  designers: {
    [key: string]: {
      name: string;
      description: string;
      suitableFor: string[];
    };
  };
  responseFormat: string;
}

export interface UnifiedAnalysis {
  systemPrompt: string;
  analysisStructure: {
    contentAnalysis: {
      contentType: string;
      note: string;
      isStoryContent: string;
      confidence: string;
      reasoning: string;
    };
    designerSelection: {
      selectedDesigner: string;
      reason: string;
      confidence: string;
    };
    purposeSelection: {
      selectedPurpose: string;
      reason: string;
      confidence: string;
    };
    themeSelection: {
      selectedTheme: string;
      reason: string;
      confidence: string;
    };
    additionalSettings: {
      suggestedSlideCount: string;
      needsPageNumbers: string;
      imageConsistencyLevel: string;
      reasoning: string;
    };
  };
  judgmentCriteria: {
    [key: string]: string;
  };
  criticalRule: string;
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

export interface DesignerStrategies {
  academicVisualizer: {
    contentPrompt: string;
  };
  baseStrategy: {
    speakerNotesIntro: string;
    speakerNotesContent: string;
    titleSlideNotes: string;
    jsonStructureInstructions: string;
    imageInstructions: string;
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
  contentTypeAnalysis: ContentTypeAnalysis;
  designerSelection: DesignerSelection;
  unifiedAnalysis: UnifiedAnalysis;
  marpLayoutGeneration: MarpLayoutGeneration;
  marpContentGeneration: MarpContentGeneration;
  topicProcessing: TopicProcessing;
  designerStrategies: DesignerStrategies;
  geminiService: GeminiService;
  unifiedAIService: UnifiedAIService;
  svgGeneration: SVGGeneration;
  azureTextService: AzureTextService;
}

// =================================================================
// メインリソースオブジェクト
// =================================================================

export const contextIntelligenceResources: ContextIntelligenceResources = {
  // コンテンツタイプ分析プロンプト
  contentTypeAnalysis: {
    systemPrompt: `あなたは優秀なコンテンツ分類エキスパートです。
以下のリクエストを分析し、最適なカテゴリを判定してください。`,

    categories: {
      story: {
        description: "物語・ストーリー・童話・民話",
        examples: [
          "桃太郎の話を作成して",
          "感動する体験談を書いて",
          "冒険物語を作って"
        ]
      },
      technical: {
        description: "技術・IT・AI・エンジニアリング関連の説明・調査",
        examples: [
          "GPT-5について調べて",
          "プログラミングの仕組みを説明",
          "AIの技術解説"
        ]
      },
      business: {
        description: "ビジネス・経営・研修・マーケティング・企業関連",
        examples: [
          "営業戦略の提案",
          "クリティカルシンキング研修資料",
          "売上分析レポート",
          "リーダーシップ研修"
        ]
      },
      academic: {
        description: "学術・研究・教育・実用的指導・料理レシピ",
        examples: [
          "環境問題の調査",
          "歴史の解説",
          "プランクのやり方",
          "料理の作り方",
          "チャーシューレシピ",
          "使い方ガイド"
        ],
        specialRules: [
          "「やり方」「方法」「手順」「料理」「レシピ」の実用解説は全てacademic（実践教育）"
        ]
      },
      creative: {
        description: "芸術・デザイン・創作活動・表現",
        examples: [
          "アート作品の紹介",
          "デザインコンセプト",
          "創作活動の発表"
        ]
      }
    },

    classificationHints: {
      business: "クリティカルシンキング、リーダーシップ、人材育成、プレゼンテーション",
      technical: "GPT、AI、プログラミング、システム、API",
      story: "桃太郎、童話、ストーリー、体験談",
      academic: "環境、歴史、科学、理論",
      cooking: "チャーシュー、レシピ、調理、食材、作り方、料理法 → academic（料理教育として）"
    },

    responseFormat: `回答形式: カテゴリ名のみを英語で回答（story, technical, business, academic, creative のいずれか）`
  },

  // デザイナー選択プロンプト
  designerSelection: {
    systemPrompt: `コンテンツタイプ"{contentType}"の以下のトピックに最適なデザイナーを選択してください。`,

    designers: {
      emotionalStoryteller: {
        name: "The Emotional Storyteller",
        description: "物語・感動系",
        suitableFor: ["story", "emotional_content"]
      },
      corporateStrategist: {
        name: "The Corporate Strategist",
        description: "ビジネス・企業系",
        suitableFor: ["business", "corporate_content"]
      },
      logical: {
        name: "logical",
        description: "技術・論理的・AI系",
        suitableFor: ["technical", "engineering_content"]
      },
      academicVisualizer: {
        name: "The Academic Visualizer",
        description: "学術・教育系（理論・研究）",
        suitableFor: ["academic", "research_content"]
      },
      amateur: {
        name: "amateur",
        description: "実用指導・料理・家庭的な内容",
        suitableFor: ["academic", "practical_content", "cooking", "tutorial"]
      },
      creative: {
        name: "creative",
        description: "芸術・創作系",
        suitableFor: ["creative", "artistic_content"]
      }
    },

    responseFormat: `回答形式: デザイナー名のみを英語で回答（例: logical）`
  },

  // 統合分析プロンプト
  unifiedAnalysis: {
    systemPrompt: `トピック: "{topic}"
    
以下を1回で分析し、**Minified JSON形式（スペース・改行・インデントなし）**で回答してください。トークン数節約のため、整形は不要です。

分析対象項目: {autoItems}`,

    analysisStructure: {
      contentAnalysis: {
        contentType: "story|business|academic|creative|technical",
        note: "料理・レシピ・チャーシューなどの実用ガイドはacademicとして分類する",
        isStoryContent: "true/false",
        confidence: "0.0-1.0の数値",
        reasoning: "判定理由"
      },
      designerSelection: {
        selectedDesigner: "The Academic Visualizer|The Corporate Strategist|The Emotional Storyteller|amateur|creative",
        reason: "選択理由",
        confidence: "0.0-1.0の数値"
      },
      purposeSelection: {
        selectedPurpose: "教育・学習支援|ビジネス・営業プレゼンテーション|ストーリーテリング・物語の共有|研修・トレーニング資料|レポート・報告書|その他",
        reason: "選択理由",
        confidence: "0.0-1.0の数値"
      },
      themeSelection: {
        selectedTheme: "academic|professional|creative|storytelling|minimalist|vibrant",
        reason: "選択理由",
        confidence: "0.0-1.0の数値"
      },
      additionalSettings: {
        suggestedSlideCount: "推奨スライド数(5-20)",
        needsPageNumbers: "true/false",
        imageConsistencyLevel: "low|medium|high",
        reasoning: "設定理由"
      }
    },

    judgmentCriteria: {
      story: "物語系（桃太郎、昔話、童話、紙芝居など）→ story + Emotional Storyteller + storytelling",
      business: "ビジネス系（戦略、分析、ROI、研修など）→ business + Corporate Strategist + professional",
      academic: "学術系（研究、理論、科学分析など）→ academic + Academic Visualizer + academic",
      cooking: "料理系（チャーシュー、レシピ、料理、調理、作り方など）→ academic + amateur + academic",
      creative: "創作系（アート、デザイン、創造など）→ creative + creative + creative",
      technical: "技術系（AI、プログラミング、システム、IT）→ technical + Academic Visualizer + professional"
    },

    criticalRule: `⚠️重要：料理・レシピ・チャーシューは必ずacademicとして分類すること`,

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

**Minified JSON形式（スペース・改行・インデントなし）**で単一スライドとして回答してください。トークン数節約のため、整形は不要です:

{
  "id": "slide_{slideNumber}",
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

  // デザイナー戦略プロンプト
  designerStrategies: {
    academicVisualizer: {
      contentPrompt: `
トピック: {topic}

【The Academic Visualizer - レイアウト専門】
あなたの専門知識を最大限活用し、「{topic}」について最も有用で正確な内容を提供してください。

レイアウト指針:
- 体系的で構造化された情報配置
- 論理的階層による明確な情報組織  
- バランスの取れた視覚的配置
- 情報密度高めの詳細表示

{purposeInstructions}、{themeInstructions}{slideCountInstructions}。
{imageInstructions}

{jsonStructureInstructions}`
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

      jsonStructureInstructions: `
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
      "aspectRatio": "16:9"
    }
  ]
}`,

      imageInstructions: "{frequencyText}{styleInstruction}関連画像を含めて"
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