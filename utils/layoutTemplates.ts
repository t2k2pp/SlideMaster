// =================================================================
// Layout Template System - Restored from backup
// =================================================================

export interface LayoutTemplate {
  title?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
  };
  content?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
  };
  content2?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
  };
  image?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  image2?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  choice?: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
  };
}

/**
 * Layout templates for diverse presentation purposes (restored from backup)
 */
export const layoutTemplates: Record<string, LayoutTemplate> = {
  // Basic Layouts
  title_slide: {
    title: { x: 10, y: 35, width: 80, height: 30, fontSize: 72, textAlign: 'center' },
  },
  title_and_content: {
    title: { x: 10, y: 10, width: 80, height: 20, fontSize: 60, textAlign: 'left' },
    content: { x: 10, y: 35, width: 80, height: 50, fontSize: 36, textAlign: 'left' },
  },
  content_only: {
    content: { x: 10, y: 20, width: 80, height: 60, fontSize: 40, textAlign: 'left' },
  },
  
  // Image Layouts
  image_left: {
    title: { x: 10, y: 10, width: 80, height: 15, fontSize: 52, textAlign: 'left' },
    image: { x: 5, y: 30, width: 40, height: 60 },
    content: { x: 50, y: 30, width: 45, height: 60, fontSize: 32, textAlign: 'left' },
  },
  image_right: {
    title: { x: 10, y: 10, width: 80, height: 15, fontSize: 52, textAlign: 'left' },
    content: { x: 5, y: 30, width: 45, height: 60, fontSize: 32, textAlign: 'left' },
    image: { x: 55, y: 30, width: 40, height: 60 },
  },
  image_top: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 52, textAlign: 'left' },
    image: { x: 10, y: 20, width: 80, height: 40 },
    content: { x: 10, y: 65, width: 80, height: 30, fontSize: 32, textAlign: 'left' },
  },
  image_bottom: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 52, textAlign: 'left' },
    content: { x: 10, y: 20, width: 80, height: 30, fontSize: 32, textAlign: 'left' },
    image: { x: 10, y: 55, width: 80, height: 40 },
  },
  full_bleed_image: {
    image: { x: 0, y: 0, width: 100, height: 100 },
    title: { x: 10, y: 70, width: 80, height: 20, fontSize: 48, textAlign: 'left' },
  },
  
  // Storytelling Layouts
  storybook_page: {
    image: { x: 10, y: 10, width: 80, height: 60 },
    content: { x: 10, y: 75, width: 80, height: 20, fontSize: 28, textAlign: 'center' },
  },
  comic_strip: {
    image: { x: 5, y: 5, width: 40, height: 90 },
    content: { x: 50, y: 20, width: 45, height: 60, fontSize: 24, textAlign: 'left' },
  },
  fairy_tale: {
    title: { x: 10, y: 5, width: 80, height: 20, fontSize: 60, textAlign: 'center' },
    image: { x: 20, y: 25, width: 60, height: 50 },
    content: { x: 10, y: 80, width: 80, height: 15, fontSize: 32, textAlign: 'center' },
  },
  narrative_full: {
    image: { x: 0, y: 0, width: 100, height: 70 },
    content: { x: 10, y: 75, width: 80, height: 20, fontSize: 28, textAlign: 'center' },
  },
  
  // Children's Layouts
  children_picture_book: {
    image: { x: 15, y: 10, width: 70, height: 60 },
    title: { x: 10, y: 75, width: 80, height: 15, fontSize: 40, textAlign: 'center' },
    content: { x: 10, y: 90, width: 80, height: 10, fontSize: 24, textAlign: 'center' },
  },
  playful_layout: {
    title: { x: 15, y: 15, width: 70, height: 20, fontSize: 50, textAlign: 'center' },
    image: { x: 5, y: 40, width: 45, height: 50 },
    content: { x: 55, y: 40, width: 40, height: 50, fontSize: 28, textAlign: 'left' },
  },
  learning_card: {
    title: { x: 10, y: 10, width: 80, height: 25, fontSize: 48, textAlign: 'center' },
    content: { x: 10, y: 40, width: 80, height: 50, fontSize: 36, textAlign: 'center' },
  },
  
  // Academic Layouts
  research_title: {
    title: { x: 10, y: 20, width: 80, height: 30, fontSize: 48, textAlign: 'center' },
    content: { x: 10, y: 55, width: 80, height: 30, fontSize: 24, textAlign: 'center' },
  },
  academic_content: {
    title: { x: 10, y: 8, width: 80, height: 15, fontSize: 44, textAlign: 'left' },
    content: { x: 10, y: 28, width: 80, height: 60, fontSize: 28, textAlign: 'left' },
  },
  two_column: {
    title: { x: 10, y: 8, width: 80, height: 12, fontSize: 40, textAlign: 'left' },
    content: { x: 5, y: 25, width: 42, height: 65, fontSize: 24, textAlign: 'left' },
    content2: { x: 53, y: 25, width: 42, height: 65, fontSize: 24, textAlign: 'left' },
  },
  
  // Business Layouts
  executive_summary: {
    title: { x: 10, y: 15, width: 80, height: 20, fontSize: 56, textAlign: 'center' },
    content: { x: 10, y: 40, width: 80, height: 45, fontSize: 32, textAlign: 'left' },
  },
  data_focus: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 44, textAlign: 'left' },
    image: { x: 10, y: 25, width: 80, height: 50 },
    content: { x: 10, y: 80, width: 80, height: 15, fontSize: 24, textAlign: 'left' },
  },
  comparison: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 40, textAlign: 'center' },
    content: { x: 5, y: 25, width: 42, height: 65, fontSize: 28, textAlign: 'left' },
    content2: { x: 53, y: 25, width: 42, height: 65, fontSize: 28, textAlign: 'left' },
  },
  
  // Magazine & Modern Layouts
  magazine_cover: {
    image: { x: 0, y: 0, width: 100, height: 100 },
    title: { x: 10, y: 10, width: 80, height: 30, fontSize: 64, textAlign: 'center' },
    content: { x: 10, y: 70, width: 80, height: 20, fontSize: 28, textAlign: 'center' },
  },
  modern_card: {
    title: { x: 10, y: 25, width: 80, height: 25, fontSize: 52, textAlign: 'center' },
    content: { x: 10, y: 55, width: 80, height: 20, fontSize: 32, textAlign: 'center' },
  },
  split_screen: {
    image: { x: 0, y: 0, width: 50, height: 100 },
    title: { x: 55, y: 20, width: 40, height: 25, fontSize: 44, textAlign: 'left' },
    content: { x: 55, y: 50, width: 40, height: 40, fontSize: 28, textAlign: 'left' },
  },
  
  // Tech & Modern Layouts
  tech_showcase: {
    title: { x: 10, y: 10, width: 80, height: 20, fontSize: 48, textAlign: 'left' },
    image: { x: 10, y: 35, width: 80, height: 40 },
    content: { x: 10, y: 80, width: 80, height: 15, fontSize: 24, textAlign: 'left' },
  },
  minimal_tech: {
    title: { x: 10, y: 30, width: 80, height: 25, fontSize: 56, textAlign: 'center' },
    content: { x: 10, y: 60, width: 80, height: 25, fontSize: 28, textAlign: 'center' },
  },
  
  // Traditional & Cultural Layouts
  japanese_scroll: {
    title: { x: 10, y: 15, width: 80, height: 20, fontSize: 48, textAlign: 'center' },
    content: { x: 15, y: 40, width: 70, height: 45, fontSize: 32, textAlign: 'center' },
  },
  calligraphy_style: {
    title: { x: 20, y: 20, width: 60, height: 30, fontSize: 44, textAlign: 'center' },
    content: { x: 15, y: 55, width: 70, height: 30, fontSize: 28, textAlign: 'center' },
  },
  
  // Game & Interactive Layouts
  game_text_heavy: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 44, textAlign: 'left' },
    content: { x: 10, y: 25, width: 80, height: 60, fontSize: 28, textAlign: 'left' },
    choice: { x: 10, y: 88, width: 80, height: 10, fontSize: 20, textAlign: 'center' },
  },
  game_choice_page: {
    content: { x: 10, y: 20, width: 80, height: 50, fontSize: 32, textAlign: 'left' },
    choice: { x: 10, y: 75, width: 80, height: 20, fontSize: 24, textAlign: 'center' },
  },
  mystery_reveal: {
    title: { x: 10, y: 15, width: 80, height: 20, fontSize: 52, textAlign: 'center' },
    content: { x: 15, y: 40, width: 70, height: 40, fontSize: 30, textAlign: 'center' },
  },
  clue_presentation: {
    title: { x: 10, y: 8, width: 80, height: 12, fontSize: 40, textAlign: 'center' },
    image: { x: 20, y: 25, width: 60, height: 40 },
    content: { x: 10, y: 70, width: 80, height: 25, fontSize: 26, textAlign: 'center' },
  },
  
  // Specialty Layouts
  section_header: {
    title: { x: 10, y: 40, width: 80, height: 20, fontSize: 64, textAlign: 'center' },
  },
  quote_layout: {
    content: { x: 15, y: 30, width: 70, height: 40, fontSize: 36, textAlign: 'center' },
  },
  title_image_left_text_right: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 52, textAlign: 'left' },
    image: { x: 5, y: 25, width: 40, height: 65 },
    content: { x: 50, y: 25, width: 45, height: 65, fontSize: 28, textAlign: 'left' },
  },
  grid_layout: {
    title: { x: 10, y: 5, width: 80, height: 15, fontSize: 40, textAlign: 'center' },
    image: { x: 5, y: 25, width: 42, height: 30 },
    image2: { x: 53, y: 25, width: 42, height: 30 },
    content: { x: 10, y: 60, width: 80, height: 30, fontSize: 28, textAlign: 'center' },
  },
};