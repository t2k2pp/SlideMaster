import { getGeminiClient, getAI, getFileManager, getTemperatureForTask, handleGeminiError } from './geminiApiClient';
import { 
  Presentation, 
  Slide, 
  TextLayer, 
  ImageLayer 
} from '../types';
import { 
  THEME_CONFIGS, 
  DEFAULT_LAYER_PROPS, 
  TEXT_STYLES, 
  CANVAS_SIZES
} from '../constants';
import { addPageNumbersToSlides, getRecommendedPageNumberSettings } from '../utils/pageNumbers';
import { createVersionMetadata } from '../utils/versionManager';

// =================================================================
// Gemini Video Analysis Service
// =================================================================

// Video analysis models
const VIDEO_MODELS = {
  'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  'gemini-1.5-pro': 'gemini-1.5-pro',
} as const;

/**
 * Get the current video analysis model from settings
 */
const getVideoAnalysisModel = (): keyof typeof VIDEO_MODELS => {
  try {
    // Try to get from app settings
    const settingsJson = localStorage.getItem('slidemaster_app_settings');
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      const modelFromSettings = settings?.aiModels?.videoAnalysis;
      if (modelFromSettings && modelFromSettings in VIDEO_MODELS) {
        return modelFromSettings as keyof typeof VIDEO_MODELS;
      }
    }
  } catch (error) {
    console.warn('Error reading video analysis model from settings:', error);
  }
  
  // Default fallback
  return 'gemini-2.0-flash-exp';
};

// Note: getAI is now imported from geminiApiClient for consistency

// 動画分析用のプロンプト
const VIDEO_ANALYSIS_PROMPT = `あなたは優秀なマニュアル作成担当者です。ユーザーがアップロードするツールの操作動画を見て、その動画の内容に基づいたマニュアルの文章を作成してください。明確で分かりやすい言葉を使い、ユーザーがツールの操作方法を容易に理解できるように努めてください。必要に応じて、ステップバイステップの手順、ヒント、および一般的な問題のトラブルシューティングを提供してください。

マニュアルは画面のスクリーンショットを後から取りたいので、特に重要な画面の切り替えやスクリーンショットがあるところではタイムラインをまとめてください。

スクリーンショットはあとから切り出しやすいように特定のタイムラインのみ指定してください。

# アウトプットフォーマット
# {大見出し}
## {小見出し}
{動画のキャプチャ案とタイムライン 例: HH:MM:SS}
{箇条書きで説明}

----
# {大見出し}
## {小見出し}
{動画のキャプチャ案とタイムライン 例: HH:MM:SS}
{箇条書きで説明}

---

# 出力例 """

# Creative Studio AI 操作マニュアル

このマニュアルでは、Creative Studio AIを使用してイベントポスターを生成し、編集、保存する基本的な操作方法を説明します。

---

# 1. AIによるクリエイティブ生成

## 1.1. 作成したいクリエイティブのアイデアを入力する
00:01

-  ツールを起動すると、中央にテキストボックスが表示されます。
-  作成したいクリエイティブの内容を具体的にテキストボックスに入力します。動画では「夏祭りのイベントポスターを作成してください。花火大会、出店、神輿に加えて野外Fesがあります。2025年8月14日開催です。第24回ロック祭というタイトルでお願いします。」と入力しています。    

## 1.2. AIによる生成を開始する
01:43

- テキストボックスの下にある「AIで生成する」ボタンをクリックします。
- クリック後、「生成中...」というメッセージが表示され、AIがクリエイティブの生成を開始します。生成には少し時間がかかる場合があります。
    

---

# 2. 生成されたクリエイティブの編集

## 2.1. 編集画面の確認

{動画のキャプチャ案とタイムライン: 01:58}

- **編集画面の構成:**
    
    - **左側:** レイヤーパネルが表示され、背景やテキストなどの各要素を確認・選択できます。
        
    - **中央:** 生成されたクリエイティブのプレビューが表示されます。
        
    - **右側:** アスペクト比の変更やエクスポートのオプションが表示されます。

"""

**重要な指示:**
1. **全てのセクション（## で始まる小見出し）には必ずタイムスタンプを含めてください**
2. **タイムスタンプがない内容は含めないでください**
3. **実際に動画で確認できる操作のみを記載してください**
4. **推測や一般的な説明ではなく、動画に基づいた具体的な内容のみを含めてください**

この形式で、動画の内容を分析して構造化されたマニュアルを作成してください。`;

