// =================================================================
// Marp Content Service - 第1段階：Marpフォーマットコンテンツ生成
// Azure OpenAI / Gemini共通でMarp形式のスライドコンテンツを生成
// =================================================================

import type { EnhancedSlideRequest } from './aiServiceInterface';

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
  /**
   * トピックから基本的なMarpコンテンツを生成
   * デザイナーやテーマに関係なく、内容重視のMarkdownベースコンテンツ
   */
  buildMarpPrompt(options: MarpContentOptions): string {
    const {
      topic,
      slideCount = 5,
      purpose = 'informative',
      theme = 'professional',
      designer = 'The Academic Visualizer',
      includeImages = true,
      customInstructions = ''
    } = options;

    // デザイナー別のコンテンツ指向
    const designerGuidance = this.getDesignerContentGuidance(designer);
    
    // 用途別の構成指向
    const purposeGuidance = this.getPurposeGuidance(purpose);

    return `あなたは優秀なプレゼンテーションライターです。「${topic}」について${slideCount}枚のプレゼンテーション用コンテンツを作成してください。

【重要】Marpフォーマット（Markdown）で出力し、後でJSONレイアウトに変換します。

**コンテンツ指針:**
${designerGuidance}

**構成指針:**
${purposeGuidance}

**出力形式（Marp準拠）:**
---
title: プレゼンテーションタイトル
description: プレゼンテーション概要
theme: ${theme}
---

# プレゼンテーションタイトル
## サブタイトルまたは概要

---

# スライド2のタイトル

内容をここに書く。箇条書きや段落で構成。

${includeImages ? '**画像説明:** [このスライドに適した画像の説明]' : ''}

**ノート:** 発表者向けの補足説明

---

# スライド3のタイトル

続きの内容...

**要件:**
1. 各スライドは1つのメインアイデアに集中
2. タイトルは明確で魅力的
3. 内容は聞き手にとって価値ある情報
4. ${includeImages ? '各スライドに適切な画像説明を含める' : '画像は含めない'}
5. 発表者ノートで詳細な説明を追加
6. スライド間の論理的なつながりを重視

${customInstructions ? `**追加指示:** ${customInstructions}` : ''}

**出力:** 上記形式でMarpマークダウンのみ出力。前後の説明文は不要。`;
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
   * Marp形式の応答をパース
   */
  parseMarpResponse(marpText: string): MarpPresentation {
    const lines = marpText.split('\n');
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
        currentSlide.title = line.replace('# ', '').trim();
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
      title: title || slides[0]?.title || 'プレゼンテーション',
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

  private getDesignerContentGuidance(designer: string): string {
    const guidance = {
      'The Emotional Storyteller': `
- ストーリー仕立てで感情に訴える内容
- 具体的な事例や体験談を含める  
- 聴衆の共感を呼ぶ表現を使用
- ドラマチックな展開を意識`,
      
      'The Corporate Strategist': `
- ビジネス価値と戦略的インパクトを強調
- データと事実に基づく論理的構成
- ROI や KPI などの定量的指標を活用
- 実行可能なアクションプランを提示`,
      
      'The Academic Visualizer': `
- 学術的で厳密な内容構成
- 根拠とエビデンスを明確に提示
- 論理的な流れと体系的な整理
- 専門用語の適切な使用と説明`,
      
      'The Amateur Designer': `
- 親しみやすく理解しやすい表現
- 身近な例えや比喩を多用
- カジュアルで話しかけるような文体
- 専門用語は簡単な言葉で説明`
    };
    
    return guidance[designer as keyof typeof guidance] || guidance['The Academic Visualizer'];
  }

  private getPurposeGuidance(purpose: string): string {
    const guidance = {
      'storytelling': `
- 起承転結の物語構成
- キャラクターや状況設定を明確に
- 感情の起伏を作る展開
- 印象的な結末で締めくくり`,
      
      'business_presentation': `
- エグゼクティブサマリーから開始
- 問題→解決策→効果の流れ
- 財務的インパクトや ROI を重視
- 次のアクションステップを明示`,
      
      'educational_content': `
- 学習目標を最初に提示
- 段階的な知識の積み上げ構成
- 理解度確認のポイントを含める
- 要点のまとめで理解を定着`,
      
      'tutorial_guide': `
- ステップバイステップの手順説明
- 必要な前提知識や準備を明記
- つまずきやすいポイントの注意書き
- 完成イメージや期待される結果を提示`
    };
    
    return guidance[purpose as keyof typeof guidance] || 
           '聴衆のニーズに合わせた価値ある情報を論理的に構成';
  }
}