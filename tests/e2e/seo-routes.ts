export const coreToolRoutes = [
  '/bar-graph-maker/',
  '/line-graph-maker/',
  '/pie-chart-maker/',
  '/xy-graph-maker/',
  '/equation-graph-maker/',
  '/scatter-plot-maker/',
  '/histogram-maker/',
  '/box-plot-maker/',
  '/radar-chart-maker/',
] as const;

export const specialistToolRoutes = ['/stacked-bar-graph-maker/', '/horizontal-bar-graph-maker/', '/grouped-bar-chart-maker/', '/tree-graph-maker/', '/dot-plot-maker/', '/supply-and-demand-graph-maker/'] as const;
export const toolRoutes = [...coreToolRoutes, ...specialistToolRoutes] as const;
export const indexableRoutes = ['/', '/tools/', '/about/', ...toolRoutes] as const;
export const allLinkedRoutes = [...indexableRoutes, '/privacy/', '/terms/'] as const;
export const productionOrigin = 'https://graphmaker.site';

