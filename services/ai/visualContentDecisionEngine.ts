// =================================================================
// Visual Content Decision Engine
// Image Layer vs SVG Layerの自動選択ロジック
// =================================================================

import { isSVGSuitable } from './svgGenerationService';
import type { PresentationPurpose, PresentationTheme } from '../../types';

export interface VisualContentRequest {
  prompt: string;
  slideContext: string;
  purpose?: PresentationPurpose;
  theme?: PresentationTheme;
  position: { x: number; y: number; width: number; height: number };
}

export interface VisualContentDecision {
  contentType: 'svg' | 'image';
  confidence: number; // 0-1の確信度
  reasoning: string[];
  adaptedPrompt?: string; // 選択したコンテンツタイプに最適化されたプロンプト
}

/**
 * プロンプトからSVGの適性スコアを計算
 */
function calculateSVGSuitabilityScore(prompt: string, slideContext: string): number {
  let score = 0;
  const promptLower = prompt.toLowerCase();
  const contextLower = slideContext.toLowerCase();
  
  // SVGに適したキーワード（高スコア）
  const svgHighKeywords = [
    'アイコン', 'icon', 'ロゴ', 'logo', 'マーク', 'mark',
    'グラフ', 'chart', 'graph', '図表', '棒グラフ', '円グラフ',
    'フローチャート', 'flowchart', '組織図', 'diagram',
    '記号', 'symbol', '矢印', 'arrow', 'ボタン', 'button',
    'パターン', 'pattern', '幾何学', 'geometric', '抽象', 'abstract'
  ];
  
  // SVGに適したキーワード（中スコア）
  const svgMediumKeywords = [
    '図形', 'shape', 'イラスト', 'illustration', '線画', 'line art',
    'スケッチ', 'sketch', 'シンプル', 'simple', 'ミニマル', 'minimal'
  ];
  
  // 画像に適したキーワード（SVGスコアを下げる）
  const imageKeywords = [
    '写真', 'photo', '画像', 'image', 'リアル', 'realistic',
    '人物', 'person', 'face', '風景', 'landscape', '建物', 'building',
    '自然', 'nature', '背景', 'background', 'テクスチャ', 'texture',
    '詳細', 'detailed', '複雑', 'complex'
  ];

  // SVG高適性キーワードのスコア計算
  svgHighKeywords.forEach(keyword => {
    if (promptLower.includes(keyword)) score += 0.3;
    if (contextLower.includes(keyword)) score += 0.2;
  });

  // SVG中適性キーワードのスコア計算
  svgMediumKeywords.forEach(keyword => {
    if (promptLower.includes(keyword)) score += 0.15;
    if (contextLower.includes(keyword)) score += 0.1;
  });

  // 画像適性キーワードがあればSVGスコアを下げる
  imageKeywords.forEach(keyword => {
    if (promptLower.includes(keyword)) score -= 0.2;
    if (contextLower.includes(keyword)) score -= 0.1;
  });

  // 文字数による調整（短いほどSVGに適している）
  const lengthFactor = Math.max(0, 1 - (prompt.length / 200));
  score += lengthFactor * 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * 用途・テーマによるバイアス調整
 */
function applyPurposeThemeBias(
  baseScore: number,
  purpose?: PresentationPurpose,
  theme?: PresentationTheme
): { score: number; reasoning: string[] } {
  let adjustedScore = baseScore;
  const reasoning: string[] = [];

  // 用途によるバイアス
  switch (purpose) {
    case 'business_presentation':
    case 'marketing_pitch':
      adjustedScore += 0.1;
      reasoning.push('ビジネス用途でSVGが好まれる');
      break;
    
    case 'educational_content':
    case 'tutorial_guide':
      adjustedScore += 0.15;
      reasoning.push('教育コンテンツでは図解が重要');
      break;
    
    case 'academic_research':
      adjustedScore += 0.2;
      reasoning.push('学術発表では正確な図表が必要');
      break;
    
    case 'storytelling':
    case 'children_content':
      adjustedScore -= 0.1;
      reasoning.push('物語・子供向けコンテンツでは画像が効果的');
      break;
  }

  // テーマによるバイアス
  switch (theme) {
    case 'minimalist':
    case 'professional':
      adjustedScore += 0.1;
      reasoning.push('ミニマル・プロフェッショナルテーマでSVGが適合');
      break;
    
    case 'academic':
    case 'medical':
      adjustedScore += 0.15;
      reasoning.push('学術・医療テーマでは精密な図表が必要');
      break;
    
    case 'storytelling':
    case 'children_bright':
    case 'children_pastel':
      adjustedScore -= 0.15;
      reasoning.push('物語・子供向けテーマでは豊かな画像が効果的');
      break;
  }

  return {
    score: Math.max(0, Math.min(1, adjustedScore)),
    reasoning
  };
}

/**
 * サイズ・位置による調整
 */
function applySizePositionBias(
  baseScore: number,
  position: VisualContentRequest['position']
): { score: number; reasoning: string[] } {
  let adjustedScore = baseScore;
  const reasoning: string[] = [];

  // 小さいサイズの場合はSVGが適している
  const area = position.width * position.height;
  if (area < 500) { // 小さい要素
    adjustedScore += 0.15;
    reasoning.push('小さいサイズではSVGがスケーラブルで適している');
  } else if (area > 2000) { // 大きい要素
    adjustedScore -= 0.1;
    reasoning.push('大きいサイズでは詳細な画像が効果的');
  }

  return {
    score: Math.max(0, Math.min(1, adjustedScore)),
    reasoning
  };
}

/**
 * プロンプトを選択されたコンテンツタイプに最適化
 */
function adaptPromptForContentType(
  originalPrompt: string,
  contentType: 'svg' | 'image'
): string {
  if (contentType === 'svg') {
    // SVG用に最適化
    return originalPrompt
      .replace(/写真/g, 'イラスト')
      .replace(/リアル/g, 'シンプル')
      .replace(/詳細な/g, '明確な')
      + (originalPrompt.includes('シンプル') ? '' : ' シンプルで清潔感のある')
      + (originalPrompt.includes('線画') || originalPrompt.includes('イラスト') ? '' : ' 線画スタイルで');
  } else {
    // Image用に最適化（必要に応じて）
    return originalPrompt;
  }
}

/**
 * メイン決定エンジン
 */
export function decideVisualContentType(request: VisualContentRequest): VisualContentDecision {
  const { prompt, slideContext, purpose, theme, position } = request;
  
  // 基本的なSVG適性スコアを計算
  const baseScore = calculateSVGSuitabilityScore(prompt, slideContext);
  
  // 用途・テーマによる調整
  const purposeThemeResult = applyPurposeThemeBias(baseScore, purpose, theme);
  
  // サイズ・位置による調整
  const sizePositionResult = applySizePositionBias(purposeThemeResult.score, position);
  
  const finalScore = sizePositionResult.score;
  const allReasoning = [...purposeThemeResult.reasoning, ...sizePositionResult.reasoning];
  
  // 最終決定
  const contentType: 'svg' | 'image' = finalScore >= 0.4 ? 'svg' : 'image';
  const confidence = contentType === 'svg' ? finalScore : (1 - finalScore);
  
  // 決定理由の追加
  const finalReasoning = [
    `適性スコア: ${finalScore.toFixed(2)}`,
    `${contentType === 'svg' ? 'SVG' : 'Image'}を選択`,
    ...allReasoning
  ];
  
  return {
    contentType,
    confidence,
    reasoning: finalReasoning,
    adaptedPrompt: adaptPromptForContentType(prompt, contentType)
  };
}

/**
 * デバッグ用：決定プロセスの詳細情報
 */
export function analyzeVisualContentDecision(request: VisualContentRequest): {
  decision: VisualContentDecision;
  debugInfo: {
    baseScore: number;
    purposeThemeBias: number;
    sizePositionBias: number;
    finalScore: number;
  };
} {
  const baseScore = calculateSVGSuitabilityScore(request.prompt, request.slideContext);
  const purposeThemeResult = applyPurposeThemeBias(baseScore, request.purpose, request.theme);
  const sizePositionResult = applySizePositionBias(purposeThemeResult.score, request.position);
  
  const decision = decideVisualContentType(request);
  
  return {
    decision,
    debugInfo: {
      baseScore,
      purposeThemeBias: purposeThemeResult.score - baseScore,
      sizePositionBias: sizePositionResult.score - purposeThemeResult.score,
      finalScore: sizePositionResult.score
    }
  };
}