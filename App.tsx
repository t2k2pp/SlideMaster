import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Presentation, 
  Slide, 
  Layer, 
  ViewState, 
  CanvasState, 
  AppState,
  SlideGenerationRequest,
  ElementGenerationRequest,
  AIAssistRequest,
  ExportOptions,
  PresentationTheme,
  AppSettings
} from './types';
import { EnhancedSlideRequest } from './services/ai/aiServiceInterface';
import { ThemeProvider } from './contexts/ThemeContext';
import { 
  DEFAULT_PRESENTATION_SETTINGS, 
  CANVAS_SIZES, 
  TEXT_STYLES, 
  DEFAULT_LAYER_PROPS,
  THEME_CONFIGS
} from './constants';

// Import components
import Header from './components/Header';
import SlideNavigator from './components/SlideNavigator';
import SlideCanvas from './components/SlideCanvas';
import LayerEditor from './components/LayerEditor';
import AIAssistant from './components/AIAssistant';
import ExportManager from './components/ExportManager';
import WelcomeScreen from './components/WelcomeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import SlideShow from './components/SlideShow';
import PageNumberManager from './components/PageNumberManager';
import VersionInfo from './components/VersionInfo';

// Import services - Azure OpenAI専用
import * as storageService from './services/unifiedStorageService';
import * as exportService from './services/exportService';
import { generateSlideContent, generateSlideImage, hasValidAPIKey } from './services/ai/unifiedAIService';
import { ImageGenerationQueue, ImageGenerationTask } from './services/ai/imageGenerationQueue';
import { slideGenerationFactory } from './services/ai/SlideGenerationFactory';
import { processPresentationTopic } from './services/ai/PresentationTopicProcessor';

// Import utilities
import { updateAllPageNumbers } from './utils/pageNumbers';
import { createVersionMetadata } from './utils/versionManager';

// =================================================================
// Main App Component
// =================================================================

