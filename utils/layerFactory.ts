// =================================================================
// Layer Factory - Create layers from templates (Restored from backup)
// =================================================================

import { Layer, TextLayer, ImageLayer } from '../types';
import { DEFAULT_LAYER_PROPS } from '../constants';
import { LayoutTemplate } from './layoutTemplates';

/**
 * Create a layer from template configuration
 */
export const createLayerFromTemplate = (
  layerType: 'title' | 'content' | 'content2' | 'image' | 'image2' | 'choice',
  template: any,
  content: string,
  zIndex: number
): Layer => {
  const baseLayer = {
    id: `${layerType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x: template.x || 10,
    y: template.y || 10,
    width: template.width || 80,
    height: template.height || 20,
    rotation: 0,
    opacity: 1,
    zIndex,
  };

  if (layerType === 'image' || layerType === 'image2') {
    return {
      ...baseLayer,
      type: 'image',
      src: '', // Will be filled by image generation
      prompt: content || DEFAULT_LAYER_PROPS.image.prompt,
      objectFit: DEFAULT_LAYER_PROPS.image.objectFit,
    } as ImageLayer;
  } else {
    return {
      ...baseLayer,
      type: 'text',
      content: content || DEFAULT_LAYER_PROPS.text.content,
      fontSize: template.fontSize || DEFAULT_LAYER_PROPS.text.fontSize,
      fontFamily: 'Inter, sans-serif',
      fontWeight: layerType === 'title' ? 'bold' : 'normal',
      textStyleId: DEFAULT_LAYER_PROPS.text.textStyleId,
      textColor: '#000000',
      textAlign: template.textAlign || DEFAULT_LAYER_PROPS.text.textAlign,
    } as TextLayer;
  }
};

/**
 * Create all layers for a slide based on template and content
 */
export const createLayersFromTemplate = (
  template: LayoutTemplate,
  slideData: {
    title?: string;
    content?: string;
    imagePrompt?: string;
  },
  startZIndex: number = 0
): Layer[] => {
  const layers: Layer[] = [];
  let zIndex = startZIndex;

  // Create title layer
  if (template.title && slideData.title) {
    const titleLayer = createLayerFromTemplate('title', template.title, slideData.title, zIndex++);
    layers.push(titleLayer);
  }

  // Create content layer
  if (template.content && slideData.content) {
    const contentLayer = createLayerFromTemplate('content', template.content, slideData.content, zIndex++);
    layers.push(contentLayer);
  }

  // Create second content layer (for two-column layouts)
  if (template.content2 && slideData.content) {
    // Split content for two-column layout
    const lines = slideData.content.split('\n');
    const midPoint = Math.ceil(lines.length / 2);
    const secondContent = lines.slice(midPoint).join('\n');
    
    if (secondContent.trim()) {
      const content2Layer = createLayerFromTemplate('content2', template.content2, secondContent, zIndex++);
      layers.push(content2Layer);
      
      // Update first content layer with first half
      const firstContent = lines.slice(0, midPoint).join('\n');
      const contentLayer = layers.find(l => l.id.startsWith('content-'));
      if (contentLayer && contentLayer.type === 'text') {
        (contentLayer as TextLayer).content = firstContent;
      }
    }
  }

  // Create image layers (will be populated with actual images later)
  if (template.image && slideData.imagePrompt) {
    const imageLayer = createLayerFromTemplate('image', template.image, slideData.imagePrompt, zIndex++);
    layers.push(imageLayer);
  }

  if (template.image2 && slideData.imagePrompt) {
    const image2Layer = createLayerFromTemplate('image2', template.image2, slideData.imagePrompt, zIndex++);
    layers.push(image2Layer);
  }

  // Create choice layer (for game content)
  if (template.choice) {
    const choiceContent = extractChoiceContent(slideData.content || '');
    if (choiceContent) {
      const choiceLayer = createLayerFromTemplate('choice', template.choice, choiceContent, zIndex++);
      layers.push(choiceLayer);
    }
  }

  return layers;
};

/**
 * Extract choice/interaction content from slide content
 */
const extractChoiceContent = (content: string): string | null => {
  // Look for choice patterns in content
  const choicePatterns = [
    /選択肢[:：]\s*(.+)/,
    /Choose[:：]\s*(.+)/,
    /What will you do\?\s*(.+)/,
    /次の行動[:：]\s*(.+)/,
  ];

  for (const pattern of choicePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Look for numbered choices
  const lines = content.split('\n');
  const choiceLines = lines.filter(line => /^\d+[\.)]\s/.test(line.trim()));
  if (choiceLines.length > 0) {
    return choiceLines.join(' | ');
  }

  return null;
};