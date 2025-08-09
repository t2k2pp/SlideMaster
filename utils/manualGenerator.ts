// =================================================================
// Manual Generator Utility
// =================================================================

import { Slide, TextLayer, ImageLayer, Presentation } from '../types';
import { timeStringToSeconds } from './videoFrameExtractor';
import { THEME_CONFIGS } from '../constants';

export interface ManualSection {
  title: string;
  content: string;
  timestamps: number[];
  level: number; // Header level (1-6)
}

export interface ManualGeneratorOptions {
  imagePosition: 'top' | 'bottom' | 'left' | 'right';
  textStyle: string;
  aspectRatio: '16:9' | '4:3' | '21:9';
  theme: 'professional' | 'creative' | 'minimalist' | 'dark_modern' | 'custom';
  background?: string; // Only used when theme is 'custom'
}

export interface ManualGeneratorResult {
  sections: ManualSection[];
  slides: Slide[];
  success: boolean;
  error?: string;
}

/**
 * Parse markdown content and extract manual sections
 */
export function parseManualMarkdown(markdown: string): ManualSection[] {
  const sections: ManualSection[] = [];
  const lines = markdown.split('\n');
  
  let currentSection: ManualSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    // Check if line is a header
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      
      currentSection = {
        title,
        content: '',
        timestamps: [],
        level
      };
      contentLines = [];
    } else if (currentSection) {
      // Add content to current section
      contentLines.push(line);
      
      // Extract timestamps from this line
      const timestamps = extractTimestampsFromLine(line);
      currentSection.timestamps.push(...timestamps);
    }
  }

  // Add final section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  const optimizedSections = optimizeSections(sections);
  
  // Generate timestamps for sections without any (common in English content)
  return generateMissingTimestamps(optimizedSections);
}

/**
 * Generate missing timestamps for sections that don't have any
 * This is common in English content where timestamps aren't explicitly marked
 */
function generateMissingTimestamps(sections: ManualSection[]): ManualSection[] {
  return sections.map((section, index) => {
    if (section.timestamps.length === 0) {
      // Generate timestamp based on section position (30 seconds apart)
      const generatedTime = index * 30;
      console.log(`Generated timestamp ${generatedTime}s for section: ${section.title}`);
      return {
        ...section,
        timestamps: [generatedTime]
      };
    }
    return section;
  });
}

/**
 * Optimize sections by merging redundant parent sections
 * Only merge h2 sections, preserve h1 sections for chapter overview
 */
function optimizeSections(sections: ManualSection[]): ManualSection[] {
  const optimized: ManualSection[] = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Only merge h2 sections (level 2), preserve h1 sections for chapter titles
    if (section.level === 2 && section.content.trim().length < 50) {
      // Look for the next section
      const nextSection = sections[i + 1];
      
      // If next section is a direct child (level + 1) and has good content
      if (nextSection && nextSection.level === section.level + 1 && nextSection.content.trim().length > 20) {
        // Keep the parent section but merge its content into the child
        const mergedChildSection: ManualSection = {
          title: nextSection.title, // Keep child's title
          content: `${section.content}\n\n${nextSection.content}`.trim(),
          timestamps: [...section.timestamps, ...nextSection.timestamps],
          level: nextSection.level // Keep child's level
        };
        
        optimized.push(mergedChildSection);
        i++; // Skip the next section as it's been merged
        continue;
      }
    }
    
    optimized.push(section);
  }
  
  return optimized;
}

/**
 * Extract timestamps from a line of text - Enhanced for multilingual support
 */
function extractTimestampsFromLine(line: string): number[] {
  // Multiple regex patterns for different timestamp formats
  const patterns = [
    // Japanese format: タイムライン followed by timestamp
    /(?:タイムライン[：:\s]*)?(\d{1,2}:\d{2}(?::\d{2})?)\b/g,
    // Standard format: just timestamps
    /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g,
    // English format: at MM:SS or (MM:SS)
    /(?:at\s+|^)(\d{1,2}:\d{2}(?::\d{2})?)\b/gi,
    /\((\d{1,2}:\d{2}(?::\d{2})?)\)/g
  ];
  
  const allMatches: string[] = [];
  
  for (const pattern of patterns) {
    const matches = [...line.matchAll(pattern)];
    allMatches.push(...matches.map(match => match[1] || match[0]));
  }
  
  // Convert to seconds and remove duplicates
  const timestamps = [...new Set(allMatches)]
    .map(match => {
      // Clean up the match (remove any non-timestamp characters)
      const cleaned = match.replace(/[^\d:]/g, '');
      return timeStringToSeconds(cleaned);
    })
    .filter(time => time > 0); // Only valid timestamps
  
  return timestamps;
}

