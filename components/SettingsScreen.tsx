import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Sun, Moon, Monitor, Image, Settings } from 'lucide-react';
import { UserSettings, ImageGenerationSettings, getUserSettings, saveUserSettings, resetUserSettings } from '../services/storageService';
import { AI_TEMPERATURE_DEFAULTS } from '../services/ai/azureService';
import { useTheme } from '../contexts/ThemeContext';
import { AppTheme } from '../types';
import { TaskBasedAIProviderSettings } from './TaskBasedAIProviderSettings';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTheme(settings.theme);
  }, [settings.theme, setTheme]);

  const handleSettingsChange = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveUserSettings(newSettings);
  };

  const handleTemperatureChange = (taskType: keyof typeof AI_TEMPERATURE_DEFAULTS, value: number) => {
    const newOverrides = {
      ...settings.aiTemperatureOverrides,
      [taskType]: value
    };
    handleSettingsChange({ aiTemperatureOverrides: newOverrides });
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    handleSettingsChange({ theme: newTheme });
  };

  const handleReset = () => {
    resetUserSettings();
    const defaultSettings = getUserSettings();
    setSettings(defaultSettings);
    setTheme(defaultSettings.theme);
  };

  const handleImageGenerationSettingsChange = (updates: Partial<ImageGenerationSettings>) => {
    const newImageGenerationSettings = {
      ...settings.imageGenerationSettings,
      ...updates
    };
    handleSettingsChange({ imageGenerationSettings: newImageGenerationSettings });
  };

  const getEffectiveTemperature = (taskType: keyof typeof AI_TEMPERATURE_DEFAULTS): number => {
    return settings.aiTemperatureOverrides?.[taskType] ?? AI_TEMPERATURE_DEFAULTS[taskType];
  };

  const themeOptions: { value: AppTheme; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'light', label: 'Light Mode', icon: <Sun size={20} />, description: 'Light color scheme' },
    { value: 'dark', label: 'Dark Mode', icon: <Moon size={20} />, description: 'Dark color scheme' },
    { value: 'auto', label: 'System', icon: <Monitor size={20} />, description: 'Follow system preference' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">設定</h1>
          </div>
          
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            リセット
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">基本設定</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">アプリケーションテーマ</label>
                <div className="grid grid-cols-1 gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        theme === option.value
                          ? 'bg-blue-500/20 border border-blue-500'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {option.icon}
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">自動保存</label>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingsChange({ autoSave: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>

              {settings.autoSave && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    自動保存間隔 (秒): {settings.autoSaveInterval / 1000}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={settings.autoSaveInterval / 1000}
                    onChange={(e) => handleSettingsChange({ autoSaveInterval: parseInt(e.target.value) * 1000 })}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">🔑 AIプロバイダー設定</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    使用するAIプロバイダーとその認証情報を設定します
                  </p>
                </div>

                
                <TaskBasedAIProviderSettings 
                  settings={settings} 
                  onSettingsChange={handleSettingsChange} 
                />
              </div>

              {/* 画像生成設定 */}
              <div className="mt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Image size={20} />
                    画像生成設定
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    画像生成時のデフォルト品質、解像度、並列処理数を設定します
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                  {/* デフォルト品質 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">デフォルト品質</label>
                    <select
                      value={settings.imageGenerationSettings?.defaultQuality || 'medium'}
                      onChange={(e) => handleImageGenerationSettingsChange({ 
                        defaultQuality: e.target.value as 'low' | 'medium' | 'high' 
                      })}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm"
                    >
                      <option value="low" className="bg-gray-800">低品質（高速）</option>
                      <option value="medium" className="bg-gray-800">中品質（バランス）</option>
                      <option value="high" className="bg-gray-800">高品質（低速）</option>
                    </select>
                  </div>

                  {/* デフォルトサイズ */}
                  <div>
                    <label className="block text-sm font-medium mb-2">デフォルトサイズ</label>
                    <select
                      value={settings.imageGenerationSettings?.defaultSize || 'landscape'}
                      onChange={(e) => handleImageGenerationSettingsChange({ 
                        defaultSize: e.target.value as 'square' | 'landscape' | 'portrait' 
                      })}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm"
                    >
                      <option value="square" className="bg-gray-800">正方形（1:1）</option>
                      <option value="landscape" className="bg-gray-800">横長（16:9）</option>
                      <option value="portrait" className="bg-gray-800">縦長（9:16）</option>
                    </select>
                  </div>

                  {/* 並列処理数 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      同時生成数: {settings.imageGenerationSettings?.concurrentLimit || 3}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={settings.imageGenerationSettings?.concurrentLimit || 3}
                      onChange={(e) => handleImageGenerationSettingsChange({ 
                        concurrentLimit: parseInt(e.target.value) 
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1（順次）</span>
                      <span>5（推奨）</span>
                      <span>10（高速）</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      クラウドサービス: 3-8推奨、ローカルLLM: 1-2推奨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">AI創造性設定</h2>
            <p className="text-sm text-gray-300 mb-6">
              各機能のAI創造性レベルを調整できます。低い値ほど一貫性重視、高い値ほど創造的になります。
            </p>
            
            <div className="space-y-4">
              {Object.entries(AI_TEMPERATURE_DEFAULTS).map(([taskType, defaultValue]) => {
                const currentValue = getEffectiveTemperature(taskType as keyof typeof AI_TEMPERATURE_DEFAULTS);
                const isCustomized = settings.aiTemperatureOverrides?.[taskType as keyof typeof AI_TEMPERATURE_DEFAULTS] !== undefined;
                
                return (
                  <div key={taskType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {getTaskDisplayName(taskType)}
                        {isCustomized && <span className="text-blue-400 ml-1">*</span>}
                      </label>
                      <span className="text-sm text-gray-300">
                        {currentValue.toFixed(1)} {isCustomized ? `(デフォルト: ${defaultValue})` : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={currentValue}
                      onChange={(e) => handleTemperatureChange(
                        taskType as keyof typeof AI_TEMPERATURE_DEFAULTS, 
                        parseFloat(e.target.value)
                      )}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>一貫性</span>
                      <span>創造性</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              * カスタム設定済み
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

const getTaskDisplayName = (taskType: string): string => {
  const displayNames: Record<string, string> = {
    slideCount: 'スライド数計算',
    dataAnalysis: 'データ分析',
    structuredOutput: '構造化出力',
    manualGeneration: 'マニュアル作成',
    documentation: 'ドキュメント生成',
    slideStructure: 'スライド構造化',
    contentOptimization: 'コンテンツ最適化',
    existingStoryAdaptation: '既存物語の脚色',
    themeSelection: 'テーマ選択',
    imageGeneration: '画像生成',
    creativeWriting: '創作活動',
    originalStory: 'オリジナル物語作成'
  };
  
  return displayNames[taskType] || taskType;
};