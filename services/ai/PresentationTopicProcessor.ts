// =================================================================
// Presentation Topic Processor
// ユーザー入力文章の前処理：少量文章展開・大量文章構造化
// =================================================================

import { getAIService } from './unifiedAIService';

export interface TopicAnalysis {
  originalTopic: string;
  processedTopic: string;
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
  
  const prompt = `以下のトピックを分析し、プレゼンテーション作成に最適な詳細内容に展開してください。

入力トピック: "${topic}"

展開時の指針:
1. ユーザーの意図を推測（物語、解説、学習、ビジネス等）
2. スライド構成に必要な要素を補完
3. 視覚的表現に適した内容に変換
4. 対象者を想定した適切な詳細度

出力は200-400文字程度の構造化された内容にしてください。
元の意図は保持しつつ、スライド作成に必要な情報を補完してください。

展開された内容:`;

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
export async function processPresentationTopic(originalTopic: string): Promise<TopicAnalysis> {
  const structure = analyzeTopicStructure(originalTopic);
  const processingApplied: string[] = [];
  let processedTopic = originalTopic;
  let contentType: TopicAnalysis['contentType'] = 'structured';
  
  try {
    if (structure.isMinimal) {
      // 少量文章の場合：展開処理
      console.log('🔍 Minimal topic detected, expanding...', {
        wordCount: structure.wordCount,
        lineCount: structure.lineCount,
        sentenceCount: structure.sentenceCount
      });
      
      processedTopic = await expandMinimalTopic(originalTopic);
      processingApplied.push('minimal_expansion');
      contentType = 'minimal';
      
      console.log('✅ Topic expanded:', {
        original: originalTopic,
        expanded: processedTopic.substring(0, 100) + '...'
      });
      
    } else if (structure.isUnstructuredLarge) {
      // 大量非構造化文章の場合：MECE構造化処理
      console.log('🔍 Large unstructured topic detected, structuring...', {
        wordCount: structure.wordCount,
        lineCount: structure.lineCount
      });
      
      processedTopic = await structureLargeTopic(originalTopic);
      processingApplied.push('mece_structuring');
      contentType = 'unstructured_large';
      
      console.log('✅ Topic structured:', {
        original: originalTopic.substring(0, 50) + '...',
        structured: processedTopic.substring(0, 100) + '...'
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
    processedTopic = originalTopic;
    processingApplied.push('error_fallback');
  }

  return {
    originalTopic,
    processedTopic,
    contentType,
    wordCount: structure.wordCount,
    lineCount: structure.lineCount,
    sentenceCount: structure.sentenceCount,
    needsExpansion: structure.isMinimal,
    needsStructuring: structure.isUnstructuredLarge,
    processingApplied
  };
}