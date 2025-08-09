// =================================================================
// SlideMaster 生成テスト - Context Intelligence Engine 検証
// =================================================================

import { slideGenerationFactory } from './services/ai/SlideGenerationFactory.ts';

/**
 * テストケース定義
 */
const TEST_CASES = [
  {
    id: 'momotaro_story',
    name: '桃太郎ストーリーテスト',
    request: {
      topic: '桃太郎のお話を作成してください',
      slideCount: 8,
      slideCountMode: 'exact',
      selectedDesigner: 'auto',
      purpose: 'auto',
      theme: 'auto',
      includeImages: true,
      aspectRatio: '16:9'
    },
    expectedResults: {
      purpose: 'storytelling',
      theme: 'storytelling',
      designer: 'The Emotional Storyteller',
      imageStyle: 'storybook-style illustration'
    }
  },
  {
    id: 'critical_thinking_training',
    name: 'クリティカルシンキング研修テスト',
    request: {
      topic: 'クリティカルシンキングについて研修資料を用意してください',
      slideCount: 12,
      slideCountMode: 'exact',
      selectedDesigner: 'auto',
      purpose: 'auto',
      theme: 'auto',
      includeImages: true,
      aspectRatio: '16:9'
    },
    expectedResults: {
      purpose: 'training_material',
      theme: 'professional',
      designer: 'The Corporate Strategist',
      imageStyle: 'Professional training imagery'
    }
  },
  {
    id: 'ai_technology_guide',
    name: 'AI技術ガイドテスト',
    request: {
      topic: 'GPT-5について詳しく調べて技術解説してください',
      slideCount: 10,
      slideCountMode: 'exact',
      selectedDesigner: 'auto',
      purpose: 'auto',
      theme: 'auto',
      includeImages: true,
      aspectRatio: '16:9'
    },
    expectedResults: {
      purpose: 'tutorial_guide',
      theme: 'tech_modern',
      designer: 'The Academic Visualizer',
      imageStyle: 'Clean, instructional imagery'
    }
  },
  {
    id: 'plank_exercise_guide',
    name: 'プランク解説ガイドテスト',
    request: {
      topic: 'プランクのやり方の解説スライドを作成してください',
      slideCount: 6,
      slideCountMode: 'exact',
      selectedDesigner: 'auto',
      purpose: 'auto',
      theme: 'auto',
      includeImages: true,
      aspectRatio: '16:9'
    },
    expectedResults: {
      purpose: 'tutorial_guide',
      theme: 'minimalist',
      designer: 'The Vivid Creator',
      imageStyle: 'Step-by-step friendly visuals'
    }
  }
];

/**
 * 生成結果を分析する
 */
function analyzeGenerationResult(result, expectedResults, testCase) {
  const analysis = {
    testId: testCase.id,
    testName: testCase.name,
    success: true,
    issues: [],
    details: {}
  };

  try {
    // メタデータから情報抽出
    const metadata = result.metadata;
    const contextIntelligence = metadata?.contextIntelligence;
    const autoAnalysis = contextIntelligence?.autoAnalysis;

    console.log(`\n🧪 ${testCase.name} - 結果分析:`);
    console.log('📋 Context Intelligence結果:', {
      contentType: autoAnalysis?.contentType,
      suggestedDesigner: autoAnalysis?.suggestedDesigner,
      suggestedPurpose: autoAnalysis?.suggestedPurpose,
      suggestedTheme: autoAnalysis?.suggestedTheme
    });

    // Purpose検証
    if (autoAnalysis?.suggestedPurpose !== expectedResults.purpose) {
      analysis.issues.push({
        type: 'purpose_mismatch',
        expected: expectedResults.purpose,
        actual: autoAnalysis?.suggestedPurpose,
        severity: 'high'
      });
      analysis.success = false;
    }

    // Theme検証
    if (autoAnalysis?.suggestedTheme !== expectedResults.theme) {
      analysis.issues.push({
        type: 'theme_mismatch',
        expected: expectedResults.theme,
        actual: autoAnalysis?.suggestedTheme,
        severity: 'medium'
      });
    }

    // Designer検証
    if (metadata?.designerUsed !== expectedResults.designer) {
      analysis.issues.push({
        type: 'designer_mismatch',
        expected: expectedResults.designer,
        actual: metadata?.designerUsed,
        severity: 'medium'
      });
    }

    // コンテンツ品質検証
    const content = JSON.parse(result.content);
    analysis.details.slideCount = content.slides?.length || 0;
    analysis.details.hasTitleSlide = content.slides?.[0]?.title?.includes('タイトル') || false;
    analysis.details.hasSpeakerNotes = content.slides?.some(slide => slide.notes?.trim()) || false;
    analysis.details.hasImages = content.slides?.some(slide => 
      slide.layers?.some(layer => layer.type === 'image')) || false;

    // フォントサイズの動的調整確認
    const fontSizes = [];
    content.slides?.forEach(slide => {
      slide.layers?.forEach(layer => {
        if (layer.type === 'text' && layer.fontSize) {
          fontSizes.push(layer.fontSize);
        }
      });
    });
    analysis.details.fontSizeRange = fontSizes.length > 0 ? {
      min: Math.min(...fontSizes),
      max: Math.max(...fontSizes),
      variety: new Set(fontSizes).size > 1
    } : null;

    return analysis;
  } catch (error) {
    analysis.success = false;
    analysis.issues.push({
      type: 'analysis_error',
      error: error.message,
      severity: 'critical'
    });
    return analysis;
  }
}

