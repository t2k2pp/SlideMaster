// =================================================================
// Corporate Strategist Designer Strategy
// ブランド準拠、構造化された清潔感、目的志向配置
// Philosophy: "Trust and Professionalism"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class CorporateStrategistStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Corporate Strategist' as const;
  readonly designerName = 'The Corporate Strategist';

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

【デザイナー: The Corporate Strategist】
哲学: "Trust and Professionalism" - 信頼と専門性を何よりも重視

デザイン原則:
- ブランド準拠: 企業イメージと一貫性のある表現
- 構造化された清潔感: 整理整頓された視覚的秩序
- 目的志向配置: ビジネス目標に直結するレイアウト
- 信頼性重視: 安定感と権威性を演出する表現

ビジネス戦略アプローチ:
1. 明確な価値提案の提示
2. データ駆動の意思決定支援
3. ステークホルダー向け説明責任
4. ROI（投資収益率）の明確化
5. リスクとメリットの客観的評価

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

具体的な要求:
1. 各スライドに明確なビジネス価値を設定
2. 数値やデータを適切に活用
3. 行動を促すCTA（Call To Action）を含める
4. 専門用語は適切に使用し、権威性を演出
5. 結論と推奨事項を明確に提示
6. エグゼクティブサマリー的な簡潔性
${imageInstructions}

レイアウト要求:
- 企業プレゼン標準の構成（タイトル→要点→結論）
- 図表や画像は補完的・説得力強化の役割
- 色彩は企業色を意識（紺、グレー、白を基調）
- フォントは可読性と権威性を両立
- 余白を適切に使用し、洗練された印象を演出

ビジネス表現の指示:
- 「戦略的重要性」「競争優位性」「市場機会」
- 「ROIの向上」「効率化の実現」「リスクの軽減」
- 「推奨事項」「次のステップ」「アクションプラン」
- 「ステークホルダーの皆様」「組織全体として」

数値・データ活用:
- 具体的な数値目標の設定
- 改善率や成長率の明示
- コスト削減効果の定量化
- 市場データや業界トレンドの引用

${this.getJsonStructureInstructions(request)}

注意: 感情的表現よりも論理的・数値的根拠を重視し、経営層や意思決定者に訴求力のあるプレゼンテーションを作成すること。`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const businessConcept = this.extractBusinessConcept(slideContent);
    const corporateStyle = this.determineCorporateImageStyle(slideContent);
    
    const styleInstructions = {
      'executive': 'executive boardroom style, professional photography, corporate setting',
      'data': 'clean data visualization, professional charts, business analytics',
      'strategy': 'strategic concept illustration, business diagrams, professional icons',
      'team': 'professional team collaboration, business meeting, corporate environment'
    };

    const baseStyle = styleInstructions[corporateStyle] || styleInstructions['strategy'];
    
    return `Create a professional corporate image for: ${businessConcept}. 
