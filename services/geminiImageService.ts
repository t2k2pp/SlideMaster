import { getGeminiClient, getAI, getTemperatureForTask, handleGeminiError } from './geminiApiClient';
import { resolveAutoImageSettings } from '../utils/imageConsistency';
import { aiHistory, calculateEstimatedCost } from './aiInteractionHistoryService';
import { notify } from '../utils/notificationService';
import { handleImageGenerationError } from '../utils/errorHandler';

// =================================================================
// Gemini Image Generation Service
// =================================================================

// Error suppression system to prevent console spam
class ErrorSuppressor {
  private lastErrorMessages: Set<string> = new Set();
  private errorCounts: Map<string, number> = new Map();
  private readonly MAX_SAME_ERROR_LOGS = 1;
  private readonly RESET_INTERVAL = 60000; // 1 minute

  constructor() {
    // Reset error tracking every minute
    setInterval(() => {
      this.lastErrorMessages.clear();
      this.errorCounts.clear();
    }, this.RESET_INTERVAL);
  }

  shouldLogError(errorMessage: string): boolean {
    const count = this.errorCounts.get(errorMessage) || 0;
    this.errorCounts.set(errorMessage, count + 1);

    if (count < this.MAX_SAME_ERROR_LOGS) {
      this.lastErrorMessages.add(errorMessage);
      return true;
    }
    return false;
  }

  getErrorSummary(): string {
    const uniqueErrors = this.errorCounts.size;
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    return `[${totalErrors} total errors, ${uniqueErrors} unique types suppressed to reduce console spam]`;
  }
}

const errorSuppressor = new ErrorSuppressor();

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
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-2.0-flash-preview-image-generation': 'gemini-2.0-flash-preview-image-generation',
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
 * Check if model is a Gemini 2.0 model that supports native image generation
 */
const isGemini2Model = (model: keyof typeof IMAGE_MODELS): boolean => {
  return model.startsWith('gemini-2.0');
};

/**
 * Generate image using Gemini 2.0's native image generation
 */
const generateImageWithGemini2 = async (
  prompt: string,
  userApiKey?: string
): Promise<string> => {
  const ai = getGeminiClient(userApiKey);
  const model = getImageGenerationModel();
  const apiModelId = IMAGE_MODELS[model];
  
  // Only log the first few calls to reduce spam
  if (errorSuppressor.shouldLogError(`gemini2-call-${apiModelId}`)) {
    console.log('Making Gemini 2.0 native image generation call with:', {
      model: apiModelId,
      prompt
    });
  }

  const response = await ai.generateContent({
    model: apiModelId,
    contents: [{
      role: 'user',
      parts: [{ text: `Generate an image: ${prompt}` }]
    }],
  });

  // Extract base64 image data from Gemini 2.0 response
  if (response.response && response.response.candidates) {
    const candidate = response.response.candidates[0];
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/jpeg';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  }
  
  throw new Error("No image was generated by Gemini 2.0.");
};

/**
 * Generate image using Imagen API
 */
const generateImageWithImagen = async (
  prompt: string,
  config: any,
  userApiKey?: string
): Promise<string> => {
  const ai = getGeminiClient(userApiKey);
  const imageModel = getImageGenerationModel();
  const apiModelId = IMAGE_MODELS[imageModel];
  
  // Only log the first few calls to reduce spam
  if (errorSuppressor.shouldLogError(`imagen-call-${apiModelId}`)) {
    console.log('Making Imagen API call with:', {
      model: apiModelId,
      prompt,
      config
    });
  }

  const response = await ai.models.generateImages({
    model: apiModelId,
    prompt,
    config,
  });

  // Only log responses if we haven't seen this error before
  if (errorSuppressor.shouldLogError(`imagen-response-${apiModelId}`)) {
    console.log('Imagen API response:', response);
  }

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } else {
    console.error('No image data in response:', response);
    throw new Error("No image was generated by the API.");
  }
};

/**
 * Get image dimensions from data URL
 */
