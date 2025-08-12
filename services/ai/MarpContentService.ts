// =================================================================
// Marp Content Service - 第1段階：Marpフォーマットコンテンツ生成
// Azure OpenAI / Gemini共通でMarp形式のスライドコンテンツを生成
// =================================================================

import type { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export interface MarpContentOptions {
  topic: string;
  slideCount?: number;
  purpose?: string;
  theme?: string;
  designer?: string;
  includeImages?: boolean;
  customInstructions?: string;
}

export interface MarpSlide {
  title: string;
  content: string;
  imagePrompt?: string;
  notes?: string;
}

export interface MarpPresentation {
  title: string;
  description: string;
  slides: MarpSlide[];
  metadata: {
    slideCount: number;
    theme: string;
    purpose: string;
    designer: string;
  };
}

export class MarpContentService {
  constructor() {
  }

  /**
   * プレゼンテーションタイトルを生成
   */
  buildTitleGenerationPrompt(options: MarpContentOptions): string {
    const { topic, purpose, theme, designer, slideCount } = options;
    
    let promptTemplate = contextIntelligenceResources.marpContentGeneration.titleGenerationPrompt;
    
    return promptTemplate
      .replace(/{topic}/g, topic)
      .replace(/{purpose}/g, purpose)
      .replace(/{theme}/g, theme)
      .replace(/{designer}/g, designer)
      .replace(/{slideCount}/g, slideCount.toString());
  }

  /**
   * トピックから基本的なMarpコンテンツを生成
   * 事前に生成されたタイトルを使用
   */
  buildMarpPrompt(options: MarpContentOptions, generatedTitle: string): string {
    const {
      topic,
      slideCount = 5,
      purpose = 'informative',
      theme = 'professional',
      designer = 'The Academic Visualizer',
      includeImages = true,
      customInstructions = ''
    } = options;

    // 物語・創作系の判定（統合分析結果またはフォールバック）
    const isStoryContent = this.determineStoryContent(topic, purpose, theme, options);
    
    if (isStoryContent) {
      // 物語・創作系の場合は子供向けの純粋な物語として作成
      return this.buildStoryMarpPrompt(topic, slideCount, generatedTitle, includeImages);
    }

    const imageInstruction = includeImages ? '**画像説明:** [関連する画像の説明]' : '';
    
    let promptTemplate = contextIntelligenceResources.marpContentGeneration.marpPrompt;
    
    return promptTemplate
      .replace(/{topic}/g, topic)
      .replace(/{slideCount}/g, slideCount.toString())
      .replace(/{generatedTitle}/g, generatedTitle)
      .replace(/{theme}/g, theme)
      .replace(/{imageInstruction}/g, imageInstruction)
      .replace(/{customInstructions}/g, customInstructions || '');
  }


  /**
   * Enhanced Slide Requestからオプションを変換
   */
  static fromEnhancedRequest(request: EnhancedSlideRequest): MarpContentOptions {
    return {
      topic: request.topic,
      slideCount: request.slideCount,
      purpose: request.purpose,
      theme: request.theme,
      designer: request.designer,
      includeImages: request.includeImages,
      customInstructions: request.customInstructions,
    };
  }

  /**
   * AIの応答からMarp部分のみを抽出
   */
  private extractMarpFromResponse(responseText: string): string {
    // 最初の --- を探す（Marpメタデータの開始）
    const firstYamlFrontMatter = responseText.indexOf('---');
    if (firstYamlFrontMatter === -1) {
      // --- がない場合は、最初の # から始まるMarpコンテンツを探す
      const firstHeader = responseText.search(/^#\s+/m);
      if (firstHeader !== -1) {
        return responseText.substring(firstHeader);
      }
      return responseText;
    }
    
    // --- より前に分析テキストがある場合はスキップ
    const beforeYaml = responseText.substring(0, firstYamlFrontMatter).trim();
    if (beforeYaml.length > 50 && (
        beforeYaml.includes('ユーザーの意図') || 
        beforeYaml.includes('スライド構成') ||
        beforeYaml.includes('視覚的表現') ||
        beforeYaml.includes('構成案') ||
        beforeYaml.includes('展開された内容') ||
        beforeYaml.includes('トピック:') ||
        beforeYaml.includes('**トピック:**') ||
        beforeYaml.includes('プレゼンテーションとして') ||
        beforeYaml.includes('詳細内容を推奨')
      )) {
      // 分析テキストを除いてMarp部分のみを返す
      return responseText.substring(firstYamlFrontMatter);
    }
    
    return responseText;
  }

  /**
   * Marp形式の応答をパース
   */
  parseMarpResponse(marpText: string): MarpPresentation {
    // AIが分析内容を含んでいる場合、Marp部分を抽出
    const cleanedMarpText = this.extractMarpFromResponse(marpText);
    
    const lines = cleanedMarpText.split('\n');
    const slides: MarpSlide[] = [];
    let currentSlide: Partial<MarpSlide> = {};
    let inMetadata = false;
    let title = '';
    let description = '';
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // メタデータセクション
      if (line === '---' && i < 10) {
        inMetadata = !inMetadata;
        i++;
        continue;
      }
      
      if (inMetadata) {
        if (line.startsWith('title:')) {
          title = line.replace('title:', '').trim();
        } else if (line.startsWith('description:')) {
          description = line.replace('description:', '').trim();
        }
        i++;
        continue;
      }
      
      // スライド区切り
      if (line === '---') {
        if (currentSlide.title) {
          slides.push({
            title: currentSlide.title || '',
            content: currentSlide.content || '',
            imagePrompt: currentSlide.imagePrompt,
            notes: currentSlide.notes,
          });
        }
        currentSlide = {};
        i++;
        continue;
      }
      
      // タイトル（# で始まる行）
      if (line.startsWith('# ')) {
        if (currentSlide.title) {
          // 既にタイトルがある場合は新しいスライド
          slides.push({
            title: currentSlide.title || '',
            content: currentSlide.content || '',
            imagePrompt: currentSlide.imagePrompt,
            notes: currentSlide.notes,
          });
          currentSlide = {};
        }
        currentSlide.title = this.extractProperTitle(line.replace('# ', '').trim());
        currentSlide.content = '';
        i++;
        continue;
      }
      
      // 画像説明
      if (line.includes('**画像説明:**') || line.includes('**画像:**')) {
        const imageMatch = line.match(/\*\*画像(?:説明)?:\*\*\s*\[?(.+?)\]?/);
        if (imageMatch) {
          currentSlide.imagePrompt = imageMatch[1].trim();
        }
        i++;
        continue;
      }
      
      // ノート
      if (line.includes('**ノート:**')) {
        const noteMatch = line.match(/\*\*ノート:\*\*\s*(.+)/);
        if (noteMatch) {
          currentSlide.notes = noteMatch[1].trim();
        }
        i++;
        continue;
      }
      
      // 通常のコンテンツ
      if (line && !line.startsWith('**') && currentSlide.title) {
        currentSlide.content = currentSlide.content || '';
        if (currentSlide.content) {
          currentSlide.content += '\n';
        }
        currentSlide.content += line;
      }
      
      i++;
    }
    
    // 最後のスライドを追加
    if (currentSlide.title) {
      slides.push({
        title: currentSlide.title || '',
        content: currentSlide.content || '',
        imagePrompt: currentSlide.imagePrompt,
        notes: currentSlide.notes,
      });
    }

    return {
      title: this.extractProperTitle(title || slides[0]?.title || 'プレゼンテーション'),
      description: description || 'プレゼンテーション',
      slides,
      metadata: {
        slideCount: slides.length,
        theme: 'professional',
        purpose: 'informative',
        designer: 'The Academic Visualizer'
      }
    };
  }

  /**
   * 異常に長いタイトルから適切なタイトルを抽出
   */
  private extractProperTitle(rawTitle: string): string {
    if (!rawTitle || rawTitle.length <= 80) {
      return rawTitle;
    }

    // 分析的なテキストをフィルタリング（これらで始まる場合は分析内容なのでスキップ）
    const analysisPatterns = [
      /^\d+\.\s*ユーザー/,
      /^\d+\.\s*スライド構成/,
      /^構成案：/,
      /^対象者：/,
      /^視覚的表現：/,
      /^この構成で/,
      /^以下の要件/
    ];

    const isAnalysisText = analysisPatterns.some(pattern => pattern.test(rawTitle));
    if (isAnalysisText) {
      // 分析テキストからキーワードを抽出してタイトル化
      return this.extractTitleFromAnalysis(rawTitle);
    }

    // 通常のタイトル抽出パターン
    const titleCandidates = [
      // 【タイトル案】【研修タイトル】などの後のタイトル
      /【(?:タイトル案?|研修タイトル|プレゼン?タイトル)】\s*([^\n【]*)/,
      /(?:タイトル案?|研修タイトル)[：:]\s*([^\n]*)/,
      // クォーテーション内のタイトル
      /[「『"]([\s\S]*?)[」』"]/,
      // ★や■などの記号付きタイトル
      /[★■▲●]\s*([^\n]*)/,
      // 最初の適切な長さの行
      /^([^\n]{8,60})(?:\n|$)/,
      // トピック関連キーワードを含む短いフレーズ
      /((?:実践的?|基礎|応用|入門|研修|講座|セミナー|トレーニング)[\s\S]{0,30})/
    ];

    for (const pattern of titleCandidates) {
      const match = rawTitle.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim()
          .replace(/[「」『』【】]/g, '') // かっこを除去
          .replace(/^\*+\s*/, '') // 先頭の*を除去
          .replace(/^#+\s*/, '') // 先頭の#を除去
          .replace(/[：:]\s*$/, '') // 末尾の:を除去
          .trim();
        
        if (extracted.length >= 6 && extracted.length <= 80) {
          return extracted;
        }
      }
    }

    // フォールバック: 最初の文から適切な部分を抽出
    const firstSentence = rawTitle.split(/[。\n]/)[0];
    if (firstSentence && firstSentence.length <= 80 && !firstSentence.includes('ユーザー') && !firstSentence.includes('構成')) {
      return firstSentence.trim();
    }

    // 最終フォールバック: 汎用的なタイトル
    return 'プレゼンテーション';
  }

  /**
   * 分析テキストからキーワードを抽出してタイトル化
   */
  private extractTitleFromAnalysis(analysisText: string): string {
    // 分析テキスト内からトピックキーワードを抽出
    const topicKeywords = [
      'ロジカルシンキング', 'クリティカルシンキング', 'デザイン思考',
      'プロジェクトマネジメント', 'リーダーシップ', 'コミュニケーション',
      'マーケティング', 'プレゼンテーション', 'データ分析', 'DX',
      'AI', '機械学習', 'セキュリティ', 'コンプライアンス'
    ];

    for (const keyword of topicKeywords) {
      if (analysisText.includes(keyword)) {
        return `${keyword}研修`;
      }
    }

    // より一般的なパターンマッチング
    const generalPatterns = [
      /「([^」]{4,30})」.*研修/,
      /「([^」]{4,30})」.*説明/,
      /([^\s]{4,20}).*研修.*資料/,
      /([^\s]{4,20}).*説明.*スライド/
    ];

    for (const pattern of generalPatterns) {
      const match = analysisText.match(pattern);
      if (match && match[1]) {
        return `${match[1]}研修`;
      }
    }

    return 'ビジネス研修';
  }


  /**
   * 物語・創作系コンテンツかどうかを判定（統合分析優先）
   */
  private determineStoryContent(topic: string, purpose: string, theme: string, options: MarpContentOptions): boolean {
    // 統合分析結果が利用可能な場合はそちらを優先
    if ((options as any).isStoryContent !== undefined) {
      console.log('📚 Using unified analysis result for story detection:', (options as any).isStoryContent);
      return (options as any).isStoryContent;
    }
    
    // フォールバック: 保険処理としてのキーワードマッチング
    console.log('⚠️ Using fallback keyword matching for story detection');
    return this.isStoryContentFallback(topic, purpose, theme);
  }

  /**
   * 物語・創作系コンテンツかどうかを判定（保険処理のキーワードマッチング）
   */
  private isStoryContentFallback(topic: string, purpose: string, theme: string): boolean {
    // 物語系のキーワード検出（保険処理）
    const storyKeywords = [
      '物語', '昔話', '童話', 'おとぎ話', '民話', '伝説', '神話',
      '紙芝居', '絵本', '読み聞かせ',
      '桃太郎', 'かぐや姫', 'シンデレラ', '白雪姫', 'アンデルセン'
    ];
    
    // purpose/themeによる判定
    const storyPurposes = ['storytelling', 'children_content', 'creative_project'];
    const storyThemes = ['storytelling', 'children_bright', 'children_pastel', 'hand_drawn'];
    
    const topicLower = topic.toLowerCase();
    const hasStoryKeyword = storyKeywords.some(keyword => topic.includes(keyword));
    const hasStoryPurpose = storyPurposes.includes(purpose);
    const hasStoryTheme = storyThemes.includes(theme);
    
    return hasStoryKeyword || hasStoryPurpose || hasStoryTheme;
  }

  /**
   * 物語専用のMarpプロンプト構築（簡素化版）
   */
  private buildStoryMarpPrompt(topic: string, slideCount: number, generatedTitle: string, includeImages: boolean): string {
    if (this.promptResources.fallback) {
      return this.buildFallbackStoryPrompt(topic, slideCount, generatedTitle, includeImages);
    }

    const imageInstruction = includeImages ? '**画像説明:** [関連する画像の説明]' : '';
    
    let promptTemplate = contextIntelligenceResources.marpContentGeneration.storyMarpPrompt;
    
    return promptTemplate
      .replace(/{topic}/g, topic)
      .replace(/{slideCount}/g, slideCount.toString())
      .replace(/{generatedTitle}/g, generatedTitle)
      .replace(/{imageInstruction}/g, imageInstruction);
  }

  // フォールバックメソッドを追加
  private buildFallbackTitlePrompt(options: MarpContentOptions): string {
    const { topic, purpose, theme, designer, slideCount } = options;
    return `以下の条件に基づいて、最適なプレゼンテーションタイトルを1つ生成してください。

**条件:**
- 内容: ${topic}
- 用途: ${purpose}
- テーマ: ${theme}
- デザイナー: ${designer}
- スライド数: ${slideCount}枚

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
データ分析入門講座（10文字）`;
  }

  private buildFallbackMarpPrompt(options: MarpContentOptions, generatedTitle: string): string {
    const {
      topic,
      slideCount = 5,
      theme = 'professional',
      includeImages = true,
      customInstructions = ''
    } = options;
    
    const imageInstruction = includeImages ? '**画像説明:** [関連する画像の説明]' : '';

    return `「${topic}」について${slideCount}枚のプレゼンテーション資料を作成してください。
タイトルは"${generatedTitle}"を使用してください。

あなたの専門知識を活用して、最も有用で正確な内容を提供してください。

Marp形式で出力：

---
title: ${generatedTitle}
description: ${generatedTitle}について
theme: ${theme}
---

# ${generatedTitle}
## サブタイトル

---

# 2枚目のスライド
内容...
${imageInstruction}
**ノート:** スピーカーノート

以降${slideCount}枚まで続ける。

${customInstructions}`;
  }

  private buildFallbackStoryPrompt(topic: string, slideCount: number, generatedTitle: string, includeImages: boolean): string {
    const imageInstruction = includeImages ? '**画像説明:** [関連する画像の説明]' : '';
    
    return `「${topic}」について${slideCount}枚のスライドを作成してください。
タイトルは"${generatedTitle}"を使用してください。

Marp形式で出力：

---
title: ${generatedTitle}
description: ${generatedTitle}
theme: storytelling
---

# ${generatedTitle}
## サブタイトル

${imageInstruction}
**ノート:** スピーカーノート

---

# 2枚目のスライド
内容...

${imageInstruction}
**ノート:** スピーカーノート

以降${slideCount}枚まで続ける。`;
  }
}