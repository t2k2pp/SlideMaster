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
// JPEG Export Service - JPEG image export functionality
// =================================================================

/**
 * Export current slide as JPEG
 */
export const exportAsJPEG = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  quality: number = 0.95
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Switch to the first slide to capture
    if (onSlideChange) {
      onSlideChange(0);
      await waitForSlideRender();
    }

    // Capture the canvas as JPEG
    const dataUrl = await htmlToImage.toJpeg(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      quality: quality,
      pixelRatio: 2,
      skipFonts: true, // Skip external fonts to avoid CORS issues
      backgroundColor: '#ffffff', // White background for JPEG
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
    const filename = generateFilename(presentation, 'jpg');
    saveAs(blob, filename);

    return createSuccessResult(filename, 'jpg');
  } catch (error) {
    console.error('JPEG export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export all slides as JPEG images
 */
export const exportAllAsJPEG = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void,
  quality: number = 0.95
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

        // Capture the slide as JPEG
        const dataUrl = await htmlToImage.toJpeg(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: quality,
          pixelRatio: 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: '#ffffff',
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
      zip.file(`slide_${slideNumber}.jpg`, blob);
    });

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = generateFilename(presentation, 'zip');
    saveAs(zipBlob, filename);

    return createSuccessResult(filename, 'zip');
  } catch (error) {
    console.error('JPEG batch export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export specific slide as JPEG
 */
export const exportSlideAsJPEG = async (
  presentation: Presentation,
  slideIndex: number,
  onSlideChange?: (slideIndex: number) => void,
  quality: number = 0.95
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

    // Capture the slide as JPEG
    const dataUrl = await htmlToImage.toJpeg(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      quality: quality,
      pixelRatio: 2,
      skipFonts: true, // Skip external fonts to avoid CORS issues
      backgroundColor: '#ffffff',
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
    const filename = `${presentation.title}_slide_${slideNumber}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
    saveAs(blob, filename);

    return createSuccessResult(filename, 'jpg');
  } catch (error) {
    console.error('Single slide JPEG export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export slides as JPEG with custom options
 */
export const exportAsJPEGWithOptions = async (
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
        const dataUrl = await htmlToImage.toJpeg(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: options.quality || 0.95,
          pixelRatio: options.pixelRatio || 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: options.backgroundColor || '#ffffff',
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
      const filename = `${presentation.title}_slide_${slideNumber}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      saveAs(imageBlobs[0], filename);
      return createSuccessResult(filename, 'jpg');
    } else {
      // Multiple slides - create ZIP
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      imageBlobs.forEach((blob, index) => {
        const slideNumber = String(slideIndexes[index] + 1).padStart(3, '0');
        zip.file(`slide_${slideNumber}.jpg`, blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = generateFilename(presentation, 'zip');
      saveAs(zipBlob, filename);
      return createSuccessResult(filename, 'zip');
    }
  } catch (error) {
    console.error('Custom JPEG export error:', error);
    return createErrorResult(error);
  }
};