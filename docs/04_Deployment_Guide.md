# 4. デプロイメントガイド - SlideMaster

## 📋 概要

本ドキュメントでは、SlideMasterアプリケーションを最低コストでデプロイするための方法を、コスト順に3つの選択肢で詳細に説明します。すべて完全な静的サイトとしてデプロイ可能で、サーバーレス運用によりコストを最小限に抑制できます。

## 💰 デプロイ方法比較（コスト順）

| 順位 | サービス | 月額コスト | 帯域制限 | 利点 | 制限事項 |
|------|----------|-----------|----------|------|----------|
| **1位** | **GitHub Pages** | **¥0** | 100GB/月 | 完全無料、簡単設定 | パブリックリポジトリ必須 |
| **2位** | **Azure Static Web Apps** | **¥0** | 100GB/月 | 高機能、カスタムドメイン対応 | Microsoft認証必要 |
| **3位** | **OCI Always Free** | **¥0** | 10TB/月 | 高性能、大容量 | AMD環境のみ、設定複雑 |

---

## 🥇 第1位: GitHub Pages（完全無料）

### 📊 コスト詳細
- **月額料金**: ¥0
- **帯域制限**: 100GB/月
- **ストレージ**: 1GB
- **独自ドメイン**: 対応（無料）

### ✅ 前提条件
- GitHubアカウント（無料）
- パブリックリポジトリ（必須）

### 🚀 デプロイ手順

#### Step 1: リポジトリ準備
```bash
# プロジェクトルートで実行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[username]/slidemaster.git
git push -u origin main
```

#### Step 2: GitHub Actions設定
`.github/workflows/deploy.yml` を作成:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      pages: write
      id-token: write
    
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
        
      - name: Apply patches
        run: npm run postinstall
        
      - name: Build application
        run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
          
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifacts
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Step 3: GitHub Pages設定
1. GitHubリポジトリの **Settings** → **Pages** へ移動
2. **Source** を **GitHub Actions** に設定
3. **Deploy** をクリック

#### Step 4: 環境変数設定（オプション）
1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** で以下を追加:
   - `VITE_GEMINI_API_KEY`: Gemini APIキー（オプション）

### 🌐 アクセス方法
- **URL**: `https://[username].github.io/slidemaster/`
- **カスタムドメイン**: 設定可能（無料）

### 📈 パフォーマンス最適化
```javascript
// vite.config.ts に追加
export default defineConfig({
  base: '/slidemaster/', // GitHub Pagesの場合
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ai-libs': ['@google/genai'],
          'export-libs': ['jspdf', 'pptxgenjs', 'html-to-image']
        }
      }
    }
  }
});
```

---

## 🥈 第2位: Azure Static Web Apps（無料枠）

### 📊 コスト詳細
- **月額料金**: ¥0（Free tier）
- **帯域制限**: 100GB/月
- **カスタムドメイン**: 対応（無料SSL証明書付き）
- **API Functions**: 2つまで無料

### ✅ 前提条件
- Azure アカウント（無料）
- GitHub または Azure DevOps

### 🚀 デプロイ手順

