// =================================================================
// Context Intelligence Engine - AIコンテキスト認識エンジン
// トピックから最適なデザイナー・用途・テーマを自動推定
// =================================================================

import type { DesignerType, PresentationPurpose, PresentationTheme } from '../../types';

export interface ContextAnalysis {
  suggestedDesigner: DesignerType;
  suggestedPurpose: PresentationPurpose;
  suggestedTheme: PresentationTheme;
  confidence: number; // 0-1の信頼度
  reasoning: string; // 推定理由
  contentType: 'story' | 'business' | 'academic' | 'creative' | 'technical';
  emotionalTone: 'emotional' | 'logical' | 'inspiring' | 'professional' | 'playful';
  // 🆕 AI包括分析の新しいフィールド
  suggestedSlideCount?: number;
  needsPageNumbers?: boolean;
  imageConsistencyLevel?: 'high' | 'medium' | 'low';
}

/**
 * 革新的AIコンテキスト認識エンジン
 * トピックを深層分析し、最適な作成戦略を推定
 */
export class ContextIntelligenceEngine {
  
  /**
   * 🎯 Auto項目専用のコンテキスト分析
   * 指定されたAuto項目のみをAI分析し、ユーザー指定項目は尊重
   */
  async analyzeAutoSettings(topic: string, request: any): Promise<{
    contentType?: ContextAnalysis['contentType'];
    suggestedDesigner?: DesignerType;
    suggestedPurpose?: PresentationPurpose;
    suggestedTheme?: PresentationTheme;
    suggestedSlideCount?: number;
    needsPageNumbers?: boolean;
    imageConsistencyLevel?: 'high' | 'medium' | 'low';
  }> {
    console.log('🧠 Starting individual AI analysis for Auto settings:', topic);
    console.log('📋 Analyzing request:', {
      designer: request.selectedDesigner,
      purpose: request.purpose,
      theme: request.theme
    });

    const results: any = {};

    try {
      // 1. 基本コンテンツタイプ分析（常に実行）
      results.contentType = await this.classifyContentTypeWithRetry(topic);
      console.log('✅ Content Type:', results.contentType);

      // 2. Auto指定されたデザイナーのみAI分析
      if (!request.selectedDesigner || request.selectedDesigner === 'auto' || request.selectedDesigner === 'amateur') {
        results.suggestedDesigner = await this.selectDesignerWithRetry(topic, results.contentType);
        console.log('✅ AI Selected Designer:', results.suggestedDesigner);
      } else {
        console.log('👤 Using user-specified designer:', request.selectedDesigner);
      }

      // 3. Auto指定された用途のみAI分析
      if (!request.purpose || request.purpose === 'auto') {
        results.suggestedPurpose = await this.selectPurposeWithRetry(topic, results.contentType);
        console.log('✅ AI Selected Purpose:', results.suggestedPurpose);
      } else {
        console.log('👤 Using user-specified purpose:', request.purpose);
      }

      // 4. Auto指定されたテーマのみAI分析
      if (!request.theme || request.theme === 'auto') {
        results.suggestedTheme = await this.selectThemeWithRetry(topic, results.contentType);
        console.log('✅ AI Selected Theme:', results.suggestedTheme);
      } else {
        console.log('👤 Using user-specified theme:', request.theme);
      }

      // 5. 補助設定の分析
      const additionalSettings = await this.analyzeAdditionalSettingsWithRetry(topic, results.contentType);
      results.suggestedSlideCount = additionalSettings.slideCount;
      results.needsPageNumbers = additionalSettings.needsPageNumbers;
      results.imageConsistencyLevel = additionalSettings.imageConsistencyLevel;

      console.log('🎯 Individual AI analysis completed successfully');
      return results;

    } catch (error) {
      console.error('❌ Individual AI analysis failed:', error);
      // 最小限のフォールバック
      return {
        contentType: this.simpleContentTypeClassification(topic.toLowerCase()),
        suggestedDesigner: 'The Academic Visualizer',
        suggestedPurpose: '教育・学習支援',
        suggestedTheme: 'academic',
        suggestedSlideCount: 10,
        needsPageNumbers: true,
        imageConsistencyLevel: 'medium'
      };
    }
  }

  /**
   * フォールバック分析（AI失敗時）- 簡略版のAI独立分析
   */
  private async fallbackAnalysis(topic: string): Promise<ContextAnalysis> {
    console.log('⚠️ Using fallback analysis for:', topic);
    const topicLower = topic.toLowerCase();
    
    // 🧠 シンプルなルールベース分類（キーワードマッチング最小限）
    const contentType = this.simpleContentTypeClassification(topicLower);
    const bestMatch = this.getDesignerByContentType(contentType, 'professional');
    const emotionalTone = this.mapContentTypeToEmotionalTone(contentType, bestMatch.designer);
    
    return {
      suggestedDesigner: bestMatch.designer,
      suggestedPurpose: bestMatch.purpose,
      suggestedTheme: bestMatch.theme,
      confidence: 0.7, // フォールバックは中程度の信頼度
      contentType,
      emotionalTone,
      // デフォルト設定
      suggestedSlideCount: contentType === 'story' ? 8 : 10,
      needsPageNumbers: contentType === 'business' || contentType === 'academic',
      imageConsistencyLevel: contentType === 'story' ? 'high' : 'medium',
      reasoning: `フォールバック分析: ${topic}を${contentType}として分類し、${emotionalTone}トーンで${bestMatch.designer}を選択`
    };
  }

