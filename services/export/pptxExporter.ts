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

// Helper function to parse markdown lists for PptxGenJS (from backup implementation)
const parseMarkdownForPptx = (markdown: string, baseOptions: any) => {
  if (!markdown) return [{ text: '', options: baseOptions }];

  const lines = markdown.split('\n');
  const pptxTextObjects: { text: string; options: any }[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ')) {
      const indentLevel = line.match(/^\s*/)?.[0].length || 0;
      const level = Math.floor(indentLevel / 2);
      // Strip markdown bolding, as pptxgenjs doesn't support it in-line.
      const text = trimmedLine.substring(2).trim().replace(/\*\*(.*?)\*\*/g, '$1');

      pptxTextObjects.push({
        text: text,
        options: { ...baseOptions, bullet: { level: level } },
      });
    } else if (trimmedLine) {
      // This is a line of a paragraph.
      const text = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1');
      const prevLine = index > 0 ? lines[index - 1].trim() : null;

      pptxTextObjects.push({
        text: text,
        options: {
          ...baseOptions,
          bullet: false,
          // Start a new paragraph if the previous line was empty.
          breakLine: prevLine === '',
        },
      });
    }
    // Empty lines are handled by checking `prevLine` in the `else if` block.
  });
  
  // Post-process to fix issues.
  // The very first element should never have a line break before it.
  if (pptxTextObjects.length > 0 && pptxTextObjects[0].options.breakLine) {
    pptxTextObjects[0].options.breakLine = false;
  }
  
  // If a non-bullet follows a bullet, it should be a new paragraph.
  for (let i = 1; i < pptxTextObjects.length; i++) {
    const currentIsBullet = pptxTextObjects[i].options.bullet !== false;
    const prevWasBullet = pptxTextObjects[i-1].options.bullet !== false;
    if (!currentIsBullet && prevWasBullet) {
      pptxTextObjects[i].options.breakLine = true;
    }
  }

  if (pptxTextObjects.length === 0) {
    return [{ text: '', options: baseOptions }];
  }
  
  return pptxTextObjects;
};

/**
 * Export presentation as PowerPoint with structured content (based on backup implementation)
 */
