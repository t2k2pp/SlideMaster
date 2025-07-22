// Note: Type export might have changed in newer versions of @google/genai
// We'll use a fallback approach for schema definitions
import { 
  Presentation, 
  Slide, 
  Layer, 
  TextLayer, 
  ImageLayer, 
  SlideGenerationRequest,
  ElementGenerationRequest,
  AIAssistRequest,
  PresentationTheme,
  SpeakerNotesSettings
} from '../types';
import { 
  THEME_CONFIGS, 
  DEFAULT_LAYER_PROPS, 
  CANVAS_SIZES
} from '../constants';
import { addPageNumbersToSlides, getRecommendedPageNumberSettings } from '../utils/pageNumbers';
import { createVersionMetadata } from '../utils/versionManager';
import { getOptimalFontSettings, getOptimalTextSpacing, ensureAccessibleContrast } from '../utils/fontOptimization';
import { selectLayoutTemplate, calculateImageForSlide, getLayoutTemplate } from '../utils/layoutSelector';
import { createLayersFromTemplate } from '../utils/layerFactory';
import { getGeminiClient, getAI, getTemperatureForTask, handleGeminiError } from './geminiApiClient';
import { generateImage } from './geminiImageService';

// =================================================================
// Gemini Text Generation Service
// =================================================================

// Text generation models
const TEXT_MODELS = {
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro',
} as const;

/**
 * Get the current text generation model from settings
 */
const getTextGenerationModel = (): keyof typeof TEXT_MODELS => {
  try {
    // Try to get from app settings
    const settingsJson = localStorage.getItem('slidemaster_app_settings');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      const modelFromSettings = settings?.aiModels?.textGeneration;
      if (modelFromSettings && modelFromSettings in TEXT_MODELS) {
        return modelFromSettings as keyof typeof TEXT_MODELS;
      }
    }
  } catch (error) {
    console.warn('Error reading text generation model from settings:', error);
  }
  
  // Default fallback
  return 'gemini-2.0-flash-exp';
};

// Note: getAI is now imported from geminiApiClient for consistency

/**
 * Generate speaker notes prompt based on settings
 */
const generateSpeakerNotesPrompt = (settings?: SpeakerNotesSettings): string => {
  if (!settings?.enabled) return 'null';

  const detailLevelPrompts = {
    minimal: 'Brief key points and reminders for the speaker',
    standard: 'Balanced speaker notes with key talking points, explanations, and presenter guidance',
    detailed: 'Comprehensive talk script with full sentences that the presenter can speak naturally'
  };

  const basePrompt = detailLevelPrompts[settings.detailLevel] || detailLevelPrompts.standard;
  
  let additionalInstructions = [];
  
  if (settings.includeTransitionCues) {
    additionalInstructions.push('Include transition cues to the next slide');
  }
  
  if (settings.includeTimingNotes) {
    additionalInstructions.push('Include timing recommendations (e.g., "Spend 2-3 minutes on this slide")');
  }
  
  const languageInstruction = settings.language === 'japanese' ? 'Write in Japanese' :
                            settings.language === 'english' ? 'Write in English' :
                            'Use the same language as the main content';
  
  let fullPrompt = basePrompt;
  if (additionalInstructions.length > 0) {
    fullPrompt += '. ' + additionalInstructions.join('. ');
  }
  fullPrompt += '. ' + languageInstruction;
  
  return fullPrompt;
};

/**
 * Determine optimal slide count for a topic
 */
