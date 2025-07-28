# 2. 基本設計書 - SlideMaster

## 2.1. 概要

本ドキュメントは、SlideMasterアプリケーションの基本設計について記述するものです。要件定義書に基づき、**マルチAI統合アーキテクチャ**、**サービス層分離設計**、**拡張されたデータモデル**、および **パフォーマンス最適化設計** を中心としたシステム全体の基本設計を定義します。

### 2.1.1. 設計の特徴

- **マルチAIプロバイダー統合**: 6種類のAIプロバイダー（Gemini、Azure、OpenAI、Claude、LM Studio、Fooocus）の統一インターフェース
- **完全クライアントサイド**: サーバー不要の高セキュリティ・高プライバシー設計
- **モジュラーアーキテクチャ**: サービス層分離による保守性・拡張性の確保
- **高性能レンダリング**: React 19 + WebGL + 仮想化による大規模データ対応
- **包括的エクスポート**: 9形式対応の高品質エクスポートシステム

## 2.2. システムアーキテクチャ

SlideMasterは、**マルチAIプロバイダー統合**を核とした、完全クライアントサイドのシングルページアプリケーション（SPA）として構築されます。

### 2.2.1. 全体アーキテクチャ

```mermaid
graph TD
    subgraph Client_Browser["🌐 クライアントブラウザ環境"]
        direction TB
        
        subgraph Presentation_Layer["🖥️ プレゼンテーション層"]
            UI["React 19 UI Components"]
            Canvas["Canvas + WebGL"]
            Moveable["react-moveable"]
        end
        
        subgraph Application_Layer["⚛️ アプリケーション層"]
            App["App.tsx (中央制御)"]
            Router["AI Router"]
            StateManager["State Manager"]
        end
        
        subgraph Service_Layer["🔧 サービス層"]
            AIServices["AI Services"]
            CoreServices["Core Services"]
            ExportServices["Export Services"]
        end
        
        subgraph Data_Layer["💾 データ層"]
            LocalStorage["localStorage (暗号化)"]
            Memory["メモリキャッシュ"]
            IndexedDB["IndexedDB (大容量)"]
        end
    end
    
    subgraph External_APIs["🌍 外部AIサービス"]
        direction LR
        Google["🔷 Google Gemini"]
        Azure["🔵 Azure OpenAI"]
        OpenAI["🟢 OpenAI"]
        Claude["🟣 Anthropic Claude"]
        LMStudio["🟡 LM Studio"]
        Fooocus["🟠 Fooocus"]
    end
    
    Presentation_Layer --> Application_Layer
    Application_Layer --> Service_Layer
    Service_Layer --> Data_Layer
    
    AIServices --> External_APIs
    
    style Client_Browser fill:#e3f2fd
    style External_APIs fill:#fff3e0
```

### 2.2.2. 技術スタック

**フロントエンド基盤:**
- **React 19**: 最新のConcurrent Renderingと強化されたHooks
- **TypeScript 5.7**: 高度な型システムによる開発効率向上
- **Vite 6.2**: 高速ビルドシステムとHMR対応

**状態管理:**
- **App.tsx中央集約**: 1,334行の包括的状態管理
- **React Hooks**: useState、useCallback、useMemo最適化
- **コンテキストAPI**: テーマとプロバイダー情報の共有

**データ永続化:**
- **localStorage**: 設定とAPIキー（暗号化保存）
- **IndexedDB**: 大容量画像とプレゼンテーションデータ
- **メモリキャッシュ**: レンダリング最適化用一時データ

**AI統合:**
- **統一インターフェース**: 6プロバイダー対応のAIRouter
- **並列処理**: Promise.allによる高速レスポンス
- **フォールバック**: エラー時の自動プロバイダー切り替え

## 2.3. モジュラーコンポーネント設計

### 2.3.1. 階層化コンポーネント構成

