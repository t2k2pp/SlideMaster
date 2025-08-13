// =================================================================
// Slide Generation Factory
// ファクトリパターンでAIサービスとデザイナー戦略を統合
// =================================================================

import { 
  EnhancedSlideRequest, 
  SlideGenerationResult, 
  SlideGenerationFactory as ISlideGenerationFactory,
  DesignerStrategy,
  EnhancedAIService,
  DesignerType 
} from './aiServiceInterface';

// 新しい4スタイル戦略のインポート
import { SimpleStyleStrategy } from './SimpleStyleStrategy';
import { EducationStyleStrategy } from './EducationStyleStrategy'; 
import { MarketingStyleStrategy } from './MarketingStyleStrategy';
import { ResearchStyleStrategy } from './ResearchStyleStrategy';

// AI サービスのインポート (プロバイダー独立)
import { getAIService } from './unifiedAIService';
import { contextEngine } from './ContextIntelligenceEngine';

/**
 * スライド生成ファクトリクラス
 * デザインパターンに基づく AI サービス抽象化レイヤー
 */
export class SlideGenerationFactory implements ISlideGenerationFactory {
  private designerStrategies: Map<DesignerType, DesignerStrategy>;
  private aiService: EnhancedAIService;

  constructor() {
    this.initializeStrategies();
    try {
      this.aiService = getAIService() as EnhancedAIService;
    } catch (error) {
      // AIサービスの初期化エラーを詳細にログ出力
      console.error('SlideGenerationFactory: AI Service initialization failed:', error);
      // エラーを再スローせず、nullに設定してアプリケーションの起動は継続
      this.aiService = null as any;
      console.warn('SlideGenerationFactory: Running in degraded mode without AI service');
    }
  }

  /**
   * デザイナー戦略の初期化
   */
  private initializeStrategies(): void {
    this.designerStrategies = new Map([
      ['simple', new SimpleStyleStrategy()],
      ['education', new EducationStyleStrategy()],
      ['marketing-oriented', new MarketingStyleStrategy()],
      ['research-presentation-oriented', new ResearchStyleStrategy()]
    ]);
  }

