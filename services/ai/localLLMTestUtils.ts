// =================================================================
// Local LLM Test Utils - ローカルLLMテスト・動作確認ユーティリティ
// 開発・デバッグ用のテスト機能
// =================================================================

import { LMStudioService, isLMStudioAvailable } from './lmStudioService';
import { FoocusService, isFoocusAvailable } from './foocusService';
import { checkLocalLLMStatus, getLocalLLMInfo } from './localLLMUnifiedService';
import { createTaskSpecificAIService, hasValidAPIKey, validateAIConfiguration } from './unifiedAIService';
import { ExtendedUserSettings } from './localLLMTypes';

/**
 * ローカルLLMの包括的な動作テスト
 */
export async function runLocalLLMDiagnostics(): Promise<{
  lmstudio: DiagnosticResult;
  fooocus: DiagnosticResult;
  integration: IntegrationResult;
}> {
  console.log('🔍 Starting Local LLM Diagnostics...');
  
  const results = {
    lmstudio: await testLMStudio(),
    fooocus: await testFooocus(),
    integration: await testIntegration()
  };
  
  console.log('✅ Local LLM Diagnostics completed:', results);
  return results;
}

export interface DiagnosticResult {
  available: boolean;
  endpoint: string;
  connectionTest: boolean;
  configValidation: { valid: boolean; errors: string[] };
  serverInfo?: any;
  models?: string[];
  testGeneration?: { success: boolean; result?: string; error?: string };
}

export interface IntegrationResult {
  unifiedServiceTest: { success: boolean; errors: string[] };
  factoryTest: { success: boolean; errors: string[] };
  settingsValidation: { valid: boolean; errors: string[] };
}

/**
 * LMStudioの詳細テスト
 */