```mermaid
graph TD
    subgraph App_Core["🏛️ App.tsx (1,334行)"]
        direction TB
        
        AppState["📊 AppState Management"]
        EventHandlers["⚡ Event Handlers (200+)"]
        UIController["🎮 UI Controller"]
    end
    
    subgraph UI_Components["🎨 UIコンポーネント層"]
        direction TB
        
        subgraph Core_UI["🖥️ コアUI"]
            Welcome["Welcome Screen"]
            Header["Header"]
            Settings["Settings"]
        end
        
        subgraph Editor_UI["✏️ エディターUI"]
            SlideNavigator["Slide Navigator"]
            SlideCanvas["Slide Canvas"]
            LayerEditor["Layer Editor"]
        end
        
        subgraph AI_UI["🤖 AI統合UI"]
            AIAssistant["AI Assistant"]
            ProviderSelector["Provider Selector"]
            GenerationHistory["Generation History"]
        end
        
        subgraph Feature_UI["⚡ 機能UI"]
            ExportManager["Export Manager"]
            SlideShow["Slide Show"]
            VideoAnalyzer["Video Analyzer"]
        end
    end
    
    App_Core --> UI_Components
```

### 2.3.2. コンポーネント責務定義

| コンポーネント名 | 責務 | 実装規模 |
| :--- | :--- | :--- |
| **App.tsx** | **中央制御システム**: 全状態管理、AIプロバイダー制御、200+イベントハンドラー | 1,334行 |
| **WelcomeScreen.tsx** | **エントリーポイント**: 新規作成、プロジェクト読込、AI生成、動画分析起動 | 中規模 |
| **Header.tsx** | **グローバル操作**: 保存、エクスポート、設定、AIアシスタント、プロバイダー切替 | 小規模 |
| **SlideNavigator.tsx** | **スライド管理**: 一覧表示、追加・削除・複製・順序変更、サムネイル生成 | 中規模 |
| **SlideCanvas.tsx** | **レイヤー操作**: react-moveable統合、ドラッグ&ドロップ、選択管理 | 大規模 |
| **LayerEditor.tsx** | **プロパティ編集**: レイヤータイプ別詳細設定、リアルタイム反映 | 大規模 |
| **AIAssistant.tsx** | **AI統合**: マルチプロバイダー制御、生成履歴、コスト追跡 | 大規模 |
| **ExportManager.tsx** | **エクスポート制御**: 9形式対応、品質設定、バッチ処理 | 中規模 |
| **SlideShow.tsx** | **プレゼンテーション再生**: フルスクリーン、キーボード操作、ナビゲーション | 中規模 |
| **VideoAnalyzer.tsx** | **動画分析**: フレーム抽出、AI分析、マニュアル生成ワークフロー | 中規模 |
| **Settings.tsx** | **環境設定**: APIキー管理、テーマ設定、プロバイダー優先度設定 | 中規模 |

### 2.3.3. サブコンポーネント構成

```mermaid
graph TD
    subgraph SlideCanvas_Components["🎨 SlideCanvas サブコンポーネント"]
        SC["SlideCanvas"]
        SC --> LR["LayerRenderer"]
        SC --> MH["MoveableHandler"]
        SC --> SG["SelectionGuide"]
        SC --> GM["GridManager"]
    end
    
    subgraph AIAssistant_Components["🤖 AIAssistant サブコンポーネント"]
        AA["AIAssistant"]
        AA --> PS["ProviderSelector"]
        AA --> GC["GenerationControls"]
        AA --> GH["GenerationHistory"]
        AA --> CT["CostTracker"]
    end
    
    subgraph LayerEditor_Components["✏️ LayerEditor サブコンポーネント"]
        LE["LayerEditor"]
        LE --> TEP["TextEditPanel"]
        LE --> IEP["ImageEditPanel"]
        LE --> SEP["ShapeEditPanel"]
        LE --> CP["CommonProperties"]
    end
```

## 2.4. 画面遷移設計

### 2.4.1. メイン画面遷移

```mermaid
stateDiagram-v2
    [*] --> WelcomeScreen : アプリケーション起動
    
    state WelcomeScreen {
        [*] --> ProjectSelection
        ProjectSelection --> AIProviderCheck : AI生成選択時
        AIProviderCheck --> ProviderSetup : APIキー未設定
        ProviderSetup --> ProjectSelection : 設定完了
        AIProviderCheck --> AIGeneration : APIキー設定済み
        AIGeneration --> EditorView : 生成完了
    }
    
    WelcomeScreen --> EditorView : 新規作成/読込
    WelcomeScreen --> VideoAnalysis : 動画分析
    VideoAnalysis --> EditorView : 分析完了
    VideoAnalysis --> WelcomeScreen : キャンセル
    
    state EditorView {
        direction TB
        [*] --> CanvasMode
        
        state CanvasMode {
            [*] --> SlideCanvas
            SlideCanvas --> LayerEditor : レイヤー選択
            LayerEditor --> SlideCanvas : 編集完了
            SlideCanvas --> SlideNavigator : スライド切替
            SlideNavigator --> SlideCanvas : スライド選択
        }
        
        CanvasMode --> AIAssistant : AI支援
        AIAssistant --> CanvasMode : 生成完了
        
        CanvasMode --> ExportManager : エクスポート
        ExportManager --> CanvasMode : エクスポート完了
        
        CanvasMode --> Settings : 設定
        Settings --> CanvasMode : 設定完了
    }
    
    EditorView --> SlideShow : プレゼン開始
    SlideShow --> EditorView : 終了
    
    EditorView --> WelcomeScreen : ホーム
```

