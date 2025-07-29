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
import MultiProviderApiKeyManager from './components/MultiProviderApiKeyManager';
import { AIProviderType } from './services/ai/aiProviderInterface';

// Import services (to be created)
import * as geminiService from './services/geminiService';
import * as storageService from './services/storageService';
import * as exportService from './services/exportService';
import * as aiServiceIntegration from './services/ai/aiServiceIntegration';

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

  // Load API key settings function
  const loadApiKeySettings = useCallback(() => {
    console.log('Loading API key settings from localStorage...');
    try {
      const savedSettings = localStorage.getItem('slidemaster_api_settings');
      console.log('loadApiKeySettings - raw localStorage data:', savedSettings);
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('loadApiKeySettings - parsed settings:', settings);
        console.log('loadApiKeySettings - setting apiKeySettings to:', settings);
        
        setApiKeySettings(settings);  // 完全に置き換える
        
        // Apply settings directly with the loaded settings
        try {
          if (settings.geminiApiKey) {
            console.log('loadApiKeySettings - setting Gemini API key');
            geminiService.setApiKey(settings.geminiApiKey);
          }
        } catch (error) {
          console.error('Failed to apply AI settings on startup:', error);
        }
      } else {
        console.log('loadApiKeySettings - no saved settings found');
        
        // Check for old format API key migration
        const oldApiKey = localStorage.getItem('slidemaster_user_api_key');
        if (oldApiKey) {
          console.log('loadApiKeySettings - migrating old API key:', oldApiKey);
          const migratedSettings = {
            geminiApiKey: oldApiKey,
            azureApiKey: '',
            azureEndpoint: '',
            openaiApiKey: '',
            claudeApiKey: '',
            lmStudioEndpoint: 'http://localhost:1234',
            fooucusEndpoint: 'http://localhost:7865',
          };
          setApiKeySettings(migratedSettings);
          localStorage.setItem('slidemaster_api_settings', JSON.stringify(migratedSettings));
          geminiService.setApiKey(oldApiKey);
        }
      }
    } catch (error) {
      console.error('Failed to load API key settings:', error);
    }
  }, []); // 依存配列を空にして無限ループを防ぐ

  // Load recent presentations and API settings on startup
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
    loadApiKeySettings();
  }, []);


  const [showWelcome, setShowWelcome] = useState(true);
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

  // Multi-provider API key management
  const [showMultiProviderApiKeyManager, setShowMultiProviderApiKeyManager] = useState(false);
  const [apiKeySettings, setApiKeySettings] = useState({
    geminiApiKey: '',
    azureApiKey: '',
    azureEndpoint: '',
    openaiApiKey: '',
    claudeApiKey: '',
    lmStudioEndpoint: 'http://localhost:1234',
    fooucusEndpoint: 'http://localhost:7865',
  });

  // Apply API settings to AI services
  const applyAISettings = useCallback(() => {
    try {
      // For now, primarily configure Gemini (the main provider)
      if (apiKeySettings.geminiApiKey) {
        geminiService.setApiKey(apiKeySettings.geminiApiKey);
      }
      
      // Future: Configure other providers as they become available
      // TODO: Implement multi-provider configuration when AI factory is ready
      
    } catch (error) {
      console.error('Failed to apply AI settings:', error);
    }
  }, [apiKeySettings]);

  // Multi-provider API key management
  const handleMultiProviderApiKeyUpdate = useCallback((provider: AIProviderType, apiKey: string, additionalConfig?: any) => {
    console.log('🔄 handleMultiProviderApiKeyUpdate called:', { provider, apiKey, additionalConfig });
    console.log('📋 Current apiKeySettings before update:', apiKeySettings);
    
    const newSettings = { ...apiKeySettings };
    
    switch (provider) {
      case 'gemini':
        console.log('🎯 Setting gemini API key:', apiKey);
        newSettings.geminiApiKey = apiKey;
        break;
      case 'azure':
        console.log('🎯 Setting azure API key:', apiKey);
        newSettings.azureApiKey = apiKey;
        if (additionalConfig?.azureEndpoint) {
          newSettings.azureEndpoint = additionalConfig.azureEndpoint;
        }
        break;
      case 'openai':
        console.log('🎯 Setting openai API key:', apiKey);
        newSettings.openaiApiKey = apiKey;
        break;
      case 'claude':
        console.log('🎯 Setting claude API key:', apiKey);
        newSettings.claudeApiKey = apiKey;
        break;
      case 'lmstudio':
        if (additionalConfig?.lmStudioEndpoint) {
          newSettings.lmStudioEndpoint = additionalConfig.lmStudioEndpoint;
        }
        break;
      case 'fooocus':
        if (additionalConfig?.fooucusEndpoint) {
          newSettings.fooucusEndpoint = additionalConfig.fooucusEndpoint;
        }
        break;
    }
    
    console.log('📊 New settings after update:', newSettings);
    setApiKeySettings(newSettings);
    
    // Save to localStorage with enhanced error handling
    try {
      console.log('💾 Saving API key settings to localStorage:', newSettings);
      
      // 空文字列のAPIキーの場合、localStorageから完全に削除
      const cleanSettings = { ...newSettings };
      Object.keys(cleanSettings).forEach(key => {
        if (typeof cleanSettings[key] === 'string' && cleanSettings[key].trim() === '') {
          if (key.includes('Endpoint')) {
            // エンドポイントはデフォルト値に戻す
            if (key === 'lmStudioEndpoint') cleanSettings[key] = 'http://localhost:1234';
            if (key === 'fooucusEndpoint') cleanSettings[key] = 'http://localhost:7865';
          }
          // APIキーの場合は空文字列のまま保持（削除しない）
        }
      });
      
      // 強制的にlocalStorageをクリアしてから書き込み
      localStorage.removeItem('slidemaster_api_settings');
      localStorage.setItem('slidemaster_api_settings', JSON.stringify(cleanSettings));
      
      console.log('✅ API key settings saved successfully to localStorage');
      
      // 即座に保存されたかを確認
      const saved = localStorage.getItem('slidemaster_api_settings');
      console.log('🔍 Verification - what was actually saved:', saved);
      
      // 保存が成功しているかダブルチェック
      if (saved) {
        const parsedSaved = JSON.parse(saved);
        console.log('🔍 Parsed verification:', parsedSaved);
        
        if (JSON.stringify(cleanSettings) === saved) {
          console.log('✅ localStorage save verification successful');
        } else {
          console.warn('⚠️ localStorage save verification failed - content mismatch');
        }
      } else {
        console.error('❌ localStorage save verification failed - no data found');
      }
      
      toast.success('APIキー設定が保存されました');
    } catch (error) {
      console.error('❌ Failed to save API key settings:', error);
      toast.error('APIキー設定の保存に失敗しました');
    }
  }, [apiKeySettings]);

  // Check if any AI features are available (primarily Gemini for now)
  const isAIAvailable = useMemo(() => {
    // 空文字列チェックを含む関数
    const hasValidKey = (key: string) => key && key.trim().length > 0;
    const hasValidEndpoint = (endpoint: string, defaultValue: string) => 
      endpoint && endpoint.trim() !== defaultValue.trim();
    
    // 状態ベースのチェック（空文字列も考慮）
    const stateBasedAvailable = hasValidKey(apiKeySettings.geminiApiKey) || 
                               hasValidKey(apiKeySettings.azureApiKey) || 
                               hasValidKey(apiKeySettings.openaiApiKey) || 
                               hasValidKey(apiKeySettings.claudeApiKey) ||
                               hasValidEndpoint(apiKeySettings.lmStudioEndpoint, 'http://localhost:1234') ||
                               hasValidEndpoint(apiKeySettings.fooucusEndpoint, 'http://localhost:7865');
    
    // Debug logging
    console.log('apiKeySettings:', apiKeySettings);
    console.log('geminiApiKey check:', hasValidKey(apiKeySettings.geminiApiKey), 'value:', apiKeySettings.geminiApiKey);
    console.log('azureApiKey check:', hasValidKey(apiKeySettings.azureApiKey), 'value:', apiKeySettings.azureApiKey);
    console.log('openaiApiKey check:', hasValidKey(apiKeySettings.openaiApiKey), 'value:', apiKeySettings.openaiApiKey);
    console.log('claudeApiKey check:', hasValidKey(apiKeySettings.claudeApiKey), 'value:', apiKeySettings.claudeApiKey);
    console.log('stateBasedAvailable:', stateBasedAvailable);
    console.log('final isAIAvailable:', stateBasedAvailable);
    
    return stateBasedAvailable;
  }, [apiKeySettings]);

  const requireAIFeature = useCallback(() => {
    // Double-check API key availability with more detailed logging
    console.log('requireAIFeature called');
    console.log('isAIAvailable:', isAIAvailable);
    console.log('Current apiKeySettings:', apiKeySettings);
    
    if (!isAIAvailable) {
      console.log('No API key available, showing setup dialog');
      toast.error('AI機能を使用するにはAPIキーの設定が必要です');
      setShowMultiProviderApiKeyManager(true);
      return false;
    }
    
    console.log('API key available, proceeding with AI features');
    return true;
  }, [isAIAvailable, apiKeySettings]);

  // Apply API settings whenever apiKeySettings changes
  useEffect(() => {
    applyAISettings();
  }, [applyAISettings]);

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

  const duplicateSlide = useCallback((index: number, duplicatedSlide: Slide) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    newSlides.splice(index, 0, duplicatedSlide);

    // Update page numbers after adding duplicated slide
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
      
      // For now, use Gemini if available, otherwise show error
      if (apiKeySettings.geminiApiKey) {
        const presentation = await geminiService.generatePresentation(request, apiKeySettings.geminiApiKey);
        
        setAppState(prev => ({
          ...prev,
          currentPresentation: presentation,
          currentSlideIndex: 0,
        }));
        
        setCurrentScreen('editor');
        toast.success('Slides generated successfully!');
      } else {
        // TODO: Use other providers when available
        toast.error('Gemini APIキーが設定されていません。設定画面でAPIキーを設定してください。');
      }
    } catch (error) {
      console.error('Error generating slides:', error);
      toast.error('Failed to generate slides');
    } finally {
      setIsProcessing(false);
    }
  }, [requireAIFeature, apiKeySettings.geminiApiKey]);

  const generateElement = useCallback(async (request: ElementGenerationRequest) => {
    if (!requireAIFeature()) return;
    
    try {
      setIsProcessing(true);
      
      if (apiKeySettings.geminiApiKey) {
        const element = await geminiService.generateElement(request, apiKeySettings.geminiApiKey);
        addLayer(element);
        toast.success('Element generated successfully!');
      } else {
        toast.error('Gemini APIキーが設定されていません。設定画面でAPIキーを設定してください。');
      }
    } catch (error) {
      console.error('Error generating element:', error);
      toast.error('Failed to generate element');
    } finally {
      setIsProcessing(false);
    }
  }, [requireAIFeature, apiKeySettings.geminiApiKey, addLayer]);

  const assistWithContent = useCallback(async (request: AIAssistRequest) => {
    if (!requireAIFeature()) return;
    
    try {
      setIsProcessing(true);
      
      if (apiKeySettings.geminiApiKey) {
        const result = await geminiService.assistWithContent(request, apiKeySettings.geminiApiKey);
        
        if (request.targetLayer) {
          updateLayer(request.targetLayer, result.layerUpdates);
        } else {
          updateSlide(appState.currentSlideIndex, result.slideUpdates);
        }
        
        toast.success('Content updated successfully!');
      } else {
        toast.error('Gemini APIキーが設定されていません。設定画面でAPIキーを設定してください。');
      }
    } catch (error) {
      console.error('Error with AI assist:', error);
      toast.error('Failed to assist with content');
    } finally {
      setIsProcessing(false);
    }
  }, [requireAIFeature, apiKeySettings.geminiApiKey, updateLayer, updateSlide, appState.currentSlideIndex]);

  const retryFailedImages = useCallback(async (failedImageIds: string[]) => {
    if (!requireAIFeature()) return;
    if (!appState.currentPresentation) return;
    
    try {
      setIsProcessing(true);
      
      if (apiKeySettings.geminiApiKey) {
        // Find failed image layers and their prompts
        const imagesToRetry: Array<{
          slideIndex: number;
          layerId: string;
          prompt: string;
        }> = [];
        
        appState.currentPresentation.slides.forEach((slide, slideIndex) => {
          slide.layers.forEach(layer => {
            if (layer.type === 'image' && failedImageIds.includes(layer.id)) {
              const imageLayer = layer as any; // Type assertion for prompt access
              imagesToRetry.push({
                slideIndex,
                layerId: layer.id,
                prompt: imageLayer.prompt || 'Generate image'
              });
            }
          });
        });
        
        toast.success(`画像の再生成を開始します... (${imagesToRetry.length}枚)`);
        
        // Regenerate each image
        for (const imageInfo of imagesToRetry) {
          try {
            const newImageSrc = await geminiService.generateImage(
              imageInfo.prompt,
              undefined, // imageSettings
              'business_presentation',
              imageInfo.slideIndex,
              [], // characterContext
              undefined, // referenceImageContext
              apiKeySettings.geminiApiKey
            );
            
            // Update the layer with the new image
            updateLayer(imageInfo.layerId, { src: newImageSrc });
            
          } catch (error) {
            console.error(`Failed to regenerate image for layer ${imageInfo.layerId}:`, error);
          }
        }
        
        toast.success(`${imagesToRetry.length}枚の画像の再生成が完了しました！`);
      } else {
        toast.error('Gemini APIキーが設定されていません。設定画面でAPIキーを設定してください。');
      }
    } catch (error) {
      console.error('Error retrying failed images:', error);
      toast.error('Failed to retry failed images');
    } finally {
      setIsProcessing(false);
    }
  }, [requireAIFeature, apiKeySettings.geminiApiKey, appState.currentPresentation, updateLayer]);

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
        handleSlideChange,
        undefined, // onProgress
        originalSlideIndex // currentSlideIndex
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
            setShowMultiProviderApiKeyManager(true);
          }}
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
        onSettings={() => setCurrentScreen('settings')}
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
            onSlideDuplicate={duplicateSlide}
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
          onRetryFailedImages={retryFailedImages}
          isProcessing={isProcessing}
          error={appState.error}
          onClose={() => setShowAIAssistant(false)}
          hasApiKey={isAIAvailable}
          onApiKeySetup={() => {
            setShowAIAssistant(false);
            setShowMultiProviderApiKeyManager(true);
          }}
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

      {showMultiProviderApiKeyManager && (
        <MultiProviderApiKeyManager 
          isOpen={showMultiProviderApiKeyManager}
          onClose={() => {
            setShowMultiProviderApiKeyManager(false);
            // 設定画面を閉じる時にAPIキー設定を再読み込み
            loadApiKeySettings();
          }}
          onApiKeyUpdate={handleMultiProviderApiKeyUpdate}
          currentSettings={apiKeySettings}
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