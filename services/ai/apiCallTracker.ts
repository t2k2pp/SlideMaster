// =================================================================
// API Call Tracker - API呼び出し追跡システム
// すべてのAI API呼び出しを監視し、完全性を保証
// =================================================================

import { completeAIHistory, APICallDetails } from './completeAIHistoryService';

/**
 * API呼び出しメタデータ
 */
export interface CallMetadata {
  interactionId: string;
  provider: string;
  model: string;
  endpoint: string;
  method: string;
  startTime: number;
  timeout?: number;
  retryCount?: number;
  contextInfo?: any;
}

/**
 * API呼び出し結果
 */
export interface CallResult {
  success: boolean;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  duration: number;
  endTime: number;
}

/**
 * API呼び出し統計
 */
export interface CallStatistics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  pendingCalls: number;
  averageResponseTime: number;
  callsByProvider: Record<string, number>;
  callsByEndpoint: Record<string, number>;
  errorsByCode: Record<string, number>;
}

/**
 * API呼び出し追跡システム
 * すべてのAI API呼び出しを監視し、完全性とパフォーマンスを追跡
 */
export class APICallTracker {
  private static instance: APICallTracker | null = null;
  private pendingCalls: Map<string, CallMetadata> = new Map();
  private completedCalls: Map<string, CallMetadata & CallResult> = new Map();
  private callSequence: number = 0;

  private constructor() {
    console.log('🔍 APICallTracker initialized');
    
    // 定期的なクリーンアップ（5分間隔）
    setInterval(() => this.performCleanup(), 5 * 60 * 1000);
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): APICallTracker {
    if (!this.instance) {
      this.instance = new APICallTracker();
    }
    return this.instance;
  }

  /**
   * API呼び出し開始を記録
   */
  trackCallStart(
    interactionId: string,
    provider: string,
    model: string,
    endpoint: string,
    method: string = 'POST',
    options?: {
      timeout?: number;
      retryCount?: number;
      contextInfo?: any;
    }
  ): string {
    const callId = this.generateCallId();
    const metadata: CallMetadata = {
      interactionId,
      provider,
      model,
      endpoint,
      method,
      startTime: Date.now(),
      timeout: options?.timeout,
      retryCount: options?.retryCount,
      contextInfo: options?.contextInfo
    };

    this.pendingCalls.set(callId, metadata);
    
    console.log(`📞 API Call started: ${callId}`);
    console.log(`   Provider: ${provider}, Model: ${model}`);
    console.log(`   Endpoint: ${endpoint}, Method: ${method}`);
    
    return callId;
  }