  /**
   * 🔧 シンプルなコンテンツタイプ分類（フォールバック用）
   */
  private simpleContentTypeClassification(topic: string): ContextAnalysis['contentType'] {
    // 明確な物語パターン
    if (topic.includes('物語') || topic.includes('昔話') || topic.includes('童話') || 
        topic.includes('の話を') || topic.includes('ストーリー')) {
      return 'story';
    }
    
    // 明確な技術パターン  
    if (topic.includes('gpt') || topic.includes('ai') || topic.includes('技術') ||
        topic.includes('システム') || topic.includes('api') || topic.includes('エンジニア')) {
      return 'technical';
    }
    
    // 明確なビジネスパターン
    if (topic.includes('ビジネス') || topic.includes('企業') || topic.includes('営業') ||
        topic.includes('研修') || topic.includes('戦略')) {
      return 'business';
    }
    
    // デフォルトは学術・教育
    return 'academic';
  }

  /**
   * コンテンツタイプの識別 - 文章の意図に基づく判定
   */
  /**
   * 生成AIベースの包括的コンテンツ分類
   */
  private async identifyContentType(topic: string): Promise<ContextAnalysis['contentType']> {
    console.log('🧠 Context Intelligence: Using AI-based classification for:', topic);
    
    try {
      // 生成AIベースの分類を実行
      const aiClassification = await this.classifyWithAI(topic);
      console.log('✅ AI classified as:', aiClassification);
      return aiClassification;
    } catch (error) {
      console.warn('⚠️ AI classification failed, using keyword fallback:', error);
      return this.keywordBasedFallback(topic);
    }
  }

  /**
   * 🔄 コンテンツタイプ分類（リトライ機能付き）
   */
  private async classifyContentTypeWithRetry(topic: string, maxRetries: number = 3): Promise<ContextAnalysis['contentType']> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Content Type Analysis - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = `以下のリクエストのコンテンツタイプを分析してください。

リクエスト: "${topic}"

以下から1つ選択してください：
- story: 物語・ストーリー・童話・民話
- technical: AI・技術・システム・エンジニアリング・プログラミング
- business: ビジネス・企業・営業・研修・マーケティング
- academic: 学術・研究・教育・一般調査・解説
- creative: 芸術・デザイン・創作活動

回答形式: 選択したカテゴリ名のみを英語で回答（例: technical）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          maxTokens: 20,
          temperature: 0.1
        });
        
        const contentType = this.parseContentTypeResponse(response.trim());
        if (contentType) {
          console.log(`✅ Content Type classified as: ${contentType}`);
          return contentType;
        }
        
        throw new Error('Invalid content type response');
        
      } catch (error) {
        console.warn(`⚠️ Content Type Analysis attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt); // 段階的な待機時間
      }
    }
    throw new Error('Content type analysis failed after all retries');
  }

  /**
   * 🎨 デザイナー選択（リトライ機能付き）
   */
  private async selectDesignerWithRetry(topic: string, contentType: string, maxRetries: number = 3): Promise<DesignerType> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎨 Designer Selection - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = `コンテンツタイプ"${contentType}"の以下のトピックに最適なデザイナーを選択してください。

トピック: "${topic}"

選択肢:
- "The Emotional Storyteller": 物語・感動系
- "The Corporate Strategist": ビジネス・企業系  
- "logical": 技術・論理的・AI系
- "The Academic Visualizer": 学術・教育系
- "creative": 芸術・創作系

回答形式: デザイナー名のみを英語で回答（例: logical）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          maxTokens: 30,
          temperature: 0.1
        });
        
        const designer = this.parseDesignerResponse(response.trim());
        if (designer) {
          console.log(`✅ Designer selected: ${designer}`);
          return designer;
        }
        
        throw new Error('Invalid designer response');
        
      } catch (error) {
        console.warn(`⚠️ Designer Selection attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }
    throw new Error('Designer selection failed after all retries');
  }

  /**
   * 🎯 用途選択（リトライ機能付き）
   */
  private async selectPurposeWithRetry(topic: string, contentType: string, maxRetries: number = 3): Promise<PresentationPurpose> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎯 Purpose Selection - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = `コンテンツタイプ"${contentType}"の以下のトピックの用途を選択してください。

トピック: "${topic}"

選択肢:
- "ストーリーテリング・物語の共有": 物語系
- "ビジネス・企業プレゼンテーション": ビジネス系
- "技術説明・エンジニアリング": AI・技術系
- "教育・学習支援": 学術・教育系
- "クリエイティブ・芸術表現": 創作系

回答形式: 用途名をそのまま日本語で回答（例: 技術説明・エンジニアリング）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          maxTokens: 50,
          temperature: 0.1
        });
        
        const purpose = response.trim() as PresentationPurpose;
        console.log(`✅ Purpose selected: ${purpose}`);
        return purpose;
        
      } catch (error) {
        console.warn(`⚠️ Purpose Selection attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }
    throw new Error('Purpose selection failed after all retries');
  }

  /**
   * 🎭 テーマ選択（リトライ機能付き）
   */
  private async selectThemeWithRetry(topic: string, contentType: string, maxRetries: number = 3): Promise<PresentationTheme> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎭 Theme Selection - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = `コンテンツタイプ"${contentType}"の以下のトピックのテーマを選択してください。

トピック: "${topic}"

選択肢:
- storytelling: 物語・感動系
- corporate: ビジネス・企業系
- technical: 技術・論理系  
- academic: 学術・教育系
- creative: 芸術・創作系

回答形式: テーマ名のみを英語で回答（例: technical）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          maxTokens: 20,
          temperature: 0.1
        });
        
        const theme = this.parseThemeResponse(response.trim());
        if (theme) {
          console.log(`✅ Theme selected: ${theme}`);
          return theme;
        }
        
        throw new Error('Invalid theme response');
        
      } catch (error) {
        console.warn(`⚠️ Theme Selection attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }
    throw new Error('Theme selection failed after all retries');
  }

  /**
   * ⚙️ 補助設定分析（リトライ機能付き）
   */
  private async analyzeAdditionalSettingsWithRetry(topic: string, contentType: string, maxRetries: number = 3): Promise<{
    slideCount: number;
    needsPageNumbers: boolean;
    imageConsistencyLevel: 'high' | 'medium' | 'low';
  }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`⚙️ Additional Settings Analysis - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = `コンテンツタイプ"${contentType}"の以下のトピックの補助設定を決定してください。

