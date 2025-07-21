// =================================================================
// SlideMaster Types - Combining slide presentation with layer system
// =================================================================

// Version Management
export interface FileFormatVersion {
  major: number;
  minor: number;
  patch: number;
  format: string; // 'slidemaster'
}

export interface VersionCompatibility {
  canImport: boolean;
  requiresUpgrade: boolean;
  partialSupport: boolean;
  missingFeatures: string[];
  warnings: string[];
}

export interface VersionedFile {
  version: FileFormatVersion;
  createdWith: string; // Application version that created the file
  lastModifiedWith: string; // Application version that last modified the file
  compatibilityNotes?: string[];
}

export type PresentationTheme = 
  | 'auto'
  | 'professional' 
  | 'creative' 
  | 'minimalist' 
  | 'playful'
  | 'storytelling'
  | 'children_bright'
  | 'children_pastel'
  | 'academic'
  | 'medical'
  | 'tech_modern'
  | 'vintage_retro'
  | 'nature_organic'
  | 'elegant_luxury'
  | 'dark_modern'
  | 'warm_friendly'
  | 'bold_impact'
  | 'soft_gentle'
  | 'neon_cyberpunk'
  | 'traditional_japanese'
  | 'hand_drawn'
  | 'newspaper'
  | 'magazine_glossy';

export type PresentationPurpose = 
  | 'auto'                     // 自動選択
  | 'business_presentation'     // ビジネス・企業向けプレゼンテーション
  | 'educational_content'       // 教育・学習コンテンツ
  | 'storytelling'             // ストーリーテリング・物語
  | 'children_content'         // 子供向けコンテンツ
  | 'tutorial_guide'           // チュートリアル・ガイド
  | 'portfolio_showcase'       // ポートフォリオ・作品紹介
  | 'marketing_pitch'          // マーケティング・営業資料
  | 'academic_research'        // 学術・研究発表
  | 'event_announcement'       // イベント・告知
  | 'training_material'        // 研修・トレーニング資料
  | 'product_demo'            // 製品・サービスデモ
  | 'report_summary'          // レポート・報告書
  | 'creative_project'        // クリエイティブプロジェクト
  | 'game_content'            // ゲーム・インタラクティブコンテンツ
  | 'digital_signage'         // デジタルサイネージ
  | 'video_storyboard'        // 動画制作用ストーリーボード;

// =================================================================
// Layer System (from CreatetiveStudioAI)
// =================================================================

export interface TextStyle {
  id: string;
  name: string;
  style: React.CSSProperties;
}

export type LayerType = 'text' | 'image' | 'shape';

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  rotation: number; // degrees
  opacity: number; // 0-1
  zIndex: number; // layer order
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily?: string; // Font family (e.g., 'Inter, sans-serif')
  fontWeight?: string; // Font weight (e.g., 'bold', 'normal', '400', '700')
  textStyleId: string;
  textAlign: 'left' | 'center' | 'right';
  textColor?: string; // Custom text color override
  textShadow?: string; // CSS text-shadow for accessibility
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string; // base64 or URL
  prompt: string; // AI generation prompt
  seed?: number; // Random seed for reproducible image generation
  objectFit: 'contain' | 'cover' | 'fill';
  objectPosition?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'line';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

// =================================================================
// Slide System (enhanced from ai-slide-generator)
// =================================================================

export interface Slide {
  id: string;
  title: string;
  layers: Layer[];
  background: string; // CSS color or gradient
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  template?: string; // for AI generation context
  notes?: string; // speaker notes
}

// =================================================================
// Presentation System
// =================================================================

// =================================================================
// Slide Sources System
// =================================================================

export interface SlideSource {
  id: string;
  type: 'ai_prompt' | 'manual_markdown' | 'video_analysis' | 'imported';
  createdAt: Date;
  name: string;
  content: string;
  metadata?: {
    // AI Generate用
    originalPrompt?: string;
    aiSettings?: SlideGenerationRequest;
    
    // Manual Generate用
    originalMarkdown?: string;
    videoFileName?: string;
    
    // Video Analysis用
    videoAnalysisResult?: string;
    analysisPrompt?: string;
    
    // 共通
    generationMethod?: string;
    notes?: string;
  };
}

export interface GenerationHistoryItem {
  method: 'ai' | 'manual' | 'video_analysis' | 'blank';
  timestamp: Date;
  sourceId?: string;
  parameters: any;
}

export interface Presentation extends VersionedFile {
  id: string;
  title: string;
  description: string;
  theme: PresentationTheme;
  purpose?: PresentationPurpose; // Track the original purpose for auto page number resolution
  slides: Slide[];
  settings: PresentationSettings;
  createdAt: Date;
  updatedAt: Date;
  sources?: SlideSource[];
  generationHistory?: GenerationHistoryItem[];
}

export interface PresentationSettings {
  defaultAspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  defaultBackground: string;
  autoSave: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  pageNumbers: PageNumberSettings;
  imageGeneration?: ImageGenerationSettings;
}

// =================================================================
// AI Generation Types
// =================================================================

export type PageNumberStyle = 'auto' | 'none' | 'simple' | 'prominent' | 'subtle';
export type PageNumberFormat = 'number_only' | 'current_of_total' | 'current_total_separate';

// Image Generation Consistency Settings
export type ImageConsistencyLevel = 'auto' | 'unified' | 'diverse' | 'mixed';
export type ImageStyle = 
  | 'auto'
  | 'anime' 
  | 'realistic' 
  | 'storybook' 
  | 'watercolor'
  | 'cg_3d'
  | 'traditional_japanese'
  | 'hand_drawn'
  | 'cartoon'
  | 'minimalist'
  | 'photographic';

