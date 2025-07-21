import React from 'react';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  textAlign?: 'left' | 'center' | 'right';
}

export const parseMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      // Handle bullet points
      const bulletContent = line.trim().substring(2);
      const formattedBullet = formatInlineMarkdown(bulletContent);
      
      result.push(
        <div key={lineIndex} style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          marginBottom: '0.5em',
          width: '100%'
        }}>
          <span style={{ marginRight: '0.5em', flexShrink: 0 }}>•</span>
          <span style={{ flex: 1 }}>{formattedBullet}</span>
        </div>
      );
    } else if (line.trim() !== '') {
      // Handle regular lines
      const formattedLine = formatInlineMarkdown(line);
      result.push(
        <div key={lineIndex} style={{ marginBottom: '0.5em', width: '100%' }}>
          {formattedLine}
        </div>
      );
    } else {
      // Empty line
      result.push(<div key={lineIndex} style={{ height: '1em' }} />);
    }
  });
  
  return result;
};

const formatInlineMarkdown = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Bold text pattern **text**
  const boldPattern = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    // Add the bold text
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  // If no markdown was found, return the original text
  if (parts.length === 0) {
    return text;
  }
  
  return <>{parts}</>;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, style, textAlign = 'left' }) => {
  const parsedContent = parseMarkdown(content);
  
  return (
    <div style={{ 
      ...style, 
      display: 'flex',
      flexDirection: 'column',
      alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
      textAlign: textAlign,
      width: '100%',
      height: '100%'
    }}>
      {parsedContent}
    </div>
  );
};