export const exportAsPPTXStructured = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'SlideMaster';
    pptx.title = presentation.title || 'Presentation';

    for (let i = 0; i < presentation.slides.length; i++) {
      const slideData = presentation.slides[i];
      const pptxSlide = pptx.addSlide();
      
      // Set slide background
      const backgroundColor = slideData.backgroundColor || '#FFFFFF';
      pptxSlide.background = { color: backgroundColor.replace('#', '') };
      
      // Determine text colors based on background
      const isDarkBackground = backgroundColor === '#1A202C' || backgroundColor.toLowerCase().includes('dark');
      const textColor = isDarkBackground ? 'FFFFFF' : '000000';
      const subTextColor = isDarkBackground ? 'E2E8F0' : '333333';

      // Find title and content from layers
      let titleText = '';
      let contentText = '';
      const imageLayer = slideData.layers.find(layer => layer.type === 'image') as ImageLayer;
      
      // Extract title and content from text layers with better logic
      slideData.layers.forEach(layer => {
        if (layer.type === 'text') {
          const textLayer = layer as TextLayer;
          const content = textLayer.content || '';
          
          // Prioritize by font size and position
          if (textLayer.fontSize && textLayer.fontSize >= 32) {
            titleText = content;
          } else if (textLayer.y && textLayer.y < 30 && !titleText) {
            titleText = content;
          } else if (content && titleText !== content) {
            if (contentText) {
              contentText += '\n' + content;
            } else {
              contentText = content;
            }
          } else if (!titleText && content) {
            titleText = content;
          }
        }
      });

      // Use slide title if no title found in layers
      if (!titleText) {
        titleText = `Slide ${i + 1}`;
      }

      const hasImage = imageLayer?.src && !imageLayer.src.includes('placehold.co');

      // Determine layout based on layer positions
      const titleLayer = slideData.layers.find(layer => 
        layer.type === 'text' && (layer as TextLayer).fontSize && (layer as TextLayer).fontSize! >= 32
      ) as TextLayer;
      
      const contentLayer = slideData.layers.find(layer => 
        layer.type === 'text' && layer !== titleLayer
      ) as TextLayer;

      // Add all layers preserving their exact positions and properties
      slideData.layers.forEach(layer => {
        if (layer.type === 'text') {
          const textLayer = layer as TextLayer;
          if (textLayer.content && textLayer.content.trim()) {
            // Convert percentage (0-100) to PptxGenJS coordinates (0-10 x 0-5.625)
            const x = Math.max(0, Math.min(9.5, (textLayer.x || 0) / 100 * 10));
            const y = Math.max(0, Math.min(5, (textLayer.y || 0) / 100 * 5.625));
            const w = Math.max(0.5, Math.min(10 - x, (textLayer.width || 20) / 100 * 10));
            const h = Math.max(0.5, Math.min(5.625 - y, (textLayer.height || 10) / 100 * 5.625));
            
            const fontSize = Math.max(8, Math.min(72, textLayer.fontSize || 16));
            const parsedContent = parseMarkdownForPptx(textLayer.content, { 
              color: (textLayer.textColor || '#000000').replace('#', ''), 
              fontSize: fontSize 
            });
            
            pptxSlide.addText(parsedContent, {
              x: x,
              y: y,
              w: w,
              h: h,
              fontSize: fontSize,
              color: (textLayer.textColor || '#000000').replace('#', ''),
              align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
              valign: 'top' as 'top',
              bold: textLayer.fontWeight === 'bold',
              italic: textLayer.fontStyle === 'italic',
            });
          }
        } else if (layer.type === 'image') {
          const imageLayer = layer as ImageLayer;
          if (imageLayer.src && !imageLayer.src.includes('placehold.co')) {
            // Convert percentage (0-100) to PptxGenJS coordinates (0-10 x 0-5.625)
            const x = Math.max(0, Math.min(9, (imageLayer.x || 0) / 100 * 10));
            const y = Math.max(0, Math.min(4.5, (imageLayer.y || 0) / 100 * 5.625));
            const w = Math.max(1, Math.min(10 - x, (imageLayer.width || 30) / 100 * 10));
            const h = Math.max(1, Math.min(5.625 - y, (imageLayer.height || 30) / 100 * 5.625));
            
            try {
              pptxSlide.addImage({
                data: imageLayer.src,
                x: x,
                y: y,
                w: w,
                h: h,
                sizing: { type: 'contain', w: w, h: h }
              });
            } catch (error) {
              console.warn('Error adding image to PPTX:', error);
            }
          }
        }
      });

      // Add speaker notes if present
      if (slideData.speakerNotes && slideData.speakerNotes.trim()) {
        pptxSlide.addNotes(slideData.speakerNotes);
      } else if (slideData.notes && slideData.notes.trim()) {
        pptxSlide.addNotes(slideData.notes);
      }
      
      // Add shape layers as geometric objects with exact coordinates
      slideData.layers.forEach(layer => {
        if (layer.type === 'shape') {
          try {
            const shapeLayer = layer as any;
            // Convert percentage (0-100) to PptxGenJS coordinates (0-10 x 0-5.625)
            const x = Math.max(0, Math.min(9, (shapeLayer.x || 0) / 100 * 10));
            const y = Math.max(0, Math.min(4.5, (shapeLayer.y || 0) / 100 * 5.625));
            const w = Math.max(0.5, Math.min(10 - x, (shapeLayer.width || 10) / 100 * 10));
            const h = Math.max(0.5, Math.min(5.625 - y, (shapeLayer.height || 10) / 100 * 5.625));
            
            pptxSlide.addShape('rect', {
              x: x,
              y: y,
              w: w,
              h: h,
              fill: { color: shapeLayer.backgroundColor?.replace('#', '') || 'CCCCCC' },
              line: { color: shapeLayer.borderColor?.replace('#', '') || '000000', width: 1 }
            });
          } catch (error) {
            console.warn('Error adding shape to PPTX:', error);
          }
        }
      });
    }

    const filename = generateFilename(presentation, 'pptx');
    await pptx.writeFile({ fileName: filename });

    return createSuccessResult(filename, 'pptx-structured');
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
          if (!layer || typeof layer.x !== 'number' || typeof layer.y !== 'number') {
            console.warn('Skipping invalid layer:', layer);
            continue;
          }

          // Convert percentage coordinates to inches for PPTX
          const xInches = (layer.x / 100) * pptxWidth;
          const yInches = (layer.y / 100) * pptxHeight;
          const wInches = ((layer.width || 10) / 100) * pptxWidth;
          const hInches = ((layer.height || 10) / 100) * pptxHeight;

          // Ensure coordinates are within bounds
          const safeX = Math.max(0, Math.min(pptxWidth - 0.1, xInches));
          const safeY = Math.max(0, Math.min(pptxHeight - 0.1, yInches));
          const safeW = Math.max(0.1, Math.min(pptxWidth - safeX, wInches));
          const safeH = Math.max(0.1, Math.min(pptxHeight - safeY, hInches));

          if (layer.type === 'text') {
            const textLayer = layer as TextLayer;
            if (textLayer.content && textLayer.content.trim()) {
              const fontSize = Math.max(8, Math.min(144, textLayer.fontSize || 24));
              const textOptions = {
                x: safeX,
                y: safeY,
                w: safeW,
                h: safeH,
                fontSize: fontSize,
                color: textLayer.textColor || '#000000',
                align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
                valign: 'top' as 'top',
                bold: textLayer.fontWeight === 'bold',
                italic: textLayer.fontStyle === 'italic',
              };

              try {
                slide.addText(textLayer.content, textOptions);
              } catch (error) {
                console.warn('Error adding text layer:', error, textOptions);
              }
            }
          } else if (layer.type === 'image') {
            const imageLayer = layer as ImageLayer;
            if (imageLayer.src && imageLayer.src.startsWith('data:image/')) {
              const imageOptions = {
                data: imageLayer.src,
                x: safeX,
                y: safeY,
                w: safeW,
                h: safeH,
              };

              try {
                slide.addImage(imageOptions);
              } catch (error) {
                console.warn('Error adding image layer:', error, imageOptions);
              }
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