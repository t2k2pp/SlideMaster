// =================================================================
// Project Importer - プロジェクトインポート専門サービス  
// SlideMasterプロジェクトファイルのインポート機能
// =================================================================

import { Presentation, ExportResult } from '../../types';
import JSZip from 'jszip';
import { 
  checkAndUpgradePresentation, 
  checkImportCompatibility,
  getUserSettings,
  UserSettings
} from '../storageService';
import { sanitizePresentationImages } from '../../utils/imageDataValidator';
import { notify } from '../../utils/notificationService';
import { handleProjectImportError } from '../../utils/errorHandler';
import { importAIHistoryFromZip } from './projectAIHistoryHandler';
import {
  createErrorResult,
  createSuccessResult
} from './exportUtils';

/**
 * Import SlideMaster project from file
 */
export const importProject = async (file: File): Promise<{ 
  success: boolean; 
  presentation?: Presentation; 
  error?: string;
  warnings?: string[];
}> => {
  const loadingToastId = notify.projectImport('start', file.name);
  
  try {
    // Basic file validation
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size === 0) {
      throw new Error('File is empty');
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('File is too large (>100MB). Please check the file and try again.');
    }

    // Handle different file types
    const isZipFile = file.name.endsWith('.zip') || file.type === 'application/zip';
    const isJsonFile = file.name.endsWith('.json') || file.type === 'application/json';
    
    let presentation: Presentation;
    const warnings: string[] = [];
    
    if (isZipFile) {
      // Handle ZIP file (new format)
      presentation = await importFromZip(file, warnings);
    } else if (isJsonFile) {
      // Handle JSON file (legacy format)  
      presentation = await importFromJson(file, warnings);
    } else {
      throw new Error('Unsupported file format. Please upload a .slidemaster, .zip, or .json file.');
    }

    // Validate the imported presentation
    if (!presentation || typeof presentation !== 'object') {
      throw new Error('Invalid presentation data in file');
    }

    if (!presentation.title || typeof presentation.title !== 'string') {
      throw new Error('Presentation must have a valid title');
    }

    if (!Array.isArray(presentation.slides)) {
      throw new Error('Presentation must have a slides array');
    }

    if (presentation.slides.length === 0) {
      throw new Error('Presentation must have at least one slide');
    }

    // Check version compatibility
    const compatibilityCheck = checkImportCompatibility(presentation);
    if (!compatibilityCheck.compatible) {
      warnings.push(`Version compatibility warning: ${compatibilityCheck.message}`);
    }

    // Upgrade presentation if needed
    const upgradedPresentation = await checkAndUpgradePresentation(presentation);

    // Sanitize images to handle any corrupted image data
    const { presentation: sanitizedPresentation, sanitizedCount, errors } = sanitizePresentationImages(upgradedPresentation);
    
    if (sanitizedCount > 0) {
      warnings.push(`${sanitizedCount} invalid image data entries were sanitized during import`);
      console.warn('Sanitized image errors:', errors);
    }

    // Update metadata
    sanitizedPresentation.updatedAt = new Date();
    
    notify.projectImport('success', file.name, loadingToastId);
    
    const allWarnings = [...warnings];
    if (sanitizedCount > 0) {
      allWarnings.push(`${sanitizedCount} invalid image data entries were sanitized during import`);
    }

    return {
      success: true,
      presentation: sanitizedPresentation,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };
    
  } catch (error) {
    console.error('Project import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
    
    notify.projectImport('error', file.name, loadingToastId);
    handleProjectImportError(error, file.name);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Import from ZIP file (new format)
 */
const importFromZip = async (file: File, warnings: string[]): Promise<Presentation> => {
  const zip = await JSZip.loadAsync(file);
  
  // Get presentation.json
  const presentationFile = zip.file('presentation.json');
  if (!presentationFile) {
    throw new Error('presentation.json not found in the project file');
  }
  
  const presentationData = await presentationFile.async('text');
  const presentation = JSON.parse(presentationData) as Presentation;
  
  // Import AI interaction history
  await importAIHistoryFromZip(zip, presentation);
  
  // Import metadata if available
  const metadataFile = zip.file('metadata.json');
  if (metadataFile) {
    const metadataData = await metadataFile.async('text');
    const metadata = JSON.parse(metadataData);
    console.log('Project metadata:', metadata);
    
    // Add any metadata warnings
    if (metadata.warnings && Array.isArray(metadata.warnings)) {
      warnings.push(...metadata.warnings);
    }
  }
  
  // TODO: Import image files from images/ folder
  // This will require mapping image references back to the presentation
  
  return presentation;
};

/**
 * Import from JSON file (legacy format)
 */
const importFromJson = async (file: File, warnings: string[]): Promise<Presentation> => {
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file content'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });

  const presentation = JSON.parse(content) as Presentation;
  warnings.push('Imported from legacy JSON format');
  
  return presentation;
};

/**
 * Legacy JSON import for backward compatibility
 */
export const importProjectLegacy = async (file: File): Promise<{ 
  success: boolean; 
  presentation?: Presentation; 
  error?: string; 
}> => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.type !== 'application/json') {
      throw new Error('Please select a valid JSON file (.json)');
    }

    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });

    const data = JSON.parse(content);
    
    // Basic validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(data.slides)) {
      throw new Error('Invalid presentation format: slides array missing');
    }

    if (data.slides.length === 0) {
      throw new Error('Presentation must contain at least one slide');
    }

    const sanitizedPresentation = data as Presentation;
    
    // Update timestamps
    sanitizedPresentation.updatedAt = new Date();
    if (!sanitizedPresentation.createdAt) {
      sanitizedPresentation.createdAt = new Date();
    }

    return {
      success: true,
      presentation: sanitizedPresentation
    };

  } catch (error) {
    console.error('Legacy import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown import error'
    };
  }
};

/**
 * Validate project file before import
 */
export const validateProjectFile = async (file: File): Promise<{
  valid: boolean;
  error?: string;
  format?: 'zip' | 'json';
  size?: number;
}> => {
  try {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    const size = file.size;
    
    if (size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (size > 100 * 1024 * 1024) { // 100MB
      return { valid: false, error: 'File is too large (>100MB)' };
    }

    // Determine format
    const isZipFile = file.name.endsWith('.zip') || file.type === 'application/zip';
    const isJsonFile = file.name.endsWith('.json') || file.type === 'application/json';
    
    if (!isZipFile && !isJsonFile) {
      return { 
        valid: false, 
        error: 'Unsupported file format. Please upload a .slidemaster, .zip, or .json file.' 
      };
    }

    // Basic content validation
    if (isJsonFile) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result && typeof e.target.result === 'string') {
            resolve(e.target.result);
          } else {
            reject(new Error('Failed to read file content'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
      });

      const data = JSON.parse(content);
      
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid JSON format' };
      }

      if (!Array.isArray(data.slides)) {
        return { valid: false, error: 'Invalid presentation format' };
      }

      if (data.slides.length === 0) {
        return { valid: false, error: 'Presentation must contain at least one slide' };
      }
    }

    return {
      valid: true,
      format: isZipFile ? 'zip' : 'json',
      size
    };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'File validation failed'
    };
  }
};