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

export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
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

// localStorage cleanup function to handle quota exceeded errors
const cleanupStorage = (protectedKey: string, requiredSizeKB?: number): boolean => {
  console.log('Starting localStorage cleanup...');
  
  try {
    // Get current storage usage before cleanup
    const initialUsage = getStorageUsage();
    console.log(`Initial storage usage: ${initialUsage.used}KB / ${initialUsage.quota}KB`);
    
    let cleanedUp = false;
    
    // 1. Clean up old cached data (non-essential keys)
    const keysToClean = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== protectedKey && !key.startsWith('slidemaster_')) {
        // Clean up non-SlideMaster keys (cached data, temporary files, etc.)
        keysToClean.push(key);
      }
    }
    
    keysToClean.forEach(key => {
      localStorage.removeItem(key);
      cleanedUp = true;
    });
    
    if (keysToClean.length > 0) {
      console.log(`Cleaned up ${keysToClean.length} cached/temporary items`);
    }
    
    // 2. Clean up old presentations (keep most recent 2)
    const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
    if (presentations.length > 2) {
      // Sort by last modified date, keep most recent 2
      presentations.sort((a, b) => 
        new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime()
      );
      
      const toKeep = presentations.slice(0, 2);
      const removedCount = presentations.length - 2;
      
      // Use direct localStorage to avoid recursion
      localStorage.setItem(STORAGE_KEYS.presentations, JSON.stringify(toKeep));
      console.log(`Removed ${removedCount} old presentations, kept most recent 2`);
      cleanedUp = true;
      
      // Also clean up corresponding recent files
      const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
      const keptIds = new Set(toKeep.map(p => p.id));
      const filteredRecent = recentFiles.filter(f => keptIds.has(f.id));
      localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(filteredRecent));
    }
    
    // 3. Aggressive cleanup - keep only 1 most recent (always execute if more than 1)
    const presentations2 = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
    if (presentations2.length > 1) {
      // Sort by last modified date, keep only most recent 1
      presentations2.sort((a, b) => 
        new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime()
      );
      
      const toKeep = presentations2.slice(0, 1);
      const removedCount = presentations2.length - 1;
      
      // Use direct localStorage to avoid recursion
      localStorage.setItem(STORAGE_KEYS.presentations, JSON.stringify(toKeep));
      console.log(`🚨 Aggressive cleanup: Removed ${removedCount} old presentations, kept only most recent 1`);
      cleanedUp = true;
      
      // Also clean up corresponding recent files
      const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
      const keptIds = new Set(toKeep.map(p => p.id));
      const filteredRecent = recentFiles.filter(f => keptIds.has(f.id));
      localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(filteredRecent));
    }
    
    // 4. Last resort: clear all except protected key if still no space
    if (needsMoreSpace(requiredSizeKB)) {
      console.log('🚨 LAST RESORT: Clearing all localStorage except protected key');
      const protectedValue = localStorage.getItem(protectedKey);
      
      // Clear everything
      localStorage.clear();
      
      // Restore protected key if it existed
      if (protectedValue) {
        try {
          localStorage.setItem(protectedKey, protectedValue);
        } catch (error) {
          console.warn('Could not restore protected key after clear');
        }
      }
      
      cleanedUp = true;
    }
    
    // 5. Final storage usage check
    const finalUsage = getStorageUsage();
    console.log(`Final storage usage: ${finalUsage.used}KB / ${finalUsage.quota}KB`);
    console.log(`Freed up: ${initialUsage.used - finalUsage.used}KB`);
    
    return cleanedUp;
    
  } catch (error) {
    console.error('Error during storage cleanup:', error);
    return false;
  }
};

// Helper function to check if more space is needed
const needsMoreSpace = (testSizeKB: number = 1): boolean => {
  try {
    // Try to allocate a test string of specified size
    const testKey = '__storage_test__';
    const testData = 'x'.repeat(testSizeKB * 1024);
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return false; // Space available
  } catch (error) {
    return true; // Still need more space
  }
};

