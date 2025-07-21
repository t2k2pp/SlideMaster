import { TextStyle, PresentationSettings, SlideTemplate, PresentationPurpose, PageNumberSettings, PageNumberStyle, PageNumberFormat, ImageGenerationSettings, SpeakerNotesSettings } from './types';

// =================================================================
// Text Styles (enhanced from CreatetiveStudioAI)
// =================================================================

export const TEXT_STYLES: TextStyle[] = [
  // Basic Styles
  {
    id: 'modern-bold-white',
    name: 'Modern Bold White',
    style: {
      color: 'white',
      fontWeight: 900,
      textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
      fontFamily: '"Inter", sans-serif',
    },
  },
  {
    id: 'professional-dark',
    name: 'Professional Dark',
    style: {
      color: '#1e293b',
      fontWeight: 600,
      fontFamily: '"Roboto Slab", serif',
    },
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    style: {
      color: '#64748b',
      fontWeight: 400,
      fontFamily: '"Inter", sans-serif',
    },
  },
  
  // Creative & Artistic Styles
  {
    id: 'creative-gradient',
    name: 'Creative Gradient',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontFamily: '"Poppins", sans-serif',
    },
  },
  {
    id: 'playful-colorful',
    name: 'Playful Colorful',
    style: {
      color: '#f59e0b',
      fontWeight: 700,
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
      fontFamily: '"Poppins", sans-serif',
    },
  },
  {
    id: 'rainbow-gradient',
    name: 'Rainbow Gradient',
    style: {
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontFamily: '"Comic Neue", cursive',
    },
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    style: {
      color: '#22d3ee',
      fontWeight: 700,
      textShadow: '0 0 10px #22d3ee, 0 0 20px #22d3ee, 0 0 30px #22d3ee',
      fontFamily: '"Orbitron", sans-serif',
    },
  },
  
  // Storytelling & Narrative Styles
  {
    id: 'storybook-title',
    name: 'Storybook Title',
    style: {
      color: '#7c2d12',
      fontWeight: 700,
      fontFamily: '"Crimson Text", serif',
      fontSize: '3.5rem',
      textShadow: '2px 2px 4px rgba(124, 45, 18, 0.3)',
    },
  },
  {
    id: 'fairy-tale',
    name: 'Fairy Tale',
    style: {
      color: '#fbbf24',
      fontWeight: 600,
      fontFamily: '"Dancing Script", cursive',
      textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'handwritten-casual',
    name: 'Handwritten Casual',
    style: {
      color: '#374151',
      fontWeight: 400,
      fontFamily: '"Kalam", cursive',
      transform: 'rotate(-1deg)',
    },
  },
  
  // Children's Styles
  {
    id: 'children-bold',
    name: 'Children Bold',
    style: {
      color: '#dc2626',
      fontWeight: 900,
      fontFamily: '"Comic Neue", cursive',
      textShadow: '2px 2px 0px #fff, 3px 3px 0px #000',
    },
  },
  {
    id: 'children-pastel',
    name: 'Children Pastel',
    style: {
      color: '#7c3aed',
      fontWeight: 600,
      fontFamily: '"Nunito", sans-serif',
      textShadow: '1px 1px 2px rgba(124, 58, 237, 0.3)',
    },
  },
  {
    id: 'bubble-letters',
    name: 'Bubble Letters',
    style: {
      color: '#ec4899',
      fontWeight: 900,
      fontFamily: '"Fredoka One", cursive',
      textShadow: '3px 3px 0px #fff, 4px 4px 0px #000',
    },
  },
  
  // Academic & Professional Styles
  {
    id: 'academic-serif',
    name: 'Academic Serif',
    style: {
      color: '#1e3a8a',
      fontWeight: 500,
      fontFamily: '"Crimson Text", serif',
      lineHeight: 1.6,
    },
  },
  {
    id: 'research-paper',
    name: 'Research Paper',
    style: {
      color: '#374151',
      fontWeight: 400,
      fontFamily: '"Source Serif Pro", serif',
      lineHeight: 1.7,
    },
  },
  {
    id: 'medical-clean',
    name: 'Medical Clean',
    style: {
      color: '#0369a1',
      fontWeight: 500,
      fontFamily: '"Source Sans Pro", sans-serif',
      letterSpacing: '0.025em',
    },
  },
  
  // Tech & Modern Styles
  {
    id: 'tech-mono',
    name: 'Tech Monospace',
    style: {
      color: '#22d3ee',
      fontWeight: 500,
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: '0.05em',
    },
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    style: {
      color: '#8b5cf6',
      fontWeight: 600,
      fontFamily: '"Rajdhani", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  
  // Elegant & Luxury Styles
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    style: {
      color: '#f8fafc',
      fontWeight: 500,
      fontFamily: '"Playfair Display", serif',
      fontStyle: 'italic',
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    style: {
      color: '#fbbf24',
      fontWeight: 600,
      fontFamily: '"Playfair Display", serif',
      textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
    },
  },
  
  // Nature & Organic Styles
  {
    id: 'nature-green',
    name: 'Nature Green',
    style: {
      color: '#15803d',
      fontWeight: 600,
      fontFamily: '"Merriweather", serif',
      textShadow: '1px 1px 2px rgba(21, 128, 61, 0.3)',
    },
  },
  {
    id: 'earth-tone',
    name: 'Earth Tone',
    style: {
      color: '#92400e',
      fontWeight: 500,
      fontFamily: '"Lora", serif',
      fontStyle: 'italic',
    },
  },
  
  // Impact & Bold Styles
  {
    id: 'impact-red',
    name: 'Impact Red',
    style: {
      color: '#dc2626',
      fontWeight: 900,
      fontFamily: '"Oswald", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    style: {
      color: '#facc15',
      fontWeight: 800,
      fontFamily: '"Montserrat", sans-serif',
      textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
    },
  },
  
  // Soft & Gentle Styles
  {
    id: 'soft-script',
    name: 'Soft Script',
    style: {
      color: '#6d28d9',
      fontWeight: 400,
      fontFamily: '"Dancing Script", cursive',
      fontSize: '1.2em',
    },
  },
  {
    id: 'gentle-sans',
    name: 'Gentle Sans',
    style: {
      color: '#4c1d95',
      fontWeight: 300,
      fontFamily: '"Lato", sans-serif',
      letterSpacing: '0.025em',
    },
  },
  
  // Vintage & Retro Styles
  {
    id: 'vintage-serif',
    name: 'Vintage Serif',
    style: {
      color: '#78350f',
      fontWeight: 600,
      fontFamily: '"Playfair Display", serif',
      textShadow: '1px 1px 2px rgba(120, 53, 15, 0.3)',
    },
  },
  {
    id: 'retro-script',
    name: 'Retro Script',
    style: {
      color: '#fbbf24',
      fontWeight: 500,
      fontFamily: '"Lora", serif',
      fontStyle: 'italic',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    },
  },
  
  // Newspaper & Magazine Styles
  {
    id: 'newspaper-headline',
    name: 'Newspaper Headline',
    style: {
      color: '#1f2937',
      fontWeight: 900,
      fontFamily: '"Playfair Display", serif',
      lineHeight: 1.2,
    },
  },
  {
    id: 'magazine-modern',
    name: 'Magazine Modern',
    style: {
      color: '#ec4899',
      fontWeight: 700,
      fontFamily: '"Montserrat", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  
  // Traditional & Cultural Styles
  {
    id: 'japanese-traditional',
    name: 'Japanese Traditional',
    style: {
      color: '#7c2d12',
      fontWeight: 500,
      fontFamily: '"Noto Serif JP", serif',
    },
  },
  {
    id: 'calligraphy-style',
    name: 'Calligraphy Style',
    style: {
      color: '#451a03',
      fontWeight: 400,
      fontFamily: '"Noto Sans JP", sans-serif',
      fontStyle: 'italic',
    },
  },
  
  // Page Number Styles
  {
    id: 'page-number-style',
    name: 'Page Number',
    style: {
      color: '#64748b',
      fontWeight: 'normal',
      fontFamily: '"Inter", sans-serif',
      fontSize: '14px',
    },
  },
];

// =================================================================
// Presentation Purpose Configurations
// =================================================================

export const PRESENTATION_PURPOSES: {
  value: PresentationPurpose;
  name: string;
  description: string;
  icon: string;
  recommendedThemes: string[];
  recommendedAspectRatio: string;
}[] = [
  {
    value: 'auto',
    name: 'オート（自動選択）',
    description: 'AIがトピックに基づいて最適な用途を判断',
    icon: '🤖',
    recommendedThemes: ['auto'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'storytelling',
    name: '物語・ストーリーテリング',
    description: '絵本、紙芝居、物語の作成',
    icon: '📚',
    recommendedThemes: ['storytelling', 'hand_drawn', 'children_pastel'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'children_content',
    name: '子供向けコンテンツ',
    description: '幼児・子供向けの学習・娯楽コンテンツ',
    icon: '🧸',
    recommendedThemes: ['children_bright', 'children_pastel', 'playful'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'business_presentation',
    name: 'ビジネスプレゼンテーション',
    description: '企業・ビジネス向けのプレゼンテーション',
    icon: '💼',
    recommendedThemes: ['professional', 'minimalist', 'dark_modern'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'educational_content',
    name: '教育・学習コンテンツ',
    description: '学校・教育機関向けの学習資料',
    icon: '🎓',
    recommendedThemes: ['academic', 'professional', 'medical'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'tutorial_guide',
    name: 'チュートリアル・ガイド',
    description: '手順説明・操作ガイド・マニュアル',
    icon: '📋',
    recommendedThemes: ['minimalist', 'tech_modern', 'medical'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'portfolio_showcase',
    name: 'ポートフォリオ・作品紹介',
    description: '作品集・実績紹介・ショーケース',
    icon: '🎨',
    recommendedThemes: ['elegant_luxury', 'magazine_glossy', 'dark_modern'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'marketing_pitch',
    name: 'マーケティング・営業資料',
    description: '商品紹介・営業提案・マーケティング資料',
    icon: '📈',
    recommendedThemes: ['bold_impact', 'magazine_glossy', 'professional'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'academic_research',
    name: '学術・研究発表',
    description: '論文発表・研究報告・学会発表',
    icon: '🔬',
    recommendedThemes: ['academic', 'minimalist', 'medical'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'event_announcement',
    name: 'イベント・告知',
    description: 'イベント案内・お知らせ・広報資料',
    icon: '📅',
    recommendedThemes: ['creative', 'playful'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'training_material',
    name: '研修・トレーニング資料',
    description: '社内研修・スキルアップ・教育資料',
    icon: '💪',
    recommendedThemes: ['professional', 'creative'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'product_demo',
    name: '製品・サービスデモ',
    description: '製品紹介・サービス説明・デモンストレーション',
    icon: '🖥️',
    recommendedThemes: ['professional', 'minimalist'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'report_summary',
    name: 'レポート・報告書',
    description: '業務報告・分析結果・要約資料',
    icon: '📊',
    recommendedThemes: ['professional', 'minimalist'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'creative_project',
    name: 'クリエイティブプロジェクト',
    description: 'アート作品・創作活動・クリエイティブ企画',
    icon: '🎭',
    recommendedThemes: ['creative', 'playful'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'game_content',
    name: 'ゲーム・インタラクティブコンテンツ',
    description: 'ゲーム企画・インタラクティブストーリー',
    icon: '🎮',
    recommendedThemes: ['creative', 'playful'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'digital_signage',
    name: 'デジタルサイネージ',
    description: 'デジタル看板・表示コンテンツ・案内表示',
    icon: '📺',
    recommendedThemes: ['minimalist', 'professional'],
    recommendedAspectRatio: '16:9'
  },
  {
    value: 'video_storyboard',
    name: '動画制作用ストーリーボード',
    description: '動画・映像制作の絵コンテ・構成案',
    icon: '🎬',
    recommendedThemes: ['minimalist', 'creative'],
    recommendedAspectRatio: '16:9'
  }
];

// =================================================================
// Canvas and Slide Settings
// =================================================================

export const CANVAS_SIZES = {
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1280, height: 960 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '3:4': { width: 960, height: 1280 },
};

// =================================================================
// Default Image Generation Settings
// =================================================================

export const DEFAULT_IMAGE_GENERATION_SETTINGS: ImageGenerationSettings = {
  consistencyLevel: 'auto',
  style: 'auto',
  characterConsistency: 'auto',
  useReferenceImage: false,
  styleDescription: '',
};

export const DEFAULT_SPEAKER_NOTES_SETTINGS: SpeakerNotesSettings = {
  enabled: true,
  detailLevel: 'standard',
  includeTransitionCues: false,
  includeTimingNotes: false,
  language: 'auto',
};

// Temporary placeholder - will be updated after DEFAULT_PAGE_NUMBER_SETTINGS is defined
export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  defaultAspectRatio: '16:9',
  defaultBackground: '#111827',
  autoSave: false, // Disable frequent auto-save
  showGrid: false,
  snapToGrid: true,
  gridSize: 20,
  pageNumbers: {
    style: 'simple',
    format: 'number_only',
    position: 'bottom_center',
    showOnTitleSlide: false,
    customPrefix: '',
  },
  imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
};

// =================================================================
// Theme Configurations  
// =================================================================

export const THEME_CONFIGS = {
  professional: {
    name: 'Professional',
    primaryColor: '#111827',
    secondaryColor: '#1f2937',
    accentColor: '#3b82f6',
    textColor: '#ffffff',
    backgroundColor: '#111827',
    titleFont: '"Roboto Slab", serif',
    contentFont: '"Inter", sans-serif',
    titleColor: '#ffffff',
    contentColor: '#d1d5db',
  },
  creative: {
    name: 'Creative',
    primaryColor: '#312e81',
    secondaryColor: '#3730a3',
    accentColor: '#fcd34d',
    textColor: '#c7d2fe',
    backgroundColor: '#312e81',
    titleFont: '"Poppins", sans-serif',
    contentFont: '"Inter", sans-serif',
    titleColor: '#fcd34d',
    contentColor: '#c7d2fe',
  },
  minimalist: {
    name: 'Minimalist',
    primaryColor: '#ffffff',
    secondaryColor: '#e5e7eb',
    accentColor: '#6b7280',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    titleFont: '"Inter", sans-serif',
    contentFont: '"Inter", sans-serif',
    titleColor: '#1f2937',
    contentColor: '#4b5563',
  },
  playful: {
    name: 'Playful',
    primaryColor: '#155e75',
    secondaryColor: '#0f766e',
    accentColor: '#06b6d4',
    textColor: '#a7f3d0',
    backgroundColor: '#155e75',
    titleFont: '"Poppins", sans-serif',
    contentFont: '"Inter", sans-serif',
    titleColor: '#ffffff',
    contentColor: '#a7f3d0',
  },
  storytelling: {
    name: 'Storytelling',
    primaryColor: '#7c2d12', // warm brown
    secondaryColor: '#a16207', // amber-700
    accentColor: '#f59e0b', // amber-500
    textColor: '#fef3c7', // amber-100
    backgroundColor: 'linear-gradient(135deg, #7c2d12 0%, #a16207 100%)',
    titleFont: '"Crimson Text", serif',
    contentFont: '"Libre Baskerville", serif',
    titleColor: '#fbbf24', // amber-400
    contentColor: '#fef3c7',
  },
  children_bright: {
    name: 'Children Bright',
    primaryColor: '#dc2626', // red-600
    secondaryColor: '#ea580c', // orange-600
    accentColor: '#facc15', // yellow-400
    textColor: '#ffffff',
    backgroundColor: 'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #facc15 100%)',
    titleFont: '"Comic Neue", cursive',
    contentFont: '"Comic Neue", cursive',
    titleColor: '#ffffff',
    contentColor: '#fef9c3', // yellow-100
  },
  children_pastel: {
    name: 'Children Pastel',
    primaryColor: '#fce7f3', // pink-100
    secondaryColor: '#e0e7ff', // indigo-100
    accentColor: '#a78bfa', // violet-400
    textColor: '#1f2937', // gray-800
    backgroundColor: 'linear-gradient(135deg, #fce7f3 0%, #e0e7ff 100%)',
    titleFont: '"Nunito", sans-serif',
    contentFont: '"Nunito", sans-serif',
    titleColor: '#7c3aed', // violet-600
    contentColor: '#4b5563', // gray-600
  },
  academic: {
    name: 'Academic',
    primaryColor: '#1e3a8a', // blue-800
    secondaryColor: '#1e40af', // blue-700
    accentColor: '#3b82f6', // blue-500
    textColor: '#f8fafc', // slate-50
    backgroundColor: '#0f172a', // slate-900
    titleFont: '"Crimson Text", serif',
    contentFont: '"Source Serif Pro", serif',
    titleColor: '#60a5fa', // blue-400
    contentColor: '#cbd5e1', // slate-300
  },
  medical: {
    name: 'Medical',
    primaryColor: '#ffffff',
    secondaryColor: '#f1f5f9', // slate-100
    accentColor: '#0ea5e9', // sky-500
    textColor: '#0f172a', // slate-900
    backgroundColor: '#ffffff',
    titleFont: '"Source Sans Pro", sans-serif',
    contentFont: '"Source Sans Pro", sans-serif',
    titleColor: '#0369a1', // sky-700
    contentColor: '#334155', // slate-700
  },
  tech_modern: {
    name: 'Tech Modern',
    primaryColor: '#0f172a', // slate-900
    secondaryColor: '#1e293b', // slate-800
    accentColor: '#06b6d4', // cyan-500
    textColor: '#f1f5f9', // slate-100
    backgroundColor: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    titleFont: '"JetBrains Mono", monospace',
    contentFont: '"Inter", sans-serif',
    titleColor: '#22d3ee', // cyan-400
    contentColor: '#94a3b8', // slate-400
  },
  vintage_retro: {
    name: 'Vintage Retro',
    primaryColor: '#78350f', // amber-800
    secondaryColor: '#92400e', // amber-700
    accentColor: '#f59e0b', // amber-500
    textColor: '#fef3c7', // amber-100
    backgroundColor: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
    titleFont: '"Playfair Display", serif',
    contentFont: '"Lora", serif',
    titleColor: '#fbbf24', // amber-400
    contentColor: '#fed7aa', // orange-200
  },
  nature_organic: {
    name: 'Nature Organic',
    primaryColor: '#15803d', // green-700
    secondaryColor: '#166534', // green-800
    accentColor: '#84cc16', // lime-500
    textColor: '#f0fdf4', // green-50
    backgroundColor: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
    titleFont: '"Merriweather", serif',
    contentFont: '"Lato", sans-serif',
    titleColor: '#a3e635', // lime-400
    contentColor: '#dcfce7', // green-100
  },
  elegant_luxury: {
    name: 'Elegant Luxury',
    primaryColor: '#1c1917', // stone-900
    secondaryColor: '#292524', // stone-800
    accentColor: '#eab308', // yellow-500
    textColor: '#fafaf9', // stone-50
    backgroundColor: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
    titleFont: '"Playfair Display", serif',
    contentFont: '"Crimson Text", serif',
    titleColor: '#fbbf24', // amber-400
    contentColor: '#e7e5e4', // stone-200
  },
  dark_modern: {
    name: 'Dark Modern',
    primaryColor: '#020617', // slate-950
    secondaryColor: '#0f172a', // slate-900
    accentColor: '#8b5cf6', // violet-500
    textColor: '#f8fafc', // slate-50
    backgroundColor: '#020617',
    titleFont: '"Inter", sans-serif',
    contentFont: '"Inter", sans-serif',
    titleColor: '#a78bfa', // violet-400
    contentColor: '#cbd5e1', // slate-300
  },
  warm_friendly: {
    name: 'Warm Friendly',
    primaryColor: '#ea580c', // orange-600
    secondaryColor: '#dc2626', // red-600
    accentColor: '#facc15', // yellow-400
    textColor: '#ffffff',
    backgroundColor: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
    titleFont: '"Nunito", sans-serif',
    contentFont: '"Open Sans", sans-serif',
    titleColor: '#fef3c7', // amber-100
    contentColor: '#fed7aa', // orange-200
  },
  bold_impact: {
    name: 'Bold Impact',
    primaryColor: '#dc2626', // red-600
    secondaryColor: '#1f2937', // gray-800
    accentColor: '#facc15', // yellow-400
    textColor: '#ffffff',
    backgroundColor: 'linear-gradient(45deg, #dc2626 0%, #1f2937 100%)',
    titleFont: '"Oswald", sans-serif',
    contentFont: '"Roboto", sans-serif',
    titleColor: '#facc15',
    contentColor: '#f3f4f6', // gray-100
  },
  soft_gentle: {
    name: 'Soft Gentle',
    primaryColor: '#f3e8ff', // violet-50
    secondaryColor: '#e0e7ff', // indigo-100
    accentColor: '#8b5cf6', // violet-500
    textColor: '#3730a3', // indigo-700
    backgroundColor: 'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
    titleFont: '"Dancing Script", cursive',
    contentFont: '"Lato", sans-serif',
    titleColor: '#6d28d9', // violet-700
    contentColor: '#4c1d95', // violet-800
  },
  neon_cyberpunk: {
    name: 'Neon Cyberpunk',
    primaryColor: '#0c0a09', // stone-950
    secondaryColor: '#1c1917', // stone-900
    accentColor: '#22d3ee', // cyan-400
    textColor: '#06b6d4', // cyan-500
    backgroundColor: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)',
    titleFont: '"Orbitron", sans-serif',
    contentFont: '"Rajdhani", sans-serif',
    titleColor: '#22d3ee',
    contentColor: '#67e8f9', // cyan-300
  },
  traditional_japanese: {
    name: 'Traditional Japanese',
    primaryColor: '#7c2d12', // red-800
    secondaryColor: '#fef3c7', // amber-100
    accentColor: '#dc2626', // red-600
    textColor: '#1c1917', // stone-900
    backgroundColor: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
    titleFont: '"Noto Serif JP", serif',
    contentFont: '"Noto Sans JP", sans-serif',
    titleColor: '#7c2d12',
    contentColor: '#451a03', // amber-900
  },
  hand_drawn: {
    name: 'Hand Drawn',
    primaryColor: '#fef9c3', // yellow-100
    secondaryColor: '#fef3c7', // amber-100
    accentColor: '#dc2626', // red-600
    textColor: '#1f2937', // gray-800
    backgroundColor: '#fef9c3',
    titleFont: '"Kalam", cursive',
    contentFont: '"Kalam", cursive',
    titleColor: '#dc2626',
    contentColor: '#374151', // gray-700
  },
  newspaper: {
    name: 'Newspaper',
    primaryColor: '#ffffff',
    secondaryColor: '#f3f4f6', // gray-100
    accentColor: '#1f2937', // gray-800
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    titleFont: '"Playfair Display", serif',
    contentFont: '"Crimson Text", serif',
    titleColor: '#1f2937',
    contentColor: '#374151', // gray-700
  },
  magazine_glossy: {
    name: 'Magazine Glossy',
    primaryColor: '#ec4899', // pink-500
    secondaryColor: '#8b5cf6', // violet-500
    accentColor: '#06b6d4', // cyan-500
    textColor: '#ffffff',
    backgroundColor: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    titleFont: '"Montserrat", sans-serif',
    contentFont: '"Open Sans", sans-serif',
    titleColor: '#fbbf24', // amber-400
    contentColor: '#f9fafb', // gray-50
  },
};

// =================================================================
// Default Layer Properties
// =================================================================

export const DEFAULT_LAYER_PROPS = {
  text: {
    fontSize: 58,
    textAlign: 'center' as const,
    textStyleId: 'modern-bold-white',
    content: 'New Text',
    textColor: undefined,
  },
  image: {
    objectFit: 'contain' as const,
    objectPosition: 'center-center' as const,
    prompt: 'A beautiful, high-quality image',
  },
  shape: {
    shapeType: 'rectangle' as const,
    fillColor: '#6366f1',
    strokeColor: '#4f46e5',
    strokeWidth: 2,
  },
};

// =================================================================
// Export Settings
// =================================================================

export const EXPORT_FORMATS = {
  pdf: { name: 'PDF', extension: 'pdf', mimeType: 'application/pdf' },
  pptx: { name: 'PowerPoint', extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  png: { name: 'PNG Image', extension: 'png', mimeType: 'image/png' },
  jpeg: { name: 'JPEG Image', extension: 'jpeg', mimeType: 'image/jpeg' },
  'png-all': { name: 'PNG Images (All)', extension: 'zip', mimeType: 'application/zip' },
  'jpeg-all': { name: 'JPEG Images (All)', extension: 'zip', mimeType: 'application/zip' },
  svg: { name: 'SVG Vector', extension: 'svg', mimeType: 'image/svg+xml' },
  'svg-all': { name: 'SVG Vectors (All)', extension: 'zip', mimeType: 'application/zip' },
  html: { name: 'HTML', extension: 'html', mimeType: 'text/html' },
  marp: { name: 'Marp Markdown', extension: 'md', mimeType: 'text/markdown' },
  project: { name: 'Project File', extension: 'zip', mimeType: 'application/zip' },
};

// =================================================================
// Keyboard Shortcuts
// =================================================================

export const KEYBOARD_SHORTCUTS = {
  save: 'Ctrl+S',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  delete: 'Delete',
  selectAll: 'Ctrl+A',
  duplicate: 'Ctrl+D',
  zoomIn: 'Ctrl++',
  zoomOut: 'Ctrl+-',
  fitToScreen: 'Ctrl+0',
  newSlide: 'Ctrl+N',
  nextSlide: 'Ctrl+→',
  prevSlide: 'Ctrl+←',
  fullscreen: 'F11',
  aiAssist: 'Ctrl+K',
};

// =================================================================
// Animation Presets
// =================================================================

export const ANIMATION_PRESETS = {
  fadeIn: {
    name: 'Fade In',
    duration: 0.5,
    easing: 'ease-in-out',
    keyframes: {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    },
  },
  slideInLeft: {
    name: 'Slide In Left',
    duration: 0.6,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(0)' },
    },
  },
  slideInRight: {
    name: 'Slide In Right',
    duration: 0.6,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'translateX(100%)' },
      '100%': { transform: 'translateX(0)' },
    },
  },
  slideInUp: {
    name: 'Slide In Up',
    duration: 0.6,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'translateY(100%)' },
      '100%': { transform: 'translateY(0)' },
    },
  },
  slideInDown: {
    name: 'Slide In Down',
    duration: 0.6,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'translateY(-100%)' },
      '100%': { transform: 'translateY(0)' },
    },
  },
  scaleIn: {
    name: 'Scale In',
    duration: 0.5,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'scale(0.5)', opacity: 0 },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
  },
  bounceIn: {
    name: 'Bounce In',
    duration: 0.8,
    easing: 'ease-out',
    keyframes: {
      '0%': { transform: 'scale(0.3)', opacity: 0 },
      '50%': { transform: 'scale(1.05)', opacity: 1 },
      '70%': { transform: 'scale(0.9)' },
      '100%': { transform: 'scale(1)' },
    },
  },
};

// =================================================================
// Grid and Snap Settings
// =================================================================

export const GRID_SETTINGS = {
  sizes: [10, 20, 25, 50],
  colors: {
    light: '#e2e8f0',
    dark: '#475569',
  },
  opacity: 0.3,
};

export const SNAP_SETTINGS = {
  threshold: 10, // pixels
  guides: {
    color: '#ef4444',
    opacity: 0.7,
    width: 1,
  },
};

// =================================================================
// Performance Settings
// =================================================================

export const PERFORMANCE_SETTINGS = {
  maxCanvasSize: 8192,
  maxLayersPerSlide: 50,
  maxSlideCount: 100,
  imageOptimization: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.9,
  },
  renderingOptimization: {
    useWebGL: true,
    enableVirtualization: true,
    batchUpdates: true,
  },
};

// =================================================================
// API Configuration
// =================================================================

export const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  rateLimit: {
    requests: 100,
    timeWindow: 60000, // 1 minute
  },
};

// =================================================================
// Local Storage Keys
// =================================================================

export const STORAGE_KEYS = {
  presentations: 'slidemaster_presentations',
  settings: 'slidemaster_settings',
  recentFiles: 'slidemaster_recent_files',
  preferences: 'slidemaster_preferences',
  cache: 'slidemaster_cache',
};

// =================================================================
// Page Number Configuration (moved to utils/pageNumbers.ts to avoid circular deps)
// =================================================================