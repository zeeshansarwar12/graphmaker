import { useMemo } from 'react';
import { linearRegression } from '../../graph/statistics/regression';

interface Props {
  points: Array<[number, number]>;
  skipped: number;
  xName: string;
  yName: string;
}

function format(value: number) {
  return String(Number(value.toPrecision(6))).replaceAll('-', '−');
}

export function ScatterResults({ points, skipped, xName, yName }: Props) {
  const fit = useMemo(() => linearRegression(points), [points]);
  return (
    <section aria-labelledby="scatter-results-heading" className="border-border bg-surface-subtle my-4 rounded-lg border p-4">
      <h3 className="font-bold" id="scatter-results-heading">Line of best fit results</h3>
      <p className="text-text-muted mt-1 text-sm">
        {points.length} valid {points.length === 1 ? 'pair' : 'pairs'}{skipped > 0 && ` · ${skipped} skipped (missing or invalid X or Y)`}
      </p>
      {'error' in fit ? <p className="mt-3 text-sm" role="status">{fit.error}</p> : <>
        <p className="mt-3 font-semibold">ŷ = {format(fit.slope)}x {fit.intercept < 0 ? '−' : '+'} {format(Math.abs(fit.intercept))}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><dt>Slope</dt><dd className="font-semibold">{format(fit.slope)}</dd></div>
          <div><dt>Y-intercept</dt><dd className="font-semibold">{format(fit.intercept)}</dd></div>
          <div><dt>R²</dt><dd className="font-semibold">{fit.rSquared === null ? 'Undefined (constant Y)' : format(fit.rSquared)}</dd></div>
        </dl>
        <p className="text-text-muted mt-3 text-sm leading-6">
          For a one-unit increase in {xName || 'X'}, the fitted change in {yName || 'Y'} is {format(fit.slope)} units.
          {fit.rSquared !== null && ` The line accounts for ${format(fit.rSquared * 100)}% of the observed variation in ${yName || 'Y'}.`}
        </p>
        <details className="border-border mt-3 border-t pt-3 text-sm">
          <summary className="cursor-pointer font-semibold">Show calculation</summary>
          <ol className="text-text-muted mt-2 list-decimal space-y-2 pl-5 leading-6">
            <li>Average the paired values. x̄ ≈ {format(fit.meanX)} and ȳ ≈ {format(fit.meanY)}.</li>
            <li>Divide the sum of paired deviations by the sum of squared X deviations. m ≈ {format(fit.xy)} ÷ {format(fit.xx)} ≈ {format(fit.slope)}.</li>
            <li>Subtract the slope times the X mean from the Y mean. b ≈ {format(fit.meanY)} − ({format(fit.slope)} × {format(fit.meanX)}) ≈ {format(fit.intercept)}.</li>
            {fit.rSquared !== null && <li>Divide the squared sum of paired deviations by the product of the two squared-deviation sums. R² ≈ ({format(fit.xy)})² ÷ ({format(fit.xx)} × {format(fit.yy)}) ≈ {format(fit.rSquared)}.</li>}
          </ol>
        </details>
      </>}
    </section>
  );
}