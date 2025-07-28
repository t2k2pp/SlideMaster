// =================================================================
// Export Service - Main entry point (Properly Refactored)
// =================================================================

// Re-export utility functions
export {
  generateFilename,
  getHighQualityExportOptions,
  getCanvasDimensions,
  waitForSlideRender,
  getCanvasElement,
  createErrorResult,
  createSuccessResult,
  validatePresentation,
  getSlideAspectRatio,
  batchProcess
} from './export/exportUtils';

// Re-export PNG export services
export {
  exportAsPNG,
  exportAllAsPNG,
  exportSlideAsPNG,
  exportAsPNGWithOptions
} from './export/pngExporter';

// Re-export JPEG export services
export {
  exportAsJPEG,
  exportAllAsJPEG,
  exportSlideAsJPEG,
  exportAsJPEGWithOptions
} from './export/jpegExporter';

// Re-export PDF export services
export {
  exportAsPDF,
  exportSlidesAsPDF,
  exportAsPDFWithOptions
} from './export/pdfExporter';

// Re-export PowerPoint export services
export {
  exportAsPPTX,
  exportAsPPTXStructured,
  exportSlidesAsPPTX,
  exportAsPPTXWithOptions
} from './export/pptxExporter';

// Re-export project export/import services
export {
  exportProject,
  importProject,
  importProjectLegacy,
  exportProjectWithBackup,
  validateProjectFile
} from './export/projectExporter';

// Re-export HTML export service
export {
  exportAsHTML
} from './export/htmlExporter';

// Re-export Marp export service
export {
  exportAsMarp
} from './export/marpExporter';

// Re-export SVG export services
export {
  exportAsSVG,
  exportAllAsSVG
} from './export/svgExporter';

// =================================================================
// Main export function - unified interface
// =================================================================

import { Presentation, ExportOptions, ExportResult } from '../types';

/**
 * Main export function that routes to the appropriate exporter
 */
export const exportPresentation = async (
  presentation: Presentation,
  options: ExportOptions,
  onSlideChange?: (slideIndex: number) => void,
  onProgress?: (current: number, total: number) => void,
  currentSlideIndex?: number
): Promise<ExportResult> => {
  try {
    switch (options.format) {
      case 'png':
      case 'png-all':
        if (options.format === 'png-all') {
          const { exportAllAsPNG } = await import('./export/pngExporter');
          return exportAllAsPNG(presentation, onSlideChange, onProgress);
        } else {
          const { exportAsPNG } = await import('./export/pngExporter');
          return exportAsPNG(presentation, onSlideChange, currentSlideIndex);
        }

      case 'jpeg':
      case 'jpeg-all':
        if (options.format === 'jpeg-all') {
          const { exportAllAsJPEG } = await import('./export/jpegExporter');
          return exportAllAsJPEG(presentation, onSlideChange, onProgress, options.quality);
        } else {
          const { exportAsJPEG } = await import('./export/jpegExporter');
          return exportAsJPEG(presentation, onSlideChange, options.quality, currentSlideIndex);
        }

      case 'pdf':
        // Default to structured PDF (searchable text) unless explicitly disabled
        if (options.structuredContent === false) {
          const { exportAsPDF } = await import('./export/pdfExporter');
          return exportAsPDF(presentation, onSlideChange, onProgress);
        } else {
          const { exportAsPDFStructured } = await import('./export/pdfExporter');
          return exportAsPDFStructured(presentation, onSlideChange, onProgress);
        }

      case 'pptx':
        // Default to structured PPTX (editable objects) unless explicitly disabled
        if (options.structuredContent === false) {
          const { exportAsPPTX } = await import('./export/pptxExporter');
          return exportAsPPTX(presentation, onSlideChange);
        } else {
          const { exportAsPPTXStructured } = await import('./export/pptxExporter');
          return exportAsPPTXStructured(presentation, onSlideChange);
        }

      case 'html':
        const { exportAsHTML } = await import('./export/htmlExporter');
        return exportAsHTML(presentation);

      case 'marp':
        const { exportAsMarp } = await import('./export/marpExporter');
        return exportAsMarp(presentation, true); // includeImages: true for ZIP format with images

      case 'svg':
      case 'svg-all':
        if (options.format === 'svg-all') {
          const { exportAllAsSVG } = await import('./export/svgExporter');
          return exportAllAsSVG(presentation, onSlideChange);
        } else {
          const { exportAsSVG } = await import('./export/svgExporter');
          return exportAsSVG(presentation, currentSlideIndex);
        }

      case 'project':
        const { exportProject } = await import('./export/projectExporter');
        return exportProject(presentation);

      default:
        return {
          success: false,
          error: `Unsupported export format: ${options.format}`
        };
    }
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error'
    };
  }
};

