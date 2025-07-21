import React from 'react';
import { Presentation } from '../types';
import { 
  Save, 
  Download, 
  Sparkles, 
  Home, 
  Play, 
  Settings,
  FileText,
  Loader2,
  Hash,
  Key,
} from 'lucide-react';

interface HeaderProps {
  presentation: Presentation | null;
  onSave: () => void;
  onExport: () => void;
  onAIAssist: () => void;
  onNewPresentation: () => void;
  onStartSlideShow: () => void;
  onPageNumberManager: () => void;
  onVersionInfo: () => void;
  onApiKeyManager: () => void;
  isProcessing: boolean;
  hasApiKey: boolean;
}

const Header: React.FC<HeaderProps> = ({
  presentation,
  onSave,
  onExport,
  onAIAssist,
  onNewPresentation,
  onStartSlideShow,
  onPageNumberManager,
  onVersionInfo,
  onApiKeyManager,
  isProcessing,
  hasApiKey,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onVersionInfo}
              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-colors"
              title="Version information"
            >
              <FileText size={16} className="text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">SlideMaster</h1>
          </div>
          
          {presentation && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-400">Presentation:</span>
              <span className="text-sm text-slate-900 dark:text-white font-medium">{presentation.title}</span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewPresentation}
            className="flex items-center gap-2 px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <Home size={16} />
            <span className="text-sm">Home</span>
          </button>
          
          <button
            onClick={onStartSlideShow}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            title="Start slideshow (F5)"
          >
            <Play size={16} />
            <span className="text-sm">Slideshow</span>
          </button>

          <button
            onClick={onAIAssist}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            <span className="text-sm">AI Assist</span>
          </button>
          
          
          <button
            onClick={onPageNumberManager}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            title="Manage page numbers"
          >
            <Hash size={16} />
            <span className="text-sm">Page #</span>
          </button>
          
          <button
            onClick={onApiKeyManager}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
              hasApiKey 
                ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-slate-700' 
                : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-slate-700'
            }`}
            title={hasApiKey ? 'APIキー設定済み' : 'APIキーを設定してください'}
          >
            <Key size={16} />
            <span className="text-sm">API Key</span>
          </button>
          
          <button
            onClick={onSave}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            <span className="text-sm">Save</span>
          </button>
          
          <button
            onClick={onExport}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;