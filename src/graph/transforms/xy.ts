import { detectNumericColumnIndexes } from "./dataInterpretation";
import type { TabularData } from "./tabularData";
export function xyColumns(data: TabularData): number[] {
  return detectNumericColumnIndexes(data);
}
export function xyLabels(data: TabularData) {
  const [x, ...ys] = xyColumns(data);
  const xName = data.columns[x]?.name || "X";
  const names = ys.map((i) => data.columns[i].name || "Y");
  return {
    title: `${names.join(" and ") || "Y"} by ${xName}`,
    xAxisTitle: xName,
    yAxisTitle: names.length === 1 ? names[0] : "Value",
  };
}