// =================================================================
// Legacy compatibility exports
// =================================================================

// Maintain backwards compatibility for existing imports
import { exportAsPNG as _exportAsPNG } from './export/pngExporter';
import { exportAsPDF as _exportAsPDF } from './export/pdfExporter';
import { exportAsPPTX as _exportAsPPTX } from './export/pptxExporter';
import { exportProject as _exportProject } from './export/projectExporter';
import { importProject as _importProject } from './export/projectExporter';

// Export legacy function names if needed
export const exportCurrentSlideAsPNG = _exportAsPNG;
export const exportPresentationAsPDF = _exportAsPDF;
export const exportPresentationAsPPTX = _exportAsPPTX;
export const exportPresentationProject = _exportProject;
export const importPresentationProject = _importProject;

// =================================================================
// Export format metadata
// =================================================================

/**
 * Get available export formats
 */
export const getAvailableExportFormats = () => [
  { value: 'png', label: 'PNG Image', description: 'High quality raster image' },
  { value: 'png-all', label: 'PNG Images (All)', description: 'All slides as PNG images in ZIP' },
  { value: 'jpeg', label: 'JPEG Image', description: 'Compressed raster image' },
  { value: 'jpeg-all', label: 'JPEG Images (All)', description: 'All slides as JPEG images in ZIP' },
  { value: 'pdf', label: 'PDF Document', description: 'Portable document format' },
  { value: 'pptx', label: 'PowerPoint', description: 'Microsoft PowerPoint presentation' },
  { value: 'html', label: 'HTML Slideshow', description: 'Interactive web presentation' },
  { value: 'marp', label: 'Marp Markdown', description: 'Markdown-based presentation format' },
  { value: 'svg', label: 'SVG Vector', description: 'Scalable vector graphics' },
  { value: 'svg-all', label: 'SVG Vectors (All)', description: 'All slides as SVG files in ZIP' },
  { value: 'project', label: 'SlideMaster Project', description: 'Native project format' },
];

/**
 * Get export format capabilities
 */
export const getExportCapabilities = (format: string) => {
  switch (format) {
    case 'png':
    case 'png-all':
      return {
        supportsAllSlides: format === 'png-all',
        supportsQuality: false,
        supportsCustomSize: true,
        supportsTransparency: true,
      };
    case 'jpeg':
    case 'jpeg-all':
      return {
        supportsAllSlides: format === 'jpeg-all',
        supportsQuality: true,
        supportsCustomSize: true,
        supportsTransparency: false,
      };
    case 'pdf':
      return {
        supportsAllSlides: true,
        supportsQuality: true,
        supportsCustomSize: true,
        supportsNotes: false,
      };
    case 'pptx':
      return {
        supportsAllSlides: true,
        supportsQuality: false,
        supportsCustomSize: true,
        supportsNotes: true,
        supportsStructuredContent: true,
      };
    case 'html':
      return {
        supportsAllSlides: true,
        supportsQuality: false,
        supportsCustomSize: false,
        supportsNotes: true,
        supportsInteraction: true,
      };
    case 'marp':
      return {
        supportsAllSlides: true,
        supportsQuality: false,
        supportsCustomSize: false,
        supportsNotes: true,
        supportsMarkdown: true,
      };
    case 'svg':
    case 'svg-all':
      return {
        supportsAllSlides: format === 'svg-all',
        supportsQuality: false,
        supportsCustomSize: true,
        supportsTransparency: true,
        supportsVector: true,
      };
    case 'project':
      return {
        supportsAllSlides: true,
        supportsQuality: false,
        supportsCustomSize: false,
        supportsMetadata: true,
        supportsHistory: true,
      };
    default:
      return {};
  }
};