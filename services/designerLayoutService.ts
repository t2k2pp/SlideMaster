import { DesignerType, PresentationPurpose } from '../types';

// Map new purpose names to old purpose names used in DESIGNER_STRATEGIES
const mapPurposeToLegacyPurpose = (purpose: PresentationPurpose): string => {
  const purposeMapping: Record<PresentationPurpose, string> = {
    'auto': 'auto',
    'business_presentation': 'business_presentation',
    'educational_content': 'academic_lecture',
    'storytelling': 'storytelling_narrative',
    'children_content': 'children_education',
    'tutorial_guide': 'technical_documentation',
    'portfolio_showcase': 'creative_showcase',
    'marketing_pitch': 'sales_pitch',
    'academic_research': 'research_findings',
    'event_announcement': 'business_presentation',
    'training_material': 'training_workshop',
    'product_demo': 'product_demo',
    'report_summary': 'financial_report',
    'creative_project': 'creative_showcase',
    'game_content': 'game_book',
    'digital_signage': 'business_presentation',
    'video_storyboard': 'storytelling_narrative',
  };
  
  return purposeMapping[purpose] || 'business_presentation';
};

// =================================================================
// Designer Layout Service - Layout strategy implementation
// =================================================================

export interface DesignerStrategy {
  id: DesignerType;
  name: string;
  philosophy: string;
  layoutPrinciples: string[];
  purposeAdaptation: Record<PresentationPurpose, {
    preferredLayouts: string[];
    spacing: 'tight' | 'normal' | 'loose';
    emphasis: 'title' | 'content' | 'image' | 'balanced';
    colorScheme: 'minimal' | 'warm' | 'professional' | 'vibrant' | 'academic';
  }>;
}