// Helper function to get storage usage information
const getStorageUsage = (): { used: number; quota: number } => {
  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }
  
  // Convert to KB and estimate quota (typical limit is 5-10MB)
  const usedKB = Math.round(used / 1024);
  const quotaKB = 5120; // Assume 5MB quota as conservative estimate
  
  return { used: usedKB, quota: quotaKB };
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    const serializedValue = JSON.stringify(value);
    
    // Pre-check: If the data is too large, try cleanup first
    const dataSize = serializedValue.length;
    const currentUsage = getStorageUsage();
    const estimatedTotalSize = currentUsage.used * 1024 + dataSize; // Convert KB to bytes
    const quotaBytes = currentUsage.quota * 1024;
    
    console.log(`📊 Storage analysis:`, {
      dataSize: `${Math.round(dataSize/1024)}KB`,
      currentUsage: `${currentUsage.used}KB`,
      quota: `${currentUsage.quota}KB`,
      estimatedTotal: `${Math.round(estimatedTotalSize/1024)}KB`,
      threshold: `${Math.round(quotaBytes * 0.9 / 1024)}KB`
    });
    
    if (estimatedTotalSize > quotaBytes * 0.9) { // If over 90% of quota
      console.log(`🚨 Large data detected (${Math.round(dataSize/1024)}KB). Pre-emptive cleanup...`);
      cleanupStorage(key, Math.round(dataSize/1024));
    }
    
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // Try to clean up storage and retry
      console.log('Storage quota exceeded, attempting cleanup...');
      if (cleanupStorage(key, Math.round(dataSize/1024))) {
        try {
          const serializedValue = JSON.stringify(value);
          localStorage.setItem(key, serializedValue);
          console.log('Successfully saved after cleanup');
          return;
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
      
      // Check if the single file is too large for localStorage
      const fileSizeMB = Math.round(dataSize / (1024 * 1024) * 10) / 10; // Round to 1 decimal place
      if (fileSizeMB > 4) { // More than 4MB is likely too large for localStorage
        throw new Error(`❌ Project file is too large (${fileSizeMB}MB)
        
LocalStorage cannot handle files larger than ~5MB due to browser limitations.

💡 Solutions:
• Export project with smaller image sizes
• Reduce number of slides with large images
• Use PNG instead of high-quality images
• Clear browser cache and try again

Current file contains ${Math.round(dataSize/1024)}KB of data.`);
      }
      
      throw new Error('Storage quota exceeded. Please manually clear some presentations or browser data.');
    }
    throw new Error('Failed to save data to local storage');
  }
};

export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key);
};

// =================================================================
// Presentation Storage
// =================================================================

export const savePresentation = async (presentation: Presentation): Promise<void> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const updatedPresentation = {
    ...presentation,
    updatedAt: new Date(),
    version: presentation.version || createVersionMetadata().version,
  };

  const storedPresentation: StoredPresentation = {
    ...updatedPresentation,
    metadata: {
      version: APP_VERSION,
      lastModified: new Date(),
      size: JSON.stringify(updatedPresentation).length,
    },
  };

  const existingIndex = presentations.findIndex(p => p.id === presentation.id);
  if (existingIndex >= 0) {
    presentations[existingIndex] = storedPresentation;
  } else {
    presentations.push(storedPresentation);
  }
  setStorageItem(STORAGE_KEYS.presentations, presentations);
  updateRecentFiles(presentation.id, presentation.title);
};

export const loadPresentation = async (id: string): Promise<Presentation> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  const presentation = presentations.find(p => p.id === id);
  if (!presentation) throw new Error(`Presentation with id ${id} not found`);
  const { metadata, ...presentationData } = presentation;
  const processed = await checkAndUpgradePresentation(presentationData);
  updateRecentFiles(id, presentation.title);
  return processed;
};

export const deletePresentation = async (id: string): Promise<void> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  setStorageItem(STORAGE_KEYS.presentations, presentations.filter(p => p.id !== id));
  const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
  setStorageItem(STORAGE_KEYS.recentFiles, recentFiles.filter(f => f.id !== id));
};

export const listPresentations = async (): Promise<Presentation[]> => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  return presentations.map(({ metadata, ...p }) => p);
};

// =================================================================
// Version Compatibility and Upgrade Functions
// =================================================================

