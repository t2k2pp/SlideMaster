// =================================================================
// Azure Text Service - テキスト生成サービス
// Azure OpenAI GPT-4等を使用したテキスト生成
// =================================================================

import { AzureOpenAIClient } from './azureOpenAIClient';
import { AzureOpenAIConfig, AzureTextGenerationRequest, validateTextGenerationRequest } from './azureOpenAIConfig';

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export class AzureTextService {
  private client: AzureOpenAIClient;

  constructor(config: AzureOpenAIConfig) {
    this.client = new AzureOpenAIClient(config);
  }

  async generateText(options: TextGenerationOptions): Promise<string> {
    const request: AzureTextGenerationRequest = {
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop
    };

    const validationErrors = validateTextGenerationRequest(request);
    if (validationErrors.length > 0) {
      throw new Error(`Text generation validation failed: ${validationErrors.join(', ')}`);
    }

    return this.client.generateText(request);
  }

  async generateSlideContent(topic: string, slideCount: number = 5): Promise<string> {
    const systemPrompt = `You are a world-class presentation designer with expertise in creating visually stunning, engaging presentations. You understand modern design principles, information hierarchy, and audience engagement.

Your task is to create a professional presentation with:
- Strategic layout design with proper visual hierarchy
- Balanced text and image placement
- Engaging visual elements
- Clear information flow
- Professional typography choices
- Consistent design language

You must respond with a valid JSON object that represents a complete presentation structure with multiple layers per slide for rich, engaging content.`;

    const prompt = `「${topic}」について${slideCount}枚のプロフェッショナルなスライド構成を作成してください。

重要な要件：
1. 各スライドは複数のレイヤーで構成し、視覚的に魅力的なレイアウトにする
2. タイトルレイヤーと本文レイヤーを適切に配置
3. 画像レイヤーも含める（prompt付きで）
4. フォントサイズは適切に調整（タイトル48-72px、本文24-36px）
5. 色使いは統一感のあるプロフェッショナルなもの
6. レイアウトはスライドの内容に応じて多様化

**座標系について（必須）:**
- x, y, width, height は全て0-100の数値（パーセンテージ座標系）
- x: 0 = 左端、x: 100 = 右端
- y: 0 = 上端、y: 100 = 下端  
- width: 80 = スライド幅の80%
- height: 30 = スライド高さの30%

**Minified JSON形式（スペース・改行なし）**で必ず回答してください。Azure OpenAI / Gemini共通でトークン数節約が重要です：
{
  "title": "魅力的なプレゼンテーションタイトル",
  "description": "プレゼンテーションの概要説明",
  "slides": [
    {
      "id": "slide-1",
      "title": "スライドタイトル",
      "layers": [
        {
          "id": "title-layer-1",
          "type": "text",
          "content": "メインタイトル",
          "x": 10,
          "y": 35,
          "width": 80,
          "height": 30,
          "fontSize": 64,
          "textColor": "#1a365d",
          "textAlign": "center",
          "zIndex": 2
        },
        {
          "id": "subtitle-layer-1", 
          "type": "text",
          "content": "サブタイトルまたは概要",
          "x": 10,
          "y": 65,
          "width": 80,
          "height": 15,
          "fontSize": 28,
          "textColor": "#4a5568",
          "textAlign": "center",
          "zIndex": 1
        }
      ],
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "aspectRatio": "16:9",
      "template": "title_slide",
      "notes": "発表者向けの詳細なノート"
    },
    {
      "id": "slide-2",
      "title": "コンテンツスライド例",
      "layers": [
        {
          "id": "title-layer-2",
          "type": "text", 
          "content": "セクションタイトル",
          "x": 10,
          "y": 10,
          "width": 80,
          "height": 15,
          "fontSize": 52,
          "textColor": "#2d3748",
          "textAlign": "left",
          "zIndex": 3
        },
        {
          "id": "content-layer-2",
          "type": "text",
          "content": "• 重要なポイント1\\n• 重要なポイント2\\n• 重要なポイント3",
          "x": 5,
          "y": 30,
          "width": 45,
          "height": 60,
          "fontSize": 32,
          "textColor": "#4a5568",
          "textAlign": "left",
          "zIndex": 2
        },
        {
          "id": "image-layer-2",
          "type": "image",
          "src": "",
          "prompt": "${topic}に関連する高品質でプロフェッショナルな画像",
          "x": 55,
          "y": 30,
          "width": 40,
          "height": 60,
          "objectFit": "cover",
          "objectPosition": "center-center",
          "zIndex": 1
        }
      ],
      "background": "#ffffff",
      "aspectRatio": "16:9", 
      "template": "image_right",
      "notes": "このスライドでは..."
    }
  ]
}

必須事項：
- 各スライドは2-4個のレイヤーを持つこと
- 1番目のスライドはタイトルスライド（タイトル中央配置、画像なし）
- 2番目以降は内容スライド（画像付き、多様なレイアウト）
- 画像レイヤーには必ずpromptプロパティを含める
- フォントサイズは階層に応じて適切に設定
- レイアウトパターン例：
  * 左右分割: テキスト(x:5, width:45) + 画像(x:55, width:40)
  * 上下分割: タイトル(y:5) + 画像(y:25) + テキスト(y:70)
  * 中央配置: タイトル(x:10, y:35, width:80)
- 座標は必ず0-100の範囲で指定
- **Minified JSON形式（スペース・改行なし）で出力すること**
- トークン数節約のため整形不要
- JSON形式以外は一切出力しないこと`;

    return this.generateText({
      prompt,
      systemPrompt,
      temperature: 0.8
    });
  }

  async improveSlideContent(currentContent: string, improvementType: 'clarity' | 'engagement' | 'structure' | 'brevity'): Promise<string> {
    const systemPrompts = {
      clarity: 'あなたは明確性を重視するプレゼンテーション専門家です。内容をより分かりやすく、理解しやすく改善してください。',
      engagement: 'あなたは聴衆の関心を引くプレゼンテーション専門家です。内容をより魅力的で興味深いものに改善してください。',
      structure: 'あなたは論理的構成を重視するプレゼンテーション専門家です。内容の構成と流れを改善してください。',
      brevity: 'あなたは簡潔性を重視するプレゼンテーション専門家です。内容を簡潔で要点を絞ったものに改善してください。'
    };

    const prompt = `以下のスライド内容を「${improvementType}」の観点から改善してください：

${currentContent}

改善版をMarkdown形式で出力してください。`;

    return this.generateText({
      prompt,
      systemPrompt: systemPrompts[improvementType],
      temperature: 0.6
    });
  }

  async generateSpeakerNotes(slideContent: string): Promise<string> {
    const systemPrompt = 'あなたはプレゼンテーション支援の専門家です。スライド内容に基づいて、発表者向けの詳細なスピーカーノートを作成してください。';

    const prompt = `以下のスライド内容について、発表者向けのスピーカーノートを作成してください：

${slideContent}

以下の要素を含めてください：
- 各スライドの導入方法
- 重要なポイントの説明
- 聴衆との関わり方
- 移行の仕方
- 質疑応答の準備`;

    return this.generateText({
      prompt,
      systemPrompt,
      temperature: 0.5
    });
  }

  async translateSlideContent(content: string, targetLanguage: string = 'en'): Promise<string> {
    const languageNames = {
      en: '英語',
      ja: '日本語',
      ko: '韓国語',
      zh: '中国語',
      fr: 'フランス語',
      de: 'ドイツ語',
      es: 'スペイン語'
    };

    const targetLangName = languageNames[targetLanguage as keyof typeof languageNames] || targetLanguage;

    const systemPrompt = `あなたは専門的な翻訳者です。プレゼンテーション内容を正確に${targetLangName}に翻訳してください。
専門用語は適切に翻訳し、文化的なニュアンスも考慮してください。`;

    const prompt = `以下のスライド内容を${targetLangName}に翻訳してください：

${content}

元の構造とフォーマットを保持してください。`;

    return this.generateText({
      prompt,
      systemPrompt,
      temperature: 0.3
    });
  }
}