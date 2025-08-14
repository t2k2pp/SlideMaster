import React, { useState } from 'react';
import { 
  SlideGenerationRequest, 
  PresentationTheme, 
  PresentationPurpose, 
  PageNumberSettings, 
  ImageGenerationSettings, 
  SpeakerNotesSettings,
  DesignerType
} from '../../types';
import { 
  DEFAULT_IMAGE_GENERATION_SETTINGS, 
  DEFAULT_SPEAKER_NOTES_SETTINGS 
} from '../../constants';
import { getRecommendedPageNumberSettings, DEFAULT_PAGE_NUMBER_SETTINGS } from '../../utils/pageNumbers';
import { getRecommendedImageSettings } from '../../utils/imageConsistency';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Settings,
  AlertCircle,
  Key
} from 'lucide-react';

// Presentation Styles based on new 4-style system
const PRESENTATION_STYLES = [
  {
    id: 'auto',
    name: 'Auto（自動選択）',
    icon: '🤖',
    description: 'トピックに基づいて最適なスタイルを自動選択',
    philosophy: 'Smart Selection for Optimal Results',
    characteristics: ['用途別最適化', 'インテリジェント選択', 'バランス重視']
  },
  {
    id: 'simple',
    name: 'Simple（シンプル）',
    icon: '✨',
    description: 'シンプルで洗練されたデザイン、グラフや表を使いやすいレイアウト',
    philosophy: 'Clean and Professional',
    characteristics: ['論理的な構成', 'データ可視化重視', 'アジェンダ・結論・次のステップ']
  },
  {
    id: 'education',
    name: 'Education（教育）',
    icon: '📚',
    description: '文字サイズを大きくし、イラストやアイコンを多めに配置する教育向け',
    philosophy: 'Learn and Understand',
    characteristics: ['大きく読みやすい文字', '図解・ステップ形式', '分かりやすいビジュアル']
  },
  {
    id: 'marketing-oriented',
    name: 'Marketing（マーケティング）',
    icon: '🎯',
    description: '製品やサービスを魅力的に見せるビジュアル重視スタイル',
    philosophy: 'Visual Impact',
    characteristics: ['ビジュアルインパクト重視', '製品写真中心', '魅力的なデザイン']
  },
  {
    id: 'research-presentation-oriented',
    name: 'Research（研究発表）',
    icon: '🔬',
    description: '図表や数式をきれいに配置できる研究発表向けスタイル',
    philosophy: 'Logic and Structure',
    characteristics: ['論理的研究構成', 'フレームワーク対応', 'インフォグラフィック']
  }
];

// =================================================================
// AI Generation Form Component - AI-powered slide generation
// =================================================================

interface AIGenerationFormProps {
  onGenerateWithAI: (request: SlideGenerationRequest) => void;
  isProcessing: boolean;
  hasApiKey?: boolean;
  onApiKeySetup?: () => void;
}