/**
 * Generate slides from manual sections
 */
export async function generateSlidesFromSections(
  sections: ManualSection[],
  frameGroups: string[][],
  options: ManualGeneratorOptions
): Promise<Slide[]> {
  const slides: Slide[] = [];

  // Create title slide with chapter overview
  const titleSlide = createTitleSlide(sections, options);
  slides.push(titleSlide);

  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    if (section.level <= 2) { // Only create slides for main sections (h1, h2)
      const slide = await createSlideFromSection(section, frameGroups[index] || [], options, index + 1); // +1 for title slide
      slides.push(slide);
    }
  }

  return slides;
}

/**
 * Create title slide with chapter overview
 */
function createTitleSlide(
  sections: ManualSection[],
  options: ManualGeneratorOptions
): Slide {
  const { theme, background } = options;
  const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.professional;
  const slideBackground = theme === 'custom' ? (background || themeConfig.backgroundColor) : themeConfig.backgroundColor;
  const titleColor = themeConfig.titleColor || '#ffffff';
  const textColor = themeConfig.textColor || '#1e293b';
  
  // Find the main title (should be the first h1)
  const mainTitle = sections.find(s => s.level === 1)?.title || 'Manual';
  
  // Extract chapter titles (h1 sections, excluding the main title)
  const chapters = sections.filter(s => s.level === 1 && s.title !== mainTitle);
  
  const layers: (TextLayer | ImageLayer)[] = [];
  
  // Main title
  const titleLayer: TextLayer = {
    id: `title-main-${Date.now()}`,
    type: 'text',
    x: 5,
    y: 10,
    width: 90,
    height: 25,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    content: mainTitle,
    fontSize: 56,
    textStyleId: 'modern-bold-white',
    textAlign: 'center',
    textColor: titleColor
  };
  layers.push(titleLayer);
  
  // Chapter overview
  if (chapters.length > 0) {
    const chapterContent = chapters.map((chapter) => 
      chapter.title // Keep the original title format like "1. 新規ノートブックの作成とソースの追加"
    ).join('\n\n');
    
    const overviewLayer: TextLayer = {
      id: `title-overview-${Date.now()}`,
      type: 'text',
      x: 10,
      y: 45,
      width: 80,
      height: 45,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      content: `目次\n\n${chapterContent}`,
      fontSize: 28,
      textStyleId: 'professional-dark',
      textAlign: 'left',
      textColor: textColor
    };
    layers.push(overviewLayer);
  }
  
  return {
    id: `title-slide-${Date.now()}`,
    title: mainTitle,
    layers,
    background: slideBackground,
    aspectRatio: options.aspectRatio,
    notes: `Title slide with chapter overview for: ${mainTitle}`
  };
}

/**
 * Create a slide from a manual section
 */
