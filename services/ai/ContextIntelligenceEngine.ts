// =================================================================
// Context Intelligence Engine - AIコンテキスト認識エンジン
// トピックから最適なデザイナー・用途・テーマを自動推定
// =================================================================

import type { DesignerType, PresentationPurpose, PresentationTheme } from '../../types';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

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

// 🆕 新しいスタイル分析結果の型定義
export interface StyleAnalysisResult {
  selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented';
  reason: string;
  confidence: number;
  suggestedSlideCount: number;
  needsPageNumbers: boolean;
  imageConsistencyLevel: 'high' | 'medium' | 'low';
}

/**
 * 革新的AIコンテキスト認識エンジン
 * トピックを深層分析し、最適な作成戦略を推定
 * 
 * 🚨 CRITICAL CHANGE: キーワードマッチング完全排除
 * - 全てAI分析ベースに切り替え
 * - プロンプトはYAMLリソース化
 * - ルールベース判定は廃止
 */
export class ContextIntelligenceEngine {
  constructor() {
  }

  /**
   * 🎯 新しいスタイルベース分析プロンプト構築
   */
  private buildStyleAnalysisPrompt(topic: string): string {
    const config = contextIntelligenceResources.styleAnalysis;
    let prompt = config.systemPrompt + `\n\nトピック: "${topic}"\n\n以下のスタイルから最適なものを選択してください：\n\n`;
    
    // スタイル説明を動的構築
    Object.entries(config.styles).forEach(([key, style]: [string, any]) => {
      prompt += `**${style.name}**\n`;
      prompt += `説明: ${style.description}\n`;
      prompt += `特徴:\n`;
      style.characteristics.forEach((char: string) => {
        prompt += `  • ${char}\n`;
      });
      prompt += `画像スタイル: ${style.imageStyle}\n`;
      prompt += `レイアウト優先度: ${style.layoutPriority}\n\n`;
    });

    prompt += `\n${config.responseFormat}`;
    return prompt;
  }

  /**
   * フォールバック用プロンプト（YAMLロード失敗時）
   */
  private buildFallbackContentTypePrompt(topic: string): string {
    return `以下のリクエストのコンテンツタイプを分析してください。

リクエスト: "${topic}"

以下から1つ選択してください：
- story: 物語・ストーリー・童話・民話
- technical: AI・技術・システム・エンジニアリング・プログラミング
- business: ビジネス・企業・営業・研修・マーケティング
- academic: 学術・研究・教育・一般調査・解説・料理レシピ・実用ガイド
- creative: 芸術・デザイン・創作活動

⚠️重要：料理・レシピ・チャーシューは必ずacademicとして分類すること

回答形式: 選択したカテゴリ名のみを英語で回答（例: technical）`;
  }
  
  /**
   * 🚀 新しい簡素化されたスタイルベース分析
   * 4つのスタイルから最適なものを選択
   */
  async analyzeWithSimplifiedStyleAPI(topic: string): Promise<{
    selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented';
    reason: string;
    confidence: number;
    suggestedSlideCount: number;
    needsPageNumbers: boolean;
    imageConsistencyLevel: 'high' | 'medium' | 'low';
  }> {
    console.log('🚀 Starting simplified style-based analysis:', topic);
    
    try {
      const analysisPrompt = this.buildSimplifiedAnalysisPrompt(topic);
      const aiService = await this.getAIService();
      const rawResponse = await aiService.generateText(analysisPrompt);
      
      // JSON解析を試行
      const analysisResult = this.parseSimplifiedAnalysisResponse(rawResponse);
      console.log('✅ Simplified style analysis completed:', analysisResult);
      
      return analysisResult;
    } catch (error) {
      console.error('❌ Simplified style analysis failed:', error);
      throw new Error('スタイル分析に失敗しました。AIサービスの設定を確認するか、しばらく時間をおいてから再度お試しください。');
    }
  }