トピック: "${topic}"

以下をJSON形式で回答してください：
{
  "slideCount": 5-20の範囲の数値,
  "needsPageNumbers": true または false,
  "imageConsistencyLevel": "high", "medium", "low" のいずれか
}

判断基準:
- slideCount: 内容の複雑さと時間に応じて
- needsPageNumbers: ビジネス・学術はtrue、物語・創作はfalse
- imageConsistencyLevel: 物語・ブランドは"high"、一般は"medium"、技術は"low"`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          maxTokens: 100,
          temperature: 0.1
        });
        
        const settings = JSON.parse(response.trim());
        console.log(`✅ Additional settings analyzed:`, settings);
        return {
          slideCount: Math.max(5, Math.min(20, settings.slideCount)),
          needsPageNumbers: Boolean(settings.needsPageNumbers),
          imageConsistencyLevel: ['high', 'medium', 'low'].includes(settings.imageConsistencyLevel) 
            ? settings.imageConsistencyLevel : 'medium'
        };
        
      } catch (error) {
        console.warn(`⚠️ Additional Settings attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }
    throw new Error('Additional settings analysis failed after all retries');
  }

  /**
   * 🔧 レスポンスパース用ヘルパーメソッド
   */
  private parseContentTypeResponse(response: string): ContextAnalysis['contentType'] | null {
    const cleanResponse = response.toLowerCase().trim();
    const validTypes: ContextAnalysis['contentType'][] = ['story', 'technical', 'business', 'academic', 'creative'];
    return validTypes.find(type => cleanResponse.includes(type)) || null;
  }

  private parseDesignerResponse(response: string): DesignerType | null {
    const cleanResponse = response.trim();
    const validDesigners: DesignerType[] = ['The Emotional Storyteller', 'The Corporate Strategist', 'logical', 'The Academic Visualizer', 'creative'];
    return validDesigners.find(designer => cleanResponse.includes(designer)) || null;
  }

  private parseThemeResponse(response: string): PresentationTheme | null {
    const cleanResponse = response.toLowerCase().trim();
    const validThemes: PresentationTheme[] = ['storytelling', 'corporate', 'technical', 'academic', 'creative'];
    return validThemes.find(theme => cleanResponse.includes(theme)) || null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🧠 旧包括的AI設定分析（廃止予定）
   */
  private async comprehensiveAIAnalysis(topic: string): Promise<{
    contentType: ContextAnalysis['contentType'];
    suggestedDesigner: DesignerType;
    suggestedPurpose: PresentationPurpose;
    suggestedTheme: PresentationTheme;
    suggestedSlideCount: number;
    needsPageNumbers: boolean;
    imageConsistencyLevel: 'high' | 'medium' | 'low';
  }> {
    const analysisPrompt = this.buildComprehensiveAIPrompt(topic);
    
    // 実際のAI呼び出し
    const { getTextAIService } = await import('./unifiedAIService');
    const aiService = getTextAIService();
    
    const response = await aiService.generateText(analysisPrompt, {
      maxTokens: 200,
      temperature: 0.2 // 多少の創造性を許可
    });
    
    return this.parseComprehensiveAIResponse(response);
  }

  /**
   * 生成AIを使った動的分類（レガシー、フォールバック用）
   */
  private async classifyWithAI(topic: string): Promise<ContextAnalysis['contentType']> {
    const classificationPrompt = this.buildAIClassificationPrompt(topic);
    
    // 実際のAI呼び出し
    const { getTextAIService } = await import('./unifiedAIService');
    const aiService = getTextAIService();
    
    const response = await aiService.generateText(classificationPrompt, {
      maxTokens: 50,
      temperature: 0.1 // 一貫性重視
    });
    
    return this.parseAIClassificationResponse(response);
  }

  /**
   * AI分類用詳細プロンプト構築
   */
  private buildAIClassificationPrompt(topic: string): string {
    return `あなたは優秀なコンテンツ分類エキスパートです。以下のリクエストを分析し、最適なカテゴリを判定してください。

リクエスト: "${topic}"

カテゴリ選択肢:
1. **story** - 物語・ストーリー・童話の作成依頼
   例: "桃太郎の話を作成して", "感動する体験談を書いて", "冒険物語を作って"

2. **technical** - 技術・IT・AI・エンジニアリング関連の説明・調査
   例: "GPT-5について調べて", "プログラミングの仕組みを説明", "AIの技術解説"

3. **business** - ビジネス・経営・研修・マーケティング・企業関連
   例: "営業戦略の提案", "クリティカルシンキング研修資料", "売上分析レポート", "リーダーシップ研修"

4. **academic** - 学術・研究・教育・実用的指導
   例: "環境問題の調査", "歴史の解説", "プランクのやり方", "料理の作り方", "使い方ガイド"
   ⚠️重要: 「やり方」「方法」「手順」の実用解説も academic（実践教育）

5. **creative** - 芸術・デザイン・創作活動・表現
   例: "アート作品の紹介", "デザインコンセプト", "創作活動の発表"

重要な判定ポイント:
- 「〜について調べて」「〜を分析して」「〜を説明して」= 調査・説明系
- 「研修」「トレーニング」「スキル」「ビジネス」= business
- AI/技術用語 + 調査・説明 = technical
- 「〜の話を作って」「物語を」= story
- その他の調査・説明 = academic

キーワード例による分類ヒント:
- ビジネス研修系: クリティカルシンキング、リーダーシップ、人材育成、プレゼンテーション → business
- 技術調査系: GPT、AI、プログラミング、システム、API → technical  
- 物語作成系: 桃太郎、童話、ストーリー、体験談 → story
- 学術・教育系: 環境、歴史、科学、理論 → academic
- 実用指導系: プランク、料理、使い方、やり方、手順、方法 → academic（実践教育として）

回答形式: カテゴリ名のみを英語で回答してください（story, technical, business, academic, creative のいずれか）`;
  }

  /**
   * 🧠 包括的AI分析プロンプト構築（全Auto設定対応）
   */
  private buildComprehensiveAIPrompt(topic: string): string {
    return `あなたは優秀なプレゼンテーション設計エキスパートです。以下のリクエストを分析し、最適な設定を判定してください。

リクエスト: "${topic}"

以下の項目を分析して、最適な設定を選択してください：

## 1. コンテンツタイプ
- story: 物語・ストーリー・童話
- technical: 技術・IT・AI・エンジニアリング  
- business: ビジネス・研修・マーケティング・企業
- academic: 学術・研究・教育・一般調査
- creative: 芸術・デザイン・創作

## 2. デザイナー選択
- "The Emotional Storyteller": 物語・感動系プレゼン用
- "The Corporate Strategist": ビジネス・企業プレゼン用  
- "logical": 技術・論理的・AI・エンジニアリング系説明用
- "The Academic Visualizer": 学術・教育・一般調査用
- "creative": 芸術・創作活動用

## 3. 用途（Purpose）
- "ストーリーテリング・物語の共有": 物語系
- "ビジネス・企業プレゼンテーション": ビジネス系
- "技術説明・エンジニアリング": AI・技術・システム系
- "教育・学習支援": 学術・一般教育系  
- "クリエイティブ・芸術表現": 創作系

## 4. テーマ
- storytelling: 物語・感動系
- corporate: ビジネス・企業系
- technical: 技術・論理系
- academic: 学術・教育系  
- creative: 芸術・創作系

## 5. スライド枚数（5-20枚で判定）
内容の複雑さと時間に応じて決定

## 6. ページ番号の必要性（true/false）
- ビジネス・学術系: 通常true
- 物語・創作系: 通常false

## 7. 画像一貫性レベル
- high: 物語・ブランド重視
- medium: ビジネス・一般
- low: 技術・学術（多様性重視）

回答形式（JSON）：
{
  "contentType": "business",
  "suggestedDesigner": "The Corporate Strategist", 
  "suggestedPurpose": "ビジネス・企業プレゼンテーション",
  "suggestedTheme": "corporate",
  "suggestedSlideCount": 12,
  "needsPageNumbers": true,
  "imageConsistencyLevel": "medium"
}`;
  }

  /**
   * 🧠 包括的AI分析レスポンスのパース
   */
  private parseComprehensiveAIResponse(response: string): {
    contentType: ContextAnalysis['contentType'];
    suggestedDesigner: DesignerType;
    suggestedPurpose: PresentationPurpose;
    suggestedTheme: PresentationTheme;
    suggestedSlideCount: number;
    needsPageNumbers: boolean;
    imageConsistencyLevel: 'high' | 'medium' | 'low';
  } {
    try {
      // JSONパースを試行
      const parsed = JSON.parse(response.trim());
      
      return {
        contentType: this.validateContentType(parsed.contentType),
        suggestedDesigner: this.validateDesigner(parsed.suggestedDesigner),
        suggestedPurpose: this.validatePurpose(parsed.suggestedPurpose),
        suggestedTheme: this.validateTheme(parsed.suggestedTheme),
        suggestedSlideCount: Math.max(5, Math.min(20, parsed.suggestedSlideCount || 10)),
        needsPageNumbers: Boolean(parsed.needsPageNumbers),
        imageConsistencyLevel: this.validateConsistencyLevel(parsed.imageConsistencyLevel)
      };
    } catch (error) {
      console.warn('🤖 AI comprehensive analysis parsing failed, using fallback:', error);
      return this.getDefaultComprehensiveSettings();
    }
  }

  /**
   * AI分類レスポンスのパース（レガシー）
   */
  private parseAIClassificationResponse(response: string): ContextAnalysis['contentType'] {
    const cleanResponse = response.trim().toLowerCase();
    
    // 正確な分類結果をチェック
    if (cleanResponse.includes('story')) return 'story';
    if (cleanResponse.includes('technical')) return 'technical';
    if (cleanResponse.includes('business')) return 'business';
    if (cleanResponse.includes('academic')) return 'academic';
    if (cleanResponse.includes('creative')) return 'creative';
    
    console.warn('🤖 AI classification unclear, response:', response);
    return 'academic'; // デフォルト
  }

  /**
   * バリデーション関数群
   */
  private validateContentType(type: string): ContextAnalysis['contentType'] {
    const validTypes: ContextAnalysis['contentType'][] = ['story', 'technical', 'business', 'academic', 'creative'];
    return validTypes.includes(type as ContextAnalysis['contentType']) ? type as ContextAnalysis['contentType'] : 'academic';
  }

  private validateDesigner(designer: string): DesignerType {
    const validDesigners: DesignerType[] = ['The Emotional Storyteller', 'The Corporate Strategist', 'logical', 'The Academic Visualizer', 'creative'];
    return validDesigners.includes(designer as DesignerType) ? designer as DesignerType : 'The Academic Visualizer';
  }

  private validatePurpose(purpose: string): PresentationPurpose {
    // 基本的な文字列検証（詳細は省略）
    return purpose as PresentationPurpose || '教育・学習支援';
  }

  private validateTheme(theme: string): PresentationTheme {
    const validThemes: PresentationTheme[] = ['storytelling', 'corporate', 'technical', 'academic', 'creative'];
    return validThemes.includes(theme as PresentationTheme) ? theme as PresentationTheme : 'academic';
  }

  private validateConsistencyLevel(level: string): 'high' | 'medium' | 'low' {
    const validLevels: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
    return validLevels.includes(level as 'high' | 'medium' | 'low') ? level as 'high' | 'medium' | 'low' : 'medium';
  }

  /**
   * デフォルト包括設定
   */
  private getDefaultComprehensiveSettings() {
    return {
      contentType: 'academic' as ContextAnalysis['contentType'],
      suggestedDesigner: 'The Academic Visualizer' as DesignerType,
      suggestedPurpose: '教育・学習支援' as PresentationPurpose,
      suggestedTheme: 'academic' as PresentationTheme,
      suggestedSlideCount: 10,
      needsPageNumbers: true,
      imageConsistencyLevel: 'medium' as 'high' | 'medium' | 'low'
    };
  }

  /**
   * 包括的理由生成（AI分析結果用）
   */
  private generateComprehensiveReasoning(
    topic: string, 
    aiAnalysis: any, 
    emotionalTone: string
  ): string {
    return `🧠 AI包括分析結果:
📝 リクエスト: "${topic}"
📊 コンテンツタイプ: ${aiAnalysis.contentType}
🎨 推奨デザイナー: ${aiAnalysis.suggestedDesigner}
🎯 用途: ${aiAnalysis.suggestedPurpose}
🌈 テーマ: ${aiAnalysis.suggestedTheme}
📄 推奨スライド数: ${aiAnalysis.suggestedSlideCount}枚
🔢 ページ番号: ${aiAnalysis.needsPageNumbers ? '必要' : '不要'}
🖼️ 画像一貫性: ${aiAnalysis.imageConsistencyLevel}レベル
💭 感情トーン: ${emotionalTone}

この設定により、コンテンツの性質に最適化されたプレゼンテーションが生成されます。`;
  }

  /**
   * フォールバック用キーワードベース分類（簡略版）
   */
  private keywordBasedFallback(topic: string): ContextAnalysis['contentType'] {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('の話を作成') || topicLower.includes('物語を作')) {
      return 'story';
    }
    if ((topicLower.includes('について') || topicLower.includes('を調べ')) && 
        (topicLower.includes('gpt') || topicLower.includes('ai') || topicLower.includes('技術'))) {
      return 'technical';
    }
    if (topicLower.includes('研修') || topicLower.includes('ビジネス') || topicLower.includes('経営')) {
      return 'business';
    }
    
    return 'academic';
  }

  /**
   * 明確な物語作成依頼の判定
   */
  private isExplicitStoryRequest(topic: string): boolean {
    const storyPatterns = [
      'の話を作成', 'の物語を作', '物語を作成', 'ストーリーを作',
      '童話を作', 'お話を作', '体験談を', '思い出話',
      'むかしむかし', '昔話'
    ];
    
    return storyPatterns.some(pattern => topic.includes(pattern));
  }

  /**
   * 調査・説明・教材作成依頼の判定
   */
  private isResearchOrExplanationRequest(topic: string): boolean {
    const researchPatterns = [
      // 調査・分析系
      'について調べ', 'について詳しく調べ', 'を調査',
      'について分析', 'について説明', 'について教え',
      'とは何か', 'の仕組み', 'について解説',
      'をまとめ', 'について整理', 'を研究',
      // 教材・資料作成系（重要な追加）
      '研修資料を', '教材を', '説明資料を', '学習資料を',
      '研修を', 'セミナー資料を', '講義資料を', '授業資料を',
      'について研修', 'の研修', '資料を用意', '資料を作成'
    ];
    
    const matchedPattern = researchPatterns.find(pattern => topic.includes(pattern));
    if (matchedPattern) {
      console.log('🔍 Research/Educational pattern matched:', matchedPattern);
    }
    
    return researchPatterns.some(pattern => topic.includes(pattern));
  }

  /**
   * 技術キーワードの存在判定
   */
  private hasTechnicalKeywords(topic: string): boolean {
    const techKeywords = [
      'ai', 'gpt', '人工知能', '機械学習', 'ml', 'deep learning',
      'api', 'プログラミング', 'システム', 'ソフトウェア', 
      'アルゴリズム', '技術', 'テクノロジー', 'it', 'エンジニア'
    ];
    
    const matchedKeywords = techKeywords.filter(keyword => topic.includes(keyword));
    if (matchedKeywords.length > 0) {
      console.log('💻 Technical keywords found:', matchedKeywords);
    }
    
    return techKeywords.some(keyword => topic.includes(keyword));
  }

  /**
   * ビジネスキーワードの存在判定  
   */
  private hasBusinessKeywords(topic: string): boolean {
    const businessKeywords = [
      // 基本ビジネス用語
      '売上', '利益', '戦略', 'マーケティング', '営業',
      '企業', '会社', 'ビジネス', '経営', 'roi',
      '提案', 'プロジェクト', 'kpi', '業績', '成果',
      '市場', '業界', '競合', '事業',
      // 研修・スキル系（重要な追加）
      '研修', '人材育成', 'スキル', 'トレーニング',
      'セミナー', 'ワークショップ', '人事', '組織',
      'リーダーシップ', 'マネジメント', 'チーム',
      'クリティカルシンキング', '論理的思考', '問題解決',
      'コミュニケーション', 'プレゼンテーション'
    ];
    
    const matchedKeywords = businessKeywords.filter(keyword => topic.includes(keyword));
    if (matchedKeywords.length > 0) {
      console.log('💼 Business keywords found:', matchedKeywords);
    }
    
    return businessKeywords.some(keyword => topic.includes(keyword));
  }

  /**
   * 創作キーワードの存在判定
   */
  private hasCreativeKeywords(topic: string): boolean {
    const creativeKeywords = [
      'アート', 'デザイン', '創作', 'クリエイティブ',
      '芸術', '表現', '美', '感性', 'インスピレーション',
      '絵画', '彫刻', '音楽', '映画', '小説', '詩'
    ];
    
    // ビジネス・研修文脈では創作系と判定しない
    const isBusinessContext = this.hasBusinessKeywords(topic) || 
                             this.isResearchOrExplanationRequest(topic);
    
    if (isBusinessContext) {
      console.log('🎨 Creative keywords ignored due to business/educational context');
      return false;
    }
    
    const matchedKeywords = creativeKeywords.filter(keyword => topic.includes(keyword));
    if (matchedKeywords.length > 0) {
      console.log('🎨 Creative keywords found:', matchedKeywords);
    }
    
    return creativeKeywords.some(keyword => topic.includes(keyword));
  }

  /**
   * 感情トーンの分析
   */
  private analyzeEmotionalTone(topic: string): ContextAnalysis['emotionalTone'] {
    // 感情的
    if (this.matchesPatterns(topic, [
      '感動', '涙', '心', '愛', '友情', '家族',
      '温かい', '優しい', '悲しい', '嬉しい', '幸せ',
      '物語', 'お話', '思い出', '体験'
    ])) {
      return 'emotional';
    }

    // インスピレーショナル
    if (this.matchesPatterns(topic, [
      '夢', '希望', '未来', '可能性', '挑戦', '成長',
      '目標', 'ビジョン', '変化', '革新', '新しい'
    ])) {
      return 'inspiring';
    }

    // 遊び心
    if (this.matchesPatterns(topic, [
      '楽しい', '面白い', 'ユニーク', 'ポップ',
      '童話', '子ども', 'カラフル', 'かわいい'
    ])) {
      return 'playful';
    }

    // 論理的・技術的
    if (this.matchesPatterns(topic, [
      '分析', 'データ', '統計', '効率', '最適化',
      '合理的', 'システマティック', '論理',
      // 🔧 技術キーワード追加
      'ai', 'gpt', '人工知能', '機械学習', 'ml', 'deep learning',
      'api', 'システム', 'ソフトウェア', 'アルゴリズム', 
      '技術', 'テクノロジー', 'it', 'エンジニア', 'プログラミング',
      '開発', 'コード', 'データベース', 'クラウド', 'セキュリティ'
    ])) {
      return 'logical';
    }

    return 'professional'; // デフォルト
  }

  /**
   * コンテキストマッピングの定義
   */
  private getContextMappings() {
    return [
      // 🎭 ストーリーテリング特化
      {
        patterns: ['桃太郎', '昔話', '物語', 'ストーリー', 'お話', '童話', '民話', '伝説'],
        designer: 'The Emotional Storyteller' as DesignerType,
        purpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
        theme: 'storytelling' as PresentationTheme,
        confidence: 0.95
      },
      
      // 🏢 企業・ビジネス
      {
        patterns: ['企業', 'ビジネス', '戦略', '売上', '営業', 'マーケティング'],
        designer: 'The Corporate Strategist' as DesignerType,
        purpose: 'ビジネス・企業プレゼンテーション' as PresentationPurpose,
        theme: 'corporate' as PresentationTheme,
        confidence: 0.9
      },

      // 🎓 学術・教育
      {
        patterns: ['研究', '学習', '教育', '講義', '授業', '学術', '分析'],
        designer: 'The Academic Visualizer' as DesignerType,
        purpose: '教育・学習支援' as PresentationPurpose,
        theme: 'academic' as PresentationTheme,
        confidence: 0.85
      },

      // 🎨 クリエイティブ
      {
        patterns: ['アート', 'デザイン', 'クリエイティブ', '創作', '表現', '芸術'],
        designer: 'The Vivid Creator' as DesignerType,
        purpose: 'クリエイティブワーク・アート' as PresentationPurpose,
        theme: 'creative' as PresentationTheme,
        confidence: 0.9
      },

      // 🔧 技術・AI・エンジニアリング  
      {
        patterns: ['技術', 'エンジニア', 'システム', 'プログラミング', 'IT', 'AI', 'gpt', '人工知能', '機械学習', 'アルゴリズム', 'ソフトウェア', 'api'],
        designer: 'logical' as DesignerType,
        purpose: '技術説明・エンジニアリング' as PresentationPurpose,
        theme: 'technical' as PresentationTheme,
        confidence: 0.9
      }
    ];
  }

  /**
   * 最適マッチの検索
   */
  private findBestMatch(topic: string, contextMap: any[]) {
    let bestMatch = contextMap[0];
    let maxScore = 0;

    for (const context of contextMap) {
      const score = this.calculateMatchScore(topic, context.patterns);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = context;
      }
    }

    return {
      suggestedDesigner: bestMatch.designer,
      suggestedPurpose: bestMatch.purpose,
      suggestedTheme: bestMatch.theme,
      confidence: Math.min(bestMatch.confidence * maxScore, 1.0)
    };
  }

  /**
   * コンテンツタイプと感情トーンによる補正
   */
  private refineByTypeAndTone(
    match: any, 
    contentType: string, 
    emotionalTone: string
  ) {
    // ストーリー系の場合はEmotional Storytellerを優先
    if (contentType === 'story') {
      return {
        ...match,
        suggestedDesigner: 'The Emotional Storyteller' as DesignerType,
        suggestedPurpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
        suggestedTheme: 'storytelling' as PresentationTheme,
        confidence: Math.max(match.confidence, 0.9)
      };
    }

    // 感情的トーンの場合
    if (emotionalTone === 'emotional') {
      return {
        ...match,
        suggestedDesigner: 'The Emotional Storyteller' as DesignerType,
        confidence: Math.max(match.confidence, 0.8)
      };
    }

    // クリエイティブトーンの場合
    if (emotionalTone === 'inspiring' || emotionalTone === 'playful') {
      return {
        ...match,
        suggestedDesigner: 'The Vivid Creator' as DesignerType,
        confidence: Math.max(match.confidence, 0.8)
      };
    }

    return match;
  }

  /**
   * コンテンツタイプに基づく直接的なデザイナーマッピング
   */
  private getDesignerByContentType(contentType: ContextAnalysis['contentType'], emotionalTone: ContextAnalysis['emotionalTone']) {
    switch (contentType) {
      case 'story':
        return {
          designer: 'The Emotional Storyteller' as DesignerType,
          purpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
          theme: 'storytelling' as PresentationTheme,
          confidence: 0.95
        };

      case 'technical':
        return {
          designer: 'logical' as DesignerType,
          purpose: '技術説明・エンジニアリング' as PresentationPurpose,
          theme: 'technical' as PresentationTheme,
          confidence: 0.9
        };

      case 'business':
        return {
          designer: 'The Corporate Strategist' as DesignerType,
          purpose: 'ビジネス・企業プレゼンテーション' as PresentationPurpose,
          theme: 'corporate' as PresentationTheme,
          confidence: 0.9
        };

      case 'academic':
        return {
          designer: 'The Academic Visualizer' as DesignerType,
          purpose: '教育・学習支援' as PresentationPurpose,
          theme: 'academic' as PresentationTheme,
          confidence: 0.85
        };

      case 'creative':
        return {
          designer: 'creative' as DesignerType,
          purpose: 'クリエイティブ・芸術表現' as PresentationPurpose,
          theme: 'creative' as PresentationTheme,
          confidence: 0.9
        };

      default:
        return {
          designer: 'The Academic Visualizer' as DesignerType,
          purpose: '教育・学習支援' as PresentationPurpose,
          theme: 'academic' as PresentationTheme,
          confidence: 0.7
        };
    }
  }

  /**
   * パターンマッチングヘルパー
   */

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      text.includes(pattern) || 
      this.fuzzyMatch(text, pattern)
    );
  }

  /**
   * マッチスコア計算
   */
  private calculateMatchScore(text: string, patterns: string[]): number {
    let score = 0;
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        score += 1;
      } else if (this.fuzzyMatch(text, pattern)) {
        score += 0.5;
      }
    }
    return score / patterns.length;
  }

  /**
   * ファジーマッチング
   */
  private fuzzyMatch(text: string, pattern: string): boolean {
    // シンプルな部分文字列マッチング
    const textChars = text.split('');
    const patternChars = pattern.split('');
    let matches = 0;
    
    for (const char of patternChars) {
      if (textChars.includes(char)) {
        matches++;
      }
    }
    
    return matches / patternChars.length > 0.6;
  }

  /**
   * 推定理由の生成
   */
  private generateReasoning(
    topic: string, 
    match: any, 
    contentType: string, 
    emotionalTone: string
  ): string {
    return `トピック「${topic}」を分析した結果:
・コンテンツタイプ: ${contentType}
・感情トーン: ${emotionalTone}  
・最適デザイナー: ${match.suggestedDesigner}
・推奨用途: ${match.suggestedPurpose}
・推奨テーマ: ${match.suggestedTheme}
・信頼度: ${Math.round(match.confidence * 100)}%`;
  }

  /**
   * 🧠 AI分析結果から適切な感情トーンをマッピング
   * キーワードマッチングを廃止し、コンテンツタイプとデザイナーから論理的に導出
   */
  private mapContentTypeToEmotionalTone(contentType: ContextAnalysis['contentType'], suggestedDesigner: DesignerType): ContextAnalysis['emotionalTone'] {
    console.log('🎭 Mapping emotional tone from AI analysis:', { contentType, suggestedDesigner });
    
    // コンテンツタイプベースの基本マッピング
    switch (contentType) {
      case 'story':
        console.log('📚 Story content → emotional tone');
        return 'emotional'; // 物語は感情的
        
      case 'technical':
        console.log('💻 Technical content → logical tone');
        return 'logical'; // 技術コンテンツは論理的
        
      case 'business':
        const businessTone = suggestedDesigner === 'The Corporate Strategist' ? 'professional' : 'inspiring';
        console.log(`💼 Business content → ${businessTone} tone`);
        return businessTone;
        
      case 'academic':
        console.log('🎓 Academic content → professional tone');
        return 'professional'; // 学術は専門的
        
      case 'creative':
        console.log('🎨 Creative content → inspiring tone');
        return 'inspiring'; // 創作は刺激的
        
      default:
        console.log('🔧 Default content → professional tone');
        return 'professional'; // デフォルト
    }
  }
}

// シングルトンインスタンス
export const contextEngine = new ContextIntelligenceEngine();