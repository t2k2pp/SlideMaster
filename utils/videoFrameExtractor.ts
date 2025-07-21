// =================================================================
// Video Frame Extractor Utility
// =================================================================

export interface FrameExtractionResult {
  timestamp: number;
  frames: string[]; // base64 data URLs
  success: boolean;
  error?: string;
}

export interface VideoFrameExtractorOptions {
  frameCount?: number; // Default: 3
  timeOffset?: number; // Default: 1 (±1 second)
  quality?: number; // Default: 0.8
}

/**
 * Extract frames from video at specified timestamps
 */
export class VideoFrameExtractor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private videoUrl: string | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d')!;
    // Store the blob URL for later cleanup
    this.videoUrl = this.video.src;
  }

  /**
   * Extract frames at specified timestamp
   */
  async extractFrames(
    timestamp: number,
    options: VideoFrameExtractorOptions = {}
  ): Promise<FrameExtractionResult> {
    const { frameCount = 3, timeOffset = 1, quality = 0.8 } = options;

    try {
      // Calculate target timestamps
      const timestamps = this.calculateTimestamps(timestamp, frameCount, timeOffset);
      const frames: string[] = [];

      for (const ts of timestamps) {
        try {
          const frame = await this.captureFrameAtTime(ts, quality);
          frames.push(frame);
        } catch (error) {
          console.warn(`Failed to capture frame at ${ts}s:`, error);
          // Continue with other frames even if one fails
        }
      }

      return {
        timestamp,
        frames,
        success: frames.length > 0,
        error: frames.length === 0 ? 'No frames could be extracted' : undefined
      };
    } catch (error) {
      return {
        timestamp,
        frames: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract frames for multiple timestamps
   */
  async extractMultipleFrames(
    timestamps: number[],
    options: VideoFrameExtractorOptions = {}
  ): Promise<FrameExtractionResult[]> {
    const results: FrameExtractionResult[] = [];

    for (const timestamp of timestamps) {
      const result = await this.extractFrames(timestamp, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Capture a single frame at specific time
   */
  private async captureFrameAtTime(timestamp: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if video is ready
      if (this.video.readyState < 2) {
        reject(new Error('Video not ready for frame extraction'));
        return;
      }

      const seekedHandler = () => {
        try {
          // Ensure video dimensions are available
          if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            this.video.removeEventListener('seeked', seekedHandler);
            reject(new Error('Video dimensions not available'));
            return;
          }

          // Set canvas size to match video dimensions
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;

          // Draw current frame to canvas
          this.context.drawImage(
            this.video,
            0,
            0,
            this.video.videoWidth,
            this.video.videoHeight
          );

          // Convert canvas to base64 data URL
          const dataURL = this.canvas.toDataURL('image/jpeg', quality);
          
          // Clean up event listener
          this.video.removeEventListener('seeked', seekedHandler);
          
          resolve(dataURL);
        } catch (error) {
          this.video.removeEventListener('seeked', seekedHandler);
          reject(error);
        }
      };

      const errorHandler = () => {
        this.video.removeEventListener('seeked', seekedHandler);
        this.video.removeEventListener('error', errorHandler);
        reject(new Error('Video error occurred during seeking'));
      };

      // Add event listeners
      this.video.addEventListener('seeked', seekedHandler);
      this.video.addEventListener('error', errorHandler);

      // Seek to target timestamp
      const targetTime = Math.max(0, Math.min(timestamp, this.video.duration));
      this.video.currentTime = targetTime;
    });
  }

  /**
   * Calculate timestamps for frame extraction
   */
  private calculateTimestamps(
    centerTime: number,
    frameCount: number,
    timeOffset: number
  ): number[] {
    const timestamps: number[] = [];
    const duration = this.video.duration;

    if (frameCount === 1) {
      timestamps.push(Math.max(0, Math.min(centerTime, duration)));
    } else if (frameCount === 2) {
      timestamps.push(
        Math.max(0, Math.min(centerTime - timeOffset, duration)),
        Math.max(0, Math.min(centerTime + timeOffset, duration))
      );
    } else {
      // Default: 3 frames (before, at, after)
      timestamps.push(
        Math.max(0, Math.min(centerTime - timeOffset, duration)),
        Math.max(0, Math.min(centerTime, duration)),
        Math.max(0, Math.min(centerTime + timeOffset, duration))
      );
    }

    return timestamps;
  }

  /**
   * Get video metadata
   */
  getVideoMetadata() {
    return {
      duration: this.video.duration,
      width: this.video.videoWidth,
      height: this.video.videoHeight,
      currentTime: this.video.currentTime
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.canvas.remove();
    // Clean up blob URL if it exists
    if (this.videoUrl && this.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoUrl);
    }
  }
}

/**
 * Utility function to create video element from file
 */
export function createVideoFromFile(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadeddata = () => {
      // Wait for video data to be loaded (readyState >= 2)
      if (video.readyState >= 2) {
        resolve(video);
      } else {
        // If not ready, wait for canplay event
        video.addEventListener('canplay', () => {
          resolve(video);
        }, { once: true });
      }
    };

    video.onloadedmetadata = () => {
      // Metadata loaded, but we need to wait for data too
      if (video.readyState >= 2) {
        resolve(video);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file'));
    };

    video.src = url;
    video.load(); // Explicitly load the video
  });
}

/**
 * Convert time string (MM:SS) to seconds
 */
export function timeStringToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Convert seconds to time string (MM:SS)
 */
export function secondsToTimeString(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}