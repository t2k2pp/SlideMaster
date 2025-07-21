import { getGeminiClient, getAI, getTemperatureForTask, handleGeminiError } from './geminiApiClient';
import { resolveAutoImageSettings } from '../utils/imageConsistency';

// =================================================================
// Gemini Image Generation Service
// =================================================================

export interface ImageGenerationSettings {
  consistencyLevel: 'low' | 'medium' | 'high' | 'auto';
  style: 'realistic' | 'illustration' | 'minimal' | 'corporate' | 'auto';
  characterConsistency: 'none' | 'basic' | 'strict' | 'auto';
  useReferenceImage: boolean;
}

interface ImageModelConfig {
  model: string;
  aspectRatio: string;
  outputMimeType: string;
}

// Image generation models
const IMAGE_MODELS = {
  'imagen-4': 'imagen-4.0-generate-002',
  'imagen-3': 'imagen-3.0-generate-002',
} as const;

/**
 * Get the current image generation model from settings
 */
const getImageGenerationModel = (): keyof typeof IMAGE_MODELS => {
  try {
    // Try to get from app settings
    const settingsJson = localStorage.getItem('slidemaster_app_settings');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      const modelFromSettings = settings?.aiModels?.imageGeneration;
      if (modelFromSettings && modelFromSettings in IMAGE_MODELS) {
        return modelFromSettings as keyof typeof IMAGE_MODELS;
      }
    }
  } catch (error) {
    console.warn('Error reading image generation model from settings:', error);
  }
  
  // Default fallback - using imagen-3 like backup version
  return 'imagen-3';
};

// Note: getAI is now imported from geminiApiClient for consistency

/**
 * Build style prompt based on settings
 */
const buildStylePrompt = (settings: ImageGenerationSettings, purpose: string): string => {
  const styleMap = {
    realistic: 'photorealistic, professional photography style',
    illustration: 'clean vector illustration style, modern design',
    minimal: 'minimalist design, clean lines, simple composition',
    corporate: 'professional business style, corporate aesthetic',
    auto: purpose === 'business_presentation' ? 'professional business style' : 'clean modern style'
  };
  
  return styleMap[settings.style] || styleMap.auto;
};

/**
 * Build consistency prompt for character/object consistency
 */
const buildConsistencyPrompt = (
  settings: ImageGenerationSettings,
  slideIndex: number,
  characterContext: string[],
  referenceImageContext?: string
): string => {
  let prompt = '';
  
  if (settings.characterConsistency !== 'none' && characterContext.length > 0) {
    const consistencyLevel = settings.characterConsistency === 'auto' ? 
      (slideIndex > 0 ? 'medium' : 'low') : settings.characterConsistency;
    
    if (consistencyLevel === 'strict') {
      prompt += `, maintain exact character appearances: ${characterContext.join(', ')}`;
    } else if (consistencyLevel === 'basic') {
      prompt += `, consistent character style: ${characterContext.join(', ')}`;
    }
  }
  
  if (settings.useReferenceImage && referenceImageContext) {
    prompt += `, similar visual style to reference: ${referenceImageContext}`;
  }
  
  return prompt;
};

/**
 * Generate image using Gemini AI
 */
export const generateImage = async (
  prompt: string, 
  imageSettings?: ImageGenerationSettings,
  purpose: string = 'business_presentation',
  slideIndex: number = 0,
  characterContext: string[] = [],
  referenceImageContext?: string,
  userApiKey?: string,
  seed?: number
): Promise<string> => {
  if (!prompt || prompt.trim() === "") {
    return Promise.resolve(`https://placehold.co/1280x720/1a202c/e2e8f0?text=No+Image+Prompt`);
  }

  // Use default settings if none provided
  const settings = imageSettings || {
    consistencyLevel: 'auto',
    style: 'auto',
    characterConsistency: 'auto',
    useReferenceImage: false,
  };

  // Resolve auto settings if needed
  const resolvedSettings = resolveAutoImageSettings(settings, purpose as any, slideIndex);

  try {
    // Build enhanced prompt with consistency and style using resolved settings
    const stylePrompt = buildStylePrompt(resolvedSettings, purpose);
    const consistencyPrompt = buildConsistencyPrompt(resolvedSettings, slideIndex, characterContext, referenceImageContext);
    
    const enhancedPrompt = `${prompt}, ${stylePrompt}, ${consistencyPrompt}, professional presentation quality, high quality, clean design`;

    const ai = getGeminiClient(userApiKey);
    const config: any = {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    };
    
    // Add seed if provided for reproducible image generation
    if (seed !== undefined) {
      config.seed = seed;
    }
    
    // Get the appropriate model
    const imageModel = getImageGenerationModel();
    const apiModelId = IMAGE_MODELS[imageModel];
    
    console.log('Making Imagen API call with:', {
      model: apiModelId,
      prompt: enhancedPrompt,
      config
    });

    const response = await ai.models.generateImages({
      model: apiModelId,
      prompt: enhancedPrompt,
      config,
    });

    console.log('Imagen API response:', response);

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      console.error('No image data in response:', response);
      throw new Error("No image was generated by the API.");
    }
  } catch (error) {
    console.error(`Error generating image for prompt: "${prompt}"`, error);
    throw handleGeminiError(error, 'Image Generation');
  }
};

/**
 * Generate multiple images in batch
 */
export const generateMultipleImages = async (
  prompts: Array<{
    prompt: string;
    settings?: ImageGenerationSettings;
    purpose?: string;
    slideIndex?: number;
    characterContext?: string[];
    referenceImageContext?: string;
    seed?: number;
  }>,
  userApiKey?: string
): Promise<string[]> => {
  try {
    const imagePromises = prompts.map((item, index) => 
      generateImage(
        item.prompt,
        item.settings,
        item.purpose || 'business_presentation',
        item.slideIndex ?? index,
        item.characterContext || [],
        item.referenceImageContext,
        userApiKey,
        item.seed
      )
    );
    
    return await Promise.all(imagePromises);
  } catch (error) {
    throw handleGeminiError(error, 'Multiple Image Generation');
  }
};