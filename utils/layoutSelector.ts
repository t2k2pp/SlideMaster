// =================================================================
// Layout Selection Logic - Restored from backup
// =================================================================

import { PresentationPurpose } from '../types';
import { layoutTemplates } from './layoutTemplates';

/**
 * Calculate if a slide should have an image based on frequency setting
 */
export const calculateImageForSlide = (slideIndex: number, frequency: string): boolean => {
  switch (frequency) {
    case 'every_slide':
      return true;
    case 'every_2_slides':
      return slideIndex % 2 === 0;
    case 'every_3_slides':
      return slideIndex % 3 === 0;
    case 'every_5_slides':
      return slideIndex % 5 === 0;
    case 'sparse':
      return slideIndex % 7 === 0; // Very sparse
    default:
      return true;
  }
};

/**
 * Select the appropriate layout template based on slide position, purpose, and content
 */
export const selectLayoutTemplate = (
  slideIndex: number, 
  totalSlides: number, 
  hasImage: boolean, 
  purpose: PresentationPurpose
): string => {
  if (slideIndex === 0) {
    // Title slide layouts based on purpose
    switch (purpose) {
      case 'storytelling':
        return 'fairy_tale';
      case 'children_content':
        return 'children_picture_book';
      case 'academic_research':
        return 'research_title';
      default:
        return 'title_slide';
    }
  }
  
  if (slideIndex === totalSlides - 1) {
    // Conclusion slide layouts
    return purpose === 'storytelling' ? 'narrative_full' : 'title_and_content';
  }
  
  // Content slide layouts based on purpose
  const layoutSets = {
    storytelling: hasImage 
      ? ['storybook_page', 'fairy_tale', 'narrative_full', 'comic_strip']
      : ['quote_layout', 'content_only'],
    
    children_content: hasImage
      ? ['children_picture_book', 'playful_layout', 'learning_card']
      : ['learning_card', 'content_only'],
    
    academic_research: hasImage
      ? ['academic_content', 'data_focus', 'image_top']
      : ['academic_content', 'two_column'],
    
    business_presentation: hasImage
      ? ['image_right', 'image_left', 'data_focus', 'executive_summary']
      : ['title_and_content', 'executive_summary', 'comparison'],
    
    educational_content: hasImage
      ? ['image_top', 'image_bottom', 'title_and_content']
      : ['title_and_content', 'academic_content'],
    
    tutorial_guide: hasImage
      ? ['image_left', 'image_right', 'tech_showcase']
      : ['title_and_content', 'content_only'],
    
    portfolio_showcase: hasImage
      ? ['split_screen', 'full_bleed_image', 'tech_showcase']
      : ['modern_card', 'title_and_content'],
    
    marketing_pitch: hasImage
      ? ['magazine_cover', 'split_screen', 'modern_card']
      : ['modern_card', 'title_and_content'],
    
    traditional_japanese: hasImage
      ? ['japanese_scroll', 'calligraphy_style']
      : ['japanese_scroll', 'calligraphy_style'],
    
    game_content: hasImage
      ? ['game_text_heavy', 'clue_presentation', 'storybook_page', 'comic_strip']
      : ['game_text_heavy', 'game_choice_page', 'mystery_reveal'],
    
    creative_project: hasImage
      ? ['magazine_cover', 'split_screen', 'tech_showcase']
      : ['modern_card', 'quote_layout'],
    
    digital_signage: hasImage
      ? ['full_bleed_image', 'magazine_cover', 'split_screen']
      : ['section_header', 'modern_card'],
    
    video_storyboard: hasImage
      ? ['storybook_page', 'comic_strip', 'grid_layout']
      : ['title_and_content', 'content_only'],
    
    // Default fallback
    auto: hasImage
      ? ['image_right', 'image_left', 'title_and_content']
      : ['title_and_content', 'content_only']
  };
  
  const layouts = layoutSets[purpose] || layoutSets.auto;
  const selectedLayout = layouts[slideIndex % layouts.length];
  
  // Ensure the selected layout exists in our templates
  return layoutTemplates[selectedLayout] ? selectedLayout : 'title_and_content';
};

/**
 * Get layout template by name
 */
export const getLayoutTemplate = (templateName: string) => {
  return layoutTemplates[templateName] || layoutTemplates.title_and_content;
};