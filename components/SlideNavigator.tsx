import React, { useState } from 'react';
import { SlideNavigatorProps } from '../types';
import { CANVAS_SIZES } from '../constants';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  GripVertical,
  Play,
  Pause,
} from 'lucide-react';

// =================================================================
// SlideNavigator Component
// =================================================================

const SlideNavigator: React.FC<SlideNavigatorProps> = ({
  slides,
  currentIndex,
  onSlideSelect,
  onSlideAdd,
  onSlideDelete,
  onSlideReorder,
}) => {
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // =================================================================
  // Drag and Drop Handlers
  // =================================================================

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSlide(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedSlide !== null && draggedSlide !== dropIndex) {
      onSlideReorder(draggedSlide, dropIndex);
    }
    
    setDraggedSlide(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSlide(null);
    setDragOverIndex(null);
  };

  // =================================================================
  // Slide Actions
  // =================================================================

  const handleAddSlide = (index?: number) => {
    onSlideAdd(index);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length > 1) {
      onSlideDelete(index);
    }
  };

  const handleDuplicateSlide = (index: number) => {
    const slideToClone = slides[index];
    const duplicatedSlide = {
      ...slideToClone,
      id: `slide-${Date.now()}`,
      title: `${slideToClone.title} (Copy)`,
      layers: slideToClone.layers.map(layer => ({
        ...layer,
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
    };
    
    // This would need to be implemented in the parent component
    // For now, we'll just add a new slide
    onSlideAdd(index + 1);
  };

  // =================================================================
  // Slide Preview
  // =================================================================

  const SlidePreview: React.FC<{ slide: any; index: number; isActive: boolean }> = ({
    slide,
    index,
    isActive,
  }) => {
    const canvasSize = CANVAS_SIZES[slide.aspectRatio];
    const aspectRatio = canvasSize.width / canvasSize.height;
    const previewWidth = 200;
    const previewHeight = previewWidth / aspectRatio;

    return (
      <div
        className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
          isActive
            ? 'border-blue-500 shadow-lg shadow-blue-500/20'
            : 'border-slate-600 hover:border-slate-500'
        }`}
        style={{
          width: previewWidth,
          height: previewHeight,
          background: slide.background,
        }}
        onClick={() => onSlideSelect(index)}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
      >
        {/* Slide Content Preview */}
        <div className="absolute inset-0 p-2">
          {slide.layers
            .sort((a: any, b: any) => a.zIndex - b.zIndex)
            .map((layer: any) => (
              <div
                key={layer.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  transform: `rotate(${layer.rotation}deg)`,
                  opacity: layer.opacity,
                  zIndex: layer.zIndex,
                }}
              >
                {layer.type === 'text' && (
                  <div
                    className="text-xs text-white overflow-hidden"
                    style={{
                      fontSize: `${Math.max(6, layer.fontSize * 0.05)}px`,
                      textAlign: layer.textAlign,
                      color: layer.textColor || '#ffffff',
                      lineHeight: '1.2',
                      wordBreak: 'break-word',
                    }}
                  >
                    {layer.content.split('\n').slice(0, 3).join('\n')}
                    {layer.content.split('\n').length > 3 && '...'}
                  </div>
                )}
                {layer.type === 'image' && (
                  <div className="w-full h-full bg-slate-300 dark:bg-slate-600 rounded flex items-center justify-center">
                    {layer.src ? (
                      <img
                        src={layer.src}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded"></div>
                    )}
                  </div>
                )}
                {layer.type === 'shape' && (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: layer.fillColor,
                      borderRadius: layer.shapeType === 'circle' ? '50%' : '0',
                    }}
                  ></div>
                )}
              </div>
            ))}
        </div>

        {/* Slide Number */}
        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded z-50">
          {index + 1}
        </div>

        {/* Drag Handle */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
          <GripVertical size={12} className="text-white" />
        </div>

        {/* Drag Over Indicator */}
        {dragOverIndex === index && draggedSlide !== index && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 rounded-lg"></div>
        )}

        {/* Actions */}
        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateSlide(index);
            }}
            className="p-1 bg-slate-200/90 dark:bg-slate-700/90 text-slate-900 dark:text-white rounded hover:bg-slate-300/90 dark:hover:bg-slate-600/90 transition-colors backdrop-blur-sm"
            title="Duplicate slide"
          >
            <Copy size={10} />
          </button>
          {slides.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSlide(index);
              }}
              className="p-1 bg-red-600/90 text-white rounded hover:bg-red-500/90 transition-colors backdrop-blur-sm"
              title="Delete slide"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // =================================================================
  // Render
  // =================================================================

  return (
    <div className="w-64 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Slides</h2>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {currentIndex + 1} / {slides.length}
            {/* Debug: currentIndex={currentIndex}, slides.length={slides.length} */}
          </span>
        </div>
        
        <button
          onClick={() => handleAddSlide()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Add Slide
        </button>
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600">
        {slides.map((slide, index) => {
          const isBeingDragged = draggedSlide === index;
          const isDragTarget = dragOverIndex === index && draggedSlide !== null && draggedSlide !== index;
          
          return (
            <div
              key={slide.id}
              className={`relative group transition-opacity ${
                isBeingDragged ? 'opacity-50' : 'opacity-100'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <SlidePreview
                slide={slide}
                index={index}
                isActive={index === currentIndex}
              />
              
              {/* Drag indicator */}
              {isDragTarget && (
                <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none"></div>
              )}
              
              {/* Slide Title */}
              <div className="mt-2 px-2">
                <div className="text-sm text-slate-900 dark:text-white truncate font-medium">
                  {slide.title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {slide.layers?.length || 0} layer{(slide.layers?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Drag handle and actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="cursor-grab text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Drag to reorder">
                  <GripVertical size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <div>Total: {slides.length} slides</div>
          <div className="flex gap-2">
            <button
              onClick={() => onSlideSelect(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous slide"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => onSlideSelect(Math.min(slides.length - 1, currentIndex + 1))}
              disabled={currentIndex === slides.length - 1}
              className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next slide"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideNavigator;