import React, { useState } from 'react';
import { Presentation, VersionCompatibility } from '../types';
import { 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Clock,
  Package,
  Code,
  FileText,
  Layers
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  APP_VERSION, 
  CURRENT_FILE_FORMAT_VERSION, 
  getVersionString, 
  checkVersionCompatibility,
  supportsFeature,
  VERSION_HISTORY
} from '../utils/versionManager';

interface VersionInfoProps {
  presentation?: Presentation | null;
  onClose: () => void;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ presentation, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [activeTab, setActiveTab] = useState<'current' | 'compatibility' | 'history'>('current');

  // Check compatibility if presentation is provided
  const compatibility: VersionCompatibility | null = presentation?.version 
    ? checkVersionCompatibility(presentation.version)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-cyan-400" />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Version Information</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('current')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Current Info
          </button>
          {presentation && (
            <button
              onClick={() => setActiveTab('compatibility')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'compatibility'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              File Compatibility
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Version History
          </button>
        </div>

        <div className="p-6">
          {/* Current Info Tab */}
          {activeTab === 'current' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Application Info */}
                <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-cyan-400" />
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Application</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Version:</span>
                      <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-mono`}>{APP_VERSION}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Format Version:</span>
                      <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-mono`}>{getVersionString(CURRENT_FILE_FORMAT_VERSION)}</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-green-400" />
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Supported Features</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    {Object.entries({
                      'Basic Slides': 'basic_slides',
                      'Page Numbers': 'page_numbers',
                      'Enhanced Layouts': 'enhanced_layouts',
                      'Game Content': 'game_content_support'
                    }).map(([name, feature]) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Presentation Info */}
              {presentation && (
                <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Presentation</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Title:</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{presentation.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Created:</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{new Date(presentation.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Last Modified:</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{new Date(presentation.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>File Version:</span>
                        <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-mono`}>
                          {presentation.version ? getVersionString(presentation.version) : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Created With:</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{presentation.createdWith || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Last Modified With:</span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{presentation.lastModifiedWith || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {presentation.compatibilityNotes && presentation.compatibilityNotes.length > 0 && (
                    <div className="mt-4">
                      <h4 className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Compatibility Notes:</h4>
                      <div className="space-y-1">
                        {presentation.compatibilityNotes.map((note, index) => (
                          <div key={index} className={`text-xs ${isDark ? 'text-slate-400 bg-slate-800' : 'text-gray-600 bg-gray-200'} rounded px-2 py-1`}>
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compatibility Tab */}
          {activeTab === 'compatibility' && presentation && compatibility && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {compatibility.canImport ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {compatibility.canImport ? 'Compatible' : 'Incompatible'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {compatibility.canImport ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                        <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                          {compatibility.canImport ? 'Can import' : 'Cannot import'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {compatibility.partialSupport ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        <span className="text-slate-300">
                          {compatibility.partialSupport ? 'Partial support' : 'Full support'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {compatibility.requiresUpgrade ? (
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        <span className="text-slate-300">
                          {compatibility.requiresUpgrade ? 'Requires upgrade' : 'No upgrade needed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {compatibility.missingFeatures.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-300 mb-2">Missing Features</h4>
                      <div className="space-y-1">
                        {compatibility.missingFeatures.map((feature, index) => (
                          <div key={index} className="text-sm text-yellow-400 bg-yellow-400/10 rounded px-2 py-1">
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {compatibility.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-300 mb-2">Warnings</h4>
                    <div className="space-y-2">
                      {compatibility.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-orange-300 bg-orange-400/10 rounded p-2">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Version History</h3>
              
              <div className="space-y-4">
                {Object.entries(VERSION_HISTORY).reverse().map(([version, info]) => (
                  <div key={version} className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="w-5 h-5 text-cyan-400" />
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Version {version}</h4>
                      {version === APP_VERSION && (
                        <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded">Current</span>
                      )}
                    </div>
                    
                    <p className="text-slate-300 text-sm mb-3">{info.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-slate-400 mb-1">Features</h5>
                        <div className="space-y-1">
                          {info.features.map((feature, index) => (
                            <div key={index} className="text-xs text-green-400 bg-green-400/10 rounded px-2 py-1">
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {info.breakingChanges.length > 0 && (
                        <div>
                          <h5 className="font-medium text-slate-400 mb-1">Breaking Changes</h5>
                          <div className="space-y-1">
                            {info.breakingChanges.map((change, index) => (
                              <div key={index} className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
                                {change}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;