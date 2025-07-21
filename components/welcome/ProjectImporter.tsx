import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

// =================================================================
// Project Importer Component - Import existing presentations
// =================================================================

interface ProjectImporterProps {
  onImportProject: (file: File) => void;
  isProcessing: boolean;
}

export const ProjectImporter: React.FC<ProjectImporterProps> = ({
  onImportProject,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      onImportProject(file);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      onImportProject(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Import Presentation</h2>
        <p className="text-slate-500 dark:text-slate-400">Load a previously exported presentation file</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg p-8 text-center transition-all cursor-pointer
          ${isProcessing 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-cyan-400 hover:bg-slate-100 dark:hover:bg-gray-800/50'
          }
        `}
      >
        <Upload className="w-12 h-12 text-slate-400 dark:text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Drop your presentation file here
        </h3>
        <p className="text-slate-600 dark:text-gray-300 mb-4">
          or click to browse for a .json file
        </p>
        <div className="text-sm text-slate-500 dark:text-gray-400">
          <p>Supported format: JSON files exported from SlideMaster</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="bg-slate-200 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">Import Tips:</h4>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <li>• Only JSON files exported from SlideMaster are supported</li>
          <li>• Your presentation will be loaded with all slides and settings</li>
          <li>• Large presentations with many images may take longer to load</li>
          <li>• Make sure your API key is configured for AI features</li>
        </ul>
      </div>
    </div>
  );
};