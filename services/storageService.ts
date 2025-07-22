import { Presentation, Slide, Layer, FileFormatVersion, VersionCompatibility } from '../types';
import { STORAGE_KEYS } from '../constants';
import { 
  createVersionMetadata, 
  updateVersionMetadata, 
  checkVersionCompatibility,
  validateFileFormat,
  upgradePresentation,
  getVersionString,
  CURRENT_FILE_FORMAT_VERSION,
  APP_VERSION
} from '../utils/versionManager';

// =================================================================
// Storage Service for SlideMaster
// =================================================================

export interface StorageMetadata {
  version: string;
  lastModified: Date;
  size: number;
}

export interface StoredPresentation extends Presentation {
  metadata: StorageMetadata;
}

// =================================================================
// Local Storage Operations
// =================================================================

const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    // Parse and restore dates
    const parsed = JSON.parse(item, (key, val) => {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return new Date(val);
      }
      return val;
    });
    
    return parsed;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    // Serialize dates and handle potential circular references
    const serializedValue = JSON.stringify(value, (key, val) => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    });
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up space.');
      } else if (error.message.includes('circular')) {
        throw new Error('Data contains circular references and cannot be saved.');
      }
    }
    throw new Error('Failed to save data to local storage');
  }
};

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

// =================================================================
// Presentation Storage
// =================================================================

