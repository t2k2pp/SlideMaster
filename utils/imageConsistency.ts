import { ImageGenerationSettings, PresentationPurpose, ImageConsistencyLevel, ImageStyle, CharacterConsistency } from '../types';

// =================================================================
// Image Consistency Auto-Resolution Utility
// =================================================================

/**
 * Get recommended image consistency settings based on presentation purpose
 */
export const getRecommendedImageSettings = (
  purpose: PresentationPurpose,
  slideCount: number
): ImageGenerationSettings => {
  switch (purpose) {
    case 'storytelling':
    case 'children_content':
      return {
        consistencyLevel: 'unified',
        style: 'storybook',
        characterConsistency: 'maintain',
        useReferenceImage: true,
        styleDescription: '',
      };

    case 'game_content':
      return {
        consistencyLevel: 'unified',
        style: 'cartoon',
        characterConsistency: 'maintain',
        useReferenceImage: true,
        styleDescription: '',
      };

    case 'educational_content':
    case 'tutorial_guide':
      return {
        consistencyLevel: 'mixed',
        style: 'cartoon',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'business_presentation':
    case 'marketing_pitch':
    case 'product_demo':
      return {
        consistencyLevel: 'mixed',
        style: 'realistic',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'academic_research':
    case 'report_summary':
      return {
        consistencyLevel: 'diverse',
        style: 'minimalist',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'creative_project':
    case 'portfolio_showcase':
      return {
        consistencyLevel: 'diverse',
        style: 'hand_drawn',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'training_material':
      return {
        consistencyLevel: 'mixed',
        style: 'realistic',
        characterConsistency: 'avoid_repeat',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'event_announcement':
    case 'digital_signage':
      return {
        consistencyLevel: 'diverse',
        style: 'realistic',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };

    case 'video_storyboard':
      return {
        consistencyLevel: 'unified',
        style: 'hand_drawn',
        characterConsistency: 'maintain',
        useReferenceImage: true,
        styleDescription: '',
      };

    default: // 'auto' or unknown purpose
      // Default safe settings for general use
      return {
        consistencyLevel: 'mixed',
        style: 'realistic',
        characterConsistency: 'free',
        useReferenceImage: false,
        styleDescription: '',
      };
  }
};

/**
 * Resolve auto settings to concrete values based on purpose
 */
export const resolveAutoImageSettings = (
  settings: ImageGenerationSettings,
  purpose: PresentationPurpose,
  slideCount: number
): ImageGenerationSettings => {
  // If no auto settings, return as is
  if (
    settings.consistencyLevel !== 'auto' &&
    settings.style !== 'auto' &&
    settings.characterConsistency !== 'auto'
  ) {
    return settings;
  }

  // Get recommended settings for this purpose
  const recommended = getRecommendedImageSettings(purpose, slideCount);

  return {
    consistencyLevel: settings.consistencyLevel === 'auto' 
      ? recommended.consistencyLevel 
      : settings.consistencyLevel,
    style: settings.style === 'auto' 
      ? recommended.style 
      : settings.style,
    characterConsistency: settings.characterConsistency === 'auto' 
      ? recommended.characterConsistency 
      : settings.characterConsistency,
    useReferenceImage: settings.useReferenceImage,
    styleDescription: settings.styleDescription,
  };
};

/**
 * Get purpose-specific style descriptions
 */
export const getPurposeStyleDescription = (purpose: PresentationPurpose): string => {
  switch (purpose) {
    case 'storytelling':
      return 'warm, engaging, narrative-focused illustration';
    case 'children_content':
      return 'bright, friendly, age-appropriate cartoon style';
    case 'business_presentation':
      return 'professional, clean, corporate style';
    case 'academic_research':
      return 'scientific, educational, diagram-style illustration';
    case 'game_content':
      return 'dynamic, colorful, game-like artwork';
    case 'creative_project':
      return 'artistic, expressive, creative interpretation';
    default:
      return 'professional presentation style';
  }
};

/**
 * Check if purpose benefits from character consistency
 */
export const purposeNeedsCharacterConsistency = (purpose: PresentationPurpose): boolean => {
  return [
    'storytelling',
    'children_content',
    'game_content',
    'video_storyboard'
  ].includes(purpose);
};

/**
 * Check if purpose benefits from reference images
 */
export const purposeNeedsReferenceImages = (purpose: PresentationPurpose): boolean => {
  return [
    'storytelling',
    'children_content',
    'game_content',
    'video_storyboard'
  ].includes(purpose);
};