// =================================================================
// Image Content Validator - 画像生成適正化システム
// Phase 4.1: 不適切画像生成の禁止機能
// =================================================================

export interface ImageValidationResult {
  isAppropriate: boolean;
  reason?: string;
  suggestedAction: 'generate' | 'skip' | 'use_svg';
  suggestedPrompt?: string;
  svgContent?: string;
}

export interface ValidationContext {
  slideTitle?: string;
  slideContent: string;
  imagePrompt: string;
  topic: string;
  purpose?: string;
}

/**
 * 画像生成適正化システム
 * データなしグラフ・表の生成を完全禁止し、意味のある画像のみを生成
 */
export class ImageContentValidator {

  /**
   * 🚨 Phase 4.1: 画像生成適正性の包括的検証
   * 不適切な画像生成パターンを検出し、適切な代替案を提示
   */
  validateImageGeneration(context: ValidationContext): ImageValidationResult {
    const { slideContent, imagePrompt, topic, purpose } = context;
    const contentLower = slideContent.toLowerCase();
    const promptLower = imagePrompt.toLowerCase();
    const topicLower = topic.toLowerCase();

    console.log('🔍 Image Content Validation:', {
      topic,
      prompt: imagePrompt.substring(0, 100) + '...',
      contentLength: slideContent.length
    });

    // 1. 完全禁止パターン（データなしグラフ・表）
    const prohibitedPatterns = [
      'グラフ', 'chart', 'graph', '表', 'table', 'データ', 'data',
      '棒グラフ', '円グラフ', 'bar chart', 'pie chart', 'line graph',
      '統計', 'statistics', '数値', '割合', 'percentage',
      '分析結果', 'analysis result', 'レポート', 'report'
    ];

    for (const pattern of prohibitedPatterns) {
      if (promptLower.includes(pattern) || contentLower.includes(pattern)) {
        // データが実際に存在するかチェック
        const hasActualData = this.detectActualData(slideContent);
        
        if (!hasActualData) {
          console.log('❌ Prohibited: Data visualization without actual data');
          return {
            isAppropriate: false,
            reason: `データなしグラフ・表の生成は禁止されています: ${pattern}`,
            suggestedAction: 'skip'
          };
        } else {
          // 実データがある場合はSVG生成を推奨
          console.log('✅ Actual data detected, suggesting SVG generation');
          return {
            isAppropriate: false,
            reason: `実データが検出されました。SVG可視化を使用します`,
            suggestedAction: 'use_svg',
            svgContent: this.generateDataVisualizationSVG(slideContent)
          };
        }
      }
    }

    // 2. 抽象的・意味不明パターンの検出
    const vaguePatterns = [
      '概念', 'concept', '抽象的', 'abstract', '理論', 'theory',
      'イメージ', 'image', '印象', 'impression', 'アイデア', 'idea'
    ];

    const isVague = vaguePatterns.some(pattern => 
      promptLower.includes(pattern) && promptLower.length < 50
    );

    if (isVague) {
      console.log('⚠️ Vague prompt detected, enhancing specificity');
      const enhancedPrompt = this.enhanceVaguePrompt(imagePrompt, context);
      return {
        isAppropriate: true,
        reason: '抽象的なプロンプトを具体化しました',
        suggestedAction: 'generate',
        suggestedPrompt: enhancedPrompt
      };
    }

    // 3. トピック適合性チェック
    const topicRelevance = this.checkTopicRelevance(imagePrompt, topic, purpose);
    if (!topicRelevance.isRelevant) {
      console.log('⚠️ Topic irrelevance detected');
      return {
        isAppropriate: false,
        reason: topicRelevance.reason,
        suggestedAction: 'skip'
      };
    }

    // 4. 不適切なビジネス要素の検出（ミニトマト問題対策）
    if (this.hasInappropriateBusinessElements(imagePrompt, topic)) {
      console.log('⚠️ Inappropriate business elements detected');
      const appropriatePrompt = this.removeBusinessElements(imagePrompt, topic);
      return {
        isAppropriate: true,
        reason: '不適切なビジネス要素を除去しました',
        suggestedAction: 'generate',
        suggestedPrompt: appropriatePrompt
      };
    }

    console.log('✅ Image generation approved');
    return {
      isAppropriate: true,
      suggestedAction: 'generate'
    };
  }

