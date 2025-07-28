import React, { useRef, useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import { SlideCanvasProps, Layer, TextLayer, ImageLayer, ShapeLayer, ViewState } from '../types';
import { CANVAS_SIZES, TEXT_STYLES } from '../constants';
import { Image as ImageIcon, Square, Circle, Triangle, Minus, Layers, Grid3X3, Magnet } from 'lucide-react';
import { MarkdownRenderer } from '../utils/markdownRenderer';

// =================================================================
// SlideCanvas Component - Main canvas for slide editing
// =================================================================

const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  viewState,
  isActive,
  onLayerUpdate,
  onLayerSelect,
  onLayerDelete,
  onLayerAdd,
  onViewStateUpdate,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const moveableRef = useRef<Moveable>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  // Touch handling state
  const [isTouching, setIsTouching] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [touchStartPoints, setTouchStartPoints] = useState<Touch[]>([]);
  const [touchTarget, setTouchTarget] = useState<EventTarget | null>(null);
  const [isLayerTouch, setIsLayerTouch] = useState(false);
  const [isMoveableActive, setIsMoveableActive] = useState(false);
  const [moveableKey, setMoveableKey] = useState(0);
  const [touchDragState, setTouchDragState] = useState<{layerId: string, startPos: {x: number, y: number}, initialLayerPos: {x: number, y: number}} | null>(null);
  
  // Shape selection dropdown state
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);

  const canvasSize = CANVAS_SIZES[slide.aspectRatio];
  
  const selectedLayer = slide.layers.find(layer => layer.id === viewState.selectedLayerId);

  // Generate grid style based on background color and zoom level
  const getGridStyle = (backgroundColor: string, zoomLevel: number) => {
    // Check if background is dark or light
    const isDarkBackground = isBackgroundDark(backgroundColor);
    
    const lightGridColor = 'rgba(255, 255, 255, 0.3)';  // White lines for dark backgrounds
    const darkGridColor = 'rgba(0, 0, 0, 0.2)';         // Dark lines for light backgrounds
    const lightMajorGridColor = 'rgba(255, 255, 255, 0.5)';  // Thicker white lines
    const darkMajorGridColor = 'rgba(0, 0, 0, 0.4)';         // Thicker dark lines
    
    const gridColor = isDarkBackground ? lightGridColor : darkGridColor;
    const majorGridColor = isDarkBackground ? lightMajorGridColor : darkMajorGridColor;
    
    // Grid size calculation based on zoom
    const baseGridSize = 20;
    const majorGridSize = baseGridSize * 10; // 200px intervals for major grid
    
    // Determine which grid to show based on zoom level
    if (zoomLevel < 0.25) {
      // Very small zoom: no grid
      return '';
    } else if (zoomLevel < 0.5) {
      // Small zoom: only major grid (200px intervals)
      return `
        linear-gradient(${majorGridColor} 2px, transparent 2px),
        linear-gradient(90deg, ${majorGridColor} 2px, transparent 2px)
      `;
    } else if (zoomLevel < 1.0) {
      // Medium zoom: major grid + minor grid, but lighter minor grid
      const lightMinorColor = isDarkBackground ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
      return `
        linear-gradient(${majorGridColor} 2px, transparent 2px),
        linear-gradient(90deg, ${majorGridColor} 2px, transparent 2px),
        linear-gradient(${lightMinorColor} 1px, transparent 1px),
        linear-gradient(90deg, ${lightMinorColor} 1px, transparent 1px)
      `;
    } else {
      // Normal/large zoom: full grid with both major and minor lines
      return `
        linear-gradient(${majorGridColor} 2px, transparent 2px),
        linear-gradient(90deg, ${majorGridColor} 2px, transparent 2px),
        linear-gradient(${gridColor} 1px, transparent 1px),
        linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
      `;
    }
  };

  // Get grid background size based on zoom level
  const getGridBackgroundSize = (zoomLevel: number) => {
    const baseGridSize = 20;
    const majorGridSize = baseGridSize * 10; // 200px
    
    if (zoomLevel < 0.5) {
      // Only major grid
      return `${majorGridSize}px ${majorGridSize}px`;
    } else {
      // Both major and minor grid
      return `${majorGridSize}px ${majorGridSize}px, ${majorGridSize}px ${majorGridSize}px, ${baseGridSize}px ${baseGridSize}px, ${baseGridSize}px ${baseGridSize}px`;
    }
  };

  // Determine if background color is dark
  const isBackgroundDark = (backgroundColor: string): boolean => {
    // Handle hex colors
    if (backgroundColor.startsWith('#')) {
      const hex = backgroundColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Calculate luminance using standard formula
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }
    
    // Handle rgb/rgba colors
    if (backgroundColor.startsWith('rgb')) {
      const matches = backgroundColor.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
    }
    
    // Handle gradients or other complex backgrounds - default to dark grid
    if (backgroundColor.includes('gradient')) {
      return true; // Show light grid for gradients by default
    }
    
    // Default to dark background assumption
    return true;
  };

  // =================================================================
  // Canvas Controls
  // =================================================================

  // Close shape dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showShapeDropdown && !target.closest('.relative')) {
        setShowShapeDropdown(false);
      }
    };

    if (showShapeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShapeDropdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPanning(true);
        if (viewportRef.current) {
          viewportRef.current.style.cursor = 'grabbing';
        }
      }
      
      if (e.key === 'Delete' && selectedLayer) {
        onLayerDelete(selectedLayer.id);
      }
      
      if (e.key === 'Escape' && showShapeDropdown) {
        setShowShapeDropdown(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
        if (viewportRef.current) {
          viewportRef.current.style.cursor = 'default';
        }
      }
    };

    // Global mouse up handler for middle mouse button
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isMiddleMousePanning) {
        setIsMiddleMousePanning(false);
        if (viewportRef.current) {
          viewportRef.current.style.cursor = 'default';
        }
      }
    };

    if (isActive) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isActive, selectedLayer, onLayerDelete, isMiddleMousePanning]);

  // Handle wheel zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      setZoom(prevZoom => {
        const newZoom = Math.max(0.1, Math.min(5, prevZoom - e.deltaY * 0.001));
        
        // Keep the center position fixed - no offset adjustment needed
        // since transformOrigin is 'center'
        
        return newZoom;
      });
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  // Update moveable when selected layer changes
  useEffect(() => {
    if (moveableRef.current) {
      moveableRef.current.updateRect();
    }
  }, [selectedLayer]);


  // =================================================================
  // Touch Utility Functions
  // =================================================================
  
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getTouchCenter = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };
  
  // =================================================================
  // Touch Handlers
  // =================================================================
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    // If Moveable is actively manipulating a layer, ignore canvas touch events
    if (isMoveableActive) {
      return;
    }
    
    // Reset all touch states at the start of new touch sequence
    setTouchStartPoints(touches);
    setIsTouching(true);
    setTouchTarget(e.target);
    
    // Check if touch started on a layer
    const targetElement = e.target as HTMLElement;
    const isOnLayer = targetElement.closest('.layer') !== null;
    const isOnSelectedLayer = isOnLayer && selectedLayer && 
      targetElement.closest(`[data-layer-id="${selectedLayer.id}"]`) !== null;
    
    // Always reset all touch states to ensure clean state
    setIsLayerTouch(false);
    setIsPanning(false);
    // Force reset Moveable state to prevent interference
    setIsMoveableActive(false);
    
    if (touches.length === 1) {
      if (isOnSelectedLayer) {
        // Touch started on the currently selected layer - enable layer touch only
        setIsLayerTouch(true);
        setIsPanning(false);
      } else if (isOnLayer) {
        // Touch started on unselected layer - prepare for potential selection/drag
        const layerId = targetElement.closest('.layer')?.getAttribute('data-layer-id');
        if (layerId) {
          // Store the potential layer to select, but don't select yet
          setTouchTarget(targetElement);
          setIsLayerTouch(true);
          setIsPanning(false);
        }
      } else {
        // Touch started on canvas (not on any layer) - enable panning only
        // Deselect current layer when touching canvas
        if (selectedLayer) {
          onLayerSelect(null);
        }
        setIsLayerTouch(false);
        setIsPanning(true);
        setDragStart({ x: touches[0].clientX, y: touches[0].clientY });
      }
    } else if (touches.length === 2) {
      // Two fingers - start pinch zoom, disable other modes
      setIsPanning(false);
      setIsLayerTouch(false);
      const distance = getTouchDistance(touches[0], touches[1]);
      setLastTouchDistance(distance);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    // If Moveable is actively manipulating a layer, ignore canvas touch events
    if (isMoveableActive) {
      return;
    }
    
    if (touches.length === 1) {
      // Priority 1: Manual drag in progress
      if (isLayerTouch && selectedLayer && touchDragState && touchDragState.layerId === selectedLayer.id) {
        // Manual drag in progress - update layer position
        const touch = touches[0];
        const deltaX = touch.clientX - touchDragState.startPos.x;
        const deltaY = touch.clientY - touchDragState.startPos.y;
        
        // Convert screen delta to canvas percentage (account for zoom and viewport offset)
        const canvasPercentDeltaX = (deltaX / zoom / canvasSize.width) * 100;
        const canvasPercentDeltaY = (deltaY / zoom / canvasSize.height) * 100;
        
        let newX = touchDragState.initialLayerPos.x + canvasPercentDeltaX;
        let newY = touchDragState.initialLayerPos.y + canvasPercentDeltaY;
        
        // Apply grid snapping if enabled
        if (viewState.snapToGrid) {
          const baseGridSize = 20;
          const canvasX = (newX / 100) * canvasSize.width;
          const canvasY = (newY / 100) * canvasSize.height;
          const snappedX = Math.round(canvasX / baseGridSize) * baseGridSize;
          const snappedY = Math.round(canvasY / baseGridSize) * baseGridSize;
          newX = (snappedX / canvasSize.width) * 100;
          newY = (snappedY / canvasSize.height) * 100;
        }
        
        onLayerUpdate(selectedLayer.id, { x: newX, y: newY });
        return;
      }
      // Priority 2: Start manual drag for unselected layer
      else if (isLayerTouch && !selectedLayer && touchTarget) {
        // Touch started on unselected layer and now moving - select the layer and start manual drag
        const layerId = (touchTarget as HTMLElement).closest('.layer')?.getAttribute('data-layer-id');
        const targetLayer = slide.layers.find(l => l.id === layerId);
        if (layerId && targetLayer) {
          const touch = touches[0];
          
          // Set up manual drag state
          setTouchDragState({
            layerId,
            startPos: { x: touch.clientX, y: touch.clientY },
            initialLayerPos: { x: targetLayer.x, y: targetLayer.y }
          });
          
          onLayerSelect(layerId);
        }
        return;
      }
      // Priority 3: Regular Moveable handling for already selected layers
      else if (isLayerTouch && selectedLayer) {
        // Touch is on selected layer - let Moveable handle it, don't pan canvas
        return;
      } else if (isPanning && !isLayerTouch && !selectedLayer) {
        // Single finger panning - only allow if no layer is selected
        const touch = touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        
        // Only pan if we're actually moving (avoid tiny movements)
        const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (moveDistance > 2) {
          setViewOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          }));
        }
        
        setDragStart({ x: touch.clientX, y: touch.clientY });
      } else if (isPanning && !isLayerTouch && selectedLayer) {
        // Panning while layer is selected - force deselect and then pan
        onLayerSelect(null);
        const touch = touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        
        // Only pan if we're actually moving (avoid tiny movements)
        const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (moveDistance > 2) {
          setViewOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          }));
        }
        
        setDragStart({ x: touch.clientX, y: touch.clientY });
      }
    } else if (touches.length === 2) {
      // Two finger pinch zoom
      setIsLayerTouch(false); // Disable layer touch during zoom
      setIsPanning(false); // Disable panning during zoom
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.max(0.1, Math.min(5, zoom * scale));
        setZoom(newZoom);
      }
      
      setLastTouchDistance(distance);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 0) {
      // All fingers lifted - completely reset touch state
      setIsTouching(false);
      setIsPanning(false);
      setLastTouchDistance(0);
      setTouchStartPoints([]);
      setTouchTarget(null);
      setIsLayerTouch(false);
      setTouchDragState(null);
      
      // If Moveable was active but DragEnd didn't fire, force reset
      if (isMoveableActive) {
        
        // Immediately reset state (don't wait for timeout)
        setIsMoveableActive(false);
        setIsLayerTouch(false);
        
        // If we have a selected layer and were dragging, apply the final position
        if (selectedLayer && moveableRef.current) {
          const targetElement = layerRefs.current.get(selectedLayer.id);
          if (targetElement) {
            const finalTransform = parseTransform(targetElement.style.transform);
            let x = finalTransform.x;
            let y = finalTransform.y;
            
            // Apply grid snapping if enabled
            if (viewState.snapToGrid) {
              const baseGridSize = 20;
              x = Math.round(x / baseGridSize) * baseGridSize;
              y = Math.round(y / baseGridSize) * baseGridSize;
            }
            
            onLayerUpdate(selectedLayer.id, {
              x: (x / canvasSize.width) * 100,
              y: (y / canvasSize.height) * 100,
            });
          }
        }
        
        // Force Moveable to completely reset by remounting the component
        setMoveableKey(prev => prev + 1);
      }
    } else if (touches.length === 1 && touchStartPoints.length === 2) {
      // Went from two fingers to one - restart single touch
      const targetElement = e.target as HTMLElement;
      const isOnLayer = targetElement.closest('.layer') !== null;
      const isOnSelectedLayer = isOnLayer && selectedLayer && 
        targetElement.closest(`[data-layer-id="${selectedLayer.id}"]`) !== null;
      
      // Reset layer touch state
      setIsLayerTouch(false);
      setIsPanning(false);
      
      if (isOnSelectedLayer && !isMoveableActive) {
        setIsLayerTouch(true);
      } else if (!isMoveableActive) {
        setIsPanning(true);
        setDragStart({ x: touches[0].clientX, y: touches[0].clientY });
      }
      setLastTouchDistance(0);
    }
  };
  
  // =================================================================
  // Mouse Handlers
  // =================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning) {
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    // Handle middle mouse button (button 1) for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleMousePanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (viewportRef.current) {
        viewportRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning || isMiddleMousePanning) {
      setViewOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    setDragStart({ x: 0, y: 0 });
    
    // Reset middle mouse panning
    if (isMiddleMousePanning) {
      setIsMiddleMousePanning(false);
      if (viewportRef.current) {
        viewportRef.current.style.cursor = 'default';
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onLayerSelect(null);
    }
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    // Check if click is outside the canvas area
    if (e.target === e.currentTarget) {
      onLayerSelect(null);
    }
  };
  
  // Handle layer selection for both mouse and touch
  const handleLayerSelect = (layerId: string) => {
    onLayerSelect(layerId);
  };
  
  // Handle layer touch end with Moveable state management
  const handleLayerTouchEnd = (e: React.TouchEvent, layerId: string) => {
    e.stopPropagation();
    
    // If we were in layer touch mode (dragging), reset state and apply final position
    if ((isMoveableActive || isLayerTouch) && selectedLayer) {
      
      setIsMoveableActive(false);
      setIsLayerTouch(false);
      
      // Apply final position (same logic as handleDragEnd)
      const targetElement = layerRefs.current.get(selectedLayer.id);
      if (targetElement) {
        const finalTransform = parseTransform(targetElement.style.transform);
        let x = finalTransform.x;
        let y = finalTransform.y;
        
        // Apply grid snapping if enabled
        if (viewState.snapToGrid) {
          const baseGridSize = 20;
          x = Math.round(x / baseGridSize) * baseGridSize;
          y = Math.round(y / baseGridSize) * baseGridSize;
        }
        
        onLayerUpdate(selectedLayer.id, {
          x: (x / canvasSize.width) * 100,
          y: (y / canvasSize.height) * 100,
        });
      }
      
      // Force Moveable reset
      setMoveableKey(prev => prev + 1);
    } else if (!isPanning && touchStartPoints.length <= 1 && !isMoveableActive) {
      // Only select layer if it was a simple tap, not a drag
      handleLayerSelect(layerId);
    }
  };
  
  // Touch-specific canvas interaction
  const handleCanvasTouch = (e: React.TouchEvent) => {
    // Only deselect if touch ended on canvas (not on layer)
    const targetElement = e.target as HTMLElement;
    const isOnLayer = targetElement.closest('.layer') !== null;
    
    // If touch ended on canvas (not on layer), deselect any selected layer
    if (!isOnLayer && touchStartPoints.length === 1) {
      onLayerSelect(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent context menu when middle mouse button is being used for panning
    if (isMiddleMousePanning) {
      e.preventDefault();
    }
  };

  // =================================================================
  // Layer Rendering
  // =================================================================

  const renderTextLayer = (layer: TextLayer) => {
    const textStyle = TEXT_STYLES.find(s => s.id === layer.textStyleId)?.style || {};
    
    const calculatedWidth = (layer.width / 100) * canvasSize.width;
    const calculatedHeight = (layer.height / 100) * canvasSize.height;
    
    const style: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      top: 0,
      width: `${(layer.width / 100) * canvasSize.width}px`,
      height: `${(layer.height / 100) * canvasSize.height}px`,
      transform: `translate(${(layer.x / 100) * canvasSize.width}px, ${(layer.y / 100) * canvasSize.height}px) rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      zIndex: Math.max(layer.zIndex, 1),
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start', // Start content from top
      textAlign: layer.textAlign,
      padding: '8px',
      boxSizing: 'border-box',
      fontSize: `${layer.fontSize}px`,
      lineHeight: 1.2,
      wordBreak: 'break-word',
      cursor: 'pointer',
      overflow: 'hidden', // Hide overflow to keep content within bounds
      ...textStyle,
      // Override color if custom color is set
      ...(layer.textColor && { color: layer.textColor }),
    };

    return (
      <div
        key={layer.id}
        ref={el => el ? layerRefs.current.set(layer.id, el) : layerRefs.current.delete(layer.id)}
        style={style}
        className="layer text-layer"
        data-layer-id={layer.id}
        onClick={() => handleLayerSelect(layer.id)}
        onTouchEnd={(e) => handleLayerTouchEnd(e, layer.id)}
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
  };

  // Convert objectPosition to CSS value
  const getObjectPositionCSS = (position: string | undefined): string => {
    if (!position) return 'center center';
    
    const positionMap: { [key: string]: string } = {
      'top-left': 'left top',
      'top-center': 'center top',
      'top-right': 'right top',
      'center-left': 'left center',
      'center-center': 'center center',
      'center-right': 'right center',
      'bottom-left': 'left bottom',
      'bottom-center': 'center bottom',
      'bottom-right': 'right bottom',
    };
    
    return positionMap[position] || 'center center';
  };

  const renderImageLayer = (layer: ImageLayer) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      top: 0,
      width: `${(layer.width / 100) * canvasSize.width}px`,
      height: `${(layer.height / 100) * canvasSize.height}px`,
      transform: `translate(${(layer.x / 100) * canvasSize.width}px, ${(layer.y / 100) * canvasSize.height}px) rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      zIndex: Math.max(layer.zIndex, 1),
      cursor: 'pointer',
    };

    return (
      <div
        key={layer.id}
        ref={el => el ? layerRefs.current.set(layer.id, el) : layerRefs.current.delete(layer.id)}
        style={style}
        className="layer image-layer"
        data-layer-id={layer.id}
        onClick={() => handleLayerSelect(layer.id)}
        onTouchEnd={(e) => handleLayerTouchEnd(e, layer.id)}
      >
        {layer.src ? (
          <img
            src={layer.src}
            alt={layer.prompt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: layer.objectFit === 'circle' || layer.objectFit === 'circle-fit' ? 
                (layer.objectFit === 'circle-fit' ? 'contain' : 'cover') : layer.objectFit,
              objectPosition: getObjectPositionCSS(layer.objectPosition),
              borderRadius: layer.objectFit === 'circle' || layer.objectFit === 'circle-fit' ? '50%' : '4px',
              display: 'block',
            }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-slate-300/50 dark:bg-slate-700/50 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 p-4 text-center rounded border-2 border-dashed border-slate-400 dark:border-slate-500">
            <ImageIcon size={32} className="mb-2" />
            <p className="text-sm leading-tight">Click to add image or generate with AI</p>
          </div>
        )}
      </div>
    );
  };

  const renderShapeLayer = (layer: ShapeLayer) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      top: 0,
      width: `${(layer.width / 100) * canvasSize.width}px`,
      height: `${(layer.height / 100) * canvasSize.height}px`,
      transform: `translate(${(layer.x / 100) * canvasSize.width}px, ${(layer.y / 100) * canvasSize.height}px) rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      zIndex: Math.max(layer.zIndex, 1),
      cursor: 'pointer',
    };

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
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: layer.fillColor,
              border: `${layer.strokeWidth}px solid ${layer.strokeColor}`,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }}
          />
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
      <div
        key={layer.id}
        ref={el => el ? layerRefs.current.set(layer.id, el) : layerRefs.current.delete(layer.id)}
        style={style}
        className="layer shape-layer"
        data-layer-id={layer.id}
        onClick={() => handleLayerSelect(layer.id)}
        onTouchEnd={(e) => handleLayerTouchEnd(e, layer.id)}
      >
        {shapeContent}
      </div>
    );
  };

  const renderLayer = (layer: Layer) => {
    switch (layer.type) {
      case 'text':
        return renderTextLayer(layer as TextLayer);
      case 'image':
        return renderImageLayer(layer as ImageLayer);
      case 'shape':
        return renderShapeLayer(layer as ShapeLayer);
      default:
        return null;
    }
  };

  // =================================================================
  // Moveable Handlers
  // =================================================================

  const parseTransform = (transform: string) => {
    const translateMatch = /translate\(([^p]+)px, ([^p]+)px\)/.exec(transform);
    const rotateMatch = /rotate\(([^d]+)deg\)/.exec(transform);
    
    return {
      x: translateMatch ? parseFloat(translateMatch[1]) : 0,
      y: translateMatch ? parseFloat(translateMatch[2]) : 0,
      rotation: rotateMatch ? parseFloat(rotateMatch[1]) : 0,
    };
  };

  const handleDragStart = (e: any) => {
    setIsMoveableActive(true);
    setIsLayerTouch(true);
    setIsPanning(false);
  };

  const handleDragEnd = (e: any) => {
    if (!selectedLayer) return;
    
    const finalTransform = parseTransform(e.target.style.transform);
    let x = finalTransform.x;
    let y = finalTransform.y;
    
    // Apply grid snapping if enabled
    if (viewState.snapToGrid) {
      const baseGridSize = 20; // Match the grid display base size
      // Use the base grid size directly (not affected by zoom since canvas coordinates are already in screen pixels)
      x = Math.round(x / baseGridSize) * baseGridSize;
      y = Math.round(y / baseGridSize) * baseGridSize;
    }
    
    onLayerUpdate(selectedLayer.id, {
      x: (x / canvasSize.width) * 100,
      y: (y / canvasSize.height) * 100,
    });
    
    // Reset touch state after layer drag ends - use setTimeout to ensure state is reset after current event
    setTimeout(() => {
      setIsMoveableActive(false);
      setIsLayerTouch(false);
      setIsPanning(false);
      // Force reset all touch states to prevent interference
      setIsTouching(false);
      setTouchStartPoints([]);
      setTouchTarget(null);
      setLastTouchDistance(0);
    }, 100);
  };

  const handleResizeStart = (e: any) => {
    setIsMoveableActive(true);
    setIsLayerTouch(true);
    setIsPanning(false);
  };

  const handleResizeEnd = (e: any) => {
    if (!e.lastEvent || !selectedLayer) return;
    
    const finalTransform = parseTransform(e.target.style.transform);
    let x = finalTransform.x;
    let y = finalTransform.y;
    let width = e.lastEvent.width;
    let height = e.lastEvent.height;
    
    // Apply grid snapping if enabled
    if (viewState.snapToGrid) {
      const baseGridSize = 20; // Match the grid display base size
      const direction = e.lastEvent.direction;
      
      // Only snap the manipulated edges based on resize direction
      if (direction[0] === -1) {
        // Left edge was moved: snap position X and width
        const snappedX = Math.round(x / baseGridSize) * baseGridSize;
        width = width + (x - snappedX); // Adjust width to maintain right edge
        x = snappedX;
      } else if (direction[0] === 1) {
        // Right edge was moved: snap width only
        width = Math.round(width / baseGridSize) * baseGridSize;
      }
      
      if (direction[1] === -1) {
        // Top edge was moved: snap position Y and height
        const snappedY = Math.round(y / baseGridSize) * baseGridSize;
        height = height + (y - snappedY); // Adjust height to maintain bottom edge
        y = snappedY;
      } else if (direction[1] === 1) {
        // Bottom edge was moved: snap height only
        height = Math.round(height / baseGridSize) * baseGridSize;
      }
    }
    
    onLayerUpdate(selectedLayer.id, {
      width: (width / canvasSize.width) * 100,
      height: (height / canvasSize.height) * 100,
      x: (x / canvasSize.width) * 100,
      y: (y / canvasSize.height) * 100,
    });
    
    // Reset touch state after layer resize ends - use setTimeout to ensure state is reset after current event
    setTimeout(() => {
      setIsMoveableActive(false);
      setIsLayerTouch(false);
      setIsPanning(false);
      // Force reset all touch states to prevent interference
      setIsTouching(false);
      setTouchStartPoints([]);
      setTouchTarget(null);
      setLastTouchDistance(0);
    }, 100);
  };

  const handleRotateStart = (e: any) => {
    setIsMoveableActive(true);
    setIsLayerTouch(true);
    setIsPanning(false);
  };

  const handleRotateEnd = (e: any) => {
    if (!e.lastEvent || !selectedLayer) return;
    
    const finalTransform = parseTransform(e.target.style.transform);
    onLayerUpdate(selectedLayer.id, {
      rotation: finalTransform.rotation,
    });
    
    // Reset touch state after layer rotation ends - use setTimeout to ensure state is reset after current event
    setTimeout(() => {
      setIsMoveableActive(false);
      setIsLayerTouch(false);
      setIsPanning(false);
      // Force reset all touch states to prevent interference
      setIsTouching(false);
      setTouchStartPoints([]);
      setTouchTarget(null);
      setLastTouchDistance(0);
    }, 100);
  };

  // =================================================================
  // Quick Add Buttons
  // =================================================================

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 20,
      y: 20,
      width: 60,
      height: 15,
      rotation: 0,
      opacity: 1,
      zIndex: slide.layers.length + 1,
      content: 'New Text',
      fontSize: 48,
      textStyleId: 'modern-bold-white',
      textAlign: 'center',
    };
    
    onLayerAdd(newLayer);
    onLayerSelect(newLayer.id);
  };

  const addImageLayer = () => {
    const newLayer: ImageLayer = {
      id: `image-${Date.now()}`,
      type: 'image',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 1,
      zIndex: slide.layers.length + 1,
      src: '',
      prompt: 'A beautiful, high-quality image',
      seed: Math.floor(Math.random() * 2147483647), // Generate random seed
      objectFit: 'contain',
      objectPosition: 'center-center',
    };
    
    onLayerAdd(newLayer);
    onLayerSelect(newLayer.id);
  };

  const addShapeLayer = (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line') => {
    const newLayer: ShapeLayer = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      x: 30,
      y: 30,
      width: 40,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: slide.layers.length + 1,
      shapeType,
      fillColor: '#6366f1',
      strokeColor: '#4f46e5',
      strokeWidth: 2,
    };
    
    onLayerAdd(newLayer);
    onLayerSelect(newLayer.id);
  };

  // =================================================================
  // Render
  // =================================================================

  const selectedLayerRef = selectedLayer ? layerRefs.current.get(selectedLayer.id) : null;

  return (
    <div className="relative w-full h-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        className="w-full h-full overflow-hidden"
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onClick={handleViewportClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Canvas Content */}
        <div
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            margin: 'auto',
            position: 'relative',
            top: '50%',
            left: '50%',
            marginTop: -canvasSize.height / 2,
            marginLeft: -canvasSize.width / 2,
          }}
        >
          <div
            ref={canvasRef}
            id="slide-canvas-content"
            className="relative shadow-2xl shadow-black/50"
            style={{
              width: '100%',
              height: '100%',
              background: slide.background,
              overflow: 'hidden',
            }}
            onClick={handleCanvasClick}
            onTouchEnd={handleCanvasTouch}
          >
            {/* Grid overlay - behind all layers */}
            {viewState.showGrid && getGridStyle(slide.background, zoom) && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: getGridStyle(slide.background, zoom),
                  backgroundSize: getGridBackgroundSize(zoom),
                  zIndex: 0,
                }}
              />
            )}

            {/* Layers */}
            {slide.layers
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(renderLayer)}

            {/* Empty state */}
            {slide.layers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Empty Slide</h3>
                  <p className="text-lg mb-8">Start by adding some content to your slide</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={addTextLayer}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                    >
                      <span>Add Text</span>
                    </button>
                    <button
                      onClick={addImageLayer}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                    >
                      <ImageIcon size={16} />
                      <span>Add Image</span>
                    </button>
                    <button
                      onClick={() => addShapeLayer('rectangle')}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors"
                    >
                      <Square size={16} />
                      <span>Add Shape</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Moveable for selected layer */}
            {selectedLayerRef && (
              <Moveable
                key={moveableKey}
                ref={moveableRef}
                target={selectedLayerRef}
                zoom={zoom}
                draggable={true}
                resizable={true}
                rotatable={true}
                snappable={true}
                bounds={{ left: 0, top: 0, right: canvasSize.width, bottom: canvasSize.height }}
                renderDirections={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
                
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
                onRotateStart={handleRotateStart}
                onRotateEnd={handleRotateEnd}
                
                // Add touch action to prevent conflicts
                touchAction="none"
                
                // Live updates for smooth interaction
                onDrag={e => { 
                  e.target.style.transform = e.transform; 
                }}
                onResize={e => { 
                  e.target.style.width = `${e.width}px`;
                  e.target.style.height = `${e.height}px`;
                  e.target.style.transform = e.drag.transform;
                }}
                onRotate={e => { 
                  e.target.style.transform = e.drag.transform; 
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="px-3 py-1 bg-slate-600 dark:bg-slate-700 text-white dark:text-white rounded hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          +
        </button>
        <span className="px-3 py-1 bg-slate-600 dark:bg-slate-700 text-white dark:text-white rounded">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom * 0.8)}
          className="px-3 py-1 bg-slate-600 dark:bg-slate-700 text-white dark:text-white rounded hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          -
        </button>
        <button
          onClick={() => {
            if (viewportRef.current) {
              const viewport = viewportRef.current;
              const viewportRect = viewport.getBoundingClientRect();
              
              // Calculate the scale to fit the canvas within the viewport with some padding
              const padding = 40; // 20px padding on each side
              const scaleX = (viewportRect.width - padding) / canvasSize.width;
              const scaleY = (viewportRect.height - padding) / canvasSize.height;
              const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale above 100%
              
              // Reset to center (the canvas is already centered by CSS)
              setZoom(fitScale);
              setViewOffset({ x: 0, y: 0 });
            }
          }}
          className="px-3 py-1 bg-slate-600 dark:bg-slate-700 text-white dark:text-white rounded hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          title="スライド全体を表示"
        >
          Fit
        </button>
        <button
          onClick={() => {
            // Reset to center at 100% zoom (the canvas is already centered by CSS)
            setZoom(1);
            setViewOffset({ x: 0, y: 0 });
          }}
          className="px-3 py-1 bg-slate-600 dark:bg-slate-700 text-white dark:text-white rounded hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          title="100%表示"
        >
          100%
        </button>
      </div>

      {/* Quick Add Toolbar - Top Left */}
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={addTextLayer}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors w-10 h-10 flex items-center justify-center"
          title="Add Text"
        >
          T
        </button>
        <button
          onClick={addImageLayer}
          className="p-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors w-10 h-10 flex items-center justify-center"
          title="Add Image"
        >
          <ImageIcon size={16} />
        </button>
        {/* Shape button with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowShapeDropdown(!showShapeDropdown)}
            className="p-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors relative w-10 h-10 flex items-center justify-center"
            title="Add Shape"
          >
            <Square size={16} />
            <span className="absolute bottom-0 right-0 text-xs leading-none">▼</span>
          </button>
          
          {/* Shape dropdown menu */}
          {showShapeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-max">
              <button
                onClick={() => {
                  addShapeLayer('rectangle');
                  setShowShapeDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-300"
              >
                <Square size={16} />
                <span>Rectangle</span>
              </button>
              <button
                onClick={() => {
                  addShapeLayer('circle');
                  setShowShapeDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-300"
              >
                <Circle size={16} />
                <span>Circle</span>
              </button>
              <button
                onClick={() => {
                  addShapeLayer('triangle');
                  setShowShapeDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-300"
              >
                <Triangle size={16} />
                <span>Triangle</span>
              </button>
              <button
                onClick={() => {
                  addShapeLayer('line');
                  setShowShapeDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2 text-slate-700 dark:text-slate-300"
              >
                <Minus size={16} />
                <span>Line</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Controls - Top Right */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Grid Toggle */}
        <button
          onClick={() => onViewStateUpdate({ showGrid: !viewState.showGrid })}
          className={`p-3 backdrop-blur-sm text-white rounded-lg transition-colors shadow-lg border ${
            viewState.showGrid 
              ? 'bg-blue-600/90 border-blue-500 hover:bg-blue-500/90' 
              : 'bg-slate-600/90 dark:bg-slate-700/90 border-slate-500 dark:border-slate-600 hover:bg-slate-700/90 dark:hover:bg-slate-600/90'
          }`}
          title={`${viewState.showGrid ? 'Hide' : 'Show'} Grid (グリッド${viewState.showGrid ? '非表示' : '表示'})`}
        >
          <Grid3X3 size={18} />
        </button>
        
        {/* Snap to Grid Toggle */}
        <button
          onClick={() => onViewStateUpdate({ snapToGrid: !viewState.snapToGrid })}
          className={`p-3 backdrop-blur-sm text-white rounded-lg transition-colors shadow-lg border ${
            viewState.snapToGrid 
              ? 'bg-green-600/90 border-green-500 hover:bg-green-500/90' 
              : 'bg-slate-600/90 dark:bg-slate-700/90 border-slate-500 dark:border-slate-600 hover:bg-slate-700/90 dark:hover:bg-slate-600/90'
          }`}
          title={`${viewState.snapToGrid ? 'Disable' : 'Enable'} Snap to Grid (グリッドスナップ${viewState.snapToGrid ? '無効' : '有効'})`}
        >
          <Magnet size={18} />
        </button>
        
        {/* Layer Stack Toggle (only show when layers exist) */}
        {slide.layers.length > 0 && (
          <button
            onClick={() => onLayerSelect(null)}
            className="p-3 bg-slate-600/90 dark:bg-slate-700/90 backdrop-blur-sm text-white dark:text-white rounded-lg hover:bg-slate-700/90 dark:hover:bg-slate-600/90 transition-colors shadow-lg border border-slate-500 dark:border-slate-600"
            title="Show Layer Stack (レイヤースタック表示)"
          >
            <Layers size={18} />
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-sm text-slate-400">
        <div>Space + drag, middle mouse, or finger drag to pan</div>
        <div>Mouse wheel or pinch to zoom</div>
        <div>Delete key to remove layer</div>
        <div className="text-xs text-slate-500 mt-1">Touch: 1 finger = pan (canvas) / move (layer), 2 fingers = zoom</div>
      </div>
    </div>
  );
};

export default SlideCanvas;