### 2.4.2. モーダル管理設計

```mermaid
graph TD
    subgraph Modal_Management["📋 モーダル管理"]
        direction TB
        
        ModalStack["Modal Stack Manager"]
        ModalStack --> AIModal["AI Assistant Modal"]
        ModalStack --> ExportModal["Export Modal"]
        ModalStack --> SettingsModal["Settings Modal"]
        ModalStack --> VideoModal["Video Analysis Modal"]
        ModalStack --> ConfirmModal["Confirmation Modal"]
    end
    
    subgraph Modal_Features["🔧 モーダル機能"]
        direction LR
        
        ESC["Escキーで閉じる"]
        Backdrop["背景クリックで閉じる"]
        Stack["スタック管理"]
        Focus["フォーカス制御"]
    end
    
    Modal_Management --> Modal_Features
```

## 2.5. 拡張されたデータモデル設計

### 2.5.1. 包括的ER図

```mermaid
erDiagram
    PRESENTATION {
        string id PK
        string title
        string description
        PresentationTheme theme "21 themes"
        PresentationPurpose purpose "16 purposes"
        ImageGenerationSettings imageSettings
        PresentationSettings globalSettings
        AIInteractionHistoryItem[] aiHistory
        ExportHistoryItem[] exportHistory
        VersionInfo versionInfo
        datetime createdAt
        datetime updatedAt
    }

    SLIDE {
        string id PK
        string title
        string background
        AspectRatio aspectRatio "16:9, 4:3, 1:1, 9:16, 3:4"
        string notes
        PageNumberSettings pageNumbers
        SlideTemplate template
        string presentation_id FK
    }

    LAYER {
        string id PK
        LayerType type "text|image|shape"
        number x "0-100% (percentage)"
        number y "0-100% (percentage)"
        number width "0-100% (percentage)"
        number height "0-100% (percentage)"
        number rotation "0-360 degrees"
        number opacity "0-1"
        number zIndex "rendering order"
        LayerProperties properties "type-specific data"
        string slide_id FK
    }

    AI_INTERACTION_HISTORY {
        string id PK
        AIProviderType provider "gemini|azure|openai|claude|lmstudio|fooocus"
        string requestType "text|image|video_analysis"
        string prompt
        json response
        CostInformation cost
        datetime timestamp
        string presentation_id FK
    }

    EXPORT_HISTORY {
        string id PK
        ExportFormat format "pdf|pptx|png|jpeg|svg|html|marp|zip"
        ExportOptions options
        boolean success
        string errorMessage
        number fileSize
        datetime exportedAt
        string presentation_id FK
    }

    APP_STATE {
        Presentation currentPresentation
        number currentSlideIndex
        CanvasState canvasState
        string[] selectedLayerIds
        Layer[] clipboardLayers
        UndoAction[] undoStack
        UndoAction[] redoStack
        boolean isAIProcessing
        AIInteractionHistoryItem[] aiHistory
        AppSettings appSettings
        MultiProviderApiKeyStatus apiKeyStatus
    }

    PRESENTATION ||--o{ SLIDE : "contains"
    SLIDE ||--o{ LAYER : "has"
    PRESENTATION ||--o{ AI_INTERACTION_HISTORY : "tracks"
    PRESENTATION ||--o{ EXPORT_HISTORY : "logs"
    APP_STATE ||--o| PRESENTATION : "manages"
```

### 2.5.2. データ型詳細定義

#### PresentationTheme (21種類)
```typescript
type PresentationTheme = 
  | 'modern-dark' | 'modern-light' | 'modern-blue' 
  | 'elegant-white' | 'elegant-cream' | 'elegant-gray'
  | 'creative-vibrant' | 'creative-pastel' | 'creative-neon'
  | 'business-formal' | 'business-clean' | 'business-corporate'
  | 'academic-simple' | 'academic-classic' | 'academic-scientific'
  | 'storytelling-warm' | 'storytelling-adventure' | 'storytelling-fairytale'
  | 'tech-minimal' | 'tech-cyber' | 'tech-retro';
```