export const checkAndUpgradePresentation = async (data: any): Promise<Presentation> => {
  const validation = validateFileFormat(data);
  if (!validation.isValid) throw new Error(`Invalid file format: ${validation.errors.join(', ')}`);
  const fileVersion = data.version || { major: 0, minor: 9, patch: 0 };
  const compatibility = checkVersionCompatibility(fileVersion);
  if (!compatibility.canImport) throw new Error(`Incompatible file: ${compatibility.warnings.join(' ')}`);
  return compatibility.requiresUpgrade ? upgradePresentation(data, fileVersion) : data;
};

export const checkImportCompatibility = (data: any): VersionCompatibility => {
  const validation = validateFileFormat(data);
  if (!validation.isValid) return { canImport: false, requiresUpgrade: false, partialSupport: false, warnings: validation.errors, missingFeatures: [] };
  return checkVersionCompatibility(data.version || { major: 0, minor: 9, patch: 0 });
};

// =================================================================
// Recent Files Management
// =================================================================

export interface RecentFile {
  id: string;
  title: string;
  lastOpened: Date;
}

const updateRecentFiles = (id: string, title: string): void => {
  let recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
  recentFiles = recentFiles.filter(f => f.id !== id);
  recentFiles.unshift({ id, title, lastOpened: new Date() });
  setStorageItem(STORAGE_KEYS.recentFiles, recentFiles.slice(0, 10));
};

export const getRecentFiles = (): RecentFile[] => {
  return getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
};

// =================================================================
// Settings Management
// =================================================================

export interface ProviderTaskAuth {
  apiKey?: string;
  endpoint?: string;
  apiVersion?: string;
  modelName?: string;  // 実際のモデル名（gpt-4o、dall-e-3など）
}

export interface ProviderAuthConfig {
  azure?: { [task: string]: ProviderTaskAuth };
  gemini?: { [task: string]: ProviderTaskAuth };
}

export interface ImageGenerationSettings {
  defaultQuality: 'low' | 'medium' | 'high';
  defaultSize: 'square' | 'landscape' | 'portrait';
  concurrentLimit: number; // 1-10の範囲
}

export interface SpeechSettings {
  enabled: boolean;
  rate: number; // 0.5-2.0
  pitch: number; // 0.5-2.0
  voiceURI?: string; // 選択された音声のURI
  selectedLanguage: string; // 選択された言語コード
  showSettings: boolean; // 設定パネルの表示状態
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  autoSaveInterval: number;
  aiProviderText?: 'azure' | 'gemini';
  aiProviderImage?: 'azure' | 'gemini';
  aiProviderVideo?: 'azure' | 'gemini';
  providerAuth?: ProviderAuthConfig;
  aiModels?: { textGeneration?: string; imageGeneration?: string; videoAnalysis?: string; };
  // プロバイダー別の設定値保持（デプロイメント名、モデル名など）
  providerModels?: { 
    azure?: { textGeneration?: string; imageGeneration?: string; videoAnalysis?: string; };
    gemini?: { textGeneration?: string; imageGeneration?: string; videoAnalysis?: string; };
  };
  imageGenerationSettings?: ImageGenerationSettings;
  speechSettings?: SpeechSettings;
  [key: string]: any; // For legacy fields during migration
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 30000,
  aiProviderText: 'azure',
  aiProviderImage: 'azure',
  aiProviderVideo: 'azure',
  aiModels: {
    textGeneration: '',
    imageGeneration: '',
    videoAnalysis: '',
  },
  providerAuth: {},
  providerModels: {
    azure: {
      textGeneration: '',
      imageGeneration: '',
      videoAnalysis: '',
    },
    gemini: {
      textGeneration: 'gemini-2.5-flash',
      imageGeneration: 'imagen-3.0-generate-002',
      videoAnalysis: 'gemini-2.5-flash',
    },
  },
  imageGenerationSettings: {
    defaultQuality: 'medium',
    defaultSize: 'landscape',
    concurrentLimit: 3, // Azure OpenAIのレート制限を考慮
  },
  speechSettings: {
    enabled: false,
    rate: 1.0,
    pitch: 1.0,
    voiceURI: undefined,
    selectedLanguage: 'ja',
    showSettings: false,
  },
};

