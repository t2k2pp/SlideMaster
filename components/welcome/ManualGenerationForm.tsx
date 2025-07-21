import React, { useState, useRef } from 'react';
import { Slide } from '../../types';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { 
  parseManualMarkdown, 
  generateSlidesFromSections,
  getDefaultManualGeneratorOptions,
  validateManualGeneratorInput,
  ManualGeneratorOptions,
  ManualSection
} from '../../utils/manualGenerator';
import { 
  VideoFrameExtractor, 
  createVideoFromFile, 
  FrameExtractionResult
} from '../../utils/videoFrameExtractor';

// =================================================================
// Manual Generation Form Component - Generate slides from markdown + video
// =================================================================

interface ManualGenerationFormProps {
  onManualGenerate: (slides: Slide[]) => void;
  isProcessing: boolean;
}

export const ManualGenerationForm: React.FC<ManualGenerationFormProps> = ({
  onManualGenerate,
  isProcessing
}) => {
  const [markdownFile, setMarkdownFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [manualOptions, setManualOptions] = useState<ManualGeneratorOptions>(getDefaultManualGeneratorOptions());
  const [manualError, setManualError] = useState<string>('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [manualProgress, setManualProgress] = useState<{ task: string; progress: number }>({ task: '', progress: 0 });

  const markdownFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const handleMarkdownFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMarkdownContent(content);
        setMarkdownFile(file);
        setManualError('');
      };
      reader.readAsText(file);
    }
  };

  const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setManualError('');
    }
  };

  const handleMarkdownDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'text/markdown' || file.name.endsWith('.md'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMarkdownContent(content);
        setMarkdownFile(file);
        setManualError('');
      };
      reader.readAsText(file);
    }
  };

  const handleVideoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setManualError('');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleManualGenerate = async () => {
    if (!markdownContent.trim() || isManualProcessing) return;

    setIsManualProcessing(true);
    setManualError('');
    setManualProgress({ task: 'Validating input...', progress: 10 });

    try {
      // Validate input
      const validation = validateManualGeneratorInput(markdownContent, videoFile);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      setManualProgress({ task: 'Parsing markdown...', progress: 20 });

      // Parse markdown into sections
      const sections: ManualSection[] = parseManualMarkdown(markdownContent);
      if (sections.length === 0) {
        throw new Error('No valid sections found in the markdown. Please ensure your markdown has proper headers (##).');
      }

      setManualProgress({ task: 'Processing video frames...', progress: 40 });

      let frameResults: FrameExtractionResult[] = [];
      if (videoFile && manualOptions.extractFrames) {
        try {
          const videoExtractor = new VideoFrameExtractor();
          const video = await createVideoFromFile(videoFile);
          frameResults = await videoExtractor.extractFramesFromSections(video, sections);
          setManualProgress({ task: 'Generating slides...', progress: 70 });
        } catch (videoError) {
          console.warn('Video frame extraction failed:', videoError);
          // Continue without frames
        }
      }

      setManualProgress({ task: 'Creating slide layout...', progress: 80 });

      // Generate slides
      const slides = generateSlidesFromSections(sections, manualOptions, frameResults);

      setManualProgress({ task: 'Finalizing...', progress: 100 });

      onManualGenerate(slides);
      
      // Reset form
      setMarkdownContent('');
      setMarkdownFile(null);
      setVideoFile(null);

    } catch (error) {
      console.error('Manual generation error:', error);
      setManualError(error instanceof Error ? error.message : 'An error occurred during generation');
    } finally {
      setIsManualProcessing(false);
      setManualProgress({ task: '', progress: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Manual Generate from Docs</h2>
        <p className="text-slate-500 dark:text-slate-400">Upload markdown documentation and optional video for manual slide generation</p>
      </div>

      <div className="space-y-4">
        {/* Markdown Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Markdown Documentation (Required)
          </label>
          <div
            onDrop={handleMarkdownDrop}
            onDragOver={handleDragOver}
            onClick={() => markdownFileInputRef.current?.click()}
            className={`
              border-2 border-dashed border-gray-600 rounded-lg p-6 text-center transition-all cursor-pointer
              ${isManualProcessing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-cyan-400 hover:bg-gray-800/50'
              }
            `}
          >
            {markdownFile ? (
              <div className="space-y-2">
                <FileText className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-white font-medium">{markdownFile.name}</p>
                <p className="text-gray-400 text-sm">
                  {(markdownFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMarkdownFile(null);
                    setMarkdownContent('');
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={isManualProcessing}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-gray-300">Drop markdown file here or click to upload</p>
                <p className="text-gray-500 text-sm">
                  Supports .md files
                </p>
              </div>
            )}
          </div>
          <input
            ref={markdownFileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            onChange={handleMarkdownFileSelect}
            className="hidden"
            disabled={isManualProcessing}
          />
        </div>

        {/* Video Upload (Optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
            Video File (Optional)
          </label>
          <div
            onDrop={handleVideoDrop}
            onDragOver={handleDragOver}
            onClick={() => videoFileInputRef.current?.click()}
            className={`
              border-2 border-dashed border-gray-600 rounded-lg p-4 text-center transition-all cursor-pointer
              ${isManualProcessing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-cyan-400 hover:bg-gray-800/50'
              }
            `}
          >
            {videoFile ? (
              <div className="space-y-2">
                <FileText className="w-6 h-6 text-green-400 mx-auto" />
                <p className="text-white text-sm font-medium">{videoFile.name}</p>
                <p className="text-gray-400 text-xs">
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                  disabled={isManualProcessing}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-gray-300 text-sm">Optional: Drop video for frame extraction</p>
                <p className="text-gray-500 text-xs">
                  MP4, MOV, AVI
                </p>
              </div>
            )}
          </div>
          <input
            ref={videoFileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoFileSelect}
            className="hidden"
            disabled={isManualProcessing}
          />
        </div>

        {/* Generation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Theme
            </label>
            <select
              value={manualOptions.theme}
              onChange={(e) => setManualOptions(prev => ({ ...prev, theme: e.target.value as any }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              disabled={isManualProcessing}
            >
              <option value="professional">Professional</option>
              <option value="creative">Creative</option>
              <option value="academic">Academic</option>
              <option value="modern">Modern</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Aspect Ratio
            </label>
            <select
              value={manualOptions.aspectRatio}
              onChange={(e) => setManualOptions(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              disabled={isManualProcessing}
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={manualOptions.extractFrames}
              onChange={(e) => setManualOptions(prev => ({ ...prev, extractFrames: e.target.checked }))}
              className="mr-3 rounded text-cyan-400 focus:ring-cyan-400"
              disabled={isManualProcessing || !videoFile}
            />
            <span className="text-slate-900 dark:text-white">Extract frames from video at timestamps</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={manualOptions.autoImageLayout}
              onChange={(e) => setManualOptions(prev => ({ ...prev, autoImageLayout: e.target.checked }))}
              className="mr-3 rounded text-cyan-400 focus:ring-cyan-400"
              disabled={isManualProcessing}
            />
            <span className="text-slate-900 dark:text-white">Auto-arrange image layout</span>
          </label>

          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={manualOptions.preserveFormatting}
              onChange={(e) => setManualOptions(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
              className="mr-3 rounded text-cyan-400 focus:ring-cyan-400"
              disabled={isManualProcessing}
            />
            <span className="text-slate-900 dark:text-white">Preserve markdown formatting</span>
          </label>
        </div>

        {/* Error Display */}
        {manualError && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-200">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{manualError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {isManualProcessing && (
          <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-blue-200 font-medium">{manualProgress.task}</p>
                <div className="w-full bg-blue-800/50 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${manualProgress.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleManualGenerate}
          disabled={!markdownContent.trim() || isManualProcessing || isProcessing}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          {isManualProcessing ? 'Generating...' : 'Generate from Documentation'}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-slate-200 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <li>• Upload markdown documentation with ## headers for slide structure</li>
          <li>• Optionally add video file for automatic frame extraction at timestamps</li>
          <li>• System generates slides from content with customizable themes and layouts</li>
          <li>• Perfect for creating presentations from existing documentation</li>
        </ul>
      </div>
    </div>
  );
};