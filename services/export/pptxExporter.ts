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
 * Check if a color is light or dark
 */
const isColorLight = (color: string): boolean => {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Handle gradient backgrounds - assume they are dark
  if (hex.includes('gradient') || hex.includes('linear')) {
    return false;
  }
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance (YIQ formula)
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return true if light (> 128), false if dark
  return brightness > 128;
};

/**
 * Get image dimensions from data URL
 */
const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = dataUrl;
  });
};

/**
 * TEMPORARY WORKAROUND: PptxGenJS cropping/sizing bugs
 * Create cropped image using Canvas for proper object-fit behavior
 * TODO: Remove this when PptxGenJS fixes sizing.type='cover' and cropping parameters
 * 
 * GitHub Issues: 
 * - https://github.com/gitbrent/PptxGenJS/issues/313 (sizing options not working)
 * - https://github.com/gitbrent/PptxGenJS/issues/607 (cover not preserving aspect ratio)
 */
const createCroppedImageCanvas = async (
  imageDataUrl: string,
  objectFit: string,
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  objectPosition: string = 'center-center'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas size to match container dimensions (in pixels)
      // Convert from inches to pixels for canvas processing
      const pixelRatio = 96; // 96 DPI standard
      const canvasWidth = Math.round(containerWidth * pixelRatio);
      const canvasHeight = Math.round(containerHeight * pixelRatio);
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const imageAspect = naturalWidth / naturalHeight;
      const containerAspect = canvasWidth / canvasHeight;

      let sourceX = 0, sourceY = 0, sourceWidth = naturalWidth, sourceHeight = naturalHeight;
      let destX = 0, destY = 0, destWidth = canvasWidth, destHeight = canvasHeight;

      switch (objectFit) {
        case 'cover':
          // Cover: Fill entire container, crop excess
          if (imageAspect > containerAspect) {
            // Image is wider: crop sides based on objectPosition
            sourceWidth = naturalHeight * containerAspect;
            const cropAmount = naturalWidth - sourceWidth;
            
            // Calculate horizontal position based on objectPosition
            const [vAlign, hAlign] = objectPosition.split('-');
            switch (hAlign) {
              case 'left':
                sourceX = 0;
                break;
              case 'right':
                sourceX = cropAmount;
                break;
              case 'center':
              default:
                sourceX = cropAmount / 2;
                break;
            }
          } else {
            // Image is taller: crop top/bottom based on objectPosition
            sourceHeight = naturalWidth / containerAspect;
            const cropAmount = naturalHeight - sourceHeight;
            
            // Calculate vertical position based on objectPosition
            const [vAlign, hAlign] = objectPosition.split('-');
            switch (vAlign) {
              case 'top':
                sourceY = 0;
                break;
              case 'bottom':
                sourceY = cropAmount;
                break;
              case 'center':
              default:
                sourceY = cropAmount / 2;
                break;
            }
          }
          break;
          
        case 'contain':
          // Contain: Fit entire image, add padding
          if (imageAspect > containerAspect) {
            // Image is wider: fit width, add vertical padding
            destHeight = canvasWidth / imageAspect;
            destY = (canvasHeight - destHeight) / 2;
          } else {
            // Image is taller: fit height, add horizontal padding
            destWidth = canvasHeight * imageAspect;
            destX = (canvasWidth - destWidth) / 2;
          }
          break;
          
        case 'circle':
          // Circle: Crop to perfect circle, fill container
          {
            const size = Math.min(canvasWidth, canvasHeight);
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Create circular clipping path
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
            ctx.clip();
            
            // Scale image to fill circle
            destX = centerX - size / 2;
            destY = centerY - size / 2;
            destWidth = size;
            destHeight = size;
          }
          break;
          
        case 'circle-fit':
          // Circle-fit: Crop to circle while preserving aspect ratio
          {
            const size = Math.min(canvasWidth, canvasHeight);
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Create circular clipping path
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
            ctx.clip();
            
            // Apply contain logic within circle
            if (imageAspect > 1) {
              // Image is wider: fit width
              destWidth = size;
              destHeight = size / imageAspect;
              destX = centerX - size / 2;
              destY = centerY - destHeight / 2;
            } else {
              // Image is taller: fit height
              destHeight = size;
              destWidth = size * imageAspect;
              destX = centerX - destWidth / 2;
              destY = centerY - size / 2;
            }
          }
          break;
          
        case 'fill':
        default:
          // Fill: Stretch to exact dimensions (default behavior)
          break;
      }

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw the processed image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        destX, destY, destWidth, destHeight
      );

      // Restore canvas state if clipping was applied
      if (objectFit === 'circle' || objectFit === 'circle-fit') {
        ctx.restore();
      }

      // Convert back to data URL
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for canvas processing'));
    };
    
    img.src = imageDataUrl;
  });
};



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

