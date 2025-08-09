// =================================================================
// Emotional Storyteller Designer Strategy
// 画像主導配置、物語的展開、情緒的な色彩
// Philosophy: "Every Slide Tells a Story"
// =================================================================

import { BaseDesignerStrategy } from './BaseDesignerStrategy';
import { EnhancedSlideRequest } from './aiServiceInterface';

export class EmotionalStorytellerStrategy extends BaseDesignerStrategy {
  readonly designerId = 'The Emotional Storyteller' as const;
  readonly designerName = 'The Emotional Storyteller';

  buildContentPrompt(request: EnhancedSlideRequest): string {
    const purposeInstructions = this.getPurposeBasedInstructions(request.purpose);
    const themeInstructions = this.getThemeBasedInstructions(request.theme);
    const slideCountInstructions = this.getSlideCountInstructions(
      request.slideCount, 
      request.slideCountMode
    );
    const imageInstructions = this.getImageInstructions(request);

    // 🎯 Revolutionary Story Detection & Specialization
    const storyType = this.detectStoryType(request.topic);
    const storytellingInstructions = this.getStorytellingInstructions(storyType, request.topic);

    return `
トピック: ${request.topic}

【デザイナー: The Emotional Storyteller】
哲学: "Every Slide Tells a Story" - 全てのスライドが物語を紡ぐ

🎭 **革新的ストーリー認識システム検出結果:**
- ストーリータイプ: ${storyType}
- 特化アプローチ: ${storytellingInstructions.approach}

デザイン原則:
- 物語的展開: 起承転結を意識した情報の流れ
- 感情に訴える表現: 共感と感動を呼び起こすコンテンツ
- 画像主導配置: ビジュアルが物語を牽引する構成
- 情緒的な色彩: 温かみと親しみやすさを演出

${storytellingInstructions.specificGuidelines}

コンテンツ作成指示:
${purposeInstructions}、${themeInstructions}${slideCountInstructions}。

🎯 **ストーリー特化要求:**
${storytellingInstructions.contentRequirements}

レイアウト要求:
- 画像を大きく配置（スライドの40-60%を占める）
- テキストは画像を補完する役割
- 色彩は${storytellingInstructions.colorPalette}
- 感情の流れに応じたグラデーション効果

🚨 **絶対禁止事項（特にビジネス要素の排除）:**
- ビジネスマンの画像は絶対に使用禁止
- "PRESENTATION"という文字の画像内表示禁止
- スーツ姿の人物画像の使用禁止
- 会議室やオフィス環境の描写禁止
- グラフや数値データの不適切な使用禁止

✨ **期待される表現:**
${storytellingInstructions.expectedExpressions}

${this.getStorytellingJsonStructure(request, storyType)}

🎯 **最重要指示:** ${storytellingInstructions.criticalInstruction}`;
  }

  buildImagePrompt(slideContent: string, imageContext: any): string {
    const emotionalTone = this.detectEmotionalTone(slideContent);
    const storyElement = this.extractStoryElement(slideContent);
    
    // 🎯 Revolutionary Story-Specific Image Generation
    const storyType = this.detectStoryTypeFromContent(slideContent);
    const storyImageInstructions = this.getStoryImageInstructions(storyType);
    
    const styleInstructions = {
      'warm': 'warm lighting, soft colors, emotional atmosphere',
      'inspiring': 'uplifting composition, bright colors, hopeful mood',
      'empathetic': 'human-centered, relatable scenes, connection',
      'dramatic': 'dynamic composition, contrast, powerful impact'
    };

    const baseStyle = styleInstructions[emotionalTone] || styleInstructions['warm'];
    
    // 🎭 Character Consistency Instructions (especially for Momotarō)
    const characterConsistencyInstructions = this.getCharacterConsistencyInstructions(slideContent);

    return `🎭 Create a ${storyImageInstructions.imageType} image for: ${storyElement}

🎨 Visual Style: ${storyImageInstructions.visualStyle}
📚 Story Context: ${baseStyle}, storytelling composition, ${storyImageInstructions.mood}
🌈 Color Palette: ${storyImageInstructions.colorPalette}
🎯 Composition: ${storyImageInstructions.composition}

✨ Expected Elements: ${storyImageInstructions.expectedElements}

${characterConsistencyInstructions}

🚫 ABSOLUTELY FORBIDDEN:
- NO businessmen or business people
- NO office settings or conference rooms  
- NO suits or formal business attire
- NO text overlay especially "PRESENTATION"
- NO corporate logos or business graphics
- NO charts, graphs, or data visualizations
- NO modern technology or computers
- NO business handshakes or meetings

🎯 Focus: Pure visual storytelling that matches the narrative context.
📖 Remember: This is for ${storyType} storytelling, not business presentation.`;
  }