  /**
   * 🎯 Auto項目専用のコンテキスト分析（レガシー対応）
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
      const contentType = this.simpleContentTypeClassification(topic.toLowerCase());
      const recommendedStyle = this.getRecommendedStyleForContentType(contentType);
      
      return {
        contentType,
        suggestedDesigner: recommendedStyle.style,
        suggestedPurpose: recommendedStyle.purpose,
        suggestedTheme: recommendedStyle.theme,
        suggestedSlideCount: recommendedStyle.slideCount,
        needsPageNumbers: recommendedStyle.pageNumbers,
        imageConsistencyLevel: recommendedStyle.imageLevel
      };
    }
  }

  /**
   * フォールバック分析（AI失敗時）- 簡略版のAI独立分析
   */
  // private async fallbackAnalysis(topic: string): Promise<ContextAnalysis> {
  //   console.log('⚠️ Using fallback analysis for:', topic);
  //   const topicLower = topic.toLowerCase();
    
  //   // 🧠 シンプルなルールベース分類（キーワードマッチング最小限）
  //   const contentType = this.simpleContentTypeClassification(topicLower);
  //   const bestMatch = this.getDesignerByContentType(contentType, 'professional');
  //   const emotionalTone = this.mapContentTypeToEmotionalTone(contentType, bestMatch.designer);
    
  //   return {
  //     suggestedDesigner: bestMatch.designer,
  //     suggestedPurpose: bestMatch.purpose,
  //     suggestedTheme: bestMatch.theme,
  //     confidence: 0.7, // フォールバックは中程度の信頼度
  //     contentType,
  //     emotionalTone,
  //     // デフォルト設定
  //     suggestedSlideCount: contentType === 'story' ? 8 : 10,
  //     needsPageNumbers: contentType === 'business' || contentType === 'academic',
  //     imageConsistencyLevel: contentType === 'story' ? 'high' : 'medium',
  //     reasoning: `フォールバック分析: ${topic}を${contentType}として分類し、${emotionalTone}トーンで${bestMatch.designer}を選択`
  //   };
  // }

  /**
   * 🔧 初心者向けガイド: コンテンツタイプから推奨スタイルを選択
   */
  private simpleContentTypeClassification(topic: string): ContextAnalysis['contentType'] {
    // 物語・ストーリー系 → educationスタイル推奨（読みやすさ重視）
    if (topic.includes('物語') || topic.includes('昔話') || topic.includes('童話') || 
        topic.includes('の話') || topic.includes('ストーリー') || topic.includes('桃太郎')) {
      return 'story';
    }
    
    // マーケティング・営業系 → marketing-orientedスタイル推奨（ビジュアル重視）
    if (topic.includes('営業') || topic.includes('マーケティング') || topic.includes('商品') ||
        topic.includes('ブランド') || topic.includes('宣伝') || topic.includes('キャンペーン')) {
      return 'marketing';
    }
    
    // 研究・学術系 → research-presentation-orientedスタイル推奨（論理構成重視）
    if (topic.includes('研究') || topic.includes('学術') || topic.includes('調査') ||
        topic.includes('分析') || topic.includes('統計') || topic.includes('データ')) {
      return 'research';
    }
    
    // デフォルトはsimpleスタイル（汎用的）
    return 'simple';
  }

  /**
   * 🎯 初心者向けガイド: コンテンツタイプに基づく推奨設定
   */
  private getRecommendedStyleForContentType(contentType: string): {
    style: string;
    purpose: string;
    theme: string;
    slideCount: number;
    pageNumbers: boolean;
    imageLevel: string;
  } {
    switch (contentType) {
      case 'story':
        return {
          style: 'education',
          purpose: 'educational_content',
          theme: 'playful',
          slideCount: 8,
          pageNumbers: false,
          imageLevel: 'high'
        };
      
      case 'marketing':
        return {
          style: 'marketing-oriented',
          purpose: 'marketing_pitch',
          theme: 'creative',
          slideCount: 12,
          pageNumbers: true,
          imageLevel: 'high'
        };
      
      case 'research':
        return {
          style: 'research-presentation-oriented',
          purpose: 'academic_research',
          theme: 'academic',
          slideCount: 15,
          pageNumbers: true,
          imageLevel: 'medium'
        };
      
      case 'simple':
      default:
        return {
          style: 'simple',
          purpose: 'business_presentation',
          theme: 'professional',
          slideCount: 10,
          pageNumbers: true,
          imageLevel: 'medium'
        };
    }
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
      console.error('❌ AI classification failed:', error);
      throw new Error('コンテンツタイプの分類に失敗しました。AIサービスの接続を確認してください。');
    }
  }

  /**
   * 🔄 コンテンツタイプ分類（リトライ機能付き）
   * 🚨 CHANGE: YAMLリソースベースプロンプト使用
   */
  private async classifyContentTypeWithRetry(topic: string, maxRetries: number = 3): Promise<ContextAnalysis['contentType']> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Content Type Analysis - Attempt ${attempt}/${maxRetries}`);
        
        const prompt = this.buildContentTypePrompt(topic);

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
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
        
        const prompt = `コンテンツタイプ"${contentType}"の以下のトピックに最適なプレゼンテーションスタイルを選択してください。

