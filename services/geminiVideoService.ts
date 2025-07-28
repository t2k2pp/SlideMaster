import { getGeminiClient, getAI, getFileManager, getTemperatureForTask, handleGeminiError } from './geminiApiClient';
import { aiHistory, calculateEstimatedCost } from './aiInteractionHistoryService';
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

// 動画用途に応じたプロンプト生成
const getVideoAnalysisPrompt = (purpose: string) => {
  const prompts = {
    'tutorial_guide': `あなたは操作手順書作成の専門家です。動画を分析して、明確で分かりやすい操作手順を作成してください。初心者でも理解できるよう、具体的なステップごとに説明してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際のツール名や操作内容をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際のツール・システム名} 操作手順
## {具体的な操作ステップタイトル}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 実行する操作の詳細説明
- 注意事項やポイント
- 期待される結果`,

    'corporate_presentation': `あなたは企業向けプレゼンテーション作成の専門家です。動画を分析して、ビジネス向けの報告書やプレゼンテーション資料を作成してください。要点を整理し、意思決定に必要な情報を明確に提示してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際のプロジェクト名や内容をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際のプロジェクト・テーマ名}
## {具体的な重要ポイント・段階}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 主要な内容・成果
- 数値データ・実績
- 今後の課題・提案`,

    'educational_content': `あなたは教育コンテンツ作成の専門家です。動画を分析して、学習効果を最大化する教材を作成してください。学習目標を明確にし、理解しやすい順序で構成してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- 「教材を作成します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際の学習テーマや内容をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際の学習テーマ・コース名}
## {具体的な学習項目・概念}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 核心となる学習内容
- 具体例・実演内容
- 理解度チェックポイント`,

    'event_announcement': `あなたはイベント記録の専門家です。動画を分析して、イベントの魅力と価値を伝える記録を作成してください。参加者の体験や感動、イベントのハイライトを生き生きと表現してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、イベントの実際の名前や内容をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット  
# {実際のイベント名・催し物名}
## {具体的な場面・プログラム名}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- イベントの様子・雰囲気
- 参加者の反応・体験
- 印象的な瞬間・成果`,

    'business_process': `あなたはビジネスプロセス分析の専門家です。動画を分析して、業務フローや商談プロセスを体系的にまとめてください。効率化や改善点も含めて整理してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際の業務名やプロセス名をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際の業務・プロセス名}
## {具体的な工程・段階}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 実行内容・手順
- 関係者・責任者
- 成果物・次工程への引き継ぎ`,

    'marketing_content': `あなたはマーケティングコンテンツ作成の専門家です。動画を分析して、商品・サービスの魅力を効果的に伝える内容を作成してください。顧客の関心を引く構成を心がけてください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際の商品名やサービス名をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際の商品・サービス・キャンペーン名}
## {具体的な特徴・メリット}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 主要な価値提案
- 使用場面・効果
- 顧客へのメッセージ`,

    'technical_documentation': `あなたは技術文書作成の専門家です。動画を分析して、技術者向けの詳細なドキュメントを作成してください。実装方法や技術仕様を正確に記録してください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際の技術名やシステム名をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際の技術・システム名}
## {具体的な機能・実装項目}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 技術的詳細・仕様
- 実装手順・設定方法
- 注意事項・トラブルシューティング`,

    'creative_showcase': `あなたはクリエイティブ作品紹介の専門家です。動画を分析して、創作過程や作品の魅力を表現豊かに紹介してください。創造性やアーティスティックな価値を大切にしてください。

【絶対禁止】以下の表現は使用しないでください：
- 「マニュアル」
- 「承知いたしました」 
- 「作成します」
- 「分析します」
- その他、あなたの作業に関する言及

【必須】動画の内容そのものに集中し、実際の作品名やプロジェクト名をタイトルにしてください。

重要: 各セクションには必ず動画の該当タイムスタンプ（HH:MM:SS形式）を含めてください。

# アウトプットフォーマット
# {実際の作品・プロジェクト名}
## {具体的な制作段階・表現技法}
{動画のキャプチャ案とタイムライン HH:MM:SS}
- 創作意図・コンセプト
- 技法・手法の特徴
- 表現効果・作品の価値`
  };

  return prompts[purpose] || prompts['tutorial_guide'];
};

