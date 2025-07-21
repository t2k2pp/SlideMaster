import { PageNumberSettings, PageNumberFormat, TextLayer, Slide } from '../types';

// Avoid circular dependency by defining constants locally if needed
const PAGE_NUMBER_POSITIONS = {
  bottom_center: { x: 45, y: 92, width: 10, height: 6 },
  bottom_right: { x: 85, y: 92, width: 12, height: 6 },
  bottom_left: { x: 3, y: 92, width: 12, height: 6 },
  top_right: { x: 85, y: 2, width: 12, height: 6 },
  top_left: { x: 3, y: 2, width: 12, height: 6 },
};

const PAGE_NUMBER_TEXT_STYLES = {
  none: { display: 'none' },
  simple: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 'normal',
    fontFamily: 'Inter, sans-serif',
  },
  prominent: {
    fontSize: '18px',
    color: '#ffffff',
    fontWeight: 'bold',
    fontFamily: 'Inter, sans-serif',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  subtle: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 'normal',
    fontFamily: 'Inter, sans-serif',
    opacity: 0.7,
  },
};

const PURPOSE_PAGE_NUMBER_CONFIGS: Record<string, Partial<PageNumberSettings>> = {
  game_content: {
    style: 'prominent',
    format: 'number_only',
    position: 'bottom_right',
    showOnTitleSlide: false,
    customPrefix: 'ページ ',
  },
  digital_signage: {
    style: 'none',
    format: 'number_only',
    position: 'bottom_center',
    showOnTitleSlide: false,
  },
  business_presentation: {
    style: 'simple',
    format: 'current_of_total',
    position: 'bottom_center',
    showOnTitleSlide: false,
  },
  educational_content: {
    style: 'simple',
    format: 'current_of_total',
    position: 'bottom_right',
    showOnTitleSlide: false,
  },
  storytelling: {
    style: 'subtle',
    format: 'number_only',
    position: 'bottom_center',
    showOnTitleSlide: false,
  },
  children_content: {
    style: 'simple',
    format: 'number_only',
    position: 'bottom_center',
    showOnTitleSlide: false,
    customPrefix: 'ページ ',
  },
  academic_research: {
    style: 'simple',
    format: 'current_of_total',
    position: 'bottom_center',
    showOnTitleSlide: false,
  },
  tutorial_guide: {
    style: 'simple',
    format: 'current_of_total',
    position: 'bottom_right',
    showOnTitleSlide: false,
    customPrefix: 'Step ',
  },
};

export const DEFAULT_PAGE_NUMBER_SETTINGS: PageNumberSettings = {
  style: 'auto',
  format: 'number_only',
  position: 'bottom_center',
  showOnTitleSlide: false, // User can change this via PageNumberManager
  customPrefix: '',
};

// =================================================================
// Page Number Utilities
// =================================================================

/**
 * Generate page number content based on format settings
 */
export const generatePageNumberContent = (
  currentPage: number,
  totalPages: number,
  format: PageNumberFormat,
  customPrefix: string = ''
): string => {
  switch (format) {
    case 'number_only':
      return `${customPrefix}${currentPage}`;
    case 'current_of_total':
      return `${customPrefix}${currentPage} / ${totalPages}`;
    case 'current_total_separate':
      return `${customPrefix}${currentPage} of ${totalPages}`;
    default:
      return `${currentPage}`;
  }
};

/**
 * Create a page number text layer
 */
export const createPageNumberLayer = (
  slideIndex: number,
  totalSlides: number,
  settings: PageNumberSettings,
  slideId: string
): TextLayer => {
  const position = PAGE_NUMBER_POSITIONS[settings.position];
  const style = PAGE_NUMBER_TEXT_STYLES[settings.style];
  
  // Calculate 1-based page number
  const pageNumber = slideIndex + 1;
  
  const content = generatePageNumberContent(
    pageNumber,
    totalSlides,
    settings.format,
    settings.customPrefix
  );

  return {
    id: `page-number-${slideId}`,
    type: 'text',
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height,
    rotation: 0,
    opacity: 1,
    zIndex: 1000, // High z-index to ensure it's on top
    content,
    fontSize: parseInt(style.fontSize || '14'),
    textStyleId: 'page-number-style',
    textAlign: 'center',
    textColor: style.color as string,
  };
};

/**
 * Determine if page number should be shown on a specific slide
 */