const THEMES: { value: PresentationTheme; name: string; color: string; textColor: string; category: string }[] = [
  { value: 'auto', name: 'オート（自動選択）', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textColor: '#ffffff', category: 'Auto' },
  
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

export const AIGenerationForm: React.FC<AIGenerationFormProps> = ({
  onGenerateWithAI,
  isProcessing,
  hasApiKey = false,
  onApiKeySetup
}) => {
  const [aiTopic, setAiTopic] = useState('');
  const [aiSlideCount, setAiSlideCount] = useState(8);
  const [slideCountMode, setSlideCountMode] = useState<'manual' | 'auto'>('auto');
  const [slideCountSpecification, setSlideCountSpecification] = useState<'exact' | 'max' | 'min' | 'around'>('exact');
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme>('auto');
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerType>('auto');
  const [includeImages, setIncludeImages] = useState(true);
  const [imageFrequency, setImageFrequency] = useState<'every_slide' | 'every_2_slides' | 'every_3_slides' | 'every_5_slides' | 'sparse'>('every_slide');
  const [imageGenerationSettings, setImageGenerationSettings] = useState<ImageGenerationSettings>(DEFAULT_IMAGE_GENERATION_SETTINGS);
  const [pageNumbers, setPageNumbers] = useState<PageNumberSettings>(DEFAULT_PAGE_NUMBER_SETTINGS);
  const [speakerNotesSettings, setSpeakerNotesSettings] = useState<SpeakerNotesSettings>(DEFAULT_SPEAKER_NOTES_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = () => {
    if (!aiTopic.trim() || isProcessing) return;

    const request: SlideGenerationRequest = {
      topic: aiTopic.trim(),
      slideCount: aiSlideCount,
      autoSlideCount: slideCountMode === 'auto',
      slideCountMode: slideCountMode === 'manual' ? slideCountSpecification : undefined,
      theme: selectedTheme,
      designer: selectedDesigner,
      includeImages,
      aspectRatio: '16:9',
      imageSettings: includeImages ? imageGenerationSettings : undefined,
      pageNumberSettings: pageNumbers.enabled ? pageNumbers : undefined,
      speakerNotesSettings: speakerNotesSettings.enabled ? speakerNotesSettings : undefined,
    };

    onGenerateWithAI(request);
    setAiTopic('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleGenerate();
    }
  };

  // Show a notice if API key is not configured, but still display the form
  const showApiKeyNotice = !hasApiKey;
  
  // Debug logging
  //console.log('AIGenerationForm - hasApiKey:', hasApiKey);
  //console.log('AIGenerationForm - showApiKeyNotice:', showApiKeyNotice);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Generate with AI</h2>
        <p className="text-slate-500 dark:text-slate-400">Enter a topic and let AI create your presentation</p>
      </div>

      {/* APIキー警告 */}
      {!hasApiKey && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">APIキーが必要です</p>
            <p className="mb-3">AI機能を使用するには、APIキーの設定が必要です。マルチプロバイダー設定でGemini、Azure、OpenAI、Claude等のAPIキーを設定してください。</p>
            {onApiKeySetup && (
              <div className="flex justify-center">
                <button
                  onClick={onApiKeySetup}
                  className="px-3 py-2 bg-orange-600 text-slate-900 dark:text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                >
                  マルチプロバイダー設定
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Presentation Topic
          </label>
          <textarea
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="例：桃太郎の紙芝居を作成して"
            className="w-full p-4 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
            disabled={isProcessing || !hasApiKey}
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            💡 初心者の方はここにトピックを入力するだけでOK！AIが最適な設定を自動選択します
          </div>
        </div>

        {/* 詳細設定の折りたたみ */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <Settings className="w-4 h-4" />
            <span>詳細設定</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
              {/* デザイナー選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
                  🎨 プレゼンテーションスタイル選択
                </label>
                <div className="space-y-3">
                  {/* Auto option prominently displayed */}
                  <button
                    onClick={() => setSelectedDesigner('auto')}
                    className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                      selectedDesigner === 'auto'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                    disabled={isProcessing}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🤖</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                          Auto（自動選択）⭐ 推奨
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          トピックに基づいて最適なスタイルを自動選択
                        </div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-2">
                          "Smart Selection for Optimal Results"
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                            用途別最適化
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                            インテリジェント選択
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                            バランス重視
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Other styles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border-t pt-3">
                  {PRESENTATION_STYLES.filter(style => style.id !== 'auto').map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedDesigner(style.id)}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        selectedDesigner === style.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                      disabled={isProcessing}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                            {style.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            {style.description}
                          </div>
                          <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-2">
                            "{style.philosophy}"
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {style.characteristics.map((char, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-200 dark:bg-slate-800 p-2 rounded">
                  💡 各スタイルは異なる特徴でプレゼンテーションを作成します。初心者の方は「Auto」がおすすめです。
                </div>
              </div>


              {/* テーマ選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Theme
                </label>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {['Auto', 'Basic', 'Story', 'Children', 'Academic', 'Professional', 'Tech', 'Style', 'Modern', 'Impact', 'Cultural', 'Artistic'].map(category => {
                    const categoryThemes = THEMES.filter(theme => theme.category === category);
                    if (categoryThemes.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{category}</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {categoryThemes.map(theme => (
                            <button
                              key={theme.value}
                              onClick={() => setSelectedTheme(theme.value)}
                              className={`p-2 rounded-lg border-2 transition-colors ${
                                selectedTheme === theme.value
                                  ? 'border-cyan-500 bg-cyan-500/20'
                                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                              }`}
                              disabled={isProcessing}
                            >
                              <div 
                                className="w-5 h-5 rounded mx-auto mb-1 flex items-center justify-center text-xs font-bold border border-slate-400 dark:border-slate-600"
                                style={{ 
                                  background: theme.color,
                                  color: theme.textColor
                                }}
                              >
                                {theme.value === 'auto' ? '🤖' : theme.name[0]}
                              </div>
                              <span className="text-xs font-medium text-slate-900 dark:text-white">{theme.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* スライド数設定 */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Number of Slides
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSlideCountMode('auto')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        slideCountMode === 'auto'
                          ? 'bg-cyan-600 text-slate-900 dark:text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600'
                      }`}
                      disabled={isProcessing}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setSlideCountMode('manual')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        slideCountMode === 'manual'
                          ? 'bg-cyan-600 text-slate-900 dark:text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600'
                      }`}
                      disabled={isProcessing}
                    >
                      Manual
                    </button>
                  </div>
                  {slideCountMode === 'manual' && (
                    <div className="space-y-3">
                      <div className="flex gap-4 items-center">
                        <input
                          type="number"
                          value={aiSlideCount}
                          onChange={(e) => setAiSlideCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                          min="1"
                          max="30"
                          className="w-full p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        />
                        <select
                          value={slideCountSpecification}
                          onChange={(e) => setSlideCountSpecification(e.target.value as typeof slideCountSpecification)}
                          className="w-full p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        >
                          <option value="exact">指定ページ</option>
                          <option value="max">指定ページ以内</option>
                          <option value="min">指定ページ以上</option>
                          <option value="around">指定ページ前後</option>
                        </select>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 p-2 rounded">
                        {slideCountSpecification === 'exact' && '正確に指定した数のスライドを生成します'}
                        {slideCountSpecification === 'max' && '指定した数以下のスライドを生成します'}
                        {slideCountSpecification === 'min' && '指定した数以上のスライドを生成します'}
                        {slideCountSpecification === 'around' && '指定した数の前後（±2スライド）で生成します'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 画像生成オプション */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="include-images"
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                    disabled={isProcessing}
                  />
                  <label htmlFor="include-images" className="text-slate-600 dark:text-slate-300">
                    Include AI-generated images
                  </label>
                </div>
                
                {includeImages && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                        Image Frequency
                      </label>
                      <select
                        value={imageFrequency}
                        onChange={(e) => setImageFrequency(e.target.value as typeof imageFrequency)}
                        className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                        disabled={isProcessing}
                      >
                        <option value="every_slide">Every slide</option>
                        <option value="every_2_slides">Every 2 slides</option>
                        <option value="every_3_slides">Every 3 slides</option>
                        <option value="every_5_slides">Every 5 slides (game book style)</option>
                        <option value="sparse">Sparse (every 7 slides)</option>
                      </select>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        💡 For game books like "小学生向けゲームブック", choose "Every 5 slides"
                      </div>
                    </div>

                    {/* 画像一貫性設定 */}
                  <div className="space-y-3 border-l-2 border-amber-500 pl-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">画像一貫性設定</span>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">一貫性レベル</label>
                      <select
                        value={imageGenerationSettings.consistencyLevel}
                        onChange={(e) => setImageGenerationSettings({
                          ...imageGenerationSettings, 
                          consistencyLevel: e.target.value as any
                        })}
                        className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                        disabled={isProcessing}
                      >
                        <option value="auto">Auto（用途に応じて自動選択）</option>
                        <option value="unified">統一（スタイル・キャラクター一貫）</option>
                        <option value="mixed">ミックス（部分的一貫性）</option>
                        <option value="diverse">多様（バリエーション重視）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">画像スタイル</label>
                      <select
                        value={imageGenerationSettings.style}
                        onChange={(e) => setImageGenerationSettings({
                          ...imageGenerationSettings, 
                          style: e.target.value as any
                        })}
                        className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                        disabled={isProcessing}
                      >
                        <option value="auto">Auto（用途に応じて自動選択）</option>
                        <option value="anime">アニメ風</option>
                        <option value="storybook">童話・絵本風</option>
                        <option value="watercolor">水彩画風</option>
                        <option value="hand_drawn">手描き風</option>
                        <option value="realistic">写実的</option>
                        <option value="cartoon">カートゥーン</option>
                        <option value="traditional_japanese">和風・日本画</option>
                        <option value="cg_3d">3D CG</option>
                        <option value="minimalist">ミニマル</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">キャラクター一貫性</label>
                      <select
                        value={imageGenerationSettings.characterConsistency}
                        onChange={(e) => setImageGenerationSettings({
                          ...imageGenerationSettings, 
                          characterConsistency: e.target.value as any
                        })}
                        className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                        disabled={isProcessing}
                      >
                        <option value="auto">Auto（用途に応じて自動選択）</option>
                        <option value="maintain">維持（同じキャラクターを保持）</option>
                        <option value="avoid_repeat">非重複（新しいキャラクターを使用）</option>
                        <option value="free">自由（制限なし）</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        id="use-reference-image"
                        type="checkbox"
                        checked={imageGenerationSettings.useReferenceImage}
                        onChange={(e) => setImageGenerationSettings({
                          ...imageGenerationSettings, 
                          useReferenceImage: e.target.checked
                        })}
                        className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                        disabled={isProcessing}
                      />
                      <label htmlFor="use-reference-image" className="text-xs text-slate-700 dark:text-slate-300">
                        前の画像を参考にする（実験的機能）
                      </label>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 p-2 rounded">
                      💡 初心者の方は全て「Auto」がおすすめ！用途に応じて最適な設定を自動選択します
                      <div className="mt-1 text-xs text-slate-700 dark:text-slate-500">
                        ストーリーテリング→統一+維持、ビジネス→ミックス+自由、学術→多様+自由
                      </div>
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* スピーカーノート設定 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  📝 Speaker Notes & Talk Script
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      id="enable-speaker-notes"
                      type="checkbox"
                      checked={speakerNotesSettings.enabled}
                      onChange={(e) => setSpeakerNotesSettings({
                        ...speakerNotesSettings,
                        enabled: e.target.checked
                      })}
                      className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                      disabled={isProcessing}
                    />
                    <label htmlFor="enable-speaker-notes" className="text-sm text-slate-700 dark:text-gray-300">
                      スピーカーノートを生成する
                    </label>
                  </div>

                  {speakerNotesSettings.enabled && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">詳細レベル</label>
                        <select
                          value={speakerNotesSettings.detailLevel}
                          onChange={(e) => setSpeakerNotesSettings({
                            ...speakerNotesSettings,
                            detailLevel: e.target.value as any
                          })}
                          className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        >
                          <option value="minimal">最小限（キーポイントのみ）</option>
                          <option value="standard">標準（バランスの取れた内容）</option>
                          <option value="detailed">詳細（トークスクリプト風）</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="include-transition-cues"
                          type="checkbox"
                          checked={speakerNotesSettings.includeTransitionCues}
                          onChange={(e) => setSpeakerNotesSettings({
                            ...speakerNotesSettings,
                            includeTransitionCues: e.target.checked
                          })}
                          className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                          disabled={isProcessing}
                        />
                        <label htmlFor="include-transition-cues" className="text-xs text-slate-700 dark:text-gray-300">
                          場面転換の指示を含める
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="include-timing-notes"
                          type="checkbox"
                          checked={speakerNotesSettings.includeTimingNotes}
                          onChange={(e) => setSpeakerNotesSettings({
                            ...speakerNotesSettings,
                            includeTimingNotes: e.target.checked
                          })}
                          className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                          disabled={isProcessing}
                        />
                        <label htmlFor="include-timing-notes" className="text-xs text-slate-700 dark:text-gray-300">
                          タイミングの目安を含める
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">言語</label>
                        <select
                          value={speakerNotesSettings.language}
                          onChange={(e) => setSpeakerNotesSettings({
                            ...speakerNotesSettings,
                            language: e.target.value as any
                          })}
                          className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        >
                          <option value="auto">Auto（内容に応じて自動選択）</option>
                          <option value="japanese">日本語</option>
                          <option value="english">English</option>
                        </select>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 p-2 rounded">
                        💡 「詳細」レベルでは、プレゼンテーションで話す内容をそのまま記載したトークスクリプトを生成します
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* ページ番号設定 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Page Numbers
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">Style</label>
                    <select
                      value={pageNumbers.style}
                      onChange={(e) => setPageNumbers({...pageNumbers, style: e.target.value as any})}
                      className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                      disabled={isProcessing}
                    >
                      <option value="auto">Auto (recommended based on purpose)</option>
                      <option value="none">None (hidden)</option>
                      <option value="simple">Simple</option>
                      <option value="prominent">Prominent (for game books)</option>
                      <option value="subtle">Subtle</option>
                    </select>
                  </div>
                  
                  {pageNumbers.style !== 'none' && pageNumbers.style !== 'auto' && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">Format</label>
                        <select
                          value={pageNumbers.format}
                          onChange={(e) => setPageNumbers({...pageNumbers, format: e.target.value as any})}
                          className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        >
                          <option value="number_only">Number only (1, 2, 3...)</option>
                          <option value="current_of_total">Current / Total (1 / 10)</option>
                          <option value="current_total_separate">Current of Total (1 of 10)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-slate-700 dark:text-slate-400 mb-1">Position</label>
                        <select
                          value={pageNumbers.position}
                          onChange={(e) => setPageNumbers({...pageNumbers, position: e.target.value as any})}
                          className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          disabled={isProcessing}
                        >
                          <option value="bottom_center">Bottom Center</option>
                          <option value="bottom_right">Bottom Right</option>
                          <option value="bottom_left">Bottom Left</option>
                          <option value="top_right">Top Right</option>
                          <option value="top_left">Top Left</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          id="show-on-title"
                          type="checkbox"
                          checked={pageNumbers.showOnTitleSlide}
                          onChange={(e) => setPageNumbers({...pageNumbers, showOnTitleSlide: e.target.checked})}
                          className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                          disabled={isProcessing}
                        />
                        <label htmlFor="show-on-title" className="text-xs text-slate-700 dark:text-gray-300">
                          タイトルスライドにも表示
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!aiTopic.trim() || isProcessing || !hasApiKey}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          {!hasApiKey ? 'API Key Required' : isProcessing ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>
    </div>
  );
};