/**
 * Convert video file to base64
 */
export const convertVideoToBase64 = async (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        // Remove data URL prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert video to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading video file'));
    reader.readAsDataURL(videoFile);
  });
};

/**
 * Extract timeline timestamps from markdown
 */
export const extractTimelineFromMarkdown = (markdown: string): string[] => {
  const matches: string[] = [];
  
  // Japanese format: タイムライン followed by timestamp
  const japaneseTimelineRegex = /(?:タイムライン[：:\s]*)?(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
  let match;
  
  while ((match = japaneseTimelineRegex.exec(markdown)) !== null) {
    let timestamp = match[1];
    
    // Normalize timestamp format - if only MM:SS, assume it's MM:SS
    if (timestamp.split(':').length === 2) {
      const parts = timestamp.split(':');
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      
      if (first <= 59 && second <= 59) {
        timestamp = `00:${timestamp}`;
      }
    }
    
    matches.push(timestamp);
  }
  
  // If no Japanese timestamps found, try to extract from English content
  if (matches.length === 0) {
    console.log('No Japanese timestamps found, attempting to extract from English content...');
    
    // For English content without explicit timestamps, generate them based on content structure
    // Split by paragraphs and generate timestamps every 30 seconds
    const paragraphs = markdown.split('\n\n').filter(p => p.trim().length > 50);
    
    for (let i = 0; i < paragraphs.length && i < 20; i++) { // Limit to 20 timestamps max
      const minutes = Math.floor((i * 30) / 60);
      const seconds = (i * 30) % 60;
      const timestamp = `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      matches.push(timestamp);
    }
    
    console.log(`Generated ${matches.length} timestamps for English content`);
  }
  
  // Remove duplicates and sort
  return [...new Set(matches)].sort();
};

/**
 * Convert timestamp to seconds
 */
export const timestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(':');
  if (parts.length === 2) {
    // MM:SS format
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
};

/**
 * Extract frame from video at specific timestamp
 */
export const extractFrameFromVideo = (videoFile: File, timestamp: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const seconds = timestampToSeconds(timestamp);
      video.currentTime = seconds;
    });
    
    video.addEventListener('seeked', () => {
      try {
        ctx.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    });
    
    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e}`));
    });
    
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Determine if a captured frame is suitable for a slide content using AI
 */
export const isFrameSuitableForSlide = async (
  slideContent: string,
  frameTimestamp: string,
  framePrompt: string,
  userApiKey?: string
): Promise<{ suitable: boolean; reason: string }> => {
  try {
    const ai = getGeminiClient(userApiKey);
    
    const analysisPrompt = `以下のスライド内容と動画フレームの関連性を判断してください：

**スライド内容:**
${slideContent}

**フレーム情報:**
- タイムスタンプ: ${frameTimestamp}
- 内容: ${framePrompt}

**判断基準:**
1. フレームの内容がスライドの説明に適している
2. 時系列的に妥当である
3. ユーザーの理解を助ける

**回答形式:**
{
  "suitable": true/false,
  "reason": "判断理由を簡潔に"
}`;

    const response = await ai.models.generateContent({
      model: getVideoAnalysisModel(),
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text.trim());
    return result;
  } catch (error) {
    console.warn('Frame suitability analysis failed:', error);
    return { suitable: false, reason: 'Analysis failed' };
  }
};

/**
 * Find missing timestamps for slides without matched frames
 */
export const findMissingTimestamps = async (
  videoFile: File,
  slidesWithoutFrames: { index: number; content: string }[],
  userApiKey?: string
): Promise<{ [slideIndex: number]: string }> => {
  if (slidesWithoutFrames.length === 0) return {};
  
  try {
    const ai = getGeminiClient(userApiKey);
    
    const analysisPrompt = `以下のスライド内容について、動画内での該当タイムスタンプを特定してください：

**スライド一覧:**
${slidesWithoutFrames.map((slide, i) => `${i + 1}. ${slide.content.substring(0, 200)}`).join('\n\n')}

**回答形式 (HH:MM:SS):**
{
  ${slidesWithoutFrames.map((slide, i) => `"${slide.index}": "HH:MM:SS"`).join(',\n  ')}
}

見つからない場合は "00:00:00" を返してください。`;

    // Note: This would require re-uploading the video
    // For now, we'll implement a placeholder that returns empty
    console.log('Additional timestamp analysis would require video re-upload');
    return {};
    
  } catch (error) {
    console.warn('Missing timestamp analysis failed:', error);
    return {};
  }
};

/**
 * Analyze video with Gemini and generate markdown
 */
export const analyzeVideoWithGemini = async (
  videoFile: File,
  userApiKey?: string,
  customPrompt?: string
): Promise<string> => {
  try {
    const ai = getGeminiClient(userApiKey);
    
    // Convert video to base64
    console.log('Converting video to base64...');
    const base64Data = await convertVideoToBase64(videoFile);
    
    // Use custom prompt (from scenario) or default, with mandatory Japanese output  
    const basePrompt = customPrompt || VIDEO_ANALYSIS_PROMPT;
    console.log('Using prompt type:', customPrompt ? 'scenario-specific' : 'default');
    console.log('Prompt length:', basePrompt.length);
    const prompt = `あなたは日本語で回答する必要があります。以下の指示に従って、100%日本語で回答してください。

**重要：以下の出力形式は絶対に禁止です：**
❌ JSON形式（コードブロック形式）
❌ 英語での記述
❌ {"box_2d": ...} のような構造化データ
❌ [{"label": ...}] のような配列形式

**必須出力形式：**
✅ 日本語マニュアル形式のみ
✅ # 大見出し（例：# イベント概要）
✅ ## 小見出し（例：## 開会式）
✅ タイムスタンプ付き内容（例：00:30）
✅ 箇条書き説明（例：- 校長先生が挨拶）

${basePrompt}

**出力例：**
# イベント記録マニュアル
## 1. オープニング
00:00
- 学校の外観が映される
- ナレーションでイベントの説明

## 2. 主要シーン
00:30
- 生徒たちが登場
- 元気よく挨拶

**この形式で必ず出力してください。JSON形式は一切使用禁止です。**`;
    
    console.log('Analyzing video with Gemini...');
    console.log('Model being used:', getVideoAnalysisModel());
    console.log('Prompt being sent (first 200 chars):', prompt.substring(0, 200));
    
    // Generate content with video and prompt
    const response = await ai.models.generateContent({
      model: getVideoAnalysisModel(),
      systemInstruction: {
        parts: [
          { 
            text: "あなたは日本語マニュアル作成の専門家です。動画を分析して必ず以下の形式で日本語のマニュアルを作成してください：\n\n# 見出し\n## 小見出し\n00:00\n- 箇条書き\n\nJSON形式、英語、コードブロックは絶対に使用禁止です。" 
          }
        ]
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: videoFile.type
              }
            }
          ]
        }
      ],
      config: {
        temperature: getTemperatureForTask('video_analysis'),
        maxOutputTokens: 8192
      }
    });

    const markdown = response.text.trim();
    console.log('Video analysis completed. Markdown length:', markdown.length);
    console.log('Markdown preview (first 300 chars):', markdown.substring(0, 300));
    
    // Validate the response format
    if (!markdown || markdown.length < 100) {
      throw new Error('Generated markdown is too short or empty');
    }
    
    // Check for unwanted JSON format
    if (markdown.includes('{"') || markdown.includes('[{')) {
      console.warn('Response contains JSON format, attempting to extract markdown portion...');
      // Try to extract just the markdown part
      const lines = markdown.split('\n');
      const markdownLines = lines.filter(line => 
        !line.trim().startsWith('{') && 
        !line.trim().startsWith('[') &&
        !line.trim().startsWith('"')
      );
      const cleanMarkdown = markdownLines.join('\n').trim();
      
      if (cleanMarkdown.length > 100) {
        return cleanMarkdown;
      } else {
        throw new Error('Unable to extract valid markdown from response');
      }
    }
    
    return markdown;
    
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    throw handleGeminiError(error, 'Video Analysis');
  }
};

/**
 * Convert JSON to manual format (legacy function)
 */
function convertJsonToManualFormat(jsonOutput: string): string {
  try {
    // If it's already in markdown format, return as is
    if (!jsonOutput.includes('{') && !jsonOutput.includes('[')) {
      return jsonOutput;
    }
    
    // Try to parse as JSON and convert to markdown
    const parsed = JSON.parse(jsonOutput);
    
    if (Array.isArray(parsed)) {
      // Handle array of sections
      return parsed.map((section: any, index: number) => {
        const title = section.title || section.heading || `Section ${index + 1}`;
        const content = section.content || section.description || '';
        const timestamp = section.timestamp || section.time || '00:00';
        
        return `## ${title}\n${timestamp}\n\n${content}`;
      }).join('\n\n---\n\n');
    } else if (parsed.sections) {
      // Handle object with sections
      return parsed.sections.map((section: any, index: number) => {
        const title = section.title || `Section ${index + 1}`;
        const content = section.content || '';
        const timestamp = section.timestamp || '00:00';
        
        return `## ${title}\n${timestamp}\n\n${content}`;
      }).join('\n\n---\n\n');
    }
    
    // Fallback: return as is
    return jsonOutput;
    
  } catch (error) {
    // If JSON parsing fails, assume it's already markdown
    console.log('JSON parsing failed, treating as markdown:', error);
    return jsonOutput;
  }
}

/**
 * Generate slides from video analysis
 */