export const determineOptimalSlideCount = async (topic: string, userApiKey?: string): Promise<number> => {
  // Check for specific slide count requests with flexibility indicators
  const specificPatterns = [
    { pattern: /(?:スライド|ページ).*?(\d+)(?:枚|ページ)(?:程度|くらい|ぐらい|前後)(?:作成|作って|で)/i, flexible: true }, // "スライド3枚程度作成"
    { pattern: /(\d+)(?:枚|ページ)(?:程度|くらい|ぐらい|前後)(?:の)?(?:スライド|ページ)(?:作成|作って|で)/i, flexible: true }, // "3枚程度のスライド作成"
    { pattern: /(\d+)\s*slides?\s*(?:or so|about|around|approximately)(?:\s*(?:作成|作って|で|create))/i, flexible: true }, // "3 slides about"
    { pattern: /(?:about|around|approximately)\s*(\d+)\s*slides?/i, flexible: true }, // "about 3 slides"
    
    { pattern: /(?:スライド|ページ).*?(\d+)(?:枚|ページ)(?:作成|作って|で)/i, flexible: false }, // "スライド3枚作成"
    { pattern: /(\d+)(?:枚|ページ)(?:の)?(?:スライド|ページ)(?:作成|作って|で)/i, flexible: false }, // "3枚のスライド作成"
    { pattern: /(\d+)\s*slides?(?:\s*(?:作成|作って|で|create))/i, flexible: false }, // "3 slides create"
    { pattern: /(?:create|make)\s*(\d+)\s*slides?/i, flexible: false }, // "create 3 slides"
  ];
  
  for (const { pattern, flexible } of specificPatterns) {
    const match = topic.match(pattern);
    if (match) {
      const baseCount = parseInt(match[1]);
      if (baseCount >= 1 && baseCount <= 30) {
        if (flexible) {
          // 「程度」「くらい」などがある場合はAIに参考値として渡す
          console.log(`User requested approximately ${baseCount} slides, letting AI decide within range.`);
          const prompt = `User requested approximately ${baseCount} slides. Choose a number close to ${baseCount} (${Math.max(1, baseCount - 2)} to ${Math.min(30, baseCount + 2)} slides) based on content requirements.`;
          // AIに最終判断を任せるため、ここでは継続してAI判定へ
          break;
        } else {
          console.log(`User explicitly requested exactly ${baseCount} slides, using that number.`);
          return baseCount;
        }
      }
    }
  }
  
  const prompt = `Analyze the topic "${topic}" and determine the optimal number of slides for a comprehensive presentation.

IMPORTANT: 
- If the user explicitly mentioned an exact number of slides (like "3枚", "5 slides"), ALWAYS respect that request and return that exact number.
- If the user mentioned an approximate number (like "3枚程度", "about 5 slides"), use that as a strong preference but adjust slightly if needed for content quality.

ANALYSIS FACTORS:
- Topic complexity and depth
- Amount of information to cover
- Logical flow and structure
- Audience engagement and attention span
- Time constraints (assume 20-30 minutes presentation)
- User's explicit or approximate requirements (highest priority)

SLIDE COUNT GUIDELINES:
- Simple topics: 5-8 slides
- Medium complexity: 8-12 slides
- Complex topics: 12-20 slides
- Very complex topics: 20-30 slides
- Maximum recommended: 30 slides
- User-specified exact counts: always respected
- User-specified approximate counts: ±1-2 slides flexibility

REQUIREMENTS:
- Return only a number between 1 and 30
- If user specified an exact number, use that exact number
- If user specified an approximate number, stay within ±2 of that number
- Consider that each slide should have 1-2 minutes of content
- Ensure adequate coverage without overwhelming the audience
- Account for introduction, main content, and conclusion

Return the optimal slide count as a single number.`;

  try {
    const ai = getGeminiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            slideCount: { 
              type: "number", 
              description: "Optimal number of slides (5-30)" 
            },
            reasoning: { 
              type: "string", 
              description: "Brief explanation of the slide count decision" 
            }
          },
          required: ['slideCount']
        },
      },
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);

    // Validate and constrain the result
    const slideCount = Math.max(5, Math.min(30, Math.floor(result.slideCount) || 8));
    
    console.log(`AI determined optimal slide count: ${slideCount} for topic: "${topic}"`);
    if (result.reasoning) {
      console.log(`Reasoning: ${result.reasoning}`);
    }
    
    return slideCount;

  } catch (error) {
    console.error("Error determining optimal slide count:", error);
    // Return default fallback
    return 8;
  }
};

/**
 * Get purpose-specific prompt template
 */
