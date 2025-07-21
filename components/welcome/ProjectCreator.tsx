import React, { useState } from 'react';
import { PresentationTheme } from '../../types';
import { Plus } from 'lucide-react';

// =================================================================
// Project Creator Component - New project creation functionality
// =================================================================

interface ProjectCreatorProps {
  onCreateNew: (title: string, theme: PresentationTheme) => void;
  isProcessing: boolean;
}

const THEMES: { value: PresentationTheme; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'AI will choose the best theme' },
  { value: 'professional', label: 'Professional', description: 'Clean, business-oriented design' },
  { value: 'creative', label: 'Creative', description: 'Colorful and artistic design' },
  { value: 'academic', label: 'Academic', description: 'Scholarly and formal design' },
  { value: 'modern', label: 'Modern', description: 'Contemporary and minimalist' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
  { value: 'playful', label: 'Playful', description: 'Fun and engaging design' },
  { value: 'minimal', label: 'Minimal', description: 'Simple and clean design' },
  { value: 'dark', label: 'Dark', description: 'Dark theme for modern look' },
  { value: 'colorful', label: 'Colorful', description: 'Vibrant and eye-catching' },
];

export const ProjectCreator: React.FC<ProjectCreatorProps> = ({
  onCreateNew,
  isProcessing
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme>('auto');

  const handleCreate = () => {
    if (newTitle.trim() && !isProcessing) {
      onCreateNew(newTitle.trim(), selectedTheme);
      setNewTitle('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Create New Presentation</h2>
        <p className="text-slate-500 dark:text-slate-400">Start with a blank presentation</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Presentation Title
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter presentation title..."
            className="w-full p-4 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Theme
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as PresentationTheme)}
            className="w-full p-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
            disabled={isProcessing}
          >
            {THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label} - {theme.description}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={!newTitle.trim() || isProcessing}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {isProcessing ? 'Creating...' : 'Create Presentation'}
        </button>
      </div>
    </div>
  );
};