# LLMプロバイダー追加統合ガイド

## 📖 概要
SlideMasterに新しいLLMプロバイダーを追加するための包括的なガイド。
現在のアーキテクチャ、設計思想、実装手順を詳細に説明。

---

## 🏗️ 現在のアーキテクチャ（2025年8月4日時点）

### 統一AIサービス設計思想

**核心コンセプト**: 「プロバイダー独立の抽象化」
- コンポーネントは具体的なプロバイダーを知らない
- 統一インターフェースのみを使用
- ファクトリパターンでプロバイダーを切り替え
- 将来の拡張時にコンポーネント変更不要

### ファイル構成
```
services/ai/
├── unifiedAIService.ts           # 【コア】統一インターフェース & ファクトリ
├── aiServiceInterface.ts         # 【拡張用】将来のインターフェース定義
├── azureOpenAI/                  # 【実装例】Azure OpenAI専用実装
│   ├── azureOpenAIConfig.ts      # 設定・バリデーション
│   ├── azureOpenAIClient.ts      # API通信クライアント
│   ├── azureTextService.ts       # テキスト生成
│   ├── azureImageService.ts      # 画像生成（DALL-E 3）
│   └── azureVideoService.ts      # ビデオ分析
├── azureService.ts               # Azure統合サービス
└── modelRegistry.ts              # モデル情報管理
```

### データフロー
```
[Component] → [unifiedAIService] → [ProviderFactory] → [Azure/Gemini/Local] → [API]
     ↑              ↑                    ↑                      ↑
  抽象化API      統一インターフェース    プロバイダー選択       具体実装
```

---

## 🎯 設計原則

### 1. 分離の原則
- **関心の分離**: 設定・通信・ビジネスロジックを分離
- **責任の分離**: 各クラスは単一責任
- **依存関係の分離**: インターフェースに依存、実装に非依存

### 2. 拡張性の確保
- **オープン・クローズド原則**: 拡張に開かれ、変更に閉じている
- **プラグイン式**: 新プロバイダーは既存コードを変更せず追加
- **設定駆動**: 実行時にプロバイダーを切り替え可能

### 3. エラーハンドリング戦略
- **統一エラー型**: `AIServiceError`で一貫したエラー処理
- **グレースフルデグラデーション**: プロバイダー障害時の代替手段
- **詳細なエラー情報**: デバッグ可能なエラーメッセージ

---

## 🔧 新しいLLMプロバイダー追加手順

### Phase 1: プロバイダー実装の作成

#### 1. ディレクトリ構造の作成
```bash
mkdir services/ai/{providerName}/
```

#### 2. 設定ファイル作成
```typescript
// services/ai/{providerName}/{providerName}Config.ts
export interface {ProviderName}Config {
  apiKey: string;
  endpoint?: string;           // APIエンドポイント（必要に応じて）
  apiVersion?: string;         // APIバージョン
  textModel: string;           // テキスト生成モデル
  imageModel?: string;         // 画像生成モデル
  videoModel?: string;         // ビデオ分析モデル
  // プロバイダー固有の設定
}

export interface {ProviderName}TextRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  // プロバイダー固有のパラメータ
}

// バリデーション関数
export const validate{ProviderName}Config = (config: {ProviderName}Config): string[] => {
  const errors: string[] = [];
  if (!config.apiKey) errors.push('API key is required');
  if (!config.textModel) errors.push('Text model is required');
  return errors;
};
```

#### 3. APIクライアント作成
```typescript
// services/ai/{providerName}/{providerName}Client.ts
export class {ProviderName}Client {
  private config: {ProviderName}Config;

  constructor(config: {ProviderName}Config) {
    this.config = config;
  }

  async generateText(request: {ProviderName}TextRequest): Promise<string> {
    // プロバイダー固有のAPI呼び出し実装
  }

  async generateImage(request: {ProviderName}ImageRequest): Promise<string> {
    // 画像生成API実装
  }

  async analyzeVideo(request: {ProviderName}VideoRequest): Promise<string> {
    // ビデオ分析API実装
  }

  async testConnection(): Promise<boolean> {
    // 接続テスト実装
  }
}
```

#### 4. サービス層作成
```typescript
// services/ai/{providerName}/{providerName}TextService.ts
export class {ProviderName}TextService {
  private client: {ProviderName}Client;

  constructor(config: {ProviderName}Config) {
    this.client = new {ProviderName}Client(config);
  }

  async generateText(options: TextGenerationOptions): Promise<string> {
    // ビジネスロジック実装
  }

  async generateSlideContent(topic: string, slideCount?: number): Promise<string> {
    // スライド専用のテキスト生成
  }
}
```