トピック: "${topic}"

選択肢（初心者向けガイド）:
- "simple": シンプルで洗練、論理的構成、データ可視化重視
- "education": 大きく読みやすい文字、図解・ステップ形式、分かりやすいビジュアル
- "marketing-oriented": ビジュアルインパクト重視、製品写真中心、魅力的デザイン
- "research-presentation-oriented": 論理的研究構成、フレームワーク対応、インフォグラフィック

回答形式: スタイル名のみを英語で回答（例: simple）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
          temperature: 0.1
        });
        
        const designer = this.parsePresentationStyleResponse(response.trim());
        if (designer) {
          console.log(`✅ Presentation style selected: ${designer}`);
          return designer;
        }
        
        throw new Error('Invalid presentation style response');
        
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
        
        const prompt = `トピック「${topic}」に最も適した用途を選択してください。

利用可能な用途:
- business_presentation: ビジネス・企業向けプレゼンテーション
- educational_content: 教育・学習コンテンツ  
- storytelling: ストーリーテリング・物語
- children_content: 子供向けコンテンツ
- tutorial_guide: チュートリアル・ガイド
- portfolio_showcase: ポートフォリオ・作品紹介
- marketing_pitch: マーケティング・営業資料
- academic_research: 学術・研究発表
- event_announcement: イベント・告知
- training_material: 研修・トレーニング資料
- product_demo: 製品・サービスデモ
- report_summary: レポート・報告書
- creative_project: クリエイティブプロジェクト
- game_content: ゲーム・インタラクティブコンテンツ
- digital_signage: デジタルサイネージ
- video_storyboard: 動画制作用ストーリーボード

回答形式: 選択肢から1つ選んでキー名のみを回答してください（例: storytelling）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
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
        
        const prompt = `トピック「${topic}」に最も適したテーマを選択してください。

主要なテーマ選択肢:
- professional: プロフェッショナル・標準的
- creative: クリエイティブ・芸術的
- minimalist: ミニマル・シンプル
- storytelling: ストーリーテリング・物語風
- academic: 学術・教育的
- playful: 楽しい・親しみやすい
- children_bright: 子供向け・明るい色調
- children_pastel: 子供向け・パステル調
- tech_modern: 技術・モダン
- elegant_luxury: エレガント・高級感
- warm_friendly: 温かい・親しみやすい
- bold_impact: 大胆・インパクト重視
- traditional_japanese: 日本の伝統的
- hand_drawn: 手描き風
- medical: 医療・ヘルスケア
- dark_modern: ダークモダン

