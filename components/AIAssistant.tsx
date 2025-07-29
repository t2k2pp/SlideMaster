import React, { useState, useMemo } from 'react';
import { SlideGenerationRequest, ElementGenerationRequest, AIAssistRequest, Presentation } from '../types';
import { Sparkles, X, Send, Loader2, Image, Type, Square, RefreshCw } from 'lucide-react';
import { detectFailedImages, getFailedImageStatistics } from '../utils/failedImageDetection';
import { useTheme } from '../contexts/ThemeContext';

interface AIAssistantProps {
  onSlideGenerate: (request: SlideGenerationRequest) => void;
  onElementGenerate: (request: ElementGenerationRequest) => void;
  onContentAssist: (request: AIAssistRequest) => void;
  onRetryFailedImages: (failedImageIds: string[]) => void;
  isProcessing: boolean;
  error: string | null;
  onClose: () => void;
  hasApiKey: boolean;
  onApiKeySetup: () => void;
  currentPresentation: Presentation | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  onSlideGenerate,
  onElementGenerate,
  onContentAssist,
  onRetryFailedImages,
  isProcessing,
  error,
  onClose,
  hasApiKey,
  onApiKeySetup,
  currentPresentation,
}) => {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'generate' | 'element' | 'assist' | 'retry'>('generate');
  const [prompt, setPrompt] = useState('');
  const [selectedFailedImages, setSelectedFailedImages] = useState<string[]>([]);

  // 失敗画像の検出
  const failedImageStats = useMemo(() => 
    getFailedImageStatistics(currentPresentation), 
    [currentPresentation]
  );

  const failedImages = useMemo(() => 
    detectFailedImages(currentPresentation), 
    [currentPresentation]
  );

  const getButtonText = () => {
    switch (activeTab) {
      case 'generate':
        return 'Generate Slides';
      case 'element':
        return 'Add Element';
      case 'assist':
        return 'Help with Content';
      case 'retry':
        return selectedFailedImages.length > 0 ? 
          `Retry ${selectedFailedImages.length} Images` : 
          'Select Images to Retry';
      default:
        return 'Send';
    }
  };

  const handleSubmit = () => {
    switch (activeTab) {
      case 'generate':
        if (!prompt.trim()) return;
        onSlideGenerate({
          topic: prompt,
          slideCount: 8,
          theme: 'professional',
          aspectRatio: '16:9',
          includeImages: true,
        });
        setPrompt('');
        break;
      case 'element':
        if (!prompt.trim()) return;
        onElementGenerate({
          type: 'text',
          prompt,
          slideContext: 'Current slide context',
        });
        setPrompt('');
        break;
      case 'assist':
        if (!prompt.trim()) return;
        onContentAssist({
          slideId: 'current-slide',
          instruction: prompt,
        });
        setPrompt('');
        break;
      case 'retry':
        if (selectedFailedImages.length === 0) return;
        onRetryFailedImages(selectedFailedImages);
        setSelectedFailedImages([]);
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${resolvedTheme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${resolvedTheme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            <h2 className={`text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${resolvedTheme === 'dark' ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-600'} rounded transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-0">
          {[
            { key: 'generate', label: 'Generate Slides', icon: Sparkles },
            { key: 'element', label: 'Add Element', icon: Square },
            { key: 'assist', label: 'Content Help', icon: Type },
            { key: 'retry', label: 'Retry Failed Images', icon: RefreshCw },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                activeTab === key
                  ? (resolvedTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-purple-100 text-purple-900')
                  : (resolvedTheme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {!hasApiKey && (
            <div className={`${resolvedTheme === 'dark' ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4 mb-4`}>
              <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-orange-200' : 'text-orange-800'}`}>
                <p className="font-medium mb-1">APIキーが必要です</p>
                <p className="mb-3">AI機能を使用するには、Gemini APIキーの設定が必要です。</p>
                <button
                  onClick={onApiKeySetup}
                  className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                >
                  APIキーを設定
                </button>
              </div>
            </div>
          )}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Generate New Slides</h3>
                <p className={`text-sm mb-4 ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Describe the presentation topic and AI will create multiple slides for you.
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Topic</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., The impact of artificial intelligence on modern business..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    resolvedTheme === 'dark' 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {activeTab === 'element' && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add New Element</h3>
                <p className={`text-sm mb-4 ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Describe what you want to add to the current slide.
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Element Description</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Add a chart showing sales growth over the last 5 years..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    resolvedTheme === 'dark' 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {activeTab === 'assist' && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Content Assistant</h3>
                <p className={`text-sm mb-4 ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Ask for help improving or modifying existing content.
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>How can I help?</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Make this text more engaging and professional..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    resolvedTheme === 'dark' 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {activeTab === 'retry' && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Retry Failed Images</h3>
                <p className={`text-sm mb-4 ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Select failed images to regenerate with AI.
                </p>
              </div>

              {/* 統計情報 */}
              <div className={`${resolvedTheme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{failedImageStats.totalImages}</div>
                    <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Total Images</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{failedImageStats.failedCount}</div>
                    <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{failedImageStats.successRate.toFixed(1)}%</div>
                    <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Success Rate</div>
                  </div>
                </div>
              </div>

              {/* 失敗画像リスト */}
              {failedImages.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`block text-sm font-medium ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Failed Images ({failedImages.length})</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedFailedImages(failedImages.map(img => img.layerId))}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedFailedImages([])}
                        className={`text-xs ${resolvedTheme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className={`max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 ${
                    resolvedTheme === 'dark' ? 'border-slate-600' : 'border-gray-300'
                  }`}>
                    {failedImages.map((failedImg) => (
                      <label key={failedImg.layerId} className={`flex items-start gap-3 p-2 rounded cursor-pointer ${
                        resolvedTheme === 'dark' 
                          ? 'bg-slate-700/50 hover:bg-slate-700' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedFailedImages.includes(failedImg.layerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFailedImages(prev => [...prev, failedImg.layerId]);
                            } else {
                              setSelectedFailedImages(prev => prev.filter(id => id !== failedImg.layerId));
                            }
                          }}
                          className={`mt-1 text-purple-500 rounded focus:ring-purple-500 ${
                            resolvedTheme === 'dark' 
                              ? 'bg-slate-600 border-slate-500' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Slide {failedImg.slideIndex + 1}: {failedImg.slideTitle}
                          </div>
                          <div className={`text-xs truncate ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {failedImg.prompt || 'No prompt available'}
                          </div>
                          <div className="text-xs text-red-400 mt-1">
                            Position: {Math.round(failedImg.position.x)}%, {Math.round(failedImg.position.y)}%
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${resolvedTheme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  <RefreshCw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No failed images found!</p>
                  <p className="text-sm">All images in your presentation were generated successfully.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className={`mt-4 p-3 border rounded-lg ${
              resolvedTheme === 'dark' 
                ? 'bg-red-500/20 border-red-500/50' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${resolvedTheme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={handleSubmit}
            disabled={
              (activeTab === 'retry' ? selectedFailedImages.length === 0 : !prompt.trim()) || 
              isProcessing || 
              !hasApiKey
            }
            className={`w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 ${
              ((activeTab === 'retry' ? selectedFailedImages.length === 0 : !prompt.trim()) || isProcessing || !hasApiKey)
                ? (resolvedTheme === 'dark' ? 'disabled:bg-slate-600' : 'disabled:bg-gray-400') + ' disabled:cursor-not-allowed'
                : ''
            }`}
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {isProcessing ? 'Processing...' : getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;