// =================================================================
// IndexedDB Storage Service - IndexedDBを使用した高容量ストレージ
// Dexie.jsを使用してプレゼンテーションデータと画像を効率的に管理
// =================================================================

import Dexie, { Table } from 'dexie';
import { Presentation } from '../types';

// =================================================================
// Database Schema Definitions
// =================================================================

export interface StoredPresentation extends Presentation {
  // IndexedDB用の追加メタデータ
  metadata: {
    version: string;
    lastModified: Date;
    size: number;
    imageCount: number;
    thumbnailId?: string;
  };
}

export interface StoredImage {
  id: string;
  presentationId: string;
  layerId: string;
  data: Blob;
  type: string; // 'image/png', 'image/jpeg', etc.
  size: number;
  createdAt: Date;
}

export interface ProjectThumbnail {
  id: string;
  presentationId: string;
  data: Blob;
  createdAt: Date;
}

export interface StorageUsageInfo {
  totalSize: number;
  presentationsSize: number;
  imagesSize: number;
  thumbnailsSize: number;
  presentationCount: number;
  imageCount: number;
  projectBreakdown: ProjectStorageInfo[];
}

export interface ProjectStorageInfo {
  id: string;
  title: string;
  presentationSize: number;
  imageSize: number;
  imageCount: number;
  totalSize: number;
  lastModified: Date;
}

// =================================================================
// Dexie Database Class
// =================================================================

class SlideMasterDB extends Dexie {
  presentations!: Table<StoredPresentation>;
  images!: Table<StoredImage>;
  thumbnails!: Table<ProjectThumbnail>;

  constructor() {
    super('SlideMasterDB');
    
    this.version(1).stores({
      presentations: '++id, title, createdAt, updatedAt, metadata.lastModified',
      images: '++id, presentationId, layerId, size, createdAt',
      thumbnails: '++id, presentationId, createdAt'
    });
  }
}

// Database instance
const db = new SlideMasterDB();

// =================================================================
// Presentation Management Functions
// =================================================================

export const savePresentation = async (presentation: Presentation): Promise<void> => {
  try {
    // 画像データを分離してBlobとして保存
    const { presentationData, imageBlobs } = await separateImageData(presentation);
    
    // プレゼンテーションメタデータを保存
    const storedPresentation: StoredPresentation = {
      ...presentationData,
      updatedAt: new Date(),
      metadata: {
        version: '1.0.0',
        lastModified: new Date(),
        size: JSON.stringify(presentationData).length,
        imageCount: imageBlobs.length
      }
    };

    await db.transaction('rw', db.presentations, db.images, async () => {
      // 古い画像データを削除
      await db.images.where('presentationId').equals(presentation.id).delete();
      
      // プレゼンテーションデータを保存
      await db.presentations.put(storedPresentation);
      
      // 画像データを個別に保存
      for (const imageBlob of imageBlobs) {
        await db.images.add(imageBlob);
      }
    });

    console.log(`✅ Presentation saved to IndexedDB: ${presentation.title}`);
  } catch (error) {
    console.error('Error saving presentation to IndexedDB:', error);
    throw new Error('Failed to save presentation to IndexedDB');
  }
};

export const loadPresentation = async (id: string): Promise<Presentation | null> => {
  try {
    const storedPresentation = await db.presentations.get(id);
    if (!storedPresentation) return null;

    // 画像データを復元
    const images = await db.images.where('presentationId').equals(id).toArray();
    const presentation = await restoreImageData(storedPresentation, images);

    console.log(`✅ Presentation loaded from IndexedDB: ${presentation.title}`);
    return presentation;
  } catch (error) {
    console.error('Error loading presentation from IndexedDB:', error);
    return null;
  }
};

export const getAllPresentations = async (): Promise<StoredPresentation[]> => {
  try {
    const presentations = await db.presentations
      .orderBy('metadata.lastModified')
      .reverse()
      .toArray();
    return presentations;
  } catch (error) {
    console.error('Error loading presentations from IndexedDB:', error);
    return [];
  }
};

export const deletePresentation = async (id: string): Promise<void> => {
  try {
    await db.transaction('rw', db.presentations, db.images, db.thumbnails, async () => {
      await db.presentations.delete(id);
      await db.images.where('presentationId').equals(id).delete();
      await db.thumbnails.where('presentationId').equals(id).delete();
    });
    console.log(`✅ Presentation deleted from IndexedDB: ${id}`);
  } catch (error) {
    console.error('Error deleting presentation from IndexedDB:', error);
    throw new Error('Failed to delete presentation');
  }
};

