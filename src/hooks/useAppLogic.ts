import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Presentation, Slide, Layer, AppState, PresentationTheme } from '../../types';
import * as storageService from '../../services/storageService';
import { createVersionMetadata } from '../../utils/versionManager';
import { THEME_CONFIGS, DEFAULT_PRESENTATION_SETTINGS } from '../../constants';
import { updateAllPageNumbers } from '../../utils/pageNumbers';

const initialAppState: AppState = {
  currentPresentation: null,
  currentSlideIndex: 0,
  selectedLayerId: null,
  isLoading: true,
  error: null,
  recentPresentations: [],
};

export const useAppLogic = () => {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [undoState, setUndoState] = useState<Presentation | null>(null);
  const [redoState, setRedoState] = useState<Presentation | null>(null);
  const [clipboardLayer, setClipboardLayer] = useState<Layer | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const recent = await storageService.listPresentations();
        setAppState(prev => ({ ...prev, recentPresentations: recent.slice(0, 5), isLoading: false }));
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setAppState(prev => ({ ...prev, error: 'Failed to load data', isLoading: false }));
      }
    };
    loadInitialData();
  }, []);

  const saveStateForUndo = useCallback(() => {
    if (appState.currentPresentation) {
      setUndoState(JSON.parse(JSON.stringify(appState.currentPresentation)));
      setRedoState(null);
    }
  }, [appState.currentPresentation]);

  const updatePresentation = useCallback((updates: Partial<Presentation>) => {
    if (!appState.currentPresentation) return;
    setAppState(prev => ({
      ...prev,
      currentPresentation: { ...prev.currentPresentation!, ...updates },
    }));
  }, [appState.currentPresentation]);

  const updateSlide = useCallback((slideIndex: number, updates: Partial<Slide>) => {
    if (!appState.currentPresentation) return;
    const newSlides = appState.currentPresentation.slides.map((slide, index) =>
      index === slideIndex ? { ...slide, ...updates } : slide
    );
    updatePresentation({ slides: newSlides });
  }, [appState.currentPresentation, updatePresentation]);

  const addLayer = useCallback((layer: Layer) => {
    if (!appState.currentPresentation) return;
    saveStateForUndo();
    const currentSlide = appState.currentPresentation.slides[appState.currentSlideIndex];
    const newLayer = { ...layer, id: `layer-${Date.now()}`, zIndex: currentSlide.layers.length };
    const updatedLayers = [...currentSlide.layers, newLayer];
    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
    setAppState(prev => ({ ...prev, selectedLayerId: newLayer.id }));
  }, [appState.currentPresentation, appState.currentSlideIndex, updateSlide, saveStateForUndo]);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    if (!appState.currentPresentation) return;
    const currentSlide = appState.currentPresentation.slides[appState.currentSlideIndex];
    const updatedLayers = currentSlide.layers.map(l => l.id === layerId ? { ...l, ...updates } : l);
    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
  }, [appState.currentPresentation, appState.currentSlideIndex, updateSlide]);

  const deleteLayer = useCallback((layerId: string) => {
    if (!appState.currentPresentation) return;
    saveStateForUndo();
    const currentSlide = appState.currentPresentation.slides[appState.currentSlideIndex];
    const updatedLayers = currentSlide.layers.filter(l => l.id !== layerId);
    updateSlide(appState.currentSlideIndex, { layers: updatedLayers });
    if (appState.selectedLayerId === layerId) {
      setAppState(prev => ({ ...prev, selectedLayerId: null }));
    }
  }, [appState.currentPresentation, appState.currentSlideIndex, appState.selectedLayerId, updateSlide, saveStateForUndo]);

  const createNewPresentation = useCallback((title: string, theme: PresentationTheme = 'professional') => {
    const themeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS.professional;
    const versionMetadata = createVersionMetadata();
    const newPresentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title,
      description: '',
      theme,
      slides: [{
        id: `slide-${Date.now()}`,
        title: 'Welcome',
        layers: [],
        background: themeConfig.backgroundColor,
        aspectRatio: '16:9',
        template: 'title',
        notes: '',
      }],
      settings: { ...DEFAULT_PRESENTATION_SETTINGS, defaultBackground: themeConfig.backgroundColor },
      ...versionMetadata,
    };
    setAppState(prev => ({ ...prev, currentPresentation: newPresentation, currentSlideIndex: 0 }));
    toast.success('New presentation created!');
    return newPresentation;
  }, []);

  const loadPresentation = useCallback(async (id: string) => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      const presentation = await storageService.loadPresentation(id);
      setAppState(prev => ({ ...prev, currentPresentation: presentation, currentSlideIndex: 0, isLoading: false }));
      toast.success('Presentation loaded!');
      return presentation;
    } catch (error) {
      console.error('Error loading presentation:', error);
      toast.error('Failed to load presentation');
      setAppState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, []);

  const savePresentation = useCallback(async () => {
    if (!appState.currentPresentation) return;
    try {
      const updatedPresentation = { ...appState.currentPresentation, updatedAt: new Date() };
      await storageService.savePresentation(updatedPresentation);
      const recent = await storageService.listPresentations();
      setAppState(prev => ({ ...prev, currentPresentation: updatedPresentation, recentPresentations: recent.slice(0, 5) }));
      toast.success('Presentation saved!');
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast.error('Failed to save presentation');
    }
  }, [appState.currentPresentation]);

  const createPresentationFromSlides = useCallback((slides: Slide[]) => {
    const versionMetadata = createVersionMetadata();
    const presentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: 'Manual Presentation',
      description: '',
      theme: 'professional',
      slides,
      settings: DEFAULT_PRESENTATION_SETTINGS,
      ...versionMetadata,
    };
    return presentation;
  }, []);

  const importProject = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Presentation;
      
      // バリデーションとバージョン処理
      if (!imported.slides || !imported.title) {
        throw new Error('Invalid presentation file');
      }
      
      const versionMetadata = createVersionMetadata();
      const presentation: Presentation = {
        ...imported,
        id: `imported-${Date.now()}`,
        ...versionMetadata,
      };
      
      setAppState(prev => ({ 
        ...prev, 
        currentPresentation: presentation, 
        currentSlideIndex: 0 
      }));
      
      toast.success('プロジェクトがインポートされました');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('プロジェクトのインポートに失敗しました');
    }
  }, []);

  // スライド管理メソッド
  const addSlide = useCallback((index?: number) => {
    if (!appState.currentPresentation) return;

    const newSlide = {
      id: `slide-${Date.now()}`,
      title: 'New Slide',
      layers: [],
      background: '#ffffff',
      aspectRatio: '16:9' as const,
      template: 'content' as const,
      notes: '',
    };

    const insertIndex = index !== undefined ? index : appState.currentSlideIndex + 1;
    const newSlides = [...appState.currentPresentation.slides];
    newSlides.splice(insertIndex, 0, newSlide);

    updatePresentation({ slides: newSlides });
    setAppState(prev => ({ ...prev, currentSlideIndex: insertIndex }));
  }, [appState.currentPresentation, appState.currentSlideIndex, updatePresentation]);

  const deleteSlide = useCallback((index: number) => {
    if (!appState.currentPresentation || appState.currentPresentation.slides.length <= 1) return;

    const newSlides = appState.currentPresentation.slides.filter((_, i) => i !== index);
    const newCurrentIndex = index === appState.currentSlideIndex 
      ? Math.max(0, appState.currentSlideIndex - 1)
      : appState.currentSlideIndex > index 
        ? appState.currentSlideIndex - 1 
        : appState.currentSlideIndex;

    updatePresentation({ slides: newSlides });
    setAppState(prev => ({ ...prev, currentSlideIndex: newCurrentIndex }));
  }, [appState.currentPresentation, appState.currentSlideIndex, updatePresentation]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);

    updatePresentation({ slides: newSlides });
    setAppState(prev => ({ ...prev, currentSlideIndex: toIndex }));
  }, [appState.currentPresentation, updatePresentation]);

  const duplicateSlide = useCallback((index: number, duplicatedSlide: any) => {
    if (!appState.currentPresentation) return;

    const newSlides = [...appState.currentPresentation.slides];
    newSlides.splice(index, 0, duplicatedSlide);

    updatePresentation({ slides: newSlides });
    setAppState(prev => ({ ...prev, currentSlideIndex: index }));
  }, [appState.currentPresentation, updatePresentation]);

  return {
    appState,
    setAppState,
    undoState,
    redoState,
    clipboardLayer,
    setClipboardLayer,
    saveStateForUndo,
    createNewPresentation,
    loadPresentation,
    savePresentation,
    updatePresentation,
    updateSlide,
    addLayer,
    updateLayer,
    deleteLayer,
    addSlide,
    deleteSlide,
    reorderSlides,
    duplicateSlide,
    createPresentationFromSlides,
    importProject,
  };
};