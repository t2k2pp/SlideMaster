# SlideMaster 動作テスト手順

## 🧪 テストケース

### 1. 桃太郎ストーリーテスト
**目的**: ストーリーテリング機能の確認
**入力**: 「桃太郎のお話を作成してください」
**期待結果**:
- Purpose: `storytelling` 
- Theme: `storytelling`
- Designer: `The Emotional Storyteller`
- Image Style: 温かい絵本風イラスト

### 2. クリティカルシンキング研修テスト
**目的**: 研修資料生成機能の確認
**入力**: 「クリティカルシンキングについて研修資料を用意してください」
**期待結果**:
- Purpose: `training_material`
- Theme: `professional`
- Designer: `The Corporate Strategist`
- Image Style: プロ向け研修・バランス型

### 3. AI技術ガイドテスト
**目的**: 技術解説機能の確認
**入力**: 「GPT-5について詳しく調べて技術解説してください」
**期待結果**:
- Purpose: `tutorial_guide` or `academic_research`
- Theme: `tech_modern` or `academic`
- Designer: `The Academic Visualizer`
- Image Style: 学術的・技術的

### 4. プランク解説ガイドテスト
**目的**: チュートリアル機能の確認
**入力**: 「プランクのやり方の解説スライドを作成してください」
**期待結果**:
- Purpose: `tutorial_guide`
- Theme: `minimalist`
- Image Style: ステップバイステップ・親切

## 🔍 確認ポイント

### Context Intelligence Engine
- [ ] 適切なPurpose選択
- [ ] 適切なTheme選択 
- [ ] 適切なDesigner選択

### 生成品質
- [ ] Title Slide自動生成
- [ ] Speaker Notes自動生成
- [ ] 動的フォントサイズ適用
- [ ] 画像プロンプト適切性

### JSON構造
- [ ] JSON truncation修復機能
- [ ] 完全なslides配列
- [ ] aspectRatio設定
- [ ] metadata情報

## 🚀 手動テスト方法

1. SlideMaster アプリを起動
2. 各テストケースを順番に実行
3. 開発者ツールでコンソールログ確認
4. 生成結果の詳細分析

## 📊 ログ確認項目

```
Context Intelligence: Analyzing Auto settings only...
✅ Content Type: story
✅ AI Selected Designer: The Emotional Storyteller  
✅ AI Selected Purpose: storytelling
✅ AI Selected Theme: storytelling
🎨 Designer Selection Process...
✅ Using explicitly requested designer: The Emotional Storyteller
🔤 Applying dynamic font sizing with context: story
✅ Font size calculated: XXpx
🖼️ Enhanced image prompt for slide 1: {...}
```