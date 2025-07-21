import { Presentation, Slide, ExportResult, TextLayer, ImageLayer, ShapeLayer } from '../../types';
import { CANVAS_SIZES, TEXT_STYLES } from '../../constants';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import {
  generateFilename,
  createErrorResult,
  createSuccessResult,
  validatePresentation
} from './exportUtils';

// =================================================================
// SVG Export Service - Scalable Vector Graphics export
// =================================================================

// Escape SVG attribute values
const escapeSVGAttribute = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Escape SVG text content
const escapeSVGText = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Convert layer to SVG element
const layerToSVG = (layer: TextLayer | ImageLayer | ShapeLayer, canvasWidth: number, canvasHeight: number): string => {
  const x = Math.round((layer.x / 100) * canvasWidth * 100) / 100;
  const y = Math.round((layer.y / 100) * canvasHeight * 100) / 100;
  const width = Math.round((layer.width / 100) * canvasWidth * 100) / 100;
  const height = Math.round((layer.height / 100) * canvasHeight * 100) / 100;
  const opacity = Math.round(layer.opacity * 100) / 100;
  const rotation = Math.round(layer.rotation * 100) / 100;
  
  const transform = rotation !== 0 ? `rotate(${rotation} ${x + width/2} ${y + height/2})` : '';
  const commonAttrs = `opacity="${opacity}"${transform ? ` transform="${transform}"` : ''}`;
  
  switch (layer.type) {
    case 'text':
      const textStyle = TEXT_STYLES.find(s => s.id === layer.textStyleId)?.style || {};
      let fontSize = layer.fontSize || 16;
      if (typeof textStyle.fontSize === 'string') {
        fontSize = parseInt(textStyle.fontSize.replace('px', '')) || 16;
      } else if (typeof textStyle.fontSize === 'number') {
        fontSize = textStyle.fontSize;
      }
      
      const fontFamily = escapeSVGAttribute(textStyle.fontFamily || 'Arial, sans-serif');
      const textColor = escapeSVGAttribute(layer.textColor || textStyle.color || '#000000');
      const fontWeight = escapeSVGAttribute(String(textStyle.fontWeight || 'normal'));
      
      // Split text into lines and handle multiline text
      const lines = (layer.content || '').split('\n');
      const lineHeight = fontSize * 1.2; // Standard line height
      
      const textAnchor = layer.textAlign === 'center' ? 'middle' : layer.textAlign === 'right' ? 'end' : 'start';
      const textX = layer.textAlign === 'center' ? x + width/2 : layer.textAlign === 'right' ? x + width : x;
      
      // Calculate vertical positioning for multiline text
      const totalTextHeight = lines.length * lineHeight;
      const startY = y + (height - totalTextHeight) / 2 + fontSize * 0.8; // Adjust for baseline
      
      if (lines.length === 1) {
        // Single line text
        const textContent = escapeSVGText(lines[0]);
        return `<text x="${textX}" y="${y + height/2}" ${commonAttrs} font-size="${fontSize}" font-family="${fontFamily}" fill="${textColor}" font-weight="${fontWeight}" text-anchor="${textAnchor}" dominant-baseline="middle">${textContent}</text>`;
      } else {
        // Multiline text using <tspan> elements
        const tspans = lines.map((line, index) => {
          const escapedLine = escapeSVGText(line);
          const lineY = startY + (index * lineHeight);
          return `<tspan x="${textX}" y="${lineY}">${escapedLine}</tspan>`;
        }).join('');
        
        return `<text ${commonAttrs} font-size="${fontSize}" font-family="${fontFamily}" fill="${textColor}" font-weight="${fontWeight}" text-anchor="${textAnchor}">${tspans}</text>`;
      }
      
    case 'image':
      // For SVG, embed images as base64 data URLs - ensure URL is properly escaped
      const imageSrc = escapeSVGAttribute(layer.src || '');
      const preserveAspectRatio = layer.objectFit === 'contain' ? 'xMidYMid meet' : layer.objectFit === 'cover' ? 'xMidYMid slice' : 'none';
      return `<image x="${x}" y="${y}" width="${width}" height="${height}" ${commonAttrs} href="${imageSrc}" preserveAspectRatio="${preserveAspectRatio}" />`;
      
    case 'shape':
      const fill = escapeSVGAttribute(layer.fillColor || '#000000');
      const stroke = escapeSVGAttribute(layer.strokeColor || 'none');
      const strokeWidth = Math.round((layer.strokeWidth || 0) * 100) / 100;
      
      switch (layer.shapeType) {
        case 'rectangle':
          return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${commonAttrs} fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
          
        case 'circle':
          const cx = x + width/2;
          const cy = y + height/2;
          const rx = width/2;
          const ry = height/2;
          return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${commonAttrs} fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
          
        case 'triangle':
          const points = `${x + width/2},${y} ${x},${y + height} ${x + width},${y + height}`;
          return `<polygon points="${points}" ${commonAttrs} fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
          
        case 'line':
          return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" ${commonAttrs} stroke="${stroke !== 'none' ? stroke : fill}" stroke-width="${strokeWidth || 2}" />`;
          
        default:
          return '';
      }
      
    default:
      return '';
  }
};

// Generate SVG content for a single slide
const generateSlideSVG = (slide: Slide, slideIndex?: number): string => {
  const canvasSize = CANVAS_SIZES[slide.aspectRatio];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="100%" height="100%" fill="${slide.background}" />
  
  <!-- Layers -->
  ${slide.layers
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(layer => layerToSVG(layer, canvasSize.width, canvasSize.height))
    .filter(svg => svg.length > 0)
    .map(svg => `  ${svg}`)
    .join('\n')}
</svg>`;
};

/**
 * Export current slide as SVG
 */
export const exportAsSVG = async (presentation: Presentation): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);
    
    if (!presentation.slides.length) {
      throw new Error('No slides to export');
    }
    
    const slide = presentation.slides[0]; // Export current slide only
    const svgContent = generateSlideSVG(slide);
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const filename = generateFilename(presentation, 'svg');
    saveAs(blob, filename);
    
    return createSuccessResult(filename, 'svg');
  } catch (error) {
    console.error('SVG export error:', error);
    return createErrorResult(error);
  }
};

/**
 * Export all slides as SVG files in a ZIP
 */
export const exportAllAsSVG = async (
  presentation: Presentation,
  onSlideChange?: (slideIndex: number) => void
): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);
    
    if (!presentation.slides.length) {
      throw new Error('No slides to export');
    }
    
    const zip = new JSZip();
    
    // Export each slide as SVG
    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i];
      
      // Notify slide change for UI feedback
      if (onSlideChange) {
        onSlideChange(i);
      }
      
      const svgContent = generateSlideSVG(slide, i);
      const slideFilename = `slide_${(i + 1).toString().padStart(3, '0')}.svg`;
      
      zip.file(slideFilename, svgContent);
    }
    
    // Add metadata file
    const metadata = {
      title: presentation.title,
      totalSlides: presentation.slides.length,
      exportedAt: new Date().toISOString(),
      format: 'SVG',
      description: 'SVG export of all slides from SlideMaster'
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = generateFilename(presentation, 'zip').replace('.zip', '_svg.zip');
    saveAs(blob, filename);
    
    return {
      success: true,
      filename,
      format: 'svg-all',
      metadata: {
        format: 'SVG ZIP',
        size: blob.size,
        slideCount: presentation.slides.length,
        duration: 0
      }
    };
  } catch (error) {
    console.error('SVG All export error:', error);
    return createErrorResult(error);
  }
};