export function linearRegression(points: Array<[number, number]>) {
  if (points.length < 2)
    return { error: "Add at least two valid points for a trendline." };
  const n = points.length,
    meanX = points.reduce((sum, p) => sum + p[0], 0) / n,
    meanY = points.reduce((sum, p) => sum + p[1], 0) / n;
  let xx = 0,
    xy = 0,
    yy = 0;
  for (const [x, y] of points) {
    xx += (x - meanX) ** 2;
    xy += (x - meanX) * (y - meanY);
    yy += (y - meanY) ** 2;
  }
  if (xx === 0)
    return { error: "A trendline needs at least two different X values." };
  const slope = xy / xx,
    intercept = meanY - slope * meanX;
  const rSquared =
    yy === 0 ? null : Math.max(0, Math.min(1, (xy * xy) / (xx * yy)));
  if (![slope, intercept].every(Number.isFinite))
    return { error: "These values exceed the supported calculation range." };
  const xs = points.map((p) => p[0]);
  const min = xs.reduce((a, b) => Math.min(a, b)),
    max = xs.reduce((a, b) => Math.max(a, b));
  return {
    slope,
    intercept,
    rSquared,
    points: [
      [min, slope * min + intercept],
      [max, slope * max + intercept],
    ] as Array<[number, number]>,
  };
}
