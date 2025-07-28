import React, { useState } from 'react';
import { X, Key, Shield, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyUpdate: (apiKey: string) => void;
  currentApiKey?: string;
  hasDefaultKey?: boolean;
}

export default function ApiKeyManager({ isOpen, onClose, onApiKeyUpdate, currentApiKey, hasDefaultKey }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState((currentApiKey || '').trim().length > 0);
  const [selectedHint, setSelectedHint] = useState<'help' | 'default' | 'fallback' | null>(null);

  const validateApiKey = (key: string) => {
    // 値が設定されているかのチェックのみ
    return key.trim().length > 0;
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsValid(validateApiKey(value));
  };

  const handleSave = () => {
    if (!apiKey || isValid) {
      onApiKeyUpdate(apiKey);
      onClose();
    }
  };

  const handleClear = () => {
    setApiKey('');
    setIsValid(false);
    onApiKeyUpdate('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Gemini APIキー設定</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Security Notice - Always visible */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">セキュリティについて</p>
                <p>このアプリケーションはViteを使用してクライアントサイドで動作します。入力されたAPIキーはサーバーに送信されず、ブラウザ内でのみ使用されます。</p>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              Gemini APIキー（オプション）
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={`w-full pr-10 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  apiKey && !isValid 
                    ? 'border-red-300 bg-red-50' 
                    : apiKey && isValid 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {apiKey && !isValid && (
              <p className="text-sm text-red-600">無効なAPIキー形式です</p>
            )}
            {apiKey && isValid && (
              <p className="text-sm text-green-600">有効なAPIキー形式です</p>
            )}
          </div>

          {/* Hint buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedHint(selectedHint === 'help' ? null : 'help')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedHint === 'help' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <Info className="h-4 w-4 inline mr-1" />
              取得方法
            </button>
            
            {hasDefaultKey && (
              <button
                onClick={() => setSelectedHint(selectedHint === 'default' ? null : 'default')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  selectedHint === 'default' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Info className="h-4 w-4 inline mr-1" />
                デフォルトキー
              </button>
            )}
            
            <button
              onClick={() => setSelectedHint(selectedHint === 'fallback' ? null : 'fallback')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedHint === 'fallback' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Lock className="h-4 w-4 inline mr-1" />
              キーなしでも使用可能
            </button>
          </div>

          {/* Hint content */}
          {selectedHint && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              {selectedHint === 'help' && (
                <div className="text-sm text-slate-700">
                  <p className="font-medium mb-2">Gemini APIキーの取得方法</p>
                  <p>
                    1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google AI Studio</a> にアクセス<br/>
                    2. 「Create API Key」をクリック<br/>
                    3. 生成されたAPIキーをコピーして上記フィールドに貼り付け
                  </p>
                </div>
              )}
              
              {selectedHint === 'default' && (
                <div className="text-sm text-slate-700">
                  <p className="font-medium mb-2">デフォルトAPIキー利用中</p>
                  <p>設定済みのAPIキーが利用されています。独自のAPIキーを設定することで、より安定したサービスをご利用いただけます。</p>
                </div>
              )}
              
              {selectedHint === 'fallback' && (
                <div className="text-sm text-slate-700">
                  <p className="font-medium mb-2">APIキーなしでも使用可能</p>
                  <p>APIキーを設定しない場合、スライド作成ツールとしては引き続きご利用いただけます。AI機能を使用する場合は、独自のAPIキーまたはデフォルトキーが必要です。</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            クリア
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={apiKey && !isValid}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                apiKey && !isValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}