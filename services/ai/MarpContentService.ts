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
  presentationStyle?: string;
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
    presentationStyle: string;
  };
}

export class MarpContentService {
  constructor() {
  }

  /**
   * プレゼンテーションタイトルを生成
   */
  buildTitleGenerationPrompt(options: MarpContentOptions): string {
    const { topic, purpose, theme, presentationStyle, slideCount } = options;
    
    let promptTemplate = contextIntelligenceResources.marpContentGeneration.titleGenerationPrompt;
    
    return promptTemplate
      .replace(/{topic}/g, topic)
      .replace(/{purpose}/g, purpose)
      .replace(/{theme}/g, theme)
      .replace(/{presentationStyle}/g, presentationStyle)
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
      presentationStyle = 'simple',
      includeImages = true,
      customInstructions = ''
    } = options;

    // 全てのコンテンツを統一されたmarpPromptで処理

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
      presentationStyle: request.presentationStyle || 'simple',
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
        presentationStyle: 'simple'
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

    // 代替案: 最初の文から適切な部分を抽出
    const firstSentence = rawTitle.split(/[。\n]/)[0];
    if (firstSentence && firstSentence.length <= 80 && !firstSentence.includes('ユーザー') && !firstSentence.includes('構成')) {
      return firstSentence.trim();
    }

    // 最終的な汎用タイトル
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






}