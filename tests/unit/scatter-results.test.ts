import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScatterResults } from '../../src/components/graph/ScatterResults';

function render(points: Array<[number, number]>, skipped = 0) {
  return renderToStaticMarkup(createElement(ScatterResults, { points, skipped, xName: 'X', yName: 'Y' }));
}

describe('ScatterResults', () => {
  it.each([
    { points: [], count: '0 valid pairs' },
    { points: [[1, 2]] as Array<[number, number]>, count: '1 valid pair' },
  ])('shows the minimum sample requirement for $count', ({ points, count }) => {
    const html = render(points);
    expect(html).toContain(`>${count}</p>`);
    expect(html).toContain('role="status">Add at least two valid points for a trendline.');
    expect(html).not.toContain('ŷ =');
  });

  it('shows why constant X cannot be fitted', () => {
    const html = render([[2, 1], [2, 3]]);
    expect(html).toContain('role="status">A trendline needs at least two different X values.');
    expect(html).not.toContain('ŷ =');
  });

  it('shows undefined R² for constant Y', () => {
    const html = render([[1, 4], [2, 4]]);
    expect(html).toContain('ŷ = 0x + 4');
    expect(html).toContain('Undefined (constant Y)');
    expect(html).not.toContain('R² ≈');
  });

  it('shows the skipped-row count alongside the valid pairs', () => {
    expect(render([[1, 2], [2, 4]], 3)).toContain('2 valid pairs · 3 skipped (missing or invalid X or Y)');
  });

  it('uses the Unicode minus for negative results and calculation steps', () => {
    const html = render([[1, -5], [2, -7], [3, -9]]);
    expect(html).toContain('ŷ = −2x − 3');
    expect(html).toContain('>−2</dd>');
    expect(html).toContain('>−3</dd>');
    expect(html).toContain('is −2 units.');
    expect(html).toContain('ȳ ≈ −7');
    expect(html).toContain('m ≈ −4 ÷ 2 ≈ −2');
    expect(html).toContain('b ≈ −7 − (−2 × 2) ≈ −3');
    expect(html).toContain('R² ≈ (−4)² ÷ (2 × 8) ≈ 1');
    expect(html.replace(/<[^>]*>/g, '')).not.toMatch(/-\d/);
  });
});