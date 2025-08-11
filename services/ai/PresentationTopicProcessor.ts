// =================================================================
// Presentation Topic Processor
// ユーザー入力文章の前処理：少量文章展開・大量文章構造化
// =================================================================

import { getAIService } from './unifiedAIService';

export interface TopicAnalysis {
  userInputTopic: string;        // ユーザーがホーム画面で入力した内容
  contextAnalysisText: string;   // AI分析による拡張テキスト（Context Intelligence用）
  contentType: 'minimal' | 'structured' | 'unstructured_large';
  wordCount: number;
  lineCount: number;
  sentenceCount: number;
  needsExpansion: boolean;
  needsStructuring: boolean;
  processingApplied: string[];
}

/**
 * 文章量と構造を分析する
 */
function analyzeTopicStructure(topic: string): {
  wordCount: number;
  lineCount: number;  
  sentenceCount: number;
  isMinimal: boolean;
  isStructured: boolean;
  isUnstructuredLarge: boolean;
} {
  const wordCount = topic.length;
  const lineCount = topic.split('\n').length;
  const sentenceCount = (topic.match(/[。！？]/g) || []).length;
  
  // 少量文章判定基準
  const isMinimal = wordCount <= 50 || (lineCount <= 2 && sentenceCount <= 2);
  
  // 大量文章判定
  const isLargeContent = wordCount >= 200 || lineCount >= 5;
  
  // 構造化判定（見出し、番号、箇条書きの存在）
  const hasStructure = /[①②③④⑤⑥⑦⑧⑨⑩]|[1-9]\.|[1-9]\)|■|●|・/.test(topic) ||
                      /\n\s*[-*+]\s/.test(topic) || 
                      /^#+ /.test(topic);
  
  const isStructured = isLargeContent && hasStructure;
  const isUnstructuredLarge = isLargeContent && !hasStructure;
  
  return {
    wordCount,
    lineCount,
    sentenceCount,
    isMinimal,
    isStructured,
    isUnstructuredLarge
  };
}

/**
 * 少量文章を展開する
 */
async function expandMinimalTopic(topic: string): Promise<string> {
  const aiService = getAIService();
  
  const prompt = `以下のトピックを、ユーザーの元の意図を正確に保持したまま、スライド作成に適した内容に展開してください。

入力トピック: "${topic}"

展開の原則:
- ユーザーが求めている内容の本質を変えない
- 物語・創作系の場合は、ストーリーの魅力を重視
- 教育・ビジネス系の場合のみ、学習効果や実用性を考慮
- 元のトーンと方向性を保持

簡潔で自然な展開内容（150-300文字程度）:`;

  try {
    const result = await aiService.generateText(prompt);
    return result.trim();
  } catch (error) {
    console.error('少量文章展開エラー:', error);
    return topic; // エラー時は元のトピックを返す
  }
}

/**
 * 大量非構造化文章をMECE化・構造化する
 */
async function structureLargeTopic(topic: string): Promise<string> {
  const aiService = getAIService();
  
  const prompt = `以下の文章を分析し、MECE原則（漏れなく重複なく）に基づいて構造化してください。

入力文章:
"${topic}"

構造化の指針:
1. 主要テーマを特定
2. 内容を論理的カテゴリに分類
3. 重複を排除し、漏れをチェック
4. プレゼンテーション向けの論理的順序で整理
5. 各要素が相互排他的（Mutually Exclusive）かつ網羅的（Collectively Exhaustive）

出力形式:
- 明確な構造で整理
- スライド作成に適した内容
- 論理的な流れを持つ構成

構造化された内容:`;

  try {
    const result = await aiService.generateText(prompt);
    return result.trim();
  } catch (error) {
    console.error('大量文章構造化エラー:', error);
    return topic; // エラー時は元のトピックを返す
  }
}

/**
 * メイン処理：トピックを分析・前処理する
 */
export async function processPresentationTopic(userInputTopic: string): Promise<TopicAnalysis> {
  const structure = analyzeTopicStructure(userInputTopic);
  const processingApplied: string[] = [];
  let contextAnalysisText = userInputTopic;
  let contentType: TopicAnalysis['contentType'] = 'structured';
  
  try {
    if (structure.isMinimal) {
      // 少量文章の場合：展開処理
      console.log('🔍 Minimal topic detected, expanding...', {
        wordCount: structure.wordCount,
        lineCount: structure.lineCount,
        sentenceCount: structure.sentenceCount
      });
      
      contextAnalysisText = await expandMinimalTopic(userInputTopic);
      processingApplied.push('minimal_expansion');
      contentType = 'minimal';
      
      console.log('✅ Topic expanded:', {
        original: userInputTopic,
        expanded: contextAnalysisText.substring(0, 100) + '...'
      });
      
    } else if (structure.isUnstructuredLarge) {
      // 大量非構造化文章の場合：MECE構造化処理
      console.log('🔍 Large unstructured topic detected, structuring...', {
        wordCount: structure.wordCount,
        lineCount: structure.lineCount
      });
      
      contextAnalysisText = await structureLargeTopic(userInputTopic);
      processingApplied.push('mece_structuring');
      contentType = 'unstructured_large';
      
      console.log('✅ Topic structured:', {
        original: userInputTopic.substring(0, 50) + '...',
        structured: contextAnalysisText.substring(0, 100) + '...'
      });
      
    } else {
      // 構造化済み文章：軽微な整理のみ
      console.log('✅ Well-structured topic detected, minimal processing');
      processingApplied.push('minimal_cleanup');
      contentType = 'structured';
    }
  } catch (error) {
    console.error('Topic processing error:', error);
    // エラー時は元のトピックを使用
    contextAnalysisText = userInputTopic;
    processingApplied.push('error_fallback');
  }

  return {
    userInputTopic,
    contextAnalysisText,
    contentType,
    wordCount: structure.wordCount,
    lineCount: structure.lineCount,
    sentenceCount: structure.sentenceCount,
    needsExpansion: structure.isMinimal,
    needsStructuring: structure.isUnstructuredLarge,
    processingApplied
  };
}