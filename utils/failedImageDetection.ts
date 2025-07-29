// =================================================================
// Failed Image Detection Utility
// =================================================================

import { Presentation, Slide, ImageLayer, Layer } from '../types';

/**
 * 失敗した画像を表すインターフェース
 */
export interface FailedImage {
  slideId: string;
  layerId: string;
  slideIndex: number;
  slideTitle: string;
  prompt: string;
  src: string;
  position: { x: number; y: number; width: number; height: number };
}

/**
 * 画像が失敗しているかどうかを判定
 */
export const isFailedImage = (layer: ImageLayer): boolean => {
  if (layer.type !== 'image') return false;
  
  // srcが空の場合
  if (!layer.src || layer.src.trim() === '') return true;
  
  // srcに"failed"や"error"が含まれている場合
  const src = layer.src.toLowerCase();
  if (src.includes('failed') || src.includes('error')) return true;
  
  // placehold.coなどのプレースホルダー画像の場合
  if (src.includes('placehold.co') || src.includes('placeholder')) return true;
  
  // data:image/なしでbase64ではない場合（無効なsrc）
  if (!src.startsWith('data:image/') && !src.startsWith('http')) return true;
  
  // promptが設定されているのにsrcが有効でない場合
  if (layer.prompt && layer.prompt.trim() !== '' && 
      (src.includes('no+image') || src.includes('no-image'))) return true;
  
  return false;
};

/**
 * スライド内の失敗した画像を検出
 */
export const detectFailedImagesInSlide = (slide: Slide, slideIndex: number): FailedImage[] => {
  const failedImages: FailedImage[] = [];
  
  slide.layers.forEach((layer: Layer) => {
    if (layer.type === 'image' && isFailedImage(layer as ImageLayer)) {
      const imageLayer = layer as ImageLayer;
      failedImages.push({
        slideId: slide.id,
        layerId: layer.id,
        slideIndex,
        slideTitle: slide.title,
        prompt: imageLayer.prompt || 'No prompt available',
        src: imageLayer.src,
        position: {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height
        }
      });
    }
  });
  
  return failedImages;
};

/**
 * プレゼンテーション全体から失敗した画像を検出
 */
export const detectFailedImages = (presentation: Presentation | null): FailedImage[] => {
  if (!presentation) return [];
  
  const allFailedImages: FailedImage[] = [];
  
  presentation.slides.forEach((slide, index) => {
    const slideFailedImages = detectFailedImagesInSlide(slide, index);
    allFailedImages.push(...slideFailedImages);
  });
  
  return allFailedImages;
};

/**
 * 失敗画像の統計情報を取得
 */
export const getFailedImageStatistics = (presentation: Presentation | null) => {
  const failedImages = detectFailedImages(presentation);
  
  const totalImages = presentation?.slides.reduce((count, slide) => {
    return count + slide.layers.filter(layer => layer.type === 'image').length;
  }, 0) || 0;
  
  const failedCount = failedImages.length;
  const successCount = totalImages - failedCount;
  const successRate = totalImages > 0 ? (successCount / totalImages) * 100 : 100;
  
  const slideStats = presentation?.slides.map((slide, index) => {
    const slideFailedImages = detectFailedImagesInSlide(slide, index);
    const slideImages = slide.layers.filter(layer => layer.type === 'image').length;
    return {
      slideIndex: index,
      slideTitle: slide.title,
      totalImages: slideImages,
      failedImages: slideFailedImages.length,
      successRate: slideImages > 0 ? ((slideImages - slideFailedImages.length) / slideImages) * 100 : 100
    };
  }) || [];
  
  return {
    totalImages,
    failedCount,
    successCount,
    successRate,
    slideStats,
    failedImages
  };
};

/**
 * 失敗画像のプロンプトリストを取得（重複除去）
 */
export const getUniqueFailedPrompts = (presentation: Presentation | null): string[] => {
  const failedImages = detectFailedImages(presentation);
  const prompts = failedImages
    .map(img => img.prompt)
    .filter(prompt => prompt && prompt.trim() !== '')
    .filter((prompt, index, arr) => arr.indexOf(prompt) === index); // 重複除去
  
  return prompts;
};