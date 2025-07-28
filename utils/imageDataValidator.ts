// =================================================================
// Image Data Validator - 画像データの検証と正規化ユーティリティ
// =================================================================

import { ImageLayer, Slide, Presentation } from '../types';

/**
 * 画像データが有効かどうかを検証
 */
export function isValidImageData(src: string | undefined | null): boolean {
  if (!src || typeof src !== 'string' || src.trim().length === 0) {
    return false;
  }

  // Base64データの基本チェック
  if (src.startsWith('data:image/')) {
    const base64Part = src.split(',')[1];
    if (!base64Part || base64Part.length === 0) {
      return false;
    }
    
    // Base64文字の基本的な妥当性チェック
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Part);
  }

  // URL形式の場合（プレースホルダー等）
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      new URL(src);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * プレースホルダー画像を生成
 */
export function createPlaceholderImage(
  width: number = 1280, 
  height: number = 720, 
  text: string = 'Image+Generation+Failed'
): string {
  return `https://placehold.co/${width}x${height}/f0f0f0/666666?text=${encodeURIComponent(text)}`;
}

/**
 * 不正な画像データをプレースホルダーに置換
 */
export function sanitizeImageData(src: string | undefined | null, fallbackText?: string): string {
  if (isValidImageData(src)) {
    return src!;
  }

  console.warn('Invalid image data detected, replacing with placeholder:', {
    originalSrc: src,
    type: typeof src,
    length: src?.length || 0
  });

  return createPlaceholderImage(1280, 720, fallbackText || 'Image+Not+Available');
}

/**
 * 画像レイヤーの画像データを検証・修正
 */
export function sanitizeImageLayer(layer: ImageLayer): ImageLayer {
  const sanitizedSrc = sanitizeImageData(layer.src, 'Generated+Image+Failed');
  
  if (sanitizedSrc !== layer.src) {
    console.warn(`Image layer ${layer.id} had invalid src, replaced with placeholder`);
  }

  return {
    ...layer,
    src: sanitizedSrc
  };
}

/**
 * スライド内の全画像レイヤーを検証・修正
 */
export function sanitizeSlideImages(slide: Slide): Slide {
  const sanitizedLayers = slide.layers.map(layer => {
    if (layer.type === 'image') {
      return sanitizeImageLayer(layer as ImageLayer);
    }
    return layer;
  });

  return {
    ...slide,
    layers: sanitizedLayers
  };
}

/**
 * プレゼンテーション全体の画像データを検証・修正
 */
export function sanitizePresentationImages(presentation: Presentation): {
  presentation: Presentation;
  sanitizedCount: number;
  errors: string[];
} {
  let sanitizedCount = 0;
  const errors: string[] = [];

  const sanitizedSlides = presentation.slides.map((slide, slideIndex) => {
    const sanitizedSlide = sanitizeSlideImages(slide);
    
    // 修正された画像レイヤーをカウント
    slide.layers.forEach((originalLayer, layerIndex) => {
      if (originalLayer.type === 'image') {
        const originalImageLayer = originalLayer as ImageLayer;
        const sanitizedImageLayer = sanitizedSlide.layers[layerIndex] as ImageLayer;
        
        if (originalImageLayer.src !== sanitizedImageLayer.src) {
          sanitizedCount++;
          errors.push(`Slide ${slideIndex + 1}, Layer ${layerIndex + 1}: Invalid image data replaced`);
        }
      }
    });

    return sanitizedSlide;
  });

  return {
    presentation: {
      ...presentation,
      slides: sanitizedSlides
    },
    sanitizedCount,
    errors
  };
}

/**
 * 画像データのサイズを概算（バイト）
 */
export function estimateImageSize(src: string): number {
  if (!src || typeof src !== 'string') {
    return 0;
  }

  if (src.startsWith('data:image/')) {
    const base64Part = src.split(',')[1];
    if (base64Part) {
      // Base64は4文字で3バイトを表現するため、概算サイズを計算
      return Math.floor(base64Part.length * 3 / 4);
    }
  }

  // URL形式の場合は推定不可
  return 0;
}

/**
 * 画像データの詳細情報を取得
 */
export function getImageInfo(src: string): {
  isValid: boolean;
  type: 'base64' | 'url' | 'invalid';
  format?: string;
  estimatedSize: number;
  hasTransparency?: boolean;
} {
  if (!isValidImageData(src)) {
    return {
      isValid: false,
      type: 'invalid',
      estimatedSize: 0
    };
  }

  if (src.startsWith('data:image/')) {
    const mimeType = src.substring(5, src.indexOf(';'));
    const hasTransparency = mimeType === 'png' || mimeType === 'gif' || mimeType === 'webp';
    
    return {
      isValid: true,
      type: 'base64',
      format: mimeType,
      estimatedSize: estimateImageSize(src),
      hasTransparency
    };
  }

  return {
    isValid: true,
    type: 'url',
    estimatedSize: 0
  };
}