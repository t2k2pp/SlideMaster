import { PresentationTheme, PresentationPurpose } from '../types';

// =================================================================
// Dynamic Font Optimization System
// =================================================================

/**
 * テーマに基づくフォント設定
 */
const THEME_FONTS: Record<PresentationTheme, {
  titleFont: string;
  bodyFont: string;
  titleWeight: string;
  bodyWeight: string;
}> = {
  auto: {
    titleFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  professional: {
    titleFont: 'Inter, "Segoe UI", sans-serif',
    bodyFont: 'Inter, "Segoe UI", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  creative: {
    titleFont: '"Poppins", "Montserrat", sans-serif',
    bodyFont: '"Open Sans", sans-serif',
    titleWeight: '700',
    bodyWeight: '400'
  },
  academic: {
    titleFont: '"Crimson Text", "Times New Roman", serif',
    bodyFont: '"Source Sans Pro", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  minimalist: {
    titleFont: '"Helvetica Neue", Helvetica, sans-serif',
    bodyFont: '"Helvetica Neue", Helvetica, sans-serif',
    titleWeight: '300',
    bodyWeight: '300'
  },
  playful: {
    titleFont: '"Nunito", "Comic Sans MS", cursive',
    bodyFont: '"Nunito", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  storytelling: {
    titleFont: '"Crimson Text", serif',
    bodyFont: '"Libre Baskerville", serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  children_bright: {
    titleFont: '"Fredoka One", "Comic Sans MS", cursive',
    bodyFont: '"Nunito", sans-serif',
    titleWeight: 'normal',
    bodyWeight: 'normal'
  },
  children_pastel: {
    titleFont: '"Quicksand", sans-serif',
    bodyFont: '"Quicksand", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  medical: {
    titleFont: '"Source Sans Pro", sans-serif',
    bodyFont: '"Source Sans Pro", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  tech_modern: {
    titleFont: '"JetBrains Mono", "Fira Code", monospace',
    bodyFont: '"Inter", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  vintage_retro: {
    titleFont: '"Playfair Display", serif',
    bodyFont: '"Lora", serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  nature_organic: {
    titleFont: '"Merriweather", serif',
    bodyFont: '"Lato", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  elegant_luxury: {
    titleFont: '"Playfair Display", serif',
    bodyFont: '"Source Sans Pro", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  dark_modern: {
    titleFont: '"Roboto", sans-serif',
    bodyFont: '"Roboto", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  bold_impact: {
    titleFont: '"Oswald", sans-serif',
    bodyFont: '"Open Sans", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  neon_cyberpunk: {
    titleFont: '"Orbitron", sans-serif',
    bodyFont: '"Exo 2", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  traditional_japanese: {
    titleFont: '"Noto Serif JP", "Yu Mincho", serif',
    bodyFont: '"Noto Sans JP", "Yu Gothic", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  hand_drawn: {
    titleFont: '"Kalam", cursive',
    bodyFont: '"Kalam", cursive',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  magazine_glossy: {
    titleFont: '"Oswald", sans-serif',
    bodyFont: '"Lato", sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  },
  custom: {
    titleFont: 'Inter, sans-serif',
    bodyFont: 'Inter, sans-serif',
    titleWeight: 'bold',
    bodyWeight: 'normal'
  }
};

/**
 * 基本フォントサイズ設定（16:9基準）
 */
const BASE_FONT_SIZES = {
  title: 60,
  subtitle: 48,
  body: 36,
  caption: 24
};

/**
 * アスペクト比による調整係数
 */
const ASPECT_RATIO_MULTIPLIERS: Record<string, number> = {
  '16:9': 1.0,
  '4:3': 0.85,
  '1:1': 0.75
};

/**
 * 用途による調整係数
 */
const PURPOSE_MULTIPLIERS: Record<PresentationPurpose, number> = {
  auto: 1.0,
  business_presentation: 1.0,
  academic_research: 0.9,
  educational_content: 1.1,
  storytelling: 1.2,
  children_content: 1.3,
  game_book: 1.1,
  technical_documentation: 0.85,
  marketing_pitch: 1.1,
  personal_portfolio: 1.0
};

/**
 * コンテンツ長によるフォントサイズ調整
 */
export const calculateOptimalFontSize = (
  baseSize: number,
  textLength: number,
  containerWidth: number,
  containerHeight: number,
  maxLines: number = 3
): number => {
  // 基本的な計算: 文字数が多いほど小さく（より緩やかな調整）
  const lengthFactor = Math.max(0.7, Math.min(1.2, 60 / Math.sqrt(textLength || 1)));
  
  // コンテナサイズに基づく調整（より緩やかな調整）
  const sizeFactor = Math.max(0.8, Math.min(containerWidth / 800, containerHeight / 600));
  
  // 最小・最大サイズの制限（タイトル用により適切な最小サイズ）
  const adjustedSize = baseSize * lengthFactor * sizeFactor;
  const minSize = baseSize >= 50 ? 32 : 16; // タイトル系は32以上、その他は16以上
  return Math.max(minSize, Math.min(120, adjustedSize));
};

/**
 * テーマとコンテンツに応じた最適なフォント設定を取得
 */
export const getOptimalFontSettings = (
  theme: PresentationTheme,
  purpose: PresentationPurpose,
  aspectRatio: string,
  elementType: 'title' | 'subtitle' | 'body' | 'caption',
  textContent: string = '',
  containerWidth: number = 800,
  containerHeight: number = 200
) => {
  // テーマからフォント情報を取得
  const themeFont = THEME_FONTS[theme] || THEME_FONTS.auto;
  
  // 基本サイズを取得
  const baseSize = BASE_FONT_SIZES[elementType];
  
  // 各種調整係数を適用
  const aspectMultiplier = ASPECT_RATIO_MULTIPLIERS[aspectRatio] || 1.0;
  const purposeMultiplier = PURPOSE_MULTIPLIERS[purpose] || 1.0;
  
  // 最終的なフォントサイズを計算
  const optimizedSize = calculateOptimalFontSize(
    baseSize * aspectMultiplier * purposeMultiplier,
    textContent.length,
    containerWidth,
    containerHeight
  );

  return {
    fontSize: Math.round(optimizedSize),
    fontFamily: elementType === 'title' || elementType === 'subtitle' 
      ? themeFont.titleFont 
      : themeFont.bodyFont,
    fontWeight: elementType === 'title' || elementType === 'subtitle'
      ? themeFont.titleWeight
      : themeFont.bodyWeight
  };
};

/**
 * レスポンシブなフォントサイズ調整
 */
export const getResponsiveFontSize = (
  baseSize: number,
  viewportWidth: number,
  minSize: number = 12,
  maxSize: number = 100
): number => {
  const scaleFactor = Math.max(0.5, Math.min(2.0, viewportWidth / 1920));
  const scaledSize = baseSize * scaleFactor;
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

/**
 * 読みやすさを考慮した行間とマージンの計算
 */
export const getOptimalTextSpacing = (fontSize: number) => {
  return {
    lineHeight: Math.max(1.2, Math.min(1.8, 1.4 + (fontSize - 16) * 0.01)),
    marginBottom: Math.max(8, fontSize * 0.5),
    letterSpacing: fontSize > 48 ? '-0.02em' : 'normal'
  };
};

/**
 * アクセシビリティを考慮したコントラスト調整
 */
export const ensureAccessibleContrast = (
  textColor: string,
  backgroundColor: string,
  fontSize: number
): { color: string; textShadow?: string } => {
  // フォントサイズが小さい場合はコントラストを強化
  if (fontSize < 24) {
    return {
      color: textColor,
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
    };
  }
  
  return { color: textColor };
};