async function testLMStudio(): Promise<DiagnosticResult> {
  const endpoint = 'http://localhost:1234';
  const result: DiagnosticResult = {
    available: false,
    endpoint,
    connectionTest: false,
    configValidation: { valid: false, errors: [] }
  };
  
  try {
    // 基本的な可用性チェック
    result.available = await isLMStudioAvailable(endpoint);
    
    if (result.available) {
      const service = new LMStudioService({
        endpoint,
        modelDisplayName: 'Test Model',
        temperature: 0.7,
        maxTokens: 100
      });
      
      // 接続テスト
      result.connectionTest = await service.testConnection();
      
      // サーバー情報取得
      try {
        result.serverInfo = await service.getServerInfo();
      } catch (error) {
        console.warn('Failed to get LMStudio server info:', error);
      }
      
      // モデル一覧取得
      try {
        const models = await service.getAvailableModels();
        result.models = models.map(m => m.id);
      } catch (error) {
        console.warn('Failed to get LMStudio models:', error);
      }
      
      // テスト生成
      try {
        const testResult = await service.generateText({
          prompt: 'Hello, this is a test. Please respond with "Test successful".',
          maxTokens: 50,
          temperature: 0.1
        });
        result.testGeneration = { success: true, result: testResult };
      } catch (error) {
        result.testGeneration = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    // 設定検証
    result.configValidation = validateAIConfiguration('text');
    
  } catch (error) {
    console.error('LMStudio test error:', error);
    result.testGeneration = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  return result;
}

/**
 * Foocusの詳細テスト
 */
async function testFooocus(): Promise<DiagnosticResult> {
  const endpoint = 'http://localhost:7865';
  const result: DiagnosticResult = {
    available: false,
    endpoint,
    connectionTest: false,
    configValidation: { valid: false, errors: [] }
  };
  
  try {
    // 基本的な可用性チェック
    result.available = await isFoocusAvailable(endpoint);
    
    if (result.available) {
      const service = new FoocusService({
        endpoint,
        modelName: 'Test Model',
        defaultQuality: 'medium'
      });
      
      // 接続テスト
      result.connectionTest = await service.testConnection();
      
      // サーバー情報取得
      try {
        result.serverInfo = await service.getServerInfo();
      } catch (error) {
        console.warn('Failed to get Fooocus server info:', error);
      }
      
      // モデル一覧取得
      try {
        const models = await service.getAvailableModels();
        result.models = models.map(m => m.name);
      } catch (error) {
        console.warn('Failed to get Fooocus models:', error);
      }
      
      // テスト生成（小さな画像でテスト）
      try {
        const testResult = await service.generateImage({
          prompt: 'simple test image, small, minimalist',
          width: 256,
          height: 256,
          steps: 10
        });
        result.testGeneration = { 
          success: true, 
          result: `Generated image (${testResult.length} characters)` 
        };
      } catch (error) {
        result.testGeneration = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    // 設定検証
    result.configValidation = validateAIConfiguration('image');
    
  } catch (error) {
    console.error('Fooocus test error:', error);
    result.testGeneration = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  return result;
}

/**
 * 統合システムのテスト
 */
async function testIntegration(): Promise<IntegrationResult> {
  const result: IntegrationResult = {
    unifiedServiceTest: { success: false, errors: [] },
    factoryTest: { success: false, errors: [] },
    settingsValidation: { valid: false, errors: [] }
  };
  
  try {
    // UnifiedServiceテスト
    try {
      const textValidation = validateAIConfiguration('text');
      const imageValidation = validateAIConfiguration('image');
      
      if (textValidation.valid) {
        const textService = createTaskSpecificAIService('text');
        const textConnection = await textService.testConnection();
        
        if (textConnection) {
          result.unifiedServiceTest.success = true;
        } else {
          result.unifiedServiceTest.errors.push('Text service connection failed');
        }
      } else {
        result.unifiedServiceTest.errors.push(...textValidation.errors);
      }
      
      if (imageValidation.valid) {
        const imageService = createTaskSpecificAIService('image');
        const imageConnection = await imageService.testConnection();
        
        if (!imageConnection) {
          result.unifiedServiceTest.errors.push('Image service connection failed');
        }
      } else {
        result.unifiedServiceTest.errors.push(...imageValidation.errors);
      }
      
    } catch (error) {
      result.unifiedServiceTest.errors.push(
        error instanceof Error ? error.message : 'Unknown unified service error'
      );
    }
    
    // ファクトリテスト
    try {
      const status = await checkLocalLLMStatus();
      const info = await getLocalLLMInfo();
      
      result.factoryTest.success = true;
      
      if (!status.lmstudio.available && !status.fooocus.available) {
        result.factoryTest.errors.push('No local LLM services available');
      }
      
    } catch (error) {
      result.factoryTest.errors.push(
        error instanceof Error ? error.message : 'Unknown factory error'
      );
    }
    
    // 設定検証
    const textValidation = hasValidAPIKey('text');
    const imageValidation = hasValidAPIKey('image');
    
    result.settingsValidation.valid = textValidation || imageValidation;
    
    if (!textValidation) {
      result.settingsValidation.errors.push('Text generation API key not configured');
    }
    if (!imageValidation) {
      result.settingsValidation.errors.push('Image generation API key not configured');
    }
    
  } catch (error) {
    result.settingsValidation.errors.push(
      error instanceof Error ? error.message : 'Unknown integration error'
    );
  }
  
  return result;
}

/**
 * ローカルLLMのクイック接続チェック
 */
export async function quickLocalLLMCheck(): Promise<{
  lmstudio: boolean;
  fooocus: boolean;
  summary: string;
}> {
  const lmstudio = await isLMStudioAvailable();
  const fooocus = await isFoocusAvailable();
  
  let summary = 'Local LLM Status: ';
  if (lmstudio && fooocus) {
    summary += 'Both LMStudio and Fooocus are available ✅';
  } else if (lmstudio) {
    summary += 'LMStudio is available, Fooocus is not ⚠️';
  } else if (fooocus) {
    summary += 'Fooocus is available, LMStudio is not ⚠️';
  } else {
    summary += 'No local LLM services available ❌';
  }
  
  return { lmstudio, fooocus, summary };
}

/**
 * デバッグ情報の出力
 */
export function printLocalLLMDebugInfo(): void {
  console.log('🔧 Local LLM Debug Information:');
  console.log('Available services:');
  console.log('- LMStudio: OpenAI-compatible local LLM');
  console.log('- Fooocus: Stable Diffusion image generation');
  
  console.log('\nDefault endpoints:');
  console.log('- LMStudio: http://localhost:1234');
  console.log('- Fooocus: http://localhost:7865');
  
  console.log('\nSupported models:');
  console.log('- LMStudio: Gemma-3n-e4b, Gemma-3-4b, deepseek-r1, phi-4-mini-reasoning');
  console.log('- Fooocus: Stable Diffusion XL, Stable Diffusion Turbo');
  
  console.log('\nTo test: await runLocalLLMDiagnostics()');
}

/**
 * 開発者向けの設定例を生成
 */
export function generateSampleLocalLLMSettings(): ExtendedUserSettings {
  return {
    theme: 'dark',
    autoSave: true,
    autoSaveInterval: 30000,
    aiProviderText: 'lmstudio',
    aiProviderImage: 'fooocus',
    aiProviderVideo: 'azure',
    providerAuth: {
      lmstudio: {
        textGeneration: {
          endpoint: 'http://localhost:1234',
          apiKey: '',
          modelName: 'Gemma 3 4B'
        }
      },
      fooocus: {
        imageGeneration: {
          endpoint: 'http://localhost:7865',
          apiKey: '',
          modelName: 'Stable Diffusion XL'
        }
      }
    },
    providerModels: {
      lmstudio: {
        textGeneration: 'gemma-3-4b'
      },
      fooocus: {
        imageGeneration: 'stable-diffusion-xl'
      }
    }
  };
}

// 開発時のグローバル関数として公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).testLocalLLM = runLocalLLMDiagnostics;
  (window as any).quickLocalLLMCheck = quickLocalLLMCheck;
  (window as any).printLocalLLMDebugInfo = printLocalLLMDebugInfo;
}