### Phase 2: 統一サービスへの統合

#### 1. UnifiedAIService実装クラス作成
```typescript
// services/ai/unifiedAIService.ts に追加
class {ProviderName}UnifiedService implements UnifiedAIService {
  private {providerName}Service: {ProviderName}Service;

  constructor() {
    const settings = getUserSettings();
    const auth = settings.providerAuth?.{providerName};
    
    if (!auth?.textGeneration?.apiKey) {
      throw new AIServiceError('{ProviderName}設定が不完全です', '{providerName}', 'CONFIG_MISSING');
    }

    this.{providerName}Service = new {ProviderName}Service({
      apiKey: auth.textGeneration.apiKey,
      endpoint: auth.textGeneration.endpoint,
      textModel: settings.aiModels?.textGeneration || '',
      imageModel: settings.aiModels?.imageGeneration || '',
    });
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    try {
      return await this.{providerName}Service.generateText({ prompt, ...options });
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'テキスト生成に失敗しました',
        '{providerName}',
        'TEXT_GENERATION_ERROR'
      );
    }
  }

  // 他のメソッドも同様に実装
}
```

#### 2. ファクトリ関数更新
```typescript
// services/ai/unifiedAIService.ts の createUnifiedAIService() 関数
export function createUnifiedAIService(): UnifiedAIService {
  const settings = getUserSettings();
  const provider = settings.aiProviderText || 'azure'; // デフォルト
  
  switch (provider) {
    case 'azure':
      return new AzureUnifiedService();
    case '{providerName}':
      return new {ProviderName}UnifiedService();
    // 他のプロバイダー
    default:
      throw new AIServiceError('サポートされていないAIプロバイダーです', 'unknown', 'UNSUPPORTED_PROVIDER');
  }
}
```

### Phase 3: UI・設定の更新

#### 1. 型定義更新
```typescript
// services/storageService.ts
export interface ProviderAuthConfig {
  azure?: { [task: string]: ProviderTaskAuth };
  {providerName}?: { [task: string]: ProviderTaskAuth };
  // 他のプロバイダー
}

export interface UserSettings {
  aiProviderText?: 'azure' | '{providerName}' | 'other';
  aiProviderImage?: 'azure' | '{providerName}' | 'other';
  aiProviderVideo?: 'azure' | '{providerName}' | 'other';
  // 他の設定
}
```

#### 2. TaskBasedAIProviderSettings更新
```typescript
// components/TaskBasedAIProviderSettings.tsx
const PROVIDERS = {
  azure: { name: 'Azure OpenAI', icon: '🔵' },
  {providerName}: { name: '{Provider Display Name}', icon: '🟡' },
  // 他のプロバイダー
};

const TASK_DEFINITIONS = {
  text: { providers: ['azure', '{providerName}'] as const, taskKey: 'textGeneration' as const },
  image: { providers: ['azure', '{providerName}'] as const, taskKey: 'imageGeneration' as const },
  video: { providers: ['azure', '{providerName}'] as const, taskKey: 'videoAnalysis' as const },
};

const AUTH_FIELDS: { [key in AIProviderType]?: { key: keyof ProviderTaskAuth, label: string, type: string }[] } = {
  azure: [
    { key: 'apiKey', label: 'APIキー', type: 'password' },
    { key: 'endpoint', label: 'エンドポイント', type: 'url' },
    { key: 'apiVersion', label: 'APIバージョン', type: 'text' },
  ],
  {providerName}: [
    { key: 'apiKey', label: 'APIキー', type: 'password' },
    // プロバイダー固有のフィールド
  ],
};
```

#### 3. モデルレジストリ更新
```typescript
// services/ai/modelRegistry.ts
export const MODEL_REGISTRY_2025: Record<AIProviderType, ProviderModels> = {
  azure: { /* 既存のAzureモデル */ },
  {providerName}: {
    textGeneration: [
      {
        id: 'model-name',
        name: 'Model Display Name',
        context: '128K',
        cost: 'medium',
        speed: 'fast',
        features: ['feature1', 'feature2'],
        latest: true,
      },
    ],
    imageGeneration: [
      // 画像生成モデル定義
    ],
    videoAnalysis: [
      // ビデオ分析モデル定義
    ],
  },
};
```

