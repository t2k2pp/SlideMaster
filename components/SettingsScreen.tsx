import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, RotateCcw, Sun, Moon, Monitor, Key } from 'lucide-react';
import { UserSettings, getUserSettings, saveUserSettings, resetUserSettings } from '../services/storageService';
import { AI_TEMPERATURE_DEFAULTS } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import { AppTheme } from '../types';
import { TaskBasedAIProviderSettings } from './TaskBasedAIProviderSettings';
import MultiProviderApiKeyManager from './MultiProviderApiKeyManager';
import { AIProviderType } from '../services/ai/aiProviderInterface';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const { theme, setTheme } = useTheme();
  const [tempTheme, setTempTheme] = useState<AppTheme>(theme);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  
  const themeOptions: { value: AppTheme; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'light', label: 'Light Mode', icon: <Sun size={20} />, description: 'Light color scheme' },
    { value: 'dark', label: 'Dark Mode', icon: <Moon size={20} />, description: 'Dark color scheme' },
    { value: 'auto', label: 'System', icon: <Monitor size={20} />, description: 'Follow system preference' },
  ];

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    console.log(`⚙️ SettingsScreen: Changing ${key} to:`, value);
    console.log(`🔍 SettingsScreen: Current settings before change:`, settings);
    const newSettings = { ...settings, [key]: value };
    console.log(`📊 SettingsScreen: New settings:`, newSettings);
    console.log(`🎯 SettingsScreen: Specific key ${key} now has value:`, newSettings[key]);
    setSettings(newSettings);
    setHasChanges(true);
  };

  // Check if theme has changed
  const hasThemeChanged = tempTheme !== theme;

  const handleTemperatureChange = (taskType: keyof typeof AI_TEMPERATURE_DEFAULTS, value: number) => {
    const newOverrides = {
      ...settings.aiTemperatureOverrides,
      [taskType]: value
    };
    handleSettingChange('aiTemperatureOverrides', newOverrides);
  };

  const handleSave = () => {
    saveUserSettings(settings);
    setTheme(tempTheme);
    setHasChanges(false);
  };

  const handleReset = () => {
    resetUserSettings();
    setSettings(getUserSettings());
    setTempTheme('dark'); // Default theme
    setHasChanges(false);
  };

  const getEffectiveTemperature = (taskType: keyof typeof AI_TEMPERATURE_DEFAULTS): number => {
    return settings.aiTemperatureOverrides?.[taskType] ?? AI_TEMPERATURE_DEFAULTS[taskType];
  };

  const handleApiKeyUpdate = (provider: AIProviderType, apiKey: string, additionalConfig?: any) => {
    const updates: Partial<UserSettings> = {};
    
    // APIキーを設定
    switch (provider) {
      case 'gemini':
        // Geminiは既存のlocalStorageシステムを使用
        localStorage.setItem('slidemaster_user_api_key', apiKey);
        break;
      case 'azure':
        updates.azureApiKey = apiKey;
        if (additionalConfig?.azureEndpoint) {
          updates.azureEndpoint = additionalConfig.azureEndpoint;
        }
        break;
      case 'openai':
        updates.openaiApiKey = apiKey;
        break;
      case 'claude':
        updates.claudeApiKey = apiKey;
        break;
      case 'lmstudio':
        if (additionalConfig?.lmStudioEndpoint) {
          updates.lmStudioEndpoint = additionalConfig.lmStudioEndpoint;
        }
        break;
      case 'fooocus':
        if (additionalConfig?.fooucusEndpoint) {
          updates.fooucusEndpoint = additionalConfig.fooucusEndpoint;
        }
        break;
    }

    // 設定を更新
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* ヘッダー */}
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
          
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              リセット
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges && !hasThemeChanged}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasChanges || hasThemeChanged
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-gray-500/50 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 基本設定 */}
          <div className="bg-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">基本設定</h2>
            
            <div className="space-y-6">
              {/* テーマ設定 */}
              <div>
                <label className="block text-sm font-medium mb-3">アプリケーションテーマ</label>
                <div className="grid grid-cols-1 gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTempTheme(option.value);
                        setHasChanges(true);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        tempTheme === option.value
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
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
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
                    onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value) * 1000)}
                    className="w-full"
                  />
                </div>
              )}

              {/* タスク別AIプロバイダー設定 */}
              <div>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">🔑 AIプロバイダー・APIキー設定</h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        AI機能の中心となる設定です。各プロバイダーのAPIキーとタスク別の使い分けを設定してください。
                      </p>
                    </div>
                    <button
                      onClick={() => setShowApiKeyManager(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ml-4"
                    >
                      <Key className="w-4 h-4" />
                      APIキー管理
                    </button>
                  </div>
                </div>
                
                <TaskBasedAIProviderSettings 
                  settings={settings} 
                  onSettingChange={handleSettingChange} 
                />
              </div>
            </div>
          </div>

          {/* AI Temperature設定 */}
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

        {(hasChanges || hasThemeChanged) && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            未保存の変更があります
          </div>
        )}

        {/* マルチプロバイダーAPIキー管理モーダル */}
        <MultiProviderApiKeyManager
          isOpen={showApiKeyManager}
          onClose={() => setShowApiKeyManager(false)}
          onApiKeyUpdate={handleApiKeyUpdate}
          currentSettings={{
            geminiApiKey: localStorage.getItem('slidemaster_user_api_key') || '',
            azureApiKey: settings.azureApiKey || '',
            azureEndpoint: settings.azureEndpoint || '',
            openaiApiKey: settings.openaiApiKey || '',
            claudeApiKey: settings.claudeApiKey || '',
            lmStudioEndpoint: settings.lmStudioEndpoint || '',
            fooucusEndpoint: settings.fooucusEndpoint || '',
          }}
        />
      </div>
    </div>
  );
};

// タスクタイプの表示名を取得
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