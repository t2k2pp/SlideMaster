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

// デザイナー戦略のインポート
import { LogicalMinimalistStrategy } from './LogicalMinimalistStrategy';
import { EmotionalStorytellerStrategy } from './EmotionalStorytellerStrategy';
import { AcademicVisualizerStrategy } from './AcademicVisualizerStrategy';
import { VividCreatorStrategy } from './VividCreatorStrategy';
import { CorporateStrategistStrategy } from './CorporateStrategistStrategy';
import { AmateurDesignerStrategy } from './AmateurDesignerStrategy';

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
      throw error; // エラーを再スローして上位でハンドリングさせる
    }
  }

  /**
   * デザイナー戦略の初期化
   */
  private initializeStrategies(): void {
    this.designerStrategies = new Map([
      ['logical', new LogicalMinimalistStrategy()],
      ['The Emotional Storyteller', new EmotionalStorytellerStrategy()],
      ['The Academic Visualizer', new AcademicVisualizerStrategy()],
      ['The Vivid Creator', new VividCreatorStrategy()],
      ['The Corporate Strategist', new CorporateStrategistStrategy()],
      ['amateur', new AmateurDesignerStrategy()]
    ]);
  }

  /**
   * メインのスライド生成インターフェース
   */
  async generateSlides(request: EnhancedSlideRequest): Promise<SlideGenerationResult> {
    try {
      // 🎯 Auto項目専用のAI分析システム
      console.log('🔍 Context Intelligence: Analyzing Auto settings only...', request.topic);
      const autoAnalysis = await contextEngine.analyzeAutoSettings(request.topic, request);
      
      // 🚀 Auto分析結果をリクエストに統合
      const intelligentRequest = this.enhanceRequestWithAutoAnalysis(request, autoAnalysis);
      
      console.log('🧠 Auto Analysis Results:', {
        originalTopic: request.topic,
        autoAnalysisResults: autoAnalysis,
        enhancedRequest: {
          designer: intelligentRequest.selectedDesigner,
          purpose: intelligentRequest.purpose,
          theme: intelligentRequest.theme
        }
      });
      
      // 1. 適切なデザイナー戦略を選択（コンテキスト強化済みリクエスト使用）
      const designerStrategy = this.selectDesignerStrategy(intelligentRequest);
      
      // 2. 戦略に基づいてプロンプトを構築
      const enhancedPrompt = designerStrategy.buildContentPrompt(intelligentRequest);
      
      // 3. AI サービスを使用してコンテンツを生成
      const rawContent = await this.generateRawContent(enhancedPrompt, intelligentRequest);
      
      // 4. デザイナー戦略で後処理を実行
      const processedContent = designerStrategy.postProcessContent(rawContent, intelligentRequest);
      
      // 5. 画像生成が必要な場合は処理
      const finalContent = intelligentRequest.includeImages ? 
        await this.enhanceWithImages(processedContent, designerStrategy, intelligentRequest, autoAnalysis) : 
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
            autoAnalysis: autoAnalysis,
            intelligentEnhancements: this.getAutoEnhancements(request, intelligentRequest, autoAnalysis)
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
      purpose: request.purpose,
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

    // 🎭 Priority 1: ストーリーテリング特化検出
    if (this.isStorytellingContent(purpose, theme, topic)) {
      console.log('📚 Storytelling content detected → The Emotional Storyteller');
      return this.designerStrategies.get('The Emotional Storyteller')!;
    }

    // 🏢 Priority 2: ビジネス・企業用途
    if (this.isBusinessContent(purpose, theme, topic)) {
      console.log('💼 Business content detected → The Corporate Strategist');
      return this.designerStrategies.get('The Corporate Strategist')!;
    }
    
    // 🎓 Priority 3: 学術・教育用途
    if (this.isAcademicContent(purpose, theme, topic)) {
      console.log('🎓 Academic content detected → The Academic Visualizer');
      return this.designerStrategies.get('The Academic Visualizer')!;
    }
    
    // 🎨 Priority 4: クリエイティブ・マーケティング用途
    if (this.isCreativeContent(purpose, theme, topic)) {
      console.log('🎨 Creative content detected → The Vivid Creator');
      return this.designerStrategies.get('The Vivid Creator')!;
    }
    
    // 🔧 Priority 5: 技術・論理的コンテンツ
    if (this.isTechnicalContent(purpose, theme, topic)) {
      console.log('🔧 Technical content detected → Logical Minimalist');
      return this.designerStrategies.get('logical')!;
    }

    // 📊 Priority 6: スライド数に基づく最適化
    if (slideCount && slideCount <= 3) {
      console.log('📊 Short presentation → Logical Minimalist (for focus)');
      return this.designerStrategies.get('logical')!;
    }
    
    // 🚀 Priority 7: 大規模プレゼンテーション
    if (slideCount && slideCount >= 15) {
      console.log('📈 Large presentation → The Corporate Strategist (for structure)');
      return this.designerStrategies.get('The Corporate Strategist')!;
    }
    
    // 🎯 Default: Contextual fallback based on most common patterns
    console.log('🎯 Fallback selection → The Vivid Creator (engaging default)');
    return this.designerStrategies.get('The Vivid Creator')!;
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
   * AI サービスを使用した生コンテンツ生成
   */
  private async generateRawContent(
    prompt: string, 
    request: EnhancedSlideRequest
  ): Promise<string> {
    console.log('🚀 Generating raw content with enhanced prompt...');
    console.log('📝 Enhanced Prompt Length:', prompt.length);
    console.log('🎯 Request Details:', {
      topic: request.topic,
      slideCount: request.slideCount,
      designer: request.selectedDesigner,
      purpose: request.purpose,
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
        purpose: request.purpose,
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
    autoAnalysis: any
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
        
        // 🧠 画像用の簡易コンテンツタイプ分析
        const imageContextAnalysis = {
          contentType: autoAnalysis.contentType || 'story',
          emotionalTone: 'emotional',
          suggestedTheme: autoAnalysis.suggestedTheme || 'storytelling',
          suggestedDesigner: autoAnalysis.suggestedDesigner || 'The Emotional Storyteller',
          confidence: 0.9
        };
        
        // 各スライドに対してコンテキスト連動画像生成
        for (let i = 0; i < parsed.slides.length; i++) {
          const slide = parsed.slides[i];
          const slideContent = this.extractSlideTextContent(slide);
          
          // 🎯 Context-Enhanced Image Prompt Generation
          const contextEnhancedImageContext = {
            slideIndex: i,
            totalSlides: parsed.slides.length,
            contextAnalysis: imageContextAnalysis,
            contentType: imageContextAnalysis.contentType,
            emotionalTone: imageContextAnalysis.emotionalTone,
            storyTheme: imageContextAnalysis.suggestedTheme,
            originalTopic: request.topic
          };
          
          // デザイナー戦略 + コンテキスト情報による画像プロンプト
          const baseImagePrompt = designerStrategy.buildImagePrompt(
            slideContent, 
            contextEnhancedImageContext
          );
          
          // 🚀 Revolutionary Context Intelligence Enhancement
          const enhancedImagePrompt = this.enhanceImagePromptWithContext(
            baseImagePrompt,
            imageContextAnalysis,
            slideContent,
            i
          );
          
          // 画像生成メタデータを追加
          if (!slide.metadata) slide.metadata = {};
          slide.metadata.imagePrompt = enhancedImagePrompt;
          slide.metadata.baseImagePrompt = baseImagePrompt;
          slide.metadata.contextIntelligence = {
            contentType: imageContextAnalysis.contentType,
            emotionalTone: imageContextAnalysis.emotionalTone,
            confidence: imageContextAnalysis.confidence,
            reasoning: `Context-driven image for ${imageContextAnalysis.contentType} story`
          };
          slide.metadata.imageGenerated = false; // 実際の画像生成は後続処理で
          
          console.log(`🖼️ Enhanced image prompt for slide ${i + 1}:`, {
            contentType: imageContextAnalysis.contentType,
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
   * リクエストメタデータの抽出
   */
  private extractRequestMetadata(request: EnhancedSlideRequest): any {
    return {
      topic: request.topic,
      slideCount: request.slideCount,
      slideCountMode: request.slideCountMode,
      purpose: request.purpose,
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
   * 🔍 Auto強化記録の生成
   * Auto分析によって何が変更されたかを記録
   */
  private getAutoEnhancements(
    original: EnhancedSlideRequest, 
    enhanced: EnhancedSlideRequest,
    autoAnalysis: any
  ): any {
    const changes: any = {};

    if (autoAnalysis.suggestedDesigner && original.selectedDesigner !== enhanced.selectedDesigner) {
      changes.designerAutoSelected = {
        from: original.selectedDesigner || 'none',
        to: enhanced.selectedDesigner,
        reason: 'Auto AI analysis based on content type'
      };
    }

    if (autoAnalysis.suggestedPurpose && original.purpose !== enhanced.purpose) {
      changes.purposeAutoSelected = {
        from: original.purpose || 'auto',
        to: enhanced.purpose,
        reason: 'Auto AI analysis based on content type'
      };
    }

    if (autoAnalysis.suggestedTheme && original.theme !== enhanced.theme) {
      changes.themeAutoSelected = {
        from: original.theme || 'auto',
        to: enhanced.theme,
        reason: 'Auto AI analysis based on content type'
      };
    }

    if (autoAnalysis.suggestedSlideCount && original.slideCount !== enhanced.slideCount) {
      changes.slideCountAutoSelected = {
        from: original.slideCount || 'auto',
        to: enhanced.slideCount,
        reason: 'Auto AI analysis based on content complexity'
      };
    }

    return changes;
  }

  /**
   * 🎨 Revolutionary Context Intelligence Image Prompt Enhancement
   * Context分析結果を活用した画像プロンプトの強化
   */
  private enhanceImagePromptWithContext(
    baseImagePrompt: string,
    contextAnalysis: any,
    slideContent: string,
    slideIndex: number
  ): string {
    const contextEnhancements = this.getContextualImageEnhancements(contextAnalysis);
    const narrativePosition = this.determineNarrativePosition(slideIndex, contextAnalysis);
    const specificSceneElements = this.extractSceneElements(slideContent, contextAnalysis);
    
    return `
🧠 CONTEXT INTELLIGENCE ENHANCED IMAGE PROMPT:

📖 Story Context: ${contextAnalysis.contentType} (Confidence: ${Math.round(contextAnalysis.confidence * 100)}%)
🎭 Narrative Position: ${narrativePosition}
🎯 Scene Elements: ${specificSceneElements}

${baseImagePrompt}

🚀 CONTEXT INTELLIGENCE ENHANCEMENTS:
${contextEnhancements.styleEnhancement}

🎨 Content-Type Specific Instructions:
${contextEnhancements.contentTypeInstructions}

🌟 Emotional Tone Alignment: ${contextAnalysis.emotionalTone}
${contextEnhancements.emotionalInstructions}

✨ Narrative Flow Integration:
${contextEnhancements.narrativeInstructions}

🎯 CRITICAL CONTEXT REMINDERS:
- This image is for: ${contextAnalysis.contentType} storytelling
- Emotional tone must be: ${contextAnalysis.emotionalTone}  
- Story theme: ${contextAnalysis.suggestedTheme}
- Designer approach: ${contextAnalysis.suggestedDesigner}

🚫 CONTEXT-SPECIFIC PROHIBITIONS:
${contextEnhancements.contextProhibitions}

📐 Final Context Check: Ensure this image perfectly matches "${contextAnalysis.contentType}" storytelling expectations, NOT generic presentation visuals.`;
  }

  /**
   * 🎯 Context-Specific Image Enhancements Generator
   */
  private getContextualImageEnhancements(contextAnalysis: any): {
    styleEnhancement: string;
    contentTypeInstructions: string;
    emotionalInstructions: string;
    narrativeInstructions: string;
    contextProhibitions: string;
  } {
    const contentType = contextAnalysis.contentType;
    const emotionalTone = contextAnalysis.emotionalTone;
    
    switch (contentType) {
      case 'story':
        return {
          styleEnhancement: 'Storybook illustration style with narrative focus, warm and engaging visuals',
          contentTypeInstructions: `
- Create scenes that tell a story visually
- Include characters in meaningful story moments
- Use traditional storytelling visual elements
- Maintain consistency with folk tale or fairy tale aesthetics
- Focus on character emotions and story progression`,
          emotionalInstructions: `
- Emotional tone: ${emotionalTone}
- Create warmth and connection through visual elements
- Use lighting and color to enhance emotional impact
- Show character expressions that match story mood`,
          narrativeInstructions: `
- Position this image within the story's narrative arc
- Ensure visual continuity with story progression
- Include elements that advance the narrative
- Create scenes that readers can emotionally connect with`,
          contextProhibitions: `
- ABSOLUTELY NO business or corporate elements
- NO modern office settings or business people
- NO presentation graphics or text overlays
- NO corporate colors or professional styling
- NO charts, data, or business visualization elements`
        };
        
      case 'business':
        return {
          styleEnhancement: 'Professional corporate imagery with strategic business focus',
          contentTypeInstructions: `
- Professional corporate photography style
- Business-appropriate settings and elements
- Strategic and authoritative visual composition
- Clean, modern business aesthetics`,
          emotionalInstructions: `
- Professional and trustworthy emotional tone
- Convey competence and reliability through visuals
- Use business-appropriate color schemes
- Maintain executive-level sophistication`,
          narrativeInstructions: `
- Support business narrative and messaging
- Include elements that reinforce business objectives
- Create visuals that enhance credibility`,
          contextProhibitions: `
- Avoid overly casual or playful elements
- NO fairy tale or story-like imagery
- NO childish or whimsical visual styles`
        };
        
      default:
        return {
          styleEnhancement: 'Contextually appropriate imagery matching the content theme',
          contentTypeInstructions: 'Create visuals that support the specific content context',
          emotionalInstructions: `Match the ${emotionalTone} emotional tone throughout`,
          narrativeInstructions: 'Support the overall narrative flow and messaging',
          contextProhibitions: 'Avoid elements that conflict with the identified content type'
        };
    }
  }

  /**
   * 🎬 Narrative Position Determination
   */
  private determineNarrativePosition(slideIndex: number, contextAnalysis: any): string {
    const totalSlides = slideIndex + 1; // Rough estimation
    
    if (slideIndex === 0) {
      return 'Opening/Introduction - Set the scene and introduce the story';
    } else if (slideIndex === 1) {
      return 'Setup/Development - Introduce characters and initial situation';
    } else if (slideIndex >= 2 && contextAnalysis.contentType === 'story') {
      return 'Story Development - Show key story moments and character actions';
    } else {
      return `Narrative continuation - Slide ${slideIndex + 1} in the story progression`;
    }
  }

  /**
   * 🎭 Scene Elements Extraction
   */
  private extractSceneElements(slideContent: string, contextAnalysis: any): string {
    if (contextAnalysis.contentType === 'story') {
      // Extract story-specific elements
      const storyKeywords = slideContent.match(/\b(桃太郎|鬼|島|おじいさん|おばあさん|犬|猿|雉|宝物)\b/g);
      if (storyKeywords) {
        return `Story elements: ${storyKeywords.join(', ')}`;
      }
    }
    
    // General scene element extraction
    const sceneWords = slideContent.split(' ').slice(0, 5).join(' ');
    return sceneWords || 'General narrative scene';
  }

  /**
   * 📋 Title Slide追加
   * 生成されたコンテンツにTitle Slideを先頭に追加
   */
  private addTitleSlide(content: string, designerStrategy: DesignerStrategy, request: EnhancedSlideRequest): string {
    try {
      const parsedContent = JSON.parse(content);
      
      if (parsedContent.slides && Array.isArray(parsedContent.slides)) {
        console.log('🎬 Adding Title Slide to presentation...');
        
        // Title Slideを生成
        const titleSlide = designerStrategy.generateTitleSlide(request);
        
        // 既存slidesのIDを調整（title slideが先頭に来るため）
        parsedContent.slides = parsedContent.slides.map((slide: any, index: number) => ({
          ...slide,
          id: slide.id.replace(/slide-(\d+)/, `slide-${index + 1}`)
        }));
        
        // Title Slideを先頭に追加
        parsedContent.slides.unshift(titleSlide);
        
        // プレゼンテーション全体のタイトルを更新
        parsedContent.title = titleSlide.title;
        
        console.log(`✅ Title Slide added. Total slides: ${parsedContent.slides.length}`);
      }
      
      return JSON.stringify(parsedContent, null, 2);
    } catch (error) {
      console.warn('Title Slide追加でエラーが発生しました:', error);
      return content; // エラーの場合は元のコンテンツを返す
    }
  }
}

// シングルトンインスタンスをエクスポート
export const slideGenerationFactory = new SlideGenerationFactory();