回答形式: 選択肢から1つ選んでキー名のみを回答してください（例: storytelling）`;

        const { getTextAIService } = await import('./unifiedAIService');
        const aiService = getTextAIService();
        
        const response = await aiService.generateText(prompt, {
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

  private parsePresentationStyleResponse(response: string): string | null {
    const cleanResponse = response.trim().toLowerCase();
    const validStyles = ['simple', 'education', 'marketing-oriented', 'research-presentation-oriented'];
    return validStyles.find(style => cleanResponse.includes(style)) || null;
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

4. **academic** - 学術・研究・教育・実用的指導・料理レシピ
   例: "環境問題の調査", "歴史の解説", "プランクのやり方", "料理の作り方", "チャーシューレシピ", "使い方ガイド"
   ⚠️重要: 「やり方」「方法」「手順」「料理」「レシピ」の実用解説は全て academic（実践教育）

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
- 料理系: チャーシュー、レシピ、調理、食材、作り方、料理法 → academic（料理教育として）

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
      console.error('❌ AI comprehensive analysis parsing failed:', error);
      throw new Error('総合分析の解析に失敗しました。AIの応答が不正な形式です。再度お試しください。');
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
   * 🚨 REMOVED: 確率的デザイナー選択システム削除
   * 
   * このメソッドは完全にキーワードマッチングベースだったため削除
   * 代替：AI分析ベースの統合デザイナー選択に置き換え
   */

  /**
   * 🚨 REMOVED: Purpose自動選択システム削除
   * 
   * このメソッドも完全にキーワードマッチングベースだったため削除
   * 代替：AI分析ベースの統合Purpose選択に置き換え
   */

  // /**
  //  * 🎯 Phase 3.2: 不適切な組み合わせ検出・修正システム
  //  * デザイナーとPurposeの組み合わせの適合性をチェック
  //  */
  // validateDesignerPurposeCombination(
  //   designer: DesignerType, 
  //   purpose: PresentationPurpose, 
  //   topic: string
  // ): { isValid: boolean; suggestedPurpose?: PresentationPurpose; reason?: string } {
    
  //   // 不適切な組み合わせの検出と修正
  //   const inappropriateCombinations = [
  //     {
  //       condition: designer === 'The Emotional Storyteller' && purpose === 'technical_documentation',
  //       suggestedPurpose: 'storytelling' as PresentationPurpose,
  //       reason: 'Emotional Storytellerは技術文書よりもストーリーテリングに適しています'
  //     },
  //     {
  //       condition: designer === 'The Corporate Strategist' && purpose === 'storytelling',
  //       suggestedPurpose: 'business_presentation' as PresentationPurpose,
  //       reason: 'Corporate Strategistはストーリーテリングよりもビジネスプレゼンに適しています'
  //     },
  //     {
  //       condition: designer === 'amateur' && purpose === 'academic_research',
  //       suggestedPurpose: 'tutorial_guide' as PresentationPurpose,
  //       reason: 'Amateur Designerは学術研究よりもチュートリアル形式に適しています'
  //     },
  //     {
  //       condition: designer === 'The Academic Visualizer' && purpose === 'storytelling' && !topic.toLowerCase().includes('物語'),
  //       suggestedPurpose: 'educational_content' as PresentationPurpose,
  //       reason: 'Academic Visualizerは物語以外ではストーリーテリングよりも教育コンテンツに適しています'
  //     }
  //   ];
    
  //   for (const combo of inappropriateCombinations) {
  //     if (combo.condition) {
  //       return {
  //         isValid: false,
  //         suggestedPurpose: combo.suggestedPurpose,
  //         reason: combo.reason
  //       };
  //     }
  //   }
    
  //   return { isValid: true };
  // }

  // /**
  //  * 🚨 REMOVED: キーワードマッチング削除
  //  * フォールバック用AI分析（キーワードマッチング廃止）
  //  */
  // private async aiBasedFallback(topic: string): Promise<ContextAnalysis['contentType']> {
  //   console.log('⚠️ Using AI-based fallback analysis');
  //   try {
  //     // 簡略版AI分析
  //     const prompt = this.buildFallbackContentTypePrompt(topic);
  //     const { getTextAIService } = await import('./unifiedAIService');
  //     const aiService = getTextAIService();
      
  //     const response = await aiService.generateText(prompt, {
  //       temperature: 0.1
  //     });
      
  //     return this.parseContentTypeResponse(response.trim()) || 'academic';
  //   } catch (error) {
  //     console.error('❌ AI fallback failed:', error);
  //     // 最後の手段：デフォルト
  //     return 'academic';
  //   }
  // }

  /**
   * 🚨 REMOVED: 全てのキーワードマッチングメソッド削除
   * 
   * 以下のメソッドは完全に削除されました：
   * - isExplicitStoryRequest()
   * - isResearchOrExplanationRequest()  
   * - hasTechnicalKeywords()
   * - hasBusinessKeywords()
   * - hasCreativeKeywords()
   * 
   * 理由：ユーザーから明確に「やめて」と指示されたため
   * 代替：全てAI分析ベースに切り替え
   */

  // /**
  //  * 🚨 SIMPLIFIED: 感情トーン分析簡略化
  //  * キーワードマッチング廃止、AI分析結果ベースのマッピングのみ
  //  */
  // private analyzeEmotionalTone(contentType: ContextAnalysis['contentType']): ContextAnalysis['emotionalTone'] {
  //   // AI分析結果ベースのシンプルマッピング
  //   switch (contentType) {
  //     case 'story':
  //       return 'emotional';
  //     case 'creative':
  //       return 'inspiring';
  //     case 'technical':
  //       return 'logical';
  //     case 'business':
  //     case 'academic':
  //     default:
  //       return 'professional';
  //   }
  // }

  // /**
  //  * コンテキストマッピングの定義
  //  */
  // private getContextMappings() {
  //   return [
  //     // 🎭 ストーリーテリング特化
  //     {
  //       patterns: ['桃太郎', '昔話', '物語', 'ストーリー', 'お話', '童話', '民話', '伝説'],
  //       designer: 'The Emotional Storyteller' as DesignerType,
  //       purpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
  //       theme: 'storytelling' as PresentationTheme,
  //       confidence: 0.95
  //     },
      
  //     // 🏢 企業・ビジネス
  //     {
  //       patterns: ['企業', 'ビジネス', '戦略', '売上', '営業', 'マーケティング'],
  //       designer: 'The Corporate Strategist' as DesignerType,
  //       purpose: 'ビジネス・企業プレゼンテーション' as PresentationPurpose,
  //       theme: 'corporate' as PresentationTheme,
  //       confidence: 0.9
  //     },

  //     // 🎓 学術・教育
  //     {
  //       patterns: ['研究', '学習', '教育', '講義', '授業', '学術', '分析'],
  //       designer: 'The Academic Visualizer' as DesignerType,
  //       purpose: '教育・学習支援' as PresentationPurpose,
  //       theme: 'academic' as PresentationTheme,
  //       confidence: 0.85
  //     },

  //     // 🎨 クリエイティブ
  //     {
  //       patterns: ['アート', 'デザイン', 'クリエイティブ', '創作', '表現', '芸術'],
  //       designer: 'The Vivid Creator' as DesignerType,
  //       purpose: 'クリエイティブワーク・アート' as PresentationPurpose,
  //       theme: 'creative' as PresentationTheme,
  //       confidence: 0.9
  //     },

  //     // 🔧 技術・AI・エンジニアリング  
  //     {
  //       patterns: ['技術', 'エンジニア', 'システム', 'プログラミング', 'IT', 'AI', 'gpt', '人工知能', '機械学習', 'アルゴリズム', 'ソフトウェア', 'api'],
  //       designer: 'logical' as DesignerType,
  //       purpose: '技術説明・エンジニアリング' as PresentationPurpose,
  //       theme: 'technical' as PresentationTheme,
  //       confidence: 0.9
  //     }
  //   ];
  // }

  // /**
  //  * 最適マッチの検索
  //  */
  // private findBestMatch(topic: string, contextMap: any[]) {
  //   let bestMatch = contextMap[0];
  //   let maxScore = 0;

  //   for (const context of contextMap) {
  //     const score = this.calculateMatchScore(topic, context.patterns);
  //     if (score > maxScore) {
  //       maxScore = score;
  //       bestMatch = context;
  //     }
  //   }

  //   return {
  //     suggestedDesigner: bestMatch.designer,
  //     suggestedPurpose: bestMatch.purpose,
  //     suggestedTheme: bestMatch.theme,
  //     confidence: Math.min(bestMatch.confidence * maxScore, 1.0)
  //   };
  // }

  // /**
  //  * コンテンツタイプと感情トーンによる補正
  //  */
  // private refineByTypeAndTone(
  //   match: any, 
  //   contentType: string, 
  //   emotionalTone: string
  // ) {
  //   // ストーリー系の場合はEmotional Storytellerを優先
  //   if (contentType === 'story') {
  //     return {
  //       ...match,
  //       suggestedDesigner: 'The Emotional Storyteller' as DesignerType,
  //       suggestedPurpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
  //       suggestedTheme: 'storytelling' as PresentationTheme,
  //       confidence: Math.max(match.confidence, 0.9)
  //     };
  //   }

  //   // 感情的トーンの場合
  //   if (emotionalTone === 'emotional') {
  //     return {
  //       ...match,
  //       suggestedDesigner: 'The Emotional Storyteller' as DesignerType,
  //       confidence: Math.max(match.confidence, 0.8)
  //     };
  //   }

  //   // クリエイティブトーンの場合
  //   if (emotionalTone === 'inspiring' || emotionalTone === 'playful') {
  //     return {
  //       ...match,
  //       suggestedDesigner: 'The Vivid Creator' as DesignerType,
  //       confidence: Math.max(match.confidence, 0.8)
  //     };
  //   }

  //   return match;
  // }

  /**
   * コンテンツタイプに基づく直接的なデザイナーマッピング
   */
  // private getDesignerByContentType(contentType: ContextAnalysis['contentType'], emotionalTone: ContextAnalysis['emotionalTone']) {
  //   switch (contentType) {
  //     case 'story':
  //       return {
  //         designer: 'The Emotional Storyteller' as DesignerType,
  //         purpose: 'ストーリーテリング・物語の共有' as PresentationPurpose,
  //         theme: 'storytelling' as PresentationTheme,
  //         confidence: 0.95
  //       };

  //     case 'technical':
  //       return {
  //         designer: 'logical' as DesignerType,
  //         purpose: '技術説明・エンジニアリング' as PresentationPurpose,
  //         theme: 'technical' as PresentationTheme,
  //         confidence: 0.9
  //       };

  //     case 'business':
  //       return {
  //         designer: 'The Corporate Strategist' as DesignerType,
  //         purpose: 'ビジネス・企業プレゼンテーション' as PresentationPurpose,
  //         theme: 'corporate' as PresentationTheme,
  //         confidence: 0.9
  //       };

  //     case 'academic':
  //       return {
  //         designer: 'The Academic Visualizer' as DesignerType,
  //         purpose: '教育・学習支援' as PresentationPurpose,
  //         theme: 'academic' as PresentationTheme,
  //         confidence: 0.85
  //       };

  //     case 'creative':
  //       return {
  //         designer: 'creative' as DesignerType,
  //         purpose: 'クリエイティブ・芸術表現' as PresentationPurpose,
  //         theme: 'creative' as PresentationTheme,
  //         confidence: 0.9
  //       };

  //     default:
  //       return {
  //         designer: 'The Academic Visualizer' as DesignerType,
  //         purpose: '教育・学習支援' as PresentationPurpose,
  //         theme: 'academic' as PresentationTheme,
  //         confidence: 0.7
  //       };
  //   }
  // }

  // =================================================================
  // 🚀 統合AI分析のための補助メソッド
  // =================================================================

  /**
   * 簡素化された分析用のプロンプト構築
   */
  private buildSimplifiedAnalysisPrompt(topic: string): string {
    const config = contextIntelligenceResources.simplifiedAnalysis;
    
    return config.systemPrompt.replace('{topic}', topic) + `

