// =================================================================
// Academic Visualizer Designer Strategy
// 情報の構造化、均等配置、伝統的フォント
// Philosophy: "Clarity and Accuracy Above All"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

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

    return `
トピック: ${request.topic}

【デザイナー: The Academic Visualizer】
哲学: "Clarity and Accuracy Above All" - 明確性と正確性が何よりも重要

デザイン原則:
- 情報の構造化: 論理的階層による明確な情報組織
- 均等配置: バランスの取れた視覚的配置
- 伝統的フォント: 可読性と権威性を重視
- 客観的表現: 感情的でない、事実に基づく記述

学術的アプローチ:
1. 明確な論点の設定
2. 根拠に基づく論証
3. 系統的な情報整理
4. 客観的な結論導出
5. 参照可能な情報源の重視

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

具体的な要求:
1. 各スライドに明確な論点を1つ設定
2. 情報の階層を数値化・記号化して明確化
3. 専門用語は適切に使用し、必要に応じて定義を併記
4. 客観的で検証可能な表現を優先
5. データや事実に基づく論証を重視
6. 引用や出典の形式を意識した構成
${imageInstructions}

レイアウト要求:
- 情報の重要度に応じた階層的配置
- 図表や画像は説明的・補完的な役割
- テキストの均等配置を重視
- 色彩は控えめで学術的（紺、グレー、白を基調）
- フォントサイズは情報の重要度を明確に反映

学術的表現の指示:
- 「〜について検討する」「〜を分析する」
- 「データによると」「研究結果では」
- 「以下に示すように」「図表○○に見られるように」
- 「結論として」「要約すると」

${this.getJsonStructureInstructions(request)}

注意: 感情的表現を避け、事実と論理に基づく客観的で信頼性の高いプレゼンテーションを作成すること。`;
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
    
    // 専門用語の適正化
    processed = this.enhanceAcademicLanguage(processed);
    
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

  private enhanceAcademicLanguage(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text' && layer.content) {
                layer.content = this.convertToAcademicLanguage(layer.content);
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

  private convertToAcademicLanguage(text: string): string {
    // 学術的表現への変換辞書
    const conversions = [
      { from: /です$/, to: 'である' },
      { from: /ます$/, to: 'する' },
      { from: /わかります/, to: '明らかである' },
      { from: /大切/, to: '重要' },
      { from: /いいこと/, to: '有効性' },
      { from: /問題/, to: '課題' },
      { from: /答え/, to: '解答' }
    ];
    
    let academic = text;
    
    // 1-2個の変換のみ適用（過度な変換を避ける）
    const randomConversions = conversions.slice(0, 2);
    randomConversions.forEach(conversion => {
      academic = academic.replace(conversion.from, conversion.to);
    });
    
    return academic;
  }

  private getHierarchyMarker(layerIndex: number): string {
    const markers = ['•', '◦', '▪', '‣'];
    return markers[Math.min(layerIndex - 1, markers.length - 1)];
  }
}