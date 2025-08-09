// =================================================================
// Project Image Handler - 画像処理専門サービス
// プロジェクトエクスポート時の画像抽出・変換機能
// =================================================================

import JSZip from 'jszip';
import { Presentation } from '../../types';

/**
 * Add project images to ZIP file by extracting them from presentation data
 * Handles both base64 embedded images and IndexedDB references
 */
export const addProjectImages = async (zip: JSZip, presentation: Presentation): Promise<void> => {
  try {
    const imagesFolder = zip.folder('images');
    if (!imagesFolder) {
      console.warn('Failed to create images folder in ZIP');
      return;
    }

    let imageCount = 0;
    const processedImages = new Set<string>();

    // Process all slides and their layers
    for (const slide of presentation.slides) {
      for (const layer of slide.layers) {
        if (layer.type === 'image' && layer.src) {
          // Skip if already processed
          const imageKey = layer.src.substring(0, 100); // Use first 100 chars as key
          if (processedImages.has(imageKey)) continue;
          
          try {
            if (layer.src.startsWith('data:')) {
              // Handle base64 embedded images (legacy format)
              await addBase64Image(imagesFolder, layer.src, layer.id, imageCount);
              imageCount++;
              processedImages.add(imageKey);
              
            } else if (layer.src.startsWith('indexeddb://')) {
              // Handle IndexedDB references (new format)
              await addIndexedDBImage(imagesFolder, layer.src, layer.id, imageCount);
              imageCount++;
              processedImages.add(imageKey);
              
            } else if (layer.src.startsWith('http://') || layer.src.startsWith('https://')) {
              // Handle external URLs - download and include
              await addExternalImage(imagesFolder, layer.src, layer.id, imageCount);
              imageCount++;
              processedImages.add(imageKey);
              
            } else {
              console.warn(`Unknown image source format: ${layer.src.substring(0, 50)}...`);
            }
          } catch (error) {
            console.warn(`Failed to process image for layer ${layer.id}:`, error);
          }
        }
      }
    }

    console.log(`📷 Added ${imageCount} images to project export`);
    
  } catch (error) {
    console.error('Error adding project images:', error);
    // Don't fail the entire export if image processing fails
  }
};

/**
 * Add base64 image to ZIP
 */
const addBase64Image = async (
  imagesFolder: JSZip, 
  dataUrl: string, 
  layerId: string, 
  index: number
): Promise<void> => {
  try {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
    const extension = mimeType.split('/')[1] || 'png';
    
    const filename = `image_${index}_${layerId}.${extension}`;
    const binaryData = atob(data);
    const bytes = new Uint8Array(binaryData.length);
    
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    imagesFolder.file(filename, bytes);
    console.log(`Added base64 image: ${filename}`);
    
  } catch (error) {
    console.warn('Failed to add base64 image:', error);
  }
};

/**
 * Add IndexedDB referenced image to ZIP
 */
const addIndexedDBImage = async (
  imagesFolder: JSZip,
  indexedDbRef: string,
  layerId: string,
  index: number
): Promise<void> => {
  try {
    // Import IndexedDB service dynamically to avoid circular dependencies
    const { default: db } = await import('../indexedDBStorage');
    
    const imageId = indexedDbRef.replace('indexeddb://', '');
    const imageRecord = await db.images.get(imageId);
    
    if (imageRecord) {
      const extension = imageRecord.type.split('/')[1] || 'png';
      const filename = `image_${index}_${layerId}.${extension}`;
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await imageRecord.data.arrayBuffer();
      
      imagesFolder.file(filename, arrayBuffer);
      console.log(`Added IndexedDB image: ${filename} (${imageRecord.size} bytes)`);
    } else {
      console.warn(`IndexedDB image not found: ${imageId}`);
    }
    
  } catch (error) {
    console.warn('Failed to add IndexedDB image:', error);
  }
};

/**
 * Add external image to ZIP by downloading it
 */
const addExternalImage = async (
  imagesFolder: JSZip,
  url: string,
  layerId: string,
  index: number
): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const extension = blob.type.split('/')[1] || 'png';
    const filename = `image_${index}_${layerId}.${extension}`;
    
    const arrayBuffer = await blob.arrayBuffer();
    imagesFolder.file(filename, arrayBuffer);
    console.log(`Added external image: ${filename} (${blob.size} bytes)`);
    
  } catch (error) {
    console.warn(`Failed to download external image ${url}:`, error);
  }
};

/**
 * Get image statistics for a presentation
 */
export const getImageStatistics = (presentation: Presentation): {
  totalImages: number;
  base64Images: number;
  indexedDbImages: number;
  externalImages: number;
  unknownImages: number;
} => {
  let totalImages = 0;
  let base64Images = 0;
  let indexedDbImages = 0;
  let externalImages = 0;
  let unknownImages = 0;

  const processedSources = new Set<string>();

  for (const slide of presentation.slides) {
    for (const layer of slide.layers) {
      if (layer.type === 'image' && layer.src) {
        const imageKey = layer.src.substring(0, 100);
        if (processedSources.has(imageKey)) continue;
        
        processedSources.add(imageKey);
        totalImages++;

        if (layer.src.startsWith('data:')) {
          base64Images++;
        } else if (layer.src.startsWith('indexeddb://')) {
          indexedDbImages++;
        } else if (layer.src.startsWith('http://') || layer.src.startsWith('https://')) {
          externalImages++;
        } else {
          unknownImages++;
        }
      }
    }
  }

  return {
    totalImages,
    base64Images,
    indexedDbImages,
    externalImages,
    unknownImages
  };
};