import { FileFormatVersion, VersionCompatibility, VersionedFile, Presentation } from '../types';

// =================================================================
// Version Management System
// =================================================================

// Current application and file format versions
export const APP_VERSION = '1.0.0';
export const CURRENT_FILE_FORMAT_VERSION: FileFormatVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  format: 'slidemaster'
};

// Version history and breaking changes
export const VERSION_HISTORY = {
  '1.0.0': {
    description: 'Initial release with basic presentation features',
    features: ['basic_slides', 'text_layers', 'image_layers', 'shape_layers', 'themes'],
    breakingChanges: []
  },
  '1.1.0': {
    description: 'Added page numbering system',
    features: ['page_numbers', 'enhanced_layouts', 'game_content_support'],
    breakingChanges: []
  }
  // Future versions will be added here
};

// Features that were added in specific versions
export const FEATURE_VERSION_MAP = {
  'page_numbers': { major: 1, minor: 1, patch: 0 },
  'enhanced_layouts': { major: 1, minor: 1, patch: 0 },
  'game_content_support': { major: 1, minor: 1, patch: 0 },
  'basic_slides': { major: 1, minor: 0, patch: 0 },
  'text_layers': { major: 1, minor: 0, patch: 0 },
  'image_layers': { major: 1, minor: 0, patch: 0 },
  'shape_layers': { major: 1, minor: 0, patch: 0 },
  'themes': { major: 1, minor: 0, patch: 0 }
};

/**
 * Compare two file format versions
 */
export const compareVersions = (v1: FileFormatVersion, v2: FileFormatVersion): number => {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
};

/**
 * Check if a version is newer than another
 */
export const isNewerVersion = (v1: FileFormatVersion, v2: FileFormatVersion): boolean => {
  return compareVersions(v1, v2) > 0;
};

/**
 * Check if a version is compatible with current system
 */
export const checkVersionCompatibility = (fileVersion: FileFormatVersion): VersionCompatibility => {
  const current = CURRENT_FILE_FORMAT_VERSION;
  
  // Files from different formats are not compatible
  if (fileVersion.format !== current.format) {
    return {
      canImport: false,
      requiresUpgrade: false,
      partialSupport: false,
      missingFeatures: [],
      warnings: [`Incompatible file format: ${fileVersion.format} (expected: ${current.format})`]
    };
  }
  
  // Future versions (created with newer app versions)
  if (isNewerVersion(fileVersion, current)) {
    return {
      canImport: false,
      requiresUpgrade: true,
      partialSupport: false,
      missingFeatures: ['unknown_future_features'],
      warnings: [
        'This file was created with a newer version of SlideMaster.',
        'Please update your application to open this file.'
      ]
    };
  }
  
  // Same version - full compatibility
  if (compareVersions(fileVersion, current) === 0) {
    return {
      canImport: true,
      requiresUpgrade: false,
      partialSupport: false,
      missingFeatures: [],
      warnings: []
    };
  }
  
  // Older versions - check for breaking changes
  const missingFeatures: string[] = [];
  const warnings: string[] = [];
  
  // Check for major version differences (breaking changes)
  if (fileVersion.major < current.major) {
    warnings.push('This file is from an older major version and may have compatibility issues.');
    
    // Add logic for specific major version breaking changes
    if (fileVersion.major === 0) {
      missingFeatures.push('modern_file_structure');
      warnings.push('Very old file format detected. Some features may not work correctly.');
    }
  }
  
  // Check for missing features based on version
  Object.entries(FEATURE_VERSION_MAP).forEach(([feature, requiredVersion]) => {
    if (isNewerVersion(requiredVersion, fileVersion)) {
      missingFeatures.push(feature);
    }
  });
  
  // Determine compatibility
  const hasBreakingChanges = fileVersion.major < current.major;
  const canImport = !hasBreakingChanges;
  const partialSupport = missingFeatures.length > 0 && canImport;
  
  if (missingFeatures.length > 0) {
    warnings.push(`Some newer features may not be available: ${missingFeatures.join(', ')}`);
  }
  
  return {
    canImport,
    requiresUpgrade: false,
    partialSupport,
    missingFeatures,
    warnings
  };
};

/**
 * Create version metadata for new files
 */
export const createVersionMetadata = (): VersionedFile => {
  return {
    version: { ...CURRENT_FILE_FORMAT_VERSION },
    createdWith: APP_VERSION,
    lastModifiedWith: APP_VERSION,
    compatibilityNotes: []
  };
};

/**
 * Update version metadata when modifying a file
 */
