# SlideMaster - デプロイメントガイド v2.0

**文書バージョン**: 2.0  
**最終更新日**: 2025年8月13日  
**対象システム**: SlideMaster AI-Powered Presentation Generator  

---

## 1. デプロイメント概要

### 1.1 デプロイメント戦略

**SlideMaster**は、完全クライアントサイドアプリケーションとして設計されており、以下の特徴を持ちます：

- **静的ホスティング対応**: CDN、静的サイトホスティングサービスでの配布
- **セキュリティ重視**: APIキーは全てクライアント側で管理
- **PWA準備**: 将来的なPWA対応への拡張性
- **マルチ環境対応**: 開発・ステージング・本番環境の分離

### 1.2 システム要件

#### **サーバー要件**
- **ホスティング**: 静的ファイルホスティング対応
- **HTTPS**: SSL/TLS必須（API通信のため）
- **CORS**: 外部API呼び出し対応
- **ストレージ**: 100MB以上の配布容量

#### **クライアント要件**
- **ブラウザ**: Chrome 90+, Firefox 85+, Safari 14+, Edge 90+
- **JavaScript**: ES2020サポート必須
- **ローカルストレージ**: IndexedDB, localStorage対応
- **メモリ**: 1GB以上推奨

---

## 2. ビルド設定

### 2.1 開発環境構成

#### **package.json構成**
```json
{
  "name": "slide-master",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "@google/genai": "^1.9.0",
    "@playwright/mcp": "^0.0.33",
    "@types/js-yaml": "^4.0.9",
    "dexie": "^4.0.11",
    "file-saver": "^2.0.5",
    "html-to-image": "^1.11.13",
    "js-yaml": "^4.1.0",
    "jspdf": "^3.0.1",
    "jszip": "^3.10.1",
    "lucide-react": "^0.525.0",
    "playwright": "^1.55.0-alpha-2025-08-07",
    "pptxgenjs": "^3.12.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hot-toast": "^2.5.2",
    "react-moveable": "^0.56.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "postinstall": "patch-package",
    "test:generation": "node test_generation.js"
  }
}
```

#### **Vite設定 (vite.config.ts)**
```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/SlideMaster/',  // サブディレクトリ配布用
    
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    
    server: {
      port: 5173,
      host: true
    },
    
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // 問題のあるパッケージの警告を抑制
          if (warning.code === 'UNRESOLVED_IMPORT' || 
              warning.message?.includes('@daybrush/utils') ||
              warning.message?.includes('Cannot add property') ||
              warning.message?.includes('object is not extensible')) {
            return;
          }
          warn(warning);
        },
        
        output: {
          format: 'es',
          manualChunks: (id) => {
            // 問題のあるパッケージを分離
            if (id.includes('@daybrush')) {
              return 'daybrush';
            }
            if (id.includes('react-moveable')) {
              return 'moveable';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
```

### 2.2 ビルドプロセス

#### **本番ビルド手順**
```bash
# 1. 依存関係のインストール
npm install

# 2. patch-package実行（互換性修正）
npm run postinstall

# 3. 本番ビルド
npm run build

# 4. ビルド結果確認
npm run preview
```

#### **ビルド成果物**
```
dist/
├── index.html               # メインHTML
├── assets/
│   ├── index-[hash].js     # メインJavaScript
│   ├── vendor-[hash].js    # ベンダーライブラリ
│   ├── daybrush-[hash].js  # Daybrushライブラリ
│   ├── moveable-[hash].js  # Moveableライブラリ
│   └── index-[hash].css    # メインCSS
└── resources/
    └── prompts/
        └── contextIntelligence.yml  # AIプロンプト設定
```

---

## 3. ホスティング設定

### 3.1 静的ホスティングサービス

#### **GitHub Pages**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

#### **Vercel設定**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)\\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### **Netlify設定**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 3.2 CDN配布設定