// Designer strategy definitions based on docs
export const DESIGNER_STRATEGIES: Record<DesignerType, DesignerStrategy> = {
  'amateur': {
    id: 'amateur',
    name: 'Amateur Designer',
    philosophy: 'Simple and Predictable',
    layoutPrinciples: ['Basic 4-pattern rotation', 'Simple title-content structure', 'Predictable layout cycle', 'No creative experimentation'],
    purposeAdaptation: {
      'auto':                    { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'business_presentation':   { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'academic_lecture':        { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'storytelling_narrative':  { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'children_education':      { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'technical_documentation': { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'creative_showcase':       { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'medical_healthcare':      { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'sales_pitch':             { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'training_workshop':       { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'conference_talk':         { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'product_demo':            { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'financial_report':        { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'research_findings':       { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'content',  colorScheme: 'professional' },
      'marketing_campaign':      { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'game_book':               { preferredLayouts: ['title-only', 'title-left-image-right-text', 'title-right-image-left-text', 'title-text'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
    }
  },
  
  'auto': {
    id: 'auto',
    name: 'Auto Selection',
    philosophy: 'Smart Selection for Optimal Results',
    layoutPrinciples: ['Context-aware selection', 'Purpose-driven optimization', 'Balanced approach'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['balanced'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'business_presentation': { preferredLayouts: ['corporate'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'academic_lecture': { preferredLayouts: ['academic'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'storytelling_narrative': { preferredLayouts: ['storytelling'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
      'children_education': { preferredLayouts: ['playful'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'technical_documentation': { preferredLayouts: ['minimalist'], spacing: 'tight', emphasis: 'content', colorScheme: 'minimal' },
      'creative_showcase': { preferredLayouts: ['dynamic'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'medical_healthcare': { preferredLayouts: ['academic'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'sales_pitch': { preferredLayouts: ['corporate'], spacing: 'normal', emphasis: 'title', colorScheme: 'professional' },
      'training_workshop': { preferredLayouts: ['balanced'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'conference_talk': { preferredLayouts: ['minimalist'], spacing: 'normal', emphasis: 'title', colorScheme: 'professional' },
      'product_demo': { preferredLayouts: ['dynamic'], spacing: 'normal', emphasis: 'image', colorScheme: 'vibrant' },
      'financial_report': { preferredLayouts: ['corporate'], spacing: 'tight', emphasis: 'content', colorScheme: 'professional' },
      'research_findings': { preferredLayouts: ['academic'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'marketing_campaign': { preferredLayouts: ['dynamic'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'game_book': { preferredLayouts: ['storytelling'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
    }
  },
  
  'The Logical Minimalist': {
    id: 'The Logical Minimalist',
    name: 'The Logical Minimalist',
    philosophy: 'Form Follows Function',
    layoutPrinciples: ['Extreme minimalism', 'Strict grid system', 'Monochrome base', 'Typography focus'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['grid'], spacing: 'loose', emphasis: 'content', colorScheme: 'minimal' },
      'business_presentation': { preferredLayouts: ['grid', 'left-align'], spacing: 'loose', emphasis: 'content', colorScheme: 'minimal' },
      'academic_lecture': { preferredLayouts: ['structured'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
      'storytelling_narrative': { preferredLayouts: ['sequential'], spacing: 'loose', emphasis: 'content', colorScheme: 'minimal' },
      'children_education': { preferredLayouts: ['simple'], spacing: 'loose', emphasis: 'content', colorScheme: 'minimal' },
      'technical_documentation': { preferredLayouts: ['hierarchical'], spacing: 'tight', emphasis: 'content', colorScheme: 'minimal' },
      'creative_showcase': { preferredLayouts: ['grid'], spacing: 'loose', emphasis: 'content', colorScheme: 'minimal' },
      'medical_healthcare': { preferredLayouts: ['structured'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
      'sales_pitch': { preferredLayouts: ['focused'], spacing: 'loose', emphasis: 'title', colorScheme: 'minimal' },
      'training_workshop': { preferredLayouts: ['step-by-step'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
      'conference_talk': { preferredLayouts: ['statement'], spacing: 'loose', emphasis: 'title', colorScheme: 'minimal' },
      'product_demo': { preferredLayouts: ['feature-focus'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
      'financial_report': { preferredLayouts: ['data-grid'], spacing: 'tight', emphasis: 'content', colorScheme: 'minimal' },
      'research_findings': { preferredLayouts: ['evidence-based'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
      'marketing_campaign': { preferredLayouts: ['message-focus'], spacing: 'loose', emphasis: 'title', colorScheme: 'minimal' },
      'game_book': { preferredLayouts: ['choice-structure'], spacing: 'normal', emphasis: 'content', colorScheme: 'minimal' },
    }
  },

  'The Emotional Storyteller': {
    id: 'The Emotional Storyteller',
    name: 'The Emotional Storyteller',
    philosophy: 'Every Slide Tells a Story',
    layoutPrinciples: ['Image-driven', 'Narrative flow', 'Emotional colors', 'Expressive fonts'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['hero-image'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
      'business_presentation': { preferredLayouts: ['story-corporate'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'academic_lecture': { preferredLayouts: ['case-study'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'storytelling_narrative': { preferredLayouts: ['full-bleed', 'overlay'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
      'children_education': { preferredLayouts: ['storybook'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'technical_documentation': { preferredLayouts: ['visual-guide'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'creative_showcase': { preferredLayouts: ['portfolio'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'medical_healthcare': { preferredLayouts: ['patient-journey'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'sales_pitch': { preferredLayouts: ['customer-story'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'training_workshop': { preferredLayouts: ['scenario-based'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'conference_talk': { preferredLayouts: ['keynote-story'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
      'product_demo': { preferredLayouts: ['user-journey'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'financial_report': { preferredLayouts: ['growth-story'], spacing: 'normal', emphasis: 'image', colorScheme: 'professional' },
      'research_findings': { preferredLayouts: ['discovery-narrative'], spacing: 'normal', emphasis: 'image', colorScheme: 'warm' },
      'marketing_campaign': { preferredLayouts: ['brand-story'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'game_book': { preferredLayouts: ['adventure-scenes'], spacing: 'loose', emphasis: 'image', colorScheme: 'warm' },
    }
  },

  'The Academic Visualizer': {
    id: 'The Academic Visualizer',
    name: 'The Academic Visualizer',
    philosophy: 'Clarity and Accuracy Above All',
    layoutPrinciples: ['Information structure', 'Even spacing', 'Clean design', 'Traditional fonts'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['two-column'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'business_presentation': { preferredLayouts: ['formal-business'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'academic_lecture': { preferredLayouts: ['lecture-hall'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'storytelling_narrative': { preferredLayouts: ['documented-narrative'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'children_education': { preferredLayouts: ['educational'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'academic' },
      'technical_documentation': { preferredLayouts: ['technical-spec'], spacing: 'tight', emphasis: 'content', colorScheme: 'academic' },
      'creative_showcase': { preferredLayouts: ['portfolio-academic'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'academic' },
      'medical_healthcare': { preferredLayouts: ['clinical-data'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'sales_pitch': { preferredLayouts: ['data-driven'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'training_workshop': { preferredLayouts: ['curriculum'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'conference_talk': { preferredLayouts: ['research-presentation'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'product_demo': { preferredLayouts: ['feature-comparison'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'financial_report': { preferredLayouts: ['analytical'], spacing: 'tight', emphasis: 'content', colorScheme: 'professional' },
      'research_findings': { preferredLayouts: ['peer-review'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
      'marketing_campaign': { preferredLayouts: ['market-analysis'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'game_book': { preferredLayouts: ['rule-book'], spacing: 'normal', emphasis: 'content', colorScheme: 'academic' },
    }
  },

  'The Vivid Creator': {
    id: 'The Vivid Creator',
    name: 'The Vivid Creator',
    philosophy: "Don't Be Boring",
    layoutPrinciples: ['Bold composition', 'Vivid colors', 'Trend reflection', 'Mix media'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['dynamic'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'business_presentation': { preferredLayouts: ['innovative'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'vibrant' },
      'academic_lecture': { preferredLayouts: ['engaging-academic'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'vibrant' },
      'storytelling_narrative': { preferredLayouts: ['explosive-narrative'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'children_education': { preferredLayouts: ['fun-learning'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'technical_documentation': { preferredLayouts: ['visual-tech'], spacing: 'normal', emphasis: 'image', colorScheme: 'vibrant' },
      'creative_showcase': { preferredLayouts: ['artistic'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'medical_healthcare': { preferredLayouts: ['modern-medical'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'sales_pitch': { preferredLayouts: ['attention-grabbing'], spacing: 'normal', emphasis: 'title', colorScheme: 'vibrant' },
      'training_workshop': { preferredLayouts: ['interactive'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'vibrant' },
      'conference_talk': { preferredLayouts: ['memorable'], spacing: 'loose', emphasis: 'title', colorScheme: 'vibrant' },
      'product_demo': { preferredLayouts: ['showcase'], spacing: 'normal', emphasis: 'image', colorScheme: 'vibrant' },
      'financial_report': { preferredLayouts: ['infographic'], spacing: 'normal', emphasis: 'image', colorScheme: 'professional' },
      'research_findings': { preferredLayouts: ['visual-research'], spacing: 'normal', emphasis: 'image', colorScheme: 'vibrant' },
      'marketing_campaign': { preferredLayouts: ['campaign'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
      'game_book': { preferredLayouts: ['game-world'], spacing: 'loose', emphasis: 'image', colorScheme: 'vibrant' },
    }
  },

  'The Corporate Strategist': {
    id: 'The Corporate Strategist',
    name: 'The Corporate Strategist',
    philosophy: 'Trust and Professionalism',
    layoutPrinciples: ['Brand compliance', 'Structured clean', 'Goal-oriented', 'Refined charts'],
    purposeAdaptation: {
      'auto': { preferredLayouts: ['corporate'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'business_presentation': { preferredLayouts: ['executive'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'academic_lecture': { preferredLayouts: ['professional-academic'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'storytelling_narrative': { preferredLayouts: ['corporate-story'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'children_education': { preferredLayouts: ['structured-learning'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'warm' },
      'technical_documentation': { preferredLayouts: ['enterprise'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'creative_showcase': { preferredLayouts: ['professional-portfolio'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'medical_healthcare': { preferredLayouts: ['healthcare-professional'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'sales_pitch': { preferredLayouts: ['strategic-sales'], spacing: 'normal', emphasis: 'title', colorScheme: 'professional' },
      'training_workshop': { preferredLayouts: ['corporate-training'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'conference_talk': { preferredLayouts: ['keynote'], spacing: 'normal', emphasis: 'title', colorScheme: 'professional' },
      'product_demo': { preferredLayouts: ['product-strategy'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'financial_report': { preferredLayouts: ['financial-dashboard'], spacing: 'tight', emphasis: 'content', colorScheme: 'professional' },
      'research_findings': { preferredLayouts: ['strategic-insights'], spacing: 'normal', emphasis: 'content', colorScheme: 'professional' },
      'marketing_campaign': { preferredLayouts: ['brand-strategy'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
      'game_book': { preferredLayouts: ['structured-narrative'], spacing: 'normal', emphasis: 'balanced', colorScheme: 'professional' },
    }
  },
};

/**
 * Auto-select the best designer for a given purpose
 */
export const selectDesignerForPurpose = (purpose: PresentationPurpose): DesignerType => {
  const purposeDesignerMapping: Record<PresentationPurpose, DesignerType> = {
    'auto': 'The Corporate Strategist',
    'business_presentation': 'The Corporate Strategist',
    'academic_lecture': 'The Academic Visualizer',
    'storytelling_narrative': 'The Emotional Storyteller',
    'children_education': 'The Emotional Storyteller',
    'technical_documentation': 'The Logical Minimalist',
    'creative_showcase': 'The Vivid Creator',
    'medical_healthcare': 'The Academic Visualizer',
    'sales_pitch': 'The Corporate Strategist',
    'training_workshop': 'The Corporate Strategist',
    'conference_talk': 'The Logical Minimalist',
    'product_demo': 'The Vivid Creator',
    'financial_report': 'The Corporate Strategist',
    'research_findings': 'The Academic Visualizer',
    'marketing_campaign': 'The Vivid Creator',
    'game_book': 'The Emotional Storyteller',
  };
  
  return purposeDesignerMapping[purpose] || 'The Corporate Strategist';
};

/**
 * Get layout strategy for a designer and purpose
 */
export const getLayoutStrategy = (designer: DesignerType, purpose: PresentationPurpose) => {
  if (designer === 'auto') {
    const selectedDesigner = selectDesignerForPurpose(purpose);
    return DESIGNER_STRATEGIES[selectedDesigner].purposeAdaptation[purpose];
  }
  
  return DESIGNER_STRATEGIES[designer]?.purposeAdaptation[purpose] || 
         DESIGNER_STRATEGIES['The Corporate Strategist'].purposeAdaptation[purpose];
};

/**
 * Get designer-specific layout instructions for AI
 */
export const getDesignerLayoutPrompt = (designer: DesignerType, purpose: PresentationPurpose): string => {
  const actualDesigner = designer === 'auto' ? selectDesignerForPurpose(purpose) : designer;
  const strategy = DESIGNER_STRATEGIES[actualDesigner];
  
  // Debug logging
  console.log('Designer Layout Debug:', { designer, purpose, actualDesigner, strategy: strategy?.name });
  
  if (!strategy) {
    console.error('No strategy found for designer:', actualDesigner);
    throw new Error(`指定されたデザイナー「${actualDesigner}」の戦略が見つかりません。有効なデザイナーを選択してください。`);
  }
  
  // Map new purpose to legacy purpose used in DESIGNER_STRATEGIES
  const legacyPurpose = mapPurposeToLegacyPurpose(purpose);
  const adaptation = strategy.purposeAdaptation[legacyPurpose];
  
  if (!adaptation) {
    console.error('No adaptation found for legacy purpose:', legacyPurpose, 'from purpose:', purpose, 'Available purposes:', Object.keys(strategy.purposeAdaptation));
    throw new Error(`デザイナー「${strategy.name}」は用途「${purpose}」に対応していません。別の用途を選択してください。`);
  }
  
  const prompt = `
レイアウト戦略: ${strategy.name} - "${strategy.philosophy}"

基本原則:
${strategy.layoutPrinciples.map(principle => `- ${principle}`).join('\n')}

この用途(${purpose})での適用:
- 優先レイアウト: ${adaptation.preferredLayouts.join(', ')}
- スペーシング: ${adaptation.spacing}
- 強調要素: ${adaptation.emphasis}
- カラースキーム: ${adaptation.colorScheme}

具体的な指示:
${getSpecificLayoutInstructions(actualDesigner, legacyPurpose, adaptation)}
`;
  
  return prompt;
};

/**
 * Get specific layout instructions based on designer and purpose
 */
const getSpecificLayoutInstructions = (designer: DesignerType, purpose: PresentationPurpose, adaptation: any): string => {
  const instructions: Record<DesignerType, Record<string, string>> = {
    'auto': { default: '用途に応じて最適な配置を選択' },
    
    'amateur': {
      default: '単調で予測可能な4パターンローテーション: ①タイトルスライド ②タイトル+左画像+右テキスト ③タイトル+右画像+左テキスト ④タイトル+テキストのみ。1枚目は必ずタイトルスライド、2枚目以降は②③④を順番に繰り返し使用',
      'business_presentation': '基本パターンを機械的に適用: タイトルは上部中央、画像は左右50%、テキストは残り50%の領域に配置',
      'storytelling_narrative': '同じ4パターンを物語でも機械的に適用、創意工夫なし',
      'children_education': '子供向けでも同じ単調なパターンを繰り返し使用',
    },
    
    'The Logical Minimalist': {
      default: '厳格なグリッドに従い、余白を大胆に使用。タイトルは左上、本文は構造化リスト形式で配置',
      'business_presentation': '左揃えでタイトル配置、箇条書きは階層化して表示',
      'technical_documentation': 'コンテンツを機能別にグループ化、最小限の装飾',
    },
    
    'The Emotional Storyteller': {
      default: '画像を主役として大きく配置、テキストは画像と調和するように流れるように配置',
      'storytelling_narrative': '画像を全面背景とし、テキストをオーバーレイで配置',
      'children_education': 'カラフルな画像を中心とし、テキストは読みやすく大きく',
    },
    
    'The Academic Visualizer': {
      default: '2カラムレイアウトで情報を整理、図表は中央揃えで配置',
      'academic_lecture': 'タイトルは中央、本文は左右2列で均等配置',
      'research_findings': 'データと説明文を対比させる形で配置',
    },
    
    'The Vivid Creator': {
      default: '要素を意図的に傾けたり非対称配置、高彩度色で視覚的インパクト',
      'creative_showcase': 'グリッドを破る大胆な配置、要素のサイズにコントラスト',
      'marketing_campaign': 'キャッチーな要素を爆心地として放射状配置',
    },
    
    'The Corporate Strategist': {
      default: 'ヘッダー領域を設け、コンテンツはカード形式で構造化配置',
      'business_presentation': 'ブランドカラーでヘッダー作成、重要情報を枠囲みで強調',
      'financial_report': 'KPI情報を視線が集まる位置に戦略的配置',
    },
  };
  
  const designerInstructions = instructions[designer] || instructions['The Corporate Strategist'];
  return designerInstructions[purpose] || designerInstructions['default'] || designerInstructions.default;
};