const migrateSettings = (settings: UserSettings): UserSettings => {
  let updated = false;
  const newAuth: ProviderAuthConfig = settings.providerAuth || {};

  const migrateTask = (provider: keyof ProviderAuthConfig, task: string, apiKey?: string, endpoint?: string, apiVersion?: string) => {
    if (!apiKey && !endpoint) return;
    if (!newAuth[provider]) newAuth[provider] = {};
    if (!newAuth[provider]![task]) newAuth[provider]![task] = {};
    const authTask = newAuth[provider]![task]!;
    if (apiKey && !authTask.apiKey) { authTask.apiKey = apiKey; updated = true; }
    if (endpoint && !authTask.endpoint) { authTask.endpoint = endpoint; updated = true; }
    if (apiVersion && !authTask.apiVersion) { authTask.apiVersion = apiVersion; updated = true; }
  };

  // Migrate old flat keys to Azure OpenAI
  migrateTask('azure', 'textGeneration', settings.azureApiKey || settings.geminiApiKey || settings.openaiApiKey, (settings as any).azureEndpoint);
  migrateTask('azure', 'imageGeneration', settings.azureApiKey || settings.geminiApiKey || settings.openaiApiKey, (settings as any).azureEndpoint);
  migrateTask('azure', 'videoAnalysis', settings.azureApiKey || settings.geminiApiKey || settings.openaiApiKey, (settings as any).azureEndpoint);

  if (updated) {
    settings.providerAuth = newAuth;
    // デフォルトプロバイダーをAzureに設定（個別タスクで変更可能）
    if (!settings.aiProviderText) settings.aiProviderText = 'azure';
    if (!settings.aiProviderImage) settings.aiProviderImage = 'azure';
    if (!settings.aiProviderVideo) settings.aiProviderVideo = 'azure';
    // 古いキーを削除
    delete settings.geminiApiKey;
    delete settings.openaiApiKey;
    delete settings.claudeApiKey;
    delete settings.azureApiKey;
    delete (settings as any).azureEndpoint;
    delete settings.lmStudioEndpoint;
    delete settings.fooucusEndpoint;
  }

  return settings;
};

export const getUserSettings = (): UserSettings => {
  let settings = getStorageItem<UserSettings>(STORAGE_KEYS.settings, defaultSettings);
  return migrateSettings(settings);
};

export const saveUserSettings = (settings: UserSettings): void => {
  const { 
      geminiApiKey, openaiApiKey, claudeApiKey, azureApiKey, azureEndpoint, 
      lmStudioEndpoint, fooucusEndpoint, azureDeployments, ...rest 
  } = settings;
  setStorageItem(STORAGE_KEYS.settings, rest);
};

export const resetUserSettings = (): void => {
  setStorageItem(STORAGE_KEYS.settings, defaultSettings);
};

// =================================================================
// Storage Management and Cleanup
// =================================================================

export const getStorageInfo = (): { used: number; quota: number; presentations: number } => {
  const usage = getStorageUsage();
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  return {
    ...usage,
    presentations: presentations.length
  };
};

export const cleanupOldPresentations = (keepCount: number = 5): number => {
  const presentations = getStorageItem<StoredPresentation[]>(STORAGE_KEYS.presentations, []);
  
  if (presentations.length <= keepCount) {
    return 0; // No cleanup needed
  }
  
  // Sort by last modified date, keep most recent
  presentations.sort((a, b) => 
    new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime()
  );
  
  const toKeep = presentations.slice(0, keepCount);
  const removedCount = presentations.length - keepCount;
  
  setStorageItem(STORAGE_KEYS.presentations, toKeep);
  
  // Clean up corresponding recent files
  const recentFiles = getStorageItem<RecentFile[]>(STORAGE_KEYS.recentFiles, []);
  const keptIds = new Set(toKeep.map(p => p.id));
  const filteredRecent = recentFiles.filter(f => keptIds.has(f.id));
  setStorageItem(STORAGE_KEYS.recentFiles, filteredRecent);
  
  return removedCount;
};

// Other functions like cache management, import/export etc. would be here in the full file.