export const duplicatePresentation = async (id: string): Promise<string> => {
  try {
    const original = await loadPresentation(id);
    if (!original) throw new Error('Original presentation not found');

    const duplicate: Presentation = {
      ...original,
      id: `duplicate_${Date.now()}`,
      title: `${original.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await savePresentation(duplicate);
    return duplicate.id;
  } catch (error) {
    console.error('Error duplicating presentation:', error);
    throw new Error('Failed to duplicate presentation');
  }
};

// =================================================================
// Storage Usage Analysis
// =================================================================

export const getStorageUsage = async (): Promise<StorageUsageInfo> => {
  try {
    const presentations = await db.presentations.toArray();
    const images = await db.images.toArray();
    const thumbnails = await db.thumbnails.toArray();

    const presentationsSize = presentations.reduce((sum, p) => sum + p.metadata.size, 0);
    const imagesSize = images.reduce((sum, img) => sum + img.size, 0);
    const thumbnailsSize = thumbnails.reduce((sum, thumb) => sum + thumb.data.size, 0);

    // Calculate per-project breakdown
    const projectBreakdown: ProjectStorageInfo[] = presentations.map(presentation => {
      const projectImages = images.filter(img => img.presentationId === presentation.id);
      const projectImageSize = projectImages.reduce((sum, img) => sum + img.size, 0);
      
      return {
        id: presentation.id,
        title: presentation.title,
        presentationSize: presentation.metadata.size,
        imageSize: projectImageSize,
        imageCount: projectImages.length,
        totalSize: presentation.metadata.size + projectImageSize,
        lastModified: presentation.metadata.lastModified
      };
    }).sort((a, b) => b.totalSize - a.totalSize); // Sort by size descending

    return {
      totalSize: presentationsSize + imagesSize + thumbnailsSize,
      presentationsSize,
      imagesSize,
      thumbnailsSize,
      presentationCount: presentations.length,
      imageCount: images.length,
      projectBreakdown
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return {
      totalSize: 0,
      presentationsSize: 0,
      imagesSize: 0,
      thumbnailsSize: 0,
      presentationCount: 0,
      imageCount: 0,
      projectBreakdown: []
    };
  }
};

// =================================================================
// Image Data Handling Utilities
// =================================================================

const separateImageData = async (presentation: Presentation): Promise<{
  presentationData: Presentation;
  imageBlobs: StoredImage[];
}> => {
  const imageBlobs: StoredImage[] = [];
  const presentationData: Presentation = { ...presentation };

  // スライド内の画像レイヤーを処理
  presentationData.slides = presentation.slides.map(slide => ({
    ...slide,
    layers: slide.layers.map(layer => {
      if (layer.type === 'image' && layer.src && layer.src.startsWith('data:')) {
        // Base64データをBlobに変換
        const [header, data] = layer.src.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
        const binaryData = atob(data);
        const bytes = new Uint8Array(binaryData.length);
        
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: mimeType });
        const imageId = `img_${layer.id}_${Date.now()}`;
        
        imageBlobs.push({
          id: imageId,
          presentationId: presentation.id,
          layerId: layer.id,
          data: blob,
          type: mimeType,
          size: blob.size,
          createdAt: new Date()
        });

        // 画像レイヤーのsrcを参照IDに置き換え
        return {
          ...layer,
          src: `indexeddb://${imageId}`
        };
      }
      return layer;
    })
  }));

  return { presentationData, imageBlobs };
};

const restoreImageData = async (
  storedPresentation: StoredPresentation,
  images: StoredImage[]
): Promise<Presentation> => {
  const presentation: Presentation = { ...storedPresentation };
  const imageMap = new Map(images.map(img => [img.id, img]));

  // スライド内の画像レイヤーを復元
  presentation.slides = storedPresentation.slides.map(slide => ({
    ...slide,
    layers: slide.layers.map(layer => {
      if (layer.type === 'image' && layer.src && layer.src.startsWith('indexeddb://')) {
        const imageId = layer.src.replace('indexeddb://', '');
        const imageData = imageMap.get(imageId);
        
        if (imageData) {
          // BlobをBase64に変換
          return new Promise<typeof layer>(async (resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                ...layer,
                src: reader.result as string
              });
            };
            reader.readAsDataURL(imageData.data);
          });
        }
      }
      return layer;
    })
  }));

  // Promise.allで全ての画像復元を待機
  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    const layers = await Promise.all(slide.layers.map(async (layer) => {
      if (layer instanceof Promise) {
        return await layer;
      }
      return layer;
    }));
    presentation.slides[i] = { ...slide, layers };
  }

  return presentation;
};

// =================================================================
// Migration from localStorage
// =================================================================

export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const localStorageKey = 'slidemaster_presentations';
    const localData = localStorage.getItem(localStorageKey);
    
    if (!localData) {
      console.log('No localStorage data to migrate');
      return;
    }

    const presentations = JSON.parse(localData);
    if (!Array.isArray(presentations)) {
      console.warn('Invalid localStorage data format');
      return;
    }

    console.log(`🚀 Migrating ${presentations.length} presentations from localStorage...`);

    for (const presentation of presentations) {
      try {
        await savePresentation(presentation);
        console.log(`✅ Migrated: ${presentation.title}`);
      } catch (error) {
        console.error(`❌ Failed to migrate: ${presentation.title}`, error);
      }
    }

    console.log('✅ Migration completed successfully');
    
    // バックアップとして localStorage データを保持（一旦削除はしない）
    console.log('📦 localStorage data preserved as backup');
    
  } catch (error) {
    console.error('Error during migration from localStorage:', error);
    throw new Error('Migration failed');
  }
};

// =================================================================
// Database Initialization
// =================================================================

export const initializeDB = async (): Promise<void> => {
  try {
    await db.open();
    console.log('✅ IndexedDB initialized successfully');
    
    // Check if migration is needed
    const presentationCount = await db.presentations.count();
    if (presentationCount === 0) {
      await migrateFromLocalStorage();
    }
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    throw new Error('Failed to initialize database');
  }
};

export default db;