Style: ${baseStyle}, business-appropriate, executive quality.
Color palette: corporate colors (navy #1E3A8A, charcoal #374151, silver #9CA3AF, white #FFFFFF).
Composition: structured, balanced, professional layout.
Mood: trustworthy, authoritative, competent, strategic.
Quality: high-end corporate presentation standard.
Elements: clean lines, professional typography if needed, business icons.
No decorative elements, focus on business credibility and trust.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['executive-summary', 'corporate-standard', 'data-driven'],
      imagePositioning: 'supporting' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Corporate Strategist特有の後処理
    let processed = rawContent;
    
    // ビジネス構造の強化
    processed = this.enforceBusinessStructure(processed);
    
    // 数値データの追加
    processed = this.enhanceWithBusinessData(processed);
    
    // 企業色の適用
    processed = this.applyCorporateColors(processed);
    
    // CTA（行動喚起）の追加
    processed = this.addCallToAction(processed);
    
    return processed;
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private extractBusinessConcept(content: string): string {
    // コンテンツからビジネス概念を抽出
    const businessKeywords = content.match(/\b(戦略|効率|収益|市場|顧客|競争|成長|投資)\b/g);
    const conceptualWords = content.split(/\s+/).slice(0, 4).join(' ');
    
    return businessKeywords ? 
      `${businessKeywords[0]} ${conceptualWords}` : 
      conceptualWords;
  }

  private determineCorporateImageStyle(content: string): 'executive' | 'data' | 'strategy' | 'team' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('データ') || lowerContent.includes('分析') || lowerContent.includes('%')) {
      return 'data';
    } else if (lowerContent.includes('チーム') || lowerContent.includes('組織') || lowerContent.includes('協力')) {
      return 'team';
    } else if (lowerContent.includes('経営') || lowerContent.includes('役員') || lowerContent.includes('取締役')) {
      return 'executive';
    } else {
      return 'strategy';
    }
  }

  private enforceBusinessStructure(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          // ビジネス構造の適用
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                // 企業標準レイアウトの適用
                const corporateLayout = this.calculateCorporateLayout(layerIndex, slide.layers.length);
                Object.assign(layer, corporateLayout);
                
                // テキスト配置は左寄せに統一（ビジネス標準）
                layer.textAlign = 'left';
                
                // フォントサイズの企業標準階層化（動的調整）
                const layerWidth = corporateLayout.width;
                const layerHeight = corporateLayout.height;
                layer.fontSize = this.getCorporateFontSize(layerIndex, layer.content, layerWidth, layerHeight);
              }
              return layer;
            });
            
            // エグゼクティブサマリー形式のスライドタイトル
            if (slide.layers.length > 0 && slide.layers[0].type === 'text') {
              if (index === 0) {
                slide.layers[0].content = `エグゼクティブサマリー: ${slide.layers[0].content}`;
              } else {
                slide.layers[0].content = `${index}. ${slide.layers[0].content}`;
              }
            }
          }
          
          return slide;
        });
        
        // プレゼンテーション全体に企業メタデータを追加
        if (!parsed.metadata) parsed.metadata = {};
        parsed.metadata.corporateStyle = true;
        parsed.metadata.businessFocused = true;
        parsed.metadata.targetAudience = 'executives';
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private enhanceWithBusinessData(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text' && layer.content) {
                layer.content = this.addBusinessMetrics(layer.content, index);
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

  private applyCorporateColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      const corporateColors = {
        background: '#FAFAFA',    // 清潔な白
        primary: '#1E3A8A',       // 企業ブルー
        secondary: '#374151',     // チャコールグレー
        accent: '#9CA3AF',        // シルバーグレー
        text: '#1F2937'           // ダークグレー
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          slide.background = corporateColors.background;
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                if (layerIndex === 0) {
                  layer.textColor = corporateColors.primary; // タイトル
                } else {
                  layer.textColor = corporateColors.text; // 本文
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

  private addCallToAction(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides && parsed.slides.length > 0) {
        // 最後のスライドにCTAを追加
        const lastSlide = parsed.slides[parsed.slides.length - 1];
        if (lastSlide.layers) {
          const ctaText = this.generateCTA();
          const ctaLayer = {
            id: `cta-layer-${Date.now()}`,
            type: 'text',
            content: ctaText,
            x: 10,
            y: 75,
            width: 80,
            height: 15,
            fontSize: 20,
            textAlign: 'center',
            textColor: '#1E3A8A'
          };
          lastSlide.layers.push(ctaLayer);
        }
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private calculateCorporateLayout(layerIndex: number, totalLayers: number): {
    x: number; y: number; width: number; height: number;
  } {
    const margin = 10;
    const titleHeight = 15;
    const contentHeight = Math.max(12, (70 - titleHeight) / Math.max(1, totalLayers - 1));
    
    switch (layerIndex) {
      case 0: // タイトル
        return { 
          x: margin, 
          y: margin, 
          width: 100 - 2 * margin, 
          height: titleHeight 
        };
      default: // コンテンツ
        const yPosition = margin + titleHeight + 8 + (layerIndex - 1) * contentHeight;
        return { 
          x: margin + 3, 
          y: yPosition, 
          width: 100 - 2 * margin - 6, 
          height: contentHeight 
        };
    }
  }

  private getCorporateFontSize(layerIndex: number, content?: string, width?: number, height?: number): number {
    // 文章量に応じた動的サイズ計算を使用
    if (content && width && height) {
      const optimalSize = this.calculateOptimalFontSize(content, width, height);
      
      // 企業プレゼン用の調整
      if (layerIndex === 0) {
        return Math.min(optimalSize + 6, 44); // タイトルは控えめに大きく
      } else {
        return Math.max(optimalSize, 22); // 本文は最低22pxを確保（可読性重視）
      }
    }
    
    // フォールバック（企業向けに最適化）
    const sizes = [38, 28, 24, 20]; // 企業プレゼン向けサイズ
    return sizes[Math.min(layerIndex, sizes.length - 1)];
  }

  private addBusinessMetrics(text: string, slideIndex: number): string {
    // ビジネス指標の追加例
    const metrics = [
      '（ROI: +25%向上）',
      '（効率化: 30%改善）',
      '（コスト削減: 15%達成）',
      '（売上増: 20%予測）',
      '（生産性: 35%向上）'
    ];
    
    // 適度にメトリクスを追加（全てのテキストではない）
    if (slideIndex > 0 && Math.random() > 0.7) {
      const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
      return `${text} ${randomMetric}`;
    }
    
    return text;
  }

  private generateCTA(): string {
    const ctas = [
      '次のステップ: 戦略実行チームによる詳細検討',
      '推奨事項: 30日以内の試験運用開始',
      'アクションプラン: 各部門での具体的実装計画策定',
      '意思決定事項: 経営会議での承認プロセス開始',
      '今後の展開: ステークホルダー説明会の開催'
    ];
    
    return ctas[Math.floor(Math.random() * ctas.length)];
  }
}