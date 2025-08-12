// =================================================================
// Academic Visualizer Designer Strategy
// 情報の構造化、均等配置、伝統的フォント
// Philosophy: "Clarity and Accuracy Above All"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';
import { contextIntelligenceResources } from '../../resources/prompts/contextIntelligenceResources';

export class AcademicVisualizerStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Academic Visualizer' as const;
  readonly designerName = 'The Academic Visualizer';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const purposeInstructions = this.getPurposeBasedInstructions(request.purpose);
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);
    const jsonStructureInstructions = this.getJsonStructureInstructions(request);

    let template = contextIntelligenceResources.designerStrategies.academicVisualizer.contentPrompt;
    return template
      .replace(/{topic}/g, request.topic)
      .replace(/{purposeInstructions}/g, purposeInstructions)
      .replace(/{themeInstructions}/g, themeInstructions)
      .replace(/{slideCountInstructions}/g, slideCountInstructions)
      .replace(/{imageInstructions}/g, imageInstructions)
      .replace(/{jsonStructureInstructions}/g, jsonStructureInstructions);
  }

  private buildFallbackContentPrompt(
    request: EnhancedSlideRequest, 
    purposeInstructions: string, 
    themeInstructions: string, 
    slideCountInstructions: string, 
    imageInstructions: string,
    jsonStructureInstructions: string
  ): string {
    return `
トピック: ${request.topic}

【The Academic Visualizer - レイアウト専門】
あなたの専門知識を最大限活用し、「${request.topic}」について最も有用で正確な内容を提供してください。

レイアウト指針:
- 体系的で構造化された情報配置
- 論理的階層による明確な情報組織  
- バランスの取れた視覚的配置
- 情報密度高めの詳細表示

${purposeInstructions}、${themeInstructions}${slideCountInstructions}。
${imageInstructions}

${jsonStructureInstructions}`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const academicConcept = this.extractAcademicConcept(slideContent);
    const visualizationType = this.determineVisualizationType(slideContent);
    
    const styleInstructions = {
      'diagram': 'clean scientific diagram, professional layout, educational',
      'chart': 'clear data visualization, academic style, precise labels',
      'concept': 'conceptual illustration, scholarly presentation, informative',
      'process': 'flowchart style, step-by-step visualization, academic format'
    };

    const baseStyle = styleInstructions[visualizationType] || styleInstructions['diagram'];
    
    return `Create an academic visualization for: ${academicConcept}. 
Style: ${baseStyle}, scholarly presentation, professional quality.
Color palette: academic colors (navy blue #1E3A8A, grey #64748B, white #FFFFFF).
Layout: structured, systematic, clear hierarchy.
Type: ${visualizationType}, educational purpose, research-quality.
No decorative elements, focus on clarity and information accuracy.
Professional typography, clear labeling if needed.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['structured-hierarchy', 'academic-format', 'three-column'],
      imagePositioning: 'supporting' as const,
      textDensity: 'detailed' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Academic Visualizer特有の後処理
    let processed = rawContent;
    
    // 学術的構造の強化
    processed = this.enforceAcademicStructure(processed);
    
    // レイアウト専門のため、内容変更は削除
    
    // 学術的色彩の適用
    processed = this.applyAcademicColors(processed);
    
    // 情報の階層化
    processed = this.structureInformationHierarchy(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private extractAcademicConcept(content: string): string {
    // コンテンツから学術的概念を抽出
    const academicKeywords = content.match(/\b(研究|分析|理論|手法|結果|検証|評価|考察)\b/g);
    const conceptualWords = content.split(/\s+/).slice(0, 4).join(' ');
    
    return academicKeywords ? 
      `${academicKeywords[0]} ${conceptualWords}` : 
      conceptualWords;
  }

  private determineVisualizationType(content: string): 'diagram' | 'chart' | 'concept' | 'process' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('データ') || lowerContent.includes('統計') || lowerContent.includes('%')) {
      return 'chart';
    } else if (lowerContent.includes('プロセス') || lowerContent.includes('手順') || lowerContent.includes('段階')) {
      return 'process';
    } else if (lowerContent.includes('概念') || lowerContent.includes('理論') || lowerContent.includes('モデル')) {
      return 'concept';
    } else {
      return 'diagram';
    }
  }

  private enforceAcademicStructure(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          // 学術的構造の追加
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                // 階層的配置の適用
                const academicLayout = this.calculateAcademicLayout(layerIndex, slide.layers.length);
                Object.assign(layer, academicLayout);
                
                // テキスト配置は左寄せに統一
                layer.textAlign = 'left';
                
                // フォントサイズの学術的階層化（動的調整）
                const layerWidth = academicLayout.width;
                const layerHeight = academicLayout.height;
                layer.fontSize = this.getAcademicFontSize(layerIndex, layer.content, layerWidth, layerHeight);
              }
              return layer;
            });
            
            // 学術的な番号付けスライドタイトルの追加
            if (slide.layers.length > 0 && slide.layers[0].type === 'text') {
              slide.layers[0].content = `${index + 1}. ${slide.layers[0].content}`;
            }
          }
          
          return slide;
        });
        
        // プレゼンテーション全体に学術的メタデータを追加
        if (!parsed.metadata) parsed.metadata = {};
        parsed.metadata.academicStyle = true;
        parsed.metadata.structureType = 'hierarchical';
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }


  private applyAcademicColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      const academicColors = {
        background: '#FEFEFE',    // 純白に近い背景
        primary: '#1E3A8A',       // 学術的な紺
        secondary: '#64748B',     // 上品なグレー
        text: '#1E293B'           // 濃いグレー
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          slide.background = academicColors.background;
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                if (layerIndex === 0) {
                  layer.textColor = academicColors.primary; // タイトル
                } else {
                  layer.textColor = academicColors.text; // 本文
                }
              }
              return layer;
            });
          }
          
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private structureInformationHierarchy(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          if (slide.layers && slide.layers.length > 1) {
            // 情報の構造化マーカーを追加
            slide.layers = slide.layers.map((layer: any, index: number) => {
              if (layer.type === 'text' && index > 0 && layer.content) {
                // Markdown見出し記法（#で始まる）の場合は記号を追加しない
                if (!layer.content.trim().startsWith('#')) {
                  const hierarchyMarker = this.getHierarchyMarker(index);
                  layer.content = `${hierarchyMarker} ${layer.content}`;
                }
              }
              return layer;
            });
          }
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private calculateAcademicLayout(layerIndex: number, totalLayers: number): {
    x: number; y: number; width: number; height: number;
  } {
    const margin = 8;
    const titleHeight = 15;
    const contentHeight = Math.max(10, (75 - titleHeight) / Math.max(1, totalLayers - 1));
    
    switch (layerIndex) {
      case 0: // タイトル
        return { 
          x: margin, 
          y: margin, 
          width: 100 - 2 * margin, 
          height: titleHeight 
        };
      default: // コンテンツ
        const yPosition = margin + titleHeight + 5 + (layerIndex - 1) * contentHeight;
        return { 
          x: margin + 2, 
          y: yPosition, 
          width: 100 - 2 * margin - 4, 
          height: contentHeight 
        };
    }
  }

  private getAcademicFontSize(layerIndex: number, content?: string, width?: number, height?: number): number {
    // 文章量に応じた動的サイズ計算を使用
    if (content && width && height) {
      const optimalSize = this.calculateOptimalFontSize(content, width, height);
      
      // 学術的発表用の調整
      if (layerIndex === 0) {
        return Math.min(optimalSize + 4, 42); // タイトルは学術的に控えめ
      } else {
        return Math.max(optimalSize, 18); // 本文は最低18px（詳細テキスト対応）
      }
    }
    
    // フォールバック（学術発表向けサイズ）
    const sizes = [36, 26, 22, 18]; // より読みやすいサイズに調整
    return sizes[Math.min(layerIndex, sizes.length - 1)];
  }


  private getHierarchyMarker(layerIndex: number): string {
    const markers = ['•', '◦', '▪', '‣'];
    return markers[Math.min(layerIndex - 1, markers.length - 1)];
  }

  /**
   * 物語・創作系コンテンツかどうかを判定（統合分析結果優先）
   */
  private determineStoryContentFromRequest(parsed: any, content: string): boolean {
    // リクエスト情報から統合分析結果を取得
    const isStoryFromAnalysis = this.getStoryContentFromContext(content);
    if (isStoryFromAnalysis !== null) {
      console.log('📚 Using unified analysis result for story detection in Academic Visualizer:', isStoryFromAnalysis);
      return isStoryFromAnalysis;
    }
    
    // フォールバック: 保険処理としてのキーワードマッチング
    console.log('⚠️ Using fallback keyword matching for story detection in Academic Visualizer');
    return this.isStoryContentFallback(parsed);
  }

  /**
   * コンテキストから統合分析の物語判定結果を取得
   */
  private getStoryContentFromContext(content: string): boolean | null {
    try {
      // リクエスト履歴やコンテキストから統合分析結果を取得する試行
      // TODO: より確実な方法で統合分析結果を取得
      return null; // 現時点では利用不可
    } catch {
      return null;
    }
  }

  /**
   * 物語・創作系コンテンツかどうかを判定（保険処理のキーワードマッチング）
   */
  private isStoryContentFallback(parsed: any): boolean {
    if (!parsed || !parsed.title) return false;
    
    const title = parsed.title.toLowerCase();
    const description = (parsed.description || '').toLowerCase();
    
    // 物語系キーワード検出（保険処理）
    const storyKeywords = [
      '物語', '昔話', '童話', 'おとぎ話', '民話', '伝説', '神話',
      '紙芝居', '絵本', '読み聞かせ', 'story', 'tale', 'fairy',
      '桃太郎', 'かぐや姫', 'シンデレラ', '白雪姫'
    ];
    
    // スライド内容からも判定
    let hasStoryContent = false;
    if (parsed.slides && parsed.slides.length > 0) {
      const firstSlideContent = this.extractSlideText(parsed.slides[0]);
      hasStoryContent = firstSlideContent.includes('むかしむかし') || 
                       firstSlideContent.includes('〜心温まる物語〜') ||
                       firstSlideContent.includes('ある日') ||
                       firstSlideContent.includes('昔々');
    }
    
    return storyKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    ) || hasStoryContent;
  }

  /**
   * スライドからテキスト内容を抽出
   */
  private extractSlideText(slide: any): string {
    if (!slide.layers) return '';
    
    return slide.layers
      .filter((layer: any) => layer.type === 'text' && layer.content)
      .map((layer: any) => layer.content)
      .join(' ');
  }
}