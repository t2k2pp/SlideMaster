// =================================================================
// Individual AI History Exporter - AI履歴個別ファイル化システム
// 各AI対話を個別ファイルに出力し、プロジェクトエクスポートに含める
// =================================================================

import JSZip from 'jszip';
import { 
  AIInteractionHistoryItem,
  AIInteractionType,
  AIInteractionInput,
  AIInteractionOutput 
} from '../../types';
import { completeAIHistory, PromptTransformation, APICallDetails } from './completeAIHistoryService';

/**
 * AI対話個別ファイル情報
 */
export interface IndividualInteractionFile {
  fileName: string;
  content: string;
  interactionId: string;
  timestamp: Date;
  fileType: 'json' | 'markdown' | 'text';
  size: number;
}

/**
 * エクスポート設定
 */
export interface ExportConfiguration {
  includePromptTransformations: boolean;
  includeAPICallDetails: boolean;
  includeMetadata: boolean;
  includeErrorDetails: boolean;
  fileFormat: 'json' | 'markdown' | 'both';
  separateByProvider: boolean;
  separateByType: boolean;
  humanReadableFormat: boolean;
}

/**
 * AI履歴を個別ファイルとしてエクスポートするサービス
 * ユーザー要求: 「送信、応答毎にすべてファイルを分けて含める」
 */
export class IndividualAIHistoryExporter {
  private static instance: IndividualAIHistoryExporter | null = null;

  private constructor() {
    console.log('📁 IndividualAIHistoryExporter initialized');
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): IndividualAIHistoryExporter {
    if (!this.instance) {
      this.instance = new IndividualAIHistoryExporter();
    }
    return this.instance;
  }