  /**
   * 実際のデータが含まれているかを検出
   */
  private detectActualData(content: string): boolean {
    // 数値データのパターンを検索
    const dataPatterns = [
      /\d+%/g,                    // パーセンテージ
      /\d+円/g,                   // 金額
      /\d+人/g,                   // 人数
      /\d+年/g,                   // 年数
      /\d+月/g,                   // 月
      /\d+日/g,                   // 日
      /\d+\.\d+/g,                // 小数点数値
      /\d{4}-\d{2}-\d{2}/g,       // 日付形式
      /[0-9,]+\s*(円|ドル|件|個|台)/g // 単位付き数値
    ];

    const hasNumericData = dataPatterns.some(pattern => 
      (content.match(pattern) || []).length >= 3  // 3個以上の数値データ
    );

    // 表形式データの検出
    const hasTabularData = content.includes('|') && content.split('|').length > 6;

    // リスト形式データの検出
    const hasListData = content.split('\n').filter(line => 
      /^\s*[-*\d]\s/.test(line) && /\d/.test(line)
    ).length >= 3;

    return hasNumericData || hasTabularData || hasListData;
  }

  /**
   * データ可視化SVGを生成
   */
  private generateDataVisualizationSVG(content: string): string {
    // 簡単な棒グラフSVGを生成（実際のデータがある場合）
    const numbers = content.match(/\d+/g)?.map(Number).slice(0, 5) || [10, 20, 30, 40, 50];
    const maxValue = Math.max(...numbers);
    const scale = 200 / maxValue;

    const bars = numbers.map((value, index) => {
      const height = value * scale;
      const x = 50 + index * 80;
      const y = 250 - height;
      
      return `<rect x="${x}" y="${y}" width="60" height="${height}" fill="#4A90E2" stroke="#2E5B8A" stroke-width="1"/>
      <text x="${x + 30}" y="${y - 5}" text-anchor="middle" font-size="12">${value}</text>`;
    }).join('\n');

    return `<svg width="500" height="300" xmlns="http://www.w3.org/2000/svg">
      <style>
        text { font-family: 'Arial', sans-serif; fill: #333; }
        .axis { stroke: #666; stroke-width: 2; }
      </style>
      
      <!-- 軸 -->
      <line class="axis" x1="40" y1="250" x2="460" y2="250"/>
      <line class="axis" x1="40" y1="250" x2="40" y2="50"/>
      
      <!-- データバー -->
      ${bars}
      
      <!-- タイトル -->
      <text x="250" y="30" text-anchor="middle" font-size="16" font-weight="bold">データ可視化</text>
    </svg>`;
  }

  /**
   * 抽象的なプロンプトを具体化
   */
  private enhanceVaguePrompt(prompt: string, context: ValidationContext): string {
    const { topic, purpose } = context;
    const topicLower = topic.toLowerCase();

    // トピック別の具体化
    if (topicLower.includes('育て方') || topicLower.includes('栽培')) {
      return `${prompt} - 実際の植物や栽培風景、土や水やりの様子など具体的な園芸イラスト`;
    }
    
    if (topicLower.includes('料理') || topicLower.includes('レシピ')) {
      return `${prompt} - 実際の食材や調理過程、完成した料理など具体的な料理イラスト`;
    }
    
    if (topicLower.includes('物語') || topicLower.includes('昔話')) {
      return `${prompt} - 物語の登場人物や場面を表現した絵本風のイラスト`;
    }

    return `${prompt} - 具体的で分かりやすいイラスト、実用的な表現`;
  }

