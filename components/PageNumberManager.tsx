import React, { useState } from 'react';
import { PageNumberSettings, PageNumberStyle, PageNumberFormat, Presentation } from '../types';
import { getRecommendedPageNumberSettings, addPageNumbersToSlides, removePageNumbersFromSlides, DEFAULT_PAGE_NUMBER_SETTINGS } from '../utils/pageNumbers';
import { X, Hash, Settings, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PageNumberManagerProps {
  presentation: Presentation;
  onUpdate: (settings: PageNumberSettings) => void;
  onClose: () => void;
}

const PageNumberManager: React.FC<PageNumberManagerProps> = ({
  presentation,
  onUpdate,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [settings, setSettings] = useState<PageNumberSettings>(
    presentation.settings.pageNumbers || DEFAULT_PAGE_NUMBER_SETTINGS
  );
  const [previewMode, setPreviewMode] = useState(false);

  const handleApply = () => {
    onUpdate(settings);
    onClose();
  };

  const handleApplyRecommended = () => {
    // Determine purpose from presentation content (simplified)
    const purpose = presentation.slides.length > 15 ? 'business_presentation' :
                   presentation.slides.some(s => s.title.includes('ゲーム') || s.title.includes('game')) ? 'game_content' :
                   'business_presentation';
    
    const recommended = getRecommendedPageNumberSettings(purpose, presentation.slides.length);
    setSettings(recommended);
  };

  const styles: { value: PageNumberStyle; label: string; description: string }[] = [
    { value: 'auto', label: 'Auto', description: 'Automatically choose based on presentation purpose' },
    { value: 'none', label: 'None', description: 'Hide page numbers completely' },
    { value: 'simple', label: 'Simple', description: 'Standard page numbers' },
    { value: 'prominent', label: 'Prominent', description: 'Bold style for game books' },
    { value: 'subtle', label: 'Subtle', description: 'Minimal, unobtrusive style' },
  ];

  const formats: { value: PageNumberFormat; label: string; example: string }[] = [
    { value: 'number_only', label: 'Number Only', example: '5' },
    { value: 'current_of_total', label: 'Current / Total', example: '5 / 12' },
    { value: 'current_total_separate', label: 'Current of Total', example: '5 of 12' },
  ];

  const positions = [
    { value: 'bottom_center', label: 'Bottom Center' },
    { value: 'bottom_right', label: 'Bottom Right' },
    { value: 'bottom_left', label: 'Bottom Left' },
    { value: 'top_right', label: 'Top Right' },
    { value: 'top_left', label: 'Top Left' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Hash className="w-6 h-6 text-cyan-400" />
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Page Number Settings</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleApplyRecommended}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Apply Recommended
            </button>
            
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDark ? 'text-white' : 'text-gray-900'} rounded-lg transition-colors`}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Hide Preview' : 'Preview'}
            </button>
          </div>

          {/* Style Selection */}
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
              Page Number Style
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {styles.map(style => (
                <button
                  key={style.value}
                  onClick={() => setSettings({ ...settings, style: style.value })}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    settings.style === style.value
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{style.label}</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>{style.description}</div>
                </button>
              ))}
            </div>
          </div>

          {settings.style !== 'none' && settings.style !== 'auto' && (
            <>
              {/* Format Selection */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                  Format
                </label>
                <div className="space-y-2">
                  {formats.map(format => (
                    <button
                      key={format.value}
                      onClick={() => setSettings({ ...settings, format: format.value })}
                      className={`w-full p-3 rounded-lg border transition-colors text-left flex justify-between items-center ${
                        settings.format === format.value
                          ? `border-cyan-500 bg-cyan-500/10 ${isDark ? 'text-white' : 'text-gray-900'}`
                          : isDark ? 'border-slate-600 hover:border-slate-500 text-slate-300' : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <span>{format.label}</span>
                      <span className={`text-sm font-mono ${isDark ? 'bg-slate-700' : 'bg-gray-200'} px-2 py-1 rounded`}>
                        {format.example}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Selection */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-3`}>
                  Position
                </label>
                <select
                  value={settings.position}
                  onChange={(e) => setSettings({ ...settings, position: e.target.value as any })}
                  className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:ring-2 focus:ring-cyan-500`}
                >
                  {positions.map(position => (
                    <option key={position.value} value={position.value} className={isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Prefix */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
                  Custom Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={settings.customPrefix || ''}
                  onChange={(e) => setSettings({ ...settings, customPrefix: e.target.value })}
                  placeholder="e.g., 'Page ', 'ページ ', 'P.'"
                  className={`w-full p-3 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-lg focus:ring-2 focus:ring-cyan-500`}
                />
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
                  Text to display before the page number
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="show-on-title"
                    type="checkbox"
                    checked={settings.showOnTitleSlide}
                    onChange={(e) => setSettings({ ...settings, showOnTitleSlide: e.target.checked })}
                    className={`h-4 w-4 rounded ${isDark ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-white'} text-cyan-600 focus:ring-cyan-500`}
                  />
                  <label htmlFor="show-on-title" className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                    Show page number on title slide
                  </label>
                </div>
              </div>

              {/* Preview */}
              {previewMode && (
                <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Preview</div>
                  {settings.style === 'auto' ? (
                    <div className="text-sm text-cyan-400">
                      🤖 Auto mode will choose the best settings based on your presentation purpose and slide count.
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-2`}>
                        Current presentation: {presentation.slides.length} slides
                        {presentation.purpose && ` • Purpose: ${presentation.purpose}`}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`text-lg font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {settings.customPrefix}
                        {settings.format === 'number_only' && '5'}
                        {settings.format === 'current_of_total' && `5 / ${presentation.slides.length}`}
                        {settings.format === 'current_total_separate' && `5 of ${presentation.slides.length}`}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1`}>
                        Position: {positions.find(p => p.value === settings.position)?.label}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg p-4`}>
            <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>Information</div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} space-y-1`}>
              <div>• Total slides: {presentation.slides.length}</div>
              <div>• Game books work best with "Prominent" style and "Number only" format</div>
              <div>• Digital signage typically uses "None" to hide page numbers</div>
              <div>• Business presentations often show total count for longer presentations</div>
            </div>
          </div>
        </div>

        <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageNumberManager;