import React from 'react';
import { Presentation } from '../../types';
import { Clock, FileText } from 'lucide-react';

// =================================================================
// Recent Presentations Component - Display and load recent projects
// =================================================================

interface RecentPresentationsProps {
  recentPresentations: Presentation[];
  onLoadPresentation: (id: string) => void;
  isProcessing: boolean;
}

export const RecentPresentations: React.FC<RecentPresentationsProps> = ({
  recentPresentations,
  onLoadPresentation,
  isProcessing
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (recentPresentations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-600 dark:text-gray-400 mb-2">No Recent Presentations</h3>
        <p className="text-slate-500 dark:text-gray-500">
          Create your first presentation using the AI Generator or Manual tools.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Recent Presentations</h2>
        <p className="text-slate-500 dark:text-slate-400">Continue working on your previous presentations</p>
      </div>

      <div className="grid gap-4">
        {recentPresentations.map((presentation) => (
          <div
            key={presentation.id}
            onClick={() => !isProcessing && onLoadPresentation(presentation.id)}
            className={`
              p-4 bg-slate-200 dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-lg transition-all cursor-pointer
              ${isProcessing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-slate-300 dark:hover:bg-gray-700 hover:border-cyan-400 dark:hover:border-cyan-400'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate mb-1">
                  {presentation.title}
                </h3>
                {presentation.description && (
                  <p className="text-slate-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                    {presentation.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {presentation.slides.length} slides
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(new Date(presentation.updatedAt))}
                  </span>
                  <span className="px-2 py-1 bg-slate-300 dark:bg-gray-700 rounded text-xs text-slate-700 dark:text-slate-300">
                    {presentation.theme}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="w-12 h-8 bg-slate-300 dark:bg-gray-700 rounded border border-slate-400 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-xs text-slate-600 dark:text-gray-300">
                    {presentation.settings.defaultAspectRatio}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recentPresentations.length > 5 && (
        <div className="text-center">
          <p className="text-slate-500 dark:text-gray-400 text-sm">
            Showing recent presentations. Use Import to load older files.
          </p>
        </div>
      )}
    </div>
  );
};