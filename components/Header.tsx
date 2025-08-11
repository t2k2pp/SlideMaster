import React from 'react';
import { Presentation, PresentationPurpose } from '../types';
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
  Target,
} from 'lucide-react';

// 用途の日本語表示マッピング
const getPurposeDisplayName = (purpose: PresentationPurpose | undefined): string => {
  if (!purpose || purpose === 'auto') return '自動選択';
  
  const purposeNames: Record<PresentationPurpose, string> = {
    auto: '自動選択',
    business_presentation: 'ビジネス',
    educational_content: '教育・学習',
    storytelling: '物語・ストーリー',
    children_content: '子供向け',
    tutorial_guide: 'チュートリアル',
    portfolio_showcase: 'ポートフォリオ',
    marketing_pitch: 'マーケティング',
    academic_research: '学術・研究',
    event_announcement: 'イベント告知',
    training_material: '研修・訓練',
    product_demo: '製品デモ',
    report_summary: 'レポート',
    creative_project: 'クリエイティブ',
    game_content: 'ゲーム・ゲームブック',
    digital_signage: 'デジタルサイネージ',
    video_storyboard: '動画ストーリーボード',
  };
  
  return purposeNames[purpose] || '不明';
};

interface HeaderProps {
  presentation: Presentation | null;
  onSave: () => void;
  onExport: () => void;
  onAIAssist: () => void;
  onNewPresentation: () => void;
  onStartSlideShow: () => void;
  onPageNumberManager: () => void;
  onVersionInfo: () => void;
  onSettings: () => void;
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
  onSettings,
  isProcessing,
  hasApiKey,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2 h-16 flex-shrink-0">
      <div className="flex items-center justify-between h-full">
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
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg min-w-0">
                <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Presentation:</span>
                <span className="text-sm text-slate-900 dark:text-white font-medium truncate max-w-xs" title={presentation.title}>
                  {presentation.title.length > 30 ? presentation.title.substring(0, 27) + '...' : presentation.title}
                </span>
              </div>
              
              {presentation.purpose && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex-shrink-0">
                  <Target size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">
                    {getPurposeDisplayName(presentation.purpose)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onNewPresentation}
            className="flex items-center gap-2 px-3 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap"
          >
            <Home size={16} />
            <span className="text-sm">Home</span>
          </button>
          
          <button
            onClick={onStartSlideShow}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            title="Start slideshow (F5)"
          >
            <Play size={16} />
            <span className="text-sm">Slideshow</span>
          </button>

          <button
            onClick={onAIAssist}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
            className="flex items-center gap-2 px-3 py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            title="Manage page numbers"
          >
            <Hash size={16} />
            <span className="text-sm">Page #</span>
          </button>
          
          <button
            onClick={onSettings}
            className="flex items-center gap-2 px-3 py-1 rounded transition-colors whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="設定（APIキー設定を含む）"
          >
            <Settings size={16} />
            <span className="text-sm">Settings</span>
          </button>
          
          <button
            onClick={onSave}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Save size={16} />
            <span className="text-sm">Save</span>
          </button>
          
          <button
            onClick={onExport}
            disabled={!presentation || isProcessing}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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