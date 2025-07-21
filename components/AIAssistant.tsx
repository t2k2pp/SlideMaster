import React, { useState } from 'react';
import { SlideGenerationRequest, ElementGenerationRequest, AIAssistRequest } from '../types';
import { Sparkles, X, Send, Loader2, Image, Type, Square } from 'lucide-react';

interface AIAssistantProps {
  onSlideGenerate: (request: SlideGenerationRequest) => void;
  onElementGenerate: (request: ElementGenerationRequest) => void;
  onContentAssist: (request: AIAssistRequest) => void;
  isProcessing: boolean;
  error: string | null;
  onClose: () => void;
  hasApiKey: boolean;
  onApiKeySetup: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  onSlideGenerate,
  onElementGenerate,
  onContentAssist,
  isProcessing,
  error,
  onClose,
  hasApiKey,
  onApiKeySetup,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'element' | 'assist'>('generate');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    switch (activeTab) {
      case 'generate':
        onSlideGenerate({
          topic: prompt,
          slideCount: 8,
          theme: 'professional',
          aspectRatio: '16:9',
          includeImages: true,
        });
        break;
      case 'element':
        onElementGenerate({
          type: 'text',
          prompt,
          slideContext: 'Current slide context',
        });
        break;
      case 'assist':
        onContentAssist({
          slideId: 'current-slide',
          instruction: prompt,
        });
        break;
    }
    
    setPrompt('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
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
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                activeTab === key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-orange-800">
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
                <h3 className="text-lg font-medium mb-2">Generate New Slides</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Describe the presentation topic and AI will create multiple slides for you.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., The impact of artificial intelligence on modern business..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {activeTab === 'element' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Add New Element</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Describe what you want to add to the current slide.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Element Description</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Add a chart showing sales growth over the last 5 years..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {activeTab === 'assist' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Content Assistant</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Ask for help improving or modifying existing content.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">How can I help?</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Make this text more engaging and professional..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={4}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your request..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !hasApiKey}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isProcessing || !hasApiKey}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;