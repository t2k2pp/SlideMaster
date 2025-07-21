import { Presentation, ExportResult } from '../../types';
import { CANVAS_SIZES } from '../../constants';

// =================================================================
// Export Utilities - Common functions for all export formats
// =================================================================

/**
 * Generate safe filename for exports
 */
export const generateFilename = (presentation: Presentation, format: string): string => {
  // Allow Japanese characters, alphanumeric, and common punctuation
  const safeName = presentation.title
    .replace(/[<>:"/\\|?*]/g, '_')  // Replace only illegal file characters
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .trim();
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${safeName}_${timestamp}.${format}`;
};

/**
 * Get high quality export options for html-to-image
 */
export const getHighQualityExportOptions = (width: number, height: number) => ({
  width: width,
  height: height,
  quality: 1.0,
  pixelRatio: 2, // Higher quality
  fetchOptions: {
    mode: 'cors' as RequestMode,
  }
});

/**
 * Get canvas dimensions from presentation
 */
export const getCanvasDimensions = (presentation: Presentation): { width: number; height: number } => {
  const firstSlide = presentation.slides[0];
  if (!firstSlide) {
    throw new Error('No slides found in presentation');
  }

  // Use the aspect ratio to determine proper canvas size from constants
  const canvasSize = CANVAS_SIZES[firstSlide.aspectRatio] || CANVAS_SIZES['16:9'];
  return {
    width: canvasSize.width,
    height: canvasSize.height
  };
};

/**
 * Wait for slide to render
 */
export const waitForSlideRender = (delay: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Get canvas element
 */
export const getCanvasElement = (): HTMLElement => {
  const canvasElement = document.getElementById('slide-canvas-content');
  if (!canvasElement) {
    throw new Error('Canvas element not found');
  }
  return canvasElement;
};

/**
 * Create error result
 */
export const createErrorResult = (error: unknown): ExportResult => ({
  success: false,
  error: error instanceof Error ? error.message : 'Unknown error occurred'
});

/**
 * Create success result
 */
export const createSuccessResult = (filename: string, format: string): ExportResult => ({
  success: true,
  filename,
  format
});

/**
 * Validate presentation for export
 */
export const validatePresentation = (presentation: Presentation): void => {
  if (!presentation) {
    throw new Error('No presentation provided');
  }
  
  if (!presentation.slides || presentation.slides.length === 0) {
    throw new Error('No slides found in presentation');
  }
  
  if (!presentation.title || presentation.title.trim() === '') {
    throw new Error('Presentation title is required for export');
  }
};

/**
 * Get slide aspect ratio
 */
export const getSlideAspectRatio = (presentation: Presentation): string => {
  const firstSlide = presentation.slides[0];
  return firstSlide?.aspectRatio || '16:9';
};

/**
 * Batch process with progress callback
 */
export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (current: number, total: number) => void
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const result = await processor(items[i], i);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }
  
  return results;
};