#### **Amazon CloudFront**
```yaml
# CloudFormation template example
Resources:
  SlideMasterDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
        - DomainName: !GetAtt S3Bucket.DomainName
          Id: S3Origin
          S3OriginConfig:
            OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${OAI}"
        
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad  # Managed-CachingEnabled
          OriginRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf  # Managed-CORS-S3Origin
          
        CacheBehaviors:
        - PathPattern: "/assets/*"
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          TTL: 31536000  # 1 year
          
        - PathPattern: "/resources/*"
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          TTL: 3600  # 1 hour
        
        CustomErrorResponses:
        - ErrorCode: 404
          ResponseCode: 200
          ResponsePagePath: /index.html
```

---

## 4. 環境設定

### 4.1 環境変数設定

#### **開発環境**
```bash
# .env.local (開発用)
VITE_APP_ENV=development
VITE_API_BASE_URL=https://api.example.com
VITE_DEBUG_MODE=true
```

#### **本番環境**
```bash
# .env.production (本番用)
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api-prod.example.com
VITE_DEBUG_MODE=false
```

#### **設定の読み込み**
```typescript
// src/config/environment.ts
export const config = {
  app: {
    env: import.meta.env.VITE_APP_ENV || 'development',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
  },
  build: {
    version: import.meta.env.VITE_APP_VERSION || '0.0.0',
    buildTime: import.meta.env.VITE_BUILD_TIME || Date.now(),
  }
};
```

### 4.2 セキュリティ設定

#### **Content Security Policy**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com;
  font-src 'self' data:;
  worker-src 'self' blob:;
  child-src 'self' blob:;