  /**
   * トピック適合性をチェック
   */
  private checkTopicRelevance(prompt: string, topic: string, purpose?: string): {
    isRelevant: boolean;
    reason?: string;
  } {
    const promptLower = prompt.toLowerCase();
    const topicLower = topic.toLowerCase();

    // 明らかに関連のないパターン
    const irrelevantCombinations = [
      {
        condition: topicLower.includes('トマト') && promptLower.includes('ビジネスマン'),
        reason: 'トマト栽培にビジネスマンの画像は不適切です'
      },
      {
        condition: topicLower.includes('料理') && promptLower.includes('グラフ'),
        reason: '料理レシピにグラフは不適切です'
      },
      {
        condition: topicLower.includes('料理') && (promptLower.includes('academic') || promptLower.includes('scholarly') || promptLower.includes('academic visualization') || promptLower.includes('scientific')),
        reason: '料理コンテンツに学術的・科学的な画像は不適切です'
      },
      {
        condition: (topicLower.includes('チャーシュー') || topicLower.includes('料理')) && promptLower.includes('diagram'),
        reason: '料理レシピに図表・ダイアグラムは不適切です'
      },
      {
        condition: topicLower.includes('物語') && promptLower.includes('データ分析'),
        reason: '物語にデータ分析の画像は不適切です'
      }
    ];

    for (const combo of irrelevantCombinations) {
      if (combo.condition) {
        return {
          isRelevant: false,
          reason: combo.reason
        };
      }
    }

    return { isRelevant: true };
  }

  /**
   * 不適切なビジネス要素を検出
   */
  private hasInappropriateBusinessElements(prompt: string, topic: string): boolean {
    const promptLower = prompt.toLowerCase();
    const topicLower = topic.toLowerCase();

    const businessElements = [
      'ビジネスマン', 'businessman', 'スーツ', 'suit', '会議室', 'meeting room',
      'オフィス', 'office', 'プレゼンテーション', 'presentation', '企業',
      '経営', 'management', 'サラリーマン'
    ];

    // 学術的・科学的要素を追加
    const academicElements = [
      'academic', 'scholarly', 'academic visualization', 'scientific',
      'diagram', 'research', '学術', '科学的', '研究', '論文',
      'scholarly presentation', 'academic paper', 'scientific study'
    ];

    const inappropriateElements = [...businessElements, ...academicElements];

    const nonBusinessTopics = [
      '育て方', '栽培', '料理', 'レシピ', '物語', '昔話', '童話',
      '家庭', 'ホーム', '個人', 'パーソナル', 'チャーシュー'
    ];

    const hasInappropriateElements = inappropriateElements.some(element => 
      promptLower.includes(element)
    );

    const isPersonalTopic = nonBusinessTopics.some(topic => 
      topicLower.includes(topic)
    );

    return hasInappropriateElements && isPersonalTopic;
  }

  /**
   * ビジネス要素を除去し、適切なプロンプトに修正
   */
  private removeBusinessElements(prompt: string, topic: string): string {
    let cleanPrompt = prompt;
    const topicLower = topic.toLowerCase();

    // ビジネス要素と学術的要素を除去
    const inappropriateTerms = [
      'ビジネスマン', 'businessman', 'スーツを着た', 'in suit',
      '会議室で', 'in meeting room', 'オフィスで', 'in office',
      'プレゼンテーション', 'presentation',
      // 学術的要素を追加
      'academic', 'scholarly', 'academic visualization', 'scientific',
      'diagram', 'research', '学術的な', '科学的な', '研究',
      'scholarly presentation', 'academic paper', 'scientific study'
    ];

    inappropriateTerms.forEach(term => {
      cleanPrompt = cleanPrompt.replace(new RegExp(term, 'gi'), '');
    });

    // トピックに適した要素を追加
    if (topicLower.includes('育て方') || topicLower.includes('栽培')) {
      cleanPrompt += ' - 家庭菜園や自然な栽培環境で';
    } else if (topicLower.includes('料理') || topicLower.includes('チャーシュー')) {
      cleanPrompt += ' - 美味しそうな料理写真、家庭のキッチンでの自然な調理風景';
    } else if (topicLower.includes('物語')) {
      cleanPrompt += ' - 物語の世界観に合った自然な場面で';
    }

    return cleanPrompt.replace(/\s+/g, ' ').trim();
  }
}