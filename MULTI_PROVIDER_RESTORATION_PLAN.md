# マルチプロバイダー復元計画

## 📋 概要
現在Azure OpenAI専用に狭めたSlideMasterを、将来的に再度マルチプロバイダー対応に拡張するための計画書。

## 🎯 現在の状況（2025年8月4日）

### ✅ 完了した作業
- **バックアップ作成済み**: `backup_before_azure_only_migration_*` にマルチプロバイダー時代のコードを保存
- **Azure OpenAI専用実装**: 適切にファイル分割された新しいアーキテクチャ
- **Gemini関連コード完全削除**: 古い問題のあるマルチプロバイダー実装を除去
- **将来対応インターフェース準備**: `aiServiceInterface.ts` で拡張可能な設計

### 🏗️ 新しいアーキテクチャ
```
services/ai/
├── azureOpenAI/           # Azure OpenAI専用実装
│   ├── azureOpenAIConfig.ts
│   ├── azureOpenAIClient.ts
│   ├── azureTextService.ts
│   ├── azureImageService.ts
│   └── azureVideoService.ts
├── azureService.ts        # 統合サービス
└── aiServiceInterface.ts  # 将来の拡張用インターフェース
```

## 🚀 復元手順

### Phase 1: 基盤整備
1. **プロバイダーファクトリの実装**
   ```typescript
   // services/ai/aiServiceFactory.ts
   export class AIServiceFactory implements IAIServiceFactory {
     createService(providerType: AIProviderType, config: ServiceConfig): IAIService
     validateConfig(providerType: AIProviderType, config: ServiceConfig): string[]
     getDefaultConfig(providerType: AIProviderType): Partial<ServiceConfig>
     getSupportedProviders(): AIProviderType[]
   }
   ```

2. **共通インターフェース実装**
   - `IAIService`インターフェースの完全実装
   - 既存`AzureService`をインターフェースに適合

### Phase 2: Local LLM対応（優先度高）
1. **LM Studio Provider実装**
   ```
   services/ai/lmStudio/
   ├── lmStudioConfig.ts
   ├── lmStudioClient.ts
   ├── lmStudioTextService.ts
   └── lmStudioVideoService.ts  # 画像生成は非対応
   ```

2. **設定UI更新**
   - Local LLM用エンドポイント設定
   - モデル一覧取得機能

### Phase 3: Gemini再対応
1. **新しいGemini実装**
   ```
   services/ai/gemini/
   ├── geminiConfig.ts      # 新しい設計
   ├── geminiClient.ts      # より安定したAPI実装
   ├── geminiTextService.ts
   ├── geminiImageService.ts
   └── geminiVideoService.ts
   ```

2. **設定移行**
   - 古いGemini設定の自動移行
   - 新しい認証フロー

### Phase 4: 他プロバイダー対応
1. **OpenAI Direct**
2. **Anthropic Claude**
3. **Fooocus (画像生成専用)**

## 📁 バックアップからの参照方法

### 重要ファイルの場所
```
backup_before_azure_only_migration_*/
├── ai/
│   ├── geminiProvider.ts      # Gemini実装参考
│   ├── lmStudioProvider.ts    # Local LLM実装参考
│   ├── aiProviderFactory.ts   # ファクトリパターン参考
│   └── aiProviderInterface.ts # 旧インターフェース参考
├── AIProviderModels.tsx       # モデル選択UI参考
├── MultiProviderApiKeyManager.tsx # 認証UI参考
└── TaskBasedAIProviderSettings.tsx # 設定UI参考
```

## 🔧 実装ガイドライン

### 1. 新しいプロバイダー追加手順
1. `services/ai/{provider}/` ディレクトリ作成
2. Config, Client, Service クラス実装
3. `IAIService` インターフェース適合
4. `aiServiceFactory.ts` に登録
5. UI コンポーネント更新

### 2. 設定の互換性
- **後方互換性維持**: 既存Azure設定は保持
- **段階的移行**: プロバイダー追加時の自動設定移行
- **設定検証**: 各プロバイダーの設定検証強化

### 3. エラーハンドリング
- **プロバイダー固有エラー**: `AIProviderError` 継承
- **フォールバック機能**: プロバイダー障害時の代替
- **ユーザー通知**: 分かりやすいエラーメッセージ

## 🧪 テスト戦略

### 1. プロバイダー別テスト
- 各プロバイダーの基本機能テスト
- API互換性テスト
- エラーハンドリングテスト

### 2. 統合テスト
- プロバイダー切り替えテスト
- 設定移行テスト
- UI動作テスト

### 3. パフォーマンステスト
- 複数プロバイダー同時利用
- メモリ使用量監視
- レスポンス時間測定

## 📝 復元時の注意点

### 1. 過去の問題を回避
- **設定の混乱**: 明確な設定UI設計
- **プロバイダー間の不整合**: 統一されたインターフェース
- **エラーの曖昧さ**: 詳細なエラーメッセージ

### 2. 新機能の活用
- **型安全性**: TypeScript活用強化
- **設定検証**: リアルタイム検証
- **ユーザビリティ**: 直感的な設定フロー

### 3. 段階的復元
- **1つずつ追加**: 一度にすべて復元しない
- **十分なテスト**: 各段階で動作確認
- **ユーザーフィードバック**: 段階的な機能公開

## 🎯 成功指標

### 技術的指標
- [ ] 全プロバイダーでテキスト生成動作
- [ ] 全プロバイダーで画像生成動作（対応する場合）
- [ ] 設定UIが直感的で使いやすい
- [ ] エラーハンドリングが適切
- [ ] パフォーマンスが良好

### ユーザー体験指標
- [ ] プロバイダー切り替えがスムーズ
- [ ] 設定が分かりやすい
- [ ] エラー時の対処が明確
- [ ] 機能が安定している

---

**このファイルは復元作業開始時に最新化し、作業ガイドとして活用する**