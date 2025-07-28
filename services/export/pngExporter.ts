import { Presentation, ExportResult } from '../../types';
import { saveAs } from 'file-saver';
import * as htmlToImage from 'html-to-image';
import {
  generateFilename,
  getCanvasDimensions,
  getCanvasElement,
  waitForSlideRender,
  createErrorResult,
  createSuccessResult,
  validatePresentation,
  batchProcess
} from './exportUtils';

// =================================================================
// PNG Export Service - PNG image export functionality
// =================================================================

/**
 * Export current slide as PNG
 */
export const exportAsPNG = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  currentSlideIndex?: number
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Switch to the current slide to capture (or first slide if not specified)
    const slideIndex = currentSlideIndex ?? 0;
    if (onSlideChange) {
      onSlideChange(slideIndex);
      await waitForSlideRender();
    }

    // Capture the canvas with exact dimensions, ignoring transforms
    const dataUrl = await htmlToImage.toPng(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      pixelRatio: 2, // Higher quality
      skipFonts: true, // Skip external fonts to avoid CORS issues
      style: {
        transform: 'none', // Ignore any transforms
        margin: '0',
        padding: '0',
      },
      fetchOptions: {
        mode: 'cors' as RequestMode,
      }
    });
    
    // Convert to blob and download
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const filename = generateFilename(presentation, 'png');
    saveAs(blob, filename);

    return createSuccessResult(filename, 'png');
  } catch (error) {
    console.error('PNG export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export all slides as PNG images
 */
export const exportAllAsPNG = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);
    
    // Process each slide
    const imageBlobs = await batchProcess(
      presentation.slides,
      async (slide, index) => {
        // Switch to the slide
        if (onSlideChange) {
          onSlideChange(index);
          await waitForSlideRender();
        }

        // Capture the slide
        const dataUrl = await htmlToImage.toPng(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          pixelRatio: 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });

        const response = await fetch(dataUrl);
        return response.blob();
      },
      onProgress
    );

    // Create ZIP file with all images
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    imageBlobs.forEach((blob, index) => {
      const slideNumber = String(index + 1).padStart(3, '0');
      zip.file(`slide_${slideNumber}.png`, blob);
    });

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = generateFilename(presentation, 'zip');
    saveAs(zipBlob, filename);

    return createSuccessResult(filename, 'zip');
  } catch (error) {
    console.error('PNG batch export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export specific slide as PNG
 */
export const exportSlideAsPNG = async (
  presentation: Presentation,
  slideIndex: number,
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    if (slideIndex < 0 || slideIndex >= presentation.slides.length) {
      throw new Error(`Invalid slide index: ${slideIndex}`);
    }

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Switch to the specified slide
    if (onSlideChange) {
      onSlideChange(slideIndex);
      await waitForSlideRender();
    }

    // Capture the slide
    const dataUrl = await htmlToImage.toPng(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      pixelRatio: 2,
      skipFonts: true, // Skip external fonts to avoid CORS issues
      style: {
        transform: 'none',
        margin: '0',
        padding: '0',
      },
      fetchOptions: {
        mode: 'cors' as RequestMode,
      }
    });

    // Convert to blob and download
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const slideNumber = String(slideIndex + 1).padStart(3, '0');
    const filename = `${presentation.title}_slide_${slideNumber}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    saveAs(blob, filename);

    return createSuccessResult(filename, 'png');
  } catch (error) {
    console.error('Single slide PNG export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export slides as PNG with custom options
 */
export const exportAsPNGWithOptions = async (
  presentation: Presentation,
  options: {
    slideIndexes?: number[];
    quality?: number;
    pixelRatio?: number;
    backgroundColor?: string;
  },
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const slideIndexes = options.slideIndexes || Array.from({ length: presentation.slides.length }, (_, i) => i);
    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Process specified slides
    const imageBlobs = await batchProcess(
      slideIndexes,
      async (slideIndex, index) => {
        if (slideIndex < 0 || slideIndex >= presentation.slides.length) {
          throw new Error(`Invalid slide index: ${slideIndex}`);
        }

        // Switch to the slide
        if (onSlideChange) {
          onSlideChange(slideIndex);
          await waitForSlideRender();
        }

        // Capture with custom options
        const dataUrl = await htmlToImage.toPng(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: options.quality || 1.0,
          pixelRatio: options.pixelRatio || 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: options.backgroundColor,
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });

        const response = await fetch(dataUrl);
        return response.blob();
      },
      onProgress
    );

    if (slideIndexes.length === 1) {
      // Single slide - download directly
      const slideNumber = String(slideIndexes[0] + 1).padStart(3, '0');
      const filename = `${presentation.title}_slide_${slideNumber}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      saveAs(imageBlobs[0], filename);
      return createSuccessResult(filename, 'png');
    } else {
      // Multiple slides - create ZIP
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      imageBlobs.forEach((blob, index) => {
        const slideNumber = String(slideIndexes[index] + 1).padStart(3, '0');
        zip.file(`slide_${slideNumber}.png`, blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = generateFilename(presentation, 'zip');
      saveAs(zipBlob, filename);
      return createSuccessResult(filename, 'zip');
    }
  } catch (error) {
    console.error('Custom PNG export error:', error);
    return createErrorResult(error);
  }
};