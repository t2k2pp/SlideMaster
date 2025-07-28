import React, { useState } from 'react';
import { Presentation, SlideGenerationRequest, PresentationTheme, Slide } from '../types';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Plus, 
  Clock,
  Video,
  Shield,
  Loader2,
  Settings,
  Key
} from 'lucide-react';

// Import refactored components
import { ProjectCreator } from './welcome/ProjectCreator';
import { AIGenerationForm } from './welcome/AIGenerationForm';
import { VideoGenerationForm } from './welcome/VideoGenerationForm';
import { ManualGenerationForm } from './welcome/ManualGenerationForm';
import { RecentPresentations } from './welcome/RecentPresentations';
import { ProjectImporter } from './welcome/ProjectImporter';

// =================================================================
// Welcome Screen - Main entry point (refactored)
// =================================================================

interface WelcomeScreenProps {
  onCreateNew: (title: string, theme: PresentationTheme) => void;
  onLoadPresentation: (id: string) => void;
  onGenerateWithAI: (request: SlideGenerationRequest) => void;
  onManualGenerate: (slides: Slide[]) => void;
  onAutoGenerate: (presentation: Presentation) => void;
  onImportProject: (file: File) => void;
  onOpenSettings: () => void;
  recentPresentations: Presentation[];
  isProcessing: boolean;
  hasApiKey?: boolean;
  onApiKeySetup?: () => void;
}

type TabType = 'ai' | 'docs_auto' | 'docs_manual' | 'create' | 'recent' | 'import';

// Loading Component
const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-lg text-gray-300">{message}</p>
  </div>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateNew,
  onLoadPresentation,
  onGenerateWithAI,
  onManualGenerate,
  onAutoGenerate,
  onImportProject,
  onOpenSettings,
  recentPresentations,
  isProcessing,
  hasApiKey = false,
  onApiKeySetup,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [loadingMessage, setLoadingMessage] = useState('Generating your presentation...');

  // Show loading overlay when processing
  if (isProcessing) {
    return <Loader message={loadingMessage} />;
  }


  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-900 dark:text-white flex flex-col">
      {/* Header */}
      <div className="text-center py-8 px-4 relative">
        {/* Settings button in top-right corner */}
        <div className="absolute top-4 right-8 flex gap-3">
          <button
            onClick={() => {
              console.log('Settings button clicked');
              onOpenSettings();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-slate-600 dark:bg-gray-600/20 text-white dark:text-gray-400 hover:bg-slate-700 dark:hover:bg-gray-600/30"
            title="設定（APIキー設定を含む）"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium text-white dark:text-white">設定</span>
          </button>
        </div>

        <div className="flex justify-center items-center gap-4 mb-6">
          <FileText className="w-16 h-16 text-cyan-400" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-slate-900 dark:text-white" style={{fontFamily: "'Poppins', sans-serif"}}>
          SlideMaster
        </h1>
        <p className="text-lg md:text-xl text-slate-700 dark:text-slate-400">
          Create stunning presentations with AI or start from scratch
        </p>
        
      </div>

      {/* Tabs - 2 Row Layout */}
      <div className="flex justify-center mb-8">
        <div className="space-y-2">
          {/* Row 1: Content Generation */}
          <div className="grid grid-cols-3 bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'ai'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-5 h-5 inline-block mr-2" />
              AI Generate
            </button>
            <button
              onClick={() => setActiveTab('docs_auto')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'docs_auto'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-5 h-5 inline-block mr-2" />
              Docs Auto Generate
            </button>
            <button
              onClick={() => setActiveTab('docs_manual')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'docs_manual'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 inline-block mr-2" />
              Docs Manual Generate
            </button>
          </div>
          
          {/* Row 2: Project Management */}
          <div className="grid grid-cols-3 bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'create'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-5 h-5 inline-block mr-2" />
              Create New
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'recent'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-5 h-5 inline-block mr-2" />
              Recent
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                activeTab === 'import'
                  ? 'bg-cyan-600 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-5 h-5 inline-block mr-2" />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          {activeTab === 'ai' && (
            <AIGenerationForm
              onGenerateWithAI={onGenerateWithAI}
              isProcessing={isProcessing}
              hasApiKey={hasApiKey}
              onApiKeySetup={onApiKeySetup}
            />
          )}

          {activeTab === 'docs_auto' && (
            <VideoGenerationForm
              onAutoGenerate={onAutoGenerate}
              isProcessing={isProcessing}
              hasApiKey={hasApiKey}
              onApiKeySetup={onApiKeySetup}
            />
          )}

          {activeTab === 'docs_manual' && (
            <ManualGenerationForm
              onManualGenerate={onManualGenerate}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'create' && (
            <ProjectCreator
              onCreateNew={onCreateNew}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'recent' && (
            <RecentPresentations
              recentPresentations={recentPresentations}
              onLoadPresentation={onLoadPresentation}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'import' && (
            <ProjectImporter
              onImportProject={onImportProject}
              isProcessing={isProcessing}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;