#### PresentationPurpose (16種類)
```typescript
type PresentationPurpose =
  | 'business-proposal' | 'business-report' | 'business-strategy'
  | 'education-lecture' | 'education-training' | 'education-workshop'
  | 'storytelling-narrative' | 'storytelling-case-study'
  | 'tech-documentation' | 'tech-api-guide' | 'tech-architecture'
  | 'marketing-pitch' | 'marketing-campaign'
  | 'research-findings' | 'research-methodology'
  | 'personal-portfolio';
```

#### AIProviderType (6種類)
```typescript
type AIProviderType = 
  | 'gemini'    // Google Gemini Pro/Flash + Imagen
  | 'azure'     // Azure OpenAI GPT-4 + DALL-E
  | 'openai'    // OpenAI GPT-4 + DALL-E
  | 'claude'    // Anthropic Claude 3.5 Sonnet
  | 'lmstudio'  // Local LM Studio
  | 'fooocus';  // Fooocus (Stable Diffusion XL)
```

## 2.6. マルチAIプロバイダー連携

### 2.6.1. AIプロバイダー統合アーキテクチャ

```mermaid
graph TD
    subgraph AI_Router["🤖 AI Router (中央制御)"]
        direction TB
        
        RequestAnalyzer["📋 Request Analyzer"]
        ProviderSelector["🎯 Provider Selector"]
        LoadBalancer["⚖️ Load Balancer"]
        ErrorHandler["🚨 Error Handler"]
    end
    
    subgraph Text_Generation["📝 テキスト生成"]
        direction LR
        
        Gemini_Text["🔷 Gemini Pro/Flash"]
        Azure_Text["🔵 Azure GPT-4"]
        OpenAI_Text["🟢 OpenAI GPT-4"]
        Claude_Text["🟣 Claude 3.5 Sonnet"]
        LMStudio_Text["🟡 LM Studio"]
    end
    
    subgraph Image_Generation["🎨 画像生成"]
        direction LR
        
        Imagen["🔷 Imagen-4"]
        DALLE_Azure["🔵 DALL-E (Azure)"]
        DALLE_OpenAI["🟢 DALL-E (OpenAI)"]
        Fooocus["🟠 Fooocus (SDXL)"]
    end
    
    subgraph Video_Analysis["🎬 動画分析"]
        GeminiVision["👁️ Gemini Vision"]
    end
    
    AI_Router --> Text_Generation
    AI_Router --> Image_Generation
    AI_Router --> Video_Analysis
```

### 2.6.2. プロバイダー別仕様

#### Google Gemini
```typescript
interface GeminiIntegration {
  library: "@google/genai ^1.9.0";
  models: {
    text: ["gemini-2.5-pro", "gemini-2.5-flash"];
    image: ["imagen-4", "imagen-3"];
    vision: ["gemini-2.5-pro-vision"];
  };
  features: [
    "高速テキスト生成",
    "多言語対応",
    "長文解析",
    "動画フレーム分析",
    "コスト最適化"
  ];
}
```

#### Azure OpenAI
```typescript
interface AzureOpenAIIntegration {
  library: "@azure/openai ^2.0.0";
  models: {
    text: ["gpt-4", "gpt-4-turbo"];
    image: ["dall-e-3"];
  };
  features: [
    "エンタープライズ対応",
    "高品質テキスト",
    "プロフェッショナル画像",
    "セキュリティ強化"
  ];
}
```

#### OpenAI
```typescript
interface OpenAIIntegration {
  library: "openai ^4.28.0";
  models: {
    text: ["gpt-4", "gpt-4-turbo"];
    image: ["dall-e-3"];
  };
  features: [
    "最新モデル対応",
    "高品質出力",
    "創造的生成"
  ];
}
```

#### Anthropic Claude
```typescript
interface ClaudeIntegration {
  library: "@anthropic-ai/sdk ^0.17.0";
  models: {
    text: ["claude-3.5-sonnet"];
  };
  features: [
    "長文処理",
    "論理的思考",
    "詳細分析",
    "安全性重視"
  ];
}
```

