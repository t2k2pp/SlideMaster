// =================================================================
// Error Handler - 統一されたエラーハンドリングシステム
// =================================================================

import { notify } from './notificationService';

/**
 * エラーの種類
 */
export type ErrorType = 
  | 'validation'
  | 'network'
  | 'ai_api'
  | 'file_operation'
  | 'authentication'
  | 'permission'
  | 'quota_exceeded'
  | 'unknown';

/**
 * エラー情報の詳細
 */
export interface ErrorDetails {
  type: ErrorType;
  operation: string;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  userMessage?: string;
  canRetry?: boolean;
  retryAction?: () => void;
}

/**
 * 統一されたエラーハンドリングサービス
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private errorLog: ErrorDetails[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!this.instance) {
      this.instance = new ErrorHandler();
    }
    return this.instance;
  }

  /**
   * エラーを処理し、適切な通知を表示
   */
  handle(error: any, operation: string, context?: Record<string, any>): void {
    const errorDetails = this.analyzeError(error, operation, context);
    this.logError(errorDetails);
    this.notifyUser(errorDetails);
  }

  /**
   * エラーを分析してErrorDetailsを作成
   */
  private analyzeError(error: any, operation: string, context?: Record<string, any>): ErrorDetails {
    let type: ErrorType = 'unknown';
    let message = 'Unknown error occurred';
    let userMessage = '';
    let canRetry = false;

    // エラーメッセージの解析
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
    }

    // エラータイプの判定
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      type = 'network';
      userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      canRetry = true;
    } else if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('unauthorized')) {
      type = 'authentication';
      userMessage = 'APIキーが無効です。設定を確認してください。';
    } else if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')) {
      type = 'quota_exceeded';
      userMessage = 'API使用制限に達しました。しばらく待ってから再試行してください。';
      canRetry = true;
    } else if (message.toLowerCase().includes('file') || message.toLowerCase().includes('import') || message.toLowerCase().includes('export')) {
      type = 'file_operation';
      userMessage = 'ファイル操作でエラーが発生しました。ファイルが壊れている可能性があります。';
    } else if (message.toLowerCase().includes('validation') || message.toLowerCase().includes('invalid')) {
      type = 'validation';
      userMessage = '入力データに問題があります。入力内容を確認してください。';
    } else if (operation.includes('ai') || operation.includes('gemini') || operation.includes('generate')) {
      type = 'ai_api';
      userMessage = 'AI APIでエラーが発生しました。しばらく待ってから再試行してください。';
      canRetry = true;
    }

    return {
      type,
      operation,
      message,
      originalError: error,
      context,
      userMessage: userMessage || `${operation}でエラーが発生しました: ${message}`,
      canRetry
    };
  }

  /**
   * エラーをログに記録
   */
  private logError(errorDetails: ErrorDetails): void {
    // ログに追加
    this.errorLog.push({
      ...errorDetails,
      timestamp: new Date()
    } as any);

    // 最大100件まで保持
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // コンソールにも出力（開発時用）
    console.error(`[${errorDetails.type}] ${errorDetails.operation}:`, {
      message: errorDetails.message,
      context: errorDetails.context,
      originalError: errorDetails.originalError
    });
  }

  /**
   * ユーザーに通知
   */
  private notifyUser(errorDetails: ErrorDetails): void {
    const options = errorDetails.canRetry && errorDetails.retryAction ? {
      action: {
        label: '再試行',
        onClick: errorDetails.retryAction
      }
    } : undefined;

    switch (errorDetails.type) {
      case 'network':
        notify.networkError(errorDetails.operation, errorDetails.retryAction, options);
        break;
      case 'authentication':
        notify.error(`認証エラー: ${errorDetails.userMessage}`, options);
        break;
      case 'quota_exceeded':
        notify.warning(`使用制限: ${errorDetails.userMessage}`, options);
        break;
      case 'validation':
        notify.validationError(errorDetails.operation, errorDetails.userMessage || errorDetails.message, options);
        break;
      default:
        notify.error(errorDetails.userMessage || errorDetails.message, options);
    }
  }

  /**
   * AI操作専用のエラーハンドリング
   */
  handleAIError(
    error: any,
    operation: string,
    provider: string,
    retryAction?: () => void
  ): void {
    const errorDetails = this.analyzeError(error, `${operation} (${provider})`, { provider });
    errorDetails.retryAction = retryAction;
    
    this.logError(errorDetails);
    
    // AI操作専用の通知
    notify.aiOperation('error', operation, provider);
    
    // 詳細なエラー情報も表示
    if (errorDetails.userMessage !== `${operation} (${provider})でエラーが発生しました`) {
      notify.error(errorDetails.userMessage);
    }
  }

  /**
   * 画像生成専用のエラーハンドリング
   */
  handleImageGenerationError(
    error: any,
    count: number = 1,
    provider: string,
    useFallback: boolean = true,
    retryAction?: () => void
  ): void {
    const operation = count > 1 ? `${count}枚の画像生成` : '画像生成';
    const errorDetails = this.analyzeError(error, operation, { provider, count });
    errorDetails.retryAction = retryAction;
    
    this.logError(errorDetails);
    
    // 画像生成エラー通知
    notify.imageGeneration('error', count, provider);
    
    // フォールバック通知
    if (useFallback) {
      notify.imageGeneration('fallback', count);
    }
  }

  /**
   * プロジェクト保存エラーハンドリング
   */
  handleProjectSaveError(
    error: any,
    filename?: string,
    retryAction?: () => void
  ): void {
    const errorDetails = this.analyzeError(error, 'プロジェクト保存', { filename });
    errorDetails.retryAction = retryAction;
    
    this.logError(errorDetails);
    notify.projectSave('error');
    
    // 詳細なエラー情報
    if (errorDetails.userMessage) {
      notify.error(errorDetails.userMessage);
    }
  }

  /**
   * プロジェクトインポートエラーハンドリング
   */
  handleProjectImportError(
    error: any,
    filename?: string
  ): void {
    const errorDetails = this.analyzeError(error, 'プロジェクトインポート', { filename });
    
    this.logError(errorDetails);
    notify.projectImport('error');
    
    // 詳細なエラー情報
    if (errorDetails.userMessage) {
      notify.error(errorDetails.userMessage);
    }
  }

  /**
   * エラーログを取得
   */
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * エラー統計を取得
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsByOperation: Record<string, number>;
    recentErrors: ErrorDetails[];
  } {
    const totalErrors = this.errorLog.length;
    
    const errorsByType = this.errorLog.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);
    
    const errorsByOperation = this.errorLog.reduce((acc, error) => {
      acc[error.operation] = (acc[error.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recentErrors = this.errorLog.slice(-10);
    
    return {
      totalErrors,
      errorsByType,
      errorsByOperation,
      recentErrors
    };
  }
}

// シングルトンインスタンスをエクスポート
export const errorHandler = ErrorHandler.getInstance();

// 便利な関数をエクスポート
export const handleError = (error: any, operation: string, context?: Record<string, any>) => 
  errorHandler.handle(error, operation, context);

export const handleAIError = (error: any, operation: string, provider: string, retryAction?: () => void) =>
  errorHandler.handleAIError(error, operation, provider, retryAction);

export const handleImageGenerationError = (
  error: any, 
  count: number = 1, 
  provider: string, 
  useFallback: boolean = true, 
  retryAction?: () => void
) => errorHandler.handleImageGenerationError(error, count, provider, useFallback, retryAction);

export const handleProjectSaveError = (error: any, filename?: string, retryAction?: () => void) =>
  errorHandler.handleProjectSaveError(error, filename, retryAction);

export const handleProjectImportError = (error: any, filename?: string) =>
  errorHandler.handleProjectImportError(error, filename);