// Helper function to parse markdown lists for PptxGenJS (improved implementation)
const parseMarkdownForPptx = (markdown: string, baseOptions: any) => {
  if (!markdown) return [{ text: '', options: baseOptions }];

  const lines = markdown.split('\n');
  const pptxTextObjects: { text: string; options: any }[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('- ')) {
      // Handle bullet points
      const indentLevel = line.match(/^\s*/)?.[0].length || 0;
      const level = Math.floor(indentLevel / 2);
      const text = trimmedLine.substring(2).trim().replace(/\*\*(.*?)\*\*/g, '$1');

      pptxTextObjects.push({
        text: text,
        options: { 
          ...baseOptions, 
          bullet: { level: level, code: '•' }, // Use bullet character
          breakLine: index > 0 // Add line break for bullets after first line
        },
      });
    } else if (trimmedLine === '') {
      // Handle empty lines - add line break to next non-empty element
      if (index < lines.length - 1) {
        // Mark next non-empty line to have a break
        for (let j = index + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            // Will be handled by the next iteration
            break;
          }
        }
      }
    } else if (trimmedLine) {
      // Handle regular text
      const text = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1');
      const prevLine = index > 0 ? lines[index - 1].trim() : '';
      
      pptxTextObjects.push({
        text: text,
        options: {
          ...baseOptions,
          bullet: false,
          breakLine: index > 0 && (prevLine === '' || pptxTextObjects.length > 0),
        },
      });
    }
  });
  
  // Post-process to fix formatting issues
  if (pptxTextObjects.length > 0) {
    // First element should not have a line break
    pptxTextObjects[0].options.breakLine = false;
    
    // Ensure proper spacing between bullets and regular text
    for (let i = 1; i < pptxTextObjects.length; i++) {
      const current = pptxTextObjects[i];
      const previous = pptxTextObjects[i - 1];
      
      const currentIsBullet = current.options.bullet !== false;
      const prevWasBullet = previous.options.bullet !== false;
      
      if (!currentIsBullet && prevWasBullet) {
        current.options.breakLine = true;
      }
    }
  }

  if (pptxTextObjects.length === 0) {
    return [{ text: '', options: baseOptions }];
  }
  
  return pptxTextObjects;
};

/**
 * Export presentation as PowerPoint with structured content (restored original functionality)
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
      
      // Set slide background - use actual slide background color from the app
      const backgroundColor = slideData.backgroundColor || presentation.settings?.backgroundColor || '#111827';
      pptxSlide.background = { color: backgroundColor.replace('#', '') };

      // Add all layers preserving their exact positions and properties
      for (const layer of slideData.layers) {
        if (layer.type === 'text') {
          const textLayer = layer as TextLayer;
          if (textLayer.content && textLayer.content.trim()) {
            // Convert percentage (0-100) to PptxGenJS coordinates (0-10 x 0-5.625)
            const x = Math.max(0, Math.min(9.5, (textLayer.x || 0) / 100 * 10));
            const y = Math.max(0, Math.min(5, (textLayer.y || 0) / 100 * 5.625));
            const w = Math.max(0.5, Math.min(10 - x, (textLayer.width || 20) / 100 * 10));
            const h = Math.max(0.5, Math.min(5.625 - y, (textLayer.height || 10) / 100 * 5.625));
            
            // Scale font size appropriately for PowerPoint (convert from screen pixels to points)
            // Based on observation: app fontSize 92 → PowerPoint 36, so ratio is ~0.39
            const baseFontSize = textLayer.fontSize || 16;
            const fontSize = Math.max(8, Math.min(144, Math.round(baseFontSize * 0.39))); // Convert px to pt
            
            // Determine appropriate text color based on background
            const slideBackground = slideData.backgroundColor || presentation.settings?.backgroundColor || '#111827';
            const isLightBackground = isColorLight(slideBackground);
            const defaultTextColor = isLightBackground ? '#000000' : '#FFFFFF';
            const textColor = textLayer.textColor || defaultTextColor;
            
            // Process markdown content properly for PowerPoint
            const textOptions = {
              x: x,
              y: y,
              w: w,
              h: h,
              fontSize: fontSize,
              fontFace: (textLayer.fontFamily || 'Arial').replace(/["']/g, '').replace(/,.*$/, ''),
              color: textColor.replace('#', ''),
              align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
              valign: 'top' as 'top',
              bold: textLayer.fontWeight === 'bold',
              italic: textLayer.fontStyle === 'italic',
            };

            // Handle markdown content with proper bullet formatting
            if (textLayer.content.includes('- ') || textLayer.content.includes('\n')) {
              const parsedContent = parseMarkdownForPptx(textLayer.content, {
                fontSize: fontSize,
                fontFace: (textLayer.fontFamily || 'Arial').replace(/["']/g, '').replace(/,.*$/, ''),
                color: textColor.replace('#', ''),
                bold: textLayer.fontWeight === 'bold',
                italic: textLayer.fontStyle === 'italic',
              });
              // For complex content, use the array format without second parameter
              pptxSlide.addText(parsedContent, {
                x: x,
                y: y,
                w: w,
                h: h,
                align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
                valign: 'top' as 'top',
              });
            } else {
              // Simple text without markdown
              pptxSlide.addText(textLayer.content, textOptions);
            }
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
              // Apply object fit behavior exactly as specified
              const objectFit = imageLayer.objectFit || 'contain';
              
              // Canvas processing for cover mode and circle modes only (PptxGenJS bugs)
              if ((objectFit === 'cover' || objectFit === 'circle' || objectFit === 'circle-fit') && imageLayer.naturalWidth && imageLayer.naturalHeight) {
                try {
                  // Create cropped image using Canvas
                  const croppedImageData = await createCroppedImageCanvas(
                    imageLayer.src,
                    objectFit,
                    w,
                    h,
                    imageLayer.naturalWidth,
                    imageLayer.naturalHeight,
                    imageLayer.objectPosition || 'center-center'
                  );
                  
                  // Add processed image to slide
                  const processedImageOptions: any = {
                    data: croppedImageData,
                    x: x,
                    y: y,
                    w: w,
                    h: h
                  };
                  pptxSlide.addImage(processedImageOptions);
                  
                  // Add original image outside slide boundaries for editing purposes
                  // This allows PowerPoint users to access the unprocessed original
                  // Maintain correct aspect ratio for original image
                  const imageAspect = imageLayer.naturalWidth / imageLayer.naturalHeight;
                  const containerAspect = w / h;
                  
                  let originalW = w;
                  let originalH = h;
                  let originalY = y;
                  
                  // Apply contain logic to preserve aspect ratio
                  if (imageAspect > containerAspect) {
                    // Image is wider: fit width, adjust height
                    originalH = w / imageAspect;
                    originalY = y + (h - originalH) / 2;
                  } else {
                    // Image is taller: fit height, adjust width
                    originalW = h * imageAspect;
                    // Keep originalY = y for vertical positioning
                  }
                  
                  const originalImageOptions: any = {
                    data: imageLayer.src,
                    x: 15, // Outside standard slide width (10-13 inches)
                    y: originalY,
                    w: originalW,
                    h: originalH
                  };
                  pptxSlide.addImage(originalImageOptions);
                } catch (error) {
                  console.warn('Canvas processing failed, using fallback:', error);
                  // Fallback to original image
                  const imageOptions: any = { data: imageLayer.src, x, y, w, h };
                  pptxSlide.addImage(imageOptions);
                }
              } else {
                // Handle contain and fill cases synchronously
                console.log('🖼️ Image layer debug:', {
                  objectFit,
                  hasNaturalDimensions: !!(imageLayer.naturalWidth && imageLayer.naturalHeight),
                  naturalWidth: imageLayer.naturalWidth,
                  naturalHeight: imageLayer.naturalHeight,
                  src: imageLayer.src ? imageLayer.src.substring(0, 50) + '...' : 'no src',
                  isPlaceholder: imageLayer.src?.includes('placehold.co'),
                  isDataUrl: imageLayer.src?.startsWith('data:'),
                  srcType: imageLayer.src ? (
                    imageLayer.src.includes('placehold.co') ? 'placeholder' :
                    imageLayer.src.startsWith('data:') ? 'base64' : 'other'
                  ) : 'none'
                });
                
                let imageOptions: any = {
                  data: imageLayer.src,
                  x: x,
                  y: y,
                  w: w,
                  h: h,
                };
                
                // 🔧 ENSURE naturalWidth/naturalHeight are available for proper aspect ratio handling
                if (objectFit === 'contain' && imageLayer.src && !imageLayer.src.includes('placehold.co')) {
                  // If naturalWidth/naturalHeight are missing, get them synchronously
                  if (!imageLayer.naturalWidth || !imageLayer.naturalHeight) {
                    try {
                      const dimensions = await getImageDimensions(imageLayer.src);
                      imageLayer.naturalWidth = dimensions.width;
                      imageLayer.naturalHeight = dimensions.height;
                    } catch (error) {
                      console.warn('Failed to get image dimensions, using defaults');
                      imageLayer.naturalWidth = 1280;
                      imageLayer.naturalHeight = 720;
                    }
                  }
                }
                
                // Handle contain mode with manual size adjustment (PptxGenJS sizing bug workaround)
                if (objectFit === 'contain' && imageLayer.naturalWidth && imageLayer.naturalHeight) {
                  const imageAspect = imageLayer.naturalWidth / imageLayer.naturalHeight;
                  const containerAspect = w / h;

                  if (imageAspect > containerAspect) {
                    // 画像が横長：幅を基準にして画像を縮小
                    const adjustedH = w / imageAspect;
                    const adjustedY = y + (h - adjustedH) / 2;
                    imageOptions.w = w;
                    imageOptions.h = adjustedH;
                    imageOptions.y = adjustedY;
                  } else {
                    // 画像が縦長：高さを基準にして画像を縮小
                    const adjustedW = h * imageAspect;
                    const adjustedX = x + (w - adjustedW) / 2;
                    imageOptions.w = adjustedW;
                    imageOptions.h = h;
                    imageOptions.x = adjustedX;
                  }
                  console.log('📐 Contain mode with manual size adjustment:', {
                    original: { x, y, w, h },
                    adjusted: { x: imageOptions.x, y: imageOptions.y, w: imageOptions.w, h: imageOptions.h }
                  });
                } else if (objectFit !== 'fill') {
                  // Other modes should be handled by Canvas processing above
                  console.log(`⚠️ Object fit '${objectFit}' should be handled by Canvas processing`);
                }
                
                pptxSlide.addImage(imageOptions);
              }
            } catch (error) {
              console.warn('Error adding image to PPTX:', error);
            }
          }
        }
      }

      // Add shape layers as geometric objects with exact coordinates
      for (const layer of slideData.layers) {
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
      }

      // Add speaker notes if present
      if (slideData.speakerNotes && slideData.speakerNotes.trim()) {
        pptxSlide.addNotes(slideData.speakerNotes);
      } else if (slideData.notes && slideData.notes.trim()) {
        pptxSlide.addNotes(slideData.notes);
      }
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
        const backgroundColor = slideData.backgroundColor || presentation.settings?.backgroundColor || '#111827';
        slide.background = { color: backgroundColor.replace('#', '') };

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
              // Scale font size appropriately for PowerPoint (convert from screen pixels to points)
              // Based on observation: app fontSize 92 → PowerPoint 36, so ratio is ~0.39
              const baseFontSize = textLayer.fontSize || 24;
              const fontSize = Math.max(8, Math.min(144, Math.round(baseFontSize * 0.39))); // Convert px to pt
              
              // Determine appropriate text color based on background
              const slideBackground = slideData.backgroundColor || presentation.settings?.backgroundColor || '#111827';
              const isLightBackground = isColorLight(slideBackground);
              const defaultTextColor = isLightBackground ? '#000000' : '#FFFFFF';
              const textColor = textLayer.textColor || defaultTextColor;
              
              const textOptions = {
                x: safeX,
                y: safeY,
                w: safeW,
                h: safeH,
                fontSize: fontSize,
                fontFace: (textLayer.fontFamily || 'Arial').replace(/["']/g, '').replace(/,.*$/, ''),
                color: textColor.replace('#', ''),
                align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
                valign: 'top' as 'top',
                bold: textLayer.fontWeight === 'bold',
                italic: textLayer.fontStyle === 'italic',
              };

              try {
                // Handle markdown content with proper bullet formatting
                if (textLayer.content.includes('- ') || textLayer.content.includes('\n')) {
                  const parsedContent = parseMarkdownForPptx(textLayer.content, {
                    fontSize: fontSize,
                    fontFace: (textLayer.fontFamily || 'Arial').replace(/["']/g, '').replace(/,.*$/, ''),
                    color: textColor.replace('#', ''),
                    bold: textLayer.fontWeight === 'bold',
                    italic: textLayer.fontStyle === 'italic',
                  });
                  // For complex content, use the array format
                  slide.addText(parsedContent, {
                    x: safeX,
                    y: safeY,
                    w: safeW,
                    h: safeH,
                    align: (textLayer.textAlign || 'left') as 'left' | 'center' | 'right',
                    valign: 'top' as 'top',
                  });
                } else {
                  // Simple text without markdown
                  slide.addText(textLayer.content, textOptions);
                }
              } catch (error) {
                console.warn('Error adding text layer:', error, textOptions);
              }
            }
          } else if (layer.type === 'image') {
            const imageLayer = layer as ImageLayer;
            if (imageLayer.src && imageLayer.src.startsWith('data:image/')) {
              // Apply object fit behavior exactly as specified
              const objectFit = imageLayer.objectFit || 'contain';
              
              // Canvas processing for cover mode and circle modes only (PptxGenJS bugs)
              if ((objectFit === 'cover' || objectFit === 'circle' || objectFit === 'circle-fit') && imageLayer.naturalWidth && imageLayer.naturalHeight) {
                try {
                  // Create cropped image using Canvas
                  const croppedImageData = await createCroppedImageCanvas(
                    imageLayer.src,
                    objectFit,
                    safeW,
                    safeH,
                    imageLayer.naturalWidth,
                    imageLayer.naturalHeight,
                    imageLayer.objectPosition || 'center-center'
                  );
                  
                  // Add processed image to slide
                  const processedImageOptions: any = {
                    data: croppedImageData,
                    x: safeX,
                    y: safeY,
                    w: safeW,
                    h: safeH
                  };
                  slide.addImage(processedImageOptions);
                  
                  // Add original image outside slide boundaries for editing purposes
                  const imageAspect = imageLayer.naturalWidth / imageLayer.naturalHeight;
                  const containerAspect = safeW / safeH;
                  
                  let originalW = safeW;
                  let originalH = safeH;
                  let originalX = pptxWidth + 1; // Outside slide boundaries
                  let originalY = safeY;
                  
                  // Apply contain logic to preserve aspect ratio
                  if (imageAspect > containerAspect) {
                    // Image is wider: fit width, adjust height and center vertically
                    originalH = safeW / imageAspect;
                    originalY = safeY + (safeH - originalH) / 2;
                  } else {
                    // Image is taller: fit height, adjust width and center horizontally
                    originalW = safeH * imageAspect;
                    originalX = pptxWidth + 1 + (safeW - originalW) / 2;
                  }
                  
                  const originalImageOptions: any = {
                    data: imageLayer.src,
                    x: originalX,
                    y: originalY,
                    w: originalW,
                    h: originalH
                  };
                  slide.addImage(originalImageOptions);
                } catch (error) {
                  console.warn('Canvas processing failed, using fallback:', error);
                  const imageOptions: any = { 
                    data: imageLayer.src, 
                    x: safeX, 
                    y: safeY, 
                    w: safeW, 
                    h: safeH 
                  };
                  slide.addImage(imageOptions);
                }
              } else {
                // Handle contain and fill cases synchronously
                console.log('🖼️ [WithOptions] Image layer debug:', {
                  objectFit,
                  hasNaturalDimensions: !!(imageLayer.naturalWidth && imageLayer.naturalHeight),
                  naturalWidth: imageLayer.naturalWidth,
                  naturalHeight: imageLayer.naturalHeight,
                  src: imageLayer.src ? imageLayer.src.substring(0, 50) + '...' : 'no src'
                });
                
                let imageOptions: any = {
                  data: imageLayer.src,
                  x: safeX,
                  y: safeY,
                  w: safeW,
                  h: safeH,
                };
                
                // 🔧 ENSURE naturalWidth/naturalHeight are available for proper aspect ratio handling
                if (objectFit === 'contain' && imageLayer.src && !imageLayer.src.includes('placehold.co')) {
                  // If naturalWidth/naturalHeight are missing, get them synchronously
                  if (!imageLayer.naturalWidth || !imageLayer.naturalHeight) {
                    try {
                      const dimensions = await getImageDimensions(imageLayer.src);
                      imageLayer.naturalWidth = dimensions.width;
                      imageLayer.naturalHeight = dimensions.height;
                    } catch (error) {
                      console.warn('[WithOptions] Failed to get image dimensions, using defaults');
                      imageLayer.naturalWidth = 1280;
                      imageLayer.naturalHeight = 720;
                    }
                  }
                }
                
                switch (objectFit) {
                  case 'contain':
                    // Contain mode: 手動でサイズ調整
                    if (imageLayer.naturalWidth && imageLayer.naturalHeight) {
                      const imageAspect = imageLayer.naturalWidth / imageLayer.naturalHeight;
                      const containerAspect = safeW / safeH;

                      if (imageAspect > containerAspect) {
                        // 画像が横長：幅を基準にして画像を縮小
                        const adjustedH = safeW / imageAspect;
                        const adjustedY = safeY + (safeH - adjustedH) / 2;
                        imageOptions.w = safeW;
                        imageOptions.h = adjustedH;
                        imageOptions.y = adjustedY;
                      } else {
                        // 画像が縦長：高さを基準にして画像を縮小
                        const adjustedW = safeH * imageAspect;
                        const adjustedX = safeX + (safeW - adjustedW) / 2;
                        imageOptions.w = adjustedW;
                        imageOptions.h = safeH;
                        imageOptions.x = adjustedX;
                      }
                      console.log('📐 [WithOptions] Contain mode with manual size adjustment:', {
                        original: { x: safeX, y: safeY, w: safeW, h: safeH },
                        adjusted: { x: imageOptions.x, y: imageOptions.y, w: imageOptions.w, h: imageOptions.h }
                      });
                    } else {
                      // 寸法データがない場合はsizingを使用
                      imageOptions.sizing = {
                        type: 'contain'
                      };
                      console.log('📐 [WithOptions] Contain mode with sizing fallback');
                    }
                    break;
                    
                  case 'fill':
                    // sizingもcroppingも指定しない = デフォルトの引き延ばし動作
                    break;
                    
                  default:
                    // デフォルトもcontainと同じ
                    imageOptions.sizing = {
                      type: 'contain',
                      w: w,
                      h: h
                    };
                    console.log('📐 Default mode with PptxGenJS sizing:', imageOptions.sizing);
                    break;
                }

                try {
                  slide.addImage(imageOptions);
                } catch (error) {
                  console.warn('Error adding image layer:', error, imageOptions);
                }
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