/**
 * Convert video file to base64
 */
export const convertVideoToBase64 = async (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!videoFile) {
      reject(new Error('No video file provided'));
      return;
    }
    
    if (videoFile.size === 0) {
      reject(new Error('Video file is empty'));
      return;
    }
    
    // Note: File size limits are handled by Gemini API itself
    
    console.log(`Converting video to base64: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        if (reader.result && typeof reader.result === 'string') {
          // Check if result contains comma (data URL format)
          if (!reader.result.includes(',')) {
            reject(new Error('Invalid data URL format from FileReader'));
            return;
          }
          
          // Remove data URL prefix (data:video/mp4;base64,)
          const base64 = reader.result.split(',')[1];
          
          if (!base64 || base64.length === 0) {
            reject(new Error('Empty base64 data after conversion'));
            return;
          }
          
          console.log(`Base64 conversion successful: ${(base64.length / 1024).toFixed(2)}KB`);
          resolve(base64);
        } else {
          reject(new Error(`Failed to convert video to base64: reader.result is ${typeof reader.result}`));
        }
      } catch (error) {
        reject(new Error(`Error processing FileReader result: ${error}`));
      }
    };
    
    reader.onerror = (event) => {
      console.error('FileReader error:', event);
      reject(new Error(`Error reading video file: ${reader.error?.message || 'Unknown FileReader error'}`));
    };
    
    reader.onabort = () => {
      reject(new Error('Video file reading was aborted'));
    };
    
    try {
      reader.readAsDataURL(videoFile);
    } catch (error) {
      reject(new Error(`Failed to start reading video file: ${error}`));
    }
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
    
    // Enhanced video format checking
    const supportedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const fileExtension = videoFile.name.toLowerCase().split('.').pop();
    
    console.log(`Video file info: Name=${videoFile.name}, Type=${videoFile.type}, Size=${videoFile.size} bytes, Extension=${fileExtension}`);
    
    // Check if video type is supported by this browser
    const video_test = document.createElement('video');
    const canPlayType = video_test.canPlayType(videoFile.type);
    console.log(`Browser can play ${videoFile.type}: ${canPlayType}`);
    
    if (canPlayType === '' && !['mp4', 'webm', 'ogg'].includes(fileExtension || '')) {
      reject(new Error(`Unsupported video format: ${videoFile.type || 'unknown'}. Supported formats: MP4 (H.264), WebM, OGG. Your file: ${fileExtension}`));
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
    };
    
    video.addEventListener('loadedmetadata', () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const seconds = timestampToSeconds(timestamp);
        if (seconds > video.duration) {
          cleanup();
          reject(new Error(`Timestamp ${timestamp} exceeds video duration ${video.duration}s`));
          return;
        }
        
        video.currentTime = seconds;
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to set video currentTime: ${error}`));
      }
    });
    
    video.addEventListener('seeked', () => {
      try {
        ctx.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(dataURL);
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to draw video frame: ${error}`));
      }
    });
    
    video.addEventListener('error', (e: Event) => {
      cleanup();
      const target = e.target as HTMLVideoElement;
      const errorCode = target.error?.code;
      const errorMessage = target.error?.message;
      
      let detailedError = `Video loading error - Code: ${errorCode}, Message: ${errorMessage}, File: ${videoFile.name}, Size: ${videoFile.size} bytes`;
      
      // Provide specific solutions based on error code
      switch (errorCode) {
        case 1: // MEDIA_ERR_ABORTED
          detailedError += '\n解決策: 動画読み込みが中断されました。再試行してください。';
          break;
        case 2: // MEDIA_ERR_NETWORK  
          detailedError += '\n解決策: ネットワークエラーです。インターネット接続を確認してください。';
          break;
        case 3: // MEDIA_ERR_DECODE
          detailedError += '\n解決策: 動画ファイルが破損している可能性があります。別のファイルを試すか、動画を再エンコードしてください。';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          detailedError += '\n解決策: この動画形式はサポートされていません。以下の方法を試してください：\n';
          detailedError += '• HandBrake、FFmpeg等でH.264コーデック + MP4形式に変換\n';
          detailedError += '• WebM形式(VP8/VP9)に変換\n';
          detailedError += '• Chrome、Firefox、Edge等のモダンブラウザを使用';
          break;
        default:
          detailedError += '\n解決策: 不明なエラーです。ブラウザを更新するか、別の動画ファイルを試してください。';
      }
      
      reject(new Error(detailedError));
    });
    
    video.addEventListener('abort', () => {
      cleanup();
      reject(new Error('Video loading aborted'));
    });
    
    // Set timeout for video loading
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Video loading timeout after 10 seconds'));
    }, 10000);
    
    // Set video properties for better compatibility
    video.preload = 'metadata';
    video.muted = true;
    video.crossOrigin = 'anonymous';
    
    try {
      video.src = URL.createObjectURL(videoFile);
    } catch (error) {
      cleanup();
      reject(new Error(`Failed to create object URL: ${error}`));
    }
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
  generationOptions: { scenario?: string },
  userApiKey?: string,
  customPrompt?: string
): Promise<string> => {
  // Start AI interaction history recording
  const interactionId = aiHistory.startInteraction(
    'video_analysis',
    'gemini',
    'gemini-2.0-flash', // Default video analysis model
    {
      prompt: customPrompt || `Analyze video for ${generationOptions.scenario || 'general'} purpose`,
      context: `Video: ${videoFile.name}, Size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
      settings: {
        scenario: generationOptions.scenario,
        fileName: videoFile.name,
        fileSize: videoFile.size,
        customPrompt
      }
    }
  );

  try {
    const ai = getGeminiClient(userApiKey);
    
    // Convert video to base64
    console.log('Converting video to base64...');
    const base64Data = await convertVideoToBase64(videoFile);
    
    // Use custom prompt (from scenario) or default, with mandatory Japanese output  
    // Map scenario to purpose for prompt selection
    const scenarioToPurposeMap = {
      'manual': 'tutorial_guide',
      'corporate': 'corporate_presentation', 
      'education': 'educational_content',
      'event': 'event_announcement',
      'business': 'business_process',
      'marketing': 'marketing_content',
      'technical': 'technical_documentation',
      'creative': 'creative_showcase'
    };
    
    console.log('Selected scenario:', generationOptions.scenario, '-> Purpose:', scenarioToPurposeMap[generationOptions.scenario as keyof typeof scenarioToPurposeMap]);
    
    const purpose = scenarioToPurposeMap[generationOptions.scenario as keyof typeof scenarioToPurposeMap] || 'tutorial_guide';
    const basePrompt = customPrompt || getVideoAnalysisPrompt(purpose);
    console.log('Using prompt type:', customPrompt ? 'scenario-specific' : 'default');
    console.log('Prompt length:', basePrompt.length);
    const prompt = `あなたは日本語で回答する必要があります。以下の指示に従って、100%日本語で回答してください。

**重要：以下の出力形式は絶対に禁止です：**
❌ JSON形式（コードブロック形式）
❌ 英語での記述
❌ {"box_2d": ...} のような構造化データ
❌ [{"label": ...}] のような配列形式

**必須出力形式：**
✅ 日本語による構造化された文書形式のみ
✅ # 大見出し（例：# メインタイトル）
✅ ## 小見出し（例：## 場面・段階）
✅ タイムスタンプ付き内容（例：00:30）
✅ 箇条書き説明（例：- 詳細な説明）

**重要な注意事項：**
・「マニュアル」「承知いたしました」「作成します」などの表現は絶対に使用しないでください
・動画の内容そのものに焦点を当て、直接的でわかりやすいタイトルを使用してください
・あなたの作業について言及せず、動画の内容のみを記述してください

${basePrompt}

**正しい出力例：**
# [動画の実際の内容に基づいたタイトル]
## [動画で確認できる場面名]
00:00
- [実際に映っている内容]
- [観察できる詳細]

## [次の場面名]
02:30
- [その場面の内容]
- [参加者や関係者の様子]

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
    
    // Record successful completion
    aiHistory.completeInteraction(
      interactionId,
      {
        content: `Video analysis completed: ${markdown.substring(0, 200)}...`,
        metadata: {
          contentType: 'video_analysis',
          modelUsed: 'gemini-2.0-flash',
          quality: 1.0,
          videoSeconds: Math.floor(videoFile.size / 1024 / 1024) // Rough estimate
        }
      },
      calculateEstimatedCost('gemini', 'gemini-2.0-flash', 1000, 2000, 0, Math.floor(videoFile.size / 1024 / 1024))
    );

    return markdown;
    
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    
    // Record error
    aiHistory.recordError(interactionId, {
      code: 'VIDEO_ANALYSIS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown video analysis error',
      details: error
    });
    
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
 * Check video file compatibility with browser
 */
export const checkVideoCompatibility = (videoFile: File): Promise<{compatible: boolean, details: string}> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const fileExtension = videoFile.name.toLowerCase().split('.').pop();
    
    // Basic format check
    const canPlayType = video.canPlayType(videoFile.type);
    
    if (canPlayType === 'probably' || canPlayType === 'maybe') {
      resolve({
        compatible: true,
        details: `✅ Format supported: ${videoFile.type} (${canPlayType})`
      });
      return;
    }
    
    // Detailed compatibility check
    let details = `⚠️ Format: ${videoFile.type || 'unknown'} (Extension: ${fileExtension})\n`;
    details += `Browser support: ${canPlayType || 'none'}\n\n`;
    details += `推奨対応方法:\n`;
    details += `• HandBrakeでH.264 + MP4に変換\n`;
    details += `• FFmpeg使用: ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4\n`;
    details += `• WebM形式への変換も可能`;
    
    resolve({
      compatible: canPlayType !== '',
      details: details
    });
  });
};

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
    scenario?: string;
  },
  userApiKey?: string,
  customPrompt?: string
): Promise<{ markdown: string; presentation: Presentation }> => {
  try {
    console.log('Starting video analysis and slide generation...');
    console.log('Video file:', videoFile.name, 'Size:', videoFile.size, 'Type:', videoFile.type);
    console.log('Generation options:', generationOptions);

    // Map scenario to purpose for consistent processing
    const scenarioToPurposeMap = {
      'manual': 'tutorial_guide',
      'corporate': 'corporate_presentation', 
      'education': 'educational_content',
      'event': 'event_announcement',
      'business': 'business_process',
      'marketing': 'marketing_content',
      'technical': 'technical_documentation',
      'creative': 'creative_showcase'
    };
    
    const purpose = scenarioToPurposeMap[generationOptions.scenario as keyof typeof scenarioToPurposeMap] || 'tutorial_guide';
    console.log('Mapped purpose:', purpose);

    // Step 1: Analyze video and generate markdown
    console.log('Step 1: Analyzing video with Gemini...');
    const markdown = await analyzeVideoWithGemini(videoFile, generationOptions, userApiKey, customPrompt);
    
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
        id: `title-${index + 1}`,
        type: 'text',
        x: 10,
        y: 15,
        width: 80,
        height: 20,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
        content: title,
        fontSize: DEFAULT_LAYER_PROPS.text.fontSize,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        textStyleId: DEFAULT_LAYER_PROPS.text.textStyleId,
        textColor: THEME_CONFIGS[generationOptions.theme as keyof typeof THEME_CONFIGS]?.textColor || THEME_CONFIGS.professional.textColor,
        textAlign: DEFAULT_LAYER_PROPS.text.textAlign
      };
      slide.layers.push(titleLayer);

      // Add content layer
      const contentLayer: TextLayer = {
        id: `content-${index + 1}`,
        type: 'text',
        x: 10,
        y: 40,
        width: 80,
        height: 50,
        rotation: 0,
        opacity: 1,
        zIndex: 2,
        content: content,
        fontSize: 16,
        fontFamily: '"Inter", sans-serif',
        fontWeight: 400,
        textStyleId: 'professional-dark',
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
        const timestamp = timelineData[index];
        console.log(`Processing images for slide ${index + 1} at timestamp ${timestamp}`);
        
        // Extract main timeline frame with enhanced error handling
        let hasMainImage = false;
        try {
          console.log(`Extracting main frame at ${timestamp} for slide ${index + 1}`);
          const mainFrameData = await extractFrameFromVideo(videoFile, timestamp);
          
          if (mainFrameData) {
            const mainImageLayer: ImageLayer = {
              id: `main-frame-${index + 1}`,
              type: 'image',
              x: 60,
              y: 30,
              width: 35,
              height: 40,
              rotation: 0,
              opacity: 1,
              zIndex: 3,
              src: mainFrameData,
              prompt: `Main frame from video at ${timestamp}`,
              objectFit: DEFAULT_LAYER_PROPS.image.objectFit
            };
            
            slide.layers.push(mainImageLayer);
            hasMainImage = true;
            console.log(`✅ Added main frame for slide ${index + 1}`);
            
            // Adjust content layer width to make room for image
            const contentLayer = slide.layers.find(layer => layer.id.startsWith('content-')) as TextLayer;
            if (contentLayer) {
              contentLayer.width = 50; // Adjust width percentage for text
            }
          }
        } catch (error) {
          console.error(`❌ Failed to extract main frame for slide ${index + 1}:`, error);
          
          // Add error information to slide notes for user reference
          if (!slide.notes) slide.notes = '';
          slide.notes += `\n⚠️ 画像抽出エラー (${timestamp}): ${error.message}`;
        }
        
        // Extract 2 additional alternative frames (±5 seconds from main timestamp)
        const alternativeOffsets = [-5, 5]; // seconds before and after main timestamp
        
        for (let altIndex = 0; altIndex < alternativeOffsets.length; altIndex++) {
          try {
            const offset = alternativeOffsets[altIndex];
            const baseSeconds = timestampToSeconds(timestamp);
            const altSeconds = Math.max(0, baseSeconds + offset);
            const altTimestamp = `${Math.floor(altSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((altSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(altSeconds % 60).toString().padStart(2, '0')}`;
            
            console.log(`Extracting alternative frame ${altIndex + 1} at ${altTimestamp} for slide ${index + 1}`);
            const altFrameData = await extractFrameFromVideo(videoFile, altTimestamp);
            
            if (altFrameData) {
              const altImageLayer: ImageLayer = {
                id: `alt-frame-${index + 1}-${altIndex + 1}`,
                type: 'image',
                x: 5 + (altIndex * 20), // Position alternatives to the left
                y: 70,
                width: 15,
                height: 20,
                rotation: 0,
                opacity: 0.8,
                zIndex: 2,
                src: altFrameData,
                prompt: `Alternative frame ${altIndex + 1} from video at ${altTimestamp}`,
                objectFit: DEFAULT_LAYER_PROPS.image.objectFit
              };
              
              slide.layers.push(altImageLayer);
              console.log(`Added alternative frame ${altIndex + 1} for slide ${index + 1}`);
            }
          } catch (error) {
            console.warn(`Failed to extract alternative frame ${altIndex + 1} for slide ${index + 1}:`, error);
          }
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
        analysisPrompt: customPrompt || getVideoAnalysisPrompt(purpose),
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