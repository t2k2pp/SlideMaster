import { Presentation, ExportResult } from '../../types';
import { saveAs } from 'file-saver';
import {
  generateFilename,
  createErrorResult,
  createSuccessResult,
  validatePresentation
} from './exportUtils';

// =================================================================
// HTML Export Service - Interactive HTML slideshow export
// =================================================================

const generateSlideHTML = (slide: any, index: number) => {
  const layersHTML = slide.layers.map((layer: any) => {
    const baseStyle = `
      position: absolute;
      left: ${layer.x}%;
      top: ${layer.y}%;
      width: ${layer.width}%;
      height: ${layer.height}%;
      opacity: ${layer.opacity};
      transform: rotate(${layer.rotation}deg);
      z-index: ${layer.zIndex};
    `;

    switch (layer.type) {
      case 'text':
        return `
          <div style="${baseStyle}
            font-size: ${layer.fontSize * 0.5}px;
            text-align: ${layer.textAlign};
            color: ${layer.textColor || '#ffffff'};
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: ${layer.textAlign === 'center' ? 'center' : layer.textAlign === 'right' ? 'flex-end' : 'flex-start'};
            white-space: pre-wrap;
            word-wrap: break-word;
          ">
            ${layer.content.replace(/\n/g, '<br>')}
          </div>
        `;
      
      case 'image':
        return layer.src ? `
          <div style="${baseStyle}">
            <img src="${layer.src}" 
                 style="width: 100%; height: 100%; object-fit: ${layer.objectFit}; border-radius: 8px;"
                 alt="Slide image" />
          </div>
        ` : '';
      
      case 'shape':
        const shapeStyle = (() => {
          switch (layer.shapeType) {
            case 'circle':
              return 'border-radius: 50%;';
            case 'triangle':
              return `
                width: 0;
                height: 0;
                border-left: ${layer.width/2}% solid transparent;
                border-right: ${layer.width/2}% solid transparent;
                border-bottom: ${layer.height}% solid ${layer.fillColor};
                background: transparent;
              `;
            default: // rectangle
              return 'border-radius: 4px;';
          }
        })();
        
        return `
          <div style="${baseStyle}
            background-color: ${layer.fillColor};
            border: ${layer.strokeWidth}px solid ${layer.strokeColor};
            ${shapeStyle}
          "></div>
        `;
      
      default:
        return '';
    }
  }).join('');

  return `
    <div class="slide ${index === 0 ? 'active' : ''}" 
         style="background: ${slide.background}; position: relative;">
      ${layersHTML}
      ${slide.notes ? `
        <div class="slide-notes" style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px;
          font-size: 14px;
          display: none;
        ">
          ${slide.notes}
        </div>
      ` : ''}
    </div>
  `;
};

/**
 * Export presentation as interactive HTML slideshow
 */
export const exportAsHTML = async (presentation: Presentation): Promise<ExportResult> => {
  try {
    validatePresentation(presentation);

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title}</title>
    <style>
        * { box-sizing: border-box; }
        body { 
          margin: 0; 
          font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; 
          background: #000; 
          overflow: hidden;
        }
        .presentation { 
          width: 100vw; 
          height: 100vh; 
          position: relative; 
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slide-container {
          width: 90vw;
          height: 90vh;
          max-width: 1280px;
          max-height: 720px;
          position: relative;
          border: 2px solid #333;
          border-radius: 8px;
          overflow: hidden;
        }
        .slide { 
          width: 100%; 
          height: 100%; 
          position: absolute; 
          top: 0; 
          left: 0; 
          display: none; 
        }
        .slide.active { display: block; }
        .controls { 
          position: fixed; 
          bottom: 20px; 
          left: 50%; 
          transform: translateX(-50%); 
          z-index: 1000; 
          display: flex;
          gap: 10px;
          background: rgba(0,0,0,0.8);
          padding: 10px;
          border-radius: 8px;
        }
        .controls button { 
          padding: 12px 20px; 
          background: #fff; 
          border: none; 
          cursor: pointer; 
          border-radius: 4px;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        .controls button:hover { background: #f0f0f0; }
        .controls button:disabled { 
          background: #666; 
          color: #999; 
          cursor: not-allowed; 
        }
        .slide-counter {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          z-index: 1000;
        }
        .notes-toggle {
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(0,0,0,0.8);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          z-index: 1000;
        }
        .presentation-title {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 600;
          z-index: 1000;
        }
        .slide-notes.visible {
          display: block !important;
        }
    </style>
</head>
<body>
    <div class="presentation-title">${presentation.title}</div>
    <div class="slide-counter">
        <span id="slide-current">1</span> / <span id="slide-total">${presentation.slides.length}</span>
    </div>
    <button class="notes-toggle" onclick="toggleNotes()">📝 Notes</button>
    
    <div class="presentation">
        <div class="slide-container">
            ${presentation.slides.map((slide, index) => generateSlideHTML(slide, index)).join('')}
        </div>
    </div>
    
    <div class="controls">
        <button onclick="firstSlide()" id="first-btn">⏮ First</button>
        <button onclick="prevSlide()" id="prev-btn">⬅ Previous</button>
        <button onclick="nextSlide()" id="next-btn">Next ➡</button>
        <button onclick="lastSlide()" id="last-btn">Last ⏭</button>
    </div>

    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        let notesVisible = false;
        
        function updateControls() {
            document.getElementById('first-btn').disabled = currentSlide === 0;
            document.getElementById('prev-btn').disabled = currentSlide === 0;
            document.getElementById('next-btn').disabled = currentSlide === totalSlides - 1;
            document.getElementById('last-btn').disabled = currentSlide === totalSlides - 1;
            document.getElementById('slide-current').textContent = currentSlide + 1;
        }
        
        function showSlide(n) {
            if (n < 0 || n >= totalSlides) return;
            
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === n);
            });
            currentSlide = n;
            updateControls();
        }
        
        function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                showSlide(currentSlide + 1);
            }
        }
        
        function prevSlide() {
            if (currentSlide > 0) {
                showSlide(currentSlide - 1);
            }
        }
        
        function firstSlide() {
            showSlide(0);
        }
        
        function lastSlide() {
            showSlide(totalSlides - 1);
        }
        
        function toggleNotes() {
            notesVisible = !notesVisible;
            const notes = document.querySelectorAll('.slide-notes');
            notes.forEach(note => {
                note.classList.toggle('visible', notesVisible);
            });
            document.querySelector('.notes-toggle').textContent = notesVisible ? '📝 Hide Notes' : '📝 Notes';
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowRight':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    nextSlide();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    prevSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    firstSlide();
                    break;
                case 'End':
                    e.preventDefault();
                    lastSlide();
                    break;
                case 'F5':
                case 'f':
                    e.preventDefault();
                    document.documentElement.requestFullscreen();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    toggleNotes();
                    break;
            }
        });
        
        // Initialize
        updateControls();
        
        // Touch/swipe support for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;
            
            // Minimum swipe distance
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    nextSlide(); // Swipe left to go to next slide
                } else {
                    prevSlide(); // Swipe right to go to previous slide
                }
            }
            
            touchStartX = 0;
            touchStartY = 0;
        });
    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const filename = generateFilename(presentation, 'html');
    saveAs(blob, filename);
    
    return createSuccessResult(filename, 'html');
  } catch (error) {
    console.error('HTML export error:', error);
    return createErrorResult(error);
  }
};