const getPurposePromptTemplate = (purpose: string, topic: string, actualSlideCount: number, includeImages: boolean): string => {
  const baseImageInstruction = includeImages ? 'Include relevant images where appropriate' : 'Text-focused content';
  
  switch (purpose) {
    case 'storytelling':
      return `Create an engaging storytelling presentation about "${topic}". This should be a narrative-driven slideshow that tells a complete story.

STORYTELLING REQUIREMENTS:
- Slide 1: Title slide with story title and setting introduction
- Slides 2-${actualSlideCount - 1}: Story progression with clear narrative arc (beginning, middle, climax, resolution)
- Slide ${actualSlideCount}: Story conclusion and moral/message
- Use vivid, descriptive language suitable for storytelling
- Include dialogue, character descriptions, and scene setting
- Focus on emotional engagement and narrative flow
- ${baseImageInstruction} that enhance the story`;

    case 'children_content':
      return `Create a fun and educational presentation for children about "${topic}". Use simple language, bright concepts, and engaging content.

CHILDREN'S CONTENT REQUIREMENTS:
- Slide 1: Colorful title slide with friendly introduction
- Slides 2-${actualSlideCount - 1}: Educational content with simple explanations, fun facts, and interactive elements
- Slide ${actualSlideCount}: Summary with encouraging message
- Use simple, age-appropriate language
- Include fun facts, questions, and interactive elements
- Make it colorful, engaging, and educational
- ${baseImageInstruction} that are child-friendly and educational`;

    case 'tutorial_guide':
      return `Create a step-by-step tutorial guide about "${topic}". Focus on clear instructions and practical guidance.

TUTORIAL REQUIREMENTS:
- Slide 1: Title slide with overview of what will be learned
- Slides 2-${actualSlideCount - 1}: Step-by-step instructions with clear, actionable guidance
- Slide ${actualSlideCount}: Summary, tips, and next steps
- Use clear, instructional language
- Include numbered steps, tips, and warnings where relevant
- Focus on practical, actionable content
- ${baseImageInstruction} that illustrate the steps`;

    case 'educational_content':
      return `Create an educational presentation about "${topic}". Focus on learning objectives and knowledge transfer.

EDUCATIONAL REQUIREMENTS:
- Slide 1: Title slide with learning objectives
- Slides 2-${actualSlideCount - 1}: Educational content with explanations, examples, and key concepts
- Slide ${actualSlideCount}: Summary and review questions
- Use clear, educational language
- Include definitions, examples, and explanations
- Focus on knowledge transfer and understanding
- ${baseImageInstruction} that support learning`;

    case 'portfolio_showcase':
      return `Create a portfolio presentation showcasing "${topic}". Focus on displaying work and achievements.

PORTFOLIO REQUIREMENTS:
- Slide 1: Title slide with introduction and overview
- Slides 2-${actualSlideCount - 1}: Showcase of work, projects, and achievements
- Slide ${actualSlideCount}: Contact information and next steps
- Use visual-focused content
- Highlight achievements, skills, and impact
- Include project details and outcomes
- ${baseImageInstruction} that showcase the work`;

    case 'marketing_pitch':
      return `Create a compelling marketing presentation about "${topic}". Focus on persuasion and value proposition.

MARKETING REQUIREMENTS:
- Slide 1: Attention-grabbing title slide
- Slides 2-${actualSlideCount - 1}: Problem, solution, benefits, and proof points
- Slide ${actualSlideCount}: Call to action and next steps
- Use persuasive, benefit-focused language
- Include problem-solution framework
- Focus on value proposition and ROI
- ${baseImageInstruction} that support the pitch`;

    case 'game_content':
      return `Create an interactive game book or gamified content about "${topic}". Focus on player engagement and choice-driven narrative.

GAME CONTENT REQUIREMENTS:
- Slide 1: Game title and setup - introduce the world, characters, and basic premise
- Slides 2-${actualSlideCount - 1}: Interactive story segments with choices, puzzles, or decision points
- Slide ${actualSlideCount}: Resolution or conclusion with multiple possible endings
- Use engaging, immersive language that draws players in
- Include decision points, choices, and consequences
- Create branching narrative elements
- Focus on player agency and interactive elements
- Use second person perspective ("You decide to...", "What will you do?")
- Include clues, puzzles, or challenges appropriate for the target audience
- ${baseImageInstruction} that enhance the story atmosphere and provide visual context
- Balance text-heavy content with occasional visual breaks
- Create suspense and engagement through pacing`;

    case 'business_presentation':
    default:
      return `Create a professional business presentation about "${topic}". Generate exactly ${actualSlideCount} slides with structured content.

BUSINESS REQUIREMENTS:
- Slide 1: Title slide - main topic and subtitle
- Slides 2-${actualSlideCount - 1}: Content slides - key points, explanations, examples
- Slide ${actualSlideCount}: Conclusion/Summary slide
- Use professional, business-appropriate language
- Include data, insights, and strategic thinking
- Focus on value proposition and actionable insights
- ${baseImageInstruction}`;
  }
};