async function createSlideFromSection(
  section: ManualSection,
  frames: string[],
  options: ManualGeneratorOptions,
  index: number
): Slide {
  const { imagePosition, textStyle, aspectRatio, theme, background } = options;
  const layers: (TextLayer | ImageLayer)[] = [];
  const slideId = `manual-slide-${index}-${Date.now()}`;
  
  // Get theme-based colors
  const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.professional;
  const slideBackground = theme === 'custom' ? (background || themeConfig.backgroundColor) : themeConfig.backgroundColor;
  const titleColor = themeConfig.titleColor || '#ffffff';
  const textColor = themeConfig.textColor || '#1e293b';

  // Create title layer
  const titleLayer: TextLayer = {
    id: `manual-title-${index}-${Date.now()}`,
    type: 'text',
    x: 5,
    y: 5,
    width: 90,
    height: 20,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    content: section.title,
    fontSize: 48,
    textStyleId: 'modern-bold-white',
    textAlign: 'left',
    textColor: titleColor
  };
  layers.push(titleLayer);

  // Create content layers based on image position
  if (imagePosition === 'top') {
    // Images on top, text below
    if (frames.length > 0) {
      const imageLayer = await createImageLayer(frames[0], index, 10, 30, 80, 35, 0);
      layers.push(imageLayer);
    }
    const textLayer = createTextLayer(section.content, index, 5, 70, 90, 25, textColor);
    layers.push(textLayer);
  } else if (imagePosition === 'bottom') {
    // Text on top, images below
    const textLayer = createTextLayer(section.content, index, 5, 30, 90, 40, textColor);
    layers.push(textLayer);
    if (frames.length > 0) {
      const imageLayer = await createImageLayer(frames[0], index, 10, 75, 80, 20, 0);
      layers.push(imageLayer);
    }
  } else if (imagePosition === 'left') {
    // Images on left, text on right
    if (frames.length > 0) {
      const imageLayer = await createImageLayer(frames[0], index, 5, 30, 40, 55, 0);
      layers.push(imageLayer);
    }
    const textLayer = createTextLayer(section.content, index, 50, 30, 45, 55, textColor);
    layers.push(textLayer);
  } else if (imagePosition === 'right') {
    // Text on left, images on right
    const textLayer = createTextLayer(section.content, index, 5, 30, 45, 55, textColor);
    layers.push(textLayer);
    if (frames.length > 0) {
      const imageLayer = await createImageLayer(frames[0], index, 55, 30, 40, 55, 0);
      layers.push(imageLayer);
    }
  }

  // Add additional frame layers as overlapping candidates
  if (frames.length > 1) {
    for (let i = 1; i < Math.min(frames.length, 3); i++) {
      const additionalImageLayer = await createImageLayer(
        frames[i],
        index,
        85 + (i - 1) * 5, // Slightly offset position
        5 + (i - 1) * 5,
        10,
        10,
        i // Pass the frame index to ensure unique ID
      );
      additionalImageLayer.opacity = 0.8; // Make them slightly transparent
      additionalImageLayer.zIndex = 10 + i;
      layers.push(additionalImageLayer);
    }
  }

  return {
    id: slideId,
    title: section.title,
    layers,
    background: slideBackground,
    aspectRatio,
    notes: `Generated from manual section: ${section.title}\nTimestamps: ${section.timestamps.map(t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2, '0')}`).join(', ')}`
  };
}

/**
 * Create text layer from content
 */
function createTextLayer(
  content: string,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  textColor: string = '#1e293b'
): TextLayer {
  // Clean up markdown formatting for display
  const cleanContent = content
    .replace(/^\s*-\s+/gm, '• ') // Convert bullet points
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
    .replace(/\b\d{1,2}:\d{2}\b/g, '') // Remove timestamps
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .trim();

  return {
    id: `manual-text-${index}-${Date.now()}`,
    type: 'text',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: 2,
    content: cleanContent,
    fontSize: 24,
    textStyleId: 'professional-dark',
    textAlign: 'left',
    textColor: textColor
  };
}

/**
 * Create image layer from frame data
 */
async function createImageLayer(
  frameData: string,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  frameIndex: number = 0
): Promise<ImageLayer> {
  // Get natural dimensions of the image
  const dimensions = await getImageDimensions(frameData);
  
  return {
    id: `manual-image-${index}-${frameIndex}-${Date.now()}`,
    type: 'image',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: 3,
    src: frameData,
    objectFit: 'cover',
    naturalWidth: dimensions.width,
    naturalHeight: dimensions.height,
    prompt: `Video frame from manual section ${index}, frame ${frameIndex}`
  };
}

/**
 * Get image dimensions from data URL
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // フォールバックとしてデフォルト値を返す
      console.warn('Failed to load image for dimensions, using defaults');
      resolve({ width: 1280, height: 720 });
    };
    img.src = dataUrl;
  });
}

/**
 * Create presentation from manual content
 */
export async function createPresentationFromManual(
  markdownContent: string,
  title: string,
  options: ManualGeneratorOptions
): Promise<{ sections: ManualSection[]; baseSlides: Slide[] }> {
  const sections = parseManualMarkdown(markdownContent);
  const baseSlides = await generateSlidesFromSections(sections, [], options);

  return {
    sections,
    baseSlides
  };
}

/**
 * Get default manual generator options
 */
export function getDefaultManualGeneratorOptions(): ManualGeneratorOptions {
  return {
    imagePosition: 'right',
    textStyle: 'professional-dark',
    aspectRatio: '16:9',
    theme: 'professional'
  };
}

/**
 * Validate manual generator input
 */
export function validateManualGeneratorInput(
  markdownContent: string,
  videoFile: File | null
): { valid: boolean; error?: string } {
  if (!markdownContent || markdownContent.trim().length === 0) {
    return { valid: false, error: 'Markdown content is required' };
  }

  if (!videoFile) {
    return { valid: false, error: 'Video file is required' };
  }

  if (!videoFile.type.startsWith('video/')) {
    return { valid: false, error: 'Selected file is not a video' };
  }

  const sections = parseManualMarkdown(markdownContent);
  if (sections.length === 0) {
    return { valid: false, error: 'No sections found in markdown content' };
  }

  const sectionsWithTimestamps = sections.filter(s => s.timestamps.length > 0);
  if (sectionsWithTimestamps.length === 0) {
    return { valid: false, error: 'No timestamps found in markdown content' };
  }

  return { valid: true };
}