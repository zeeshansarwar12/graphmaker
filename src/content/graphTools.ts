export const graphTools = [
  { name: 'Bar Graph Maker', description: 'Compare values clearly across categories.', href: '/bar-graph-maker/', type: 'bar' },
  { name: 'Line Graph Maker', description: 'Show trends and changes over time.', href: '/line-graph-maker/', type: 'line' },
  { name: 'Pie Chart Maker', description: 'Show how values make up a whole.', href: '/pie-chart-maker/', type: 'pie' },
  { name: 'XY Graph Maker', description: 'Plot paired X and Y values precisely.', href: '/xy-graph-maker/', type: 'xy' },
  { name: 'Scatter Plot Maker', description: 'Explore relationships and trends.', href: '/scatter-plot-maker/', type: 'scatter' },
  { name: 'Histogram Maker', description: 'See the shape of a numeric distribution.', href: '/histogram-maker/', type: 'histogram' },
  { name: 'Box Plot Maker', description: 'Summarize spread, quartiles, and outliers.', href: '/box-plot-maker/', type: 'box' },
  { name: 'Radar Chart Maker', description: 'Compare several metrics across profiles.', href: '/radar-chart-maker/', type: 'radar' },
] as const;

export const specialistGraphTools = [
  { name: 'Dot Plot Maker', description: 'Stack repeated observations on a true numeric scale.', href: '/dot-plot-maker/', type: 'dotplot' },
  { name: 'Supply and Demand Graph Maker', description: 'Plot economics curves and estimate equilibrium.', href: '/supply-and-demand-graph-maker/', type: 'supplydemand' },
] as const;

export const allGraphTools = [...graphTools, ...specialistGraphTools] as const;

export const indexableRoutes = [
  '/',
  '/tools/',
  '/about/',
  ...allGraphTools.map((tool) => tool.href),
] as const;
