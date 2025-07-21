import { GoogleGenAI } from "@google/genai";

// Note: GoogleAIFileManager might not be available in this version
// We'll implement a fallback or alternative approach
let GoogleAIFileManager: any;

// =================================================================
// Gemini API Client - Shared API configuration and client
// =================================================================

// デフォルトAPIキー（設定から取得、なければundefined）
const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Gemini API client instance
let genAI: GoogleGenAI | null = null;
let fileManager: any | null = null; // Changed type to any since GoogleAIFileManager might not be available
let currentApiKey: string | undefined = DEFAULT_API_KEY;

// AI Temperature settings for different tasks
export const AI_TEMPERATURE_DEFAULTS = {
  text_generation: 0.7,
  content_analysis: 0.3,
  creative_writing: 0.9,
  technical_documentation: 0.5,
  slide_generation: 0.6,
  image_generation: 0.8,
  video_analysis: 0.4
} as const;

export type AITask = keyof typeof AI_TEMPERATURE_DEFAULTS;

export const getTemperatureForTask = (
  task: AITask,
  customTemperature?: number
): number => {
  if (customTemperature !== undefined) {
    // 0.0 から 1.0 の範囲でクランプ
    return Math.max(0.0, Math.min(1.0, customTemperature));
  }
  
  return AI_TEMPERATURE_DEFAULTS[task];
};

/**
 * APIキーを設定し、Gemini AI クライアントを初期化
 */
export const setApiKey = (apiKey: string) => {
  if (!apiKey) {
    throw new Error('An API Key must be set when running in a browser');
  }
  currentApiKey = apiKey;
  genAI = new GoogleGenAI({ apiKey });
  
  // Try to initialize GoogleAIFileManager if available
  try {
    if (GoogleAIFileManager) {
      fileManager = new GoogleAIFileManager(apiKey);
    }
  } catch (error) {
    console.warn('GoogleAIFileManager not available in this version:', error);
    fileManager = null;
  }
};

/**
 * 現在のAPIキーを取得
 */
export const getCurrentApiKey = (): string | undefined => {
  return currentApiKey;
};

/**
 * Gemini AI クライアントを取得（自動初期化付き）
 */
export const getGeminiClient = (userApiKey?: string): GoogleGenAI => {
  // ユーザーが指定したAPIキーがある場合
  if (userApiKey) {
    if (userApiKey !== currentApiKey) {
      setApiKey(userApiKey);
    }
    return genAI!;
  }
  
  // 既存のAIインスタンスがある場合
  if (genAI) {
    return genAI;
  }
  
  // デフォルトAPIキーがある場合
  if (DEFAULT_API_KEY) {
    setApiKey(DEFAULT_API_KEY);
    return genAI!;
  }
  
  // localStorageからAPIキーを取得
  const storedApiKey = localStorage.getItem('slidemaster_user_api_key');
  if (storedApiKey) {
    setApiKey(storedApiKey);
    return genAI!;
  }
  
  // APIキーが全く設定されていない場合
  throw new Error("APIキーが設定されていません。設定画面でGemini APIキーを入力してください。");
};

/**
 * Legacy compatibility function - alias for getGeminiClient
 */
export const getAI = getGeminiClient;

/**
 * Gemini File Manager を取得（自動初期化付き）
 */
export const getFileManager = (userApiKey?: string): any => {
  const apiKey = userApiKey || currentApiKey;
  
  if (!apiKey) {
    throw new Error('API key is required. Please set it using setApiKey() or provide it as a parameter.');
  }
  
  if (!fileManager || (userApiKey && userApiKey !== currentApiKey)) {
    setApiKey(apiKey);
  }
  
  if (!fileManager) {
    throw new Error('GoogleAIFileManager is not available in this version of @google/genai');
  }
  
  return fileManager;
};

/**
 * APIキーが設定されているかチェック
 */
export const isApiKeySet = (): boolean => {
  return !!currentApiKey;
};

/**
 * 共通エラーハンドリング
 */
export const handleGeminiError = (error: unknown, context: string): Error => {
  console.error(`Gemini API Error in ${context}:`, error);
  
  if (error instanceof Error) {
    if (error.message.includes('API_KEY_INVALID')) {
      return new Error('Invalid API key. Please check your Gemini API key configuration.');
    }
    if (error.message.includes('QUOTA_EXCEEDED')) {
      return new Error('API quota exceeded. Please check your usage limits.');
    }
    if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
      return new Error('Rate limit exceeded. Please try again later.');
    }
    return new Error(`${context}: ${error.message}`);
  }
  
  return new Error(`${context}: Unknown error occurred`);
};