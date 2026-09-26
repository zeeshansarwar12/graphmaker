import type { GraphEditorConfig } from '../graph/configs/editor';

export interface ToolPageFeature {
  description: string;
  title: string;
}

export interface ToolPageFaq {
  answer: string;
  question: string;
}

export interface RelatedTool {
  description: string;
  href: string;
  name: string;
}

export interface ToolPageConfig {
  additionalSections?: Array<{
    id: string;
    intro: string;
    items: Array<{ description: string; title: string }>;
    title: string;
  }>;
  beforeComparisonSections?: Array<{
    id: string;
    intro: string;
    items: Array<{ description: string; title: string }>;
    title: string;
  }>;
  canonical: string;
  comparison: {
    first: { body: string; title: string };
    intro: string;
    second: { body: string; title: string };
    title: string;
  };
  definition: string[];
  editor: GraphEditorConfig;
  example: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
  faqs: ToolPageFaq[];
  features: ToolPageFeature[];
  h1: string;
  howTo: Array<{ description: string; title: string }>;
  intro: string;
  metaDescription: string;
  relatedHeading?: string;
  relatedTools: RelatedTool[];
  sectionHeadings: {
    definition: string;
    example: string;
    faq: string;
    faqIntro: string;
    features: string;
    howTo: string;
  };
  slug: string;
  title: string;
  useCases?: {
    intro: string;
    items: Array<{ description: string; title: string }>;
    title: string;
  };
}

const xySampleData = {
  columns: [
    { id: 'column-1', kind: 'number', name: 'X' },
    { id: 'column-2', kind: 'number', name: 'Y' },
  ],
  rows: [
    { cells: ['1', '2'], id: 'row-1' },
    { cells: ['2', '5'], id: 'row-2' },
    { cells: ['3', '4'], id: 'row-3' },
    { cells: ['4', '8'], id: 'row-4' },
    { cells: ['5', '7'], id: 'row-5' },
  ],
} as const;

const scatterSampleData = {
  columns: [
    { id: 'column-1', kind: 'number', name: 'Hours Studied' },
    { id: 'column-2', kind: 'number', name: 'Exam Score' },
  ],
  rows: [
    { cells: ['1', '52'], id: 'row-1' },
    { cells: ['2', '57'], id: 'row-2' },
    { cells: ['2.5', '63'], id: 'row-3' },
    { cells: ['4', '68'], id: 'row-4' },
    { cells: ['5', '74'], id: 'row-5' },
    { cells: ['6.5', '81'], id: 'row-6' },
    { cells: ['7', '85'], id: 'row-7' },
    { cells: ['8', '91'], id: 'row-8' },
  ],
} as const;

const barSampleData = {
  columns: [
    { id: 'column-1', kind: 'label', name: 'Category' },
    { id: 'column-2', kind: 'number', name: 'Sales' },
    { id: 'column-3', kind: 'number', name: 'Profit' },
  ],
  rows: [
    { cells: ['Jan', '120', '32'], id: 'row-1' },
    { cells: ['Feb', '180', '49'], id: 'row-2' },
    { cells: ['Mar', '240', '71'], id: 'row-3' },
    { cells: ['Apr', '210', '63'], id: 'row-4' },
  ],
} as const;

const lineSampleData = {
  columns: [
    { id: 'column-1', kind: 'label', name: 'Date' },
    { id: 'column-2', kind: 'number', name: 'Visitors' },
    { id: 'column-3', kind: 'number', name: 'Orders' },
  ],
  rows: [
    { cells: ['2026-01-01', '620', '18'], id: 'row-1' },
    { cells: ['2026-01-05', '710', '23'], id: 'row-2' },
    { cells: ['2026-01-10', '760', '24'], id: 'row-3' },
    { cells: ['2026-01-20', '820', '27'], id: 'row-4' },
    { cells: ['2026-02-01', '870', '29'], id: 'row-5' },
    { cells: ['2026-02-10', '840', '26'], id: 'row-6' },
    { cells: ['2026-03-01', '940', '33'], id: 'row-7' },
  ],
} as const;

const pieSampleData = {
  columns: [
    { id: 'column-1', kind: 'label', name: 'Category' },
    { id: 'column-2', kind: 'number', name: 'Value' },
  ],
  rows: [
    { cells: ['Product A', '40'], id: 'row-1' },
    { cells: ['Product B', '30'], id: 'row-2' },
    { cells: ['Product C', '20'], id: 'row-3' },
    { cells: ['Product D', '10'], id: 'row-4' },
  ],
} as const;

const boxPlotSampleData = {
  columns: [
    { id: 'column-1', kind: 'number', name: 'Class A' },
    { id: 'column-2', kind: 'number', name: 'Class B' },
  ],
  rows: [
    { cells: ['72', '81'], id: 'row-1' },
    { cells: ['84', '76'], id: 'row-2' },
    { cells: ['67', '89'], id: 'row-3' },
    { cells: ['91', '92'], id: 'row-4' },
    { cells: ['76', '78'], id: 'row-5' },
    { cells: ['88', '85'], id: 'row-6' },
    { cells: ['94', '90'], id: 'row-7' },
    { cells: ['71', '74'], id: 'row-8' },
    { cells: ['82', '87'], id: 'row-9' },
    { cells: ['79', '80'], id: 'row-10' },
  ],
} as const;

const radarSampleData = {
  columns: [
    { id: 'column-1', kind: 'label', name: 'Metric' },
    { id: 'column-2', kind: 'number', name: 'Team A' },
    { id: 'column-3', kind: 'number', name: 'Team B' },
  ],
  rows: [
    { cells: ['Speed', '80', '70'], id: 'row-1' },
    { cells: ['Quality', '90', '85'], id: 'row-2' },
    { cells: ['Cost', '65', '78'], id: 'row-3' },
    { cells: ['Support', '88', '82'], id: 'row-4' },
    { cells: ['Reliability', '92', '89'], id: 'row-5' },
  ],
} as const;

const histogramSampleData = {
  columns: [
    { id: 'column-1', kind: 'number' as const, name: 'Score' },
  ],
  rows: [
    { cells: ['72'], id: 'row-1' },
    { cells: ['84'], id: 'row-2' },
    { cells: ['67'], id: 'row-3' },
    { cells: ['91'], id: 'row-4' },
    { cells: ['76'], id: 'row-5' },
    { cells: ['88'], id: 'row-6' },
    { cells: ['94'], id: 'row-7' },
    { cells: ['71'], id: 'row-8' },
    { cells: ['82'], id: 'row-9' },
    { cells: ['79'], id: 'row-10' },
    { cells: ['65'], id: 'row-11' },
    { cells: ['86'], id: 'row-12' },
    { cells: ['90'], id: 'row-13' },
    { cells: ['74'], id: 'row-14' },
    { cells: ['81'], id: 'row-15' },
  ],
};

export const xyToolPageConfig = {
  canonical: '/xy-graph-maker/',
  comparison: {
    first: {
      body: 'Choose an XY graph when X has a meaningful numeric scale and you want to show how Y changes from one ordered X value to the next. Connecting points can make that progression easier to follow.',
      title: 'Use an XY graph',
    },
    intro: 'Both charts use paired numeric values. The difference is whether the sequence between points carries meaning.',
    second: {
      body: 'Choose a scatter plot when each pair is an independent observation and you want to examine association, clusters, or outliers. Points are usually left unconnected.',
      title: 'Use a scatter plot',
    },
    title: 'When to use XY vs Scatter',
  },
  definition: [
    'An XY graph places numeric X values on the horizontal axis and numeric Y values on the vertical axis. Each row becomes one coordinate pair, such as (2, 5).',
    'Unlike a category chart, the spacing on both axes is proportional to the numbers. That makes XY graphs useful for measurements, experiments, coordinates, and other data where the distance between values matters.',
  ],
  editor: {
    graphType: 'xy',
    initialSettings: {
      showValueLabels: false,
      title: 'Y by X',
      xAxisTitle: 'X',
      xyConnectPoints: true,
      yAxisTitle: 'Y',
    },
    sampleData: {
      columns: xySampleData.columns.map((column) => ({ ...column })),
      rows: xySampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/xy-graph-maker/',
  },
  example: {
    caption: 'Paste this two-column structure into the editor. Each row is plotted as one X/Y pair.',
    headers: ['X', 'Y'],
    rows: xySampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. The XY graph maker is free to use, requires no signup, and does not add a watermark to exported graphs.',
      question: 'Is the XY graph maker free?',
    },
    {
      answer: 'Use two numeric columns. Put horizontal-axis values in the first column and vertical-axis values in the second column.',
      question: 'How should I arrange X and Y data?',
    },
    {
      answer: 'Yes. Turn off Connect points above the preview to display the coordinate pairs as unconnected points.',
      question: 'Can I make an XY graph without connecting the points?',
    },
    {
      answer: 'Yes. Upload a CSV or XLSX file, or paste a table copied from Excel or Google Sheets. Processing happens in your browser.',
      question: 'Can I import data from Excel or CSV?',
    },
    {
      answer: 'Use an XY graph when ordered numeric X values and the path between them matter. Use a scatter plot for independent observations, clusters, correlation, and trend analysis.',
      question: 'What is the difference between an XY graph and a scatter plot?',
    },
  ],
  features: [
    { title: 'Free to use', description: 'Create and download an XY graph without paying.' },
    { title: 'No signup', description: 'Start plotting immediately without an account or login.' },
    { title: 'No watermark', description: 'Export a clean graph ready for reports and presentations.' },
    { title: 'Local processing', description: 'Pasted and uploaded data stays in your browser in V1.' },
    { title: 'CSV and Excel import', description: 'Upload CSV or XLSX files, or paste directly from a spreadsheet.' },
    { title: 'PNG and SVG export', description: 'Download a raster image or scalable vector graphic.' },
  ],
  h1: 'XY Graph Maker',
  howTo: [
    { title: 'Add X and Y values', description: 'Type into the sample table, paste two columns, or upload a CSV or Excel file.' },
    { title: 'Choose how points display', description: 'Keep Connect points on for an ordered path, or turn it off for separate coordinate points.' },
    { title: 'Customize and export', description: 'Set titles and colors, then download the finished graph as PNG or SVG.' },
  ],
  intro: 'Plot X and Y values online for free, with no signup. Enter, paste, or upload paired numeric data and download a clean graph in seconds.',
  metaDescription: 'Create an XY graph online from paired X and Y values. Free, no signup or watermark, with CSV and Excel import plus PNG and SVG export.',
  relatedTools: [
    { name: 'Scatter Plot Maker', description: 'Plot independent observations and explore relationships between two variables.', href: '/scatter-plot-maker/' },
    { name: 'Line Graph Maker', description: 'Show changes and trends across categories or dates.', href: '/line-graph-maker/' },
    { name: 'Bar Graph Maker', description: 'Compare numeric values across named categories.', href: '/bar-graph-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is an XY graph?',
    example: 'Example XY dataset',
    faq: 'XY graph maker FAQ',
    faqIntro: 'Answers to common questions about plotting paired numeric data.',
    features: 'XY graph maker features',
    howTo: 'How to make an XY graph',
  },
  slug: '/xy-graph-maker/',
  title: 'XY Graph Maker — Plot X and Y Values Online | GraphMaker',
} satisfies ToolPageConfig;

export const scatterToolPageConfig = {
  canonical: '/scatter-plot-maker/',
  comparison: {
    first: {
      body: 'Use a scatter plot when every X/Y pair is an independent observation. Separate points make clusters, gaps, unusual observations, and possible relationships easier to see.',
      title: 'Use a scatter plot',
    },
    intro: 'Both charts use numeric axes and paired values, but they communicate different relationships between observations.',
    second: {
      body: 'Use an XY graph when the order between X values matters and connecting consecutive points helps explain a path, measurement sequence, or changing response.',
      title: 'Use an XY graph',
    },
    title: 'Scatter Plot vs XY Graph',
  },
  definition: [
    'A scatter plot displays paired numeric observations as separate points on two value axes. The horizontal position comes from the X value and the vertical position comes from the Y value.',
    'Because points are not connected, the chart emphasizes the overall pattern of the observations rather than a sequence between them. This makes it useful for spotting association, clusters, spread, and outliers.',
  ],
  editor: {
    graphType: 'scatter',
    initialSettings: {
      showLegend: false,
      showValueLabels: false,
      title: 'Exam Score by Hours Studied',
      xAxisTitle: 'Hours Studied',
      yAxisTitle: 'Exam Score',
    },
    sampleData: {
      columns: scatterSampleData.columns.map((column) => ({ ...column })),
      rows: scatterSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/scatter-plot-maker/',
  },
  example: {
    caption: 'Each row represents one observation. The first numeric column maps to X and the second maps to Y.',
    headers: ['Hours Studied', 'Exam Score'],
    rows: scatterSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. You can create and export a scatter plot for free without signing up or adding a watermark.',
      question: 'Is the scatter plot maker free?',
    },
    {
      answer: 'Use at least two numeric columns. Choose which column supplies X values and which supplies Y values in the mapping controls above the preview.',
      question: 'How do I choose the X and Y columns?',
    },
    {
      answer: 'Yes. Paste a table or upload CSV and XLSX files. The editor maps valid numeric pairs and reports rows with missing or invalid values.',
      question: 'Can I import scatter data from Excel or CSV?',
    },
    {
      answer: 'Scatter plots leave independent observations unconnected. XY graphs are useful when ordered points form a meaningful sequence or path.',
      question: 'What is the difference between a scatter plot and an XY graph?',
    },
    {
      answer: 'Not yet. This page currently focuses on plotting and exporting paired observations without regression, trendlines, R², or correlation calculations.',
      question: 'Does this tool calculate a trendline or correlation?',
    },
  ],
  features: [
    { title: 'Explicit X/Y mapping', description: 'Choose which numeric columns appear on the horizontal and vertical axes.' },
    { title: 'Header-aware tooltips', description: 'Point tooltips use the actual column names from your data.' },
    { title: 'Many observations', description: 'Plot multiple coordinate pairs with adaptive point sizing for larger datasets.' },
    { title: 'Local processing', description: 'Pasted and uploaded data stays in your browser in V1.' },
    { title: 'CSV and Excel import', description: 'Upload CSV or XLSX files, or paste directly from a spreadsheet.' },
    { title: 'PNG and SVG export', description: 'Download a clean image for reports, slides, and assignments.' },
  ],
  h1: 'Scatter Plot Maker',
  howTo: [
    { title: 'Add paired numeric data', description: 'Enter two or more numeric columns, paste a table, or upload CSV or Excel data.' },
    { title: 'Map X and Y', description: 'Choose the numeric column for each axis and confirm the detected headers above the preview.' },
    { title: 'Customize and export', description: 'Adjust titles, grid, and color, then download the scatter plot as PNG or SVG.' },
  ],
  intro: 'Create a scatter plot online from paired numeric data. Paste values or upload CSV and Excel files, with no signup required.',
  metaDescription: 'Create a scatter plot online from numeric X and Y data. Map columns, import CSV or Excel files, and export PNG or SVG with no signup.',
  relatedTools: [
    { name: 'XY Graph Maker', description: 'Plot paired numeric values and optionally connect consecutive points.', href: '/xy-graph-maker/' },
    { name: 'Line Graph Maker', description: 'Show changes and trends across categories or dates.', href: '/line-graph-maker/' },
    { name: 'Bar Graph Maker', description: 'Compare numeric values across named categories.', href: '/bar-graph-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a scatter plot?',
    example: 'Example scatter data',
    faq: 'Scatter plot maker FAQ',
    faqIntro: 'Answers to common questions about plotting paired observations.',
    features: 'Scatter plot maker features',
    howTo: 'How to make a scatter plot',
  },
  slug: '/scatter-plot-maker/',
  title: 'Scatter Plot Maker — Plot X and Y Data Online | GraphMaker',
  useCases: {
    intro: 'Scatter plots work best when each coordinate pair is a separate observation and you want to understand the overall pattern.',
    items: [
      { title: 'Compare two measurements', description: 'Explore how values such as height and weight vary together.' },
      { title: 'Inspect experiments', description: 'Plot an input against a measured response without implying a connected sequence.' },
      { title: 'Find clusters and outliers', description: 'See dense groups, gaps, and observations that sit away from the rest.' },
    ],
    title: 'When to use a scatter plot',
  },
} satisfies ToolPageConfig;

export const barToolPageConfig = {
  canonical: '/bar-graph-maker/',
  comparison: {
    first: {
      body: 'A bar graph can place categories on either axis. Horizontal bars are especially useful when category names are long or when ranked comparisons need more room.',
      title: 'Bar graph',
    },
    intro: 'The terms are often used interchangeably, but orientation is the practical distinction most people mean.',
    second: {
      body: 'A column chart is a vertical bar graph: categories run along the horizontal axis and values rise upward. The default editor view uses this familiar layout.',
      title: 'Column chart',
    },
    title: 'Bar Graph vs Column Chart',
  },
  definition: [
    'A bar graph compares numeric values across distinct categories. Each bar starts from a common baseline, so differences in length or height are easy to compare.',
    'When the table contains multiple numeric columns, this bar graph creator places the series side by side as grouped bars. That makes related measures such as sales and profit readable without stacking their values.',
  ],
  editor: {
    graphType: 'bar',
    initialSettings: {
      orientation: 'vertical',
      showLegend: true,
      showValueLabels: true,
      title: 'Monthly Sales and Profit',
      xAxisTitle: 'Category',
      yAxisTitle: 'Value',
    },
    sampleData: {
      columns: barSampleData.columns.map((column) => ({ ...column })),
      rows: barSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/bar-graph-maker/',
  },
  example: {
    caption: 'The first column supplies category labels. Every following numeric column becomes a separate grouped bar series.',
    headers: ['Category', 'Sales', 'Profit'],
    rows: barSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. This free bar graph maker works in your browser without signup and exports graphs without a watermark.',
      question: 'Is this bar graph maker free?',
    },
    {
      answer: 'Put category names in the first column and one or more numeric series in the columns that follow. The online bar graph maker detects that structure automatically.',
      question: 'How should I arrange bar graph data?',
    },
    {
      answer: 'Yes. Add multiple numeric columns and the bar graph generator displays them as grouped bars with a legend based on your column headers.',
      question: 'Can I create grouped bars with multiple series?',
    },
    {
      answer: 'Yes. Paste a table copied from a spreadsheet or upload CSV and XLSX files. Your data is processed locally in the browser.',
      question: 'Can I import data from Excel or CSV?',
    },
    {
      answer: 'Value labels are hidden automatically when a dataset has more than 15 categories, reducing overlap while tooltips keep individual values available.',
      question: 'What happens with a large dataset?',
    },
  ],
  features: [
    { title: 'Grouped comparisons', description: 'Display multiple numeric columns side by side for every category.' },
    { title: 'Automatic series legend', description: 'Use actual column headers to identify each series when the table contains more than one.' },
    { title: 'Live updates', description: 'See the graph change immediately as you edit, paste, or replace table values.' },
    { title: 'Readable large datasets', description: 'Reduce crowded axis ticks and hide value labels automatically when the table grows.' },
    { title: 'CSV and Excel import', description: 'Upload CSV or XLSX files, or paste directly from Excel and Google Sheets.' },
    { title: 'PNG and SVG export', description: 'Download a clean graph for reports, presentations, and assignments.' },
  ],
  h1: 'Bar Graph Maker',
  howTo: [
    { title: 'Add categories and values', description: 'Type into the sample table, paste spreadsheet data, or upload a CSV or Excel file.' },
    { title: 'Compare one or more series', description: 'Keep category names in the first column and add a numeric column for each measure you want to compare.' },
    { title: 'Customize and export', description: 'Edit the title, axes, colors, labels, and orientation, then download the graph as PNG or SVG.' },
  ],
  intro: 'Create a bar graph online for free with no signup. Enter, paste, or upload category data and compare multiple numeric series in a clear grouped chart.',
  metaDescription: 'Create a bar graph online for free. Paste data or import CSV and Excel files, compare multiple series, and export PNG or SVG with no signup.',
  relatedTools: [
    { name: 'Line Graph Maker', description: 'Show changes and trends across categories or dates.', href: '/line-graph-maker/' },
    { name: 'Pie Chart Maker', description: 'Show how one numeric series contributes to a whole.', href: '/pie-chart-maker/' },
    { name: 'Histogram Maker', description: 'Explore the distribution of raw numeric observations.', href: '/histogram-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a bar graph?',
    example: 'Example bar graph data',
    faq: 'Bar graph maker FAQ',
    faqIntro: 'Answers to common questions about creating grouped bar graphs from category data.',
    features: 'Bar graph maker features',
    howTo: 'How to make a bar graph',
  },
  slug: '/bar-graph-maker/',
  title: 'Bar Graph Maker — Create Grouped Bar Charts Online | GraphMaker',
  useCases: {
    intro: 'Bar graphs work best when you need to compare amounts across separate names, groups, or time periods.',
    items: [
      { title: 'Compare categories', description: 'Show differences between products, regions, teams, survey answers, or other named groups.' },
      { title: 'Compare several measures', description: 'Place related series such as sales and profit next to each other for each category.' },
      { title: 'Present discrete periods', description: 'Compare totals for months, quarters, or years when the emphasis is on separate values rather than a continuous trend.' },
    ],
    title: 'When to use a bar graph',
  },
} satisfies ToolPageConfig;

export const lineToolPageConfig = {
  additionalSections: [
    {
      id: 'multiple-line-graphs',
      intro: 'A multiple line graph uses the same horizontal scale for two or more numeric series, making differences in direction, timing, and magnitude easier to compare.',
      items: [
        { title: 'One column per line', description: 'Keep dates or categories in the first column, then add one numeric column for every line you want to plot.' },
        { title: 'Headers become legend labels', description: 'Names such as Visitors and Orders appear in the legend and tooltips, so each line stays identifiable.' },
        { title: 'Control visible series', description: 'Use the shared customization controls or legend to focus on the lines that matter without changing your source table.' },
      ],
      title: 'Multiple line graphs',
    },
  ],
  canonical: '/line-graph-maker/',
  comparison: {
    first: {
      body: 'Use a line graph when order and continuity matter. Connecting values makes direction, turning points, and the rate of change easier to follow across dates or ordered categories.',
      title: 'Use a line graph',
    },
    intro: 'Both charts compare values, but they emphasize different relationships in the data.',
    second: {
      body: 'Use a bar graph when the main job is comparing separate categories. Bar length supports direct magnitude comparisons without implying continuity between adjacent groups.',
      title: 'Use a bar graph',
    },
    title: 'Line Graph vs Bar Graph',
  },
  definition: [
    'A line graph connects numeric observations across an ordered horizontal scale. It is especially useful for showing how one or more measurements change over time.',
    'This line graph creator detects valid dates and spaces them on a true time axis. For named categories, it keeps evenly spaced category positions instead. Each numeric column becomes its own line.',
  ],
  editor: {
    graphType: 'line',
    initialSettings: {
      showLegend: true,
      showValueLabels: true,
      title: 'Visitors and Orders Over Time',
      xAxisTitle: 'Date',
      yAxisTitle: 'Count',
    },
    sampleData: {
      columns: lineSampleData.columns.map((column) => ({ ...column })),
      rows: lineSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/line-graph-maker/',
  },
  example: {
    caption: 'The first column contains dates. Visitors and Orders are plotted as two lines on the same true time axis.',
    headers: ['Date', 'Visitors', 'Orders'],
    rows: lineSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. This free line graph maker works without signup and exports clean graphs without a watermark.',
      question: 'Is this line graph maker free?',
    },
    {
      answer: 'Use dates or ordered category labels in the first column and numeric values in the columns that follow. The online line graph maker chooses a time or category axis automatically.',
      question: 'How should I arrange line graph data?',
    },
    {
      answer: 'Yes. Add a numeric column for each line. This multiple line graph maker uses column headers for legend labels and tooltips.',
      question: 'Can I create a graph with multiple lines?',
    },
    {
      answer: 'Valid date and date-time values use a proportional time axis, so a ten-day gap is displayed wider than a one-day gap. The first and last dates remain explicit axis bounds.',
      question: 'Does the graph use real spacing between dates?',
    },
    {
      answer: 'Yes. Paste spreadsheet data or upload CSV and XLSX files. The line graph generator processes the data locally in your browser.',
      question: 'Can I import data from Excel or CSV?',
    },
  ],
  features: [
    { title: 'True time axis', description: 'Detect valid dates and preserve proportional spacing between irregular observations.' },
    { title: 'Category support', description: 'Use evenly spaced labels when the first column contains named or ordered categories.' },
    { title: 'Multiple series', description: 'Turn every numeric column into a separate line with clear header-based legend labels.' },
    { title: 'Readable large datasets', description: 'Reduce tick density and hide point and value labels automatically as datasets grow.' },
    { title: 'CSV and Excel import', description: 'Upload CSV or XLSX files, or paste directly from Excel and Google Sheets.' },
    { title: 'PNG and SVG export', description: 'Download a polished graph for reports, presentations, and assignments.' },
  ],
  h1: 'Line Graph Maker',
  howTo: [
    { title: 'Add dates or categories', description: 'Enter values manually, paste a spreadsheet table, or upload CSV or Excel data.' },
    { title: 'Add one or more series', description: 'Place each measurement in its own numeric column and use clear headers for legend labels.' },
    { title: 'Customize and export', description: 'Adjust titles, grid, colors, and labels, then download the result as PNG or SVG.' },
  ],
  intro: 'Create a line graph online for free with no signup. Plot dates or categories, compare multiple numeric series, and see changes update live.',
  metaDescription: 'Create a line graph online for free. Plot dates on a true time axis, compare multiple series, import CSV or Excel, and export PNG or SVG.',
  relatedTools: [
    { name: 'Bar Graph Maker', description: 'Compare numeric values across separate named categories.', href: '/bar-graph-maker/' },
    { name: 'XY Graph Maker', description: 'Plot paired numeric values and optionally connect consecutive points.', href: '/xy-graph-maker/' },
    { name: 'Scatter Plot Maker', description: 'Plot independent numeric observations without connecting lines.', href: '/scatter-plot-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a line graph?',
    example: 'Example line graph data',
    faq: 'Line graph maker FAQ',
    faqIntro: 'Answers to common questions about time axes, categories, and multiple line series.',
    features: 'Line graph maker features',
    howTo: 'How to make a line graph',
  },
  slug: '/line-graph-maker/',
  title: 'Line Graph Maker — Create Multiple Line Charts Online | GraphMaker',
  useCases: {
    intro: 'Line graphs work best for ordered observations where the path between values helps explain change.',
    items: [
      { title: 'Track change over time', description: 'Show daily, monthly, quarterly, or yearly measurements on a proportional date scale.' },
      { title: 'Compare trends', description: 'See whether several metrics rise, fall, converge, or diverge across the same period.' },
      { title: 'Follow an ordered sequence', description: 'Connect measurements across stages or other ordered categories when continuity matters.' },
    ],
    title: 'When to use a line graph',
  },
} satisfies ToolPageConfig;

export const pieToolPageConfig = {
  canonical: '/pie-chart-maker/',
  comparison: {
    first: {
      body: 'Use a pie chart when one numeric series forms a meaningful whole and a small number of slices makes the largest and smallest shares easy to recognize.',
      title: 'Use a pie chart',
    },
    intro: 'Both charts compare categories, but a pie chart emphasizes share of a whole while a bar graph supports more precise comparisons.',
    second: {
      body: 'Use a bar graph for many categories, close values, negative numbers, or comparisons that do not add up to a meaningful total.',
      title: 'Use a bar graph',
    },
    title: 'Pie Chart vs Bar Graph',
  },
  definition: [
    'A pie chart divides one total into proportional slices. Each category supplies a label, and its numeric value determines its share of the complete circle.',
    'This pie graph maker calculates percentages automatically from the selected value column. It works best with a small number of nonnegative categories whose values represent parts of one whole.',
  ],
  editor: {
    graphType: 'pie',
    initialSettings: {
      showLegend: true,
      showValueLabels: true,
      title: 'Product Share',
      xAxisTitle: 'Category',
      yAxisTitle: 'Value',
    },
    sampleData: {
      columns: pieSampleData.columns.map((column) => ({ ...column })),
      rows: pieSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/pie-chart-maker/',
  },
  example: {
    caption: 'The category column supplies slice labels, while the Value column produces shares of 40%, 30%, 20%, and 10%.',
    headers: ['Category', 'Value'],
    rows: pieSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. This free pie chart maker works without signup and exports clean charts without a watermark.',
      question: 'Is this pie chart maker free?',
    },
    {
      answer: 'Place slice names in the first category column and nonnegative numbers in one value column. The online pie chart maker calculates each percentage from the total.',
      question: 'How should I arrange pie chart data?',
    },
    {
      answer: 'Percentages are calculated automatically by dividing each slice value by the sum of all selected values. Tooltips retain the original value and its share.',
      question: 'How are pie chart percentages calculated?',
    },
    {
      answer: 'Open Customize and deliberately choose one numeric column under Pie value series. A pie chart represents one total at a time.',
      question: 'What if my table has multiple numeric columns?',
    },
    {
      answer: 'Negative values and all-zero totals cannot form valid slices, so the pie chart generator explains which values need correction. Numeric X/Y-only data is redirected to Scatter instead.',
      question: 'What data is incompatible with a pie chart?',
    },
  ],
  features: [
    { title: 'Automatic percentages', description: 'Calculate every slice as a share of the selected series total.' },
    { title: 'Deliberate series selection', description: 'Choose which numeric column supplies values when the table contains multiple series.' },
    { title: 'Readable legends', description: 'Use category names in a scrollable legend that remains usable with longer labels.' },
    { title: 'Compatibility guidance', description: 'Explain invalid values and suggest Scatter or Bar when another chart better fits the data.' },
    { title: 'CSV and Excel import', description: 'Upload CSV or XLSX files, or paste directly from Excel and Google Sheets.' },
    { title: 'PNG and SVG export', description: 'Download a polished chart for reports, presentations, and assignments.' },
  ],
  h1: 'Pie Chart Maker',
  howTo: [
    { title: 'Add categories and values', description: 'Enter data manually, paste a two-column table, or upload a CSV or Excel file.' },
    { title: 'Confirm the value series', description: 'For tables with several numeric columns, open Customize and select the series that represents the whole.' },
    { title: 'Customize and export', description: 'Adjust the title, legend, colors, and labels, then download the chart as PNG or SVG.' },
  ],
  intro: 'Create a pie chart online for free with no signup. Paste or upload category values, calculate shares automatically, and see the chart update live.',
  metaDescription: 'Create a pie chart online for free. Calculate percentages automatically, import CSV or Excel data, and export PNG or SVG with no signup.',
  relatedTools: [
    { name: 'Bar Graph Maker', description: 'Compare many categories or close values more precisely.', href: '/bar-graph-maker/' },
    { name: 'Line Graph Maker', description: 'Show changes and trends across dates or ordered categories.', href: '/line-graph-maker/' },
    { name: 'Radar Chart Maker', description: 'Compare several metrics across one or more profiles.', href: '/radar-chart-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a pie chart?',
    example: 'Example pie chart data',
    faq: 'Pie chart maker FAQ',
    faqIntro: 'Answers to common questions about percentages, value series, and compatible pie chart data.',
    features: 'Pie chart maker features',
    howTo: 'How to make a pie chart',
  },
  slug: '/pie-chart-maker/',
  title: 'Pie Chart Maker — Create Percentage Charts Online | GraphMaker',
  useCases: {
    intro: 'Pie charts are most effective when a small set of categories represents every part of one meaningful total.',
    items: [
      { title: 'Show composition', description: 'Explain how products, channels, expenses, or responses contribute to a complete total.' },
      { title: 'Highlight dominant shares', description: 'Make a clearly largest or smallest category immediately recognizable.' },
      { title: 'Present simple percentages', description: 'Communicate a short breakdown when approximate proportions matter more than fine differences.' },
    ],
    title: 'When to use a pie chart',
  },
} satisfies ToolPageConfig;

export const boxPlotToolPageConfig = {
  additionalSections: [
    {
      id: 'quartiles-and-outliers',
      intro: 'The editor calculates quartiles from each numeric group and uses the standard 1.5×IQR rule to separate whiskers from potential outliers.',
      items: [
        { title: 'Quartiles', description: 'Q1 marks the 25th percentile, the median marks the center, and Q3 marks the 75th percentile of the sorted observations.' },
        { title: 'Whiskers', description: 'Whiskers extend to the smallest and largest observations that remain within 1.5 times the interquartile range.' },
        { title: 'Outliers', description: 'Values beyond the whisker fences appear as individual points so unusual observations remain visible instead of being discarded.' },
      ],
      title: 'Quartiles and outliers',
    },
  ],
  beforeComparisonSections: [
    {
      id: 'read-box-plot',
      intro: 'Read the center first, then compare spread, whiskers, and isolated points across groups.',
      items: [
        { title: 'Find the median', description: 'The line inside each box marks the median, so it gives a quick view of the typical value in that group.' },
        { title: 'Compare the box', description: 'The box spans Q1 to Q3. A taller or wider box means the middle half of the data is more spread out.' },
        { title: 'Check whiskers and points', description: 'Whiskers show the non-outlier range, while separate points call attention to unusually low or high values.' },
      ],
      title: 'How to read a box plot',
    },
  ],
  canonical: '/box-plot-maker/',
  comparison: {
    first: {
      body: 'Use a box plot to compare medians, quartiles, spread, and outliers across one or more groups. It summarizes a distribution without showing every repeated value.',
      title: 'Use a box plot',
    },
    intro: 'Both charts describe distributions, but they answer different questions about shape and summary statistics.',
    second: {
      body: 'Use a histogram when you want to see the detailed shape of one numeric distribution, including peaks, gaps, skew, and how observations fall into bins.',
      title: 'Use a histogram',
    },
    title: 'Box Plot vs Histogram',
  },
  definition: [
    'A box plot summarizes numeric observations with a median, first quartile (Q1), third quartile (Q3), whiskers, and individual outlier points. It is also called a box-and-whisker plot.',
    'This box plot graph maker treats each numeric column as a separate group and uses the actual column header as its label. The shared editor makes it easy to compare classes, experiments, teams, or other distributions side by side.',
    'Use the online box plot maker directly in your browser: paste raw observations or import CSV and Excel files, then customize and export the result without creating an account.',
  ],
  editor: {
    graphType: 'boxplot',
    initialSettings: {
      orientation: 'vertical',
      showGrid: true,
      showOutliers: true,
      title: 'Class Score Distribution',
      xAxisTitle: 'Class',
      yAxisTitle: 'Score',
    },
    sampleData: {
      columns: boxPlotSampleData.columns.map((column) => ({ ...column })),
      rows: boxPlotSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/box-plot-maker/',
  },
  example: {
    caption: 'Each numeric column is one group. Keep the group name in the header and place one raw observation in each cell below it.',
    headers: ['Class A', 'Class B'],
    rows: boxPlotSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. The free box plot maker works without signup and exports clean PNG or SVG files without a watermark.',
      question: 'Is this box plot maker free?',
    },
    {
      answer: 'Place each group in its own numeric column. The header becomes the group label, and every cell below it is treated as a raw observation.',
      question: 'How should I arrange data for multiple box plots?',
    },
    {
      answer: 'The box-and-whisker plot maker calculates Q1, the median, Q3, and the interquartile range. Whiskers stop at the most extreme values within 1.5×IQR, and values beyond those fences are plotted separately.',
      question: 'How are quartiles, whiskers, and outliers calculated?',
    },
    {
      answer: 'Blank cells are skipped. Invalid non-numeric values are ignored and reported beside the graph so you can correct the source data if needed.',
      question: 'What happens to blanks or invalid values?',
    },
    {
      answer: 'The graph can still render, but the editor warns when a group has fewer than five valid observations because its quartiles may be unreliable.',
      question: 'How many values does a box plot need?',
    },
    {
      answer: 'Yes. Paste data copied from a spreadsheet or upload CSV and XLSX files. Processing stays in your browser.',
      question: 'Can I import data from Excel or CSV?',
    },
  ],
  features: [
    { title: 'Multiple numeric groups', description: 'Turn each numeric column into a separate labeled box for side-by-side comparison.' },
    { title: 'Five-number summaries', description: 'Calculate minimum, Q1, median, Q3, and maximum from raw observations.' },
    { title: 'Outlier detection', description: 'Plot values beyond the 1.5×IQR fences as individual points.' },
    { title: 'Safe data cleanup', description: 'Ignore blank or invalid cells safely and show an actionable warning.' },
    { title: 'Spreadsheet imports', description: 'Paste tables or upload CSV and Excel files into the existing data grid.' },
    { title: 'Local save and export', description: 'Save on this device and download the finished graph as PNG, SVG, or CSV.' },
  ],
  h1: 'Box Plot Maker',
  howTo: [
    { title: 'Add raw numeric data', description: 'Enter one group per column, paste a spreadsheet table, or upload a CSV or Excel file.' },
    { title: 'Review the distribution', description: 'Compare each group’s median, Q1, Q3, whiskers, and any outlier points in the live preview.' },
    { title: 'Customize and export', description: 'Adjust labels, orientation, colors, and outlier visibility, then download the finished chart.' },
  ],
  intro: 'Create a box and whisker plot from raw numeric data with this online box plot maker. Compare one or multiple groups, spot outliers, and export a clean graph for free.',
  metaDescription: 'Create box and whisker plots online from raw numeric data. Compare multiple groups, calculate quartiles and outliers, and export free with no signup.',
  relatedHeading: 'Related tools',
  relatedTools: [
    { name: 'Histogram Maker', description: 'Explore the detailed shape and frequency of one numeric distribution.', href: '/histogram-maker/' },
    { name: 'Scatter Plot Maker', description: 'Plot paired numeric observations and inspect relationships or unusual points.', href: '/scatter-plot-maker/' },
    { name: 'Bar Graph Maker', description: 'Compare aggregate values across named categories.', href: '/bar-graph-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a box plot?',
    example: 'Example box plot data',
    faq: 'Box plot maker FAQ',
    faqIntro: 'Answers about arranging raw data, calculating quartiles, and handling outliers.',
    features: 'Box plot maker features',
    howTo: 'How to make a box plot',
  },
  slug: '/box-plot-maker/',
  title: 'Box Plot Maker — Create Box and Whisker Plots Online | GraphMaker',
} satisfies ToolPageConfig;

export const radarToolPageConfig = {
  additionalSections: [
    {
      id: 'radar-scales',
      intro: 'Every axis in a radar chart shares one scale so the shape remains comparable across metrics and series.',
      items: [
        { title: 'Percentage-like values', description: 'When every value falls between 0 and 100, the chart uses a consistent 0–100 scale.' },
        { title: 'Other numeric ranges', description: 'For larger values, the radar chart generator chooses a rounded maximum above the highest observation.' },
        { title: 'Comparable units matter', description: 'Use metrics with compatible meanings or normalize them first; otherwise the polygon shape can give a misleading comparison.' },
      ],
      title: 'How radar scales work',
    },
  ],
  canonical: '/radar-chart-maker/',
  comparison: {
    first: {
      body: 'Use a radar chart to compare the overall profile of one or more series across the same set of metrics. The polygon shape makes relative strengths and weaknesses easy to scan.',
      title: 'Use a radar chart',
    },
    intro: 'Radar and bar charts can compare the same measurements, but they emphasize different aspects of the data.',
    second: {
      body: 'Use a bar chart when precise value comparison and straightforward ranking matter most, especially when there are many categories or readers need to judge small differences.',
      title: 'Use a bar chart',
    },
    title: 'Radar Chart vs Bar Chart',
  },
  definition: [
    'A radar chart places each metric on an axis radiating from a shared center. Values are connected into a polygon, making the overall profile of each series visible at a glance. Radar charts are also called spider charts or web charts.',
    'This radar graph maker uses the first text column for axis labels and turns every numeric column into a separate series. Real column headers appear in the legend, so teams, products, candidates, or scenarios remain clearly identified.',
    'Use the online radar chart maker to paste data or import CSV and Excel files, then customize and export the chart directly in your browser.',
  ],
  editor: {
    graphType: 'radar',
    initialSettings: {
      radarFilled: true,
      showGrid: true,
      showLegend: true,
      showValueLabels: false,
      title: 'Team Comparison by Metric',
      yAxisTitle: '',
    },
    sampleData: {
      columns: radarSampleData.columns.map((column) => ({ ...column })),
      rows: radarSampleData.rows.map((row) => ({ ...row, cells: [...row.cells] })),
    },
    slug: '/radar-chart-maker/',
  },
  example: {
    caption: 'Put metric names in the first column and one comparable numeric series in each following column.',
    headers: ['Metric', 'Team A', 'Team B'],
    rows: radarSampleData.rows.map((row) => [...row.cells]),
  },
  faqs: [
    {
      answer: 'Yes. The free radar chart maker requires no signup and exports clean PNG or SVG files without a watermark.',
      question: 'Is this radar chart maker free?',
    },
    {
      answer: 'Use a text column first for metric names. Add one or more numeric columns after it; each numeric header becomes a legend label and radar series.',
      question: 'How should I arrange radar chart data?',
    },
    {
      answer: 'Yes. The spider chart maker supports multiple numeric series, which are drawn on the same metric axes for profile comparison.',
      question: 'Can I compare multiple series?',
    },
    {
      answer: 'Values between 0 and 100 use a shared 0–100 scale. Other ranges use a sensible rounded maximum based on the largest value in the dataset.',
      question: 'How does the chart choose its scale?',
    },
    {
      answer: 'The editor shows an actionable message identifying the missing or invalid cell instead of drawing a misleading chart.',
      question: 'What happens when a value is missing or invalid?',
    },
    {
      answer: 'The chart still renders, but the editor warns when there are more than 12 metrics because labels and polygons can become difficult to read.',
      question: 'How many metrics should a radar chart contain?',
    },
    {
      answer: 'Yes. Paste a spreadsheet table or upload CSV and XLSX files. Your data remains in the browser.',
      question: 'Can I import radar data from Excel or CSV?',
    },
  ],
  features: [
    { title: 'Multiple series', description: 'Compare several teams, products, or options across one shared set of metrics.' },
    { title: 'Real legend labels', description: 'Use the original numeric column headers as series names in the chart legend.' },
    { title: 'Automatic scaling', description: 'Use 0–100 for percentage-like values and rounded maxima for other numeric ranges.' },
    { title: 'Readable metric guidance', description: 'Warn when too many axes may make the radar chart hard to interpret.' },
    { title: 'Spreadsheet imports', description: 'Paste tables or upload CSV and Excel files through the shared data grid.' },
    { title: 'Local save and export', description: 'Save on this device and download the finished chart as PNG, SVG, or CSV.' },
  ],
  h1: 'Radar Chart Maker',
  howTo: [
    { title: 'Add metrics and series', description: 'Enter metric names in the first column, then add one or more numeric series with clear headers.' },
    { title: 'Review the shared scale', description: 'Check that the metrics use comparable units and confirm the automatically selected range.' },
    { title: 'Customize and export', description: 'Adjust the fill, grid, legend, labels, and colors, then download the finished radar chart.' },
  ],
  intro: 'Compare strengths and patterns across multiple metrics with this online radar chart maker. Paste or upload data and create a polished spider chart for free.',
  metaDescription: 'Create radar and spider charts online from one or multiple data series. Import CSV or Excel data, use automatic scales, and export free with no signup.',
  relatedHeading: 'Related tools',
  relatedTools: [
    { name: 'Bar Graph Maker', description: 'Compare metric values precisely with familiar rectangular bars.', href: '/bar-graph-maker/' },
    { name: 'Pie Chart Maker', description: 'Show how categories contribute to one whole.', href: '/pie-chart-maker/' },
    { name: 'Line Graph Maker', description: 'Track one or more numeric series across ordered categories or time.', href: '/line-graph-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a radar chart?',
    example: 'Example radar chart data',
    faq: 'Radar chart maker FAQ',
    faqIntro: 'Answers about arranging metrics, comparing series, and choosing a readable scale.',
    features: 'Radar chart maker features',
    howTo: 'How to make a radar chart',
  },
  slug: '/radar-chart-maker/',
  title: 'Radar Chart Maker — Create Spider Charts Online | GraphMaker',
  useCases: {
    intro: 'Radar charts work best when a small set of comparable metrics describes an overall profile.',
    items: [
      { title: 'Team or candidate profiles', description: 'Compare strengths across skills, competencies, or performance measures.' },
      { title: 'Product comparisons', description: 'Contrast products or plans across shared attributes such as quality, cost, and support.' },
      { title: 'Before-and-after reviews', description: 'Show how a profile changes across the same assessment criteria.' },
    ],
    title: 'When to use a radar chart',
  },
} satisfies ToolPageConfig;

export const histogramToolPageConfig = {
  additionalSections: [
    {
      id: 'histogram-bins',
      intro: 'A histogram groups nearby observations into intervals so the overall distribution is easier to see.',
      items: [
        { title: 'Automatic bin count', description: 'The editor chooses a practical number of bins from the number of valid observations.' },
        { title: 'Manual adjustment', description: 'Open Customize when you need to compare the same data with fewer or more intervals.' },
        { title: 'Frequency counts', description: 'Each bar reports how many observations fall inside its displayed numeric range.' },
      ],
      title: 'How histogram bins work',
    },
  ],
  canonical: '/histogram-maker/',
  comparison: {
    first: {
      body: 'Use a histogram when the shape of one numeric distribution matters. Touching bars reveal concentrations, gaps, skew, and the frequency of value ranges.',
      title: 'Use a histogram',
    },
    intro: 'Both charts summarize raw numeric observations, but they answer different questions about a distribution.',
    second: {
      body: 'Use a box plot when you need a compact summary of median, quartiles, spread, and outliers, especially when comparing several groups.',
      title: 'Use a box plot',
    },
    title: 'Histogram vs Box Plot',
  },
  definition: [
    'A histogram displays the frequency distribution of numeric observations. Values are grouped into continuous intervals called bins, and the height of each touching bar shows how many observations fall in that range.',
    'Unlike a bar graph, a histogram uses numeric ranges rather than separate named categories. The order and width of the intervals carry meaning, so the bars touch instead of appearing as independent columns.',
    'This online histogram maker accepts pasted data plus CSV and Excel files, safely excludes invalid observations, and lets you review or adjust the automatic bin count before exporting.',
  ],
  editor: {
    graphType: 'histogram',
    initialSettings: {
      histogramBinCount: null,
      showGrid: true,
      showLegend: false,
      showValueLabels: true,
      title: 'Distribution of Scores',
      xAxisTitle: 'Score',
      yAxisTitle: 'Frequency',
    },
    sampleData: histogramSampleData,
    slug: '/histogram-maker/',
  },
  example: {
    caption: 'Place raw numeric observations in a column. Each row represents one measured value.',
    headers: ['Score'],
    rows: [['72'], ['84'], ['67'], ['91'], ['76'], ['88'], ['94'], ['71']],
  },
  faqs: [
    { question: 'Is this histogram maker free?', answer: 'Yes. You can create and export a histogram without signing up or adding a watermark.' },
    { question: 'What data should I enter?', answer: 'Enter raw numeric observations in a column. Do not enter pre-counted categories unless you want a bar graph instead.' },
    { question: 'How are histogram bins selected?', answer: 'The automatic setting uses the number of valid observations to choose a readable bin count. You can select a different count inside Customize.' },
    { question: 'What happens to blank or invalid cells?', answer: 'Blank cells are ignored. Invalid non-numeric values are excluded and reported beside the chart so the source data can be corrected.' },
    { question: 'Can I import values from Excel or CSV?', answer: 'Yes. Paste a spreadsheet column or upload CSV and XLSX files. Processing remains in your browser.' },
  ],
  features: [
    { title: 'Automatic bins', description: 'Generate a practical interval count based on the size of the dataset.' },
    { title: 'Adjustable intervals', description: 'Choose a manual bin count from Customize when a different level of detail is useful.' },
    { title: 'Safe data cleanup', description: 'Ignore blanks and clearly report non-numeric observations that were excluded.' },
    { title: 'Frequency tooltips', description: 'Inspect the numeric range and observation count represented by each bar.' },
    { title: 'Spreadsheet imports', description: 'Paste raw values or import them from CSV and Excel files through the shared editor.' },
    { title: 'Local save and export', description: 'Save the project on this device and export the finished histogram as PNG, SVG, or CSV.' },
  ],
  h1: 'Histogram Maker',
  howTo: [
    { title: 'Add raw observations', description: 'Enter one numeric value per row, or paste and import a spreadsheet column.' },
    { title: 'Review the bins', description: 'Use the automatic intervals or open Customize to select a different bin count.' },
    { title: 'Customize and export', description: 'Adjust labels, color, and grid visibility, then download the completed histogram.' },
  ],
  intro: 'Create a histogram from raw numeric data and inspect the shape of its distribution. Paste values or import CSV and Excel files, then export the result for free.',
  metaDescription: 'Create a histogram online from raw numeric data. Use automatic or adjustable bins, import CSV or Excel values, and export free with no signup.',
  relatedTools: [
    { name: 'Box Plot Maker', description: 'Summarize median, quartiles, spread, and outliers from raw numeric data.', href: '/box-plot-maker/' },
    { name: 'Bar Graph Maker', description: 'Compare values across separate named categories instead of continuous ranges.', href: '/bar-graph-maker/' },
    { name: 'Scatter Plot Maker', description: 'Explore the relationship between two numeric measurements.', href: '/scatter-plot-maker/' },
  ],
  sectionHeadings: {
    definition: 'What is a histogram?',
    example: 'Example histogram data',
    faq: 'Histogram maker FAQ',
    faqIntro: 'Answers about raw observations, intervals, imports, and excluded values.',
    features: 'Histogram maker features',
    howTo: 'How to make a histogram',
  },
  slug: '/histogram-maker/',
  title: 'Histogram Maker — Create Frequency Distributions Online | GraphMaker',
  useCases: {
    intro: 'Histograms are useful when you want to understand how numeric observations are distributed across a continuous range.',
    items: [
      { title: 'Inspect score distributions', description: 'See where test results or ratings are concentrated and whether the values are balanced or skewed.' },
      { title: 'Review measurements', description: 'Study variation in laboratory results, dimensions, durations, or other repeated measurements.' },
      { title: 'Spot gaps and unusual ranges', description: 'Find empty intervals, multiple peaks, or thin tails that deserve closer investigation.' },
    ],
    title: 'When to use a histogram',
  },
} satisfies ToolPageConfig;
