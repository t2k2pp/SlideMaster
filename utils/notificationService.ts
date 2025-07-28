// =================================================================
// Notification Service - 統一されたユーザー通知システム
// =================================================================

import { toast } from 'react-hot-toast';

/**
 * 通知の種類
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * 通知オプション
 */
export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 統一された通知サービス
 */
export class NotificationService {
  private static instance: NotificationService | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  /**
   * 成功通知を表示
   */
  success(message: string, options?: NotificationOptions): string {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      style: {
        background: '#10b981',
        color: '#ffffff',
        fontWeight: '500',
      },
    });
  }

  /**
   * エラー通知を表示
   */
  error(message: string, options?: NotificationOptions): string {
    return toast.error(message, {
      duration: options?.duration || 6000,
      position: options?.position || 'top-right',
      style: {
        background: '#ef4444',
        color: '#ffffff',
        fontWeight: '500',
      },
    });
  }

  /**
   * 警告通知を表示
   */
  warning(message: string, options?: NotificationOptions): string {
    return toast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#ffffff',
        fontWeight: '500',
      },
    });
  }

  /**
   * 情報通知を表示
   */
  info(message: string, options?: NotificationOptions): string {
    return toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#ffffff',
        fontWeight: '500',
      },
    });
  }

  /**
   * ローディング通知を表示
   */
  loading(message: string, options?: NotificationOptions): string {
    return toast.loading(message, {
      position: options?.position || 'top-right',
      style: {
        background: '#6b7280',
        color: '#ffffff',
        fontWeight: '500',
      },
    });
  }

  /**
   * 通知を閉じる
   */
  dismiss(toastId: string): void {
    toast.dismiss(toastId);
  }

  /**
   * すべての通知を閉じる
   */
  dismissAll(): void {
    toast.dismiss();
  }

  /**
   * プロミスと連動した通知（成功/失敗を自動判定）
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((error: any) => string);
    },
    options?: NotificationOptions
  ): Promise<T> {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    }, {
      position: options?.position || 'top-right',
      style: {
        fontWeight: '500',
      },
    });
  }

  /**
   * AI操作専用の通知（プロバイダー情報付き）
   */
  aiOperation(
    type: 'start' | 'success' | 'error',
    operation: string,
    provider?: string,
    options?: NotificationOptions
  ): string {
    const providerText = provider ? ` (${provider})` : '';
    
    switch (type) {
      case 'start':
        return this.loading(`${operation}${providerText}を実行中...`, options);
      case 'success':
        return this.success(`${operation}${providerText}が完了しました`, options);
      case 'error':
        return this.error(`${operation}${providerText}でエラーが発生しました`, options);
      default:
        return '';
    }
  }

  /**
   * 画像生成専用の通知
   */
  imageGeneration(
    type: 'start' | 'success' | 'error' | 'fallback',
    count: number = 1,
    provider?: string,
    options?: NotificationOptions
  ): string {
    const countText = count > 1 ? `${count}枚の` : '';
    const providerText = provider ? ` (${provider})` : '';
    
    switch (type) {
      case 'start':
        return this.loading(`${countText}画像生成${providerText}を実行中...`, options);
      case 'success':
        return this.success(`${countText}画像生成${providerText}が完了しました`, options);
      case 'error':
        return this.error(`${countText}画像生成${providerText}でエラーが発生しました`, options);
      case 'fallback':
        return this.warning(`画像生成に失敗したため、プレースホルダー画像を使用しています`, options);
      default:
        return '';
    }
  }

  /**
   * プロジェクト保存専用の通知
   */
  projectSave(
    type: 'start' | 'success' | 'error' | 'sanitized',
    filename?: string,
    sanitizedCount?: number,
    options?: NotificationOptions
  ): string {
    switch (type) {
      case 'start':
        return this.loading('プロジェクトを保存中...', options);
      case 'success':
        const successMessage = filename 
          ? `プロジェクトを保存しました: ${filename}` 
          : 'プロジェクトを保存しました';
        return this.success(successMessage, options);
      case 'error':
        return this.error('プロジェクトの保存に失敗しました', options);
      case 'sanitized':
        const sanitizedMessage = sanitizedCount 
          ? `${sanitizedCount}件の無効な画像データを修正してプロジェクトを保存しました`
          : '一部の画像データを修正してプロジェクトを保存しました';
        return this.warning(sanitizedMessage, options);
      default:
        return '';
    }
  }

  /**
   * インポート専用の通知
   */
  projectImport(
    type: 'start' | 'success' | 'error' | 'warning',
    details?: {
      filename?: string;
      warnings?: string[];
      slidesCount?: number;
    },
    options?: NotificationOptions
  ): string {
    switch (type) {
      case 'start':
        return this.loading('プロジェクトをインポート中...', options);
      case 'success':
        const successMessage = details?.slidesCount 
          ? `プロジェクトをインポートしました (${details.slidesCount}スライド)`
          : 'プロジェクトをインポートしました';
        return this.success(successMessage, options);
      case 'error':
        return this.error('プロジェクトのインポートに失敗しました', options);
      case 'warning':
        const warningMessage = details?.warnings?.length 
          ? `インポート時に警告が発生しました: ${details.warnings.join(', ')}`
          : 'インポート時に警告が発生しました';
        return this.warning(warningMessage, options);
      default:
        return '';
    }
  }

  /**
   * コピー操作専用の通知
   */
  copy(text: string, options?: NotificationOptions): string {
    return this.success(`クリップボードにコピーしました: ${text}`, {
      ...options,
      duration: 2000,
    });
  }

  /**
   * バリデーションエラー専用の通知
   */
  validationError(field: string, message: string, options?: NotificationOptions): string {
    return this.error(`${field}: ${message}`, options);
  }

  /**
   * ネットワークエラー専用の通知
   */
  networkError(operation: string, retry?: () => void, options?: NotificationOptions): string {
    return this.error(`${operation}でネットワークエラーが発生しました`, {
      ...options,
      action: retry ? {
        label: '再試行',
        onClick: retry
      } : undefined
    });
  }
}

// シングルトンインスタンスをエクスポート
export const notify = NotificationService.getInstance();

// 便利な関数をエクスポート
export const showSuccess = (message: string, options?: NotificationOptions) => notify.success(message, options);
export const showError = (message: string, options?: NotificationOptions) => notify.error(message, options);
export const showWarning = (message: string, options?: NotificationOptions) => notify.warning(message, options);
export const showInfo = (message: string, options?: NotificationOptions) => notify.info(message, options);
export const showLoading = (message: string, options?: NotificationOptions) => notify.loading(message, options);