export const savePresentation = async (presentation: Presentation): Promise<void> => {
  try {
    const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
    
    // Optimize the presentation data before saving to reduce storage usage
    const optimizedPresentation = optimizeData(presentation);
    
    // Update version metadata
    const versionMetadata = optimizedPresentation.version 
      ? updateVersionMetadata(optimizedPresentation)
      : createVersionMetadata();
    
    // Create a clean copy of the presentation without circular references
    const cleanPresentation = {
      id: optimizedPresentation.id,
      title: optimizedPresentation.title,
      description: optimizedPresentation.description,
      theme: optimizedPresentation.theme,
      slides: optimizedPresentation.slides.map(slide => ({
        id: slide.id,
        title: slide.title,
        layers: slide.layers.map(layer => ({ ...layer })),
        background: slide.background,
        aspectRatio: slide.aspectRatio,
        template: slide.template,
        notes: slide.notes || '',
      })),
      settings: { ...optimizedPresentation.settings },
      createdAt: optimizedPresentation.createdAt,
      updatedAt: new Date(),
      // Version information
      version: versionMetadata.version,
      createdWith: versionMetadata.createdWith,
      lastModifiedWith: versionMetadata.lastModifiedWith,
      compatibilityNotes: versionMetadata.compatibilityNotes,
    };
    
    const storedPresentation: StoredPresentation = {
      ...cleanPresentation,
      metadata: {
        version: APP_VERSION,
        lastModified: new Date(),
        size: JSON.stringify(cleanPresentation).length,
      },
    };
    
    const existingIndex = presentations.findIndex(p => p.id === presentation.id);
    
    if (existingIndex >= 0) {
      presentations[existingIndex] = storedPresentation;
    } else {
      presentations.push(storedPresentation);
    }
    
    // Try to save, if quota exceeded, clean up old data
    try {
      setStorageItem(STORAGE_KEYS.presentations, presentations);
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        console.warn('Storage quota exceeded, performing aggressive cleanup...');
        
        // Perform aggressive cleanup
        cleanupStorage();
        
        // Try with only the current presentation and one most recent
        const sortedPresentations = presentations
          .sort((a, b) => new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime())
          .slice(0, 1); // Keep only 1 most recent
        
        // Add current presentation
        const currentExists = sortedPresentations.find(p => p.id === presentation.id);
        if (!currentExists) {
          sortedPresentations.push(storedPresentation);
        } else {
          const existingIndex = sortedPresentations.findIndex(p => p.id === presentation.id);
          sortedPresentations[existingIndex] = storedPresentation;
        }
        
        console.log(`Aggressive cleanup: reduced to ${sortedPresentations.length} presentations`);
        
        try {
          setStorageItem(STORAGE_KEYS.presentations, sortedPresentations);
        } catch (retryError) {
          // If still failing, optimize the current presentation more aggressively
          const ultraOptimized = {
            ...storedPresentation,
            slides: storedPresentation.slides.map(slide => ({
              ...slide,
              layers: slide.layers.map(layer => {
                if (layer.type === 'image') {
                  return { ...layer, src: '' }; // Remove all image data
                }
                return layer;
              })
            }))
          };
          
          setStorageItem(STORAGE_KEYS.presentations, [ultraOptimized]);
          console.warn('Ultra-optimized presentation saved - images will need to be regenerated');
        }
      } else {
        throw error;
      }
    }
    
    // Update recent files
    updateRecentFiles(presentation.id, presentation.title);
    
  } catch (error) {
    console.error('Error in savePresentation:', error);
    throw new Error(`Failed to save presentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const loadPresentation = async (id: string): Promise<Presentation> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const presentation = presentations.find(p => p.id === id);
  
  if (!presentation) {
    throw new Error(`Presentation with id ${id} not found`);
  }
  
  // Remove metadata before returning
  const { metadata, ...presentationData } = presentation;
  
  // Check version compatibility and upgrade if necessary
  const processedPresentation = await checkAndUpgradePresentation(presentationData);
  
  // Update recent files
  updateRecentFiles(id, presentation.title);
  
  return processedPresentation;
};

export const deletePresentation = async (id: string): Promise<void> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const filteredPresentations = presentations.filter(p => p.id !== id);
  
  setStorageItem(STORAGE_KEYS.presentations, filteredPresentations);
  
  // Remove from recent files
  const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
  const filteredRecent = recentFiles.filter(f => f.id !== id);
  setStorageItem(STORAGE_KEYS.recentFiles, filteredRecent);
};

export const listPresentations = async (): Promise<Presentation[]> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  return presentations.map(({ metadata, ...presentation }) => presentation);
};

export const getPresentationMetadata = async (id: string): Promise<StorageMetadata | null> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const presentation = presentations.find(p => p.id === id);
  return presentation?.metadata || null;
};

// =================================================================
// Version Compatibility and Upgrade Functions
// =================================================================

export const checkAndUpgradePresentation = async (data: any): Promise<Presentation> => {
  // Validate basic file format
  const validation = validateFileFormat(data);
  if (!validation.isValid) {
    throw new Error(`Invalid file format: ${validation.errors.join(', ')}`);
  }

  // Get file version (default to legacy if missing)
  const fileVersion = data.version || { major: 0, minor: 9, patch: 0, format: 'slidemaster' };
  
  // Check compatibility
  const compatibility = checkVersionCompatibility(fileVersion);
  
  if (!compatibility.canImport) {
    if (compatibility.requiresUpgrade) {
      throw new Error(
        `This file was created with a newer version of SlideMaster (${getVersionString(fileVersion)}). ` +
        `Please update your application to open this file.`
      );
    } else {
      throw new Error(
        `Incompatible file format. ${compatibility.warnings.join(' ')}`
      );
    }
  }

  // Upgrade if necessary
  let processedData = data;
  if (compatibility.partialSupport || !data.version) {
    console.log(`Upgrading presentation from ${getVersionString(fileVersion)} to ${getVersionString(CURRENT_FILE_FORMAT_VERSION)}`);
    processedData = upgradePresentation(data, fileVersion);
    
    // Log warnings if any features were missing
    if (compatibility.warnings.length > 0) {
      console.warn('Version compatibility warnings:', compatibility.warnings);
    }
  }

  return processedData as Presentation;
};

export const checkImportCompatibility = (data: any): VersionCompatibility => {
  const validation = validateFileFormat(data);
  if (!validation.isValid) {
    return {
      canImport: false,
      requiresUpgrade: false,
      partialSupport: false,
      missingFeatures: [],
      warnings: validation.errors
    };
  }

  const fileVersion = data.version || { major: 0, minor: 9, patch: 0, format: 'slidemaster' };
  return checkVersionCompatibility(fileVersion);
};

// =================================================================
// Recent Files Management
// =================================================================

export interface RecentFile {
  id: string;
  title: string;
  lastOpened: Date;
  thumbnail?: string;
}

const updateRecentFiles = (id: string, title: string): void => {
  const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
  
  const existingIndex = recentFiles.findIndex(f => f.id === id);
  const recentFile: RecentFile = {
    id,
    title,
    lastOpened: new Date(),
  };
  
  if (existingIndex >= 0) {
    recentFiles[existingIndex] = recentFile;
  } else {
    recentFiles.unshift(recentFile);
  }
  
  // Keep only the 10 most recent files
  const trimmedRecentFiles = recentFiles.slice(0, 10);
  setStorageItem(STORAGE_KEYS.recentFiles, trimmedRecentFiles);
};

export const getRecentFiles = (): RecentFile[] => {
  return getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
};

export const clearRecentFiles = (): void => {
  setStorageItem(STORAGE_KEYS.recentFiles, []);
};

// =================================================================
// Settings Management
// =================================================================

export interface UserSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  autoSaveInterval: number;
  defaultAspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  defaultSlideTheme: 'auto' | 'professional' | 'creative' | 'minimalist' | 'dark_modern';
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  shortcuts: Record<string, string>;
  
  // AI Model Settings
  aiModels: {
    textGeneration: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite' | 'gemini-1.5-pro-latest' | 'gemini-1.5-flash-latest' | 'gemma-3-27b-it' | 'gemma-3-12b-it' | 'gemma-3-4b-it' | 'gemma-3n-e4b' | 'gemma-3n-e2b';
    imageGeneration: 'gemini-2.0-flash-exp' | 'gemini-2.0-flash' | 'imagen-4' | 'imagen-3';
    videoAnalysis: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-1.5-pro-latest' | 'gemini-1.5-flash-latest';
  };
  
  // AI temperature設定（カスタマイズ可能）
  aiTemperatureOverrides?: {
    slideCount?: number;
    dataAnalysis?: number;
    structuredOutput?: number;
    manualGeneration?: number;
    documentation?: number;
    slideStructure?: number;
    contentOptimization?: number;
    existingStoryAdaptation?: number;
    themeSelection?: number;
    imageGeneration?: number;
    creativeWriting?: number;
    originalStory?: number;
  };
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 30000,
  defaultAspectRatio: '16:9',
  showGrid: false,
  snapToGrid: true,
  gridSize: 20,
  shortcuts: {
    save: 'Ctrl+S',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    delete: 'Delete',
    duplicate: 'Ctrl+D',
    newSlide: 'Ctrl+N',
    aiAssist: 'Ctrl+K',
  },
  aiModels: {
    textGeneration: 'gemini-2.5-flash',
    imageGeneration: 'imagen-3',
    videoAnalysis: 'gemini-2.5-flash',
  },
};

export const getUserSettings = (): UserSettings => {
  return getStorageItem<UserSettings>(STORAGE_KEYS.settings, defaultSettings);
};

export const saveUserSettings = (settings: UserSettings): void => {
  setStorageItem(STORAGE_KEYS.settings, settings);
};

export const resetUserSettings = (): void => {
  setStorageItem(STORAGE_KEYS.settings, defaultSettings);
};

// =================================================================
// Cache Management
// =================================================================

export interface CacheItem {
  key: string;
  value: any;
  expiry: Date;
  size: number;
}

const CACHE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

export const getCacheItem = <T>(key: string): T | null => {
  const cache = getStorageItem<CacheItem[]>(STORAGE_KEYS.cache, []);
  const item = cache.find(c => c.key === key);
  
  if (!item) return null;
  
  if (new Date() > new Date(item.expiry)) {
    // Item expired, remove it
    removeCacheItem(key);
    return null;
  }
  
  return item.value;
};

export const setCacheItem = <T>(key: string, value: T, ttl: number = 3600000): void => {
  const cache = getStorageItem<CacheItem[]>(STORAGE_KEYS.cache, []);
  const expiry = new Date(Date.now() + ttl);
  const size = JSON.stringify(value).length;
  
  const newItem: CacheItem = { key, value, expiry, size };
  
  // Remove existing item if it exists
  const filteredCache = cache.filter(c => c.key !== key);
  
  // Add new item
  filteredCache.push(newItem);
  
  // Check cache size and remove oldest items if needed
  const totalSize = filteredCache.reduce((acc, item) => acc + item.size, 0);
  if (totalSize > CACHE_SIZE_LIMIT) {
    const sortedCache = filteredCache.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
    let currentSize = totalSize;
    
    while (currentSize > CACHE_SIZE_LIMIT && sortedCache.length > 0) {
      const removedItem = sortedCache.shift();
      if (removedItem) {
        currentSize -= removedItem.size;
      }
    }
    
    setStorageItem(STORAGE_KEYS.cache, sortedCache);
  } else {
    setStorageItem(STORAGE_KEYS.cache, filteredCache);
  }
};

export const removeCacheItem = (key: string): void => {
  const cache = getStorageItem<CacheItem[]>(STORAGE_KEYS.cache, []);
  const filteredCache = cache.filter(c => c.key !== key);
  setStorageItem(STORAGE_KEYS.cache, filteredCache);
};

export const clearCache = (): void => {
  setStorageItem(STORAGE_KEYS.cache, []);
};

// =================================================================
// Data Import/Export
// =================================================================

export const exportPresentationData = (presentation: Presentation): string => {
  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    presentation,
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const importPresentationData = (data: string): Presentation => {
  try {
    const importData = JSON.parse(data);
    
    if (!importData.presentation) {
      throw new Error('Invalid presentation data format');
    }
    
    const presentation = importData.presentation;
    
    // Validate required fields
    if (!presentation.id || !presentation.title || !presentation.slides) {
      throw new Error('Missing required presentation fields');
    }
    
    // Update timestamps
    presentation.updatedAt = new Date();
    
    return presentation;
  } catch (error) {
    console.error('Error importing presentation data:', error);
    throw new Error('Failed to import presentation data');
  }
};

// =================================================================
// Backup and Restore
// =================================================================

export const createBackup = (): string => {
  const backup = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    presentations: getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []),
    settings: getStorageItem<UserSettings>(STORAGE_KEYS.settings, defaultSettings),
    recentFiles: getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []),
  };
  
  return JSON.stringify(backup, null, 2);
};

export const restoreBackup = (backupData: string): void => {
  try {
    const backup = JSON.parse(backupData);
    
    if (!backup.version) {
      throw new Error('Invalid backup format');
    }
    
    if (backup.presentations) {
      setStorageItem(STORAGE_KEYS.presentations, backup.presentations);
    }
    
    if (backup.settings) {
      setStorageItem(STORAGE_KEYS.settings, backup.settings);
    }
    
    if (backup.recentFiles) {
      setStorageItem(STORAGE_KEYS.recentFiles, backup.recentFiles);
    }
    
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw new Error('Failed to restore backup');
  }
};

// =================================================================
// Storage Analytics
// =================================================================

export const getStorageStats = (): {
  totalSize: number;
  presentationCount: number;
  cacheSize: number;
  availableSpace: number;
} => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const cache = getStorageItem<CacheItem[]>(STORAGE_KEYS.cache, []);
  
  const totalSize = JSON.stringify(presentations).length;
  const cacheSize = cache.reduce((acc, item) => acc + item.size, 0);
  
  // Estimate available space (localStorage limit is typically 5-10MB)
  const estimatedLimit = 5 * 1024 * 1024; // 5MB
  const availableSpace = estimatedLimit - totalSize - cacheSize;
  
  return {
    totalSize,
    presentationCount: presentations.length,
    cacheSize,
    availableSpace,
  };
};

// =================================================================
// Storage Cleanup and Optimization
// =================================================================

export const optimizeData = (presentation: Presentation): Presentation => {
  // Remove large image data from layers to save space
  return {
    ...presentation,
    slides: presentation.slides.map(slide => ({
      ...slide,
      layers: slide.layers.map(layer => {
        if (layer.type === 'image') {
          const imageLayer = layer as any;
          // For large base64 images, only keep the prompt for regeneration
          // EXCEPT for video screenshots which should be preserved
          const isVideoScreenshot = imageLayer.prompt && 
            (imageLayer.prompt.includes('Screenshot from video') || 
             imageLayer.prompt.includes('Fallback screenshot'));
          
          if (imageLayer.src && imageLayer.src.startsWith('data:image/') && 
              imageLayer.src.length > 50000 && !isVideoScreenshot) {
            console.log(`Optimizing large image (${imageLayer.src.length} chars) - keeping prompt only`);
            return {
              ...layer,
              src: '', // Remove large image data
              // Ensure prompt is preserved for regeneration
              prompt: imageLayer.prompt || 'High-quality image for presentation',
            };
          }
          
          // Preserve video screenshots regardless of size
          if (isVideoScreenshot) {
            console.log(`Preserving video screenshot (${imageLayer.src.length} chars)`);
          }
          
          return layer;
        }
        return layer;
      }),
    })),
  };
};

export const cleanupStorage = (): void => {
  try {
    // Clear cache first
    clearCache();
    
    // Remove old presentations (keep only 2 most recent for aggressive cleanup)
    const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
    if (presentations.length > 2) {
      const sortedPresentations = presentations
        .sort((a, b) => new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime())
        .slice(0, 2);
      
      setStorageItem(STORAGE_KEYS.presentations, sortedPresentations);
      console.log(`Cleaned up storage: reduced from ${presentations.length} to ${sortedPresentations.length} presentations`);
    }
    
    // Optimize existing presentations by removing large images
    const optimizedPresentations = presentations.map(storedPresentation => {
      const { metadata, ...presentation } = storedPresentation;
      const optimized = optimizeData(presentation);
      return {
        ...optimized,
        metadata: {
          ...metadata,
          size: JSON.stringify(optimized).length,
          lastModified: new Date(),
        }
      };
    });
    
    setStorageItem(STORAGE_KEYS.presentations, optimizedPresentations);
    
    // Clear old recent files
    const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
    if (recentFiles.length > 3) {
      const trimmedRecent = recentFiles.slice(0, 3);
      setStorageItem(STORAGE_KEYS.recentFiles, trimmedRecent);
    }
    
    console.log('Storage cleanup completed');
    
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
};

export const getStorageUsage = (): { used: number; total: number; percentage: number } => {
  let used = 0;
  
  // Calculate total localStorage usage
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }
  
  // Typical localStorage limit is 5-10MB
  const total = 5 * 1024 * 1024; // 5MB estimate
  const percentage = (used / total) * 100;
  
  return { used, total, percentage };
};

// =================================================================
// Error Handling
// =================================================================

export const handleStorageError = (error: Error): void => {
  console.error('Storage error:', error);
  
  if (error.message.includes('quota') || error.name === 'QuotaExceededError') {
    console.warn('Storage quota exceeded. Performing cleanup...');
    cleanupStorage();
  }
};

// =================================================================
// Migration and Versioning
// =================================================================

export const migrateStorageVersion = (currentVersion: string): void => {
  // Handle future migrations between storage versions
  console.log(`Current storage version: ${currentVersion}`);
  
  // Example migration logic would go here
  // if (currentVersion === '1.0.0') {
  //   // Migrate to 1.1.0
  // }
};