#### LM Studio (ローカル)
```typescript
interface LMStudioIntegration {
  connection: "Local REST API";
  models: "User-configured local models";
  features: [
    "プライバシー保護",
    "オフライン動作",
    "カスタムモデル",
    "コスト削減"
  ];
}
```

#### Fooocus
```typescript
interface FooucusIntegration {
  connection: "REST API";
  models: ["Stable Diffusion XL Custom"];
  features: [
    "アーティスティック画像",
    "高度なカスタマイズ",
    "スタイル制御",
    "品質最適化"
  ];
}
```

### 2.6.3. プロバイダー選択戦略

```mermaid
flowchart TD
    Request["📥 AI Request"] --> Analyzer{"🔍 Request Analysis"}
    
    Analyzer -->|Text Generation| TextStrategy{"📝 Text Strategy"}
    Analyzer -->|Image Generation| ImageStrategy{"🎨 Image Strategy"}
    Analyzer -->|Video Analysis| VideoStrategy{"🎬 Video Strategy"}
    
    TextStrategy -->|Business/Formal| Azure["🔵 Azure GPT-4"]
    TextStrategy -->|Creative/General| Gemini["🔷 Gemini Pro"]
    TextStrategy -->|Long Analysis| Claude["🟣 Claude Sonnet"]
    TextStrategy -->|Fast/Cost| GeminiFlash["⚡ Gemini Flash"]
    TextStrategy -->|Local/Private| LMStudio["🟡 LM Studio"]
    
    ImageStrategy -->|Professional| Imagen["🎨 Imagen-4"]
    ImageStrategy -->|Creative| DALLE["🎭 DALL-E"]
    ImageStrategy -->|Artistic| Fooocus["🖌️ Fooocus"]
    
    VideoStrategy --> GeminiVision["👁️ Gemini Vision"]
    
    Azure --> Fallback{"🔄 Fallback"}
    Gemini --> Fallback
    Claude --> Fallback
    GeminiFlash --> Fallback
    LMStudio --> Fallback
    Imagen --> Fallback
    DALLE --> Fallback
    Fooocus --> Fallback
    GeminiVision --> Fallback
    
    Fallback -->|Success| Result["✅ Result"]
    Fallback -->|Error| NextProvider["🔄 Next Provider"]
    NextProvider --> Fallback
```

## 2.7. サービス層分離設計

### 2.7.1. サービスアーキテクチャ

```mermaid
graph TD
    subgraph Service_Architecture["🔧 サービスアーキテクチャ"]
        direction TB
        
        subgraph AI_Services["🤖 AI Services"]
            GeminiService["Gemini Service"]
            AzureService["Azure Service"]
            OpenAIService["OpenAI Service"]
            ClaudeService["Claude Service"]
            LMStudioService["LM Studio Service"]
            FooucusService["Fooocus Service"]
        end
        
        subgraph Core_Services["⚙️ Core Services"]
            TextService["Text Processing Service"]
            VideoService["Video Analysis Service"]
            StorageService["Storage Service"]
            HistoryService["History Service"]
        end
        
        subgraph Export_Services["📤 Export Services"]
            PDFService["PDF Export Service"]
            PPTXService["PPTX Export Service"]
            ImageService["Image Export Service"]
            HTMLService["HTML Export Service"]
            MarpService["Marp Export Service"]
            SVGService["SVG Export Service"]
            ZIPService["ZIP Export Service"]
        end
    end
    
    AI_Services --> Core_Services
    Core_Services --> Export_Services
```

### 2.7.2. サービス別責務

#### AI Services
- **統一インターフェース**: 各AIプロバイダーの抽象化
- **ロードバランシング**: リクエストの最適分散
- **エラーハンドリング**: フォールバックとリトライ
- **コスト管理**: 使用量と料金の追跡

#### Core Services
- **テキスト処理**: Markdownレンダリング、スタイル適用
- **動画分析**: フレーム抽出、AI分析統合
- **ストレージ**: データ永続化、キャッシュ管理
- **履歴管理**: AIインタラクション、エクスポート履歴

#### Export Services
- **フォーマット変換**: 各形式への最適化変換
- **品質制御**: 解像度、圧縮率の調整
- **バッチ処理**: 大量スライドの効率処理
- **メタデータ管理**: 作者情報、作成日時の埋め込み

## 2.8. パフォーマンス最適化設計

### 2.8.1. レンダリング最適化戦略