/**
 * Determine optimal purpose for a topic
 */
export const determineOptimalPurpose = async (topic: string, userApiKey?: string): Promise<string> => {
  // Detect language and add appropriate guidance
  const isJapaneseInput = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(topic);
  
  const prompt = `Analyze the topic "${topic}" and determine the most appropriate presentation purpose.

${isJapaneseInput ? `
**重要な判定基準（日本語コンテンツ用）:**
- 「〜の話」「〜の物語」「〜の童話」「〜のお話」「〜を題材にした物語」など → 必ず 'storytelling'
- 「話を作成して」「物語を作って」「童話を書いて」 → 必ず 'storytelling'  
- 「〜から学ぶ」「〜を活用した」「〜をベースにした教材」など → 'educational_content' または 'business_presentation'
- 「〜の分析」「〜をケーススタディとして」「〜から考える戦略」など → 'business_presentation'
- 子供向けに「〜を教える」「〜で学ぼう」など → 'children_content'

**最重要**: 「の話」「を作成」が組み合わさったら99%storytellingです。例外はほぼありません。
` : ''}

AVAILABLE PURPOSES:
- storytelling: For narratives, stories, fairy tales, adventures, traditional storytelling
- children_content: For educational content aimed at children, learning materials
- educational_content: For teaching, learning, academic content for general audiences
- business_presentation: For corporate, professional, business topics
- tutorial_guide: For how-to, step-by-step instructions, manuals
- portfolio_showcase: For displaying work, achievements, projects
- marketing_pitch: For selling, promoting products/services
- academic_research: For research, scientific, scholarly topics
- event_announcement: For events, announcements, news
- training_material: For training, skill development
- product_demo: For product demonstrations, features
- report_summary: For reports, analysis, summaries
- creative_project: For art, creative work, designs
- game_content: For interactive games, game books, choose-your-own-adventure, interactive stories, gamified content
- digital_signage: For displays, signage, information boards
- video_storyboard: For video production, storyboards

SPECIAL CONSIDERATIONS:
- For game books, interactive stories, or choose-your-own-adventure content, use 'game_content'
- CRITICAL: If the request contains phrases like "の話を作成" or "話を作って", it's ALWAYS 'storytelling'
- "桃太郎の話を作成して" = 100% storytelling (NOT business presentation)
- "桃太郎の話" = storytelling, but "桃太郎から学ぶリーダーシップ" = business_presentation
- "童話を題材にしたXXX" depends on what XXX is (analysis=business, story=storytelling, lesson=educational)
- When Japanese users say "の話を作成して" they want a STORY, not business analysis
- Consider target audience age and interactivity level

Return the most appropriate purpose based on the topic content and intent.`;

  try {
    const ai = getGeminiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            purpose: { 
              type: "string", 
              description: "Most appropriate purpose for the topic" 
            },
            reasoning: { 
              type: "string", 
              description: "Brief explanation of the choice" 
            }
          },
          required: ['purpose']
        },
      },
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);
    
    console.log(`AI determined purpose: ${result.purpose} for topic: "${topic}"`);
    if (result.reasoning) {
      console.log(`Reasoning: ${result.reasoning}`);
    }
    
    return result.purpose || 'business_presentation';

  } catch (error) {
    console.error("Error determining optimal purpose:", error);
    
    // Fallback logic: if topic contains story-related terms, default to storytelling
    if (/(?:の話|物語|童話|お話).*(?:作成|作って|書いて)/.test(topic) || 
        /(?:作成|作って|書いて).*(?:の話|物語|童話|お話)/.test(topic)) {
      console.log("Fallback: Detected story creation request, using storytelling");
      return 'storytelling';
    }
    
    return 'business_presentation';
  }
};

