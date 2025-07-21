import React, { useState, useRef, useCallback } from 'react';
import { Slide, Presentation } from '../types';
import { 
  Upload, 
  Video, 
  FileText, 
  Settings, 
  Play, 
  X, 
  Loader2, 
  Check,
  AlertCircle,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import { 
  parseManualMarkdown, 
  generateSlidesFromSections,
  getDefaultManualGeneratorOptions,
  validateManualGeneratorInput,
  ManualGeneratorOptions,
  ManualSection
} from '../utils/manualGenerator';
import { 
  VideoFrameExtractor, 
  createVideoFromFile, 
  FrameExtractionResult
} from '../utils/videoFrameExtractor';

interface ManualSlideGeneratorProps {
  presentation: Presentation | null;
  onSlidesGenerated: (slides: Slide[]) => void;
  onClose: () => void;
}

type GenerationStep = 'input' | 'processing' | 'preview' | 'complete';

interface ProcessingState {
  step: GenerationStep;
  currentTask: string;
  progress: number;
  sections: ManualSection[];
  frameResults: FrameExtractionResult[];
  generatedSlides: Slide[];
  error?: string;
}

const ManualSlideGenerator: React.FC<ManualSlideGeneratorProps> = ({
  presentation,
  onSlidesGenerated,
  onClose
}) => {
  const [markdownFile, setMarkdownFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [options, setOptions] = useState<ManualGeneratorOptions>(getDefaultManualGeneratorOptions());
  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'input',
    currentTask: '',
    progress: 0,
    sections: [],
    frameResults: [],
    generatedSlides: []
  });

  const markdownInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // File handlers
  const handleMarkdownFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMarkdownFile(file);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMarkdownContent(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleVideoFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  }, []);

  // Generation process
  const handleGenerate = useCallback(async () => {
    if (!markdownContent || !videoFile) return;

    const validation = validateManualGeneratorInput(markdownContent, videoFile);
    if (!validation.valid) {
      setProcessingState(prev => ({ ...prev, error: validation.error }));
      return;
    }

    setProcessingState({
      step: 'processing',
      currentTask: 'Parsing markdown content...',
      progress: 10,
      sections: [],
      frameResults: [],
      generatedSlides: []
    });

    try {
      // Step 1: Parse markdown
      const sections = parseManualMarkdown(markdownContent);
      setProcessingState(prev => ({
        ...prev,
        currentTask: 'Creating video element...',
        progress: 20,
        sections
      }));

      // Step 2: Create video element
      const videoElement = await createVideoFromFile(videoFile);
      const extractor = new VideoFrameExtractor(videoElement);
      
      setProcessingState(prev => ({
        ...prev,
        currentTask: 'Extracting video frames...',
        progress: 30
      }));

      // Step 3: Extract frames for each section
      const frameResults: FrameExtractionResult[] = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section.timestamps.length > 0) {
          setProcessingState(prev => ({
            ...prev,
            currentTask: `Extracting frames for: ${section.title}`,
            progress: 30 + (i / sections.length) * 50
          }));

          // Extract frames for first timestamp in section
          const result = await extractor.extractFrames(section.timestamps[0]);
          frameResults.push(result);
        } else {
          frameResults.push({
            timestamp: 0,
            frames: [],
            success: false,
            error: 'No timestamps found'
          });
        }
      }

      // Step 4: Generate slides
      setProcessingState(prev => ({
        ...prev,
        currentTask: 'Generating slides...',
        progress: 85,
        frameResults
      }));

      const frameGroups = frameResults.map(result => result.frames);
      const generatedSlides = generateSlidesFromSections(sections, frameGroups, options);

      // Step 5: Complete
      setProcessingState(prev => ({
        ...prev,
        step: 'preview',
        currentTask: 'Generation complete!',
        progress: 100,
        generatedSlides
      }));

      // Clean up
      extractor.destroy();
      videoElement.remove();

    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [markdownContent, videoFile, options]);

  const handleConfirm = useCallback(() => {
    if (processingState.generatedSlides.length > 0) {
      onSlidesGenerated(processingState.generatedSlides);
      setProcessingState(prev => ({ ...prev, step: 'complete' }));
    }
  }, [processingState.generatedSlides, onSlidesGenerated]);

  const handleReset = useCallback(() => {
    setMarkdownFile(null);
    setVideoFile(null);
    setMarkdownContent('');
    setOptions(getDefaultManualGeneratorOptions());
    setProcessingState({
      step: 'input',
      currentTask: '',
      progress: 0,
      sections: [],
      frameResults: [],
      generatedSlides: []
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Video size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Manual Slide Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {processingState.step === 'input' && (
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Markdown File */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Manual Markdown File
                  </label>
                  <div 
                    className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 transition-colors"
                    onClick={() => markdownInputRef.current?.click()}
                  >
                    <FileText size={32} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-400">
                      {markdownFile ? markdownFile.name : 'Click to select markdown file'}
                    </p>
                  </div>
                  <input
                    ref={markdownInputRef}
                    type="file"
                    accept=".md,.txt"
                    onChange={handleMarkdownFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Video File */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Video File
                  </label>
                  <div 
                    className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 transition-colors"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video size={32} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-400">
                      {videoFile ? videoFile.name : 'Click to select video file'}
                    </p>
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Settings size={20} />
                  Generation Options
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image Position */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Image Position
                    </label>
                    <select
                      value={options.imagePosition}
                      onChange={(e) => setOptions(prev => ({ ...prev, imagePosition: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={options.aspectRatio}
                      onChange={(e) => setOptions(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                    >
                      <option value="16:9">16:9</option>
                      <option value="4:3">4:3</option>
                      <option value="21:9">21:9</option>
                    </select>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={options.background}
                    onChange={(e) => setOptions(prev => ({ ...prev, background: e.target.value }))}
                    className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Preview Info */}
              {markdownContent && (
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Preview</h4>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>Sections found: {parseManualMarkdown(markdownContent).length}</div>
                    <div>Timestamps found: {parseManualMarkdown(markdownContent).reduce((acc, s) => acc + s.timestamps.length, 0)}</div>
                    {videoFile && <div>Video: {videoFile.name}</div>}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {processingState.error && (
                <div className="bg-red-600/20 border border-red-600 rounded-lg p-4 flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-400" />
                  <span className="text-red-400">{processingState.error}</span>
                </div>
              )}
            </div>
          )}

          {processingState.step === 'processing' && (
            <div className="space-y-6">
              <div className="text-center">
                <Loader2 size={48} className="mx-auto mb-4 text-blue-400 animate-spin" />
                <h3 className="text-lg font-medium text-white mb-2">Generating Slides...</h3>
                <p className="text-slate-400 mb-4">{processingState.currentTask}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingState.progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400 mt-2">{processingState.progress}% complete</p>
              </div>
            </div>
          )}

          {processingState.step === 'preview' && (
            <div className="space-y-6">
              <div className="text-center">
                <Check size={48} className="mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-medium text-white mb-2">Generation Complete!</h3>
                <p className="text-slate-400">
                  Generated {processingState.generatedSlides.length} slides from {processingState.sections.length} sections
                </p>
              </div>

              {/* Slide Preview */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-4">Generated Slides Preview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {processingState.generatedSlides.map((slide, index) => (
                    <div key={slide.id} className="bg-slate-600 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon size={16} className="text-blue-400" />
                        <span className="text-white text-sm font-medium">{slide.title}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {slide.layers.length} layers • {slide.aspectRatio}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {processingState.step === 'complete' && (
            <div className="text-center space-y-4">
              <Check size={48} className="mx-auto text-green-400" />
              <h3 className="text-lg font-medium text-white">Slides Added Successfully!</h3>
              <p className="text-slate-400">
                {processingState.generatedSlides.length} slides have been added to your presentation.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          <div className="flex gap-2">
            {processingState.step === 'input' && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Reset
              </button>
            )}
            {(processingState.step === 'preview' || processingState.step === 'complete') && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Generate New
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              {processingState.step === 'complete' ? 'Done' : 'Cancel'}
            </button>
            
            {processingState.step === 'input' && (
              <button
                onClick={handleGenerate}
                disabled={!markdownContent || !videoFile || processingState.step === 'processing'}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={16} />
                Generate
              </button>
            )}
            
            {processingState.step === 'preview' && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
              >
                <Plus size={16} />
                Add to Presentation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualSlideGenerator;