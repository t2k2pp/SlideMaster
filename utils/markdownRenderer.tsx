import React from 'react';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  textAlign?: 'left' | 'center' | 'right';
}

export const parseMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLanguage = '';
  let inTable = false;
  let tableLines: string[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Handle code blocks (```language)
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3).toLowerCase();
        codeBlockLines = [];
      } else {
        // End of code block
        inCodeBlock = false;
        result.push(renderCodeBlock(codeBlockLines.join('\n'), codeLanguage, lineIndex));
        codeBlockLines = [];
        codeLanguage = '';
      }
      return;
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }
    
    // Handle table rows (|---|---|)
    if (line.trim().includes('|') && (line.trim().startsWith('|') || line.split('|').length > 2)) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
      return;
    } else if (inTable) {
      // End of table
      inTable = false;
      result.push(renderTable(tableLines, lineIndex));
      tableLines = [];
      // Process current line normally after table ends
    }
    
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
    } else if (line.trim().startsWith('### ')) {
      // Handle H3 headings (###)
      const headingText = line.trim().substring(4);
      const formattedHeading = formatInlineMarkdown(headingText);
      result.push(
        <div key={lineIndex} style={{ 
          marginBottom: '0.5em', 
          width: '100%',
          fontSize: '1.2em',
          fontWeight: 'bold',
          lineHeight: '1.3'
        }}>
          {formattedHeading}
        </div>
      );
    } else if (line.trim().startsWith('## ')) {
      // Handle H2 headings (##)
      const headingText = line.trim().substring(3);
      const formattedHeading = formatInlineMarkdown(headingText);
      result.push(
        <div key={lineIndex} style={{ 
          marginBottom: '0.6em', 
          width: '100%',
          fontSize: '1.4em',
          fontWeight: 'bold',
          lineHeight: '1.2'
        }}>
          {formattedHeading}
        </div>
      );
    } else if (line.trim().startsWith('# ')) {
      // Handle H1 headings (#)
      const headingText = line.trim().substring(2);
      const formattedHeading = formatInlineMarkdown(headingText);
      result.push(
        <div key={lineIndex} style={{ 
          marginBottom: '0.8em', 
          width: '100%',
          fontSize: '1.6em',
          fontWeight: 'bold',
          lineHeight: '1.1'
        }}>
          {formattedHeading}
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
  
  // Handle any remaining table at the end
  if (inTable && tableLines.length > 0) {
    result.push(renderTable(tableLines, lines.length));
  }
  
  // Handle any remaining code block at the end
  if (inCodeBlock && codeBlockLines.length > 0) {
    result.push(renderCodeBlock(codeBlockLines.join('\n'), codeLanguage, lines.length));
  }
  
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

// Code block renderer with syntax highlighting
const renderCodeBlock = (code: string, language: string, key: number): React.ReactNode => {
  const codeStyle: React.CSSProperties = {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'Consolas, "Monaco", "Courier New", monospace',
    fontSize: '0.85em',
    lineHeight: '1.4',
    overflow: 'auto',
    border: '1px solid #3e3e3e',
    margin: '8px 0',
  };
  
  const languageLabel = language ? language.toUpperCase() : 'CODE';
  
  return (
    <div key={`codeblock-${key}`} style={{ marginBottom: '1em', width: '100%' }}>
      {language && (
        <div style={{
          backgroundColor: '#2d2d2d',
          color: '#569cd6',
          padding: '4px 12px',
          fontSize: '0.7em',
          fontWeight: 'bold',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          borderBottom: '1px solid #3e3e3e'
        }}>
          {languageLabel}
        </div>
      )}
      <pre style={codeStyle}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Table renderer
const renderTable = (tableLines: string[], key: number): React.ReactNode => {
  if (tableLines.length === 0) return null;
  
  // Filter out separator rows (|---|---|)
  const dataRows = tableLines.filter(line => !line.match(/^\s*\|[\s\-\|:]+\|\s*$/));
  
  if (dataRows.length === 0) return null;
  
  // Parse table data
  const rows = dataRows.map(line => {
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
    return cells;
  });
  
  if (rows.length === 0) return null;
  
  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '8px 0',
    fontSize: '0.9em',
    backgroundColor: '#fafafa',
    border: '1px solid #ddd',
  };
  
  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    padding: '12px 8px',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
  };
  
  const cellStyle: React.CSSProperties = {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    verticalAlign: 'top',
  };
  
  return (
    <div key={`table-${key}`} style={{ marginBottom: '1em', width: '100%', overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headerRow.map((cell, cellIndex) => (
              <th key={cellIndex} style={headerStyle}>
                {formatInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={cellStyle}>
                  {formatInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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