### Phase 4: 設定マイグレーション

#### 1. 既存設定の移行
```typescript
// services/storageService.ts の migrateSettings() 関数
const migrateSettings = (settings: UserSettings): UserSettings => {
  let updated = false;
  const newAuth: ProviderAuthConfig = settings.providerAuth || {};

  // 既存の{providerName}設定があれば移行
  if (settings.{providerName}ApiKey) {
    migrateTask('{providerName}', 'textGeneration', settings.{providerName}ApiKey);
    migrateTask('{providerName}', 'imageGeneration', settings.{providerName}ApiKey);
    migrateTask('{providerName}', 'videoAnalysis', settings.{providerName}ApiKey);
    updated = true;
  }

  if (updated) {
    settings.providerAuth = newAuth;
    delete settings.{providerName}ApiKey; // 古いキーを削除
  }

  return settings;
};
```

### Phase 5: テスト・検証

#### 1. 基本テスト
```typescript
// テスト用の簡単なスクリプト
import { createUnifiedAIService } from './services/ai/unifiedAIService';

const testNewProvider = async () => {
  try {
    const aiService = createUnifiedAIService();
    const result = await aiService.generateText('Hello world');
    console.log('テスト成功:', result);
  } catch (error) {
    console.error('テスト失敗:', error);
  }
};
```

#### 2. 統合テスト
- 設定画面でプロバイダー切り替えテスト
- 各機能（テキスト・画像・ビデオ）の動作確認
- エラーハンドリングの確認

---

## 🎨 UI更新チェックリスト

### 必須更新箇所
- [ ] `TaskBasedAIProviderSettings.tsx` - プロバイダー選択UI
- [ ] `storageService.ts` - 型定義とマイグレーション
- [ ] `modelRegistry.ts` - モデル情報
- [ ] `AIAssistant.tsx` - エラーメッセージ（必要に応じて）

### オプション更新箇所
- [ ] プロバイダー固有の設定UI
- [ ] ヘルプテキスト・説明文
- [ ] アイコン・表示名

---

## 🔍 デバッグ・トラブルシューティング

### 1. よくある問題

#### プロバイダーが認識されない
```typescript
// unifiedAIService.ts の createUnifiedAIService() にcaseが追加されているか確認
switch (provider) {
  case '{providerName}': // このcaseが存在するか
    return new {ProviderName}UnifiedService();
}
```

#### 設定が保存されない
```typescript
// storageService.ts の ProviderAuthConfig に型定義があるか確認
export interface ProviderAuthConfig {
  {providerName}?: { [task: string]: ProviderTaskAuth }; // この行があるか
}
```

#### APIエラーが詳細不明
```typescript
// エラーハンドリングで十分な情報を提供しているか確認
catch (error) {
  throw new AIServiceError(
    error instanceof Error ? error.message : 'Unknown error',
    '{providerName}',
    'SPECIFIC_ERROR_CODE', // 具体的なエラーコード
    error as Error // 元のエラーも保持
  );
}
```

### 2. 設定確認コマンド
```javascript
// ブラウザコンソールで実行
console.log(JSON.stringify(localStorage.getItem('slidemaster_settings'), null, 2));
```

### 3. 統一サービステスト
```javascript
// ブラウザコンソールで実行
import { runBasicTest } from './services/ai/unifiedAIService';
runBasicTest().then(console.log);
```

---

## 📚 参考実装

### 現在のAzure OpenAI実装
- `services/ai/azureOpenAI/` - 完全な実装例
- `services/ai/azureService.ts` - サービス統合例
- エラーハンドリング、設定バリデーション、API通信の参考

### バックアップ
- `backup_before_azure_only_migration_*/` - 過去のGemini実装
- マルチプロバイダー時代の実装参考（問題点も含む）

---

## 🚀 将来の改善点

### 1. 設定UI改善
- プロバイダー別設定タブ化
- リアルタイム接続テスト
- 使用量・コスト表示

### 2. パフォーマンス最適化
- プロバイダー別キャッシュ
- バックグラウンド接続テスト
- 並列処理対応

### 3. 開発者体験改善
- TypeScript型定義の自動生成
- プロバイダー追加CLI
- 自動テストスイート

---

**このドキュメントは新しいプロバイダー追加時に更新してください。**
**実装前に必ずバックアップを作成し、段階的にテストしながら進めてください。**