#### Step 1: Azure Static Web Apps作成
1. [Azure Portal](https://portal.azure.com/) にログイン
2. **Create a resource** → **Static Web App** を選択
3. 以下の設定を入力:
   - **Subscription**: Free tier
   - **Resource Group**: 新規作成
   - **Name**: `slidemaster-app`
   - **Plan type**: **Free**
   - **Source**: **GitHub**

#### Step 2: GitHub連携設定
1. **GitHub account** で認証
2. **Repository**: SlideMasterリポジトリを選択
3. **Branch**: `main`
4. **Build Presets**: **React**
5. **App location**: `/`
6. **Output location**: `dist`

#### Step 3: 設定ファイル作成
`.github/workflows/azure-static-web-apps-[name].yml` が自動生成されます。
以下のように修正:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Apply patches
        run: npm run postinstall
        
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: "dist"
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

#### Step 4: カスタム設定
`staticwebapp.config.json` を作成:

```json
{
  "routes": [
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "mimeTypes": {
    ".wasm": "application/wasm"
  },
  "globalHeaders": {
    "Cache-Control": "public, max-age=31536000, immutable"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  }
}
```

### 🌐 アクセス方法
- **URL**: `https://[app-name].azurestaticapps.net/`
- **カスタムドメイン**: Azure Portal で設定

---

## 🥉 第3位: Oracle Cloud Infrastructure (OCI) Always Free

### 📊 コスト詳細
- **月額料金**: ¥0（Always Free tier）
- **CPU**: AMD E2.1 Micro × 2インスタンス
- **メモリ**: 1GB RAM × 2インスタンス
- **帯域**: 10TB/月
- **ストレージ**: 200GB Block Volume

### ✅ 前提条件
- OCI アカウント（無料、クレジットカード必要）
- AMD環境のみ利用可能（ARM争奪戦のため）

### 🚀 デプロイ手順

#### Step 1: OCI Compute Instance作成
1. [Oracle Cloud](https://cloud.oracle.com/) にログイン
2. **Compute** → **Instances** → **Create Instance**
3. 設定:
   - **Name**: `slidemaster-server`
   - **Image**: Ubuntu 22.04 LTS
   - **Shape**: VM.Standard.E2.1.Micro（Always Free対象）
   - **Networking**: デフォルトVCN

#### Step 2: セキュリティグループ設定
```bash
# ポート80、443を開放
# OCI Console の Security Lists で設定
# Ingress Rules:
# - Port 80 (HTTP): 0.0.0.0/0
# - Port 443 (HTTPS): 0.0.0.0/0
# - Port 22 (SSH): 自分のIPアドレス
```

#### Step 3: サーバー環境構築
```bash
# SSH接続後
sudo apt update && sudo apt upgrade -y

# Node.js 20.x インストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx インストール
sudo apt install nginx -y

# Certbot インストール（SSL証明書用）
sudo apt install certbot python3-certbot-nginx -y

# PM2 インストール（プロセス管理）
sudo npm install -g pm2
```

#### Step 4: アプリケーションデプロイ
```bash
# アプリケーションディレクトリ作成
sudo mkdir -p /var/www/slidemaster
sudo chown $USER:$USER /var/www/slidemaster

# プロジェクトクローン
cd /var/www/slidemaster
git clone https://github.com/[username]/slidemaster.git .

# 依存関係インストール
npm ci
npm run postinstall

# ビルド
npm run build

# Nginx設定
sudo tee /etc/nginx/sites-available/slidemaster << 'EOF'
server {
    listen 80;
    server_name [your-domain-or-ip];
    root /var/www/slidemaster/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
EOF

# サイト有効化
sudo ln -s /etc/nginx/sites-available/slidemaster /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL証明書設定（独自ドメインの場合）
```bash
# DNS設定後（Aレコードでサーバーを指定）
sudo certbot --nginx -d [your-domain.com]

# 自動更新設定
sudo crontab -e
# 以下を追加:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Step 6: 自動デプロイ設定
```bash
# デプロイスクリプト作成
tee /var/www/slidemaster/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/slidemaster
git pull origin main
npm ci
npm run postinstall
npm run build
sudo systemctl reload nginx
EOF

chmod +x /var/www/slidemaster/deploy.sh

# GitHub Webhookで自動デプロイ（オプション）
# Webhook URL: http://[your-server]/webhook
```

### 🌐 アクセス方法
- **URL**: `http://[public-ip]/` または `https://[your-domain]/`

---

## 🔧 共通設定事項

### 環境変数設定
各デプロイ環境で以下の環境変数を設定（すべてオプション）:

```bash
# Gemini API（無料枠あり）
VITE_GEMINI_API_KEY=your_gemini_api_key

# Azure OpenAI（有料）
VITE_AZURE_OPENAI_API_KEY=your_azure_api_key
VITE_AZURE_OPENAI_ENDPOINT=your_azure_endpoint

# OpenAI（有料）
VITE_OPENAI_API_KEY=your_openai_api_key

# Claude（有料）
VITE_CLAUDE_API_KEY=your_claude_api_key

# LM Studio（ローカル、無料）
VITE_LMSTUDIO_ENDPOINT=http://localhost:1234

# Fooocus（ローカル、無料）
VITE_FOOOCUS_ENDPOINT=http://localhost:8080
```

### パフォーマンス最適化

#### ビルド最適化
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ai': ['@google/genai'],
          'vendor-export': ['jspdf', 'pptxgenjs', 'html-to-image', 'jszip'],
          'vendor-ui': ['react-moveable', 'lucide-react', 'react-hot-toast']
        }
      }
    },
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild'
  }
});
```

#### キャッシュ設定
```html
<!-- index.html に追加 -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
<link rel="preload" href="/assets/vendor-react.[hash].js" as="script">
<link rel="preload" href="/assets/index.[hash].css" as="style">
```

## 📊 総合比較表

| 項目 | GitHub Pages | Azure Static Web Apps | OCI Always Free |
|------|-------------|----------------------|-----------------|
| **セットアップ時間** | 5分 | 10分 | 30分 |
| **技術的難易度** | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| **カスタマイズ性** | 低 | 中 | 高 |
| **パフォーマンス** | 高 | 高 | 中 |
| **サポート** | コミュニティ | Microsoft | Oracle |
| **おすすめ度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🎯 推奨デプロイ方法

**個人プロジェクト・学習目的**: **GitHub Pages**
- 完全無料、設定簡単
- 十分なパフォーマンス

**ビジネス利用・高機能が必要**: **Azure Static Web Apps**
- 高機能、カスタムドメイン対応
- Microsoft技術スタックとの親和性

**高度なカスタマイズが必要**: **OCI Always Free**
- 完全な制御権
- 高い技術的要求

---

**SlideMasterは完全クライアントサイドアプリケーションのため、すべての選択肢で問題なく動作します。**