/**
 * テスト結果のレポート生成
 */
function generateTestReport(results) {
  console.log('\n🎯 ===== SlideMaster 生成テスト レポート =====\n');
  
  let totalTests = results.length;
  let successfulTests = results.filter(r => r.success).length;
  let failedTests = totalTests - successfulTests;

  console.log(`📊 総合結果: ${successfulTests}/${totalTests} 成功 (${Math.round(successfulTests/totalTests*100)}%)`);
  
  if (failedTests > 0) {
    console.log(`❌ 失敗: ${failedTests}件`);
  }

  results.forEach(result => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 ${result.testName}`);
    console.log(`${result.success ? '✅ 成功' : '❌ 失敗'}`);
    
    if (result.issues.length > 0) {
      console.log('\n⚠️ 問題点:');
      result.issues.forEach(issue => {
        console.log(`  - ${issue.type}: 期待値 "${issue.expected}" → 実際 "${issue.actual}"`);
      });
    }

    console.log('\n📋 詳細:');
    console.log(`  スライド数: ${result.details.slideCount}`);
    console.log(`  タイトルスライド: ${result.details.hasTitleSlide ? 'あり' : 'なし'}`);
    console.log(`  Speaker Notes: ${result.details.hasSpeakerNotes ? 'あり' : 'なし'}`);
    console.log(`  画像レイヤー: ${result.details.hasImages ? 'あり' : 'なし'}`);
    
    if (result.details.fontSizeRange) {
      console.log(`  フォントサイズ: ${result.details.fontSizeRange.min}-${result.details.fontSizeRange.max}px (多様性: ${result.details.fontSizeRange.variety ? 'あり' : 'なし'})`);
    }
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log('テスト完了');
}

/**
 * メインテスト実行
 */
async function runGenerationTests() {
  console.log('🚀 SlideMaster 生成テスト開始...\n');
  
  const results = [];

  for (const testCase of TEST_CASES) {
    try {
      console.log(`▶️ ${testCase.name} 実行中...`);
      
      const startTime = Date.now();
      const result = await slideGenerationFactory.generateSlides(testCase.request);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ 生成時間: ${duration}ms`);
      
      const analysis = analyzeGenerationResult(result, testCase.expectedResults, testCase);
      analysis.duration = duration;
      
      results.push(analysis);
      
    } catch (error) {
      console.error(`❌ ${testCase.name} でエラー:`, error);
      results.push({
        testId: testCase.id,
        testName: testCase.name,
        success: false,
        issues: [{
          type: 'generation_error',
          error: error.message,
          severity: 'critical'
        }],
        details: {}
      });
    }
  }

  generateTestReport(results);
  return results;
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runGenerationTests().catch(console.error);
}

export { runGenerationTests, TEST_CASES };