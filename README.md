# SlideMaster

AI-Powered Slide Creation with Flexible Layer Editing

## Overview

SlideMaster combines the best of both worlds: AI-powered slide generation from ai-slide-generator and the flexible layer editing system from CreatetiveStudioAI. This creates a powerful presentation tool that offers both automated content creation and fine-grained control over slide elements.

## Key Features

### 🎯 **Hybrid Slide System**
- **AI-Generated Content**: Generate complete presentations from simple topics
- **Flexible Layer Editing**: Edit individual elements with drag, resize, and rotate
- **Multiple Templates**: Professional, Creative, Minimalist, and Playful themes

### 🎨 **Advanced Canvas Editing**
- **Layer Management**: Text, image, and shape layers with z-index control
- **Precise Positioning**: Percentage-based positioning for responsive layouts
- **Real-time Preview**: Live updates as you edit
- **Zoom and Pan**: Navigate large presentations with ease

### 🤖 **AI Integration**
- **Presentation Generation**: Create entire presentations from topic descriptions
- **Element Creation**: Generate individual text, images, and shapes
- **Content Assistance**: Improve existing content with AI suggestions
- **Image Generation**: AI-powered image creation with detailed prompts

### 📤 **Multi-Format Export**
- **PDF**: Perfect for sharing and printing
- **PowerPoint**: Editable presentation format
- **Images**: High-quality PNG/JPEG export
- **HTML**: Interactive web presentations

## Architecture

```
SlideMaster/
├── components/           # React components
│   ├── SlideCanvas.tsx   # Main canvas with layer editing
│   ├── SlideNavigator.tsx # Slide management
│   ├── LayerEditor.tsx   # Layer property editor
│   ├── AIAssistant.tsx   # AI integration interface
│   └── ExportManager.tsx # Export functionality
├── services/            # Core services
│   ├── geminiService.ts # AI content generation
│   ├── storageService.ts # Local storage management
│   └── exportService.ts # Export functionality
├── types.ts             # TypeScript definitions
├── constants.ts         # Configuration constants
└── App.tsx             # Main application
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SlideMaster
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file in the root directory
   echo "API_KEY=your_gemini_api_key_here" > .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Usage

### Creating a New Presentation

1. **Quick Start**: Click "Create New" and enter a title
2. **AI Generation**: Use "AI Generate" to create a full presentation from a topic
3. **Templates**: Choose from multiple themes (Professional, Creative, Minimalist, Playful)

### Editing Slides

1. **Canvas Navigation**: Use Space + drag to pan, mouse wheel to zoom
2. **Layer Selection**: Click on any element to select and edit
3. **Layer Properties**: Use the right panel to modify text, images, and shapes
4. **Layer Management**: Drag layers in the navigator to reorder

### AI Features

1. **Generate Slides**: Describe your topic and let AI create the presentation
2. **Add Elements**: Ask AI to add specific content to your slides
3. **Content Help**: Get suggestions for improving existing content
4. **Image Generation**: Create custom images with descriptive prompts

### Export Options

1. **PDF Export**: High-quality PDF for sharing and printing
2. **PowerPoint**: Editable PPTX format
3. **Images**: PNG/JPEG for web use
4. **HTML**: Interactive web presentation

## Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Canvas Editing**: react-moveable for drag/resize/rotate
- **AI Integration**: Google Gemini API for content generation
- **Export**: jsPDF, PptxGenJS, html2canvas
- **Storage**: LocalStorage with backup/restore
- **Build**: Vite for fast development

## Key Innovations

### 1. **Layer-Based Slide System**
Unlike traditional slide editors, SlideMaster uses a flexible layer system where each slide can contain multiple independently positioned and styled elements.

### 2. **AI-Powered Content Generation**
Integrated AI assistance for generating entire presentations, individual elements, and content improvements.

### 3. **Responsive Design**
Percentage-based positioning ensures presentations look great on any screen size.

### 4. **Real-time Collaboration Ready**
Architecture designed for easy extension to real-time collaboration features.

## Configuration

### Themes
Modify `constants.ts` to add new themes:
```typescript
export const THEME_CONFIGS = {
  myTheme: {
    name: 'My Theme',
    primaryColor: '#custom-color',
    // ... other properties
  }
};
```

### Text Styles
Add new text styles in `constants.ts`:
```typescript
export const TEXT_STYLES = [
  {
    id: 'my-style',
    name: 'My Style',
    style: {
      color: '#color',
      fontWeight: 'bold',
      // ... CSS properties
    }
  }
];
```

### Export Formats
Extend export functionality in `exportService.ts` by adding new format handlers.

## Performance Optimizations

1. **Virtual Scrolling**: Large presentations load efficiently
2. **Image Optimization**: Automatic image compression and resizing
3. **Lazy Loading**: Components load on demand
4. **Caching**: Intelligent caching of AI responses and images

## Browser Support

- Chrome 90+
- Firefox 85+
- Safari 14+
- Edge 90+

## API Requirements

- **Gemini API**: For AI content generation
- **CORS**: Ensure proper CORS configuration for API calls

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **ai-slide-generator**: Original slide generation concepts
- **CreatetiveStudioAI**: Layer editing system inspiration
- **Google Gemini**: AI content generation capabilities
- **React Moveable**: Flexible element manipulation

## Support

For support, feature requests, or bug reports, please create an issue in the repository.

---

Built with ❤️ by combining the best features of ai-slide-generator and CreatetiveStudioAI