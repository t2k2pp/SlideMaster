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
  const prompt = `Analyze the topic "${topic}" and determine the most appropriate presentation purpose.

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
- For traditional children's stories or fairy tales, use 'storytelling'
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

    // Get theme configuration
    const themeConfig = THEME_CONFIGS[request.theme as keyof typeof THEME_CONFIGS] || THEME_CONFIGS.professional;
    
    // Build the generation prompt
    const purposePrompt = getPurposePromptTemplate(request.purpose, request.topic, actualSlideCount, request.includeImages);
    const speakerNotesPrompt = generateSpeakerNotesPrompt(request.speakerNotesSettings);

    const systemPrompt = `You are an expert presentation creator. Generate a comprehensive ${actualSlideCount}-slide presentation.

${purposePrompt}

FORMAT REQUIREMENTS:
- Each slide must have exactly one main heading (slide title)
- Content should be clear, engaging, and well-structured
- Use bullet points, numbered lists, or paragraphs as appropriate
- Ensure logical flow between slides
- Keep text concise but informative

SPEAKER NOTES:
${speakerNotesPrompt}

QUALITY STANDARDS:
- Professional writing and grammar
- Engaging and appropriate content
- Clear visual hierarchy
- Consistent style throughout
- Relevant and purposeful content`;

    const ai = getGeminiClient(userApiKey);
    const response = await ai.models.generateContent({
      model: getTextGenerationModel(),
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ],
      config: {
        temperature: getTemperatureForTask('slide_generation'),
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
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
          required: ['slides']
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
        const slide: Slide = {
          id: `slide-${index + 1}`,
          title: slideData.title || `Slide ${index + 1}`,
          layers: [],
          background: themeConfig.backgroundColor,
          aspectRatio: request.aspectRatio,
          notes: slideData.speakerNotes || '',
        };

        // Add title layer with dynamic font optimization
        const titleFontSettings = getOptimalFontSettings(
          request.theme,
          request.purpose,
          request.aspectRatio,
          'title',
          slideData.title || `Slide ${index + 1}`,
          CANVAS_SIZES[request.aspectRatio].width - 200,
          120
        );
        
        const titleSpacing = getOptimalTextSpacing(titleFontSettings.fontSize);
        const titleAccessibility = ensureAccessibleContrast(
          themeConfig.textColor,
          themeConfig.backgroundColor,
          titleFontSettings.fontSize
        );

        const titleLayer: TextLayer = {
          ...DEFAULT_LAYER_PROPS,
          id: `title-${index + 1}`,
          type: 'text',
          x: 100,
          y: 80,
          width: CANVAS_SIZES[request.aspectRatio].width - 200,
          height: 120,
          content: slideData.title || `Slide ${index + 1}`,
          fontSize: titleFontSettings.fontSize,
          fontFamily: titleFontSettings.fontFamily,
          fontWeight: titleFontSettings.fontWeight,
          textStyleId: 'title',
          textColor: titleAccessibility.color,
          textAlign: 'center',
          zIndex: 1,
          ...(titleAccessibility.textShadow && { textShadow: titleAccessibility.textShadow })
        };
        slide.layers.push(titleLayer);

        // Add content layer with dynamic font optimization
        const contentFontSettings = getOptimalFontSettings(
          request.theme,
          request.purpose,
          request.aspectRatio,
          'body',
          slideData.content || '',
          CANVAS_SIZES[request.aspectRatio].width - 200,
          CANVAS_SIZES[request.aspectRatio].height - 320
        );
        
        const contentSpacing = getOptimalTextSpacing(contentFontSettings.fontSize);
        const contentAccessibility = ensureAccessibleContrast(
          themeConfig.textColor,
          themeConfig.backgroundColor,
          contentFontSettings.fontSize
        );

        const contentLayer: TextLayer = {
          ...DEFAULT_LAYER_PROPS,
          id: `content-${index + 1}`,
          type: 'text',
          x: 100,
          y: 220,
          width: CANVAS_SIZES[request.aspectRatio].width - 200,
          height: CANVAS_SIZES[request.aspectRatio].height - 320,
          content: slideData.content || '',
          fontSize: contentFontSettings.fontSize,
          fontFamily: contentFontSettings.fontFamily,
          fontWeight: contentFontSettings.fontWeight,
          textStyleId: 'body',
          textColor: contentAccessibility.color,
          textAlign: 'left',
          zIndex: 2,
          ...(contentAccessibility.textShadow && { textShadow: contentAccessibility.textShadow })
        };
        slide.layers.push(contentLayer);

        // Generate image if requested and prompt is provided
        if (request.includeImages && slideData.imagePrompt) {
          try {
            const imageData = await generateImage(
              slideData.imagePrompt,
              request.imageSettings,
              request.purpose,
              index,
              [],
              undefined,
              userApiKey
            );

            const imageLayer: ImageLayer = {
              ...DEFAULT_LAYER_PROPS,
              id: `image-${index + 1}`,
              type: 'image',
              x: CANVAS_SIZES[request.aspectRatio].width - 400,
              y: 220,
              width: 300,
              height: 200,
              src: imageData,
              prompt: slideData.imagePrompt || '',
              objectFit: 'cover',
              zIndex: 3
            };
            slide.layers.push(imageLayer);

            // Adjust content layer to make room for image
            contentLayer.width = CANVAS_SIZES[request.aspectRatio].width - 520;
          } catch (imageError) {
            console.warn(`Failed to generate image for slide ${index + 1}:`, imageError);
          }
        }

        return slide;
      })
    );

    // Add page numbers if requested
    const finalSlides = request.pageNumberSettings?.enabled 
      ? addPageNumbersToSlides(slides, request.pageNumberSettings, request.aspectRatio)
      : slides;

    // Create slide source
    const slideSource = {
      id: `source-${Date.now()}`,
      type: 'ai_generated' as const,
      createdAt: new Date(),
      name: request.topic,
      content: JSON.stringify(result),
      metadata: {
        generationMethod: 'ai_auto_generate',
        originalPrompt: request.topic,
        slideCount: actualSlideCount,
        purpose: request.purpose,
        theme: request.theme
      }
    };

    // Create generation history
    const historyItem = {
      method: 'ai_generation' as const,
      timestamp: new Date(),
      sourceId: slideSource.id,
      parameters: {
        topic: request.topic,
        slideCount: actualSlideCount,
        purpose: request.purpose,
        theme: request.theme,
        includeImages: request.includeImages
      }
    };

    // Create version metadata
    const versionMetadata = createVersionMetadata();

    // Create final presentation
    const presentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: request.topic,
      description: `Generated presentation about ${request.topic}`,
      theme: request.theme,
      slides: finalSlides,
      settings: {
        defaultBackground: themeConfig.backgroundColor,
        defaultAspectRatio: request.aspectRatio,
        autoSave: true,
        snapToGrid: true,
        showGrid: false,
        pageNumbers: request.pageNumberSettings || getRecommendedPageNumberSettings(request.purpose, actualSlideCount),
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
      ...DEFAULT_LAYER_PROPS,
      id: `generated-${Date.now()}`,
      x: 100,
      y: 100,
      width: 400,
      height: 200,
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