export type CharacterConsistency = 'auto' | 'maintain' | 'avoid_repeat' | 'free';

export interface ImageGenerationSettings {
  consistencyLevel: ImageConsistencyLevel;
  style: ImageStyle;
  characterConsistency: CharacterConsistency;
  useReferenceImage: boolean;
  styleDescription?: string; // Custom style description
}

export interface PageNumberSettings {
  style: PageNumberStyle;
  format: PageNumberFormat;
  position: 'bottom_center' | 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  showOnTitleSlide: boolean;
  customPrefix?: string; // e.g., "Page ", "ページ ", "P."
}

export interface SlideGenerationRequest {
  topic: string;
  slideCount: number;
  autoSlideCount: boolean;
  slideCountMode?: 'exact' | 'max' | 'min' | 'around'; // 指定ページ、指定ページ以内、指定ページ以上、指定ページ前後
  theme: PresentationTheme;
  purpose: PresentationPurpose;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  includeImages: boolean;
  imageFrequency?: 'every_slide' | 'every_2_slides' | 'every_3_slides' | 'every_5_slides' | 'sparse';
  imageGenerationSettings?: ImageGenerationSettings;
  pageNumbers?: PageNumberSettings;
  context?: string; // additional context for AI
  speakerNotes?: SpeakerNotesSettings;
}

export interface SpeakerNotesSettings {
  enabled: boolean;
  detailLevel: 'minimal' | 'standard' | 'detailed';
  includeTransitionCues: boolean;
  includeTimingNotes: boolean;
  language: 'japanese' | 'english' | 'auto';
}

export interface ElementGenerationRequest {
  type: LayerType;
  prompt: string;
  slideContext: string; // current slide context
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface AIAssistRequest {
  slideId: string;
  instruction: string;
  targetLayer?: string; // specific layer to modify
}

// =================================================================
// Canvas and View System
// =================================================================

export interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  selectedLayerId: string | null;
}

export interface CanvasState {
  viewState: ViewState;
  isEditing: boolean;
  dragState: {
    isDragging: boolean;
    startX: number;
    startY: number;
    layerId: string | null;
  };
}

// =================================================================
// Export System
// =================================================================

export interface ExportOptions {
  format: 'pdf' | 'pptx' | 'png' | 'jpeg' | 'png-all' | 'jpeg-all' | 'svg' | 'svg-all' | 'html' | 'marp' | 'project';
  quality?: number; // 0-1 for image formats
  resolution?: 'low' | 'medium' | 'high';
  includeNotes?: boolean; // for presentation formats
  slideRange?: { start: number; end: number };
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  format?: string;
  error?: string;
  metadata?: {
    format: string;
    size: number;
    slideCount: number;
    duration: number;
  };
}

// =================================================================
// Application Theme
// =================================================================

export type AppTheme = 'light' | 'dark' | 'auto';

// AI Model Types
export type TextGenerationModel = 
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-1.5-pro-latest'
  | 'gemini-1.5-flash-latest'
  | 'gemma-3-27b-it'
  | 'gemma-3-12b-it'
  | 'gemma-3-4b-it'
  | 'gemma-3n-e4b'
  | 'gemma-3n-e2b';

export type ImageGenerationModel = 
  | 'imagen-4'
  | 'imagen-3';

export type VideoAnalysisModel = 
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-1.5-pro-latest'
  | 'gemini-1.5-flash-latest';

export interface AIModelSettings {
  textGeneration: TextGenerationModel;
  imageGeneration: ImageGenerationModel;
  videoAnalysis: VideoAnalysisModel;
}

export interface AppSettings {
  theme: AppTheme;
  language: 'japanese' | 'english' | 'auto';
  autoSave: boolean;
  showTipsOnStartup: boolean;
  aiModels: AIModelSettings;
}

// =================================================================
// Application State
// =================================================================

export interface AppState {
  currentPresentation: Presentation | null;
  currentSlideIndex: number;
  canvasState: CanvasState;
  isLoading: boolean;
  error: string | null;
  recentPresentations: Presentation[];
  appSettings: AppSettings;
}

// =================================================================
// Component Props Types
// =================================================================

export interface SlideCanvasProps {
  slide: Slide;
  viewState: ViewState;
  isActive: boolean;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerSelect: (layerId: string | null) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerAdd: (layer: Layer) => void;
  onViewStateUpdate: (updates: Partial<ViewState>) => void;
}

export interface LayerEditorProps {
  layer: Layer | null;
  slide: Slide | null;
  onUpdate: (updates: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectLayer?: (layerId: string | null) => void;
  onUpdateSlide?: (updates: Partial<Slide>) => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasClipboard?: boolean;
}

export interface SlideNavigatorProps {
  slides: Slide[];
  currentIndex: number;
  onSlideSelect: (index: number) => void;
  onSlideAdd: (index: number) => void;
  onSlideDelete: (index: number) => void;
  onSlideReorder: (fromIndex: number, toIndex: number) => void;
}

export interface AIAssistantProps {
  onSlideGenerate: (request: SlideGenerationRequest) => void;
  onElementGenerate: (request: ElementGenerationRequest) => void;
  onContentAssist: (request: AIAssistRequest) => void;
  isProcessing: boolean;
  error: string | null;
}

// =================================================================
// Utility Types
// =================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

// =================================================================
// Template System
// =================================================================

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  theme: PresentationTheme;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4';
  layers: Omit<Layer, 'id'>[];
  background: string;
  category: 'title' | 'content' | 'section' | 'ending';
  preview: string; // base64 image
}

export interface TemplateLibrary {
  categories: {
    title: SlideTemplate[];
    content: SlideTemplate[];
    section: SlideTemplate[];
    ending: SlideTemplate[];
  };
}