import React, { useState } from 'react';
import { X, FileText, Upload, Sparkles } from 'lucide-react';
import { generateSVG } from '../services/ai/svgGenerationService';

interface SVGAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSVG: (content: string, prompt: string) => void;
}

type SVGAddMethod = 'direct' | 'file' | 'ai';

export const SVGAddModal: React.FC<SVGAddModalProps> = ({
  isOpen,
  onClose,
  onAddSVG,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<SVGAddMethod>('direct');
  const [directSVG, setDirectSVG] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDirectAdd = () => {
    if (!directSVG.trim()) {
      setError('SVGコンテンツを入力してください');
      return;
    }
    
    if (!directSVG.includes('<svg')) {
      setError('有効なSVGコンテンツを入力してください');
      return;
    }

    onAddSVG(directSVG.trim(), 'Direct SVG input');
    handleClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      setError('SVGファイルのみアップロード可能です');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onAddSVG(content, `Uploaded SVG: ${file.name}`);
        handleClose();
      }
    };
    reader.onerror = () => {
      setError('ファイルの読み込みに失敗しました');
    };
    reader.readAsText(file);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('生成用プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateSVG({
        prompt: aiPrompt,
        style: 'simple',
        complexity: 'medium'
      });

      onAddSVG(result.svgContent, result.generationPrompt);
      handleClose();
    } catch (err) {
      setError('SVG生成に失敗しました: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setDirectSVG('');
    setAiPrompt('');
    setError(null);
    setSelectedMethod('direct');
    setIsGenerating(false);
    onClose();
  };

  const methods = [
    {
      id: 'direct' as SVGAddMethod,
      name: 'コード直接入力',
      icon: FileText,
      description: 'SVGコードを直接貼り付け'
    },
    {
      id: 'file' as SVGAddMethod,
      name: 'ファイルアップロード',
      icon: Upload,
      description: 'SVGファイルをアップロード'
    },
    {
      id: 'ai' as SVGAddMethod,
      name: 'AI生成',
      icon: Sparkles,
      description: 'プロンプトからAIで生成'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            SVGレイヤーを追加
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-4">
          {/* Method Selection */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              追加方法を選択
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {methods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-3 text-left rounded-lg border-2 transition-colors ${
                      selectedMethod === method.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className="text-orange-600" />
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {method.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {method.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Method-specific Content */}
          {selectedMethod === 'direct' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SVGコード
              </label>
              <textarea
                value={directSVG}
                onChange={(e) => setDirectSVG(e.target.value)}
                placeholder={`例:
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3b82f6"/>
</svg>`}
                className="w-full h-64 p-3 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                完全なSVGタグを含めて入力してください
              </p>
            </div>
          )}

          {selectedMethod === 'file' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                SVGファイルを選択
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <label htmlFor="svg-file" className="cursor-pointer">
                  <span className="text-sm font-medium text-orange-600 hover:text-orange-500">
                    ファイルを選択
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                    またはここにドラッグ&ドロップ
                  </span>
                  <input
                    id="svg-file"
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  SVGファイルのみサポートしています
                </p>
              </div>
            </div>
          )}

          {selectedMethod === 'ai' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                生成プロンプト
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例: バブルソートアルゴリズムを示すフローチャート"
                className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isGenerating}
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                作成したいSVGについて詳しく説明してください。アイコン、グラフ、図表などが得意です。
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              disabled={isGenerating}
            >
              キャンセル
            </button>
            <button
              onClick={
                selectedMethod === 'direct' ? handleDirectAdd :
                selectedMethod === 'ai' ? handleAIGenerate :
                undefined
              }
              disabled={
                isGenerating ||
                (selectedMethod === 'direct' && !directSVG.trim()) ||
                (selectedMethod === 'ai' && !aiPrompt.trim()) ||
                selectedMethod === 'file'
              }
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {selectedMethod === 'direct' && 'SVGを追加'}
              {selectedMethod === 'ai' && (isGenerating ? '生成中...' : 'AIで生成')}
              {selectedMethod === 'file' && 'ファイルを選択してください'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};