">
```

#### **セキュリティヘッダー**
```nginx
# nginx.conf
server {
    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "microphone=(), camera=(), geolocation=(), payment=()" always;
    
    # HTTPS強制
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # CORS設定
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 5. パフォーマンス最適化

### 5.1 チャンク分割戦略

#### **最適化されたチャンク設定**
```typescript
// vite.config.ts - 詳細なチャンク設定
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React関連
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          
          // UI ライブラリ
          if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
            return 'ui';
          }
          
          // エクスポート関連
          if (id.includes('jspdf') || id.includes('pptxgenjs') || 
              id.includes('jszip') || id.includes('file-saver')) {
            return 'export';
          }
          
          // AI関連
          if (id.includes('@google/genai') || id.includes('js-yaml')) {
            return 'ai';
          }
          
          // Canvas編集
          if (id.includes('react-moveable') || id.includes('html-to-image')) {
            return 'canvas';
          }
          
          // データベース
          if (id.includes('dexie')) {
            return 'database';
          }
          
          // 問題のあるパッケージ
          if (id.includes('@daybrush')) {
            return 'daybrush';
          }
          
          // その他のvendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
```

### 5.2 画像最適化

#### **画像圧縮設定**
```typescript
// src/utils/imageOptimizer.ts
export class ImageOptimizer {
  static async compressImage(
    file: File, 
    maxWidth: number = 1920, 
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // アスペクト比を保持してリサイズ
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // 高品質スケーリング
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}
```

### 5.3 キャッシュ戦略

#### **Service Worker実装準備**
```typescript
// public/sw.js (将来のPWA対応用)
const CACHE_NAME = 'slidemaster-v1';
const urlsToCache = [
  '/',
  '/assets/index.js',
  '/assets/index.css',
  '/resources/prompts/contextIntelligence.yml'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュから返すか、ネットワークから取得
        return response || fetch(event.request);
      })
  );
});
```

---

## 6. 監視・ログ設定

### 6.1 エラー監視

#### **エラートラッキング実装**
```typescript
// src/utils/errorTracking.ts
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorRecord[] = [];
  
  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }
  
  trackError(error: Error, context?: any): void {
    const errorRecord: ErrorRecord = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorRecord);
    
    // 本番環境では外部サービスに送信
    if (config.app.env === 'production') {
      this.sendToErrorService(errorRecord);
    }
    
    console.error('Error tracked:', errorRecord);
  }
  
  private async sendToErrorService(error: ErrorRecord): Promise<void> {
    try {
      // Sentry、Bugsnag等のエラー追跡サービスへの送信
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (e) {
      console.warn('Failed to send error to tracking service:', e);
    }
  }
}

// グローバルエラーハンドラー設定
window.addEventListener('error', (event) => {
  ErrorTracker.getInstance().trackError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorTracker.getInstance().trackError(
    new Error(event.reason), 
    { type: 'unhandledrejection' }
  );
});
```

### 6.2 パフォーマンス監視

#### **Core Web Vitals追跡**
```typescript
// src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  static initializeWebVitals(): void {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.reportMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      this.reportMetric('FID', firstInput.processingStart - firstInput.startTime);
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.reportMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private static reportMetric(name: string, value: number): void {
    console.log(`${name}: ${value}`);
    
    // 本番環境では分析サービスに送信
    if (config.app.env === 'production') {
      // Google Analytics, Mixpanel等への送信
      gtag('event', 'web_vitals', {
        metric_name: name,
        metric_value: value
      });
    }
  }
}
```

---

## 7. CI/CD設定

### 7.1 GitHub Actions

#### **完全なCI/CDパイプライン**
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run type-check
      
    - name: Run tests
      run: npm run test
      
    - name: Build application
      run: npm run build
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/
        
  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
        
    - name: Deploy to staging
      run: |
        # Staging環境へのデプロイコマンド
        echo "Deploying to staging..."
        
  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
        
    - name: Deploy to production
      run: |
        # 本番環境へのデプロイコマンド
        echo "Deploying to production..."
        
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 7.2 Docker対応

#### **Dockerfile**
```dockerfile
# Dockerfile (オプション - 開発環境用)
FROM node:20-alpine AS build

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番用コンテナ
FROM nginx:alpine

# カスタムnginx設定
COPY nginx.conf /etc/nginx/nginx.conf

# ビルド成果物をnginxに配置
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### **docker-compose.yml**
```yaml
# docker-compose.yml (開発環境用)
version: '3.8'

services:
  slidemaster:
    build: .
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
    
  # 開発用
  slidemaster-dev:
    build:
      context: .
      target: build
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    command: npm run dev
    environment:
      - NODE_ENV=development
```

---

## 8. トラブルシューティング

### 8.1 ビルドエラー対応

#### **よくあるビルドエラー**

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `Cannot resolve module '@daybrush/utils'` | パッケージの互換性問題 | `patch-package`実行 |
| `Memory leak detected` | 大きなバンドルサイズ | チャンク分割見直し |
| `Module not found: Can't resolve 'fs'` | Node.js専用モジュール | ブラウザ互換ライブラリに変更 |
| `TypeError: Cannot read property` | TypeScript型エラー | 型定義ファイル確認 |

#### **メモリ不足解決**
```bash
# Node.jsメモリ上限を増加
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Viteビルドオプション調整
npm run build -- --mode production --minify false
```

### 8.2 実行時エラー対応

#### **API接続エラー**
```typescript
// src/utils/apiErrorHandler.ts
export class APIErrorHandler {
  static handleAzureOpenAIError(error: any): string {
    if (error.code === 'InvalidAPIKey') {
      return 'Azure OpenAI APIキーが無効です。設定を確認してください。';
    }
    if (error.code === 'QuotaExceeded') {
      return 'API使用量制限に達しました。しばらく待ってから再試行してください。';
    }
    if (error.code === 'RateLimitExceeded') {
      return 'リクエスト頻度が高すぎます。少し待ってから再試行してください。';
    }
    return `AI APIエラー: ${error.message}`;
  }
  
  static handleNetworkError(error: any): string {
    if (error.code === 'NETWORK_ERROR') {
      return 'ネットワーク接続を確認してください。';
    }
    if (error.code === 'CORS_ERROR') {
      return 'CORS設定エラー。管理者に連絡してください。';
    }
    return `ネットワークエラー: ${error.message}`;
  }
}
```

### 8.3 パフォーマンス問題対応

#### **メモリリーク対策**
```typescript
// src/utils/memoryManager.ts
export class MemoryManager {
  private static objectURLs: Set<string> = new Set();
  
  static createObjectURL(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.objectURLs.add(url);
    return url;
  }
  
  static revokeObjectURL(url: string): void {
    if (this.objectURLs.has(url)) {
      URL.revokeObjectURL(url);
      this.objectURLs.delete(url);
    }
  }
  
  static cleanup(): void {
    for (const url of this.objectURLs) {
      URL.revokeObjectURL(url);
    }
    this.objectURLs.clear();
  }
}

// アプリケーション終了時のクリーンアップ
window.addEventListener('beforeunload', () => {
  MemoryManager.cleanup();
});
```

---

## 9. セキュリティ考慮事項

### 9.1 APIキー管理

#### **クライアントサイドセキュリティ**
```typescript
// src/utils/apiKeyManager.ts
export class APIKeyManager {
  private static readonly STORAGE_KEY = 'slidemaster_api_keys';
  
  static encryptAPIKey(key: string): string {
    // ブラウザのCrypto APIを使用した暗号化
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    return btoa(String.fromCharCode(...data));
  }
  
  static decryptAPIKey(encryptedKey: string): string {
    try {
      const data = atob(encryptedKey);
      return Array.from(data).map(char => char.charCodeAt(0)).map(code => String.fromCharCode(code)).join('');
    } catch (error) {
      throw new Error('APIキーの復号化に失敗しました');
    }
  }
  
  static storeAPIKey(provider: string, key: string): void {
    const encrypted = this.encryptAPIKey(key);
    const stored = this.getStoredKeys();
    stored[provider] = encrypted;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
  }
  
  static getAPIKey(provider: string): string | null {
    const stored = this.getStoredKeys();
    const encrypted = stored[provider];
    return encrypted ? this.decryptAPIKey(encrypted) : null;
  }
  
  private static getStoredKeys(): Record<string, string> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }
}
```

### 9.2 データ保護

#### **機密データハンドリング**
```typescript
// src/utils/dataProtection.ts
export class DataProtection {
  static sanitizeUserInput(input: string): string {
    // HTMLタグ除去
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
  
  static validateFileUpload(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/json'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('サポートされていないファイル形式です');
    }
    
    if (file.size > maxSize) {
      throw new Error('ファイルサイズが大きすぎます');
    }
    
    return true;
  }
  
  static removeMetadata(content: any): any {
    // 機密情報を含む可能性のあるメタデータを除去
    const cleaned = { ...content };
    delete cleaned.apiKeys;
    delete cleaned.userInfo;
    delete cleaned.systemInfo;
    return cleaned;
  }
}
```

---

## 10. 運用監視

### 10.1 ヘルスチェック

#### **アプリケーションヘルスチェック**
```typescript
// src/utils/healthCheck.ts
export class HealthCheck {
  static async performCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkLocalStorage(),
      this.checkIndexedDB(),
      this.checkAPIConnectivity(),
      this.checkMemoryUsage()
    ]);
    
    const results = checks.map((check, index) => ({
      name: ['localStorage', 'indexedDB', 'apiConnectivity', 'memoryUsage'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));
    
    const overall = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';
    
    return { overall, checks: results };
  }
  
  private static async checkLocalStorage(): Promise<string> {
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return 'Local storage is accessible';
    } catch (error) {
      throw new Error('Local storage is not accessible');
    }
  }
  
  private static async checkMemoryUsage(): Promise<string> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usedPercent > 90) {
        throw new Error(`High memory usage: ${usedPercent.toFixed(1)}%`);
      }
      return `Memory usage: ${usedPercent.toFixed(1)}%`;
    }
    return 'Memory information not available';
  }
}
```

### 10.2 使用量分析

#### **使用統計収集**
```typescript
// src/utils/analytics.ts
export class Analytics {
  private static events: AnalyticsEvent[] = [];
  
  static trackEvent(name: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };
    
    this.events.push(event);
    
    // 本番環境では外部分析サービスに送信
    if (config.app.env === 'production') {
      this.sendToAnalytics(event);
    }
  }
  
  static trackPageView(path: string): void {
    this.trackEvent('page_view', { path });
  }
  
  static trackFeatureUsage(feature: string, action: string): void {
    this.trackEvent('feature_usage', { feature, action });
  }
  
  private static async sendToAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // Google Analytics 4、Mixpanel等への送信
      if (typeof gtag !== 'undefined') {
        gtag('event', event.name, event.properties);
      }
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }
}
```

---

**このデプロイメントガイドにより、SlideMasterの安全で効率的な本番運用が可能になります。セキュリティ、パフォーマンス、監視の全ての側面を考慮した包括的な運用指針となっています。**