```mermaid
graph TD
    subgraph Performance_Optimization["🚀 パフォーマンス最適化"]
        direction TB
        
        subgraph React_Optimizations["⚛️ React 19 最適化"]
            ConcurrentMode["Concurrent Mode"]
            AutomaticBatching["Automatic Batching"]
            SmartMemo["Smart Memoization"]
            SuspenseBoundaries["Suspense Boundaries"]
        end
        
        subgraph Rendering_Optimizations["🎨 レンダリング最適化"]
            Virtualization["📋 仮想化"]
            WebGLAcceleration["⚡ WebGL"]
            CanvasOptimization["🖼️ Canvas"]
            LazyLoading["😴 Lazy Loading"]
        end
        
        subgraph Memory_Management["🧠 メモリ管理"]
            ObjectPooling["🔄 Object Pool"]
            ImageCaching["🖼️ Image Cache"]
            GCOptimization["🗑️ GC最適化"]
            WeakReferences["🔗 Weak Refs"]
        end
    end
    
    React_Optimizations --> Rendering_Optimizations
    Rendering_Optimizations --> Memory_Management
```

### 2.8.2. パフォーマンス目標値

```typescript
interface PerformanceTargets {
  // Core Web Vitals
  coreWebVitals: {
    FCP: "< 1.2s";      // First Contentful Paint
    LCP: "< 2.5s";      // Largest Contentful Paint
    FID: "< 100ms";     // First Input Delay
    CLS: "< 0.1";       // Cumulative Layout Shift
  };
  
  // アプリケーション指標
  application: {
    slideRendering: "< 16ms (60fps)";
    layerManipulation: "< 8ms (120fps)";
    aiResponseTime: "< 30s (text), < 60s (image)";
    exportSpeed: "> 10 slides/minute";
    memoryUsage: "< 1GB (100 slides)";
  };
  
  // ユーザーエクスペリエンス
  userExperience: {
    appLaunch: "< 3s";
    slideSwitch: "< 200ms";
    undoRedo: "< 50ms";
    autoSave: "< 2s";
    errorRecovery: "< 1s";
  };
}
```

### 2.8.3. メモリ管理システム

- **仮想化レンダリング**: 大量スライドでも高速表示
- **WebGLアクセラレーション**: GPUを活用した高速描画
- **オブジェクトプール**: レイヤーオブジェクトの再利用
- **イメージキャッシュ**: LRUアルゴリズムによる効率管理
- **ガベージコレクション最適化**: メモリリーク防止

### 2.8.4. ネットワーク最適化

- **並列AIリクエスト**: Promise.allによる高速処理
- **リトライ機構**: 指数バックオフで失敗耐性向上
- **キャッシュ管理**: AIレスポンスのスマートキャッシュ
- **プリロード**: 次のスライドの事前読み込み

## 2.9. セキュリティ設計

### 2.9.1. データ保護戦略

```mermaid
graph TD
    subgraph Security_Architecture["🔒 セキュリティアーキテクチャ"]
        direction TB
        
        subgraph Data_Protection["🛡️ データ保護"]
            Encryption["🔐 暗号化"]
            Sanitization["🧩 サニタイズ"]
            Validation["✓ 検証"]
        end
        
        subgraph API_Security["🔑 APIセキュリティ"]
            KeyManagement["🔑 キー管理"]
            RateLimit["🚫 レート制限"]
            HTTPS["🔒 HTTPS"]
        end
        
        subgraph Privacy["🕵️ プライバシー"]
            LocalOnly["🏠 ローカルのみ"]
            NoTracking["🚫 追跡なし"]
            UserControl["👤 ユーザー制御"]
        end
    end
```

### 2.9.2. セキュリティ機能

#### データ暗号化
- **APIキー**: ブラウザ暗号化APIでローカル暗号化
- **センシティブデータ**: メモリ上のみで処理
- **通信**: HTTPSのみ、証明書ピンニング

#### 入力サニタイゼーション
- **XSS対策**: HTMLエンティティエンコーディング
- **Markdown**: 危険なスクリプトタグの除去
- **ファイルアップロード**: タイプ検証、サイズ制限

#### プライバシー保護
- **データ居住地**: ブラウザローカルのみ
- **アナリティクス**: ローカルのみ、外部送信なし
- **AIデータ**: トレーニングデータ使用なし

---

**この基本設計書により、SlideMasterの包括的なシステム設計を把握できます。**
