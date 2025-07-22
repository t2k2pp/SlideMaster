import { Presentation, ExportResult, TextLayer, ImageLayer } from '../../types';
import PptxGenJS from 'pptxgenjs';
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
// PowerPoint Export Service - PPTX format export functionality
// =================================================================

/**
 * Export presentation as PowerPoint (PPTX)
 */
export const exportAsPPTX = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Calculate aspect ratio and size for PPTX (in inches)
    const aspectRatio = canvasWidth / canvasHeight;
    const pptxWidth = 13.33; // Standard widescreen width in inches
    const pptxHeight = pptxWidth / aspectRatio;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM', width: pptxWidth, height: pptxHeight });
    pptx.layout = 'CUSTOM';

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = pptx.addSlide();
      const slideData = presentation.slides[i];

      // Switch to the slide we want to capture
      if (onSlideChange) {
        onSlideChange(i);
        await waitForSlideRender();
      }

      // Capture canvas with exact dimensions, ignoring transforms
      const dataUrl = await htmlToImage.toPng(canvasElement, {
        width: canvasWidth,
        height: canvasHeight,
        quality: 1.0,
        pixelRatio: 1, // Use 1:1 ratio for exact sizing
        skipFonts: true, // Skip embedding external fonts to avoid CORS issues
        style: {
          transform: 'none', // Ignore any transforms
          margin: '0',
          padding: '0',
        },
        fetchOptions: {
          mode: 'cors' as RequestMode,
        }
      });
      
      // Add slide content as image
      slide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });

      // Add speaker notes if present
      if (slideData.speakerNotes && slideData.speakerNotes.trim()) {
        slide.addNotes(slideData.speakerNotes);
      }
    }

    const filename = generateFilename(presentation, 'pptx');
    await pptx.writeFile({ fileName: filename });

    return createSuccessResult(filename, 'pptx');
  } catch (error) {
    console.error('PPTX export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export presentation as PowerPoint with structured content
 */
export const exportAsPPTXStructured = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Calculate aspect ratio and size for PPTX (in inches)
    const aspectRatio = canvasWidth / canvasHeight;
    const pptxWidth = 13.33; // Standard widescreen width in inches
    const pptxHeight = pptxWidth / aspectRatio;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM', width: pptxWidth, height: pptxHeight });
    pptx.layout = 'CUSTOM';

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = pptx.addSlide();
      const slideData = presentation.slides[i];

      // Set slide background
      if (slideData.backgroundColor) {
        slide.background = { color: slideData.backgroundColor };
      }

      // Add each layer as structured content
      for (const layer of slideData.layers) {
        const xPercent = (layer.x / canvasWidth) * 100;
        const yPercent = (layer.y / canvasHeight) * 100;
        const wPercent = (layer.width / canvasWidth) * 100;
        const hPercent = (layer.height / canvasHeight) * 100;

        if (layer.type === 'text') {
          const textLayer = layer as TextLayer;
          slide.addText(textLayer.content, {
            x: `${xPercent}%`,
            y: `${yPercent}%`,
            w: `${wPercent}%`,
            h: `${hPercent}%`,
            fontSize: textLayer.fontSize,
            fontFace: textLayer.fontFamily,
            color: textLayer.color,
            align: textLayer.textAlign as any,
            valign: 'top',
            bold: textLayer.fontWeight === 'bold',
            italic: textLayer.fontStyle === 'italic',
          });
        } else if (layer.type === 'image') {
          const imageLayer = layer as ImageLayer;
          if (imageLayer.src) {
            slide.addImage({
              data: imageLayer.src,
              x: `${xPercent}%`,
              y: `${yPercent}%`,
              w: `${wPercent}%`,
              h: `${hPercent}%`,
            });
          }
        }
      }

      // Add speaker notes if present
      if (slideData.speakerNotes && slideData.speakerNotes.trim()) {
        slide.addNotes(slideData.speakerNotes);
      }
    }

    const filename = generateFilename(presentation, 'pptx');
    await pptx.writeFile({ fileName: filename });

    return createSuccessResult(filename, 'pptx');
  } catch (error) {
    console.error('Structured PPTX export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export specific slides as PowerPoint
 */
export const exportSlidesAsPPTX = async (
  presentation: Presentation,
  slideIndexes: number[],
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    if (!slideIndexes || slideIndexes.length === 0) {
      throw new Error('No slide indexes provided');
    }

    // Validate slide indexes
    for (const index of slideIndexes) {
      if (index < 0 || index >= presentation.slides.length) {
        throw new Error(`Invalid slide index: ${index}`);
      }
    }

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Calculate aspect ratio and size for PPTX (in inches)
    const aspectRatio = canvasWidth / canvasHeight;
    const pptxWidth = 13.33; // Standard widescreen width in inches
    const pptxHeight = pptxWidth / aspectRatio;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM', width: pptxWidth, height: pptxHeight });
    pptx.layout = 'CUSTOM';

    for (let i = 0; i < slideIndexes.length; i++) {
      const slideIndex = slideIndexes[i];
      const slide = pptx.addSlide();
      const slideData = presentation.slides[slideIndex];

      // Switch to the slide we want to capture
      if (onSlideChange) {
        onSlideChange(slideIndex);
        await waitForSlideRender();
      }

      // Capture canvas with exact dimensions, ignoring transforms
      const dataUrl = await htmlToImage.toPng(canvasElement, {
        width: canvasWidth,
        height: canvasHeight,
        quality: 1.0,
        pixelRatio: 1, // Use 1:1 ratio for exact sizing
        skipFonts: true, // Skip embedding external fonts to avoid CORS issues
        style: {
          transform: 'none', // Ignore any transforms
          margin: '0',
          padding: '0',
        },
        fetchOptions: {
          mode: 'cors' as RequestMode,
        }
      });
      
      // Add slide content as image
      slide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });

      // Add speaker notes if present
      if (slideData.speakerNotes && slideData.speakerNotes.trim()) {
        slide.addNotes(slideData.speakerNotes);
      }
    }

    const filename = generateFilename(presentation, 'pptx');
    await pptx.writeFile({ fileName: filename });

    return createSuccessResult(filename, 'pptx');
  } catch (error) {
    console.error('Selective PPTX export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export PowerPoint with custom options
 */
export const exportAsPPTXWithOptions = async (
  presentation: Presentation,
  options: {
    slideIndexes?: number[];
    includeNotes?: boolean;
    structuredContent?: boolean;
    customWidth?: number;
    customHeight?: number;
    author?: string;
    title?: string;
    subject?: string;
  },
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const slideIndexes = options.slideIndexes || Array.from({ length: presentation.slides.length }, (_, i) => i);
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);

    // Calculate aspect ratio and size for PPTX (in inches)
    const aspectRatio = canvasWidth / canvasHeight;
    const pptxWidth = options.customWidth || 13.33;
    const pptxHeight = options.customHeight || (pptxWidth / aspectRatio);

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'CUSTOM', width: pptxWidth, height: pptxHeight });
    pptx.layout = 'CUSTOM';

    // Set document properties
    if (options.author) pptx.author = options.author;
    if (options.title) pptx.title = options.title;
    if (options.subject) pptx.subject = options.subject;

    const canvasElement = options.structuredContent ? null : getCanvasElement();

    for (let i = 0; i < slideIndexes.length; i++) {
      const slideIndex = slideIndexes[i];
      
      if (slideIndex < 0 || slideIndex >= presentation.slides.length) {
        throw new Error(`Invalid slide index: ${slideIndex}`);
      }

      const slide = pptx.addSlide();
      const slideData = presentation.slides[slideIndex];

      if (options.structuredContent) {
        // Export as structured content (text and images separately)
        if (slideData.backgroundColor) {
          slide.background = { color: slideData.backgroundColor };
        }

        // Add each layer as structured content
        for (const layer of slideData.layers) {
          const xPercent = (layer.x / canvasWidth) * 100;
          const yPercent = (layer.y / canvasHeight) * 100;
          const wPercent = (layer.width / canvasWidth) * 100;
          const hPercent = (layer.height / canvasHeight) * 100;

          if (layer.type === 'text') {
            const textLayer = layer as TextLayer;
            slide.addText(textLayer.content, {
              x: `${xPercent}%`,
              y: `${yPercent}%`,
              w: `${wPercent}%`,
              h: `${hPercent}%`,
              fontSize: textLayer.fontSize,
              fontFace: textLayer.fontFamily,
              color: textLayer.color,
              align: textLayer.textAlign as any,
              valign: 'top',
              bold: textLayer.fontWeight === 'bold',
              italic: textLayer.fontStyle === 'italic',
            });
          } else if (layer.type === 'image') {
            const imageLayer = layer as ImageLayer;
            if (imageLayer.src) {
              slide.addImage({
                data: imageLayer.src,
                x: `${xPercent}%`,
                y: `${yPercent}%`,
                w: `${wPercent}%`,
                h: `${hPercent}%`,
              });
            }
          }
        }
      } else {
        // Export as rendered image
        if (onSlideChange) {
          onSlideChange(slideIndex);
          await waitForSlideRender();
        }

        const dataUrl = await htmlToImage.toPng(canvasElement!, {
          width: canvasWidth,
          height: canvasHeight,
          quality: 1.0,
          pixelRatio: 1,
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });
        
        slide.addImage({
          data: dataUrl,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%'
        });
      }

      // Add speaker notes if requested and present
      if (options.includeNotes !== false && slideData.speakerNotes && slideData.speakerNotes.trim()) {
        slide.addNotes(slideData.speakerNotes);
      }
    }

    const filename = generateFilename(presentation, 'pptx');
    await pptx.writeFile({ fileName: filename });

    return createSuccessResult(filename, 'pptx');
  } catch (error) {
    console.error('Custom PPTX export error:', error);
    return createErrorResult(error);
  }
};