// =================================================================
// Image Generation Queue - 並列画像生成制御
// セマフォ的な仕組みで同時生成数を制限
// =================================================================

export interface ImageGenerationTask {
  id: string;
  prompt: string;
  options?: {
    size?: 'square' | 'landscape' | 'portrait';
    quality?: 'low' | 'medium' | 'high';
    style?: 'natural' | 'vivid';
  };
}

export interface ImageGenerationResult {
  id: string;
  imageUrl?: string;
  error?: string;
}

export class ImageGenerationQueue {
  private concurrentLimit: number;
  private activeTasks: Set<Promise<void>> = new Set();
  private pendingTasks: ImageGenerationTask[] = [];
  private results: Map<string, ImageGenerationResult> = new Map();
  private generateImageFn: (prompt: string, options?: any) => Promise<string>;
  private onProgress?: (completed: number, total: number) => void;
  private onComplete?: (results: ImageGenerationResult[]) => void;

  constructor(
    concurrentLimit: number,
    generateImageFn: (prompt: string, options?: any) => Promise<string>,
    onProgress?: (completed: number, total: number) => void,
    onComplete?: (results: ImageGenerationResult[]) => void
  ) {
    this.concurrentLimit = concurrentLimit;
    this.generateImageFn = generateImageFn;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
  }

  async processImages(tasks: ImageGenerationTask[]): Promise<ImageGenerationResult[]> {
    // 初期化
    this.pendingTasks = [...tasks];
    this.results.clear();
    this.activeTasks.clear();

    const totalTasks = tasks.length;
    let completedTasks = 0;

    // 並列処理開始
    const processNext = async (): Promise<void> => {
      while (this.pendingTasks.length > 0 && this.activeTasks.size < this.concurrentLimit) {
        const task = this.pendingTasks.shift()!;
        
        const taskPromise = this.processTask(task).then(() => {
          completedTasks++;
          this.activeTasks.delete(taskPromise);
          
          // 進捗通知
          if (this.onProgress) {
            this.onProgress(completedTasks, totalTasks);
          }
          
          // 次のタスクを開始
          return processNext();
        });

        this.activeTasks.add(taskPromise);
      }

      // すべてのタスクが完了するまで待機
      if (this.activeTasks.size > 0) {
        await Promise.all(Array.from(this.activeTasks));
      }
    };

    // 処理開始
    await processNext();

    // 結果を配列で返す
    const results = tasks.map(task => 
      this.results.get(task.id) || { id: task.id, error: 'No result found' }
    );

    // 完了通知
    if (this.onComplete) {
      this.onComplete(results);
    }

    return results;
  }

  private async processTask(task: ImageGenerationTask): Promise<void> {
    try {
      const imageUrl = await this.generateImageFn(task.prompt, task.options);
      this.results.set(task.id, { id: task.id, imageUrl });
    } catch (error) {
      console.error(`Image generation failed for task ${task.id}:`, error);
      this.results.set(task.id, { 
        id: task.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // 進行中のタスクをキャンセル（実際のAPI呼び出しはキャンセルできないが、結果を無視）
  cancel(): void {
    this.pendingTasks = [];
    this.activeTasks.clear();
  }

  // 現在の状態を取得
  getStatus(): {
    pending: number;
    active: number;
    completed: number;
  } {
    return {
      pending: this.pendingTasks.length,
      active: this.activeTasks.size,
      completed: this.results.size
    };
  }
}