  /**
   * API呼び出し完了を記録
   */
  trackCallEnd(
    callId: string,
    result: {
      success: boolean;
      statusCode?: number;
      responseHeaders?: Record<string, string>;
      responseBody?: any;
      error?: {
        code: string;
        message: string;
        stack?: string;
      };
    }
  ): void {
    const metadata = this.pendingCalls.get(callId);
    if (!metadata) {
      console.warn(`⚠️ Cannot track call end for unknown call: ${callId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metadata.startTime;
    
    const callResult: CallResult = {
      ...result,
      duration,
      endTime
    };

    // 完了済みコールに移動
    const completedCall = { ...metadata, ...callResult };
    this.completedCalls.set(callId, completedCall);
    this.pendingCalls.delete(callId);

    // CompleteAIHistoryServiceにAPIコール詳細を記録
    const apiCallDetails: Omit<APICallDetails, 'callId' | 'timestamp'> = {
      provider: metadata.provider,
      model: metadata.model,
      endpoint: metadata.endpoint,
      httpMethod: metadata.method,
      requestHeaders: {
        'Content-Type': 'application/json',
        'User-Agent': `SlideMaster/1.0`
      },
      requestBody: metadata.contextInfo?.requestBody,
      responseHeaders: result.responseHeaders,
      responseBody: result.responseBody,
      statusCode: result.statusCode,
      duration,
      error: result.error
    };

    completeAIHistory.recordAPICallDetails(metadata.interactionId, apiCallDetails);

    console.log(`✅ API Call completed: ${callId} (${duration}ms)`);
    if (result.success) {
      console.log(`   Status: ${result.statusCode || 'unknown'}`);
    } else {
      console.log(`   Error: ${result.error?.message || 'unknown error'}`);
    }
  }

  /**
   * API呼び出し失敗を記録
   */
  trackCallFailure(
    callId: string,
    error: {
      code: string;
      message: string;
      stack?: string;
    },
    statusCode?: number
  ): void {
    this.trackCallEnd(callId, {
      success: false,
      statusCode,
      error
    });
  }

  /**
   * タイムアウトしたコールをチェック
   */
  checkTimeouts(): string[] {
    const now = Date.now();
    const timedOutCalls: string[] = [];

    for (const [callId, metadata] of this.pendingCalls.entries()) {
      const timeout = metadata.timeout || 60000; // デフォルト60秒
      if (now - metadata.startTime > timeout) {
        timedOutCalls.push(callId);
        
        // タイムアウトとして記録
        this.trackCallFailure(callId, {
          code: 'TIMEOUT',
          message: `API call timed out after ${timeout}ms`
        }, 408);
      }
    }

    if (timedOutCalls.length > 0) {
      console.warn(`⏰ Found ${timedOutCalls.length} timed out API calls`);
    }

    return timedOutCalls;
  }

  /**
   * 未完了コールをチェック
   */
  checkPendingCalls(): string[] {
    const pendingCallIds = Array.from(this.pendingCalls.keys());
    
    if (pendingCallIds.length > 0) {
      console.log(`⏳ Found ${pendingCallIds.length} pending API calls`);
      
      // 長時間pending状態のコールを警告
      const now = Date.now();
      const longPendingCalls = pendingCallIds.filter(callId => {
        const metadata = this.pendingCalls.get(callId);
        return metadata && (now - metadata.startTime > 30000); // 30秒以上
      });

      if (longPendingCalls.length > 0) {
        console.warn(`⚠️ Found ${longPendingCalls.length} long-pending API calls (>30s)`);
      }
    }

    return pendingCallIds;
  }

  /**
   * API呼び出し統計を取得
   */
  getStatistics(): CallStatistics {
    const allCalls = Array.from(this.completedCalls.values());
    const totalCalls = allCalls.length;
    const successfulCalls = allCalls.filter(call => call.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const pendingCalls = this.pendingCalls.size;

    // 平均応答時間
    const durations = allCalls.map(call => call.duration);
    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    // プロバイダー別統計
    const callsByProvider = allCalls.reduce((acc, call) => {
      acc[call.provider] = (acc[call.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // エンドポイント別統計
    const callsByEndpoint = allCalls.reduce((acc, call) => {
      acc[call.endpoint] = (acc[call.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // エラーコード別統計
    const errorsByCode = allCalls
      .filter(call => !call.success && call.error)
      .reduce((acc, call) => {
        const code = call.error!.code;
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      pendingCalls,
      averageResponseTime,
      callsByProvider,
      callsByEndpoint,
      errorsByCode
    };
  }

  /**
   * 特定のインタラクションのAPI呼び出しを取得
   */
  getCallsForInteraction(interactionId: string): Array<CallMetadata & Partial<CallResult>> {
    const calls: Array<CallMetadata & Partial<CallResult>> = [];
    
    // 完了済みコール
    for (const call of this.completedCalls.values()) {
      if (call.interactionId === interactionId) {
        calls.push(call);
      }
    }
    
    // 保留中コール
    for (const call of this.pendingCalls.values()) {
      if (call.interactionId === interactionId) {
        calls.push(call);
      }
    }
    
    return calls.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * コール詳細を取得
   */
  getCallDetails(callId: string): (CallMetadata & Partial<CallResult>) | null {
    const completed = this.completedCalls.get(callId);
    if (completed) {
      return completed;
    }
    
    const pending = this.pendingCalls.get(callId);
    if (pending) {
      return pending;
    }
    
    return null;
  }

  /**
   * 定期的なクリーンアップ
   */
  private performCleanup(): void {
    const now = Date.now();
    const cleanupCutoff = now - (2 * 60 * 60 * 1000); // 2時間前
    
    // 古い完了済みコールを削除
    let cleanedCount = 0;
    for (const [callId, call] of this.completedCalls.entries()) {
      if (call.endTime && call.endTime < cleanupCutoff) {
        this.completedCalls.delete(callId);
        cleanedCount++;
      }
    }
    
    // タイムアウトチェックも実行
    const timeouts = this.checkTimeouts();
    
    if (cleanedCount > 0 || timeouts.length > 0) {
      console.log(`🧹 API Call Tracker cleanup: removed ${cleanedCount} old calls, ${timeouts.length} timeouts`);
    }
  }

  /**
   * 手動クリーンアップ
   */
  cleanup(): void {
    this.performCleanup();
  }

  /**
   * 全データをクリア（テスト用）
   */
  clearAll(): void {
    this.pendingCalls.clear();
    this.completedCalls.clear();
    this.callSequence = 0;
    console.log('🧹 APICallTracker: All data cleared');
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    pendingCalls: Array<{ callId: string; metadata: CallMetadata }>;
    recentCompletedCalls: Array<{ callId: string; call: CallMetadata & CallResult }>;
    statistics: CallStatistics;
  } {
    const pendingCalls = Array.from(this.pendingCalls.entries())
      .map(([callId, metadata]) => ({ callId, metadata }));
    
    const recentCompletedCalls = Array.from(this.completedCalls.entries())
      .filter(([, call]) => call.endTime > Date.now() - (30 * 60 * 1000)) // 過去30分
      .map(([callId, call]) => ({ callId, call }))
      .slice(-20); // 最新20件

    return {
      pendingCalls,
      recentCompletedCalls,
      statistics: this.getStatistics()
    };
  }

  /**
   * コールID生成
   */
  private generateCallId(): string {
    this.callSequence++;
    return `call-${Date.now()}-${this.callSequence.toString().padStart(6, '0')}`;
  }
}

// シングルトンインスタンスをエクスポート
export const apiCallTracker = APICallTracker.getInstance();