/**
 * Determine optimal theme for a topic and purpose
 */
export const determineOptimalTheme = async (topic: string, purpose: string, userApiKey?: string): Promise<string> => {
  const prompt = `Analyze the topic "${topic}" with purpose "${purpose}" and determine the most appropriate presentation theme.

AVAILABLE THEMES: professional, creative, academic, modern, elegant, playful, minimal, dark, colorful, custom

Consider:
- Topic content and context
- Target audience
- Presentation purpose
- Visual appeal and readability
- Professional appropriateness

Return the most suitable theme name.`;

  try {
    const ai = getGeminiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            theme: { 
              type: "string", 
              description: "Most appropriate theme for the topic and purpose" 
            },
            reasoning: { 
              type: "string", 
              description: "Brief explanation of the theme choice" 
            }
          },
          required: ['theme']
        },
      },
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);
    
    console.log(`AI determined theme: ${result.theme} for topic: "${topic}" with purpose: "${purpose}"`);
    if (result.reasoning) {
      console.log(`Reasoning: ${result.reasoning}`);
    }
    
    return result.theme || 'professional';

  } catch (error) {
    console.error("Error determining optimal theme:", error);
    return 'professional';
  }
};

/**
 * Generate a complete presentation
 */
export const generatePresentation = async (request: SlideGenerationRequest, userApiKey?: string): Promise<Presentation> => {
  try {
    console.log('Starting presentation generation with request:', {
      topic: request.topic,
      slideCount: request.slideCount,
      purpose: request.purpose,
      theme: request.theme,
      includeImages: request.includeImages
    });

    // Determine actual slide count
    let actualSlideCount = request.slideCount;
    if (request.autoSlideCount) {
      actualSlideCount = await determineOptimalSlideCount(request.topic, userApiKey);
      console.log(`Auto-determined slide count: ${actualSlideCount}`);
    }
    
    // Determine actual purpose and theme (handle auto selections)
    let actualPurpose = request.purpose;
    let actualTheme = request.theme;
    
    if (request.purpose === 'auto') {
      actualPurpose = await determineOptimalPurpose(request.topic, userApiKey);
      console.log(`Auto-determined purpose: ${actualPurpose}`);
    }
    
    if (request.theme === 'auto') {
      actualTheme = await determineOptimalTheme(request.topic, actualPurpose, userApiKey);
      console.log(`Auto-determined theme: ${actualTheme}`);
    }

    // Get theme configuration using actual theme
    const themeConfig = THEME_CONFIGS[actualTheme as keyof typeof THEME_CONFIGS] || THEME_CONFIGS.professional;
    
    // Build the generation prompt using actual purpose
    const purposePrompt = getPurposePromptTemplate(actualPurpose, request.topic, actualSlideCount, request.includeImages);
    const speakerNotesPrompt = generateSpeakerNotesPrompt(request.speakerNotesSettings);

    // Detect language from topic and prepare language-aware prompt
    const isJapaneseInput = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(request.topic);
    
    // Build the generation prompt using the correctly determined purpose
    const prompt = purposePrompt + `

THEME: ${actualTheme}

${isJapaneseInput ? `
**重要: 日本語で回答してください（画像プロンプトを除く）**
- すべてのスライドタイトル、内容、スピーカーノートを日本語で生成してください
- 日本の文化や文脈に適した内容にしてください
- 自然で読みやすい日本語を使用してください
- ただし、imagePromptは必ず英語で記述してください（画像生成APIが英語を必要とするため）
` : `
**Important: Respond in English**
- Generate all slide titles, content, and speaker notes in English
- Use clear, professional English appropriate for presentations
`}

PRESENTATION NAMING:
- Create a concise, descriptive title that summarizes the main topic
- If the input topic is long text, extract the key concept for the title
- The title should be suitable for display in headers and file names
- Maximum 60 characters for the title

For each slide, provide:
1. title: Clear, engaging slide title
2. content: Main content (bullet points, explanations, key messages)
3. imagePrompt: ${request.includeImages ? 'IMPORTANT: Always provide detailed English description for relevant image (even if content is in Japanese)' : 'null'}
4. notes: ${speakerNotesPrompt !== 'null' ? 'Speaker notes for this slide' : 'null'}

Structure the content logically and ensure smooth flow between slides.`;

    const ai = getGeminiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        temperature: getTemperatureForTask('slide_generation'),
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Presentation title (concise, descriptive summary)" },
            description: { type: "string", description: "Presentation description" },
            slides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Slide title" },
                  content: { type: "string", description: "Main slide content" },
                  speakerNotes: { type: "string", description: "Speaker notes for this slide" },
                  imagePrompt: { type: "string", description: "Prompt for image generation if images are requested" }
                },
                required: ['title', 'content']
              }
            }
          },
          required: ['title', 'description', 'slides']
        }
      }
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);

    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error('Invalid response format: slides array not found');
    }

    // Process slides and generate images if requested
    const slides: Slide[] = await Promise.all(
      result.slides.slice(0, actualSlideCount).map(async (slideData: any, index: number): Promise<Slide> => {
        // Determine if this slide should have an image based on frequency setting
        const shouldHaveImage = request.includeImages && slideData.imagePrompt && slideData.imagePrompt !== 'null' && 
          calculateImageForSlide(index, request.imageFrequency || 'every_slide');
        
        // Select appropriate layout template
        const layoutType = selectLayoutTemplate(index, actualSlideCount, shouldHaveImage, actualPurpose);
        const template = getLayoutTemplate(layoutType);

        const slide: Slide = {
          id: `slide-${index + 1}`,
          title: slideData.title || `Slide ${index + 1}`,
          background: themeConfig.backgroundColor,
          aspectRatio: request.aspectRatio,
          template: index === 0 ? 'title' : index === actualSlideCount - 1 ? 'ending' : 'content',
          notes: slideData.speakerNotes || '',
          layers: [],
        };

        // Create layers from template
        const layers = createLayersFromTemplate(template, {
          title: slideData.title,
          content: slideData.content,
          imagePrompt: slideData.imagePrompt
        }, 0);
        
        // Ensure title layer exists if template defines it
        const hasTitleLayer = layers.some(layer => layer.type === 'text' && (layer as TextLayer).textStyleId === 'title');
        if (template.title && slideData.title && !hasTitleLayer) {
          console.warn(`Title layer missing for slide ${index + 1}, template: ${layoutType}`);
        }

        // Apply theme colors and minimal font optimization to text layers
        for (const layer of layers) {
          if (layer.type === 'text') {
            const textLayer = layer as TextLayer;
            
            // Apply accessibility colors but preserve template font sizes
            const accessibility = ensureAccessibleContrast(
              themeConfig.textColor,
              themeConfig.backgroundColor,
              textLayer.fontSize  // Use template's original fontSize
            );

            // Apply theme styling but preserve layout template sizing
            const elementType = textLayer.textStyleId === 'title' ? 'title' : 'body';
            const fontSettings = getOptimalFontSettings(
              actualTheme,
              actualPurpose,
              request.aspectRatio,
              elementType as any,
              textLayer.content,
              CANVAS_SIZES[request.aspectRatio].width * (textLayer.width / 100),
              CANVAS_SIZES[request.aspectRatio].height * (textLayer.height / 100)
            );

            // Update layer with theme styling but keep template dimensions
            textLayer.fontFamily = fontSettings.fontFamily;
            textLayer.fontWeight = fontSettings.fontWeight;
            textLayer.textColor = accessibility.color;
            // Preserve template fontSize instead of using optimized size
            // textLayer.fontSize = fontSettings.fontSize;  // COMMENTED OUT
            if (accessibility.textShadow) {
              textLayer.textShadow = accessibility.textShadow;
            }
          }
        }

        // Generate images for image layers
        for (const layer of layers) {
          if (layer.type === 'image' && shouldHaveImage) {
            const imageLayer = layer as ImageLayer;
            try {
              const imageData = await generateImage(
                imageLayer.prompt || slideData.imagePrompt || '',
                request.imageGenerationSettings,
                actualPurpose,
                index,
                [],
                undefined,
                userApiKey
              );
              imageLayer.src = imageData;
            } catch (imageError) {
              // Only log first few image generation failures to reduce console spam
              if (index < 2) {
                console.warn(`Failed to generate image for slide ${index + 1}:`, imageError);
                if (index === 1) {
                  console.warn('🔇 Further image generation errors will be suppressed to reduce console noise. Image generation is currently unavailable but presentations will continue to generate successfully.');
                }
              }
              // Keep image layer even if generation failed (preserves prompt for retry)
              // Set placeholder image instead of removing layer
              imageLayer.src = `https://placehold.co/1280x720/1a202c/e2e8f0?text=Image+Generation+Failed`;
            }
          }
        }

        slide.layers = layers;
        return slide;
      })
    );

    // Add page numbers if requested
    const finalSlides = request.pageNumberSettings?.enabled 
      ? addPageNumbersToSlides(slides, request.pageNumberSettings, request.aspectRatio)
      : slides;

    // Create comprehensive slide source with all generation parameters
    const slideSource = {
      id: `source-${Date.now()}`,
      type: 'ai_generated' as const,
      createdAt: new Date(),
      name: request.topic,
      content: JSON.stringify(result),
      metadata: {
        generationMethod: 'ai_auto_generate',
        originalPrompt: request.topic,
        
        // Slide count information
        slideCount: actualSlideCount,
        autoSlideCount: request.autoSlideCount,
        requestedSlideCount: request.slideCount,
        
        // Purpose information (with auto-selected values)
        purpose: actualPurpose,
        originalPurposeRequest: request.purpose,
        purposeAutoSelected: request.purpose === 'auto',
        
        // Theme information (with auto-selected values)
        theme: actualTheme,
        originalThemeRequest: request.theme,
        themeAutoSelected: request.theme === 'auto',
        
        // Image settings
        includeImages: request.includeImages,
        imageFrequency: request.imageFrequency || 'every_slide',
        imageGenerationSettings: request.imageGenerationSettings,
        
        // Layout and format
        aspectRatio: request.aspectRatio,
        
        // Speaker notes settings
        speakerNotesSettings: request.speakerNotesSettings,
        
        // Page numbering
        pageNumberSettings: request.pageNumberSettings,
        
        // Additional context
        context: request.context,
        slideCountMode: request.slideCountMode,
        
        // Detected language
        detectedLanguage: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(request.topic) ? 'japanese' : 'english',
        
        // Generation timestamp and environment
        generatedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    };

    // Create comprehensive generation history
    const historyItem = {
      method: 'ai_generation' as const,
      timestamp: new Date(),
      sourceId: slideSource.id,
      parameters: {
        // Core parameters
        topic: request.topic,
        slideCount: actualSlideCount,
        autoSlideCount: request.autoSlideCount,
        requestedSlideCount: request.slideCount,
        
        // Selected values (including auto-selected)
        purpose: actualPurpose,
        theme: actualTheme,
        originalPurposeRequest: request.purpose,
        originalThemeRequest: request.theme,
        
        // All generation settings
        includeImages: request.includeImages,
        imageFrequency: request.imageFrequency,
        aspectRatio: request.aspectRatio,
        context: request.context,
        slideCountMode: request.slideCountMode,
        speakerNotesEnabled: request.speakerNotesSettings?.enabled || false,
        pageNumbersEnabled: request.pageNumberSettings?.enabled || false,
        
        // Detection results
        detectedLanguage: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(request.topic) ? 'japanese' : 'english'
      }
    };

    // Create version metadata
    const versionMetadata = createVersionMetadata();

    // Create final presentation
    const presentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: result.title || request.topic,
      description: result.description || `Generated presentation about ${request.topic}`,
      theme: actualTheme,
      purpose: actualPurpose,
      slides: finalSlides,
      settings: {
        defaultBackground: themeConfig.backgroundColor,
        defaultAspectRatio: request.aspectRatio,
        autoSave: true,
        snapToGrid: true,
        showGrid: false,
        pageNumbers: request.pageNumberSettings || getRecommendedPageNumberSettings(actualPurpose, actualSlideCount),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: versionMetadata.version,
      createdWith: versionMetadata.createdWith,
      lastModifiedWith: versionMetadata.lastModifiedWith,
      compatibilityNotes: versionMetadata.compatibilityNotes,
      sources: [slideSource],
      generationHistory: [historyItem]
    };

    console.log(`Successfully generated presentation with ${finalSlides.length} slides`);
    return presentation;

  } catch (error) {
    console.error('Error generating presentation:', error);
    throw handleGeminiError(error, 'Presentation Generation');
  }
};