  getLayoutStrategy() {
    return {
      preferredLayouts: ['image-dominant', 'hero-image', 'story-flow'],
      imagePositioning: 'dominant' as const,
      textDensity: 'balanced' as const
    };
  }

  postProcessContent(rawContent: string, request: EnhancedSlideRequest): string {
    // Emotional Storyteller特有の後処理
    let processed = rawContent;
    
    // 物語構造の強化
    processed = this.enhanceNarrativeStructure(processed);
    
    // 感情表現の追加
    processed = this.addEmotionalExpressions(processed);
    
    // 色彩の調整
    processed = this.applyEmotionalColors(processed);
    
    return processed;
  }

  /**
   * 🎯 Revolutionary Storytelling JSON Structure
   * ストーリー専用の魅力的なレイアウト構造を生成
   */
  private getStorytellingJsonStructure(request?: any, storyType?: string): string {
    const aspectRatio = request?.aspectRatio || '16:9';
    
    // ストーリータイプ別の具体例を提供
    const exampleContent = this.getStorytellingExample(storyType || 'folk_tale');
    
    return `
結果はJSON形式で以下の構造で出力してください：

🎭 **ストーリーテリング特化レイアウト例:**
${exampleContent}

📖 **一般的なJSON構造:**
{
  "title": "物語のタイトル（温かみのある表現で）",
  "description": "物語の魅力を伝える説明",
  "slides": [
    {
      "id": "slide-1",
      "title": "物語のタイトル",
      "layers": [
        {
          "id": "main-title",
          "type": "text",
          "content": "📚 桃太郎〜心温まる昔話〜",
          "x": 5,
          "y": 15,
          "width": 90,
          "height": 20,
          "fontSize": 42,
          "textAlign": "center",
          "textColor": "#E67E22"
        },
        {
          "id": "story-image",
          "type": "image",
          "src": "",
          "alt": "[画像：山奥の美しい村で、縁側に座って微笑むおじいさんとおばあさん]",
          "x": 55,
          "y": 35,
          "width": 40,
          "height": 30
        },
        {
          "id": "opening-text",
          "type": "text", 
          "content": "むかしむかし、ある山奥の小さな村に、心優しいおじいさんとおばあさんが仲良く暮らしていました。二人は毎日、お互いを思いやり、村の人々からも愛されていました。",
          "x": 5,
          "y": 40,
          "width": 45,
          "height": 40,
          "fontSize": 26,
          "textAlign": "left",
          "textColor": "#2C3E50"
        }
      ],
      "background": "#FFF8F0",
      "aspectRatio": "${aspectRatio}",
      "notes": "物語の始まり - 聴衆の心を物語の世界へ導く"
    }
  ]
}

🎨 **重要なレイアウト原則:**
- タイトルは感情を込めた表現（「📚 桃太郎〜心温まる昔話〜」など）
- 本文は物語調で、読み手の感情に訴える
- 画像は物語の場面を視覚的に表現
- 色彩は温かみのある配色
- フォントサイズは読みやすさを重視

**重要：画像について**
- imageレイヤーの"src"フィールドには画像URLを含めないでください  
- "src": ""として空文字列にしてください
- プレースホルダーとして[画像：◯◯]のようなテキストを"alt"に記載してください
- ストーリーの場面を表現する説明的なalt属性を付ける`;
  }

  /**
   * 🎭 Story Type Examples
   */
  private getStorytellingExample(storyType: string): string {
    switch (storyType) {
      case 'folk_tale':
        return `
{
  "title": "桃太郎〜勇気と仲間の絆〜",
  "slides": [
    {
      "title": "むかしむかしの物語",
      "layers": [
        {
          "type": "text",
          "content": "🌸 桃太郎〜心温まる昔話〜",
          "fontSize": 44,
          "textColor": "#E67E22",
          "x": 5, "y": 10, "width": 90, "height": 15
        },
        {
          "type": "text", 
          "content": "むかしむかし、ある山奥の美しい村で、心優しいおじいさんとおばあさんが静かに暮らしていました。",
          "fontSize": 30,
          "x": 8, "y": 35, "width": 84, "height": 30
        }
      ]
    }
  ]
}`;
      
      default:
        return '物語に適したレイアウトを作成してください。';
    }
  }

