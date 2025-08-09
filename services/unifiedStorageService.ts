// =================================================================
// Unified Storage Service - IndexedDB + localStorage統合管理
// 新しいプロジェクトはIndexedDB、既存データはlocalStorageから移行
// =================================================================

import { Presentation } from '../types';
import * as legacyStorage from './storageService';

// IndexedDB service (dynamic import for better performance)
let indexedDBService: any = null;

const getIndexedDBService = async () => {
  if (!indexedDBService) {
    indexedDBService = await import('./indexedDBStorage');
    await indexedDBService.initializeDB();
  }
  return indexedDBService;
};

// =================================================================
// Unified Storage Interface
// =================================================================

export const savePresentation = async (presentation: Presentation): Promise<void> => {
  try {
    // Try IndexedDB first (new storage system)
    const idbService = await getIndexedDBService();
    await idbService.savePresentation(presentation);
    console.log(`✅ Presentation saved to IndexedDB: ${presentation.title}`);
  } catch (error) {
    console.warn('IndexedDB save failed, falling back to localStorage:', error);
    // Fallback to localStorage (legacy system)
    await legacyStorage.savePresentation(presentation);
  }
};

export const loadPresentation = async (id: string): Promise<Presentation | null> => {
  try {
    // Try IndexedDB first
    const idbService = await getIndexedDBService();
    const presentation = await idbService.loadPresentation(id);
    if (presentation) {
      console.log(`✅ Presentation loaded from IndexedDB: ${presentation.title}`);
      return presentation;
    }
  } catch (error) {
    console.warn('IndexedDB load failed, trying localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const presentation = await legacyStorage.loadPresentation(id);
    if (presentation) {
      console.log(`✅ Presentation loaded from localStorage: ${presentation.title}`);
      
      // Auto-migrate to IndexedDB for future use
      try {
        const idbService = await getIndexedDBService();
        await idbService.savePresentation(presentation);
        console.log(`📦 Auto-migrated to IndexedDB: ${presentation.title}`);
      } catch (migrationError) {
        console.warn('Auto-migration failed:', migrationError);
      }
      
      return presentation;
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }

  return null;
};

export const deletePresentation = async (id: string): Promise<void> => {
  const errors: Error[] = [];

  // Try to delete from IndexedDB
  try {
    const idbService = await getIndexedDBService();
    await idbService.deletePresentation(id);
    console.log(`✅ Presentation deleted from IndexedDB: ${id}`);
  } catch (error) {
    console.warn('IndexedDB delete failed:', error);
    errors.push(error as Error);
  }

  // Try to delete from localStorage
  try {
    await legacyStorage.deletePresentation(id);
    console.log(`✅ Presentation deleted from localStorage: ${id}`);
  } catch (error) {
    console.warn('localStorage delete failed:', error);
    errors.push(error as Error);
  }

  if (errors.length === 2) {
    throw new Error('Failed to delete presentation from both storage systems');
  }
};

export const listPresentations = async (): Promise<Presentation[]> => {
  const presentations: Presentation[] = [];
  const seenIds = new Set<string>();

  // Get from IndexedDB first
  try {
    const idbService = await getIndexedDBService();
    const idbPresentations = await idbService.getAllPresentations();
    for (const presentation of idbPresentations) {
      presentations.push(presentation);
      seenIds.add(presentation.id);
    }
  } catch (error) {
    console.warn('Failed to list presentations from IndexedDB:', error);
  }

  // Get from localStorage and merge (avoiding duplicates)
  try {
    const localPresentations = await legacyStorage.listPresentations();
    for (const presentation of localPresentations) {
      if (!seenIds.has(presentation.id)) {
        presentations.push(presentation);
        seenIds.add(presentation.id);
      }
    }
  } catch (error) {
    console.warn('Failed to list presentations from localStorage:', error);
  }

  // Sort by last modified date
  presentations.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - 
    new Date(a.updatedAt || a.createdAt).getTime()
  );

  return presentations;
};

export const duplicatePresentation = async (id: string): Promise<string> => {
  const presentation = await loadPresentation(id);
  if (!presentation) {
    throw new Error('Presentation not found');
  }

  const duplicate: Presentation = {
    ...presentation,
    id: `duplicate_${Date.now()}`,
    title: `${presentation.title} (Copy)`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await savePresentation(duplicate);
  return duplicate.id;
};

// =================================================================
// Storage Usage and Management
// =================================================================

export const getStorageUsage = async (): Promise<{
  indexedDB: any;
  localStorage: any;
  total: {
    size: number;
    presentationCount: number;
  };
}> => {
  let indexedDBUsage = {
    totalSize: 0,
    presentationsSize: 0,
    imagesSize: 0,
    presentationCount: 0,
    imageCount: 0
  };

  let localStorageUsage = {
    used: 0,
    quota: 0,
    presentationCount: 0
  };

  try {
    const idbService = await getIndexedDBService();
    indexedDBUsage = await idbService.getStorageUsage();
  } catch (error) {
    console.warn('Failed to get IndexedDB usage:', error);
  }

  try {
    const localPresentations = await legacyStorage.listPresentations();
    localStorageUsage.presentationCount = localPresentations.length;
    // Note: Getting localStorage quota requires different approach
  } catch (error) {
    console.warn('Failed to get localStorage usage:', error);
  }

  return {
    indexedDB: indexedDBUsage,
    localStorage: localStorageUsage,
    total: {
      size: indexedDBUsage.totalSize,
      presentationCount: indexedDBUsage.presentationCount + localStorageUsage.presentationCount
    }
  };
};

export const performCleanupAndMigration = async (): Promise<{
  migrated: number;
  errors: string[];
}> => {
  const results = {
    migrated: 0,
    errors: [] as string[]
  };

  try {
    // Get all presentations from localStorage
    const localPresentations = await legacyStorage.listPresentations();
    
    for (const presentation of localPresentations) {
      try {
        // Check if already in IndexedDB
        const idbService = await getIndexedDBService();
        const existing = await idbService.loadPresentation(presentation.id);
        
        if (!existing) {
          // Migrate to IndexedDB
          await idbService.savePresentation(presentation);
          results.migrated++;
          console.log(`📦 Migrated: ${presentation.title}`);
        }
      } catch (error) {
        const errorMsg = `Failed to migrate ${presentation.title}: ${error}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`✅ Migration completed: ${results.migrated} presentations migrated`);
  } catch (error) {
    results.errors.push(`Migration process failed: ${error}`);
  }

  return results;
};

// Re-export legacy functions for backward compatibility
export { 
  getStorageItem, 
  setStorageItem, 
  removeStorageItem,
  getRecentFiles
} from './storageService';