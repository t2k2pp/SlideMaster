import React, { useState, useRef } from 'react';
import { Presentation, Slide, PresentationTheme } from '../../types';
import { Video, Upload, Play, AlertCircle, Key } from 'lucide-react';
import { generateSlidesFromVideo } from '../../services/geminiService';

// =================================================================
// Video Generation Form Component - Auto generate slides from video
// =================================================================

interface VideoGenerationFormProps {
  onAutoGenerate: (presentation: Presentation) => void;
  isProcessing: boolean;
  hasApiKey?: boolean;
  onApiKeySetup?: () => void;
}

interface GenerationOptions {
  theme: string;
  aspectRatio: string;
  includeImages: boolean;
  autoSlideCount: boolean;
  slideCount: number;
  slideCountSpecification: 'exact' | 'max' | 'min' | 'around';
  imagePosition: 'top' | 'bottom' | 'left' | 'right';
  scenario: 'manual' | 'corporate' | 'education' | 'event' | 'business' | 'marketing' | 'technical' | 'creative';
}

const THEMES: { value: PresentationTheme; name: string; color: string; textColor: string; category: string }[] = [
  // Basic Themes
  { value: 'professional', name: 'Professional', color: '#111827', textColor: '#ffffff', category: 'Basic' },
  { value: 'creative', name: 'Creative', color: '#312e81', textColor: '#fcd34d', category: 'Basic' },
  { value: 'minimalist', name: 'Minimalist', color: '#ffffff', textColor: '#1f2937', category: 'Basic' },
  { value: 'playful', name: 'Playful', color: '#155e75', textColor: '#ffffff', category: 'Basic' },
  
  // Storytelling & Children
  { value: 'storytelling', name: 'Storytelling', color: 'linear-gradient(135deg, #7c2d12 0%, #a16207 100%)', textColor: '#fbbf24', category: 'Story' },
  { value: 'children_bright', name: 'Children Bright', color: 'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #facc15 100%)', textColor: '#ffffff', category: 'Children' },
  { value: 'children_pastel', name: 'Children Pastel', color: 'linear-gradient(135deg, #fce7f3 0%, #e0e7ff 100%)', textColor: '#7c3aed', category: 'Children' },
  
  // Academic & Professional
  { value: 'academic', name: 'Academic', color: '#0f172a', textColor: '#60a5fa', category: 'Academic' },
  { value: 'medical', name: 'Medical', color: '#ffffff', textColor: '#0369a1', category: 'Professional' },
  { value: 'tech_modern', name: 'Tech Modern', color: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', textColor: '#22d3ee', category: 'Tech' },
  
  // Style & Aesthetic
  { value: 'vintage_retro', name: 'Vintage Retro', color: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', textColor: '#fbbf24', category: 'Style' },
  { value: 'nature_organic', name: 'Nature Organic', color: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', textColor: '#a3e635', category: 'Style' },
  { value: 'elegant_luxury', name: 'Elegant Luxury', color: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)', textColor: '#fbbf24', category: 'Style' },
  
  // Modern & Impact
  { value: 'dark_modern', name: 'Dark Modern', color: '#020617', textColor: '#a78bfa', category: 'Modern' },
  { value: 'bold_impact', name: 'Bold Impact', color: 'linear-gradient(45deg, #dc2626 0%, #1f2937 100%)', textColor: '#facc15', category: 'Impact' },
  { value: 'neon_cyberpunk', name: 'Neon Cyberpunk', color: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)', textColor: '#22d3ee', category: 'Tech' },
  
  // Cultural & Artistic
  { value: 'traditional_japanese', name: 'Traditional Japanese', color: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)', textColor: '#7c2d12', category: 'Cultural' },
  { value: 'hand_drawn', name: 'Hand Drawn', color: '#fef9c3', textColor: '#dc2626', category: 'Artistic' },
  { value: 'magazine_glossy', name: 'Magazine Glossy', color: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', textColor: '#fbbf24', category: 'Modern' },
];

const VIDEO_SCENARIOS = [
  { 
    value: 'manual', 
    name: 'PC操作マニュアル作成', 
    description: 'PC操作の手順をマニュアル化（既存機能）',
    icon: '💻'
  },
  { 
    value: 'corporate', 
    name: '社内コミュニケーション', 
    description: '社内行事・会議・進捗報告の記録',
    icon: '🏢'
  },
  { 
    value: 'education', 
    name: '教育・研修', 
    description: 'オンライン研修・講義・セミナーの要約',
    icon: '📚'
  },
  { 
    value: 'event', 
    name: 'イベント・記録', 
    description: '学校行事・パーティー・スポーツの記録',
    icon: '🎉'
  },
  { 
    value: 'business', 
    name: 'ビジネス活用', 
    description: '商品デモ・顧客インタビュー・業務紹介',
    icon: '💼'
  },
  { 
    value: 'marketing', 
    name: 'マーケティング・営業', 
    description: 'ライブ配信・製品レビュー・競合分析',
    icon: '📈'
  },
  { 
    value: 'technical', 
    name: '技術・開発', 
    description: 'コードレビュー・障害対応・技術カンファレンス',
    icon: '⚙️'
  },
  { 
    value: 'creative', 
    name: 'エンターテイメント・クリエイティブ', 
    description: '料理・DIY・旅行などの創作活動',
    icon: '🎨'
  }
];

export const VideoGenerationForm: React.FC<VideoGenerationFormProps> = ({
  onAutoGenerate,
  isProcessing,
  hasApiKey = false,
  onApiKeySetup
}) => {
  const [autoVideoFile, setAutoVideoFile] = useState<File | null>(null);
  const [autoError, setAutoError] = useState<string>('');
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProgress, setAutoProgress] = useState<{ task: string; progress: number }>({ task: '', progress: 0 });
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    theme: 'professional',
    aspectRatio: '16:9',
    includeImages: true,
    autoSlideCount: true,
    slideCount: 8,
    slideCountSpecification: 'exact',
    imagePosition: 'right',
    scenario: 'manual'
  });

  const autoFileInputRef = useRef<HTMLInputElement>(null);

  const handleAutoVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAutoVideoFile(file);
      setAutoError('');
    }
  };

  const handleAutoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setAutoVideoFile(file);
      setAutoError('');
    }
  };

  const handleAutoDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleAutoGenerate = async () => {
    if (!autoVideoFile || isAutoProcessing || !hasApiKey) return;

    setIsAutoProcessing(true);
    setAutoError('');
    setAutoProgress({ task: 'Analyzing video...', progress: 10 });

    try {
      setAutoProgress({ task: 'Processing video content...', progress: 30 });
      
      const result = await generateSlidesFromVideo(
        autoVideoFile,
        generationOptions
      );

      setAutoProgress({ task: 'Generating presentation...', progress: 80 });
      
      if (result.presentation) {
        setAutoProgress({ task: 'Finalizing...', progress: 100 });
        onAutoGenerate(result.presentation);
        setAutoVideoFile(null);
      }
    } catch (error) {
      console.error('Auto generation error:', error);
      setAutoError(error instanceof Error ? error.message : 'An error occurred during generation');
    } finally {
      setIsAutoProcessing(false);
      setAutoProgress({ task: '', progress: 0 });
    }
  };

  // Show a notice if API key is not configured, but still display the form
  const showApiKeyNotice = !hasApiKey;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Auto Generate from Video</h2>
        <p className="text-slate-500 dark:text-slate-400">Upload a video and let AI analyze it to create slides automatically</p>
      </div>

      {/* APIキー警告 */}
      {showApiKeyNotice && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">APIキーが必要です</p>
            <p className="mb-3">AI機能を使用するには、Gemini APIキーの設定が必要です。</p>
            {onApiKeySetup && (
              <div className="flex justify-center">
                <button
                  onClick={onApiKeySetup}
                  className="px-3 py-2 bg-orange-600 text-slate-900 dark:text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                >
                  APIキーを設定
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Scenario Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            動画の用途を選択してください
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VIDEO_SCENARIOS.map(scenario => (
              <button
                key={scenario.value}
                onClick={() => {
                  setGenerationOptions(prev => ({ ...prev, scenario: scenario.value as any }));
                }}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                  generationOptions.scenario === scenario.value
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
                disabled={isAutoProcessing}
              >
                <span className="text-2xl">{scenario.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">{scenario.name}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-400 mt-1">{scenario.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Upload */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Upload Video File
          </label>
          <div
            onDrop={handleAutoDrop}
            onDragOver={handleAutoDragOver}
            onClick={() => autoFileInputRef.current?.click()}
            className={`
              border-2 border-dashed border-gray-600 rounded-lg p-6 text-center transition-all cursor-pointer
              ${isAutoProcessing || !hasApiKey
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-cyan-400 hover:bg-gray-800/50'
              }
            `}
          >
            {autoVideoFile ? (
              <div className="space-y-2">
                <Play className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-white font-medium">{autoVideoFile.name}</p>
                <p className="text-gray-400 text-sm">
                  {(autoVideoFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoVideoFile(null);
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={isAutoProcessing}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-gray-300">Drop video here or click to upload</p>
                <p className="text-gray-500 text-sm">
                  Supports MP4, MOV, AVI
                </p>
              </div>
            )}
          </div>
          <input
            ref={autoFileInputRef}
            type="file"
            accept="video/*"
            onChange={handleAutoVideoSelect}
            className="hidden"
            disabled={isAutoProcessing}
          />
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Theme
          </label>
          <div className="max-h-64 overflow-y-auto space-y-3 border border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-slate-200 dark:bg-slate-800">
            {['Basic', 'Story', 'Children', 'Academic', 'Professional', 'Tech', 'Style', 'Modern', 'Impact', 'Cultural', 'Artistic'].map(category => {
              const categoryThemes = THEMES.filter(theme => theme.category === category);
              if (categoryThemes.length === 0) return null;
              
              return (
                <div key={category}>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{category}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categoryThemes.map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => setGenerationOptions(prev => ({ ...prev, theme: theme.value }))}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          generationOptions.theme === theme.value
                            ? 'border-cyan-500 bg-cyan-500/20'
                            : 'border-slate-400 dark:border-slate-600 hover:border-slate-500'
                        }`}
                        disabled={isAutoProcessing}
                      >
                        <div 
                          className="w-4 h-4 rounded mx-auto mb-1 flex items-center justify-center text-xs font-bold border border-slate-400 dark:border-slate-600"
                          style={{ 
                            background: theme.color,
                            color: theme.textColor
                          }}
                        >
                          {theme.name[0]}
                        </div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Custom Theme Option */}
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Custom</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  onClick={() => setGenerationOptions(prev => ({ ...prev, theme: 'custom' }))}
                  className={`p-2 rounded-lg border-2 transition-colors ${
                    generationOptions.theme === 'custom'
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-slate-400 dark:border-slate-600 hover:border-slate-500'
                  }`}
                  disabled={isAutoProcessing}
                >
                  <div 
                    className="w-4 h-4 rounded mx-auto mb-1 flex items-center justify-center text-xs font-bold border border-slate-400 dark:border-slate-600"
                    style={{ 
                      background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff'
                    }}
                  >
                    C
                  </div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">Custom</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Aspect Ratio
            </label>
            <select
              value={generationOptions.aspectRatio}
              onChange={(e) => setGenerationOptions(prev => ({ ...prev, aspectRatio: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              disabled={isAutoProcessing}
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          {/* Image Position */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Image Position
            </label>
            <select
              value={generationOptions.imagePosition}
              onChange={(e) => setGenerationOptions(prev => ({ ...prev, imagePosition: e.target.value as 'top' | 'bottom' | 'left' | 'right' }))}
              className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              disabled={isAutoProcessing}
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={generationOptions.includeImages}
              onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
              className="mr-3 rounded text-cyan-400 focus:ring-cyan-400"
              disabled={isAutoProcessing}
            />
            <span className="text-slate-900 dark:text-white">Extract frames from video as images</span>
          </label>

          {/* スライド数設定 - AI Generateと同等の機能 */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Number of Slides
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setGenerationOptions(prev => ({ ...prev, autoSlideCount: true }))}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    generationOptions.autoSlideCount
                      ? 'bg-cyan-600 text-slate-900 dark:text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600'
                  }`}
                  disabled={isAutoProcessing}
                >
                  Auto
                </button>
                <button
                  onClick={() => setGenerationOptions(prev => ({ ...prev, autoSlideCount: false }))}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !generationOptions.autoSlideCount
                      ? 'bg-cyan-600 text-slate-900 dark:text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600'
                  }`}
                  disabled={isAutoProcessing}
                >
                  Manual
                </button>
              </div>
              {!generationOptions.autoSlideCount && (
                <div className="space-y-3">
                  <div className="flex gap-4 items-center">
                    <input
                      type="number"
                      value={generationOptions.slideCount}
                      onChange={(e) => setGenerationOptions(prev => ({ 
                        ...prev, 
                        slideCount: Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
                      }))}
                      min="1"
                      max="30"
                      className="w-full p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                      disabled={isAutoProcessing}
                    />
                    <select
                      value={generationOptions.slideCountSpecification}
                      onChange={(e) => setGenerationOptions(prev => ({ 
                        ...prev, 
                        slideCountSpecification: e.target.value as 'exact' | 'max' | 'min' | 'around'
                      }))}
                      className="w-full p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      disabled={isAutoProcessing}
                    >
                      <option value="exact">指定ページ</option>
                      <option value="max">指定ページ以内</option>
                      <option value="min">指定ページ以上</option>
                      <option value="around">指定ページ前後</option>
                    </select>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 p-2 rounded">
                    {generationOptions.slideCountSpecification === 'exact' && '正確に指定した数のスライドを生成します'}
                    {generationOptions.slideCountSpecification === 'max' && '指定した数以下のスライドを生成します'}
                    {generationOptions.slideCountSpecification === 'min' && '指定した数以上のスライドを生成します'}
                    {generationOptions.slideCountSpecification === 'around' && '指定した数の前後（±2スライド）で生成します'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {autoError && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-200">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{autoError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {isAutoProcessing && (
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-blue-200 font-medium">{autoProgress.task}</p>
                <div className="w-full bg-blue-800/50 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${autoProgress.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleAutoGenerate}
          disabled={!autoVideoFile || isAutoProcessing || isProcessing || !hasApiKey}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Video className="w-5 h-5" />
          {!hasApiKey ? 'API Key Required' : isAutoProcessing ? 'Analyzing Video...' : 'Generate from Video'}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-slate-200 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <li>• Upload a video file (tutorial, presentation, demo, etc.)</li>
          <li>• AI analyzes the video content and extracts key information</li>
          <li>• Automatic slide generation with timestamps and frame extraction</li>
          <li>• Perfect for creating documentation from recorded content</li>
        </ul>
      </div>
    </div>
  );
};