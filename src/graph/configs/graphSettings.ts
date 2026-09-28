export type GraphOrientation = 'horizontal' | 'vertical';

export interface GraphSettings {
  dotPlotSeriesColumnId: string | null;
  dotSize: number;
  hiddenSeriesIds: string[];
  histogramBinCount: number | null;
  histogramSeriesColumnId: string | null;
  orientation: GraphOrientation;
  pieSeriesColumnId: string | null;
  radarFilled: boolean;
  scatterXColumnId: string | null;
  scatterYColumnId: string | null;
  seriesColors: string[];
  showEquilibrium: boolean;
  showGrid: boolean;
  showLegend: boolean;
  showOutliers: boolean;
  showValueLabels: boolean;
  title: string;
  supplyDemandDemandColumnId: string | null;
  supplyDemandSupplyColumnId: string | null;
  supplyDemandXColumnId: string | null;
  xAxisTitle: string;
  xyConnectPoints: boolean;
  yAxisTitle: string;
}

export type GraphSettingsAction =
  | { type: 'replace-settings'; value: GraphSettings }
  | { type: 'set-dot-plot-series'; value: string }
  | { type: 'set-dot-size'; value: number }
  | { type: 'set-histogram-bin-count'; value: number | null }
  | { type: 'set-histogram-series'; value: string }
  | { type: 'set-grid'; value: boolean }
  | { type: 'set-legend'; value: boolean }
  | { type: 'set-orientation'; value: GraphOrientation }
  | { type: 'set-outliers'; value: boolean }
  | { type: 'set-pie-series'; value: string }
  | { type: 'set-radar-filled'; value: boolean }
  | { type: 'set-scatter-x-column'; value: string }
  | { type: 'set-scatter-y-column'; value: string }
  | { type: 'set-show-equilibrium'; value: boolean }
  | { type: 'set-supply-demand-demand-column'; value: string }
  | { type: 'set-supply-demand-supply-column'; value: string }
  | { type: 'set-supply-demand-x-column'; value: string }
  | { index: number; type: 'set-series-color'; value: string }
  | { type: 'set-title'; value: string }
  | { columnId: string; seriesColumnIds: string[]; type: 'toggle-series-visibility' }
  | { type: 'set-value-labels'; value: boolean }
  | { type: 'set-x-axis-title'; value: string }
  | { type: 'set-xy-connect-points'; value: boolean }
  | { type: 'set-y-axis-title'; value: string };

export const defaultSeriesColors = ['#2563eb', '#0d9488', '#7c3aed', '#e11d48', '#d97706', '#0891b2'];

export function getVisibleSeriesIndexes(
  settings: Pick<GraphSettings, 'hiddenSeriesIds'>,
  seriesColumnIds: readonly string[],
): number[] {
  const visible = seriesColumnIds.flatMap((columnId, index) => (
    settings.hiddenSeriesIds.includes(columnId) ? [] : [index]
  ));
  return visible.length > 0 ? visible : seriesColumnIds.length > 0 ? [0] : [];
}

export function createDefaultGraphSettings(): GraphSettings {
  return {
    dotPlotSeriesColumnId: null,
    dotSize: 10,
    hiddenSeriesIds: [],
    histogramBinCount: null,
    histogramSeriesColumnId: null,
    orientation: 'vertical',
    pieSeriesColumnId: null,
    radarFilled: true,
    scatterXColumnId: null,
    scatterYColumnId: null,
    seriesColors: [...defaultSeriesColors],
    showEquilibrium: true,
    showGrid: true,
    showLegend: true,
    showOutliers: true,
    showValueLabels: true,
    title: 'Monthly Sales',
    supplyDemandDemandColumnId: null,
    supplyDemandSupplyColumnId: null,
    supplyDemandXColumnId: null,
    xAxisTitle: 'Month',
    xyConnectPoints: true,
    yAxisTitle: 'Sales',
  };
}

export function graphSettingsReducer(
  settings: GraphSettings,
  action: GraphSettingsAction,
): GraphSettings {
  switch (action.type) {
    case 'replace-settings':
      return action.value;
    case 'set-dot-plot-series':
      return { ...settings, dotPlotSeriesColumnId: action.value };
    case 'set-dot-size':
      return { ...settings, dotSize: Math.min(24, Math.max(4, action.value)) };
    case 'set-histogram-bin-count':
      return { ...settings, histogramBinCount: action.value };
    case 'set-histogram-series':
      return { ...settings, histogramSeriesColumnId: action.value };
    case 'set-grid':
      return { ...settings, showGrid: action.value };
    case 'set-legend':
      return { ...settings, showLegend: action.value };
    case 'set-orientation':
      if (action.value === settings.orientation) return settings;
      return {
        ...settings,
        orientation: action.value,
        xAxisTitle: settings.yAxisTitle,
        yAxisTitle: settings.xAxisTitle,
      };
    case 'set-outliers':
      return { ...settings, showOutliers: action.value };
    case 'set-pie-series':
      return { ...settings, pieSeriesColumnId: action.value };
    case 'set-radar-filled':
      return { ...settings, radarFilled: action.value };
    case 'set-scatter-x-column':
      return { ...settings, scatterXColumnId: action.value };
    case 'set-scatter-y-column':
      return { ...settings, scatterYColumnId: action.value };
    case 'set-show-equilibrium':
      return { ...settings, showEquilibrium: action.value };
    case 'set-supply-demand-demand-column':
      return { ...settings, supplyDemandDemandColumnId: action.value };
    case 'set-supply-demand-supply-column':
      return { ...settings, supplyDemandSupplyColumnId: action.value };
    case 'set-supply-demand-x-column':
      return { ...settings, supplyDemandXColumnId: action.value };
    case 'set-series-color':
      if (action.index < 0) return settings;
      {
        const seriesColors = [...settings.seriesColors];
        seriesColors[action.index] = action.value;
        return { ...settings, seriesColors };
      }
    case 'set-title':
      return { ...settings, title: action.value };
    case 'toggle-series-visibility':
      if (!action.seriesColumnIds.includes(action.columnId)) return settings;
      if (settings.hiddenSeriesIds.includes(action.columnId)) {
        return {
          ...settings,
          hiddenSeriesIds: settings.hiddenSeriesIds.filter((id) => id !== action.columnId),
        };
      }
      if (action.seriesColumnIds.filter((id) => !settings.hiddenSeriesIds.includes(id)).length <= 1) {
        return settings;
      }
      return { ...settings, hiddenSeriesIds: [...settings.hiddenSeriesIds, action.columnId] };
    case 'set-value-labels':
      return { ...settings, showValueLabels: action.value };
    case 'set-x-axis-title':
      return { ...settings, xAxisTitle: action.value };
    case 'set-xy-connect-points':
      return { ...settings, xyConnectPoints: action.value };
    case 'set-y-axis-title':
      return { ...settings, yAxisTitle: action.value };
  }
}
