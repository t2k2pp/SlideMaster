import React, { useState } from 'react';
import { Presentation, ExportOptions } from '../types';
import { EXPORT_FORMATS } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Download, 
  X, 
  FileText, 
  Image, 
  FileCode, 
  Presentation as PresentationIcon,
  Settings,
  Loader2,
  Package,
  FileEdit,
} from 'lucide-react';

interface ExportManagerProps {
  presentation: Presentation | null;
  onExport: (options: ExportOptions) => void;
  isProcessing: boolean;
  onClose: () => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({
  presentation,
  onExport,
  isProcessing,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'pptx' | 'png' | 'jpeg' | 'png-all' | 'jpeg-all' | 'svg' | 'svg-all' | 'html' | 'marp' | 'project'>('pdf');
  const [quality, setQuality] = useState(0.9);
  const [resolution, setResolution] = useState<'low' | 'medium' | 'high'>('high');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [slideRange, setSlideRange] = useState({ start: 0, end: presentation?.slides.length || 0 });

  const formatOptions = [
    // Row 1: Project File (spans 2 columns)
    { value: 'project', label: 'Project File (.zip)', icon: Package, description: 'Editable SlideMaster project file', span: 2 },
    // Row 2: PowerPoint and Marp
    { value: 'pptx', label: 'PowerPoint', icon: PresentationIcon, description: 'Editable presentation format' },
    { value: 'marp', label: 'Marp Markdown', icon: FileEdit, description: 'Markdown-based presentation format' },
    // Row 3: PDF and HTML
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Perfect for sharing and printing' },
    { value: 'html', label: 'HTML Slideshow', icon: FileCode, description: 'Interactive web presentation' },
    // Row 4: PNG All and PNG Current
    { value: 'png-all', label: 'PNG Images (All Slides)', icon: Package, description: 'All slides as PNG images in ZIP' },
    { value: 'png', label: 'PNG Image (Current Slide)', icon: Image, description: 'Single slide as high-quality PNG' },
    // Row 5: JPEG All and JPEG Current
    { value: 'jpeg-all', label: 'JPEG Images (All Slides)', icon: Package, description: 'All slides as JPEG images in ZIP' },
    { value: 'jpeg', label: 'JPEG Image (Current Slide)', icon: Image, description: 'Single slide as compressed JPEG' },
    // Row 6: SVG All and SVG Current
    { value: 'svg-all', label: 'SVG Vectors (All Slides)', icon: Package, description: 'All slides as SVG files in ZIP' },
    { value: 'svg', label: 'SVG Vector (Current Slide)', icon: FileCode, description: 'Single slide as scalable vector graphics' },
  ];

  const handleExport = () => {
    if (!presentation) return;

    const options: ExportOptions = {
      format: selectedFormat,
      quality,
      resolution,
      includeNotes,
      slideRange: slideRange.start === 0 && slideRange.end === presentation.slides.length 
        ? undefined 
        : slideRange,
    };

    onExport(options);
  };

  if (!presentation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 max-w-md`}>
          <div className="text-center">
            <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Presentation</h2>
            <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'} mb-4`}>Please create or load a presentation first.</p>
            <button
              onClick={onClose}
              className={`px-4 py-2 ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} rounded transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Download size={20} className="text-blue-400" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Export Presentation</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} rounded transition-colors`}
          >
            <X size={20} className={isDark ? 'text-white' : 'text-gray-600'} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map(({ value, label, icon: Icon, description, span }) => (
                <button
                  key={value}
                  onClick={() => setSelectedFormat(value as any)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedFormat === value
                      ? 'border-blue-500 bg-blue-500/10'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-300 hover:border-gray-400'
                  } ${span === 2 ? 'col-span-2' : ''}`}
                >
                  <Icon size={24} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
                  <div>
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Settings */}
          {(selectedFormat === 'jpeg' || selectedFormat === 'jpeg-all' || selectedFormat === 'pdf') && (
            <div>
              <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quality Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className={`w-full px-3 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    <option value="low" className={isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}>Low (72 DPI)</option>
                    <option value="medium" className={isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}>Medium (150 DPI)</option>
                    <option value="high" className={isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}>High (300 DPI)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quality: {Math.round(quality * 100)}%</label>
                  <input
                    type="range"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    min="0.1"
                    max="1"
                    step="0.1"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Slide Range */}
          <div>
            <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Slide Range</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Start Slide</label>
                <input
                  type="number"
                  value={slideRange.start + 1}
                  onChange={(e) => setSlideRange({ ...slideRange, start: Math.max(0, parseInt(e.target.value) - 1) })}
                  min="1"
                  max={presentation.slides.length}
                  className={`w-full px-3 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'text-white' : 'text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>End Slide</label>
                <input
                  type="number"
                  value={slideRange.end}
                  onChange={(e) => setSlideRange({ ...slideRange, end: Math.min(presentation.slides.length, parseInt(e.target.value)) })}
                  min="1"
                  max={presentation.slides.length}
                  className={`w-full px-3 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'text-white' : 'text-gray-900'}`}
                />
              </div>
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-2`}>
              Total slides: {presentation.slides.length} | Selected: {slideRange.end - slideRange.start}
            </p>
          </div>

          {/* Additional Options */}
          {(selectedFormat === 'pdf' || selectedFormat === 'pptx') && (
            <div>
              <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Additional Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className={`w-5 h-5 text-blue-600 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'} rounded focus:ring-blue-500`}
                  />
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Include speaker notes</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview Info */}
          <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Export Preview</h3>
            <div className={`space-y-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <div>Format: {EXPORT_FORMATS[selectedFormat].name}</div>
              <div>Slides: {slideRange.end - slideRange.start} of {presentation.slides.length}</div>
              {(selectedFormat === 'jpeg' || selectedFormat === 'jpeg-all' || selectedFormat === 'pdf') && (
                <div>Quality: {Math.round(quality * 100)}%</div>
              )}
              <div>Resolution: {resolution.charAt(0).toUpperCase() + resolution.slice(1)}</div>
              {includeNotes && <div>Speaker notes: Included</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className={`px-4 py-2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:cursor-not-allowed transition-colors ${isProcessing ? (isDark ? 'disabled:bg-slate-600' : 'disabled:bg-gray-400') : ''}`}
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isProcessing ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;