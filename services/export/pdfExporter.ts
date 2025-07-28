import { Presentation, ExportResult, TextLayer, ImageLayer } from '../../types';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
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
// PDF Export Service - PDF document export functionality
// =================================================================

/**
 * Export presentation as PDF
 */
export const exportAsPDF = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);
    
    // Calculate PDF dimensions based on aspect ratio
    const aspectRatio = canvasWidth / canvasHeight;
    const pdfWidth = 297; // A4 width in mm
    const pdfHeight = pdfWidth / aspectRatio;
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Process each slide
    await batchProcess(
      presentation.slides,
      async (slide, index) => {
        // Switch to the slide
        if (onSlideChange) {
          onSlideChange(index);
          await waitForSlideRender();
        }

        // Get slide background color
        const slideBackground = slide.background || presentation.settings?.defaultBackground || '#ffffff';
        
        // Capture the slide as image
        const dataUrl = await htmlToImage.toJpeg(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: 0.95,
          pixelRatio: 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: slideBackground,
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });

        // Add page for each slide (except the first one)
        if (index > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Add slide number (optional)
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(`${index + 1}`, pdfWidth - 10, pdfHeight - 5);
      },
      onProgress
    );

    // Save PDF
    const filename = generateFilename(presentation, 'pdf');
    pdf.save(filename);

    return createSuccessResult(filename, 'pdf');
  } catch (error) {
    console.error('PDF export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export specific slides as PDF
 */
export const exportSlidesAsPDF = async (
  presentation: Presentation,
  slideIndexes: number[],
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
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
    
    // Calculate PDF dimensions
    const aspectRatio = canvasWidth / canvasHeight;
    const pdfWidth = 297; // A4 width in mm
    const pdfHeight = pdfWidth / aspectRatio;
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Process specified slides
    await batchProcess(
      slideIndexes,
      async (slideIndex, index) => {
        // Switch to the slide
        if (onSlideChange) {
          onSlideChange(slideIndex);
          await waitForSlideRender();
        }

        // Get slide background color
        const slide = presentation.slides[slideIndex];
        const slideBackground = slide.background || presentation.settings?.defaultBackground || '#ffffff';
        
        // Capture the slide as image
        const dataUrl = await htmlToImage.toJpeg(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: 0.95,
          pixelRatio: 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: slideBackground,
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });

        // Add page for each slide (except the first one)
        if (index > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Add slide number
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(`${slideIndex + 1}`, pdfWidth - 10, pdfHeight - 5);
      },
      onProgress
    );

    // Save PDF
    const filename = generateFilename(presentation, 'pdf');
    pdf.save(filename);

    return createSuccessResult(filename, 'pdf');
  } catch (error) {
    console.error('Selective PDF export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export PDF with custom options
 */
export const exportAsPDFWithOptions = async (
  presentation: Presentation,
  options: {
    slideIndexes?: number[];
    includeSlideNumbers?: boolean;
    quality?: number;
    pageFormat?: 'A4' | 'Letter' | 'Custom';
    customWidth?: number;
    customHeight?: number;
    margin?: number;
  },
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const slideIndexes = options.slideIndexes || Array.from({ length: presentation.slides.length }, (_, i) => i);
    const canvasElement = getCanvasElement();
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);
    
    // Calculate PDF dimensions based on options
    let pdfWidth: number, pdfHeight: number;
    const aspectRatio = canvasWidth / canvasHeight;
    
    switch (options.pageFormat) {
      case 'Letter':
        pdfWidth = 279; // Letter width in mm
        pdfHeight = pdfWidth / aspectRatio;
        break;
      case 'Custom':
        pdfWidth = options.customWidth || 297;
        pdfHeight = options.customHeight || (pdfWidth / aspectRatio);
        break;
      case 'A4':
      default:
        pdfWidth = 297; // A4 width in mm
        pdfHeight = pdfWidth / aspectRatio;
        break;
    }

    const margin = options.margin || 0;
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Process specified slides
    await batchProcess(
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

        // Get slide background color
        const slide = presentation.slides[slideIndex];
        const slideBackground = slide.background || presentation.settings?.defaultBackground || '#ffffff';
        
        // Capture the slide as image
        const dataUrl = await htmlToImage.toJpeg(canvasElement, {
          width: canvasWidth,
          height: canvasHeight,
          quality: options.quality || 0.95,
          pixelRatio: 2,
          skipFonts: true, // Skip external fonts to avoid CORS issues
          backgroundColor: slideBackground,
          style: {
            transform: 'none',
            margin: '0',
            padding: '0',
          },
          fetchOptions: {
            mode: 'cors' as RequestMode,
          }
        });

        // Add page for each slide (except the first one)
        if (index > 0) {
          pdf.addPage();
        }

        // Add image to PDF with margins
        pdf.addImage(dataUrl, 'JPEG', margin, margin, contentWidth, contentHeight);
        
        // Add slide number if requested
        if (options.includeSlideNumbers !== false) {
          pdf.setFontSize(8);
          pdf.setTextColor(128);
          pdf.text(`${slideIndex + 1}`, pdfWidth - 10, pdfHeight - 5);
        }
      },
      onProgress
    );

    // Save PDF
    const filename = generateFilename(presentation, 'pdf');
    pdf.save(filename);

    return createSuccessResult(filename, 'pdf');
  } catch (error) {
    console.error('Custom PDF export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export presentation as structured PDF (searchable text)
 */
export const exportAsPDFStructured = async (
  presentation: Presentation, 
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(presentation);
    
    // Calculate PDF dimensions based on aspect ratio
    const aspectRatio = canvasWidth / canvasHeight;
    const pdfWidth = 297; // A4 width in mm
    const pdfHeight = pdfWidth / aspectRatio;
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Process each slide
    await batchProcess(
      presentation.slides,
      async (slide, index) => {
        // Add page for each slide (except the first one)
        if (index > 0) {
          pdf.addPage();
        }

        // Set background color if specified
        if (slide.backgroundColor) {
          pdf.setFillColor(slide.backgroundColor);
          pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        }

        // Add each layer as structured content
        for (const layer of slide.layers) {
          const xMm = (layer.x / 100) * pdfWidth;
          const yMm = (layer.y / 100) * pdfHeight;
          const wMm = (layer.width / 100) * pdfWidth;
          const hMm = (layer.height / 100) * pdfHeight;

          if (layer.type === 'text') {
            const textLayer = layer as TextLayer;
            
            // Set font properties
            pdf.setFontSize(Math.max(8, Math.min(72, textLayer.fontSize * 0.35))); // Convert to reasonable PDF font size
            pdf.setTextColor(textLayer.textColor || '#000000');
            
            // Handle font weight
            if (textLayer.fontWeight === 'bold') {
              pdf.setFont('helvetica', 'bold');
            } else {
              pdf.setFont('helvetica', 'normal');
            }

            // Split text into lines that fit within the specified width
            const lines = pdf.splitTextToSize(textLayer.content, wMm);
            
            // Calculate text alignment
            let align: 'left' | 'center' | 'right' = 'left';
            if (textLayer.textAlign === 'center') align = 'center';
            else if (textLayer.textAlign === 'right') align = 'right';
            
            // Add text with proper positioning
            pdf.text(lines, xMm, yMm + (textLayer.fontSize * 0.35), {
              align: align,
              maxWidth: wMm
            });
            
          } else if (layer.type === 'image') {
            const imageLayer = layer as ImageLayer;
            
            if (imageLayer.src && imageLayer.src.startsWith('data:image/')) {
              try {
                // Add image to PDF
                pdf.addImage(imageLayer.src, 'JPEG', xMm, yMm, wMm, hMm);
              } catch (error) {
                console.warn('Error adding image to PDF:', error);
                // Add placeholder text instead
                pdf.setFontSize(10);
                pdf.setTextColor('#666666');
                pdf.text(`[Image: ${imageLayer.prompt || 'Image failed to load'}]`, xMm, yMm + 5);
              }
            } else if (imageLayer.prompt) {
              // Add placeholder for missing images
              pdf.setFontSize(10);
              pdf.setTextColor('#666666');
              pdf.text(`[Image: ${imageLayer.prompt}]`, xMm, yMm + 5);
            }
          }
        }
        
        // Add slide number
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(`${index + 1}`, pdfWidth - 10, pdfHeight - 5);
      },
      onProgress
    );

    // Save PDF
    const filename = generateFilename(presentation, 'pdf');
    pdf.save(filename);

    return createSuccessResult(filename, 'pdf-structured');
  } catch (error) {
    console.error('Structured PDF export error:', error);
    return createErrorResult(error);
  }
};