import type { EChartsOption } from "echarts";

export interface CartesianSettings {
  xMin: number | null;
  xMax: number | null;
  yMin: number | null;
  yMax: number | null;
  xStep: number | null;
  yStep: number | null;
  origin: boolean;
  equalScale: boolean;
}
export const defaultCartesian: CartesianSettings = {
  xMin: null,
  xMax: null,
  yMin: null,
  yMax: null,
  xStep: null,
  yStep: null,
  origin: false,
  equalScale: false,
};
export const coordinatePlane: CartesianSettings = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  xStep: 1,
  yStep: 1,
  origin: true,
  equalScale: true,
};
export function cartesianError(axes: CartesianSettings): string | null {
  for (const axis of ["x", "y"] as const) {
    const min = axes[`${axis}Min`],
      max = axes[`${axis}Max`],
      step = axes[`${axis}Step`];
    if (
      [min, max, step].some(
        (value) =>
          value !== null && (!Number.isFinite(value) || Math.abs(value) > 1e9),
      )
    )
      return "Use finite axis values between -1 billion and 1 billion.";
    if (min !== null && max !== null && (min >= max || max - min < 1e-8))
      return "Each axis minimum must be smaller than its maximum (range at least 0.00000001).";
    if (step !== null && (min === null || max === null)) return "Set both axis bounds before choosing grid spacing.";
    if (
      step !== null &&
      (step <= 0 || (min !== null && max !== null && (max - min) / step > 200))
    )
      return "Grid spacing must be positive, with at most 200 intervals per axis.";
  }
  if (
    axes.equalScale &&
    [axes.xMin, axes.xMax, axes.yMin, axes.yMax].some((v) => v === null)
  )
    return "Set all four bounds to use equal unit scale.";
  if (
    axes.origin &&
    ((axes.xMin ?? 0) > 0 ||
      (axes.xMax ?? 0) < 0 ||
      (axes.yMin ?? 0) > 0 ||
      (axes.yMax ?? 0) < 0)
  )
    return "Include zero on both axes to show the origin.";
  return null;
}
export function cartesianAxis(
  axes: CartesianSettings,
  axis: "x" | "y",
  name: string,
  showGrid: boolean,
) {
  return {
    type: "value" as const,
    name,
    nameLocation: "middle" as const,
    nameGap: axis === "x" ? 36 : 42,
    ...(axes[`${axis}Min`] !== null ? { min: axes[`${axis}Min`]! } : {}),
    ...(axes[`${axis}Max`] !== null ? { max: axes[`${axis}Max`]! } : {}),
    ...(axes[`${axis}Step`] !== null ? { interval: axes[`${axis}Step`]! } : {}),
    axisLabel: { color: "#52627a", fontSize: 12, hideOverlap: true },
    axisLine: {
      show: axes.origin || axis === "x",
      onZero: axes.origin,
      lineStyle: { color: "#94a3b8" },
    },
    nameTextStyle: { color: "#52627a", fontSize: 12 },
    splitLine: { show: showGrid, lineStyle: { color: "#e2e8f0" } },
  };
}
// Fit the plot rectangle, rather than distorting the requested coordinate bounds.
export function fitCartesianGrid(
  options: EChartsOption,
  axes: CartesianSettings,
  width: number,
  height: number,
): EChartsOption {
  if (!axes.equalScale || cartesianError(axes)) return options;
  const ratio = (axes.xMax! - axes.xMin!) / (axes.yMax! - axes.yMin!);
  const availableWidth = Math.max(1, width - 110),
    availableHeight = Math.max(1, height - 100);
  const plotWidth = Math.min(availableWidth, availableHeight * ratio),
    plotHeight = plotWidth / ratio;
  return {
    ...options,
    grid: {
      left: 65 + (availableWidth - plotWidth) / 2,
      top: 35 + (availableHeight - plotHeight) / 2,
      width: plotWidth,
      height: plotHeight,
      containLabel: false,
    },
  };
}