export const shouldShowPageNumber = (
  slideIndex: number,
  settings: PageNumberSettings
): boolean => {
  if (settings.style === 'none') return false;
  if (slideIndex === 0 && !settings.showOnTitleSlide) return false;
  return true;
};

/**
 * Resolve auto settings to actual values based on purpose and slide count
 */
export const resolveAutoPageNumberSettings = (
  settings: PageNumberSettings,
  purpose: string,
  slideCount: number
): PageNumberSettings => {
  if (settings.style !== 'auto') {
    return settings;
  }

  // Get recommended settings for this purpose and slide count
  const recommended = getRecommendedPageNumberSettings(purpose, slideCount);
  
  return {
    ...settings,
    style: recommended.style,
    format: recommended.format,
    position: recommended.position,
    customPrefix: recommended.customPrefix,
  };
};

/**
 * Get recommended page number settings based on presentation purpose and slide count
 */
export const getRecommendedPageNumberSettings = (
  purpose: string,
  slideCount: number
): PageNumberSettings => {
  const baseConfig = PURPOSE_PAGE_NUMBER_CONFIGS[purpose] || {};
  
  // Adjust format based on slide count
  let format: PageNumberFormat = baseConfig.format || 'number_only';
  
  // For longer presentations, show total count
  if (slideCount > 10 && format === 'number_only') {
    format = 'current_of_total';
  }
  
  // For very short presentations (≤ 5 slides), simple numbering is sufficient
  if (slideCount <= 5 && format === 'current_of_total') {
    format = 'number_only';
  }
  
  return {
    style: 'simple',
    position: 'bottom_center',
    showOnTitleSlide: false,
    customPrefix: '',
    ...baseConfig,
    format,
  };
};

/**
 * Add page numbers to all slides in a presentation
 */
export const addPageNumbersToSlides = (
  slides: Slide[],
  settings: PageNumberSettings,
  purpose: string = 'business_presentation'
): Slide[] => {
  // Resolve auto settings first
  const resolvedSettings = resolveAutoPageNumberSettings(settings, purpose, slides.length);
  
  if (resolvedSettings.style === 'none') return slides;
  
  return slides.map((slide, index) => {
    // Remove existing page number layer if it exists
    const layersWithoutPageNumber = slide.layers.filter(
      layer => !layer.id.startsWith('page-number-')
    );
    
    const shouldShow = shouldShowPageNumber(index, resolvedSettings);
    
    if (!shouldShow) {
      return {
        ...slide,
        layers: layersWithoutPageNumber,
      };
    }
    
    const pageNumberLayer = createPageNumberLayer(
      index,
      slides.length,
      resolvedSettings,
      slide.id
    );
    
    return {
      ...slide,
      layers: [...layersWithoutPageNumber, pageNumberLayer],
    };
  });
};

/**
 * Remove page numbers from all slides in a presentation
 */
export const removePageNumbersFromSlides = (slides: Slide[]): Slide[] => {
  return slides.map(slide => ({
    ...slide,
    layers: slide.layers.filter(layer => !layer.id.startsWith('page-number-')),
  }));
};

/**
 * Update page numbers for a specific slide (useful when slides are reordered)
 */
export const updatePageNumberForSlide = (
  slide: Slide,
  newIndex: number,
  totalSlides: number,
  settings: PageNumberSettings
): Slide => {
  // Remove existing page number
  const layersWithoutPageNumber = slide.layers.filter(
    layer => !layer.id.startsWith('page-number-')
  );
  
  const shouldShow = shouldShowPageNumber(newIndex, settings);
  
  if (!shouldShow || settings.style === 'none') {
    return {
      ...slide,
      layers: layersWithoutPageNumber,
    };
  }
  
  const pageNumberLayer = createPageNumberLayer(
    newIndex,
    totalSlides,
    settings,
    slide.id
  );
  
  return {
    ...slide,
    layers: [...layersWithoutPageNumber, pageNumberLayer],
  };
};

/**
 * Batch update page numbers for all slides (efficient for reordering)
 */
export const updateAllPageNumbers = (
  slides: Slide[],
  settings: PageNumberSettings,
  purpose: string = 'business_presentation'
): Slide[] => {
  // Resolve auto settings first
  const resolvedSettings = resolveAutoPageNumberSettings(settings, purpose, slides.length);
  
  if (resolvedSettings.style === 'none') {
    return removePageNumbersFromSlides(slides);
  }
  
  return addPageNumbersToSlides(slides, resolvedSettings, purpose);
};