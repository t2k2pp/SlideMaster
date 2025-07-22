import React, { useState, useCallback, useEffect } from 'react';
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
import { ThemeProvider } from './contexts/ThemeContext';
import { 
  DEFAULT_PRESENTATION_SETTINGS, 
  CANVAS_SIZES, 
  TEXT_STYLES, 
  DEFAULT_LAYER_PROPS,
  THEME_CONFIGS
} from './constants';

// Import components (to be created)
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
import ApiKeyManager from './components/ApiKeyManager';

// Import services (to be created)
import * as geminiService from './services/geminiService';
import * as storageService from './services/storageService';
import * as exportService from './services/exportService';

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
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'editor' | 'settings' | 'slideshow' | 'apikey'>('welcome');

  // Debug currentScreen state changes
  useEffect(() => {
    console.log('currentScreen changed to:', currentScreen);
    // showWelcomeをcurrentScreenと同期
    setShowWelcome(currentScreen === 'welcome');
  }, [currentScreen]);

  // Load recent presentations on startup
  useEffect(() => {
    const loadRecentPresentations = async () => {
      try {
        const presentations = await storageService.listPresentations();
        setAppState(prev => ({
          ...prev,
          recentPresentations: presentations.slice(0, 5), // Show only 5 most recent
        }));
      } catch (error) {
        console.error('Failed to load recent presentations:', error);
      }
    };

    loadRecentPresentations();
  }, []);

  const [showWelcome, setShowWelcome] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showExportManager, setShowExportManager] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  
  // Clipboard and Undo/Redo state
  const [clipboardLayer, setClipboardLayer] = useState<Layer | null>(null);
  const [undoState, setUndoState] = useState<Presentation | null>(null);
  const [redoState, setRedoState] = useState<Presentation | null>(null);
  
  // Check if default API key exists
  const hasDefaultApiKey = !!process.env.API_KEY;
  
  // Load user API key from localStorage on startup
  useEffect(() => {
    const savedApiKey = localStorage.getItem('slidemaster_user_api_key');
    if (savedApiKey) {
      setUserApiKey(savedApiKey);
      geminiService.setApiKey(savedApiKey);
    }
  }, []);
  
  // Handle API key updates
  const handleApiKeyUpdate = useCallback((apiKey: string) => {
    setUserApiKey(apiKey);
    if (apiKey) {
      localStorage.setItem('slidemaster_user_api_key', apiKey);
      geminiService.setApiKey(apiKey);
    } else {
      localStorage.removeItem('slidemaster_user_api_key');
    }
    toast.success(apiKey ? 'APIキーが保存されました' : 'APIキーがクリアされました');
  }, []);
  
  // Check if AI features are available
  const isAIAvailable = userApiKey || hasDefaultApiKey;
  
  // Show warning and offer API key setup if AI features are not available
  const requireAIFeature = useCallback(() => {
    if (!isAIAvailable) {
      toast.error('AI機能を使用するにはAPIキーの設定が必要です');
      setShowApiKeyManager(true);
      return false;
    }
    return true;
  }, [isAIAvailable]);
  const [showSlideShow, setShowSlideShow] = useState(false);
  const [showPageNumberManager, setShowPageNumberManager] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [slideShowStartIndex, setSlideShowStartIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // =================================================================
  // Derived State
  // =================================================================
  
  const currentSlide = appState.currentPresentation?.slides[appState.currentSlideIndex];
  const selectedLayer = currentSlide?.layers.find(layer => 
    layer.id === appState.canvasState.viewState.selectedLayerId
  );

  // =================================================================
  // Undo/Redo Helper Functions
  // =================================================================
  
  const saveStateForUndo = useCallback(() => {
    if (appState.currentPresentation) {
      setUndoState(JSON.parse(JSON.stringify(appState.currentPresentation)));
      setRedoState(null); // Clear redo when new action is performed
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
    const themeConfig = THEME_CONFIGS[theme];
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
      // Version information
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
      console.log('Saving presentation:', appState.currentPresentation.title);
      
      const updatedPresentation = {
        ...appState.currentPresentation,
        updatedAt: new Date(),
      };

      // Validate presentation data before saving
      if (!updatedPresentation.id || !updatedPresentation.title) {
        throw new Error('Invalid presentation data: missing id or title');
      }

      await storageService.savePresentation(updatedPresentation);
      
      // Update recent presentations list
      const updatedRecentPresentations = await storageService.listPresentations();
      
      setAppState(prev => ({
        ...prev,
        currentPresentation: updatedPresentation,
        recentPresentations: updatedRecentPresentations.slice(0, 5),
      }));
      
      toast.success('Presentation saved!');
      console.log('Presentation saved successfully');
    } catch (error) {
      console.error('Error saving presentation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
        toast.error('Storage full! Try cleaning up old presentations.');
        // Automatically attempt cleanup
        try {
          storageService.cleanupStorage();
          toast.success('Storage cleaned up. Please try saving again.');
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
        }
      } else {
        toast.error(`Failed to save: ${errorMessage}`);
      }
    }
  }, [appState.currentPresentation]);

  const importProject = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Clean up storage before importing to make space
      storageService.cleanupStorage();
      
      const result = await exportService.importProject(file);
      
      if (result.success && result.presentation) {
        // Save the imported presentation (with optimization)
        await storageService.savePresentation(result.presentation);
        
        setAppState(prev => ({
          ...prev,
          currentPresentation: result.presentation,
          currentSlideIndex: 0,
        }));
        
        // Update recent presentations list
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
      
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('Storage')) {
          toast.error('ストレージ容量が不足しています。古いプロジェクトを削除してから再度お試しください。');
        } else {
          toast.error(`プロジェクトのインポートに失敗しました: ${error.message}`);
        }
      } else {
        toast.error('プロジェクトのインポートに失敗しました');
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // =================================================================
  // Slide Management
  // =================================================================

  const addSlide = useCallback((index?: number) => {
    if (!appState.currentPresentation) return;

    const themeConfig = THEME_CONFIGS[appState.currentPresentation.theme];
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

    // Update page numbers after adding slide
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

    // Update page numbers after deleting slide
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

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);

    // Update page numbers after reordering
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
  // Clipboard Operations (continued)
  // =================================================================
  
  const pasteLayer = useCallback(() => {
    if (clipboardLayer && currentSlide) {
      saveStateForUndo();
      const newLayer = {
        ...clipboardLayer,
        id: `layer-${Date.now()}`,
        x: clipboardLayer.x + 10, // Offset pasted layer
        y: clipboardLayer.y + 10,
        zIndex: currentSlide.layers.length,
      };
      
      const updatedLayers = [...currentSlide.layers, newLayer];
      updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
      
      // Select the new layer
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
  }, [clipboardLayer, currentSlide, saveStateForUndo, appState.currentSlideIndex, updateSlide]);

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

    // Select the new layer
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

    // Don't save state for minor updates like position changes during drag
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

    // Clear selection if deleted layer was selected
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

  const cutLayer = useCallback(() => {
    if (selectedLayer) {
      saveStateForUndo();
      setClipboardLayer(JSON.parse(JSON.stringify(selectedLayer)));
      deleteLayer(selectedLayer.id);
      toast.success('Layer cut to clipboard');
    }
  }, [selectedLayer, saveStateForUndo, deleteLayer]);

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
  // AI Integration
  // =================================================================

  const generateSlides = useCallback(async (request: SlideGenerationRequest) => {
    if (!requireAIFeature()) return;
    
    try {
      setIsProcessing(true);
      const presentation = await geminiService.generatePresentation(request, userApiKey);
      
      setAppState(prev => ({
        ...prev,
        currentPresentation: presentation,
        currentSlideIndex: 0,
      }));
      
      setCurrentScreen('editor');
      toast.success('Slides generated successfully!');
    } catch (error) {
      console.error('Error generating slides:', error);
      toast.error('Failed to generate slides');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateElement = useCallback(async (request: ElementGenerationRequest) => {
    if (!requireAIFeature()) return;
    
    try {
      setIsProcessing(true);
      const element = await geminiService.generateElement(request, userApiKey);
      addLayer(element);
      toast.success('Element generated successfully!');
    } catch (error) {
      console.error('Error generating element:', error);
      toast.error('Failed to generate element');
    } finally {
      setIsProcessing(false);
    }
  }, [addLayer]);

  const assistWithContent = useCallback(async (request: AIAssistRequest) => {
    if (!requireAIFeature()) return;
    
    try {
      setIsProcessing(true);
      const result = await geminiService.assistWithContent(request, userApiKey);
      
      if (request.targetLayer) {
        updateLayer(request.targetLayer, result.layerUpdates);
      } else {
        updateSlide(appState.currentSlideIndex, result.slideUpdates);
      }
      
      toast.success('Content updated successfully!');
    } catch (error) {
      console.error('Error with AI assist:', error);
      toast.error('Failed to assist with content');
    } finally {
      setIsProcessing(false);
    }
  }, [updateLayer, updateSlide, appState.currentSlideIndex]);

  // =================================================================
  // View State Management - (Moved to layer management section)
  // =================================================================

  // =================================================================
  // Export Management
  // =================================================================

  const exportPresentation = useCallback(async (options: ExportOptions) => {
    if (!appState.currentPresentation) return;

    try {
      setIsProcessing(true);
      
      // Store current state to restore later
      const originalSlideIndex = appState.currentSlideIndex;
      const originalSelectedLayerId = appState.canvasState.viewState.selectedLayerId;
      
      // Clear layer selection for clean export (no highlights)
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
      
      // Wait a moment for the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create slide change callback for multi-slide exports
      const handleSlideChange = (slideIndex: number) => {
        setAppState(prev => ({ 
          ...prev, 
          currentSlideIndex: slideIndex,
          canvasState: {
            ...prev.canvasState,
            viewState: {
              ...prev.canvasState.viewState,
              selectedLayerId: null, // Keep selection cleared during export
            },
          },
        }));
      };
      
      const result = await exportService.exportPresentation(
        appState.currentPresentation, 
        options,
        handleSlideChange
      );
      
      // Restore original state
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

    // Create a new presentation with the generated slides
    const versionMetadata = createVersionMetadata();
    const newPresentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: 'Manual Generated Presentation',
      description: 'Generated from video manual',
      theme: 'professional',
      slides: slides,
      settings: {
        ...DEFAULT_PRESENTATION_SETTINGS,
        defaultBackground: '#ffffff',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      // Version information
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

  // =================================================================
  // Auto Slide Generator
  // =================================================================

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
  // Keyboard Shortcuts
  // =================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中は通常のキーボード操作を許可
      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            savePresentation();
            break;
          case 'n':
            e.preventDefault();
            addSlide();
            break;
          case 'k':
            e.preventDefault();
            setShowAIAssistant(true);
            break;
          case 'c':
            // テキスト入力中は通常のコピーを許可
            if (!isTextInput) {
              e.preventDefault();
              copyLayer();
            }
            break;
          case 'x':
            // テキスト入力中は通常のカットを許可
            if (!isTextInput) {
              e.preventDefault();
              cutLayer();
            }
            break;
          case 'v':
            // テキスト入力中は通常のペーストを許可
            if (!isTextInput) {
              e.preventDefault();
              pasteLayer();
            }
            break;
          case 'z':
            // テキスト入力中は通常のUndoを許可
            if (!isTextInput) {
              e.preventDefault();
              if (e.shiftKey) {
                redo();
              } else {
                undo();
              }
            }
            break;
          case 'y':
            // テキスト入力中は通常のRedoを許可
            if (!isTextInput) {
              e.preventDefault();
              redo();
            }
            break;
        }
      } else {
        switch (e.key) {
          case 'F5':
            e.preventDefault();
            startSlideShow(appState.currentSlideIndex);
            break;
          case 'Delete':
            // テキスト入力中は通常のDeleteを許可
            if (!isTextInput && selectedLayer) {
              e.preventDefault();
              deleteLayer(selectedLayer.id);
            }
            break;
          case 'ArrowLeft':
            // テキスト入力中は通常のカーソル移動を許可
            if (!isTextInput) {
              e.preventDefault();
              if (selectedLayer) {
                // レイヤー選択時は微調整移動
                updateLayer(selectedLayer.id, { x: Math.max(0, selectedLayer.x - 1) });
              } else {
                // スライド切り替え
                const prevIndex = Math.max(0, appState.currentSlideIndex - 1);
                setAppState(prev => ({ ...prev, currentSlideIndex: prevIndex }));
              }
            }
            break;
          case 'ArrowRight':
            // テキスト入力中は通常のカーソル移動を許可
            if (!isTextInput) {
              e.preventDefault();
              if (selectedLayer) {
                // レイヤー選択時は微調整移動
                updateLayer(selectedLayer.id, { x: Math.min(100, selectedLayer.x + 1) });
              } else {
                // スライド切り替え
                const nextIndex = Math.min(appState.currentPresentation?.slides.length - 1 || 0, appState.currentSlideIndex + 1);
                setAppState(prev => ({ ...prev, currentSlideIndex: nextIndex }));
              }
            }
            break;
          case 'ArrowUp':
            // テキスト入力中は通常のカーソル移動を許可
            if (!isTextInput && selectedLayer) {
              e.preventDefault();
              updateLayer(selectedLayer.id, { y: Math.max(0, selectedLayer.y - 1) });
            }
            break;
          case 'ArrowDown':
            // テキスト入力中は通常のカーソル移動を許可
            if (!isTextInput && selectedLayer) {
              e.preventDefault();
              updateLayer(selectedLayer.id, { y: Math.min(100, selectedLayer.y + 1) });
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (showAIAssistant) {
              setShowAIAssistant(false);
            } else if (selectedLayer) {
              setAppState(prev => ({
                ...prev,
                canvasState: {
                  ...prev.canvasState,
                  viewState: {
                    ...prev.canvasState.viewState,
                    selectedLayerId: null
                  }
                }
              }));
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savePresentation, addSlide, startSlideShow, appState.currentSlideIndex, copyLayer, cutLayer, pasteLayer, undo, redo, selectedLayer, deleteLayer, updateLayer, showAIAssistant, setShowAIAssistant, setAppState, appState.currentPresentation]);

  // =================================================================
  // Auto-save
  // =================================================================

  useEffect(() => {
    if (appState.currentPresentation?.settings.autoSave) {
      const interval = setInterval(() => {
        // Only auto-save if there have been changes (silent save)
        if (appState.currentPresentation) {
          storageService.savePresentation({
            ...appState.currentPresentation,
            updatedAt: new Date(),
          }).then(() => {
            // Silent auto-save - no toast notification
            console.log('Auto-saved presentation');
          }).catch((error) => {
            console.error('Auto-save failed:', error);
          });
        }
      }, 120000); // Auto-save every 2 minutes instead of 30 seconds

      return () => clearInterval(interval);
    }
  }, [appState.currentPresentation]);

  // =================================================================
  // Render
  // =================================================================

  // Screen routing based on currentScreen state
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
          onOpenSettings={() => {
            console.log('onOpenSettings called, switching to settings screen');
            setCurrentScreen('settings');
          }}
          recentPresentations={appState.recentPresentations}
          isProcessing={isProcessing}
          hasApiKey={isAIAvailable}
          onApiKeySetup={() => {
            setShowApiKeyManager(true);
          }}
        />
        
        {showApiKeyManager && (
          <ApiKeyManager 
            isOpen={showApiKeyManager}
            onClose={() => {
              setShowApiKeyManager(false);
            }}
            onApiKeyUpdate={handleApiKeyUpdate}
            currentApiKey={userApiKey}
            hasDefaultKey={hasDefaultApiKey}
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

      {currentScreen === 'settings' && (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
          <SettingsScreen onBack={() => {
            console.log('Settings back button clicked');
            setCurrentScreen('welcome');
          }} />
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
        onApiKeyManager={() => setShowApiKeyManager(true)}
        isProcessing={isProcessing}
        hasApiKey={isAIAvailable}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Hide SlideNavigator when SlideShow is active */}
        {!showSlideShow && (
          <SlideNavigator 
            slides={appState.currentPresentation?.slides || []}
            currentIndex={appState.currentSlideIndex}
            onSlideSelect={(index) => setAppState(prev => ({ ...prev, currentSlideIndex: index }))}
            onSlideAdd={addSlide}
            onSlideDelete={deleteSlide}
            onSlideReorder={reorderSlides}
          />
        )}

        <div 
          className="flex-1 flex flex-col"
          onClick={(e) => {
            // Clear layer selection when clicking in empty area
            if (e.target === e.currentTarget) {
              selectLayer(null);
            }
          }}
        >
          <div 
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => {
              // Clear layer selection when clicking in canvas area
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
          isProcessing={isProcessing}
          error={appState.error}
          onClose={() => setShowAIAssistant(false)}
          hasApiKey={isAIAvailable}
          onApiKeySetup={() => {
            setShowAIAssistant(false);
            setShowApiKeyManager(true);
          }}
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


      {showApiKeyManager && (
        <ApiKeyManager 
          isOpen={showApiKeyManager}
          onClose={() => setShowApiKeyManager(false)}
          onApiKeyUpdate={handleApiKeyUpdate}
          currentApiKey={userApiKey}
          hasDefaultKey={hasDefaultApiKey}
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