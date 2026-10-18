import { xyColumns } from "../transforms/xy";
import { createXyChartView } from "./xyChart";
import type { GraphSettings } from "./graphSettings";
import type { TabularData } from "../transforms/tabularData";
import type { LineSeriesOption } from "echarts";
export function createEquationChartView(
  data: TabularData,
  settings: GraphSettings,
) {
  if (xyColumns(data).length < 2) return {status:"empty" as const, message:"Enter a valid equation with real values in this X range."};
  const view = createXyChartView(data, {
    ...settings,
    xyConnectPoints: true,
    showValueLabels: false,
  });
  if (view.status !== "ready") return view;
  return {
    ...view,
    warning: undefined,
    summary: `Equation graph: ${view.series.map((series) => series.name).join("; ")}. X range ${settings.cartesian.xMin ?? -10} to ${settings.cartesian.xMax ?? 10}.`,
    options: {
      ...view.options,
      series: (view.options.series as LineSeriesOption[]).map((series) => ({
        ...series,
        showSymbol: false,
      })),
      dataZoom: [
        {
          type: "inside" as const,
          xAxisIndex: 0,
          filterMode: "none" as const,
          moveOnMouseMove: false,
          moveOnMouseWheel: false,
        },
        {
          type: "inside" as const,
          yAxisIndex: 0,
          filterMode: "none" as const,
          moveOnMouseMove: false,
          moveOnMouseWheel: false,
        },
      ],
    },
  };
}
