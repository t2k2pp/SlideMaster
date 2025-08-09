// =================================================================
// Azure Video Service - ビデオ分析サービス
// Azure OpenAI GPT-4 Visionを使用したビデオ分析
// =================================================================

import { AzureOpenAIClient } from './azureOpenAIClient';
import { AzureOpenAIConfig, AzureVideoAnalysisRequest } from './azureOpenAIConfig';

export interface VideoAnalysisOptions {
  videoData: string;  // base64エンコードされた動画データ
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  analysisType?: 'content' | 'presentation' | 'educational' | 'marketing';
}

export interface SlideVideoAnalysis {
  summary: string;
  keyPoints: string[];
  suggestedSlides: number;
  topics: string[];
  presentationStyle: string;
  targetAudience: string;
  duration: string;
  qualityAssessment: {
    audioQuality: string;
    visualQuality: string;
    contentClarity: string;
    engagement: string;
  };
}

export class AzureVideoService {
  private client: AzureOpenAIClient;

  constructor(config: AzureOpenAIConfig) {
    this.client = new AzureOpenAIClient(config);
  }

  async analyzeVideo(options: VideoAnalysisOptions): Promise<string> {
    const request: AzureVideoAnalysisRequest = {
      videoData: options.videoData,
      prompt: options.prompt || 'Analyze this video and describe what you see.',
      maxTokens: options.maxTokens,
      temperature: options.temperature
    };

    return this.client.analyzeVideo(request);
  }

  async analyzeForSlideGeneration(options: VideoAnalysisOptions): Promise<SlideVideoAnalysis> {
    const analysisPrompt = `Analyze this video for creating a presentation. Please provide a comprehensive analysis in JSON format with the following structure:

{
  "summary": "Brief summary of the video content",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "suggestedSlides": "number of recommended slides",
  "topics": ["topic 1", "topic 2", "topic 3"],
  "presentationStyle": "description of appropriate presentation style",
  "targetAudience": "description of target audience",
  "duration": "estimated presentation duration",
  "qualityAssessment": {
    "audioQuality": "assessment of audio quality",
    "visualQuality": "assessment of visual quality", 
    "contentClarity": "assessment of content clarity",
    "engagement": "assessment of engagement level"
  }
}

Focus on extracting actionable insights that can be used to create effective presentation slides.`;

    const result = await this.analyzeVideo({
      ...options,
      prompt: analysisPrompt,
      maxTokens: 2048,
      temperature: 0.3
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      // JSONパースに失敗した場合のフォールバック
      return this.parseAnalysisText(result);
    }
  }

  async extractKeyMoments(options: VideoAnalysisOptions): Promise<string[]> {
    const prompt = `Analyze this video and identify the key moments or important segments that would be valuable for creating presentation slides. 

For each key moment, provide:
1. Timestamp (if visible)
2. Brief description of what's happening
3. Why this moment is important for a presentation
4. Suggested slide content based on this moment

Format the response as a numbered list of key moments.`;

    const result = await this.analyzeVideo({
      ...options,
      prompt,
      maxTokens: 1536,
      temperature: 0.4
    });

    return result.split('\n').filter(line => line.trim().length > 0);
  }

  async generateSlideContentFromVideo(options: VideoAnalysisOptions, slideCount: number = 5): Promise<string> {
    const prompt = `Based on this video, create content for ${slideCount} presentation slides. 

For each slide, provide:
- Slide title
- Main points (3-5 bullet points)
- Supporting details
- Suggested visuals or images

Format the response in Markdown with clear slide separations. Focus on the most important and engaging content from the video.

The slides should be:
- Logically ordered
- Engaging and informative
- Suitable for the target audience
- Actionable where appropriate`;

    return this.analyzeVideo({
      ...options,
      prompt,
      maxTokens: 3072,
      temperature: 0.6
    });
  }

  async assessPresentationQuality(options: VideoAnalysisOptions): Promise<{
    strengths: string[];
    improvements: string[];
    overallScore: number;
    recommendations: string[];
  }> {
    const prompt = `Analyze this video as a presentation and provide a quality assessment. Evaluate:

1. Content quality and structure
2. Delivery and speaking style
3. Visual elements and aids
4. Audience engagement
5. Overall effectiveness

Provide your assessment in JSON format:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement area 1", "improvement area 2", "improvement area 3"],
  "overallScore": "score from 1-10",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Be constructive and specific in your feedback.`;

    const result = await this.analyzeVideo({
      ...options,
      prompt,
      maxTokens: 1536,
      temperature: 0.4
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        strengths: ['Content analysis completed'],
        improvements: ['Unable to parse detailed analysis'],
        overallScore: 5,
        recommendations: ['Please review the raw analysis for detailed feedback']
      };
    }
  }

  async transcribeAndSummarize(options: VideoAnalysisOptions): Promise<{
    transcript: string;
    summary: string;
    keyQuotes: string[];
  }> {
    const prompt = `Please analyze this video and provide:

1. A transcript of the spoken content (if any audio is present)
2. A concise summary of the main content
3. Key quotes or important statements

Format your response as JSON:
{
  "transcript": "transcribed text here",
  "summary": "summary of main content",
  "keyQuotes": ["quote 1", "quote 2", "quote 3"]
}

If no audio is present, focus on describing the visual content and any text visible in the video.`;

    const result = await this.analyzeVideo({
      ...options,
      prompt,
      maxTokens: 2048,
      temperature: 0.3
    });

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        transcript: 'Unable to parse transcript',
        summary: result.substring(0, 500),
        keyQuotes: []
      };
    }
  }

  private parseAnalysisText(text: string): SlideVideoAnalysis {
    // テキストから構造化データを抽出するフォールバック関数
    return {
      summary: text.substring(0, 200),
      keyPoints: this.extractBulletPoints(text),
      suggestedSlides: 5,
      topics: this.extractTopics(text),
      presentationStyle: 'Professional',
      targetAudience: 'General audience',
      duration: '10-15 minutes',
      qualityAssessment: {
        audioQuality: 'Good',
        visualQuality: 'Good',
        contentClarity: 'Clear',
        engagement: 'Moderate'
      }
    };
  }

  private extractBulletPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .slice(0, 5);
  }

  private extractTopics(text: string): string[] {
    // 簡単なキーワード抽出（実際の実装ではより洗練された方法を使用）
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const wordCount: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}