/**
 * Generate individual element
 */
export const generateElement = async (request: ElementGenerationRequest, userApiKey?: string): Promise<Layer> => {
  try {
    const ai = getGeminiClient(userApiKey);
    
    const prompt = `Generate ${request.elementType} content based on: "${request.prompt}"
    
Context: ${request.context || 'General presentation context'}
Style: ${request.style || 'Professional'}

Provide appropriate content for a ${request.elementType} element.`;

    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        temperature: getTemperatureForTask('content_analysis'),
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "Generated content" },
            style: { type: "string", description: "Recommended styling" }
          },
          required: ['content']
        }
      }
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);

    // Create layer based on element type
    const baseLayer = {
      id: `generated-${Date.now()}`,
      x: 10,
      y: 10,
      width: 80,
      height: 20,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
    };

    if (request.elementType === 'text') {
      return {
        ...baseLayer,
        type: 'text',
        content: result.content,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
      } as TextLayer;
    } else if (request.elementType === 'image') {
      const imageData = await generateImage(
        result.content,
        undefined,
        'business_presentation',
        0,
        [],
        undefined,
        userApiKey
      );
      
      return {
        ...baseLayer,
        type: 'image',
        src: imageData,
      } as ImageLayer;
    }

    throw new Error(`Unsupported element type: ${request.elementType}`);

  } catch (error) {
    console.error('Error generating element:', error);
    throw handleGeminiError(error, 'Element Generation');
  }
};