  /**
   * メインのスライド生成インターフェース
   */
  async generateSlides(request: EnhancedSlideRequest): Promise<SlideGenerationResult> {
    // AIサービスが利用できない場合の早期リターン
    if (!this.aiService) {
      throw new Error('AIサービスが初期化されていません。設定を確認してください。');
    }
    
    try {
      // 🚀 新しい簡素化スタイルベース分析システム
      console.log('🚀 Context Intelligence: Starting simplified style-based analysis...', request.topic);
      const styleAnalysis = await contextEngine.analyzeWithSimplifiedStyleAPI(request.topic);
      
      // 🚀 スタイル分析結果をリクエストに統合  
      const intelligentRequest = this.enhanceRequestWithStyleAnalysis(request, styleAnalysis);
      
      console.log('🧠 Style Analysis Results:', {
        originalTopic: request.topic,
        styleAnalysisResults: styleAnalysis,
        enhancedRequest: {
          selectedStyle: styleAnalysis.selectedStyle,
          slideCount: intelligentRequest.slideCount,
          needsPageNumbers: intelligentRequest.needsPageNumbers
        }
      });
      
      // 1. 適切なデザイナー戦略を選択（コンテキスト強化済みリクエスト使用）
      const designerStrategy = this.selectDesignerStrategy(intelligentRequest);
      
      // 2. 🆕 Marp→JSON二段階生成 または 従来の一段階生成
      const useMarpApproach = true; // 新方式を有効にする
      let rawContent: string;
      
      if (useMarpApproach) {
        console.log('🎯 Using new Marp→JSON two-phase generation approach');
        rawContent = await designerStrategy.generateSlidesWithMarpApproach(intelligentRequest);
      } else {
        console.log('📝 Using traditional single-phase generation approach');
        // 従来方式（シングルフェーズ生成）
        const enhancedPrompt = designerStrategy.buildContentPrompt(intelligentRequest);
        rawContent = await this.generateRawContent(enhancedPrompt, intelligentRequest);
      }
      
      // 4. デザイナー戦略で後処理を実行
      const processedContent = designerStrategy.postProcessContent(rawContent, intelligentRequest);
      
      // 5. 画像生成が必要な場合は処理
      const finalContent = intelligentRequest.includeImages ? 
        await this.enhanceWithImages(processedContent, designerStrategy, intelligentRequest, styleAnalysis) : 
        processedContent;
      
      // 6. Title Slideを追加
      const contentWithTitleSlide = this.addTitleSlide(finalContent, designerStrategy, intelligentRequest);
      
      return {
        content: contentWithTitleSlide,
        metadata: {
          designerUsed: designerStrategy.designerName,
          strategy: designerStrategy.designerId,
          processingTime: Date.now(),
          requestParameters: this.extractRequestMetadata(intelligentRequest),
          contextIntelligence: {
            styleAnalysis: styleAnalysis,
            intelligentEnhancements: this.getStyleEnhancements(request, intelligentRequest, styleAnalysis)
          }
        }
      };
      
    } catch (error) {
      console.error('スライド生成エラー:', error);
      throw new Error(`スライド生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 🧠 革新的デザイナー戦略選択ロジック
   * Context Intelligence Engine結果を活用した高度な選択システム
   */
  private selectDesignerStrategy(request: EnhancedSlideRequest): DesignerStrategy {
    const requestedDesigner = request.selectedDesigner;
    
    console.log('🎨 Designer Selection Process:', {
      requestedDesigner,
      theme: request.theme,
      topic: request.topic.substring(0, 30) + '...'
    });

    // 🎯 Step 1: 明示的にリクエストされたデザイナーを尊重
    if (requestedDesigner && this.designerStrategies.has(requestedDesigner)) {
      const strategy = this.designerStrategies.get(requestedDesigner)!;
      console.log(`✅ Using explicitly requested designer: ${strategy.designerName}`);
      return strategy;
    }
    
    // 🎯 Step 2: Context Intelligence強化による高度な自動選択
    const strategy = this.selectStrategyByIntelligentContext(request);
    console.log(`🧠 Intelligent selection: ${strategy.designerName}`);
    return strategy;
  }

  /**
   * 🚀 Intelligent Context による革新的デザイナー戦略選択
   * 複数の要因を統合した高度な選択アルゴリズム
   */
  private selectStrategyByIntelligentContext(request: EnhancedSlideRequest): DesignerStrategy {
    const { purpose, theme, slideCount, topic } = request;
    
    console.log('🔍 Intelligent Context Analysis:', { purpose, theme, slideCount });

    // 🎯 selectedStyleベースの選択（新しい4スタイルシステム）
    if (request.selectedStyle) {
      console.log(`🎨 Style-based selection: ${request.selectedStyle}`);
      const strategy = this.designerStrategies.get(request.selectedStyle);
      if (strategy) {
        return strategy;
      }
    }

    // 🎭 教育スタイルの検出
    if (request.selectedDesigner === 'education') {
      console.log('📚 Education style detected');
      return this.designerStrategies.get('education')!;
    }

    // 🏢 マーケティングスタイルの検出
    if (request.selectedDesigner === 'marketing-oriented') {
      console.log('💼 Marketing style detected');
      return this.designerStrategies.get('marketing-oriented')!;
    }
    
    // 🎓 研究発表スタイルの検出
    if (request.selectedDesigner === 'research-presentation-oriented') {
      console.log('🎓 Research style detected');
      return this.designerStrategies.get('research-presentation-oriented')!;
    }
    
    // 🚀 シンプルスタイルの検出
    if (request.selectedDesigner === 'simple') {
      console.log('🎯 Simple style detected');
      return this.designerStrategies.get('simple')!;
    }
    
    // 🎯 デフォルトはsimpleスタイル
    console.log('🎯 Using default simple style');
    return this.designerStrategies.get('simple')!;
  }

  // =================================================================
  // Content Type Detection Methods
  // =================================================================

  private isStorytellingContent(purpose?: string, theme?: string, topic?: string): boolean {
    const storyKeywords = [
      'ストーリー', '物語', 'お話', '昔話', '童話', '民話', '伝説',
      'storytelling', 'story', '体験談', '経験', '旅', '冒険',
      '桃太郎', '浦島太郎', 'シンデレラ', '感動', '涙', '笑顔'
    ];
    
    const content = `${purpose || ''} ${theme || ''} ${topic || ''}`.toLowerCase();
    return storyKeywords.some(keyword => content.includes(keyword.toLowerCase())) ||
           theme === 'storytelling' ||
           purpose === 'ストーリーテリング・物語の共有';
  }

  private isBusinessContent(purpose?: string, theme?: string, topic?: string): boolean {
    const businessKeywords = [
      'ビジネス', '企業', '会議', '戦略', '売上', '利益', 'ROI',
      'business', 'corporate', 'strategy', 'marketing', '営業',
      '提案', 'プロジェクト', 'KPI', '業績', '成果', '投資'
    ];
    
    const content = `${purpose || ''} ${theme || ''} ${topic || ''}`.toLowerCase();
    return businessKeywords.some(keyword => content.includes(keyword.toLowerCase())) ||
           theme === 'corporate' ||
           purpose === 'ビジネス・企業プレゼンテーション';
  }

  private isAcademicContent(purpose?: string, theme?: string, topic?: string): boolean {
    const academicKeywords = [
      '学術', '研究', '調査', '分析', '理論', '学習', '教育',
      'academic', 'research', 'study', '授業', '講義', '科学',
      'データ', '統計', '実験', '考察', '論文', '学会'
    ];
    
    const content = `${purpose || ''} ${theme || ''} ${topic || ''}`.toLowerCase();
    return academicKeywords.some(keyword => content.includes(keyword.toLowerCase())) ||
           theme === 'academic' ||
           purpose === '教育・学習支援';
  }

  private isCreativeContent(purpose?: string, theme?: string, topic?: string): boolean {
    const creativeKeywords = [
      'クリエイティブ', 'アート', 'デザイン', '創作', '芸術',
      'creative', 'art', 'design', '表現', '美', 'インスピレーション',
      'マーケティング', '広告', 'ブランド', 'イノベーション'
    ];
    
    const content = `${purpose || ''} ${theme || ''} ${topic || ''}`.toLowerCase();
    return creativeKeywords.some(keyword => content.includes(keyword.toLowerCase())) ||
           theme === 'creative' ||
           purpose === 'クリエイティブワーク・アート';
  }

  private isTechnicalContent(purpose?: string, theme?: string, topic?: string): boolean {
    const technicalKeywords = [
      '技術', 'テクノロジー', 'システム', 'エンジニア', 'IT',
      'technical', 'technology', 'engineering', 'software',
      'プログラミング', 'AI', 'データ分析', '開発'
    ];
    
    const content = `${purpose || ''} ${theme || ''} ${topic || ''}`.toLowerCase();
    return technicalKeywords.some(keyword => content.includes(keyword.toLowerCase())) ||
           theme === 'technical' ||
           purpose === '技術説明・エンジニアリング';
  }

  /**
   * AI サービスを使用した生コンテンツ生成（レガシー方式）
   * 🚨 新方式ではMarp→JSON方式を優先的に使用
   */
  private async generateRawContent(
    prompt: string, 
    request: EnhancedSlideRequest
  ): Promise<string> {
    console.log('🚀 Generating raw content with enhanced prompt (legacy mode)...');
    console.log('📝 Enhanced Prompt Length:', prompt.length);
    console.log('🎯 Request Details:', {
      topic: request.topic,
      slideCount: request.slideCount,
      designer: request.selectedDesigner,
      theme: request.theme
    });
    
    // プロンプトの一部をログ出力（デバッグ用）
    console.log('📖 Enhanced Prompt Preview:', prompt.substring(0, 200) + '...');
    
    // 既存の AI サービスインターフェースを使用
    // プロバイダー独立性を維持
    const result = await this.aiService.generateSlideContent(
      request.topic,
      request.slideCount,
      {
        enhancedPrompt: prompt,
        theme: request.theme,
        designer: request.selectedDesigner,
        includeImages: request.includeImages
      }
    );
    
    console.log('✅ Raw content generated successfully, length:', result.length);
    return result;
  }

  /**
   * 🎨 Revolutionary Context-Driven Image Enhancement
   * Context Intelligence Engine結果を活用した高度な画像生成
   */
  private async enhanceWithImages(
    content: string,
    designerStrategy: DesignerStrategy,
    request: EnhancedSlideRequest,
    styleAnalysis: any
  ): Promise<string> {
    try {
      console.log('🔍 Attempting to parse JSON content, length:', content.length);
      let parsed: any;
      
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.log('🔧 Content preview (last 200 chars):', content.slice(-200));
        
        // JSON修復を試行
        const repairedContent = this.attemptJSONRepair(content);
        if (repairedContent) {
          console.log('🔧 Attempting JSON repair...');
          parsed = JSON.parse(repairedContent);
          console.log('✅ JSON repair successful!');
        } else {
          throw parseError; // 修復失敗なら元のエラーを投げる
        }
      }
      
      if (parsed.slides && Array.isArray(parsed.slides)) {
        console.log('🎨 Starting Context-Driven Image Enhancement...');
        
        // 🧠 画像用のスタイルベース分析
        const imageContextAnalysis = {
          selectedStyle: styleAnalysis.selectedStyle,
          reason: styleAnalysis.reason,
          confidence: styleAnalysis.confidence
        };
        
        // 各スライドに対してコンテキスト連動画像生成
        for (let i = 0; i < parsed.slides.length; i++) {
          const slide = parsed.slides[i];
          const slideContent = this.extractSlideTextContent(slide);
          
          // 🎯 コンテンツベースの画像プロンプト生成
          const styleEnhancedImageContext = {
            slideIndex: i,
            totalSlides: parsed.slides.length,
            styleAnalysis: imageContextAnalysis,
            selectedStyle: imageContextAnalysis.selectedStyle,
            topic: request.topic, // コンテンツの主題を明確に渡す
            imageConsistencyLevel: request.imageConsistencyLevel || 'medium'
          };
          
          // デザイナー戦略 + スタイル情報による画像プロンプト
          const baseImagePrompt = designerStrategy.buildImagePrompt(
            slideContent, 
            styleEnhancedImageContext
          );
          
          // 🚀 Style-Based Enhancement
          const enhancedImagePrompt = this.enhanceImagePromptWithStyle(
            baseImagePrompt,
            imageContextAnalysis,
            slideContent,
            i
          );
          
          // 画像生成メタデータを追加
          if (!slide.metadata) slide.metadata = {};
          slide.metadata.imagePrompt = enhancedImagePrompt;
          slide.metadata.baseImagePrompt = baseImagePrompt;
          slide.metadata.styleIntelligence = {
            selectedStyle: imageContextAnalysis.selectedStyle,
            reason: imageContextAnalysis.reason,
            confidence: imageContextAnalysis.confidence,
            reasoning: `Style-driven image for ${imageContextAnalysis.selectedStyle} presentation`
          };
          slide.metadata.imageGenerated = false; // 実際の画像生成は後続処理で
          
          console.log(`🖼️ Enhanced image prompt for slide ${i + 1}:`, {
            selectedStyle: imageContextAnalysis.selectedStyle,
            promptLength: enhancedImagePrompt.length,
            slideContent: slideContent.substring(0, 50) + '...'
          });
        }
        
        console.log('✨ Context-Driven Image Enhancement completed successfully!');
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.warn('コンテキスト連動画像拡張処理でエラーが発生しました:', error);
      return content; // エラーの場合は元のコンテンツを返す
    }
  }

  /**
   * スライドからテキストコンテンツを抽出
   */
  private extractSlideTextContent(slide: any): string {
    if (!slide.layers || !Array.isArray(slide.layers)) {
      return '';
    }
    
    return slide.layers
      .filter((layer: any) => layer.type === 'text' && layer.content)
      .map((layer: any) => layer.content)
      .join(' ');
  }

  /**
   * 🔧 革新的JSON修復システム - 完全対応版
   * あらゆるJSONエラーパターンに対応した高度修復機能
   */
  private attemptJSONRepair(content: string): string | null {
    console.log('🔧 Starting advanced JSON repair process...');
    console.log('🔍 Content length:', content.length);
    console.log('🔍 Last 100 chars:', content.slice(-100));
    
    try {
      let repairedContent = content;
      
      // Step 1: 基本的な文字列クリーニング
      repairedContent = repairedContent.trim();
      
      // Step 2: 不正な制御文字を除去
      repairedContent = repairedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Step 3: 不完全な JSON を修復するための積極的なアプローチ
      // 最後の完全なオブジェクト/配列を見つける
      const lastCompleteStructure = this.findLastCompleteStructure(repairedContent);
      if (lastCompleteStructure) {
        console.log('🔧 Found last complete structure, truncating to position:', lastCompleteStructure);
        repairedContent = repairedContent.substring(0, lastCompleteStructure + 1);
      }
      
      // Step 4: 基本的な構造修復
      const structureResult = this.repairJSONStructure(repairedContent);
      if (structureResult) {
        console.log('✅ JSON repair successful!');
        return structureResult;
      }
      
      // Step 5: 最終手段 - 最小限の有効なJSONを生成
      return this.createMinimalValidJSON(content);
      
    } catch (error) {
      console.error('❌ JSON repair completely failed:', error);
      // 完全な失敗時は最小限のダミーJSONを返す
      return this.createEmergencyJSON();
    }
  }
  
  /**
   * 最後の完全な構造（}または]）を探す
   */
  private findLastCompleteStructure(content: string): number | null {
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let lastValidPos = -1;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount >= 0) lastValidPos = i;
      }
      else if (char === '[') bracketCount++;
      else if (char === ']') {
        bracketCount--;
        if (bracketCount >= 0) lastValidPos = i;
      }
    }
    
    return lastValidPos > 0 ? lastValidPos : null;
  }
  
  /**
   * JSON構造の修復
   */
  private repairJSONStructure(content: string): string | null {
    try {
      let repairedContent = content;
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      
      // 構造を分析
      for (let i = 0; i < repairedContent.length; i++) {
        const char = repairedContent[i];
        const prevChar = i > 0 ? repairedContent[i - 1] : '';
        
        if (char === '"' && prevChar !== '\\') {
          inString = !inString;
          continue;
        }
        
        if (inString) continue;
        
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
      
      // 不足している終了文字を追加
      let repairs = [];
      
      // 文字列の途中で終了している場合
      if (inString) {
        repairedContent += '"';
        repairs.push('closing quote');
      }
      
      // 配列の修復
      while (bracketCount > 0) {
        repairedContent += ']';
        bracketCount--;
        repairs.push('closing bracket');
      }
      
      // オブジェクトの修復
      while (braceCount > 0) {
        repairedContent += '}';
        braceCount--;
        repairs.push('closing brace');
      }
      
      console.log('🔧 Applied repairs:', repairs.join(', '));
      
      // 修復結果をテスト
      JSON.parse(repairedContent);
      return repairedContent;
      
    } catch (error) {
      console.warn('🔧 Structure repair failed:', error);
      return null;
    }
  }
  
  /**
   * 最小限の有効なJSONを作成
   */
  private createMinimalValidJSON(originalContent: string): string {
    console.log('🔧 Creating minimal valid JSON...');
    
    try {
      // 元のコンテンツからタイトルを抽出してみる
      const titleMatch = originalContent.match(/"title"\s*:\s*"([^"]*)"/) || 
                        originalContent.match(/"title"\s*:\s*'([^']*)'/) || 
                        originalContent.match(/title:\s*["']([^"']*)/);
      
      const title = titleMatch ? titleMatch[1] : "プレゼンテーション";
      
      // 最小限の有効なスライドJSONを作成
      return JSON.stringify({
        title: title,
        description: "自動生成されたプレゼンテーション",
        slides: [
          {
            id: "slide-1",
            title: title,
            layers: [
              {
                id: "layer-1-1",
                type: "text",
                content: title,
                x: 10,
                y: 20,
                width: 80,
                height: 20,
                fontSize: 32,
                textAlign: "center",
                textColor: "#000000"
              }
            ],
            background: "#ffffff"
          }
        ]
      }, null, 2);
      
    } catch (error) {
      console.error('🔧 Minimal JSON creation failed:', error);
      return this.createEmergencyJSON();
    }
  }
  
  /**
   * 緊急時の最小JSON
   */
  private createEmergencyJSON(): string {
    return JSON.stringify({
      title: "エラー回復",
      description: "JSON修復エラーからの回復",
      slides: [
        {
          id: "slide-1",
          title: "エラー回復",
          layers: [
            {
              id: "layer-1-1",
              type: "text", 
              content: "プレゼンテーションの生成中にエラーが発生しましたが、システムが回復しました。",
              x: 10,
              y: 30,
              width: 80,
              height: 40,
              fontSize: 24,
              textAlign: "left",
              textColor: "#000000"
            }
          ],
          background: "#f8f9fa"
        }
      ]
    }, null, 2);
  }

  /**
   * リクエストメタデータの抽出
   */
  private extractRequestMetadata(request: EnhancedSlideRequest): any {
    return {
      topic: request.topic,
      slideCount: request.slideCount,
      slideCountMode: request.slideCountMode,
      theme: request.theme,
      selectedDesigner: request.selectedDesigner,
      includeImages: request.includeImages,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 利用可能なデザイナー戦略一覧を取得
   */
  getAvailableDesigners(): Array<{id: DesignerType, name: string}> {
    return Array.from(this.designerStrategies.entries()).map(([id, strategy]) => ({
      id,
      name: strategy.designerName
    }));
  }

  /**
   * 特定のデザイナー戦略の詳細情報を取得
   */
  getDesignerInfo(designerId: DesignerType): DesignerStrategy | null {
    return this.designerStrategies.get(designerId) || null;
  }

  // =================================================================
  // Context Intelligence Engine Integration Methods
  // =================================================================

  /**
   * 🎯 Auto項目専用のリクエスト強化
   * Auto指定された項目のみをAI分析結果で置き換え、ユーザー指定は尊重
   */
  private enhanceRequestWithAutoAnalysis(
    originalRequest: EnhancedSlideRequest, 
    autoAnalysis: any
  ): EnhancedSlideRequest {
    const enhanced = { ...originalRequest };

    console.log('🔧 Enhancing request with Auto analysis...');

    // Auto分析されたデザイナーを適用
    if (autoAnalysis.suggestedDesigner) {
      enhanced.selectedDesigner = autoAnalysis.suggestedDesigner;
      console.log(`🎨 Designer auto-selected: ${enhanced.selectedDesigner}`);
    }

    // Auto分析された用途を適用
    if (autoAnalysis.suggestedPurpose) {
      enhanced.purpose = autoAnalysis.suggestedPurpose;
      console.log(`📋 Purpose auto-selected: ${enhanced.purpose}`);
    }

    // Auto分析されたテーマを適用
    if (autoAnalysis.suggestedTheme) {
      enhanced.theme = autoAnalysis.suggestedTheme;
      console.log(`🎭 Theme auto-selected: ${enhanced.theme}`);
    }

    // スライド数の調整
    if (autoAnalysis.suggestedSlideCount && (!originalRequest.slideCount || originalRequest.slideCountMode === 'auto')) {
      enhanced.slideCount = autoAnalysis.suggestedSlideCount;
      console.log(`📄 Slide count auto-selected: ${enhanced.slideCount}`);
    }

    return enhanced;
  }

  /**
   * 🚀 スタイル分析結果によるリクエスト強化
   * 新しい4スタイルベース分析結果をリクエストに適用
   */
  private enhanceRequestWithStyleAnalysis(
    originalRequest: EnhancedSlideRequest, 
    styleAnalysis: any
  ): EnhancedSlideRequest {
    const enhanced = { ...originalRequest };

    console.log('🚀 Enhancing request with style-based analysis...');

    // スタイル情報を設定
    enhanced.selectedStyle = styleAnalysis.selectedStyle;
    
    // スタイルに基づいたデザイナー・テーマ・用途の自動選択
    const styleMapping = this.mapStyleToDesignerSettings(styleAnalysis.selectedStyle);
    
    if (!originalRequest.selectedDesigner || originalRequest.selectedDesigner === 'auto') {
      enhanced.selectedDesigner = styleMapping.designer;
      console.log(`🎨 Designer mapped from style: ${enhanced.selectedDesigner}`);
    }

    if (!originalRequest.theme || originalRequest.theme === 'auto') {
      enhanced.theme = styleMapping.theme;
      console.log(`🎭 Theme mapped from style: ${enhanced.theme}`);
    }

    if (!originalRequest.purpose || originalRequest.purpose === 'auto') {
      enhanced.purpose = styleMapping.purpose;
      console.log(`📋 Purpose mapped from style: ${enhanced.purpose}`);
    }

    // スライド数の調整
    if (!originalRequest.slideCount || originalRequest.slideCountMode === 'auto') {
      enhanced.slideCount = styleAnalysis.suggestedSlideCount;
      console.log(`📄 Slide count auto-selected: ${enhanced.slideCount}`);
    }

    // その他の設定
    enhanced.needsPageNumbers = styleAnalysis.needsPageNumbers;
    enhanced.imageConsistencyLevel = styleAnalysis.imageConsistencyLevel;

    return enhanced;
  }

  /**
   * 🧠 旧Context Intelligence による革新的リクエスト強化（廃止予定）
   */
  private enhanceRequestWithContext(
    originalRequest: EnhancedSlideRequest, 
    contextAnalysis: any
  ): EnhancedSlideRequest {
    const enhanced = { ...originalRequest };

    // 🎯 高信頼度の分析結果で自動選択を実行
    if (contextAnalysis.confidence >= 0.7) {
      console.log('🚀 High confidence context analysis - Applying intelligent enhancements');
      
      // デザイナーの自動選択（ユーザー選択がない場合、または'auto'/'amateur'の場合）
      if (!originalRequest.selectedDesigner || 
          originalRequest.selectedDesigner === 'amateur' ||
          originalRequest.selectedDesigner === 'auto') {
        enhanced.selectedDesigner = contextAnalysis.suggestedDesigner;
        console.log(`🎨 Designer enhanced: ${originalRequest.selectedDesigner || 'none'} → ${enhanced.selectedDesigner}`);
      }

      // 用途の自動選択（autoの場合のみ）
      if (!originalRequest.purpose || originalRequest.purpose === 'auto') {
        enhanced.purpose = contextAnalysis.suggestedPurpose;
        console.log(`📋 Purpose enhanced: ${originalRequest.purpose || 'auto'} → ${enhanced.purpose}`);
      }

      // テーマの自動選択（autoの場合のみ）
      if (!originalRequest.theme || originalRequest.theme === 'auto') {
        enhanced.theme = contextAnalysis.suggestedTheme;
        console.log(`🎭 Theme enhanced: ${originalRequest.theme || 'auto'} → ${enhanced.theme}`);
      }
    }

    // 🎯 ストーリーテリング特化の強制適用（最優先）
    if (contextAnalysis.contentType === 'story') {
      console.log('📚 STORY CONTENT DETECTED - Applying storytelling override!');
      
      // 強制的にストーリーテリング設定を適用（ユーザー設定を上書き）
      enhanced.selectedDesigner = 'The Emotional Storyteller';
      enhanced.purpose = 'ストーリーテリング・物語の共有';
      enhanced.theme = 'storytelling';
      
      // ストーリー系は画像を含める方が効果的
      if (enhanced.includeImages === undefined) {
        enhanced.includeImages = true;
      }

      console.log('✨ Storytelling configuration applied:', {
        designer: enhanced.selectedDesigner,
        purpose: enhanced.purpose,
        theme: enhanced.theme,
        includeImages: enhanced.includeImages
      });
    }

    // 🎯 画像スタイルの自動調整
    if (enhanced.includeImages && !enhanced.imageSettings?.style) {
      enhanced.imageSettings = enhanced.imageSettings || {};
      
      switch (contextAnalysis.contentType) {
        case 'story':
          enhanced.imageSettings.style = 'storybook';
          break;
        case 'business':
          enhanced.imageSettings.style = 'realistic';
          break;
        case 'creative':
          enhanced.imageSettings.style = 'artistic';
          break;
        default:
          enhanced.imageSettings.style = 'auto';
      }
    }

    return enhanced;
  }

  /**
   * 🔍 Intelligent Enhancement記録の生成
   * 何が自動選択されたかを記録
   */
  private getIntelligentEnhancements(
    original: EnhancedSlideRequest, 
    enhanced: EnhancedSlideRequest
  ): any {
    const changes: any = {};

    if (original.selectedDesigner !== enhanced.selectedDesigner) {
      changes.designerChanged = {
        from: original.selectedDesigner || 'none',
        to: enhanced.selectedDesigner,
        reason: 'Context Intelligence automatic selection'
      };
    }

    if (original.purpose !== enhanced.purpose) {
      changes.purposeChanged = {
        from: original.purpose || 'auto',
        to: enhanced.purpose,
        reason: 'Context Intelligence automatic selection'
      };
    }

    if (original.theme !== enhanced.theme) {
      changes.themeChanged = {
        from: original.theme || 'auto',
        to: enhanced.theme,
        reason: 'Context Intelligence automatic selection'
      };
    }

    if (enhanced.imageSettings?.style && 
        enhanced.imageSettings.style !== original.imageSettings?.style) {
      changes.imageStyleChanged = {
        from: original.imageSettings?.style || 'auto',
        to: enhanced.imageSettings.style,
        reason: 'Content type optimized image style'
      };
    }

    return changes;
  }

  /**
   * 🔍 スタイル分析強化記録の生成
   * スタイル分析によって何が変更されたかを記録
   */
  private getStyleEnhancements(
    original: EnhancedSlideRequest, 
    enhanced: EnhancedSlideRequest,
    styleAnalysis: any
  ): any {
    const changes: any = {};

    if (original.selectedDesigner !== enhanced.selectedDesigner) {
      changes.designerMappedFromStyle = {
        from: original.selectedDesigner || 'none',
        to: enhanced.selectedDesigner,
        reason: `Mapped from ${styleAnalysis.selectedStyle} style`,
        confidence: styleAnalysis.confidence
      };
    }

    if (original.purpose !== enhanced.purpose) {
      changes.purposeMappedFromStyle = {
        from: original.purpose || 'auto',
        to: enhanced.purpose,
        reason: `Mapped from ${styleAnalysis.selectedStyle} style`,
        confidence: styleAnalysis.confidence
      };
    }

    if (original.theme !== enhanced.theme) {
      changes.themeMappedFromStyle = {
        from: original.theme || 'auto',
        to: enhanced.theme,
        reason: `Mapped from ${styleAnalysis.selectedStyle} style`,
        confidence: styleAnalysis.confidence
      };
    }

    if (original.slideCount !== enhanced.slideCount) {
      changes.slideCountAutoSelected = {
        from: original.slideCount || 'auto',
        to: enhanced.slideCount,
        reason: `Style-based analysis: ${styleAnalysis.reason}`
      };
    }

    return changes;
  }

  /**
   * 🎨 スタイル別画像プロンプト強化
   * 4つのスタイルに基づく適切な画像スタイル選択
   */
  private enhanceImagePromptWithStyle(
    baseImagePrompt: string,
    styleAnalysis: any,
    slideContent: string,
    slideIndex: number
  ): string {
    const selectedStyle = styleAnalysis.selectedStyle;
    
    const styleConfig = this.getImageStyleForNewStyles(selectedStyle);
    
    return `${baseImagePrompt}

${styleConfig.styleInstruction}
Context: ${styleConfig.contextDescription}
${styleConfig.specificGuidelines}
Important: ${styleConfig.prohibitions}
Note: No text overlays, website URLs, or icons8.com imagery.`;
  }

  /**
   * 新しい4スタイル用のスタイル→デザイナー設定マッピング
   */
  private mapStyleToDesignerSettings(selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented'): {
    designer: string;
    theme: string;
    purpose: string;
  } {
    switch (selectedStyle) {
      case 'simple':
        return {
          designer: 'simple',
          theme: 'minimalist',
          purpose: 'business_presentation'
        };
      case 'education':
        return {
          designer: 'education', 
          theme: 'children_bright',
          purpose: 'storytelling'
        };
      case 'marketing-oriented':
        return {
          designer: 'marketing-oriented',
          theme: 'creative',
          purpose: 'marketing_pitch'
        };
      case 'research-presentation-oriented':
        return {
          designer: 'research-presentation-oriented',
          theme: 'academic',
          purpose: 'academic_research'
        };
      default:
        return {
          designer: 'simple',
          theme: 'academic',
          purpose: 'educational_content'
        };
    }
  }

  /**
   * 新しい4スタイル用の画像スタイル設定
   */
  private getImageStyleForNewStyles(selectedStyle: 'simple' | 'education' | 'marketing-oriented' | 'research-presentation-oriented'): {
    styleInstruction: string;
    contextDescription: string;
    specificGuidelines: string;
    prohibitions: string;
  } {
    switch (selectedStyle) {
      case 'simple':
        return {
          styleInstruction: 'Style: Clean, professional imagery with modern design. Use simple compositions and neutral colors.',
          contextDescription: 'Simple and refined presentation design',
          specificGuidelines: 'Focus on clarity and professionalism. Emphasize graphs, charts, and structured layouts.',
          prohibitions: 'NO cluttered visuals, excessive decoration, or overly complex compositions.'
        };

      case 'education':
        return {
          styleInstruction: 'Style: Clear, educational imagery with large, readable elements. Use friendly colors and approachable design.',
          contextDescription: 'Educational and learning-focused presentation',
          specificGuidelines: 'Make it engaging for learners. Use illustrations, icons, and step-by-step visual guidance. For children\'s content, childish imagery is OK.',
          prohibitions: 'NO complex professional graphs, overly technical imagery, or intimidating visual elements.'
        };

      case 'marketing-oriented':
        return {
          styleInstruction: 'Style: Dynamic, visually impactful imagery showcasing products and services. Use attractive colors and compelling compositions.',
          contextDescription: 'Marketing and visual-oriented presentation',
          specificGuidelines: 'Focus on product photography style, attractive visuals for marketing materials. Create placeholder images for actual product photos.',
          prohibitions: 'NO boring layouts, academic formality, or conservative design elements.'
        };

      case 'research-presentation-oriented':
        return {
          styleInstruction: 'Style: Structured, analytical imagery with focus on data and frameworks. Use infographic-style visuals.',
          contextDescription: 'Research and analytical presentation',
          specificGuidelines: 'Emphasize logical frameworks like PDCA cycles, SWOT diagrams, and structured infographics. Support logical thinking with clear visual aids.',
          prohibitions: 'NO decorative imagery, emotional appeals, or non-analytical visual elements.'
        };

      default:
        return {
          styleInstruction: 'Style: Balanced, professional imagery appropriate for general presentations.',
          contextDescription: 'General presentation design',
          specificGuidelines: 'Maintain professionalism while keeping visuals engaging.',
          prohibitions: 'NO inappropriate or off-topic imagery.'
        };
    }
  }

  /**
   * 🎯 用途別画像スタイル設定
   * PresentationPurposeごとの最適な画像生成指示
   */
  private getImageStyleForPurpose(purpose: string): {
    styleInstruction: string;
    contextDescription: string;
    specificGuidelines: string;
    prohibitions: string;
  } {
    switch (purpose) {
      case 'storytelling':
        return {
          styleInstruction: 'Style: Warm, storybook-style illustration with narrative focus. Use soft colors and expressive characters.',
          contextDescription: 'Storytelling and narrative content',
          specificGuidelines: 'Focus on emotional characters, story scenes, and traditional tale aesthetics.',
          prohibitions: 'NO business elements, office settings, corporate imagery, or data visualizations.'
        };

      case 'children_content':
        return {
          styleInstruction: 'Style: Bright, colorful, child-friendly illustration. Use simple shapes and cheerful characters.',
          contextDescription: 'Educational content for children',
          specificGuidelines: 'Make it engaging for young learners with vibrant colors and playful elements.',
          prohibitions: 'NO complex imagery, scary elements, or adult-oriented content.'
        };

      case 'academic_research':
        return {
          styleInstruction: 'Style: Clean, scholarly imagery with focus on data and research concepts. Use neutral, professional colors.',
          contextDescription: 'Academic research presentation',
          specificGuidelines: 'Emphasize credibility, research methodology, and scientific accuracy.',
          prohibitions: 'NO decorative elements, flashy colors, or commercial imagery.'
        };

      case 'marketing_pitch':
        return {
          styleInstruction: 'Style: Dynamic, engaging visuals with strong visual impact. Use bold colors and modern design.',
          contextDescription: 'Marketing and sales presentation',
          specificGuidelines: 'Create compelling visuals that grab attention and convey value proposition.',
          prohibitions: 'NO boring layouts, academic formality, or outdated design elements.'
        };

      case 'educational_content':
        return {
          styleInstruction: 'Style: Clear, instructional imagery that supports learning. Use organized layouts and helpful visual cues.',
          contextDescription: 'Educational and training content',
          specificGuidelines: 'Prioritize clarity and educational value over decorative elements.',
          prohibitions: 'NO confusing layouts, excessive decoration, or distracting elements.'
        };

      case 'creative_project':
        return {
          styleInstruction: 'Style: Artistic, innovative visuals with creative flair. Experiment with unique perspectives and compositions.',
          contextDescription: 'Creative project showcase',
          specificGuidelines: 'Showcase creativity and artistic vision with unique visual approaches.',
          prohibitions: 'NO conventional corporate imagery or overly conservative design choices.'
        };

      case 'tutorial_guide':
        return {
          styleInstruction: 'Style: Step-by-step friendly visuals with clear guidance. Use helpful annotations and progressive layouts.',
          contextDescription: 'Tutorial and how-to guide',
          specificGuidelines: 'Make it easy to follow with clear visual hierarchy and instructional flow.',
          prohibitions: 'NO complex layouts, ambiguous imagery, or overwhelming visual details.'
        };

      case 'product_demo':
        return {
          styleInstruction: 'Style: Product-focused imagery showcasing features and benefits. Use clean, modern product photography style.',
          contextDescription: 'Product demonstration',
          specificGuidelines: 'Highlight product advantages and user experience clearly.',
          prohibitions: 'NO generic imagery unrelated to the specific product or service.'
        };

      case 'training_material':
        return {
          styleInstruction: 'Style: Professional training imagery with focus on skill development. Use business-appropriate but engaging visuals.',
          contextDescription: 'Corporate training and development',
          specificGuidelines: 'Balance professionalism with engagement for adult learners.',
          prohibitions: 'NO childish elements or overly casual imagery inappropriate for workplace.'
        };

      case 'business_presentation':
      default:
        return {
          styleInstruction: 'Style: Clean, professional imagery appropriate for business contexts. Use modern, trustworthy design elements.',
          contextDescription: 'Business and corporate presentation',
          specificGuidelines: 'Maintain executive-level professionalism while keeping visuals engaging.',
          prohibitions: 'NO overly casual elements, childish imagery, or inappropriate visual styles.'
        };
    }
  }


  /**
   * 📋 Title Slide追加
   * 生成されたコンテンツにTitle Slideを先頭に追加
   */
  private addTitleSlide(content: string, designerStrategy: DesignerStrategy, request: EnhancedSlideRequest): string {
    try {
      let parsed: any;
      
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON Parse Error in addTitleSlide:', parseError);
        console.log('🔧 Attempting JSON repair in addTitleSlide...');
        
        const repairedContent = this.attemptJSONRepair(content);
        if (repairedContent) {
          parsed = JSON.parse(repairedContent);
          console.log('✅ JSON repair successful in addTitleSlide!');
        } else {
          throw parseError; 
        }
      }
      
      if (parsed.slides && Array.isArray(parsed.slides)) {
        console.log('🎬 Adding Title Slide to presentation...');
        
        // Title Slideを生成
        const titleSlide = designerStrategy.generateTitleSlide(request);
        
        // 既存slidesのIDを調整（title slideが先頭に来るため、既存スライドは2番から始まる）
        parsed.slides = parsed.slides.map((slide: any, index: number) => ({
          ...slide,
          id: `slide-${index + 2}`
        }));
        
        // Title Slideを先頭に追加
        parsed.slides.unshift(titleSlide);
        
        // プレゼンテーション全体のタイトルを更新
        parsed.title = titleSlide.title;
        
        console.log(`✅ Title Slide added. Total slides: ${parsed.slides.length}`);
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.warn('Title Slide追加でエラーが発生しました:', error);
      return content; // エラーの場合は元のコンテンツを返す
    }
  }
}

// シングルトンインスタンスをエクスポート
export const slideGenerationFactory = new SlideGenerationFactory();