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

const THEMES: { value: PresentationTheme; name: string; color: string; textColor: string; category: string }[] = [
  // Basic Themes
  { value: 'professional', name: 'Professional', color: '#111827', textColor: '#ffffff', category: 'Basic' },
  { value: 'creative', name: 'Creative', color: '#312e81', textColor: '#fcd34d', category: 'Basic' },
  { value: 'minimalist', name: 'Minimalist', color: '#ffffff', textColor: '#1f2937', category: 'Basic' },
  { value: 'playful', name: 'Playful', color: '#155e75', textColor: '#ffffff', category: 'Basic' },
  
  // Academic & Professional
  { value: 'academic', name: 'Academic', color: '#0f172a', textColor: '#60a5fa', category: 'Academic' },
  { value: 'medical', name: 'Medical', color: '#ffffff', textColor: '#0369a1', category: 'Professional' },
  { value: 'tech_modern', name: 'Tech Modern', color: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', textColor: '#22d3ee', category: 'Tech' },
  
  // Style & Aesthetic
  { value: 'elegant_luxury', name: 'Elegant Luxury', color: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)', textColor: '#fbbf24', category: 'Style' },
  { value: 'dark_modern', name: 'Dark Modern', color: '#020617', textColor: '#a78bfa', category: 'Modern' },
];

export const ProjectCreator: React.FC<ProjectCreatorProps> = ({
  onCreateNew,
  isProcessing
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme>('professional');

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
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
            Theme
          </label>
          <div className="max-h-64 overflow-y-auto space-y-3">
            {['Basic', 'Academic', 'Professional', 'Tech', 'Style', 'Modern'].map(category => {
              const categoryThemes = THEMES.filter(theme => theme.category === category);
              if (categoryThemes.length === 0) return null;
              
              return (
                <div key={category}>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{category}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categoryThemes.map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => setSelectedTheme(theme.value)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          selectedTheme === theme.value
                            ? 'border-cyan-500 bg-cyan-500/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                        disabled={isProcessing}
                      >
                        <div 
                          className="w-5 h-5 rounded mx-auto mb-1 flex items-center justify-center text-xs font-bold border border-slate-400 dark:border-slate-600"
                          style={{ 
                            background: theme.color,
                            color: theme.textColor
                          }}
                        >
                          {theme.name[0]}
                        </div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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