const App: React.FC = () => {
  // =================================================================
  // State Management
  // =================================================================
  
  const [appState, setAppState] = useState<AppState>({
    currentPresentation: null,
    currentSlideIndex: 0,
    canvasState: {
      viewState: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        showGrid: false,
        showGuides: true,
        snapToGrid: true,
        selectedLayerId: null,
      },
      isEditing: false,
      dragState: {
        isDragging: false,
        startX: 0,
        startY: 0,
        layerId: null,
      },
    },
    isLoading: false,
    error: null,
    recentPresentations: [],
    appSettings: {
      theme: 'auto',
      language: 'auto',
      autoSave: true,
      showTipsOnStartup: true,
    },
  });

  // Screen management state
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'editor' | 'settings' | 'slideshow'>('welcome');
  
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showExportManager, setShowExportManager] = useState(false);
  
  // Clipboard and Undo/Redo state
  const [clipboardLayer, setClipboardLayer] = useState<Layer | null>(null);
  const [undoState, setUndoState] = useState<Presentation | null>(null);
  const [redoState, setRedoState] = useState<Presentation | null>(null);

  const [showSlideShow, setShowSlideShow] = useState(false);
  const [showPageNumberManager, setShowPageNumberManager] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [slideShowStartIndex, setSlideShowStartIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load recent presentations on startup
  useEffect(() => {
    const initializeAppStorage = async () => {
      try {
        // Initialize IndexedDB storage system
        console.log('🚀 Initializing storage systems...');
        
        // Initialize the unified storage service (this will set up IndexedDB and migration)
        const presentations = await storageService.listPresentations();
        
        setAppState(prev => ({
          ...prev,
          recentPresentations: presentations.slice(0, 5),
        }));
        
        console.log('✅ Storage systems initialized successfully');
        toast.success('Storage systems ready', { id: 'storage-init' });
        
      } catch (error) {
        console.error('Failed to initialize storage systems:', error);
        toast.error('Failed to initialize storage', { id: 'storage-init' });
      }
    };

    initializeAppStorage();
  }, []);

  // =================================================================
  // Derived State
  // =================================================================
  
  const currentSlide = appState.currentPresentation?.slides[appState.currentSlideIndex];
  const selectedLayer = currentSlide?.layers.find(layer => 
    layer.id === appState.canvasState.viewState.selectedLayerId
  );

  // Check if Azure OpenAI is available
  const isAIAvailable = useMemo(() => {
    return hasValidAPIKey();
  }, []);

  // =================================================================
  // Undo/Redo Helper Functions
  // =================================================================
  
  const saveStateForUndo = useCallback(() => {
    if (appState.currentPresentation) {
      setUndoState(JSON.parse(JSON.stringify(appState.currentPresentation)));
      setRedoState(null);
    }
  }, [appState.currentPresentation]);
  
  const canUndo = undoState !== null;
  const canRedo = redoState !== null;

  // =================================================================
  // Clipboard Operations
  // =================================================================
  
  const copyLayer = useCallback(() => {
    if (selectedLayer) {
      setClipboardLayer(JSON.parse(JSON.stringify(selectedLayer)));
      toast.success('Layer copied to clipboard');
    }
  }, [selectedLayer]);
  
  const pasteLayer = useCallback(() => {
    if (clipboardLayer && currentSlide) {
      saveStateForUndo();
      const newLayer = {
        ...clipboardLayer,
        id: `layer-${Date.now()}`,
        x: clipboardLayer.x + 10,
        y: clipboardLayer.y + 10,
        zIndex: currentSlide.layers.length,
      };
      
      const updatedLayers = [...currentSlide.layers, newLayer];
      updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
      
      setAppState(prev => ({
        ...prev,
        canvasState: {
          ...prev.canvasState,
          viewState: {
            ...prev.canvasState.viewState,
            selectedLayerId: newLayer.id,
          },
        },
      }));
      
      toast.success('Layer pasted');
    }
  }, [clipboardLayer, currentSlide, appState.currentSlideIndex]);

  const cutLayer = useCallback(() => {
    if (selectedLayer) {
      saveStateForUndo();
      setClipboardLayer(JSON.parse(JSON.stringify(selectedLayer)));
      deleteLayer(selectedLayer.id);
      toast.success('Layer cut to clipboard');
    }
  }, [selectedLayer, saveStateForUndo]);

  // =================================================================
  // Undo/Redo Operations
  // =================================================================
  
  const undo = useCallback(() => {
    if (undoState && appState.currentPresentation) {
      setRedoState(JSON.parse(JSON.stringify(appState.currentPresentation)));
      setAppState(prev => ({
        ...prev,
        currentPresentation: undoState,
      }));
      setUndoState(null);
      toast.success('Undid last action');
    }
  }, [undoState, appState.currentPresentation]);
  
  const redo = useCallback(() => {
    if (redoState) {
      setUndoState(JSON.parse(JSON.stringify(appState.currentPresentation)));
      setAppState(prev => ({
        ...prev,
        currentPresentation: redoState,
      }));
      setRedoState(null);
      toast.success('Redid last action');
    }
  }, [redoState, appState.currentPresentation]);

  // =================================================================
  // Presentation Management
  // =================================================================

  const createNewPresentation = useCallback((
    title: string, 
    theme: PresentationTheme = 'professional'
  ) => {
    const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.professional;
    const versionMetadata = createVersionMetadata();
    
    const newPresentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title,
      description: '',
      theme,
      slides: [{
        id: `slide-${Date.now()}`,
        title: 'Welcome to SlideMaster',
        layers: [],
        background: themeConfig.backgroundColor,
        aspectRatio: '16:9',
        template: 'title',
        notes: '',
      }],
      settings: {
        ...DEFAULT_PRESENTATION_SETTINGS,
        defaultBackground: themeConfig.backgroundColor,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: versionMetadata.version,
      createdWith: versionMetadata.createdWith,
      lastModifiedWith: versionMetadata.lastModifiedWith,
      compatibilityNotes: versionMetadata.compatibilityNotes,
    };

    setAppState(prev => ({
      ...prev,
      currentPresentation: newPresentation,
      currentSlideIndex: 0,
    }));

    setCurrentScreen('editor');
    toast.success('New presentation created!');
  }, []);

  const loadPresentation = useCallback(async (presentationId: string) => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      const presentation = await storageService.loadPresentation(presentationId);
      
      setAppState(prev => ({
        ...prev,
        currentPresentation: presentation,
        currentSlideIndex: 0,
        isLoading: false,
      }));
      
      setCurrentScreen('editor');
      toast.success('Presentation loaded successfully!');
    } catch (error) {
      console.error('Error loading presentation:', error);
      setAppState(prev => ({ 
        ...prev, 
        error: 'Failed to load presentation',
        isLoading: false,
      }));
      toast.error('Failed to load presentation');
    }
  }, []);

  const savePresentation = useCallback(async () => {
    if (!appState.currentPresentation) {
      toast.error('No presentation to save');
      return;
    }

    try {
      const updatedPresentation = {
        ...appState.currentPresentation,
        updatedAt: new Date(),
      };

      await storageService.savePresentation(updatedPresentation);
      
      const updatedRecentPresentations = await storageService.listPresentations();
      
      setAppState(prev => ({
        ...prev,
        currentPresentation: updatedPresentation,
        recentPresentations: updatedRecentPresentations.slice(0, 5),
      }));
      
      toast.success('Presentation saved!');
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast.error('Failed to save presentation');
    }
  }, [appState.currentPresentation]);

  const importProject = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      
      const result = await exportService.importProject(file);
      
      if (result.success && result.presentation) {
        await storageService.savePresentation(result.presentation);
        
        setAppState(prev => ({
          ...prev,
          currentPresentation: result.presentation,
          currentSlideIndex: 0,
        }));
        
        const updatedRecentPresentations = await storageService.listPresentations();
        setAppState(prev => ({
          ...prev,
          recentPresentations: updatedRecentPresentations.slice(0, 5),
        }));
        
        setCurrentScreen('editor');
        toast.success('プロジェクトをインポートしました！');
      } else {
        toast.error(result.error || 'プロジェクトのインポートに失敗しました');
      }
    } catch (error) {
      console.error('Error importing project:', error);
      toast.error('プロジェクトのインポートに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // =================================================================
  // Slide Management
  // =================================================================

  const addSlide = useCallback((index?: number) => {
    if (!appState.currentPresentation) return;

    const themeConfig = THEME_CONFIGS[appState.currentPresentation.theme] || THEME_CONFIGS.professional;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: 'New Slide',
      layers: [],
      background: themeConfig.backgroundColor,
      aspectRatio: appState.currentPresentation.settings.defaultAspectRatio,
      template: 'content',
      notes: '',
    };

    const insertIndex = index !== undefined ? index : appState.currentSlideIndex + 1;
    const newSlides = [...appState.currentPresentation.slides];
    newSlides.splice(insertIndex, 0, newSlide);

    const slidesWithUpdatedPageNumbers = updateAllPageNumbers(
      newSlides, 
      appState.currentPresentation.settings.pageNumbers,
      appState.currentPresentation.purpose || 'business_presentation'
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: slidesWithUpdatedPageNumbers,
      } : null,
      currentSlideIndex: insertIndex,
    }));
  }, [appState.currentPresentation, appState.currentSlideIndex]);

  const deleteSlide = useCallback((index: number) => {
    if (!appState.currentPresentation || appState.currentPresentation.slides.length <= 1) return;

    const newSlides = appState.currentPresentation.slides.filter((_, i) => i !== index);
    const newCurrentIndex = index === appState.currentSlideIndex 
      ? Math.max(0, appState.currentSlideIndex - 1)
      : appState.currentSlideIndex > index 
        ? appState.currentSlideIndex - 1 
        : appState.currentSlideIndex;

    const slidesWithUpdatedPageNumbers = updateAllPageNumbers(
      newSlides, 
      appState.currentPresentation.settings.pageNumbers,
      appState.currentPresentation.purpose || 'business_presentation'
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: slidesWithUpdatedPageNumbers,
      } : null,
      currentSlideIndex: newCurrentIndex,
    }));
  }, [appState.currentPresentation, appState.currentSlideIndex]);

  const duplicateSlide = useCallback((index: number, duplicatedSlide: Slide) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    newSlides.splice(index, 0, duplicatedSlide);

    const slidesWithUpdatedPageNumbers = updateAllPageNumbers(
      newSlides, 
      appState.currentPresentation.settings.pageNumbers,
      appState.currentPresentation.purpose || 'business_presentation'
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: slidesWithUpdatedPageNumbers,
      } : null,
      currentSlideIndex: index,
    }));
  }, [appState.currentPresentation]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);

    const slidesWithUpdatedPageNumbers = updateAllPageNumbers(
      newSlides, 
      appState.currentPresentation.settings.pageNumbers,
      appState.currentPresentation.purpose || 'business_presentation'
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: slidesWithUpdatedPageNumbers,
      } : null,
      currentSlideIndex: toIndex,
    }));
  }, [appState.currentPresentation]);

  const updateSlide = useCallback((slideIndex: number, updates: Partial<Slide>) => {
    if (!appState.currentPresentation) return;

    const newSlides = appState.currentPresentation.slides.map((slide, index) =>
      index === slideIndex ? { ...slide, ...updates } : slide
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: newSlides,
      } : null,
    }));
  }, [appState.currentPresentation]);

  // =================================================================
  // Layer Management
  // =================================================================

  const addLayer = useCallback((layer: Layer) => {
    if (!currentSlide) return;

    saveStateForUndo();

    const newLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      zIndex: currentSlide.layers.length,
    };

    const updatedLayers = [...currentSlide.layers, newLayer];
    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });

    setAppState(prev => ({
      ...prev,
      canvasState: {
        ...prev.canvasState,
        viewState: {
          ...prev.canvasState.viewState,
          selectedLayerId: newLayer.id,
        },
      },
    }));
  }, [currentSlide, appState.currentSlideIndex, updateSlide, saveStateForUndo]);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    if (!currentSlide) return;

    const isMajorUpdate = updates.hasOwnProperty('content') || 
                         updates.hasOwnProperty('src') || 
                         updates.hasOwnProperty('fontSize') ||
                         updates.hasOwnProperty('textColor');
    
    if (isMajorUpdate) {
      saveStateForUndo();
    }

    const updatedLayers = currentSlide.layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );

    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
  }, [currentSlide, appState.currentSlideIndex, updateSlide, saveStateForUndo]);

  const deleteLayer = useCallback((layerId: string) => {
    if (!currentSlide) return;

    saveStateForUndo();

    const updatedLayers = currentSlide.layers.filter(layer => layer.id !== layerId);
    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });

    if (appState.canvasState.viewState.selectedLayerId === layerId) {
      setAppState(prev => ({
        ...prev,
        canvasState: {
          ...prev.canvasState,
          viewState: {
            ...prev.canvasState.viewState,
            selectedLayerId: null,
          },
        },
      }));
    }
  }, [currentSlide, appState.currentSlideIndex, updateSlide, appState.canvasState.viewState.selectedLayerId, saveStateForUndo]);

  const selectLayer = useCallback((layerId: string | null) => {
    setAppState(prev => ({
      ...prev,
      canvasState: {
        ...prev.canvasState,
        viewState: {
          ...prev.canvasState.viewState,
          selectedLayerId: layerId,
        },
      },
    }));
  }, []);

  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    setAppState(prev => ({
      ...prev,
      canvasState: {
        ...prev.canvasState,
        viewState: {
          ...prev.canvasState.viewState,
          ...updates,
        },
      },
    }));
  }, []);

  // =================================================================
  // AI Integration - Azure OpenAI専用
  // =================================================================

  const generateSlides = useCallback(async (request: SlideGenerationRequest) => {
    if (!isAIAvailable) {
      toast.error('Azure OpenAI APIキーが設定されていません');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // 🎯 トピック前処理：少量文章展開・大量文章構造化
      console.log('🔍 Processing presentation topic...', request.topic);
      const topicAnalysis = await processPresentationTopic(request.topic);
      
      console.log('✅ Topic processing completed:', {
        contentType: topicAnalysis.contentType,
        processingApplied: topicAnalysis.processingApplied,
        originalLength: topicAnalysis.originalTopic.length,
        processedLength: topicAnalysis.processedTopic.length
      });
      
      // SlideGenerationRequestをEnhancedSlideRequestに変換
      const enhancedRequest: EnhancedSlideRequest = {
        topic: topicAnalysis.processedTopic, // 前処理されたトピックを使用
        slideCount: request.slideCount,
        slideCountMode: request.slideCountMode || 'fixed',
        selectedDesigner: request.designer || request.selectedDesigner || undefined, // Context Intelligence Engineに任せる
        purpose: request.purpose || 'auto', // 'auto'でContext Intelligence Engine発動
        theme: request.theme || 'auto', // 'auto'でContext Intelligence Engine発動
        includeImages: request.includeImages || false
      };
      
      // スライド生成ファクトリを使用
      const generationResult = await slideGenerationFactory.generateSlides(enhancedRequest);
      
      // JSON解析
      const presentationData = JSON.parse(generationResult.content) as Partial<Presentation>;
      if (!presentationData.slides) {
        throw new Error('Invalid presentation structure - no slides found');
      }

      // Context Intelligence Engine メタデータ確認
      presentationData.slides.forEach((slide, index) => {
        if (slide.metadata?.imagePrompt) {
          console.log(`✅ Slide ${index + 1} has enhanced image prompt (${slide.metadata.imagePrompt.length} chars)`);
        }
      });

      // レイヤープロパティの検証・補完
      const validatedSlides = presentationData.slides.map(slide => ({
        ...slide,
        layers: slide.layers?.map(layer => ({
          ...layer,
          // 必須プロパティの補完
          rotation: layer.rotation || 0,
          opacity: layer.opacity !== undefined ? layer.opacity : 1,
          zIndex: layer.zIndex || 1,
          // テキストレイヤーの場合
          ...(layer.type === 'text' && {
            textAlign: (layer as any).textAlign || 'left',
            fontSize: (layer as any).fontSize || 24,
            textColor: (layer as any).textColor || '#000000',
          }),
          // 画像レイヤーの場合
          ...(layer.type === 'image' && {
            src: (layer as any).src || '',
            prompt: (layer as any).prompt || 'Professional image',
            objectFit: (layer as any).objectFit || 'cover',
            objectPosition: (layer as any).objectPosition || 'center-center',
            seed: (layer as any).seed || Math.floor(Math.random() * 2147483647),
          }),
        })) || []
      }));

      const versionMetadata = createVersionMetadata();
      const presentation: Presentation = {
        id: `presentation-${Date.now()}`,
        title: presentationData.title || `${request.topic} プレゼンテーション`,
        description: presentationData.description || `${enhancedRequest.selectedDesigner}スタイルで生成されたプレゼンテーション`,
        theme: 'professional',
        slides: validatedSlides,
        settings: presentationData.settings || DEFAULT_PRESENTATION_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date(),
        // ファクトリからのメタデータを追加
        purpose: request.purpose,
        designerUsed: generationResult.metadata?.designerUsed,
        generationStrategy: generationResult.metadata?.strategy,
        ...versionMetadata,
      };
      
      setAppState(prev => ({
        ...prev,
        currentPresentation: presentation,
        currentSlideIndex: 0,
      }));
      
      setCurrentScreen('editor');
      toast.success(`Slides generated successfully using ${generationResult.metadata?.designerUsed || 'AI'}!`);

      // 画像を自動生成（バックグラウンドで実行）
      if (request.includeImages) {
        generateImagesForPresentation(presentation);
      }
    } catch (error) {
      console.error('Error generating slides:', error);
      toast.error('Failed to generate slides: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  }, [isAIAvailable]);

  const generateElement = useCallback(async (request: ElementGenerationRequest) => {
    if (!isAIAvailable) {
      toast.error('Azure OpenAI APIキーが設定されていません');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Generate image with Azure OpenAI
      if (request.type === 'image') {
        const imageUrl = await generateSlideImage(request.prompt);
        const newLayer = {
          id: `image-${Date.now()}`,
          type: 'image' as const,
          x: 25,
          y: 25,
          width: 50,
          height: 50,
          rotation: 0,
          opacity: 1,
          zIndex: currentSlide?.layers.length || 0,
          src: imageUrl,
          prompt: request.prompt,
          seed: Math.floor(Math.random() * 2147483647),
          objectFit: 'contain' as const,
          objectPosition: 'center-center' as const,
        };
        addLayer(newLayer);
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error('Error generating element:', error);
      toast.error('Failed to generate element');
    } finally {
      setIsProcessing(false);
    }
  }, [isAIAvailable, addLayer, currentSlide]);

  const assistWithContent = useCallback(async (request: AIAssistRequest) => {
    if (!isAIAvailable) {
      toast.error('Azure OpenAI APIキーが設定されていません');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const response = await generateSlideContent(request.prompt);
      
      if (request.targetLayer && selectedLayer) {
        updateLayer(selectedLayer.id, { content: response });
      }
      
      toast.success('Content updated successfully!');
    } catch (error) {
      console.error('Error with AI assist:', error);
      toast.error('Failed to assist with content');
    } finally {
      setIsProcessing(false);
    }
  }, [isAIAvailable, updateLayer, selectedLayer]);

  const retryFailedImages = useCallback(async (failedImageIds: string[]) => {
    if (!isAIAvailable || !appState.currentPresentation) return;
    
    try {
      setIsProcessing(true);
      
      const imagesToRetry: Array<{
        slideIndex: number;
        layerId: string;
        prompt: string;
      }> = [];
      
      appState.currentPresentation.slides.forEach((slide, slideIndex) => {
        slide.layers.forEach(layer => {
          if (layer.type === 'image' && failedImageIds.includes(layer.id)) {
            const imageLayer = layer as any;
            imagesToRetry.push({
              slideIndex,
              layerId: layer.id,
              prompt: imageLayer.prompt || 'Generate image'
            });
          }
        });
      });
      
      for (const imageInfo of imagesToRetry) {
        try {
          const newImageSrc = await generateSlideImage(imageInfo.prompt);
          updateLayer(imageInfo.layerId, { src: newImageSrc });
        } catch (error) {
          console.error(`Failed to regenerate image for layer ${imageInfo.layerId}:`, error);
        }
      }
      
      toast.success(`${imagesToRetry.length}枚の画像の再生成が完了しました！`);
    } catch (error) {
      console.error('Error retrying failed images:', error);
      toast.error('Failed to retry failed images');
    } finally {
      setIsProcessing(false);
    }
  }, [isAIAvailable, appState.currentPresentation, updateLayer]);

  // プレゼンテーション内の画像を自動生成（並列処理対応）
  const generateImagesForPresentation = useCallback(async (presentation: Presentation) => {
    if (!isAIAvailable) return;

    try {
      // 画像生成が必要なレイヤーを収集
      const imageTasks: ImageGenerationTask[] = [];
      const layerMap = new Map<string, { slideIndex: number; layerId: string }>();

      presentation.slides.forEach((slide, slideIndex) => {
        slide.layers.forEach(layer => {
          if (layer.type === 'image' && !layer.src && (layer as any).prompt) {
            const taskId = `${slideIndex}-${layer.id}`;
            const imageLayer = layer as any;
            
            // 🎯 Context Intelligence Engine Enhanced Prompt Usage
            let promptToUse = imageLayer.prompt;
            
            // スライドメタデータからContext Intelligence Engineの拡張プロンプトを取得
            if (slide.metadata && slide.metadata.imagePrompt) {
              console.log(`🎭 Using enhanced image prompt for slide ${slideIndex + 1} (${slide.metadata.imagePrompt.length} chars)`);
              promptToUse = slide.metadata.imagePrompt;
            }
            
            imageTasks.push({
              id: taskId,
              prompt: promptToUse,
              options: {
                size: appState.settings?.imageGenerationSettings?.defaultSize || 'landscape',
                quality: appState.settings?.imageGenerationSettings?.defaultQuality || 'medium',
                style: 'natural'
              }
            });
            
            layerMap.set(taskId, { slideIndex, layerId: layer.id });
          }
        });
      });

      if (imageTasks.length === 0) {
        toast.dismiss('image-gen');
        return;
      }

      // 設定から並列数を取得
      const concurrentLimit = appState.settings?.imageGenerationSettings?.concurrentLimit || 3;
      
      // 並列画像生成キューを作成
      const queue = new ImageGenerationQueue(
        concurrentLimit,
        generateSlideImage,
        (completed, total) => {
          toast.loading(`画像生成中... ${completed}/${total}枚完了`, { id: 'image-gen' });
        },
        (results) => {
          const successCount = results.filter(r => r.imageUrl).length;
          const errorCount = results.length - successCount;
          
          if (successCount > 0) {
            toast.success(`${successCount}枚の画像を生成しました！${errorCount > 0 ? ` (${errorCount}枚失敗)` : ''}`, { id: 'image-gen' });
          } else {
            toast.error('画像生成に失敗しました', { id: 'image-gen' });
          }
        }
      );

      // 並列処理開始
      const results = await queue.processImages(imageTasks);

      // 結果をプレゼンテーションに反映
      setAppState(prev => {
        const updatedSlides = [...prev.currentPresentation.slides];
        
        results.forEach((result, index) => {
          if (result.imageUrl) {
            const layerInfo = layerMap.get(result.id);
            const originalTask = imageTasks.find(t => t.id === result.id);
            
            if (layerInfo && originalTask) {
              const targetSlide = { ...updatedSlides[layerInfo.slideIndex] };
              targetSlide.layers = targetSlide.layers.map(l => 
                l.id === layerInfo.layerId ? { 
                  ...l, 
                  src: result.imageUrl,
                  prompt: originalTask.prompt // 実際に使用されたpromptを保存
                } : l
              );
              updatedSlides[layerInfo.slideIndex] = targetSlide;
              
              console.log(`✅ Image generated for slide ${layerInfo.slideIndex + 1}`);
            }
          }
        });
        
        return {
          ...prev,
          currentPresentation: {
            ...prev.currentPresentation,
            slides: updatedSlides
          }
        };
      });

    } catch (error) {
      console.error('Error generating images for presentation:', error);
      toast.error('画像生成中にエラーが発生しました', { id: 'image-gen' });
    }
  }, [isAIAvailable, appState.settings?.imageGenerationSettings]);

  // =================================================================
  // Export Management
  // =================================================================

  const exportPresentation = useCallback(async (options: ExportOptions) => {
    if (!appState.currentPresentation) return;

    try {
      setIsProcessing(true);
      
      const originalSlideIndex = appState.currentSlideIndex;
      const originalSelectedLayerId = appState.canvasState.viewState.selectedLayerId;
      
      setAppState(prev => ({
        ...prev,
        canvasState: {
          ...prev.canvasState,
          viewState: {
            ...prev.canvasState.viewState,
            selectedLayerId: null,
          },
        },
      }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const handleSlideChange = (slideIndex: number) => {
        setAppState(prev => ({ 
          ...prev, 
          currentSlideIndex: slideIndex,
          canvasState: {
            ...prev.canvasState,
            viewState: {
              ...prev.canvasState.viewState,
              selectedLayerId: null,
            },
          },
        }));
      };
      
      const result = await exportService.exportPresentation(
        appState.currentPresentation, 
        options,
        handleSlideChange,
        undefined,
        originalSlideIndex
      );
      
      setAppState(prev => ({ 
        ...prev, 
        currentSlideIndex: originalSlideIndex,
        canvasState: {
          ...prev.canvasState,
          viewState: {
            ...prev.canvasState.viewState,
            selectedLayerId: originalSelectedLayerId,
          },
        },
      }));
      
      if (result.success) {
        toast.success('Presentation exported successfully!');
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting presentation:', error);
      toast.error('Failed to export presentation');
    } finally {
      setIsProcessing(false);
    }
  }, [appState.currentPresentation, appState.currentSlideIndex]);

  // =================================================================
  // SlideShow Management
  // =================================================================

  const startSlideShow = useCallback((startIndex: number = 0) => {
    if (!appState.currentPresentation) {
      toast.error('No presentation to show');
      return;
    }
    
    setSlideShowStartIndex(startIndex);
    setShowSlideShow(true);
  }, [appState.currentPresentation]);

  const closeSlideShow = useCallback(() => {
    setShowSlideShow(false);
  }, []);

  // =================================================================
  // Manual Slide Generator
  // =================================================================

  const handleManualSlidesGenerated = useCallback((slides: Slide[]) => {
    if (slides.length === 0) {
      toast.error('No slides were generated');
      return;
    }

    const versionMetadata = createVersionMetadata();
    const newPresentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: 'Manual Generated Presentation',
      description: 'Generated from manual input',
      theme: 'professional',
      slides: slides,
      settings: {
        ...DEFAULT_PRESENTATION_SETTINGS,
        defaultBackground: '#ffffff',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: versionMetadata.version,
      createdWith: versionMetadata.createdWith,
      lastModifiedWith: versionMetadata.lastModifiedWith,
      compatibilityNotes: versionMetadata.compatibilityNotes,
    };

    setAppState(prev => ({
      ...prev,
      currentPresentation: newPresentation,
      currentSlideIndex: 0,
    }));

    setCurrentScreen('editor');
    toast.success(`Generated ${slides.length} slides from manual generator`);
  }, []);

  const handleAutoSlidesGenerated = useCallback((presentation: Presentation) => {
    setAppState(prev => ({
      ...prev,
      currentPresentation: presentation,
      currentSlideIndex: 0,
    }));

    setCurrentScreen('editor');
    toast.success(`Generated ${presentation.slides.length} slides from video analysis`);
  }, []);

  // =================================================================
  // Page Number Management
  // =================================================================

  const updatePageNumberSettings = useCallback((settings: any) => {
    if (!appState.currentPresentation) return;

    const updatedSlides = updateAllPageNumbers(
      appState.currentPresentation.slides,
      settings,
      appState.currentPresentation.purpose || 'business_presentation'
    );

    setAppState(prev => ({
      ...prev,
      currentPresentation: prev.currentPresentation ? {
        ...prev.currentPresentation,
        slides: updatedSlides,
        settings: {
          ...prev.currentPresentation.settings,
          pageNumbers: settings,
        },
      } : null,
    }));
  }, [appState.currentPresentation]);

  // =================================================================
  // Auto-save
  // =================================================================

  useEffect(() => {
    if (appState.currentPresentation?.settings.autoSave) {
      const interval = setInterval(() => {
        if (appState.currentPresentation) {
          storageService.savePresentation({
            ...appState.currentPresentation,
            updatedAt: new Date(),
          }).then(() => {
            console.log('Auto-saved presentation');
          }).catch((error) => {
            console.error('Auto-save failed:', error);
          });
        }
      }, 120000);

      return () => clearInterval(interval);
    }
  }, [appState.currentPresentation]);

  // =================================================================
  // Render
  // =================================================================

  return (
    <ThemeProvider>
      {currentScreen === 'welcome' && (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
          <WelcomeScreen 
            onCreateNew={createNewPresentation}
            onLoadPresentation={loadPresentation}
            onGenerateWithAI={generateSlides}
            onManualGenerate={handleManualSlidesGenerated}
            onAutoGenerate={handleAutoSlidesGenerated}
            onImportProject={importProject}
            onOpenSettings={() => setCurrentScreen('settings')}
            recentPresentations={appState.recentPresentations}
            isProcessing={isProcessing}
            hasApiKey={isAIAvailable}
            onApiKeySetup={() => setCurrentScreen('settings')}
          />
          
          <Toaster 
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#334155',
                color: '#fff',
              },
            }}
          />
        </div>
      )}

      {currentScreen === 'settings' && (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
          <SettingsScreen onBack={() => setCurrentScreen('welcome')} />
          <Toaster position="top-right" />
        </div>
      )}

      {currentScreen === 'editor' && (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col overflow-hidden">
          <Header 
            presentation={appState.currentPresentation}
            onSave={savePresentation}
            onExport={() => setShowExportManager(true)}
            onAIAssist={() => setShowAIAssistant(true)}
            onNewPresentation={() => setCurrentScreen('welcome')}
            onStartSlideShow={() => startSlideShow(appState.currentSlideIndex)}
            onPageNumberManager={() => setShowPageNumberManager(true)}
            onVersionInfo={() => setShowVersionInfo(true)}
            onSettings={() => setCurrentScreen('settings')}
            isProcessing={isProcessing}
            hasApiKey={isAIAvailable}
          />

          <main className="flex-1 flex overflow-hidden">
            {!showSlideShow && (
              <SlideNavigator 
                slides={appState.currentPresentation?.slides || []}
                currentIndex={appState.currentSlideIndex}
                onSlideSelect={(index) => setAppState(prev => ({ ...prev, currentSlideIndex: index }))}
                onSlideAdd={addSlide}
                onSlideDelete={deleteSlide}
                onSlideReorder={reorderSlides}
                onSlideDuplicate={duplicateSlide}
              />
            )}

            <div 
              className="flex-1 flex flex-col"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  selectLayer(null);
                }
              }}
            >
              <div 
                className="flex-1 flex items-center justify-center p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    selectLayer(null);
                  }
                }}
              >
                {currentSlide && (
                  <SlideCanvas 
                    slide={currentSlide}
                    viewState={appState.canvasState.viewState}
                    isActive={true}
                    onLayerUpdate={updateLayer}
                    onLayerSelect={selectLayer}
                    onLayerDelete={deleteLayer}
                    onLayerAdd={addLayer}
                    onViewStateUpdate={updateViewState}
                  />
                )}
              </div>
            </div>

            <LayerEditor 
              layer={selectedLayer || null}
              slide={currentSlide || null}
              onUpdate={(updates) => {
                if (selectedLayer) {
                  updateLayer(selectedLayer.id, updates);
                }
              }}
              onDelete={() => {
                if (selectedLayer) {
                  deleteLayer(selectedLayer.id);
                }
              }}
              onDuplicate={() => {
                if (selectedLayer) {
                  const duplicatedLayer = {
                    ...selectedLayer,
                    id: `layer-${Date.now()}`,
                    x: selectedLayer.x + 5,
                    y: selectedLayer.y + 5,
                  };
                  addLayer(duplicatedLayer);
                }
              }}
              onSelectLayer={selectLayer}
              onUpdateSlide={(updates) => {
                if (currentSlide) {
                  updateSlide(appState.currentSlideIndex, updates);
                }
              }}
              onCopy={copyLayer}
              onCut={cutLayer}
              onPaste={pasteLayer}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              hasClipboard={clipboardLayer !== null}
            />
          </main>

          {showAIAssistant && (
            <AIAssistant 
              onSlideGenerate={generateSlides}
              onElementGenerate={generateElement}
              onContentAssist={assistWithContent}
              onRetryFailedImages={retryFailedImages}
              isProcessing={isProcessing}
              error={appState.error}
              onClose={() => setShowAIAssistant(false)}
              hasApiKey={isAIAvailable}
              onApiKeySetup={() => setCurrentScreen('settings')}
              currentPresentation={appState.currentPresentation}
            />
          )}

          {showExportManager && (
            <ExportManager 
              presentation={appState.currentPresentation}
              onExport={exportPresentation}
              isProcessing={isProcessing}
              onClose={() => setShowExportManager(false)}
            />
          )}

          {showSlideShow && appState.currentPresentation && (
            <SlideShow 
              presentation={appState.currentPresentation}
              startSlideIndex={slideShowStartIndex}
              onClose={closeSlideShow}
            />
          )}

          {showPageNumberManager && appState.currentPresentation && (
            <PageNumberManager 
              presentation={appState.currentPresentation}
              onUpdate={updatePageNumberSettings}
              onClose={() => setShowPageNumberManager(false)}
            />
          )}

          {showVersionInfo && (
            <VersionInfo 
              presentation={appState.currentPresentation}
              onClose={() => setShowVersionInfo(false)}
            />
          )}

          <Toaster 
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#334155',
                color: '#fff',
              },
            }}
          />
        </div>
      )}
    </ThemeProvider>
  );
};

export default App;