export const generateSlidesFromVideo = async (
  videoFile: File,
  generationOptions: {
    theme: string;
    aspectRatio: string;
    includeImages: boolean;
    autoSlideCount: boolean;
    slideCount: number;
  },
  userApiKey?: string,
  customPrompt?: string
): Promise<{ markdown: string; presentation: Presentation }> => {
  try {
    console.log('Starting video analysis and slide generation...');
    console.log('Video file:', videoFile.name, 'Size:', videoFile.size, 'Type:', videoFile.type);
    console.log('Generation options:', generationOptions);

    // Step 1: Analyze video and generate markdown
    console.log('Step 1: Analyzing video with Gemini...');
    const markdown = await analyzeVideoWithGemini(videoFile, userApiKey, customPrompt);
    
    if (!markdown || markdown.trim().length === 0) {
      throw new Error('Video analysis returned empty content');
    }
    
    console.log('Video analysis completed successfully');
    console.log('Generated markdown length:', markdown.length);

    // Step 2: Extract timeline information
    console.log('Step 2: Extracting timeline information...');
    const timelineData = extractTimelineFromMarkdown(markdown);
    console.log('Extracted timestamps:', timelineData);

    // Step 3: Generate base slides from markdown content
    console.log('Step 3: Converting markdown to slides...');
    
    // Split markdown into sections
    const sections = markdown.split(/(?=^##\s)/m).filter(section => section.trim().length > 0);
    
    let actualSlideCount = generationOptions.autoSlideCount 
      ? Math.min(Math.max(sections.length, 3), 20) 
      : generationOptions.slideCount;

    console.log(`Creating ${actualSlideCount} slides from ${sections.length} sections`);

    // Create slides from sections
    const baseSlides: Slide[] = sections.slice(0, actualSlideCount).map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.replace(/^##\s*/, '') || `Slide ${index + 1}`;
      const content = lines.slice(1).join('\n').trim();

      const slide: Slide = {
        id: `slide-${index + 1}`,
        title: title,
        layers: [],
        background: THEME_CONFIGS[generationOptions.theme as keyof typeof THEME_CONFIGS]?.backgroundColor || THEME_CONFIGS.professional.backgroundColor,
        aspectRatio: generationOptions.aspectRatio as '16:9' | '4:3' | '1:1' | '9:16' | '3:4',
        notes: '',
      };

      // Add title layer
      const titleLayer: TextLayer = {
        ...DEFAULT_LAYER_PROPS,
        id: `title-${index + 1}`,
        type: 'text',
        x: 50,
        y: 50,
        width: CANVAS_SIZES[generationOptions.aspectRatio as keyof typeof CANVAS_SIZES].width - 100,
        height: 80,
        content: title,
        fontSize: TEXT_STYLES.title.fontSize,
        fontFamily: TEXT_STYLES.title.fontFamily,
        fontWeight: TEXT_STYLES.title.fontWeight,
        textStyleId: 'title',
        textColor: THEME_CONFIGS[generationOptions.theme as keyof typeof THEME_CONFIGS]?.textColor || THEME_CONFIGS.professional.textColor,
        textAlign: 'center',
        zIndex: 1
      };
      slide.layers.push(titleLayer);

      // Add content layer
      const contentLayer: TextLayer = {
        ...DEFAULT_LAYER_PROPS,
        id: `content-${index + 1}`,
        type: 'text',
        x: 50,
        y: 150,
        width: CANVAS_SIZES[generationOptions.aspectRatio as keyof typeof CANVAS_SIZES].width - 100,
        height: CANVAS_SIZES[generationOptions.aspectRatio as keyof typeof CANVAS_SIZES].height - 200,
        content: content,
        fontSize: TEXT_STYLES.body.fontSize,
        fontFamily: TEXT_STYLES.body.fontFamily,
        fontWeight: TEXT_STYLES.body.fontWeight,
        textStyleId: 'body',
        textColor: THEME_CONFIGS[generationOptions.theme as keyof typeof THEME_CONFIGS]?.textColor || THEME_CONFIGS.professional.textColor,
        textAlign: 'left',
        zIndex: 2
      };
      slide.layers.push(contentLayer);

      return slide;
    });

    // Step 4: Add frame images if requested
    console.log('Step 4: Processing frame extraction and image addition...');
    const slidesWithImages = await Promise.all(baseSlides.map(async (slide, index) => {
      if (generationOptions.includeImages && timelineData.length > index) {
        try {
          const timestamp = timelineData[index];
          console.log(`Extracting frame at ${timestamp} for slide ${index + 1}`);
          
          const frameData = await extractFrameFromVideo(videoFile, timestamp);
          
          if (frameData) {
            const imageLayer: ImageLayer = {
              ...DEFAULT_LAYER_PROPS,
              id: `frame-${index + 1}`,
              type: 'image',
              x: CANVAS_SIZES[generationOptions.aspectRatio as keyof typeof CANVAS_SIZES].width - 350,
              y: 150,
              width: 300,
              height: 200,
              src: frameData,
              prompt: `Frame from video at ${timestamp}`,
              objectFit: 'cover',
              zIndex: 3
            };
            
            slide.layers.push(imageLayer);
            
            // Adjust content layer width to make room for image
            const contentLayer = slide.layers.find(layer => layer.id.startsWith('content-')) as TextLayer;
            if (contentLayer) {
              contentLayer.width = CANVAS_SIZES[generationOptions.aspectRatio as keyof typeof CANVAS_SIZES].width - 400;
            }
          }
        } catch (error) {
          console.warn(`Failed to extract frame for slide ${index + 1}:`, error);
        }
      }
      
      return slide;
    }));
    
    const slidesWithImagesCount = slidesWithImages.filter(slide => 
      slide.layers.some(layer => layer.type === 'image')
    ).length;
    
    console.log(`Final result: ${slidesWithImagesCount} slides have images out of ${slidesWithImages.length} total slides`);
    
    // Step 5: Create slide source
    const slideSource = {
      id: `source-${Date.now()}`,
      type: 'video_analysis' as const,
      createdAt: new Date(),
      name: `Video Analysis - ${videoFile.name}`,
      content: markdown,
      metadata: {
        videoAnalysisResult: markdown,
        analysisPrompt: customPrompt || VIDEO_ANALYSIS_PROMPT,
        videoFileName: videoFile.name,
        generationMethod: 'docs_auto_generate'
      }
    };
    
    // Create generation history
    const historyItem = {
      method: 'video_analysis' as const,
      timestamp: new Date(),
      sourceId: slideSource.id,
      parameters: {
        videoFileName: videoFile.name,
        videoSize: videoFile.size,
        videoType: videoFile.type,
        customPrompt: customPrompt || null
      }
    };
    
    // Create presentation object
    const versionMetadata = createVersionMetadata();
    const presentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: `Video Analysis - ${videoFile.name}`,
      description: `Generated from video analysis of ${videoFile.name}`,
      theme: generationOptions.theme,
      slides: slidesWithImages,
      settings: {
        defaultBackground: generationOptions.theme === 'custom' ? generationOptions.background : THEME_CONFIGS[generationOptions.theme as keyof typeof THEME_CONFIGS]?.backgroundColor || THEME_CONFIGS.professional.backgroundColor,
        defaultAspectRatio: generationOptions.aspectRatio,
        autoSave: true,
        snapToGrid: true,
        showGrid: false,
        pageNumbers: getRecommendedPageNumberSettings('tutorial', baseSlides.length),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: versionMetadata.version,
      createdWith: versionMetadata.createdWith,
      lastModifiedWith: versionMetadata.lastModifiedWith,
      compatibilityNotes: versionMetadata.compatibilityNotes,
      sources: [slideSource],
      generationHistory: [historyItem]
    };
    
    return { markdown, presentation };
    
  } catch (error) {
    console.error('Error generating slides from video:', error);
    throw handleGeminiError(error, 'Video Slide Generation');
  }
};