  // =================================================================
  // 🎭 Revolutionary Story Intelligence Methods
  // =================================================================

  /**
   * 🎯 Revolutionary Story Type Detection
   * トピックから具体的なストーリータイプを自動識別
   */
  private detectStoryType(topic: string): 'folk_tale' | 'fairy_tale' | 'personal_story' | 'business_story' | 'historical_tale' | 'modern_story' {
    const topicLower = topic.toLowerCase();

    // 昔話・民話パターン
    if (topicLower.includes('桃太郎') || topicLower.includes('浦島太郎') || 
        topicLower.includes('竹取物語') || topicLower.includes('昔話') || 
        topicLower.includes('民話') || topicLower.includes('むかしむかし')) {
      return 'folk_tale';
    }

    // 童話・おとぎ話パターン
    if (topicLower.includes('シンデレラ') || topicLower.includes('白雪姫') || 
        topicLower.includes('童話') || topicLower.includes('おとぎ話') ||
        topicLower.includes('プリンセス') || topicLower.includes('王子')) {
      return 'fairy_tale';
    }

    // 体験談・個人ストーリーパターン
    if (topicLower.includes('体験') || topicLower.includes('経験') || 
        topicLower.includes('思い出') || topicLower.includes('私の')) {
      return 'personal_story';
    }

    // 歴史・伝説パターン
    if (topicLower.includes('歴史') || topicLower.includes('伝説') || 
        topicLower.includes('武将') || topicLower.includes('戦国')) {
      return 'historical_tale';
    }

    // ビジネスストーリーパターン
    if (topicLower.includes('成功') || topicLower.includes('起業') || 
        topicLower.includes('チャレンジ') || topicLower.includes('プロジェクト')) {
      return 'business_story';
    }

    return 'modern_story'; // デフォルト
  }

  /**
   * 🚀 Revolutionary Storytelling Instructions Generator
   * ストーリータイプに特化した詳細指示を生成
   */
  private getStorytellingInstructions(storyType: string, topic: string): {
    approach: string;
    specificGuidelines: string;
    contentRequirements: string;
    colorPalette: string;
    expectedExpressions: string;
    criticalInstruction: string;
  } {
    switch (storyType) {
      case 'folk_tale':
        return {
          approach: '日本の昔話・民話特化',
          specificGuidelines: `
昔話特化ストーリーテリング手法:
1. 「むかしむかし」で始まる伝統的な語り口
2. 教訓や道徳を含む展開
3. 善悪がはっきりした登場人物
4. 自然や動物との関わりを重視
5. 「めでたしめでたし」的な結末

昔話の視覚表現原則:
- 絵本風のイラスト調
- 日本の自然風景（山、川、村）
- 伝統的な服装の人物
- 温かみのある手描き風
- パステル調の優しい色合い`,
          contentRequirements: `
1. ストーリーの起承転結を明確に構成
2. 登場人物の心境変化を丁寧に描写
3. 教訓やメッセージを自然に織り込む
4. 物語の各場面を1スライド1シーンで展開
5. 読み手が物語に入り込める語りかけ
6. 昔話らしい「〜でした」「〜ました」調`,
          colorPalette: '和風の温かい色合い（桜色#FFB6C1、若草色#9ACD32、空色#87CEEB）',
          expectedExpressions: `
- 「むかしむかし、あるところに...」
- 「心優しい○○が...」  
- 「困っている人を見て、心を痛めた...」
- 「勇気を振り絞って...」
- 「そして皆、幸せに暮らしました」`,
          criticalInstruction: `昔話は絵本のような温かみと教訓性を持つこと。ビジネス要素を一切排除し、純粋な物語体験を提供すること。`
        };

      case 'fairy_tale':
        return {
          approach: '童話・おとぎ話特化',
          specificGuidelines: `
童話特化ストーリーテリング手法:
1. 魔法と夢に満ちた世界観
2. 美しいプリンセスや勇敢な王子
3. 困難を乗り越える成長物語
4. ファンタジー要素の効果的活用
5. 愛と勇気がテーマの展開`,
          contentRequirements: `
1. 魔法的で夢のある展開
2. キャラクターの成長と変化
3. 困難に立ち向かう勇気の描写
4. 愛や友情の大切さを表現
5. ハッピーエンドへの希望ある展開`,
          colorPalette: 'ファンタジー調の鮮やかな色合い（ロイヤルブルー、ゴールド、パープル）',
          expectedExpressions: `
- 「遠い国の美しいお城で...」
- 「魔法の力が...」
- 「真実の愛が...」
- 「勇気ある行動が...」
- 「そして永遠の幸せを手に入れました」`,
          criticalInstruction: `童話は魔法と夢に満ちた世界を表現し、現実的な要素を排除すること。`
        };

      default:
        return {
          approach: '一般的ストーリーテリング',
          specificGuidelines: `
一般ストーリーテリング手法:
1. 感情に訴える展開
2. 共感できる登場人物
3. 困難と克服の物語構造
4. 学びや気づきを含む内容
5. 読み手の心に残るメッセージ`,
          contentRequirements: `
1. 感情的なつながりを重視
2. 具体的なエピソードを交える
3. 読み手との共通体験を活用
4. 希望や勇気を与える展開
5. 行動を促すメッセージ`,
          colorPalette: '暖色系（オレンジ、黄色、ピンク）',
          expectedExpressions: `
- 「私たちの心に響く...」
- 「感動的な体験が...」
- 「共に歩んでいく...」
- 「希望を持って...」
- 「素晴らしい未来へ向かって」`,
          criticalInstruction: `感情的な共感と希望を中心とした温かみのあるストーリーを作成すること。`
        };
    }
  }

  /**
   * 🎭 Universal Character Consistency Instructions
   * 汎用的なキャラクター一貫性のための指示システム
   */
  private getCharacterConsistencyInstructions(content: string): string {
    // ストーリータイプに基づく汎用的なキャラクター一貫性指示
    const storyType = this.detectStoryTypeFromContent(content);
    
    switch (storyType) {
      case 'Japanese folk tale':
        return `
🎭 **CHARACTER CONSISTENCY FOR FOLK TALES:**
- Maintain consistent character appearance throughout all scenes
- Traditional Japanese clothing appropriate to the historical period
- Consistent facial features, hair styles, and body proportions
- Age-appropriate character designs (children as children, adults as adults)
- Traditional illustration style matching folk tale aesthetics
- Characters should be recognizable across all slides
- Avoid modern elements that break historical continuity`;

      case 'fairy tale':
        return `
🎭 **CHARACTER CONSISTENCY FOR FAIRY TALES:**
- Consistent magical character designs throughout the story
- Maintain same clothing, accessories, and distinctive features
- Fantasy elements should remain consistent (wings, magical items, etc.)
- Age and appearance consistency for all characters
- Storybook illustration style with consistent art direction`;

      default:
        return `
🎭 **UNIVERSAL CHARACTER CONSISTENCY:**
- Maintain consistent character appearance across all slides
- Same clothing style, colors, and proportions for each character
- Recognizable facial features and expressions
- Consistent age representation throughout the story
- Coherent visual style that supports story continuity
- Characters should be identifiable in different scenes and situations`;
    }
  }