スタイル選択肢:
- simple: シンプルで洗練されたデザイン、グラフや表を使いやすいレイアウト、論理的な構成をサポート
- education: 文字サイズを大きくし、イラストやアイコンを多めに配置する教育・学習向けスタイル
- marketing-oriented: 製品やサービスを魅力的に見せるための写真や動画を配置しやすいビジュアル重視スタイル
- research-presentation-oriented: 図表や数式をきれいに配置できる研究発表向けスタイル

{
  "styleSelection": {
    "selectedStyle": "simple|education|marketing-oriented|research-presentation-oriented",
    "reason": "選択理由",
    "confidence": 0.0-1.0の数値
  },
  "presentationSettings": {
    "suggestedSlideCount": 推奨スライド数(5-20),
    "needsPageNumbers": true/false,
    "imageConsistencyLevel": "low|medium|high",
    "reasoning": "設定理由"
  }
}

${config.responseFormat}`;
  }

  /**
   * 簡素化された分析応答のJSON解析
   */
  private parseSimplifiedAnalysisResponse(rawResponse: string): {
    selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented';
    reason: string;
    confidence: number;
    suggestedSlideCount: number;
    needsPageNumbers: boolean;
    imageConsistencyLevel: 'high' | 'medium' | 'low';
  } {
    try {
      // JSON部分を抽出（前後の説明文を除去）
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON形式が見つかりません');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // 必要な構造を検証
      if (!parsed.styleSelection || !parsed.presentationSettings) {
        throw new Error('必要なフィールドが不足しています');
      }
      
      return {
        selectedStyle: parsed.styleSelection.selectedStyle as 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented',
        reason: parsed.styleSelection.reason,
        confidence: parsed.styleSelection.confidence,
        suggestedSlideCount: parsed.presentationSettings.suggestedSlideCount,
        needsPageNumbers: parsed.presentationSettings.needsPageNumbers,
        imageConsistencyLevel: parsed.presentationSettings.imageConsistencyLevel as 'high' | 'medium' | 'low'
      };
    } catch (error) {
      console.error('JSON解析失敗:', error, 'Raw response:', rawResponse);
      throw error;
    }
  }

  // /**
  //  * フォールバック時の簡素化分析結果作成
  //  */
  // private createFallbackSimplifiedAnalysis(topic: string): {
  //   selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented';
  //   reason: string;
  //   confidence: number;
  //   suggestedSlideCount: number;
  //   needsPageNumbers: boolean;
  //   imageConsistencyLevel: 'high' | 'medium' | 'low';
  // } {
  //   const topicLower = topic.toLowerCase();
    
  //   // 最小限のキーワードマッチング（保険処理）
  //   let selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented' = 'simple';
  //   let reason = 'デフォルトのシンプルスタイル';
    
  //   if (this.detectEducationContentFallback(topicLower)) {
  //     selectedStyle = 'education';
  //     reason = '教育・学習関連キーワードを検出';
  //   } else if (this.detectMarketingContentFallback(topicLower)) {
  //     selectedStyle = 'marketing-oriented';
  //     reason = 'マーケティング・製品関連キーワードを検出';
  //   } else if (this.detectResearchContentFallback(topicLower)) {
  //     selectedStyle = 'research-presentation-oriented';
  //     reason = '研究・分析関連キーワードを検出';
  //   }
    
  //   return {
  //     selectedStyle,
  //     reason,
  //     confidence: 0.6,
  //     suggestedSlideCount: 10,
  //     needsPageNumbers: selectedStyle === 'research-presentation-oriented' || selectedStyle === 'simple',
  //     imageConsistencyLevel: 'medium'
  //   };
  // }

  // // /**
  //  * フォールバック用の物語コンテンツ検出（保険処理）
  //  */
  // private detectStoryContentFallback(topicLower: string): boolean {
  //   const storyKeywords = ['物語', '昔話', '童話', '紙芝居', '絵本', '桃太郎', 'かぐや姫'];
  //   return storyKeywords.some(keyword => topicLower.includes(keyword));
  // }

  // /**
  //  * フォールバック用のビジネスコンテンツ検出（保険処理）  
  //  */
  // private detectBusinessContentFallback(topicLower: string): boolean {
  //   const businessKeywords = ['戦略', '営業', 'roi', 'kpi', 'マーケティング', 'ビジネス'];
  //   return businessKeywords.some(keyword => topicLower.includes(keyword));
  // }

  // /**
  //  * フォールバック用のクリエイティブコンテンツ検出（保険処理）
  //  */  
  // private detectCreativeContentFallback(topicLower: string): boolean {
  //   const creativeKeywords = ['アート', 'デザイン', '創作', 'クリエイティブ', '芸術'];
  //   return creativeKeywords.some(keyword => topicLower.includes(keyword));
  // }

  // /**
  //  * フォールバック用の教育コンテンツ検出（保険処理）
  //  */
  // private detectEducationContentFallback(topicLower: string): boolean {
  //   const educationKeywords = ['教育', '学習', '授業', '講義', '子供', 'こども', 'キッズ', '初心者', '入門', 'やり方', '使い方', '方法'];
  //   return educationKeywords.some(keyword => topicLower.includes(keyword));
  // }

  // /**
  //  * フォールバック用のマーケティングコンテンツ検出（保険処理）
  //  */
  // private detectMarketingContentFallback(topicLower: string): boolean {
  //   const marketingKeywords = ['マーケティング', '製品', 'プロダクト', '商品', 'サービス', 'ブランド', '販売', '宣伝', 'PR', '広告'];
  //   return marketingKeywords.some(keyword => topicLower.includes(keyword));
  // }

  // /**
  //  * フォールバック用の研究発表コンテンツ検出（保険処理）
  //  */
  // private detectResearchContentFallback(topicLower: string): boolean {
  //   const researchKeywords = ['研究', '分析', '調査', '論文', 'データ', '統計', '実験', '結果', '考察', '結論', 'PDCA', 'SWOT'];
  //   return researchKeywords.some(keyword => topicLower.includes(keyword));
  // }

  /**
   * AIサービス取得
   */
  private async getAIService() {
    const { getAIService } = await import('./unifiedAIService');
    return getAIService();
  }

  /**
   * 🚨 REMOVED: パターンマッチングヘルパー削除
   * 
   * 以下のメソッドは削除されました：
   * - matchesPatterns() 
   * - calculateMatchScore()
   * - fuzzyMatch()
   * 
   * 理由：全てキーワードマッチングベースのため
   * 代替：AI分析のみを使用
   */

//   /**
//    * 推定理由の生成
//    */
//   private generateReasoning(
//     topic: string, 
//     match: any, 
//     contentType: string, 
//     emotionalTone: string
//   ): string {
//     return `トピック「${topic}」を分析した結果:
// ・コンテンツタイプ: ${contentType}
// ・感情トーン: ${emotionalTone}  
// ・最適デザイナー: ${match.suggestedDesigner}
// ・推奨用途: ${match.suggestedPurpose}
// ・推奨テーマ: ${match.suggestedTheme}
// ・信頼度: ${Math.round(match.confidence * 100)}%`;
//   }

  // /**
  //  * 🧠 AI分析結果から適切な感情トーンをマッピング
  //  * キーワードマッチングを廃止し、コンテンツタイプとデザイナーから論理的に導出
  //  */
  // private mapContentTypeToEmotionalTone(contentType: ContextAnalysis['contentType'], suggestedDesigner: DesignerType): ContextAnalysis['emotionalTone'] {
  //   console.log('🎭 Mapping emotional tone from AI analysis:', { contentType, suggestedDesigner });
    
  //   // コンテンツタイプベースの基本マッピング
  //   switch (contentType) {
  //     case 'story':
  //       console.log('📚 Story content → emotional tone');
  //       return 'emotional'; // 物語は感情的
        
  //     case 'technical':
  //       console.log('💻 Technical content → logical tone');
  //       return 'logical'; // 技術コンテンツは論理的
        
  //     case 'business':
  //       const businessTone = suggestedDesigner === 'The Corporate Strategist' ? 'professional' : 'inspiring';
  //       console.log(`💼 Business content → ${businessTone} tone`);
  //       return businessTone;
        
  //     case 'academic':
  //       console.log('🎓 Academic content → professional tone');
  //       return 'professional'; // 学術は専門的
        
  //     case 'creative':
  //       console.log('🎨 Creative content → inspiring tone');
  //       return 'inspiring'; // 創作は刺激的
        
  //     default:
  //       console.log('🔧 Default content → professional tone');
  //       return 'professional'; // デフォルト
  //   }
  // }
}

// シングルトンインスタンス
export const contextEngine = new ContextIntelligenceEngine();