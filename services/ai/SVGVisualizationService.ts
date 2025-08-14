// =================================================================
// SVG Visualization Service - 動的データ可視化システム
// Phase 4.2: 実データがある場合のグラフ生成機能
// =================================================================

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartOptions {
  title?: string;
  width?: number;
  height?: number;
  colors?: string[];
  showLabels?: boolean;
  showValues?: boolean;
}

export interface VisualizationRequest {
  data: DataPoint[];
  chartType: 'bar' | 'pie' | 'line' | 'area';
  options?: ChartOptions;
}

/**
 * 🎯 Phase 4.2: SVG動的可視化サービス
 * 実際のデータが存在する場合のみ、適切なSVGグラフを生成
 */
export class SVGVisualizationService {

  /**
   * データからSVGグラフを生成
   */
  generateVisualization(request: VisualizationRequest): string {
    const { data, chartType, options = {} } = request;
    
    console.log(`🎨 Generating ${chartType} SVG visualization with ${data.length} data points`);

    switch (chartType) {
      case 'bar':
        return this.generateBarChart(data, options);
      case 'pie':
        return this.generatePieChart(data, options);
      case 'line':
        return this.generateLineChart(data, options);
      case 'area':
        return this.generateAreaChart(data, options);
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  }

  /**
   * コンテンツからデータを抽出してグラフ生成
   */
  generateFromContent(content: string, preferredChartType?: 'bar' | 'pie' | 'line' | 'area'): string | null {
    const extractedData = this.extractDataFromContent(content);
    
    if (extractedData.length === 0) {
      console.log('❌ No extractable data found in content');
      return null;
    }

    const chartType = preferredChartType || this.determineOptimalChartType(extractedData);
    const title = this.extractTitle(content);

    console.log(`📊 Auto-generating ${chartType} chart from content data`);

    return this.generateVisualization({
      data: extractedData,
      chartType,
      options: { title, showLabels: true, showValues: true }
    });
  }

  /**
   * 棒グラフSVG生成
   */
  private generateBarChart(data: DataPoint[], options: ChartOptions): string {
    const { width = 500, height = 300, colors = ['#4A90E2', '#50C878', '#FFB347', '#FF6B6B', '#8A2BE2'] } = options;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    const bars = data.map((point, index) => {
      const barHeight = (point.value / maxValue) * chartHeight;
      const x = margin.left + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = margin.top + chartHeight - barHeight;
      const color = point.color || colors[index % colors.length];

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="${color}" stroke="#333" stroke-width="1" opacity="0.8"/>
        ${options.showValues ? `<text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#333">${point.value}</text>` : ''}
        ${options.showLabels ? `<text x="${x + barWidth/2}" y="${height - margin.bottom + 20}" text-anchor="middle" font-size="10" fill="#666">${point.label}</text>` : ''}
      `;
    }).join('');

    return this.wrapSVG(width, height, `
      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="#fafafa" stroke="#ddd"/>
      
      <!-- タイトル -->
      ${options.title ? `<text x="${width/2}" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${options.title}</text>` : ''}
      
      <!-- 軸 -->
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#666" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#666" stroke-width="2"/>
      
      <!-- バー -->
      ${bars}
    `);
  }

  /**
   * 円グラフSVG生成
   */
  private generatePieChart(data: DataPoint[], options: ChartOptions): string {
    const { width = 400, height = 400, colors = ['#4A90E2', '#50C878', '#FFB347', '#FF6B6B', '#8A2BE2'] } = options;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    const total = data.reduce((sum, point) => sum + point.value, 0);
    let currentAngle = 0;

    const slices = data.map((point, index) => {
      const sliceAngle = (point.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const color = point.color || colors[index % colors.length];
      
      const percentage = ((point.value / total) * 100).toFixed(1);
      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
      const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);

      return `
        <path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
              fill="${color}" stroke="#fff" stroke-width="2" opacity="0.8"/>
        ${options.showValues ? `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">${percentage}%</text>` : ''}
      `;
    }).join('');

    // 凡例
    const legend = data.map((point, index) => {
      const y = 50 + index * 20;
      const color = point.color || colors[index % colors.length];
      return `
        <rect x="${width - 150}" y="${y - 8}" width="12" height="12" fill="${color}"/>
        <text x="${width - 130}" y="${y}" font-size="12" fill="#333">${point.label}</text>
      `;
    }).join('');

    return this.wrapSVG(width, height, `
      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="#fafafa" stroke="#ddd"/>
      
      <!-- タイトル -->
      ${options.title ? `<text x="${width/2}" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${options.title}</text>` : ''}
      
      <!-- 円グラフ -->
      ${slices}
      
      <!-- 凡例 -->
      ${options.showLabels ? legend : ''}
    `);
  }

  /**
   * 折れ線グラフSVG生成
   */
  private generateLineChart(data: DataPoint[], options: ChartOptions): string {
    const { width = 500, height = 300, colors = ['#4A90E2'] } = options;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue;

    const points = data.map((point, index) => {
      const x = margin.left + (index / (data.length - 1)) * chartWidth;
      const y = margin.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y, ...point };
    });

    const pathData = points.map((point, index) => 
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');

    const circles = points.map(point => `
      <circle cx="${point.x}" cy="${point.y}" r="4" fill="${colors[0]}" stroke="#fff" stroke-width="2"/>
      ${options.showValues ? `<text x="${point.x}" y="${point.y - 10}" text-anchor="middle" font-size="10" fill="#333">${point.value}</text>` : ''}
    `).join('');

    const labels = points.map(point => 
      options.showLabels ? `<text x="${point.x}" y="${height - margin.bottom + 20}" text-anchor="middle" font-size="10" fill="#666">${point.label}</text>` : ''
    ).join('');

    return this.wrapSVG(width, height, `
      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="#fafafa" stroke="#ddd"/>
      
      <!-- タイトル -->
      ${options.title ? `<text x="${width/2}" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">${options.title}</text>` : ''}
      
      <!-- 軸 -->
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#666" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#666" stroke-width="2"/>
      
      <!-- 線グラフ -->
      <path d="${pathData}" fill="none" stroke="${colors[0]}" stroke-width="3" opacity="0.8"/>
      
      <!-- データポイント -->
      ${circles}
      
      <!-- ラベル -->
      ${labels}
    `);
  }

  /**
   * エリアチャートSVG生成
   */
  private generateAreaChart(data: DataPoint[], options: ChartOptions): string {
    const lineChart = this.generateLineChart(data, options);
    
    // 折れ線グラフをベースにエリアを追加
    const { width = 500, height = 300 } = options;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue;

    const points = data.map((point, index) => {
      const x = margin.left + (index / (data.length - 1)) * chartWidth;
      const y = margin.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y };
    });

    const areaPath = [
      `M ${margin.left} ${margin.top + chartHeight}`,
      ...points.map((point, index) => 
        index === 0 ? `L ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      ),
      `L ${margin.left + chartWidth} ${margin.top + chartHeight}`,
      'Z'
    ].join(' ');

    // エリア部分を追加した修正版を返す
    return lineChart.replace('<!-- 線グラフ -->', `
      <!-- エリア -->
      <path d="${areaPath}" fill="${options.colors?.[0] || '#4A90E2'}" opacity="0.3"/>
      
      <!-- 線グラフ -->`);
  }

  /**
   * コンテンツからデータを抽出
   */
  private extractDataFromContent(content: string): DataPoint[] {
    const data: DataPoint[] = [];
    
    // 数値+単位のパターンを抽出
    const patterns = [
      /(\w+):\s*(\d+(?:\.\d+)?)\s*([%円ドル件個台人])/g,
      /(\w+)\s*(\d+(?:\.\d+)?)\s*([%円ドル件個台人])/g,
      /(\w+).*?(\d+(?:\.\d+)?)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const label = match[1].trim();
        const value = parseFloat(match[2]);
        
        if (!isNaN(value) && label.length > 0 && label.length < 20) {
          data.push({ label, value });
        }
      }
    }

    // 重複除去と上位5件に制限
    const uniqueData = data
      .filter((item, index, arr) => 
        arr.findIndex(other => other.label === item.label) === index
      )
      .slice(0, 5);

    return uniqueData;
  }

  /**
   * 最適なチャートタイプを決定
   */
  private determineOptimalChartType(data: DataPoint[]): 'bar' | 'pie' | 'line' | 'area' {
    if (data.length <= 2) return 'bar';
    if (data.length <= 5) return 'pie';
    return 'line';
  }

  /**
   * コンテンツからタイトルを抽出
   */
  private extractTitle(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 50) {
      return firstLine.replace(/[#*-]/g, '').trim();
    }
    
    return 'データ可視化';
  }

  /**
   * SVGをラップして完全なSVG文書にする
   */
  private wrapSVG(width: number, height: number, content: string): string {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text { font-family: 'Arial', 'Hiragino Sans', 'Yu Gothic', sans-serif; }
        .chart-bg { fill: #fafafa; stroke: #ddd; }
      </style>
      ${content}
    </svg>`;
  }
}