  /**
   * 🎯 Story Type Detection for Image Generation
   * コンテンツからストーリータイプを検出（画像生成用）
   */
  private detectStoryTypeFromContent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('桃太郎') || lowerContent.includes('昔話') || lowerContent.includes('むかし')) {
      return 'Japanese folk tale';
    } else if (lowerContent.includes('プリンセス') || lowerContent.includes('王子') || lowerContent.includes('魔法')) {
      return 'fairy tale';
    } else if (lowerContent.includes('体験') || lowerContent.includes('私') || lowerContent.includes('経験')) {
      return 'personal story';
    } else if (lowerContent.includes('歴史') || lowerContent.includes('伝説')) {
      return 'historical tale';
    } else {
      return 'emotional story';
    }
  }

  /**
   * 🚀 Story-Specific Image Generation Instructions
   * ストーリータイプに特化した画像生成指示
   */
  private getStoryImageInstructions(storyType: string): {
    imageType: string;
    visualStyle: string;
    mood: string;
    colorPalette: string;
    composition: string;
    expectedElements: string;
  } {
    switch (storyType) {
      case 'Japanese folk tale':
        return {
          imageType: 'traditional Japanese storybook illustration',
          visualStyle: 'watercolor painting style, hand-drawn illustration, traditional Japanese art',
          mood: 'nostalgic, gentle, heartwarming',
          colorPalette: 'soft pastels with Japanese traditional colors (cherry blossom pink, bamboo green, sky blue)',
          composition: 'peaceful natural settings with traditional architecture, mountains, rivers, or village scenes',
          expectedElements: 'traditional Japanese clothing (kimono, hakama), natural landscapes, animals, simple village life, seasonal elements'
        };
      
      case 'fairy tale':
        return {
          imageType: 'magical fairy tale illustration',
          visualStyle: 'fantasy art, dreamy illustration, storybook style',
          mood: 'magical, enchanting, hopeful',
          colorPalette: 'rich fantasy colors (royal blue, gold, purple, emerald)',
          composition: 'castles, magical forests, or fantasy landscapes',
          expectedElements: 'fantasy characters, magical elements, beautiful natural settings, light effects'
        };
        
      case 'personal story':
        return {
          imageType: 'heartfelt personal moment illustration',
          visualStyle: 'warm realistic style, emotional portraiture',
          mood: 'intimate, personal, touching',
          colorPalette: 'warm earth tones (golden hour lighting, soft browns, warm whites)',
          composition: 'close personal scenes, everyday life moments',
          expectedElements: 'human connections, personal spaces, meaningful objects, emotional expressions'
        };
        
      case 'historical tale':
        return {
          imageType: 'historical period illustration',
          visualStyle: 'classical painting style, historical accuracy',
          mood: 'dignified, epic, timeless',
          colorPalette: 'classical art colors (deep blues, golds, earth tones)',
          composition: 'historical settings, period architecture',
          expectedElements: 'period-appropriate clothing, historical architecture, cultural elements'
        };
        
      default:
        return {
          imageType: 'emotional storytelling illustration',
          visualStyle: 'warm illustration style, narrative art',
          mood: 'emotionally engaging, story-focused',
          colorPalette: 'warm, inviting colors (sunset oranges, gentle yellows, soft blues)',
          composition: 'story-driven scenes that support the narrative',
          expectedElements: 'characters in meaningful interactions, settings that support the story mood'
        };
    }
  }

  // =================================================================
  // プライベートメソッド
  // =================================================================

  private detectEmotionalTone(content: string): 'warm' | 'inspiring' | 'empathetic' | 'dramatic' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('挑戦') || lowerContent.includes('夢') || lowerContent.includes('未来')) {
      return 'inspiring';
    } else if (lowerContent.includes('気持ち') || lowerContent.includes('心') || lowerContent.includes('体験')) {
      return 'empathetic';
    } else if (lowerContent.includes('変化') || lowerContent.includes('革命') || lowerContent.includes('衝撃')) {
      return 'dramatic';
    } else {
      return 'warm';
    }
  }

  private extractStoryElement(content: string): string {
    // コンテンツから物語の要素を抽出
    const sentences = content.split(/[。．！？]/);
    const keyElement = sentences.find(s => 
      s.includes('物語') || s.includes('体験') || s.includes('エピソード') || s.includes('例')
    );
    
    return keyElement || sentences[0] || content.substring(0, 50);
  }

  private enhanceNarrativeStructure(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides && parsed.slides.length > 1) {
        // 物語構造の要素を各スライドに追加
        const narrativeElements = this.createNarrativeFlow(parsed.slides.length);
        
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          const narrativeRole = narrativeElements[index];
          
          // スライドのメタデータに物語的役割を追加
          if (!slide.metadata) slide.metadata = {};
          slide.metadata.narrativeRole = narrativeRole;
          
          // 物語的つなぎ言葉を追加
          if (slide.layers && index > 0) {
            const transitionPhrase = this.getTransitionPhrase(narrativeRole);
            if (transitionPhrase && slide.layers[0] && slide.layers[0].type === 'text') {
              slide.layers[0].content = `${transitionPhrase} ${slide.layers[0].content}`;
            }
          }
          
          return slide;
        });
      }
      
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private addEmotionalExpressions(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any) => {
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any) => {
              if (layer.type === 'text' && layer.content) {
                // 感情的表現の追加
                layer.content = this.enrichWithEmotionalLanguage(layer.content);
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

  private applyEmotionalColors(content: string): string {
    try {
      const parsed = JSON.parse(content);
      
      const emotionalColors = {
        background: '#FFF8F0', // 温かみのある白
        primary: '#E67E22',     // 温かいオレンジ
        secondary: '#F4D03F',   // 優しい黄色
        accent: '#E8B4B8'       // 柔らかいピンク
      };
      
      if (parsed.slides) {
        parsed.slides = parsed.slides.map((slide: any, index: number) => {
          // 背景色の設定
          slide.background = emotionalColors.background;
          
          if (slide.layers) {
            slide.layers = slide.layers.map((layer: any, layerIndex: number) => {
              if (layer.type === 'text') {
                // テキスト色の設定
                if (layerIndex === 0) {
                  layer.textColor = emotionalColors.primary; // タイトル
                } else {
                  layer.textColor = '#2C3E50'; // 読みやすいダークグレー
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

  private createNarrativeFlow(slideCount: number): string[] {
    const basicFlow = ['opening', 'development', 'climax', 'resolution'];
    
    if (slideCount <= 4) {
      return basicFlow.slice(0, slideCount);
    } else {
      // より長い物語の場合は展開部を拡張
      const expanded = [
        'opening',
        'setup',
        'development1',
        'development2',
        'climax',
        'falling_action',
        'resolution'
      ];
      return expanded.slice(0, slideCount);
    }
  }

  private getTransitionPhrase(narrativeRole: string): string {
    const transitions = {
      'setup': 'まず、',
      'development1': 'そして、',
      'development2': 'さらに、',
      'climax': 'ここで重要なのは',
      'falling_action': 'その結果、',
      'resolution': '最終的に、'
    };
    
    return transitions[narrativeRole] || '';
  }

  private enrichWithEmotionalLanguage(text: string): string {
    // 感情的な表現を追加する辞書
    const emotionalEnhancements = [
      { pattern: /([。．])/, replacement: '$1 心に響く' },
      { pattern: /重要/, replacement: '心に刻んでほしい' },
      { pattern: /効果/, replacement: '素晴らしい効果' },
      { pattern: /結果/, replacement: '感動的な結果' }
    ];
    
    let enriched = text;
    
    // 過度にならないよう、1つだけ適用
    const randomEnhancement = emotionalEnhancements[Math.floor(Math.random() * emotionalEnhancements.length)];
    enriched = enriched.replace(randomEnhancement.pattern, randomEnhancement.replacement);
    
    return enriched;
  }

  /**
   * 🎭 ストーリーテリング特化のSpeaker Notes生成
   */
  protected buildNotesForSlide(title: string, content: string, slideIndex: number, request: EnhancedSlideRequest): string {
    const topic = request.topic.toLowerCase();
    const isJapaneseFolkTale = topic.includes('桃太郎') || topic.includes('昔話') || topic.includes('童話');
    
    if (slideIndex === 0) {
      // オープニングスライド用
      if (isJapaneseFolkTale) {
        return `【物語の始まり】
${title}の物語を語ります。聴衆を物語の世界に引き込むため、ゆっくりと、感情を込めて話しかけてください。

語りのポイント:
• 「むかしむかし...」から始めて、温かみのある口調で
• 聴衆の目を見ながら、まるで語りかけるように
• 物語への期待感を高める間の取り方を意識

内容: ${content.substring(0, 100)}...
推奨時間: 2-3分`;
      } else {
        return `【ストーリー導入】
${title}について、物語性を持たせて語ります。聴衆の感情に訴えかけるよう、体験談や具体例を交えて話してください。

内容: ${content.substring(0, 100)}...
発表時間: 2-3分
語り口: 感情豊かに、親しみやすく`;
      }
    } else {
      // 展開スライド用
      if (isJapaneseFolkTale) {
        return `【物語の展開 - ${title}】
この場面では物語の重要な転換点を表現します。登場人物の感情や行動を具体的に描写してください。

語りのポイント:
• 場面の変化を声のトーンで表現
• 登場人物になりきって感情を込める
• 聴衆が場面を想像できるよう、具体的に描写

内容: ${content.substring(0, 120)}...
推奨時間: 1.5-2分`;
      } else {
        return `【${title}】
この内容を体験談や具体例として語ります。聴衆が共感できるよう、感情的なつながりを重視してください。

要点: ${content.substring(0, 150)}...
語り方: ストーリーテリングの手法を使って、感動や驚きを演出
推奨時間: 1.5-2分`;
      }
    }
  }

  /**
   * 🎭 ストーリーテリング特化のTitle Slide構築
   */
  protected buildTitleSlideContent(request: EnhancedSlideRequest): any[] {
    const mainTitle = this.extractMainTitle(request.topic);
    const topic = request.topic.toLowerCase();
    const isJapaneseFolkTale = topic.includes('桃太郎') || topic.includes('昔話') || topic.includes('童話');
    
    if (isJapaneseFolkTale) {
      return [
        {
          "id": "title-layer-1",
          "type": "text", 
          "content": `📚 ${mainTitle}`,
          "x": 10,
          "y": 20,
          "width": 80,
          "height": 20,
          "fontSize": 52,
          "textAlign": "center",
          "textColor": "#E67E22",
          "fontWeight": "bold",
          "rotation": 0,
          "opacity": 1,
          "zIndex": 1
        },
        {
          "id": "title-layer-2",
          "type": "text",
          "content": "〜心温まる物語〜",
          "x": 10,
          "y": 45,
          "width": 80,
          "height": 10,
          "fontSize": 28,
          "textAlign": "center",
          "textColor": "#D35400",
          "rotation": 0,
          "opacity": 0.9,
          "zIndex": 2
        },
        {
          "id": "title-layer-3",
          "type": "text",
          "content": `語り手：${new Date().toLocaleDateString('ja-JP')}`,
          "x": 10,
          "y": 75,
          "width": 80,
          "height": 10,
          "fontSize": 20,
          "textAlign": "center",
          "textColor": "#85929E",
          "rotation": 0,
          "opacity": 0.7,
          "zIndex": 3
        }
      ];
    } else {
      return [
        {
          "id": "title-layer-1",
          "type": "text",
          "content": `🌟 ${mainTitle}`,
          "x": 10,
          "y": 25,
          "width": 80,
          "height": 25,
          "fontSize": 48,
          "textAlign": "center", 
          "textColor": "#E74C3C",
          "fontWeight": "bold",
          "rotation": 0,
          "opacity": 1,
          "zIndex": 1
        },
        {
          "id": "title-layer-2",
          "type": "text",
          "content": `〜体験と感動の物語〜\n\n${new Date().toLocaleDateString('ja-JP')}`,
          "x": 10,
          "y": 65,
          "width": 80,
          "height": 20,
          "fontSize": 22,
          "textAlign": "center",
          "textColor": "#C0392B",
          "rotation": 0,
          "opacity": 0.8,
          "zIndex": 2
        }
      ];
    }
  }

  /**
   * 🎨 ストーリーテリング用Title Slide背景
   */
  protected getTitleSlideBackground(): string {
    return "#FFF8F0"; // 温かみのあるクリーム色
  }

  /**
   * 📝 ストーリーテリング特化のTitle Slide Notes
   */
  protected buildTitleSlideNotes(request: EnhancedSlideRequest): string {
    const topic = request.topic.toLowerCase();
    const isJapaneseFolkTale = topic.includes('桃太郎') || topic.includes('昔話') || topic.includes('童話');
    
    if (isJapaneseFolkTale) {
      return `【物語の始まり】
${this.extractMainTitle(request.topic)}の物語を語り始めます。

語りの準備:
• 聴衆と温かい眼差しで接する
• 「今日は皆さんと一緒に、心温まる物語を共有したいと思います」
• 物語の世界への招待を意識した導入

語りのポイント:
• ゆっくりと、感情を込めて
• 聴衆を物語の世界に引き込む雰囲気作り
• 「むかしむかし...」という伝統的な始まりへの期待感を高める

推奨時間: 2-3分
注意点: 物語への期待感と親しみやすい雰囲気の両立`;
    } else {
      return `【ストーリーテリング開始】
${this.extractMainTitle(request.topic)}について、物語として語ります。

発表の準備:
• 聴衆との感情的なつながりを重視
• 体験談や具体例を通じた共感の創出
• ストーリーテリングによる印象的な展開の予告

語りのスタイル:
• 感情豊かで親しみやすいトーン
• 聴衆が主人公になったような感覚を演出
• 単なる情報伝達ではなく、体験の共有を意識

推奨時間: 2-3分
注意点: 感情的な訴求力と内容の信頼性のバランス`;
    }
  }
}