/**
 * Assist with content generation
 */
export const assistWithContent = async (request: AIAssistRequest, userApiKey?: string): Promise<{
  content: string;
  suggestions: string[];
}> => {
  try {
    const ai = getGeminiClient(userApiKey);
    
    const prompt = `${request.assistType} request: "${request.prompt}"
    
Current content: ${request.currentContent || 'None'}
Context: ${request.context || 'General presentation context'}

Provide helpful assistance and suggestions.`;

    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: prompt,
      config: {
        temperature: getTemperatureForTask('content_analysis'),
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "Improved or generated content" },
            suggestions: { 
              type: "array", 
              items: { type: "string" },
              description: "Additional suggestions" 
            }
          },
          required: ['content']
        }
      }
    });

    const jsonText = response.text.trim();
    const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanJsonText);

    return {
      content: result.content || '',
      suggestions: result.suggestions || []
    };

  } catch (error) {
    console.error('Error with content assistance:', error);
    throw handleGeminiError(error, 'Content Assistance');
  }
};

/**
 * Process multiple slides in batch
 */
export const batchProcessSlides = async (
  slides: Slide[],
  operation: string,
  userApiKey?: string
): Promise<Slide[]> => {
  try {
    // This is a placeholder for batch processing logic
    // In a real implementation, you would process slides based on the operation
    console.log(`Batch processing ${slides.length} slides with operation: ${operation}`);
    
    // For now, return the slides unchanged
    return slides;
    
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw handleGeminiError(error, 'Batch Processing');
  }
};