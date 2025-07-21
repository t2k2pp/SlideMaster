// =================================================================
// Gemini Service - Main entry point (refactored)
// This file now acts as a re-export hub for the split services
// =================================================================

// Re-export API client utilities
export {
  setApiKey,
  getCurrentApiKey,
  isApiKeySet,
  getGeminiClient,
  getFileManager,
  getTemperatureForTask,
  handleGeminiError,
  AI_TEMPERATURE_DEFAULTS,
  type AITask
} from './geminiApiClient';

// Re-export image generation services
export {
  generateImage,
  generateMultipleImages,
  type ImageGenerationSettings
} from './geminiImageService';

// Re-export text generation services
export {
  determineOptimalSlideCount,
  determineOptimalPurpose,
  determineOptimalTheme,
  generatePresentation,
  generateElement,
  assistWithContent,
  batchProcessSlides
} from './geminiTextService';

// Re-export video analysis services
export {
  convertVideoToBase64,
  extractTimelineFromMarkdown,
  timestampToSeconds,
  extractFrameFromVideo,
  isFrameSuitableForSlide,
  findMissingTimestamps,
  analyzeVideoWithGemini,
  generateSlidesFromVideo
} from './geminiVideoService';

// =================================================================
// Legacy compatibility exports
// =================================================================

// Maintain backwards compatibility for existing imports
// These functions are now imported from the appropriate service files
import { setApiKey as _setApiKey } from './geminiApiClient';
import { generateImage as _generateImage } from './geminiImageService';
import { generatePresentation as _generatePresentation } from './geminiTextService';
import { analyzeVideoWithGemini as _analyzeVideo } from './geminiVideoService';

// Export legacy function names if needed
export const setGeminiApiKey = _setApiKey;
export const generateAIImage = _generateImage;
export const createPresentation = _generatePresentation;
export const analyzeVideo = _analyzeVideo;