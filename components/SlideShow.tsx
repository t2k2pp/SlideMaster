import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Presentation, Slide, TextLayer, ImageLayer, ShapeLayer } from '../types';
import { TEXT_STYLES, CANVAS_SIZES } from '../constants';
import { MarkdownRenderer } from '../utils/markdownRenderer';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize2,
  Minimize2,
  Repeat,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';

interface SlideShowProps {
  presentation: Presentation;
  onClose: () => void;
  startSlideIndex?: number;
}

const SlideShow: React.FC<SlideShowProps> = ({
  presentation,
  onClose,
  startSlideIndex = 0,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(startSlideIndex);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isControlsHovered, setIsControlsHovered] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speechVoice, setSpeechVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSpeechSettings, setShowSpeechSettings] = useState(false);
  const [speechCompleted, setSpeechCompleted] = useState(false);
  const [autoPlayTimeout, setAutoPlayTimeout] = useState<NodeJS.Timeout | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  const currentSlide = presentation.slides[currentSlideIndex];
  const canvasSize = CANVAS_SIZES[currentSlide.aspectRatio];

  // Calculate fit-to-screen zoom whenever window resizes or slide changes
  useEffect(() => {
    const calculateFitZoom = () => {
      if (!viewportRef.current) return;
      
      const viewport = viewportRef.current;
      const viewportRect = viewport.getBoundingClientRect();
      
      // Calculate the scale to fit the canvas within the viewport with some padding (same as SlideCanvas)
      const padding = 40; // 20px padding on each side
      const availableWidth = Math.max(100, viewportRect.width - padding); // Ensure minimum width
      const availableHeight = Math.max(100, viewportRect.height - padding); // Ensure minimum height
      
      // Calculate scale to fit the slide inside the viewport while maintaining aspect ratio
      const scaleX = availableWidth / canvasSize.width;
      const scaleY = availableHeight / canvasSize.height;
      
      // Use the smaller scale to ensure the slide fits completely (same as SlideCanvas Fit button)
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale above 100%
      
      // Reset to center and apply fit scale
      setZoom(fitScale);
      setViewOffset({ x: 0, y: 0 });
    };

    // Calculate initial fit
    const timer = setTimeout(calculateFitZoom, 100);

    // Recalculate on window resize
    const handleResize = () => {
      requestAnimationFrame(calculateFitZoom);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasSize, currentSlideIndex]);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const allVoices = speechSynthesis.getVoices();
        setAvailableVoices(allVoices);
        
        // 選択された言語の音声を優先して選択
        if (allVoices.length > 0) {
          const currentSelectedVoice = allVoices.find(v => v.voiceURI === speechVoice?.voiceURI);
          if (!currentSelectedVoice) {
            // 現在選択されている言語の音声を探す
            const voicesForSelectedLang = allVoices.filter(voice => 
              voice.lang.toLowerCase().startsWith(selectedLanguage.toLowerCase())
            );
            
            if (voicesForSelectedLang.length > 0) {
              setSpeechVoice(voicesForSelectedLang[0]);
            } else {
              // 選択言語がない場合は日本語を探す
              const japaneseVoice = allVoices.find(voice => voice.lang.startsWith('ja'));
              setSpeechVoice(japaneseVoice || allVoices[0]);
            }
          }
        }
      };
      
      updateVoices();
      speechSynthesis.onvoiceschanged = updateVoices;
      
      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [speechVoice]);

  // Speech synthesis functions
  const speakText = useCallback((text: string) => {
    if (!text || !speechEnabled || !('speechSynthesis' in window)) return;
    
    // 既存の音声を停止
    speechSynthesis.cancel();
    setSpeechCompleted(false);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.voice = speechVoice;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechCompleted(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechCompleted(true);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechCompleted(true);
    };
    
    speechSynthesis.speak(utterance);
  }, [speechEnabled, speechRate, speechPitch, speechVoice]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechCompleted(true);
    }
  }, []);

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    
    // 既存のタイマーをクリア
    setControlsTimeout(prev => {
      if (prev) {
        clearTimeout(prev);
      }
      
      // 新しいタイマーを設定 (5秒に延長)
      const timeout = setTimeout(() => {
        // コントロールがホバーされている間は非表示にしない
        if (!isControlsHovered) {
          setShowControls(false);
        }
      }, 5000);
      
      return timeout;
    });
  }, [isControlsHovered]);

  // Mouse movement shows controls (debounced)
  const handleMouseMove = useCallback(() => {
    // Debounce mouse move events to prevent excessive timer resets
    const now = Date.now();
    if (!(handleMouseMove as any).lastCall || now - (handleMouseMove as any).lastCall > 500) {
      resetControlsTimeout();
      (handleMouseMove as any).lastCall = now;
    }
  }, [resetControlsTimeout]);

  // Initialize debounce timestamp
  (handleMouseMove as any).lastCall = 0;

  // Navigation functions
  const nextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => 
      prev < presentation.slides.length - 1 ? prev + 1 : prev
    );
  }, [presentation.slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlideIndex(Math.max(0, Math.min(index, presentation.slides.length - 1)));
  }, [presentation.slides.length]);

  // Auto-speak notes when slide changes (only during auto-play)
  useEffect(() => {
    if (speechEnabled && currentSlide?.notes && isAutoPlay) {
      // オートプレイ中のみ自動読み上げを行う
      const timer = setTimeout(() => {
        speakText(currentSlide.notes);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // 音声が無効、読み上げるテキストがない、またはオートプレイ無効の場合は即座に完了とする
      setSpeechCompleted(true);
    }
  }, [currentSlideIndex, speechEnabled, speakText, currentSlide?.notes, isAutoPlay]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(presentation.slides.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setShowNotes(!showNotes);
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setIsRepeatMode(!isRepeatMode);
          break;
        case 's':
        case 'S':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+S / Cmd+S: Open speech settings
            setShowSpeechSettings(!showSpeechSettings);
          } else if (isSpeaking) {
            stopSpeaking();
          } else {
            setSpeechEnabled(!speechEnabled);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, goToSlide, presentation.slides.length, onClose, isFullscreen, showNotes, isRepeatMode, speechEnabled, isSpeaking, stopSpeaking, showSpeechSettings]);

  // Mouse wheel navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Show controls when scrolling
      resetControlsTimeout();
      
      // Debounce wheel events to prevent rapid scrolling
      const now = Date.now();
      if (now - (handleWheel as any).lastCall < 150) {
        return;
      }
      (handleWheel as any).lastCall = now;
      
      if (e.deltaY > 0) {
        // Scroll down: next slide
        nextSlide();
      } else if (e.deltaY < 0) {
        // Scroll up: previous slide
        prevSlide();
      }
    };
    
    (handleWheel as any).lastCall = 0;
    
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [nextSlide, prevSlide, resetControlsTimeout]);

  // Auto-play functionality with speech synchronization
  useEffect(() => {
    // 既存のタイマーをクリア
    setAutoPlayTimeout(prev => {
      if (prev) {
        clearTimeout(prev);
      }
      return null;
    });

    if (!isAutoPlay) {
      return;
    }

    // 音声読み上げが完了したか、または音声が無効の場合
    if (speechCompleted || !speechEnabled) {
      // 最小待機時間（音声なしの場合）
      const minWaitTime = speechEnabled ? 1000 : 3000;
      
      const timeout = setTimeout(() => {
        if (currentSlideIndex < presentation.slides.length - 1) {
          nextSlide();
        } else {
          // 最後のスライドに到達した場合の処理
          if (isRepeatMode) {
            // リピートモード：最初のスライドに戻る
            setCurrentSlideIndex(0);
          } else {
            // 通常モード：自動再生を停止
            setIsAutoPlay(false);
          }
        }
      }, minWaitTime);
      
      setAutoPlayTimeout(timeout);
    }
  }, [isAutoPlay, isRepeatMode, currentSlideIndex, nextSlide, presentation.slides.length, speechCompleted, speechEnabled]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize controls timeout
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, []);

  // Cleanup speech and timers on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      setAutoPlayTimeout(prev => {
        if (prev) {
          clearTimeout(prev);
        }
        return null;
      });
      setControlsTimeout(prev => {
        if (prev) {
          clearTimeout(prev);
        }
        return null;
      });
    };
  }, []);

  // Render layer function
  const renderLayer = (layer: any) => {
    const layerStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      width: `${layer.width}%`,
      height: `${layer.height}%`,
      transform: `rotate(${layer.rotation || 0}deg)`,
      opacity: layer.opacity || 1,
      zIndex: layer.zIndex || 0,
    };

    switch (layer.type) {
      case 'text':
        const textStyle = TEXT_STYLES.find(s => s.id === layer.textStyleId)?.style || {};
        return (
          <div
            key={layer.id}
            style={{
              ...layerStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: layer.textAlign === 'left' ? 'flex-start' : 
                             layer.textAlign === 'right' ? 'flex-end' : 'center',
              textAlign: layer.textAlign,
              fontSize: `${layer.fontSize}px`,
              lineHeight: 1.2,
              wordBreak: 'break-word',
              padding: '8px',
              boxSizing: 'border-box',
              ...textStyle,
            }}
          >
            <MarkdownRenderer 
              content={layer.content}
              textAlign={layer.textAlign}
              style={{
                fontSize: 'inherit',
                color: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                textShadow: 'inherit',
              }}
            />
          </div>
        );

      case 'image':
        return layer.src ? (
          <div key={layer.id} style={layerStyle}>
            <img
              src={layer.src}
              alt={layer.prompt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: layer.objectFit === 'circle' || layer.objectFit === 'circle-fit' ? 
                  (layer.objectFit === 'circle-fit' ? 'contain' : 'cover') : layer.objectFit,
                borderRadius: layer.objectFit === 'circle' || layer.objectFit === 'circle-fit' ? '50%' : '4px',
              }}
              draggable={false}
            />
          </div>
        ) : null;

      case 'shape':
        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: layer.fillColor,
          border: `${layer.strokeWidth}px solid ${layer.strokeColor}`,
        };

        let shapeContent;
        switch (layer.shapeType) {
          case 'rectangle':
            shapeContent = <div style={shapeStyle} />;
            break;
          case 'circle':
            shapeContent = <div style={{ ...shapeStyle, borderRadius: '50%' }} />;
            break;
          case 'triangle':
            shapeContent = (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: `50% solid transparent`,
                    borderRight: `50% solid transparent`,
                    borderBottom: `100% solid ${layer.fillColor}`,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            );
            break;
          case 'line':
            shapeContent = (
              <div
                style={{
                  width: '100%',
                  height: `${layer.strokeWidth}px`,
                  backgroundColor: layer.strokeColor,
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            );
            break;
          default:
            shapeContent = <div style={shapeStyle} />;
        }

        return (
          <div key={layer.id} style={layerStyle}>
            {shapeContent}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Controls */}
      <div 
        className={`absolute inset-0 z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => setIsControlsHovered(true)}
        onMouseLeave={() => setIsControlsHovered(false)}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">{presentation.title}</h1>
              <div className="text-sm opacity-75">
                {currentSlideIndex + 1} / {presentation.slides.length}
              </div>
              {isRepeatMode && (
                <div className="text-sm bg-blue-500 text-white px-2 py-1 rounded">
                  🔄 リピートモード
                </div>
              )}
              {speechEnabled && isSpeaking && (
                <div className="text-sm bg-green-500 text-white px-2 py-1 rounded animate-pulse">
                  🔊 読み上げ中
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title={isAutoPlay ? "Pause auto-play" : speechEnabled ? "Start auto-play (waits for speech)" : "Start auto-play"}
              >
                {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={() => setIsRepeatMode(!isRepeatMode)}
                className={`p-2 rounded transition-colors ${
                  isRepeatMode ? 'bg-blue-500 text-white' : 'hover:bg-white/20'
                }`}
                title={isRepeatMode ? "Disable repeat mode" : "Enable repeat mode (Loop)"}
              >
                <Repeat size={20} />
              </button>
              <button
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    setSpeechEnabled(!speechEnabled);
                  }
                }}
                className={`p-2 rounded transition-colors ${
                  speechEnabled ? 'bg-green-500 text-white' : 'hover:bg-white/20'
                }`}
                title={speechEnabled ? "Disable speech (S)" : "Enable speech (S)"}
              >
                {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button
                onClick={() => setShowSpeechSettings(!showSpeechSettings)}
                className={`p-2 rounded transition-colors ${
                  showSpeechSettings ? 'bg-cyan-500 text-white' : 'hover:bg-white/20'
                }`}
                title="Speech settings (Ctrl+S)"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`p-2 rounded transition-colors ${
                  showNotes ? 'bg-blue-500 text-white' : 'hover:bg-white/20'
                }`}
                title={showNotes ? "Hide speaker notes (N)" : "Show speaker notes (N)"}
              >
                📝
              </button>
              <button
                onClick={() => goToSlide(0)}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title="Go to first slide"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded transition-colors"
                title="Exit slideshow"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center justify-center gap-4 text-white">
            <button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="p-3 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous slide (←)"
            >
              <ChevronLeft size={24} />
            </button>
            
            {/* Progress Bar */}
            <div className="flex-1 max-w-md">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300"
                  style={{ 
                    width: `${((currentSlideIndex + 1) / presentation.slides.length) * 100}%` 
                  }}
                />
              </div>
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === presentation.slides.length - 1}
              className="p-3 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next slide (→ or Space)"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide Content */}
      <div 
        ref={viewportRef}
        className="flex-1 overflow-hidden"
        style={{ position: 'relative' }}
      >
        <div 
          className="absolute"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            top: '50%',
            left: '50%',
            marginTop: -canvasSize.height / 2,
            marginLeft: -canvasSize.width / 2,
            background: currentSlide.background,
          }}
        >
          {currentSlide.layers
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(layer => renderLayer(layer))}
        </div>
      </div>

      {/* Speaker Notes Panel */}
      {showNotes && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-4 border-t border-gray-600 z-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">📝 Speaker Notes</h3>
              <div className="flex items-center gap-2">
                {currentSlide.notes && (
                  <button
                    onClick={() => {
                      if (currentSlide.notes) {
                        // 手動読み上げ（設定を使用）
                        const manualUtterance = new SpeechSynthesisUtterance(currentSlide.notes);
                        manualUtterance.rate = speechRate;
                        manualUtterance.pitch = speechPitch;
                        manualUtterance.voice = speechVoice;
                        
                        manualUtterance.onstart = () => setIsSpeaking(true);
                        manualUtterance.onend = () => setIsSpeaking(false);
                        manualUtterance.onerror = () => setIsSpeaking(false);
                        
                        speechSynthesis.cancel();
                        speechSynthesis.speak(manualUtterance);
                      }
                    }}
                    disabled={isSpeaking}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                    title="Read notes aloud"
                  >
                    <Volume2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close notes"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-200 max-h-32 overflow-y-auto">
              {currentSlide.notes && currentSlide.notes.trim() ? (
                currentSlide.notes.split('\n').map((line, index) => (
                  <p key={index} className="mb-1">
                    {line || '\u00A0'}
                  </p>
                ))
              ) : (
                <p className="text-gray-400 italic">No speaker notes for this slide</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Speech Settings Panel */}
      {showSpeechSettings && (
        <div className="fixed top-20 right-4 bg-slate-800/95 backdrop-blur-sm text-white p-6 rounded-xl border border-slate-700 shadow-2xl shadow-slate-900/50 z-30 w-96">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              🔊 Speech Settings
            </h3>
            <button
              onClick={() => setShowSpeechSettings(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Speech Enable/Disable Toggle */}
            <div className="bg-slate-700/50 p-4 rounded-lg ring-1 ring-slate-600/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Speech Function</label>
                <button
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    speechEnabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      speechEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {speechEnabled ? 'Auto-play will read speaker notes' : 'Auto-play will be silent'}
              </p>
            </div>

            {/* Voice Selection */}
            <div className="bg-slate-700/50 p-4 rounded-lg ring-1 ring-slate-600/50">
              <label className="block text-sm font-medium text-slate-300 mb-3">Voice Selection</label>
              
              {/* Language Selection */}
              <div className="mb-3">
                <label className="block text-xs text-slate-400 mb-1">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    // 言語変更時に該当言語の最初の音声を自動選択
                    const voicesForLang = availableVoices.filter(voice => 
                      voice.lang.toLowerCase().startsWith(e.target.value.toLowerCase())
                    );
                    if (voicesForLang.length > 0) {
                      setSpeechVoice(voicesForLang[0]);
                    }
                  }}
                  disabled={isSpeaking}
                  className="w-full bg-slate-600 border-slate-500 rounded-md py-2 px-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
                >
                  {[...new Set(availableVoices.map(voice => voice.lang.split('-')[0]))]
                    .sort()
                    .map(langCode => (
                      <option key={langCode} value={langCode}>
                        {langCode.toUpperCase()} - {
                          langCode === 'ja' ? '日本語' :
                          langCode === 'en' ? 'English' :
                          langCode === 'de' ? 'Deutsch' :
                          langCode === 'fr' ? 'Français' :
                          langCode === 'es' ? 'Español' :
                          langCode === 'it' ? 'Italiano' :
                          langCode === 'ko' ? '한국어' :
                          langCode === 'zh' ? '中文' :
                          langCode === 'ru' ? 'Русский' :
                          langCode === 'pt' ? 'Português' :
                          langCode === 'ar' ? 'العربية' :
                          langCode
                        }
                      </option>
                    ))
                  }
                </select>
              </div>

              {/* Voice Selection for Selected Language */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Voice</label>
                <select
                  value={speechVoice?.voiceURI || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedVoice = availableVoices.find(v => v.voiceURI === e.target.value);
                      setSpeechVoice(selectedVoice || null);
                    }
                  }}
                  disabled={isSpeaking}
                  className="w-full bg-slate-600 border-slate-500 rounded-md py-2 px-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
                >
                  <option value="">Select voice...</option>
                  {availableVoices
                    .filter(voice => voice.lang.toLowerCase().startsWith(selectedLanguage.toLowerCase()))
                    .map(voice => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {availableVoices.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">Loading voices...</p>
              )}
            </div>

            {/* Speed Control */}
            <div className="bg-slate-700/50 p-4 rounded-lg ring-1 ring-slate-600/50">
              <label className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                <span>Speed</span>
                <span className="text-cyan-400 font-semibold">{speechRate.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                disabled={isSpeaking}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="bg-slate-700/50 p-4 rounded-lg ring-1 ring-slate-600/50">
              <label className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                <span>Pitch</span>
                <span className="text-cyan-400 font-semibold">{speechPitch.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                disabled={isSpeaking}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0.5</span>
                <span>2.0</span>
              </div>
            </div>
            
            {/* Test Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (currentSlide?.notes) {
                    // テスト時は音声設定を一時的に有効化して再生
                    const testUtterance = new SpeechSynthesisUtterance(currentSlide.notes);
                    testUtterance.rate = speechRate;
                    testUtterance.pitch = speechPitch;
                    testUtterance.voice = speechVoice;
                    
                    testUtterance.onstart = () => setIsSpeaking(true);
                    testUtterance.onend = () => setIsSpeaking(false);
                    testUtterance.onerror = () => setIsSpeaking(false);
                    
                    speechSynthesis.cancel();
                    speechSynthesis.speak(testUtterance);
                  }
                }}
                disabled={!currentSlide?.notes || isSpeaking}
                className="flex-1 py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/20 transform hover:scale-105 transition-all duration-300 disabled:bg-slate-600 disabled:shadow-none disabled:transform-none disabled:opacity-50"
              >
                Test Speech
              </button>
              <button
                onClick={stopSpeaking}
                disabled={!isSpeaking}
                className="flex-1 py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg shadow-lg shadow-rose-500/20 transform hover:scale-105 transition-all duration-300 disabled:bg-slate-600 disabled:shadow-none disabled:transform-none disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click areas for navigation */}
      <div className="absolute inset-0 flex">
        <div 
          className="flex-1 cursor-pointer"
          onClick={prevSlide}
          title="Previous slide"
        />
        <div 
          className="flex-1 cursor-pointer"
          onClick={nextSlide}
          title="Next slide"
        />
      </div>
    </div>
  );
};

export default SlideShow;