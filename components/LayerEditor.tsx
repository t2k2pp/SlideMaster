import React, { useState } from 'react';
import { LayerEditorProps, TextLayer, ImageLayer, ShapeLayer } from '../types';
import { TEXT_STYLES, THEME_CONFIGS } from '../constants';
import { generateImage } from '../services/geminiService';
import { MarkdownRenderer } from '../utils/markdownRenderer';
import { 
  Type, 
  Image, 
  Square, 
  Circle, 
  Triangle, 
  Minus,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  RotateCw,
  Move,
  Palette,
  Sparkles,
  ArrowUp,
  ArrowDown,
  MoveUp,
  MoveDown,
  GripVertical,
  Scissors,
  Clipboard,
  Undo,
  Redo,
} from 'lucide-react';

// =================================================================
// LayerEditor Component
// =================================================================

const LayerEditor: React.FC<LayerEditorProps> = ({
  layer,
  slide,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelectLayer,
  onUpdateSlide,
  onCopy,
  onCut,
  onPaste,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  hasClipboard = false,
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Layer management functions
  const toggleLayerVisibility = (layerId: string) => {
    if (!slide) return;
    const newLayers = slide.layers.map(l => 
      l.id === layerId ? { ...l, opacity: l.opacity > 0 ? 0 : 1 } : l
    );
    onUpdateSlide?.({ layers: newLayers });
  };

  const duplicateLayer = (layerId: string) => {
    if (!slide) return;
    const layerToDuplicate = slide.layers.find(l => l.id === layerId);
    if (!layerToDuplicate) return;
    
    const newLayer = {
      ...layerToDuplicate,
      id: `layer-${Date.now()}`,
      x: Math.min(95, layerToDuplicate.x + 5),
      y: Math.min(95, layerToDuplicate.y + 5),
      zIndex: Math.max(...slide.layers.map(l => l.zIndex)) + 1,
    };
    
    const newLayers = [...slide.layers, newLayer];
    onUpdateSlide?.({ layers: newLayers });
    onSelectLayer?.(newLayer.id);
  };

  const deleteLayer = (layerId: string) => {
    if (!slide) return;
    const newLayers = slide.layers.filter(l => l.id !== layerId);
    onUpdateSlide?.({ layers: newLayers });
    // Clear selection if deleted layer was selected
    if (layer?.id === layerId) {
      onSelectLayer?.(null);
    }
  };

  const moveLayerUp = (layerId: string) => {
    if (!slide) return;
    const layerIndex = slide.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1 || layerIndex === slide.layers.length - 1) return;
    
    const newLayers = [...slide.layers];
    [newLayers[layerIndex], newLayers[layerIndex + 1]] = [newLayers[layerIndex + 1], newLayers[layerIndex]];
    
    // Update zIndex to match new order
    newLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });
    
    onUpdateSlide?.({ layers: newLayers });
  };

  const moveLayerDown = (layerId: string) => {
    if (!slide) return;
    const layerIndex = slide.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1 || layerIndex === 0) return;
    
    const newLayers = [...slide.layers];
    [newLayers[layerIndex], newLayers[layerIndex - 1]] = [newLayers[layerIndex - 1], newLayers[layerIndex]];
    
    // Update zIndex to match new order
    newLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });
    
    onUpdateSlide?.({ layers: newLayers });
  };

  const moveLayerToTop = (layerId: string) => {
    if (!slide) return;
    const layerIndex = slide.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;
    
    const newLayers = [...slide.layers];
    const layerToMove = newLayers.splice(layerIndex, 1)[0];
    newLayers.push(layerToMove);
    
    // Update zIndex to match new order
    newLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });
    
    onUpdateSlide?.({ layers: newLayers });
  };

  const moveLayerToBottom = (layerId: string) => {
    if (!slide) return;
    const layerIndex = slide.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;
    
    const newLayers = [...slide.layers];
    const layerToMove = newLayers.splice(layerIndex, 1)[0];
    newLayers.unshift(layerToMove);
    
    // Update zIndex to match new order
    newLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });
    
    onUpdateSlide?.({ layers: newLayers });
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayer(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!slide || !draggedLayer) return;

    const draggedIndex = slide.layers.findIndex(l => l.id === draggedLayer);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const newLayers = [...slide.layers];
    const [movedLayer] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(targetIndex, 0, movedLayer);

    // Update zIndex to match new order
    newLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });

    onUpdateSlide?.({ layers: newLayers });
    setDraggedLayer(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedLayer(null);
    setDragOverIndex(null);
  };

  if (!layer && slide) {
    return (
      <div className="w-80 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Layers</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage slide layers</p>
        </div>

        {/* Layer Stack */}
        <div className="flex-1 overflow-y-auto">
          {slide.layers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <Square size={32} className="mx-auto opacity-50 mb-2" />
              <p className="text-sm">No layers in this slide</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {slide.layers
                .sort((a, b) => b.zIndex - a.zIndex) // Show top layers first
                .map((slideLayer, index) => {
                  const LayerIcon = slideLayer.type === 'text' ? Type : 
                                  slideLayer.type === 'image' ? Image : Square;
                  const isDragging = draggedLayer === slideLayer.id;
                  const isDragOver = dragOverIndex === index;
                  const isSelected = layer?.id === slideLayer.id;
                  
                  return (
                    <div
                      key={slideLayer.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, slideLayer.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded cursor-move transition-all group ${
                        isDragging 
                          ? 'bg-slate-600 opacity-50 transform scale-105' 
                          : isDragOver
                            ? 'bg-cyan-600/20 border-2 border-cyan-500'
                            : isSelected
                              ? 'bg-blue-600/30 border-2 border-blue-500'
                              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                      onClick={() => {
                        onSelectLayer?.(slideLayer.id);
                      }}
                    >
                      <GripVertical size={14} className="text-slate-500 dark:text-slate-400 cursor-move" />
                      <LayerIcon size={16} className="text-slate-500 dark:text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {slideLayer.type === 'text' ? 
            (slideLayer as TextLayer).content.substring(0, 20) + 
                            ((slideLayer as TextLayer).content.length > 20 ? '...' : '') :
                            slideLayer.type === 'image' ? 
(slideLayer as ImageLayer).prompt.substring(0, 20) + 
                              ((slideLayer as ImageLayer).prompt.length > 20 ? '...' : '') :
                            `${slideLayer.type} layer`
                          }
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {Math.round(slideLayer.x)}%, {Math.round(slideLayer.y)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerUp(slideLayer.id);
                          }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                          title="Move layer forward"
                          disabled={slideLayer.zIndex === Math.max(...slide.layers.map(l => l.zIndex))}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerDown(slideLayer.id);
                          }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                          title="Move layer backward"
                          disabled={slideLayer.zIndex === Math.min(...slide.layers.map(l => l.zIndex))}
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(slideLayer.id);
                          }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                          title={slideLayer.opacity > 0 ? "Hide layer" : "Show layer"}
                        >
                          {slideLayer.opacity > 0 ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateLayer(slideLayer.id);
                          }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                          title="Duplicate layer"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(slideLayer.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete layer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Slide Settings */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-900 dark:text-white mb-4">Slide Settings</div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Slide Title</label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdateSlide?.({ title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Background</label>
              <div className="space-y-2">
                <input
                  type="color"
                  value={slide.background.startsWith('#') ? slide.background : '#1e293b'}
                  onChange={(e) => onUpdateSlide?.({ background: e.target.value })}
                  className="w-full h-8 rounded border border-slate-600 cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => onUpdateSlide?.({ background: '#1e293b' })}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                    style={{ backgroundColor: '#1e293b' }}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => onUpdateSlide?.({ background: '#ffffff' })}
                    className="px-2 py-1 bg-white text-slate-900 rounded hover:bg-gray-100 border border-slate-600"
                  >
                    Light
                  </button>
                  <button
                    onClick={() => onUpdateSlide?.({ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' })}
                    className="px-2 py-1 rounded hover:opacity-80"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: 'white' }}
                  >
                    Gradient
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Aspect Ratio</label>
              <select
                value={slide.aspectRatio}
                onChange={(e) => onUpdateSlide?.({ aspectRatio: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="4:3">4:3 (Standard)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="3:4">3:4 (Portrait)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">
                📝 Speaker Notes
                <span className="text-slate-500 ml-1">(発表者用メモ)</span>
              </label>
              <textarea
                value={slide.notes || ''}
                onChange={(e) => onUpdateSlide?.({ notes: e.target.value })}
                placeholder="プレゼンテーション時の発表者用メモを入力..."
                className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm rounded border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                rows={4}
              />
              <div className="text-xs text-slate-500 mt-1">
                💡 このメモは発表者のみに表示され、HTMLエクスポートで「N」キーで表示できます
              </div>
            </div>
          </div>
        </div>

        {/* Layer Order Controls */}
        {slide.layers.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Layer Management</div>
            <div className="text-xs text-slate-500">
              Click layers above to select and edit
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!layer) {
    return (
      <div className="w-80 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4">
        {/* Global Controls */}
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded">
              <Square size={16} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Layer Editor</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">No layer selected</p>
            </div>
          </div>
          
          {/* Global Clipboard and Undo/Redo Controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={onPaste}
                disabled={!hasClipboard}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Paste (Ctrl+V)"
              >
                <Clipboard size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          <div className="mb-4">
            <Square size={48} className="mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Layer Selected</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Click on a layer in the canvas to edit its properties</p>
        </div>
      </div>
    );
  }

  // =================================================================
  // Common Layer Controls
  // =================================================================

  const renderCommonControls = () => (
    <div className="space-y-4">
      {/* Layer Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {layer.type === 'text' && <Type size={16} className="text-blue-400" />}
          {layer.type === 'image' && <Image size={16} className="text-green-400" />}
          {layer.type === 'shape' && <Square size={16} className="text-purple-400" />}
          <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{layer.type} Layer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveLayerToTop(layer.id)}
            className="p-1 hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors"
            title="Move to front"
          >
            <MoveUp size={14} />
          </button>
          <button
            onClick={() => moveLayerToBottom(layer.id)}
            className="p-1 hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors"
            title="Move to back"
          >
            <MoveDown size={14} />
          </button>
          <button
            onClick={() => toggleLayerVisibility(layer.id)}
            className="p-1 hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors"
            title={layer.opacity === 1 ? 'Hide layer' : 'Show layer'}
          >
            {layer.opacity === 1 ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => duplicateLayer(layer.id)}
            className="p-1 hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors"
            title="Duplicate layer"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => deleteLayer(layer.id)}
            className="p-1 hover:bg-red-600 rounded transition-colors text-red-400"
            title="Delete layer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Position and Size */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">X Position (%)</label>
          <input
            type="number"
            value={Math.round(layer.x || 0)}
            onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Y Position (%)</label>
          <input
            type="number"
            value={Math.round(layer.y || 0)}
            onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Width (%)</label>
          <input
            type="number"
            value={Math.round(layer.width || 0)}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Height (%)</label>
          <input
            type="number"
            value={Math.round(layer.height || 0)}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="100"
          />
        </div>
      </div>

      {/* Rotation and Opacity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Rotation (°)</label>
          <input
            type="number"
            value={Math.round(layer.rotation || 0)}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="-180"
            max="180"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Opacity</label>
          <input
            type="range"
            value={layer.opacity || 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) || 1 })}
            className="w-full"
            min="0"
            max="1"
            step="0.1"
          />
        </div>
      </div>

      {/* Z-Index */}
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Layer Order (値が大きいほど前面)</label>
        <input
          type="number"
          value={layer.zIndex || 1}
          onChange={(e) => {
            const newZIndex = parseInt(e.target.value);
            if (!isNaN(newZIndex) && slide) {
              // Update the layer's zIndex
              const updatedLayer = { ...layer, zIndex: newZIndex };
              
              // Get all other layers and update their order if needed
              const otherLayers = slide.layers.filter(l => l.id !== layer.id);
              const allLayers = [...otherLayers, updatedLayer];
              
              // Sort by zIndex and reassign sequential indices if needed
              allLayers.sort((a, b) => a.zIndex - b.zIndex);
              allLayers.forEach((l, index) => {
                if (l.zIndex !== index) {
                  l.zIndex = index;
                }
              });
              
              onUpdateSlide?.({ layers: allLayers });
            }
          }}
          className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="0"
          max={slide ? slide.layers.length - 1 : 99}
        />
        <div className="text-xs text-slate-500 mt-1">
          0 = 最背面, {slide ? slide.layers.length - 1 : 0} = 最前面
        </div>
      </div>
    </div>
  );

  // =================================================================
  // Text Layer Controls
  // =================================================================

  const renderTextControls = () => {
    const textLayer = layer as TextLayer;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Text Content</label>
          <textarea
            value={textLayer.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={(e) => {
              // テキスト入力中のキーイベントは通常通り動作させる
              e.stopPropagation();
            }}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={4}
            placeholder="Enter your text..."
          />
          <div className="mt-1 text-xs text-slate-500">
            <div>Markdown support: **bold** text, - bullet points</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Font Size</label>
            <input
              type="number"
              value={textLayer.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="8"
              max="200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Alignment</label>
            <select
              value={textLayer.textAlign}
              onChange={(e) => onUpdate({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
              className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Text Style</label>
          <select
            value={textLayer.textStyleId}
            onChange={(e) => onUpdate({ textStyleId: e.target.value })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TEXT_STYLES.map(style => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>

        {/* Text Color Override */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Text Color (overrides style color)</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={textLayer.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ textColor: e.target.value })}
              className="w-16 h-8 rounded border border-slate-600 cursor-pointer"
            />
            <button
              onClick={() => onUpdate({ textColor: undefined })}
              className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 text-xs"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Style Preview */}
        <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded border">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Preview with Markdown:</div>
          <MarkdownRenderer 
            content={textLayer.content || '**Sample** text with\n- Bullet point\n- Another **bold** item'}
            textAlign={textLayer.textAlign}
            style={{
              ...TEXT_STYLES.find(s => s.id === textLayer.textStyleId)?.style,
              fontSize: `${Math.min(textLayer.fontSize, 24)}px`,
              ...(textLayer.textColor && { color: textLayer.textColor }),
            }}
          />
        </div>
      </div>
    );
  };

  // =================================================================
  // Image Layer Controls
  // =================================================================

  const renderImageControls = () => {
    const imageLayer = layer as ImageLayer;
    
    const handleGenerateImage = async () => {
      if (!imageLayer.prompt || !imageLayer.prompt.trim()) {
        alert('Please enter an image prompt first.');
        return;
      }
      
      setIsGeneratingImage(true);
      try {
        // Use existing seed or generate new one if empty
        const usedSeed = imageLayer.seed || Math.floor(Math.random() * 2147483647);
        
        const generatedImageSrc = await generateImage(
          imageLayer.prompt,
          undefined,
          'business_presentation',
          0,
          [],
          undefined,
          undefined,
          usedSeed
        );
        
        // Update both src and seed (in case seed was generated)
        onUpdate({ src: generatedImageSrc, seed: usedSeed });
      } catch (error) {
        console.error('Error generating image:', error);
        alert('Failed to generate image. Please try again.');
      } finally {
        setIsGeneratingImage(false);
      }
    };

    const handleGenerateNewSeed = () => {
      const newSeed = Math.floor(Math.random() * 2147483647); // Max 32-bit signed integer
      onUpdate({ seed: newSeed });
    };

    const handleRegenerateWithSeed = async () => {
      if (!imageLayer.prompt || !imageLayer.prompt.trim()) {
        alert('Please enter an image prompt first.');
        return;
      }
      
      if (!imageLayer.seed) {
        alert('Seed値が設定されていません。');
        return;
      }
      
      setIsGeneratingImage(true);
      try {
        const generatedImageSrc = await generateImage(
          imageLayer.prompt,
          undefined,
          'business_presentation',
          0,
          [],
          undefined,
          undefined,
          imageLayer.seed
        );
        onUpdate({ src: generatedImageSrc });
      } catch (error) {
        console.error('Error regenerating image:', error);
        alert('Failed to regenerate image. Please try again.');
      } finally {
        setIsGeneratingImage(false);
      }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageSrc = event.target?.result as string;
          if (imageSrc) {
            onUpdate({ src: imageSrc });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Image Prompt</label>
          <textarea
            value={imageLayer.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            onKeyDown={(e) => {
              // テキスト入力中のキーイベントは通常通り動作させる
              e.stopPropagation();
            }}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Describe the image you want to generate..."
          />
        </div>

        {/* Seed Configuration */}
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Seed値 (再現性のため)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={imageLayer.seed || ''}
              onChange={(e) => {
                const value = e.target.value;
                onUpdate({ seed: value ? parseInt(value) : undefined });
              }}
              placeholder="自動生成"
              className="flex-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="2147483647"
            />
            <button
              onClick={handleGenerateNewSeed}
              className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 text-xs"
              title="新しいSeed値を生成"
            >
              Random
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            同じSeed値で同じ画像を再生成できます
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !imageLayer.prompt}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingImage ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Sparkles size={16} />
            )}
            {isGeneratingImage ? 'Generating...' : 'Generate'}
          </button>
          
          <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Image size={16} />
            Upload
          </label>
        </div>

        {/* Additional Seed Controls */}
        {imageLayer.seed && (
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={handleRegenerateWithSeed}
              disabled={isGeneratingImage || !imageLayer.prompt}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingImage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <RotateCw size={16} />
              )}
              {isGeneratingImage ? 'Regenerating...' : `Regenerate (Seed: ${imageLayer.seed})`}
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Object Fit</label>
          <select
            value={imageLayer.objectFit}
            onChange={(e) => onUpdate({ objectFit: e.target.value as 'contain' | 'cover' | 'fill' })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="contain">Contain (枠内に収まる)</option>
            <option value="cover">Cover (枠を埋める・切り取り)</option>
            <option value="fill">Fill (引き伸ばし)</option>
          </select>
          <div className="mt-2 text-xs text-slate-500">
            <div>• Contain: 画像全体が見える（余白あり）</div>
            <div>• Cover: 枠を完全に埋める（はみ出し切り取り）</div>
            <div>• Fill: 枠にぴったり合わせる（変形あり）</div>
          </div>
        </div>

        {/* Object Position (only for cover mode) */}
        {imageLayer.objectFit === 'cover' && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">クロッピング位置</label>
            <select
              value={imageLayer.objectPosition || 'center-center'}
              onChange={(e) => onUpdate({ objectPosition: e.target.value as any })}
              className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="top-left">左上</option>
              <option value="top-center">上中央</option>
              <option value="top-right">右上</option>
              <option value="center-left">左中央</option>
              <option value="center-center">中央</option>
              <option value="center-right">右中央</option>
              <option value="bottom-left">左下</option>
              <option value="bottom-center">下中央</option>
              <option value="bottom-right">右下</option>
            </select>
            <div className="mt-2 text-xs text-slate-500">
              画像がフレームからはみ出る場合に、どの部分を表示するかを選択
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imageLayer.src && (
          <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded border">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Preview:</div>
            <img
              src={imageLayer.src}
              alt="Preview"
              className="w-full h-32 object-cover rounded"
            />
          </div>
        )}
      </div>
    );
  };

  // =================================================================
  // Shape Layer Controls
  // =================================================================

  const renderShapeControls = () => {
    const shapeLayer = layer as ShapeLayer;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Shape Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'rectangle', icon: Square, label: 'Rectangle' },
              { type: 'circle', icon: Circle, label: 'Circle' },
              { type: 'triangle', icon: Triangle, label: 'Triangle' },
              { type: 'line', icon: Minus, label: 'Line' },
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => onUpdate({ shapeType: type as any })}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  shapeLayer.shapeType === type
                    ? 'bg-purple-600 text-slate-900 dark:text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <Icon size={16} />
                <span className="text-xs text-slate-900 dark:text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Fill Color</label>
          <div className="relative">
            <input
              type="color"
              value={shapeLayer.fillColor}
              onChange={(e) => onUpdate({ fillColor: e.target.value })}
              className="w-full h-10 rounded border border-slate-600 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Stroke Color</label>
          <div className="relative">
            <input
              type="color"
              value={shapeLayer.strokeColor}
              onChange={(e) => onUpdate({ strokeColor: e.target.value })}
              className="w-full h-10 rounded border border-slate-600 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Stroke Width</label>
          <input
            type="number"
            value={shapeLayer.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })}
            className="w-full px-2 py-1 bg-slate-200 dark:bg-slate-700 border border-slate-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            max="20"
          />
        </div>

        {/* Shape Preview */}
        <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded border">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Preview:</div>
          <div className="w-full h-16 flex items-center justify-center">
            {shapeLayer.shapeType === 'rectangle' && (
              <div
                style={{
                  width: 40,
                  height: 24,
                  backgroundColor: shapeLayer.fillColor,
                  border: `${shapeLayer.strokeWidth}px solid ${shapeLayer.strokeColor}`,
                }}
              />
            )}
            {shapeLayer.shapeType === 'circle' && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: shapeLayer.fillColor,
                  border: `${shapeLayer.strokeWidth}px solid ${shapeLayer.strokeColor}`,
                  borderRadius: '50%',
                }}
              />
            )}
            {shapeLayer.shapeType === 'triangle' && (
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid transparent',
                  borderRight: '16px solid transparent',
                  borderBottom: `24px solid ${shapeLayer.fillColor}`,
                }}
              />
            )}
            {shapeLayer.shapeType === 'line' && (
              <div
                style={{
                  width: 40,
                  height: shapeLayer.strokeWidth,
                  backgroundColor: shapeLayer.strokeColor,
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // =================================================================
  // Render
  // =================================================================

  return (
    <div className="w-80 bg-slate-100 dark:bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded">
              {layer.type === 'text' && <Type size={16} className="text-blue-400" />}
              {layer.type === 'image' && <Image size={16} className="text-green-400" />}
              {layer.type === 'shape' && <Square size={16} className="text-purple-400" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Layer Editor</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{layer.type} Layer</p>
            </div>
          </div>
          
          {/* Clipboard and Undo/Redo Controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={onCopy}
                disabled={!layer}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy (Ctrl+C)"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={onCut}
                disabled={!layer}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cut (Ctrl+X)"
              >
                <Scissors size={14} />
              </button>
              <button
                onClick={onPaste}
                disabled={!hasClipboard}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Paste (Ctrl+V)"
              >
                <Clipboard size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Type-specific Controls */}
        {layer.type === 'text' && renderTextControls()}
        {layer.type === 'image' && renderImageControls()}
        {layer.type === 'shape' && renderShapeControls()}

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Common Controls */}
        {renderCommonControls()}
      </div>
    </div>
  );
};

export default LayerEditor;