export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    img.src = dataUrl;
  });
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

  // Start AI interaction history recording
  const interactionId = aiHistory.startInteraction(
    'image_generation',
    'gemini',
    'gemini-2.0-flash', // Default image model
    {
      prompt,
      context: `Purpose: ${purpose}, Slide: ${slideIndex}`,
      settings: {
        imageSettings,
        slideIndex,
        characterContext,
        referenceImageContext,
        seed
      }
    }
  );

  // Show loading notification
  const loadingToastId = notify.imageGeneration('start', 1, 'Gemini');

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

    // Get the appropriate model
    const imageModel = getImageGenerationModel();
    
    // Use native Gemini 2.0 image generation if available
    if (isGemini2Model(imageModel)) {
      return await generateImageWithGemini2(enhancedPrompt, userApiKey);
    } else {
      // Use Imagen API for traditional image models
      const config: any = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      };
      
      // Add seed if provided for reproducible image generation
      if (seed !== undefined) {
        config.seed = seed;
      }
      
      const imageResult = await generateImageWithImagen(enhancedPrompt, config, userApiKey);
      
      // Dismiss loading notification and show success
      notify.dismiss(loadingToastId);
      notify.imageGeneration('success', 1, 'Gemini');
      
      // Record successful completion in AI interaction history
      aiHistory.completeInteraction(
        interactionId,
        {
          content: `Generated image for: ${prompt.substring(0, 100)}...`,
          metadata: {
            contentType: 'image',
            modelUsed: 'gemini-2.0-flash',
            quality: 1.0
          },
          attachments: {
            images: [imageResult]
          }
        },
        calculateEstimatedCost('gemini', 'gemini-2.0-flash', 0, 0, 1, 0)
      );
      
      return imageResult;
    }
  } catch (error) {
    // Dismiss loading notification
    notify.dismiss(loadingToastId);
    
    // Create a normalized error message for deduplication
    const errorString = error instanceof Error ? error.message : String(error);
    const normalizedError = errorString.replace(/prompt: "[^"]*"/, 'prompt: "[REDACTED]"');
    
    // Record error in AI interaction history
    aiHistory.recordError(interactionId, {
      code: 'IMAGE_GENERATION_ERROR',
      message: errorString,
      details: error
    });
    
    // Handle error with improved notification system
    const retryAction = () => generateImage(prompt, imageSettings, purpose, slideIndex, characterContext, referenceImageContext, userApiKey, seed);
    handleImageGenerationError(error, 1, 'Gemini', true, retryAction);
    
    // Only log if this is a new type of error (keep for debugging)
    if (errorSuppressor.shouldLogError(normalizedError)) {
      console.error(`Error generating image for prompt: "${prompt}"`, error);
      console.warn(`🔇 Image generation error suppression active. ${errorSuppressor.getErrorSummary()}`);
    }
    
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
  // Start AI interaction history recording for batch generation
  const interactionId = aiHistory.startInteraction(
    'image_generation',
    'gemini',
    'gemini-2.0-flash',
    {
      prompt: `Batch image generation (${prompts.length} images)`,
      context: `Prompts: ${prompts.map(p => p.prompt.substring(0, 50)).join(', ')}...`,
      settings: {
        batchSize: prompts.length,
        prompts: prompts.map(p => ({ 
          prompt: p.prompt.substring(0, 100), 
          purpose: p.purpose,
          slideIndex: p.slideIndex 
        }))
      }
    }
  );

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
    
    const results = await Promise.all(imagePromises);
    
    // Record successful completion
    aiHistory.completeInteraction(
      interactionId,
      {
        content: `Generated ${results.length} images in batch`,
        metadata: {
          contentType: 'image_batch',
          modelUsed: 'gemini-2.0-flash',
          quality: 1.0
        },
        attachments: {
          images: results
        }
      },
      calculateEstimatedCost('gemini', 'gemini-2.0-flash', 0, 0, results.length, 0)
    );
    
    return results;
  } catch (error) {
    // Record error
    aiHistory.recordError(interactionId, {
      code: 'BATCH_IMAGE_GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown batch generation error',
      details: error
    });
    throw handleGeminiError(error, 'Multiple Image Generation');
  }
};