export const updateVersionMetadata = (existingMetadata: VersionedFile): VersionedFile => {
  return {
    ...existingMetadata,
    lastModifiedWith: APP_VERSION,
    compatibilityNotes: [
      ...(existingMetadata.compatibilityNotes || []),
      `Modified with SlideMaster ${APP_VERSION} on ${new Date().toISOString()}`
    ]
  };
};

/**
 * Validate file format before importing
 */
export const validateFileFormat = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if it's a valid JSON object
  if (!data || typeof data !== 'object') {
    errors.push('Invalid file format: not a valid JSON object');
    return { isValid: false, errors };
  }
  
  // Check for required fields
  const requiredFields = ['id', 'title', 'slides'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Check version information
  if (!data.version) {
    errors.push('Missing version information - this may be a very old file format');
  } else {
    if (!data.version.format || !data.version.major) {
      errors.push('Invalid version information structure');
    }
  }
  
  // Check slides structure
  if (data.slides && !Array.isArray(data.slides)) {
    errors.push('Invalid slides format: must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Upgrade older presentation format to current version
 */
export const upgradePresentation = (data: any, sourceVersion?: FileFormatVersion): Presentation => {
  const currentVersion = CURRENT_FILE_FORMAT_VERSION;
  
  // If no version info, assume very old format (pre-1.0.0)
  if (!sourceVersion) {
    sourceVersion = { major: 0, minor: 9, patch: 0, format: 'slidemaster' };
  }
  
  let upgradedData = { ...data };
  
  // Apply version-specific upgrades
  if (sourceVersion.major === 0) {
    // Upgrade from pre-1.0.0 format
    upgradedData = upgradeFromPreV1(upgradedData);
  }
  
  // Add page number settings if missing (introduced in 1.1.0)
  if (compareVersions(sourceVersion, { major: 1, minor: 1, patch: 0, format: 'slidemaster' }) < 0) {
    upgradedData = addPageNumberSettings(upgradedData);
  }
  
  // Update version metadata
  upgradedData.version = currentVersion;
  upgradedData.createdWith = upgradedData.createdWith || 'unknown';
  upgradedData.lastModifiedWith = APP_VERSION;
  upgradedData.compatibilityNotes = [
    ...(upgradedData.compatibilityNotes || []),
    `Upgraded from version ${sourceVersion.major}.${sourceVersion.minor}.${sourceVersion.patch} to ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`
  ];
  
  return upgradedData as Presentation;
};

/**
 * Upgrade from pre-1.0.0 format (legacy)
 */
const upgradeFromPreV1 = (data: any): any => {
  // Add default settings if missing
  if (!data.settings) {
    data.settings = {
      defaultAspectRatio: '16:9',
      defaultBackground: '#111827',
      autoSave: false,
      showGrid: false,
      snapToGrid: true,
      gridSize: 20
    };
  }
  
  // Ensure all slides have proper structure
  if (data.slides) {
    data.slides = data.slides.map((slide: any) => ({
      id: slide.id || `slide-${Date.now()}-${Math.random()}`,
      title: slide.title || 'Untitled Slide',
      layers: slide.layers || [],
      background: slide.background || '#111827',
      aspectRatio: slide.aspectRatio || '16:9',
      template: slide.template || 'content',
      notes: slide.notes || ''
    }));
  }
  
  return data;
};

/**
 * Add page number settings to older presentations
 */
const addPageNumberSettings = (data: any): any => {
  if (!data.settings) {
    data.settings = {};
  }
  
  // Add default page number settings
  if (!data.settings.pageNumbers) {
    data.settings.pageNumbers = {
      style: 'simple',
      format: 'number_only',
      position: 'bottom_center',
      showOnTitleSlide: false,
      customPrefix: ''
    };
  }
  
  return data;
};

/**
 * Get human-readable version string
 */
export const getVersionString = (version: FileFormatVersion): string => {
  return `${version.format} v${version.major}.${version.minor}.${version.patch}`;
};

/**
 * Check if current system can handle a specific feature
 */
export const supportsFeature = (feature: string): boolean => {
  const requiredVersion = FEATURE_VERSION_MAP[feature];
  if (!requiredVersion) return false;
  
  return compareVersions(CURRENT_FILE_FORMAT_VERSION, requiredVersion) >= 0;
};

/**
 * Get list of features that will be lost when saving in older format
 */
export const getFeatureLossWarnings = (targetVersion: FileFormatVersion): string[] => {
  const warnings: string[] = [];
  
  Object.entries(FEATURE_VERSION_MAP).forEach(([feature, requiredVersion]) => {
    if (isNewerVersion(requiredVersion, targetVersion)) {
      warnings.push(`${feature} will be lost or simplified`);
    }
  });
  
  return warnings;
};