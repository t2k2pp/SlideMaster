// =================================================================
// SVG Generation Service - AI-powered SVG creation
// =================================================================

import { getAIService } from './unifiedAIService';
import { SVGLayer } from '../../types';

export interface SVGGenerationRequest {
  prompt: string;
  width?: number; // desired width in viewport units
  height?: number; // desired height in viewport units
  style?: 'simple' | 'detailed' | 'minimalist' | 'technical' | 'artistic';
  colorScheme?: 'monochrome' | 'colorful' | 'brand' | 'themed';
  complexity?: 'low' | 'medium' | 'high';
}

export interface SVGGenerationResult {
  svgContent: string;
  viewBox: string;
  estimatedSize: { width: number; height: number };
  generationPrompt: string;
}

/**
 * SVGに適したコンテンツかどうかを判定
 */
export function isSVGSuitable(prompt: string): boolean {
  const svgKeywords = [
    // 図形・形状
    'アイコン', 'icon', '図形', 'shape', '記号', 'symbol',
    // 図表・チャート
    'グラフ', 'chart', 'graph', '図表', '棒グラフ', '円グラフ', 'pie chart', 'bar chart',
    'フローチャート', 'flowchart', '組織図', '相関図', 'diagram',
    // UI要素
    'ボタン', 'button', 'UI', 'インターフェース', 'interface',
    // 抽象的・幾何学的
    '抽象', 'abstract', '幾何学', 'geometric', 'パターン', 'pattern',
    // ロゴ・ブランディング
     'ロゴ', 'logo', 'ブランド', 'brand', 'マーク', 'mark',
    // 線画・イラスト風
    '線画', 'line art', 'イラスト', 'illustration', 'スケッチ', 'sketch'
  ];

  const photographicKeywords = [
    '写真', 'photo', 'リアル', 'realistic', '人物', 'person', 'face',
    '風景', 'landscape', '建物', 'building', '自然', 'nature',
    'ポートレート', 'portrait', '背景', 'background'
  ];

  const promptLower = prompt.toLowerCase();
  
  const svgScore = svgKeywords.filter(keyword => 
    promptLower.includes(keyword.toLowerCase())
  ).length;
  
  const photoScore = photographicKeywords.filter(keyword =>
    promptLower.includes(keyword.toLowerCase())
  ).length;

  // SVGキーワードが多い、または写真的要素が少ない場合はSVG適応
  return svgScore > 0 || (photoScore === 0 && prompt.length < 100);
}

/**
 * AIを使用してSVGを生成
 */
export async function generateSVG(request: SVGGenerationRequest): Promise<SVGGenerationResult> {
  const aiService = getAIService();
  
  const { prompt, width = 100, height = 100, style = 'simple', colorScheme = 'themed', complexity = 'medium' } = request;

  const systemPrompt = `あなたは高品質なSVGコンテンツを生成する専門家です。

以下の指針でSVGを作成してください：

**技術要件**:
- 完全で有効なSVGタグで囲む
- viewBox属性を適切に設定
- レスポンシブ対応（percentage, viewBoxベース）
- クリーンで最適化されたコード

**デザイン要件**:
- スタイル: ${style}
- 色彩: ${colorScheme}
- 複雑さ: ${complexity}
- 想定サイズ: ${width}x${height}

**出力形式**:
SVGタグのみを出力し、説明文は含めないでください。

例:
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3b82f6"/>
</svg>`;

  const userPrompt = `以下の要求に基づいてSVGを作成してください：

${prompt}

要求されたSVG:`;

  try {
    const result = await aiService.generateText(`${systemPrompt}\n\n${userPrompt}`);
    
    // SVGタグの抽出
    const svgMatch = result.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      throw new Error('Valid SVG content not found in AI response');
    }
    
    const svgContent = svgMatch[0];
    
    // viewBox属性の抽出
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${width} ${height}`;
    
    return {
      svgContent,
      viewBox,
      estimatedSize: { width, height },
      generationPrompt: prompt
    };
    
  } catch (error) {
    console.error('SVG generation error:', error);
    
    // フォールバック：シンプルなプレースホルダーSVG
    const fallbackSVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>
  <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#6b7280" font-family="Arial, sans-serif" font-size="12">
    SVG Error
  </text>
</svg>`;

    return {
      svgContent: fallbackSVG,
      viewBox: '0 0 100 100',
      estimatedSize: { width, height },
      generationPrompt: prompt
    };
  }
}

/**
 * SVGレイヤーを作成
 */
export async function createSVGLayer(
  prompt: string, 
  x: number = 10, 
  y: number = 10, 
  width: number = 30, 
  height: number = 30
): Promise<SVGLayer> {
  const request: SVGGenerationRequest = {
    prompt,
    width: width * 10, // percentage to approximate pixel conversion
    height: height * 10,
    style: 'simple',
    colorScheme: 'themed',
    complexity: 'medium'
  };
  
  const result = await generateSVG(request);
  
  return {
    id: `svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'svg',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    content: result.svgContent,
    prompt: result.generationPrompt,
    viewBox: result.viewBox,
    preserveAspectRatio: 'xMidYMid meet'
  };
}

/**
 * SVG内容を検証・サニタイズ
 */
export function validateSVGContent(svgContent: string): { isValid: boolean; sanitized?: string; errors?: string[] } {
  const errors: string[] = [];
  
  // 基本的なSVGタグの存在確認
  if (!svgContent.includes('<svg')) {
    errors.push('SVG tag not found');
  }
  
  if (!svgContent.includes('</svg>')) {
    errors.push('SVG closing tag not found');
  }
  
  // 危険なスクリプト要素の除去
  const dangerousElements = ['<script', '<object', '<embed', '<iframe'];
  const hasDangerousElements = dangerousElements.some(element => 
    svgContent.toLowerCase().includes(element)
  );
  
  if (hasDangerousElements) {
    errors.push('Potentially dangerous elements detected');
    // サニタイズ: 危険な要素を除去
    let sanitized = svgContent;
    dangerousElements.forEach(element => {
      const regex = new RegExp(`${element}[^>]*>.*?<\\/${element.slice(1)}\\s*>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    return {
      isValid: errors.length === 0,
      sanitized,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  return {
    isValid: errors.length === 0,
    sanitized: svgContent,
    errors: errors.length > 0 ? errors : undefined
  };
}