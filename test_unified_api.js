// 統合API機能のテスト
import { ContextIntelligenceEngine } from './services/ai/ContextIntelligenceEngine.ts';

// Node.js環境用のlocalStorageモック
global.localStorage = {
  getItem: (key) => {
    if (key === 'slidemaster_settings') {
      return JSON.stringify({
        selectedProvider: 'gemini',
        providerAuth: {
          gemini: {
            textGeneration: { apiKey: 'test-key' }
          }
        }
      });
    }
    return null;
  },
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

async function testUnifiedAPI() {
  console.log('🚀 Testing Unified API Analysis...\n');
  
  const engine = new ContextIntelligenceEngine();
  
  // テストケース1: 桃太郎物語
  console.log('Test Case 1: 桃太郎物語');
  try {
    const request1 = {
      selectedDesigner: 'auto',
      purpose: 'auto', 
      theme: 'auto'
    };
    
    const result1 = await engine.analyzeWithUnifiedAPI('桃太郎の紙芝居を作成してください', request1);
    console.log('Results:', JSON.stringify(result1, null, 2));
    console.log('✅ Story detection:', result1.contentAnalysis.isStoryContent);
    console.log('✅ Designer:', result1.designerSelection.selectedDesigner);
    console.log('✅ Theme:', result1.themeSelection.selectedTheme);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Using fallback analysis...');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // テストケース2: ビジネス戦略
  console.log('Test Case 2: ビジネス戦略');
  try {
    const request2 = {
      selectedDesigner: 'auto',
      purpose: 'auto',
      theme: 'auto'
    };
    
    const result2 = await engine.analyzeWithUnifiedAPI('マーケティング戦略の立案と実行', request2);
    console.log('Results:', JSON.stringify(result2, null, 2));
    console.log('✅ Content type:', result2.contentAnalysis.contentType);
    console.log('✅ Designer:', result2.designerSelection.selectedDesigner); 
    console.log('✅ Theme:', result2.themeSelection.selectedTheme);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Using fallback analysis...');
  }
}

testUnifiedAPI().then(() => {
  console.log('\n🎯 Unified API test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});