  /**
   * すべてのAI対話を個別ファイルとしてZIPに追加
   */
  async exportIndividualInteractionsToZip(
    zip: JSZip,
    interactions: AIInteractionHistoryItem[],
    config: ExportConfiguration = this.getDefaultConfig()
  ): Promise<IndividualInteractionFile[]> {
    const exportedFiles: IndividualInteractionFile[] = [];
    
    // AI履歴フォルダを作成
    const aiHistoryFolder = zip.folder('ai_interactions');
    if (!aiHistoryFolder) {
      throw new Error('Failed to create AI interactions folder in ZIP');
    }

    // 各インタラクションを個別にエクスポート
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      
      try {
        console.log(`📄 Exporting interaction ${i + 1}/${interactions.length}: ${interaction.id}`);
        
        // 個別ファイルを生成
        const files = await this.createIndividualFiles(interaction, config, i + 1);
        
        // ZIPに追加し、記録
        for (const file of files) {
          const folderPath = this.determineFolderPath(interaction, config);
          const targetFolder = folderPath ? aiHistoryFolder.folder(folderPath) : aiHistoryFolder;
          
          if (targetFolder) {
            targetFolder.file(file.fileName, file.content);
            exportedFiles.push(file);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to export interaction ${interaction.id}:`, error);
        // エラーが発生しても他のファイルの処理を続行
      }
    }

    // インデックスファイルを作成
    await this.createIndexFile(aiHistoryFolder, exportedFiles, interactions);
    
    console.log(`✅ Exported ${exportedFiles.length} individual AI interaction files`);
    return exportedFiles;
  }

  /**
   * 単一のAI対話から個別ファイルを作成
   */
  private async createIndividualFiles(
    interaction: AIInteractionHistoryItem,
    config: ExportConfiguration,
    sequenceNumber: number
  ): Promise<IndividualInteractionFile[]> {
    const files: IndividualInteractionFile[] = [];
    const timestamp = interaction.timestamp;
    const dateStr = this.formatDateForFilename(timestamp);
    const baseFileName = `${sequenceNumber.toString().padStart(3, '0')}_${interaction.type}_${dateStr}_${interaction.id}`;

    // JSON形式ファイル
    if (config.fileFormat === 'json' || config.fileFormat === 'both') {
      const jsonFile = await this.createJSONFile(interaction, config, baseFileName);
      files.push(jsonFile);
    }

    // Markdown形式ファイル（人間が読みやすい形式）
    if (config.fileFormat === 'markdown' || config.fileFormat === 'both' || config.humanReadableFormat) {
      const markdownFile = await this.createMarkdownFile(interaction, config, baseFileName);
      files.push(markdownFile);
    }

    return files;
  }

  /**
   * JSON形式ファイルを作成
   */
  private async createJSONFile(
    interaction: AIInteractionHistoryItem,
    config: ExportConfiguration,
    baseFileName: string
  ): Promise<IndividualInteractionFile> {
    const interactionData: any = {
      // 基本情報
      id: interaction.id,
      type: interaction.type,
      status: interaction.status,
      timestamp: interaction.timestamp,
      provider: interaction.provider,
      model: interaction.model,
      
      // 入力データ
      input: this.sanitizeInput(interaction.input),
      
      // 出力データ
      output: interaction.output ? this.sanitizeOutput(interaction.output) : null,
      
      // エラー情報
      error: config.includeErrorDetails ? interaction.error : null,
      
      // コスト情報
      cost: interaction.cost,
      
      // 基本メタデータ
      duration: interaction.duration,
      userRating: interaction.userRating,
      userFeedback: interaction.userFeedback,
      sessionId: interaction.sessionId,
      slideId: interaction.slideId,
      layerId: interaction.layerId,
      parentId: interaction.parentId
    };

    // 拡張メタデータ
    if (config.includeMetadata && interaction.metadata) {
      interactionData.metadata = interaction.metadata;
    }

    // プロンプト変換履歴
    if (config.includePromptTransformations) {
      const transformations = completeAIHistory.getPromptTransformations(interaction.id);
      const interactionTransformations = transformations.get(interaction.id) || [];
      if (interactionTransformations.length > 0) {
        interactionData.promptTransformations = interactionTransformations;
      }
    }

    // API呼び出し詳細
    if (config.includeAPICallDetails) {
      const apiCallIds = interaction.metadata?.apiCallIds || [];
      const apiCallDetails: APICallDetails[] = [];
      
      for (const callId of apiCallIds) {
        const details = completeAIHistory.getAPICallDetails(callId);
        const callDetail = details.get(callId);
        if (callDetail) {
          apiCallDetails.push(callDetail);
        }
      }
      
      if (apiCallDetails.length > 0) {
        interactionData.apiCallDetails = apiCallDetails;
      }
    }

    const content = JSON.stringify(interactionData, null, 2);
    const fileName = `${baseFileName}.json`;

    return {
      fileName,
      content,
      interactionId: interaction.id,
      timestamp: interaction.timestamp,
      fileType: 'json',
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  /**
   * Markdown形式ファイルを作成（人間が読みやすい形式）
   */
  private async createMarkdownFile(
    interaction: AIInteractionHistoryItem,
    config: ExportConfiguration,
    baseFileName: string
  ): Promise<IndividualInteractionFile> {
    let content = `# AI対話記録: ${interaction.type}\n\n`;
    
    // 基本情報
    content += `## 基本情報\n`;
    content += `- **ID**: ${interaction.id}\n`;
    content += `- **タイプ**: ${interaction.type}\n`;
    content += `- **ステータス**: ${interaction.status}\n`;
    content += `- **日時**: ${interaction.timestamp.toLocaleString('ja-JP')}\n`;
    content += `- **プロバイダー**: ${interaction.provider}\n`;
    content += `- **モデル**: ${interaction.model}\n`;
    if (interaction.duration) {
      content += `- **処理時間**: ${interaction.duration}ms\n`;
    }
    content += `\n`;

    // 入力データ
    content += `## 入力データ (送信)\n`;
    if (interaction.input.prompt) {
      content += `### プロンプト\n`;
      content += '```\n' + interaction.input.prompt + '\n```\n\n';
    }
    if (interaction.input.context) {
      content += `### コンテキスト\n`;
      content += '```\n' + interaction.input.context + '\n```\n\n';
    }
    if (interaction.input.attachments?.images && interaction.input.attachments.images.length > 0) {
      content += `### 添付画像\n`;
      content += `- 画像数: ${interaction.input.attachments.images.length}件\n\n`;
    }

    // 出力データ
    if (interaction.output) {
      content += `## 出力データ (応答)\n`;
      if (interaction.output.content) {
        content += `### 生成コンテンツ\n`;
        content += '```\n' + interaction.output.content + '\n```\n\n';
      }
      if (interaction.output.attachments?.images && interaction.output.attachments.images.length > 0) {
        content += `### 生成画像\n`;
        content += `- 画像数: ${interaction.output.attachments.images.length}件\n\n`;
      }
      if (interaction.output.metadata?.tokens) {
        content += `### トークン使用量\n`;
        content += `- 入力トークン: ${interaction.output.metadata.tokens.input || 0}\n`;
        content += `- 出力トークン: ${interaction.output.metadata.tokens.output || 0}\n\n`;
      }
    }

    // プロンプト変換履歴
    if (config.includePromptTransformations) {
      const transformations = completeAIHistory.getPromptTransformations(interaction.id);
      const interactionTransformations = transformations.get(interaction.id) || [];
      
      if (interactionTransformations.length > 0) {
        content += `## プロンプト変換履歴\n`;
        interactionTransformations.forEach((transformation, index) => {
          content += `### 変換 ${index + 1}: ${transformation.transformationType}\n`;
          content += `- **元のプロンプト**:\n`;
          content += '```\n' + transformation.originalInput + '\n```\n';
          content += `- **変換後プロンプト**:\n`;
          content += '```\n' + transformation.transformedPrompt + '\n```\n';
          content += `- **変換ルール**: ${transformation.transformationRules.join(', ')}\n`;
          content += `- **変換日時**: ${transformation.timestamp.toLocaleString('ja-JP')}\n\n`;
        });
      }
    }

    // API呼び出し詳細
    if (config.includeAPICallDetails) {
      const apiCallIds = interaction.metadata?.apiCallIds || [];
      if (apiCallIds.length > 0) {
        content += `## API呼び出し詳細\n`;
        
        for (const callId of apiCallIds) {
          const details = completeAIHistory.getAPICallDetails(callId);
          const callDetail = details.get(callId);
          
          if (callDetail) {
            content += `### API呼び出し: ${callDetail.callId}\n`;
            content += `- **エンドポイント**: ${callDetail.endpoint}\n`;
            content += `- **HTTPメソッド**: ${callDetail.httpMethod}\n`;
            content += `- **ステータスコード**: ${callDetail.statusCode || 'N/A'}\n`;
            content += `- **処理時間**: ${callDetail.duration}ms\n`;
            content += `- **呼び出し日時**: ${callDetail.timestamp.toLocaleString('ja-JP')}\n`;
            
            if (callDetail.error) {
              content += `- **エラー**: ${callDetail.error.message}\n`;
            }
            
            content += `\n`;
          }
        }
      }
    }

    // コスト情報
    if (interaction.cost) {
      content += `## コスト情報\n`;
      content += `- **推定コスト**: $${interaction.cost.estimatedCost.toFixed(6)}\n`;
      content += `- **入力トークン**: ${interaction.cost.inputTokens || 0}\n`;
      content += `- **出力トークン**: ${interaction.cost.outputTokens || 0}\n`;
      if (interaction.cost.imageCount && interaction.cost.imageCount > 0) {
        content += `- **画像数**: ${interaction.cost.imageCount}\n`;
      }
      content += `\n`;
    }

    // エラー情報
    if (config.includeErrorDetails && interaction.error) {
      content += `## エラー情報\n`;
      content += `- **エラーコード**: ${interaction.error.code}\n`;
      content += `- **エラーメッセージ**: ${interaction.error.message}\n`;
      if (interaction.error.details) {
        content += `- **エラー詳細**:\n`;
        content += '```json\n' + JSON.stringify(interaction.error.details, null, 2) + '\n```\n';
      }
      content += `\n`;
    }

    // ユーザー評価
    if (interaction.userRating !== undefined) {
      content += `## ユーザー評価\n`;
      content += `- **評価**: ${interaction.userRating}/5\n`;
      if (interaction.userFeedback) {
        content += `- **フィードバック**: ${interaction.userFeedback}\n`;
      }
      content += `\n`;
    }

    content += `---\n`;
    content += `*このファイルはSlideMaster AI履歴エクスポート機能により自動生成されました*\n`;
    content += `*生成日時: ${new Date().toLocaleString('ja-JP')}*\n`;

    const fileName = `${baseFileName}.md`;

    return {
      fileName,
      content,
      interactionId: interaction.id,
      timestamp: interaction.timestamp,
      fileType: 'markdown',
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  /**
   * インデックスファイルを作成
   */
  private async createIndexFile(
    folder: JSZip,
    exportedFiles: IndividualInteractionFile[],
    interactions: AIInteractionHistoryItem[]
  ): Promise<void> {
    // JSON形式インデックス
    const jsonIndex = {
      exportInfo: {
        totalInteractions: interactions.length,
        totalFiles: exportedFiles.length,
        exportTimestamp: new Date(),
        exportVersion: '1.0'
      },
      files: exportedFiles.map(file => ({
        fileName: file.fileName,
        interactionId: file.interactionId,
        fileType: file.fileType,
        size: file.size,
        timestamp: file.timestamp
      })),
      statistics: this.calculateExportStatistics(interactions, exportedFiles)
    };

    folder.file('_index.json', JSON.stringify(jsonIndex, null, 2));

    // Markdown形式インデックス（人間が読みやすい）
    let markdownIndex = `# AI対話履歴エクスポート インデックス\n\n`;
    markdownIndex += `## エクスポート情報\n`;
    markdownIndex += `- **総対話数**: ${interactions.length}件\n`;
    markdownIndex += `- **総ファイル数**: ${exportedFiles.length}件\n`;
    markdownIndex += `- **エクスポート日時**: ${new Date().toLocaleString('ja-JP')}\n`;
    markdownIndex += `- **合計ファイルサイズ**: ${this.formatFileSize(exportedFiles.reduce((sum, f) => sum + f.size, 0))}\n\n`;

    markdownIndex += `## ファイル一覧\n\n`;
    
    // ファイルを時系列順にソート
    const sortedFiles = [...exportedFiles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    sortedFiles.forEach(file => {
      markdownIndex += `### ${file.fileName}\n`;
      markdownIndex += `- **対話ID**: ${file.interactionId}\n`;
      markdownIndex += `- **ファイル形式**: ${file.fileType}\n`;
      markdownIndex += `- **ファイルサイズ**: ${this.formatFileSize(file.size)}\n`;
      markdownIndex += `- **対話日時**: ${file.timestamp.toLocaleString('ja-JP')}\n\n`;
    });

    folder.file('_INDEX.md', markdownIndex);
  }

  /**
   * エクスポート統計を計算
   */
  private calculateExportStatistics(
    interactions: AIInteractionHistoryItem[],
    exportedFiles: IndividualInteractionFile[]
  ) {
    const typeStats = interactions.reduce((acc, interaction) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const providerStats = interactions.reduce((acc, interaction) => {
      acc[interaction.provider] = (acc[interaction.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusStats = interactions.reduce((acc, interaction) => {
      acc[interaction.status] = (acc[interaction.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const fileSizeStats = {
      totalSize: exportedFiles.reduce((sum, f) => sum + f.size, 0),
      averageSize: exportedFiles.length > 0 ? exportedFiles.reduce((sum, f) => sum + f.size, 0) / exportedFiles.length : 0,
      jsonFiles: exportedFiles.filter(f => f.fileType === 'json').length,
      markdownFiles: exportedFiles.filter(f => f.fileType === 'markdown').length
    };

    return {
      typeStats,
      providerStats,
      statusStats,
      fileSizeStats
    };
  }

  /**
   * フォルダパスを決定
   */
  private determineFolderPath(interaction: AIInteractionHistoryItem, config: ExportConfiguration): string {
    const pathParts: string[] = [];
    
    if (config.separateByProvider) {
      pathParts.push(this.sanitizeFileName(interaction.provider));
    }
    
    if (config.separateByType) {
      pathParts.push(this.sanitizeFileName(interaction.type));
    }
    
    return pathParts.join('/');
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): ExportConfiguration {
    return {
      includePromptTransformations: true,
      includeAPICallDetails: true,
      includeMetadata: true,
      includeErrorDetails: true,
      fileFormat: 'both',
      separateByProvider: true,
      separateByType: true,
      humanReadableFormat: true
    };
  }

  /**
   * ファイル名用の日付フォーマット
   */
  private formatDateForFilename(date: Date): string {
    return date.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
  }

  /**
   * ファイル名をサニタイズ
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * ファイルサイズをフォーマット
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 入力データをサニタイズ
   */
  private sanitizeInput(input: AIInteractionInput): AIInteractionInput {
    const sanitized = { ...input };
    
    // 画像データは参照情報のみ保持（サイズ制限のため）
    if (sanitized.attachments?.images) {
      sanitized.attachments.images = sanitized.attachments.images.map((img, index) => {
        if (typeof img === 'string' && img.length > 1000) {
          return `[IMAGE_${index + 1}] (${img.length} characters, truncated for export)`;
        }
        return img;
      });
    }
    
    return sanitized;
  }

  /**
   * 出力データをサニタイズ
   */
  private sanitizeOutput(output: AIInteractionOutput): AIInteractionOutput {
    const sanitized = { ...output };
    
    // 画像データは参照情報のみ保持
    if (sanitized.attachments?.images) {
      sanitized.attachments.images = sanitized.attachments.images.map((img, index) => {
        if (typeof img === 'string' && img.length > 1000) {
          return `[GENERATED_IMAGE_${index + 1}] (${img.length} characters, truncated for export)`;
        }
        return img;
      });
    }
    
    return sanitized;
  }
}

// シングルトンインスタンスをエクスポート
export const individualAIHistoryExporter = IndividualAIHistoryExporter.getInstance();