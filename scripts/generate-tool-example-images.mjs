// Run from the repository root: node scripts/generate-tool-example-images.mjs
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { escapeXml } from './svg-helpers.mjs';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
// Bundle the existing TypeScript modules so Node can resolve their extensionless imports.
const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from './src/content/toolPages.ts';
      export { calculateBoxPlotStatistics } from './src/graph/statistics/boxPlot.ts';
      export { curveIntersection } from './src/graph/transforms/supplyDemandModel.ts';
      export { createTreeData } from './src/graph/transforms/tree.ts';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const {
  xyToolPageConfig, supplyDemandToolPageConfig, scatterToolPageConfig, boxPlotToolPageConfig,
  treeToolPageConfig, calculateBoxPlotStatistics, createTreeData, curveIntersection,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

const blue = '#2563eb';
const green = '#079669';
const ink = '#10213a';
const muted = '#52627a';
const grid = '#dbe3ee';
const frame = { left: 90, right: 750, top: 100, bottom: 420 };

function text(x, y, label, { anchor = 'middle', fill = ink, size = 18 } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-size="${size}">${escapeXml(label)}</text>`;
}

function line(x1, y1, x2, y2, color = grid, width = 1) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
}

function point(x, y, color, radius = 5) {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;
}

function scale(values, step, start, end) {
  const min = Math.floor(Math.min(...values) / step) * step;
  const max = Math.ceil(Math.max(...values) / step) * step;
  return {
    ticks: Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step),
    at: value => +(start + (end - start) * (value - min) / (max - min || step)).toFixed(2),
  };
}

function axes(y, xLabel, yLabel, xTicks) {
  const { left, right, top, bottom } = frame;
  const horizontal = y.ticks.map(value =>
    line(left, y.at(value), right, y.at(value)) + text(left - 12, y.at(value) + 6, String(value), { anchor: 'end', fill: muted }),
  ).join('');
  const vertical = xTicks.map(({ position, label }) =>
    line(position, bottom, position, bottom + 6, muted) + text(position, 447, label, { fill: muted }),
  ).join('');
  return horizontal + vertical + line(left, top, left, bottom, muted, 2) + line(left, bottom, right, bottom, muted, 2)
    + text((left + right) / 2, 482, xLabel)
    + `<g transform="rotate(-90 26 260)">${text(26, 260, yLabel)}</g>`;
}

function cartesian(example, { xStep, yStep, yLabel, connected, legend, equilibrium }) {
  const rows = example.rows.map(row => row.map(Number));
  const x = scale(rows.map(row => row[0]), xStep, frame.left + 14, frame.right - 14);
  const y = scale(rows.flatMap(row => row.slice(1)), yStep, frame.bottom, frame.top);
  const ticks = x.ticks.map(value => ({ position: x.at(value), label: String(value) }));
  const series = example.headers.slice(1).map((label, i) => {
    const color = i === 0 ? blue : green;
    const coordinates = rows.map(row => [x.at(row[0]), y.at(row[i + 1])]);
    const stroke = connected
      ? `<polyline points="${coordinates.map(pair => pair.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>`
      : '';
    const keyX = 105 + i * 145;
    const key = legend ? point(keyX, 74, color) + text(keyX + 13, 80, label, { anchor: 'start' }) : '';
    return key + stroke + coordinates.map(([px, py]) => point(px, py, color)).join('');
  }).join('');
  let crossing = '';
  if (equilibrium) {
    const intersection = curveIntersection(
      rows.map(([quantity, demand]) => [quantity, demand]),
      rows.map(([quantity, , supply]) => [quantity, supply]),
    );
    if (!intersection) throw new Error('No unique supply and demand intersection in example data');
    const { quantity, value: price } = intersection;
    const px = x.at(quantity);
    const py = y.at(price);
    crossing = point(px, py, ink, 7)
      + text(px + 50, py + 6, `Equilibrium (${quantity}, ${price})`, { anchor: 'start' });
  }
  return axes(y, example.headers[0], yLabel, ticks) + series + crossing;
}

function boxPlot(example) {
  const groups = example.headers.map((name, index) => {
    const values = example.rows.map(row => row[index]).filter(value => value.trim() !== '').map(Number);
    const stats = calculateBoxPlotStatistics(values);
    if (!stats) throw new Error(`No box plot observations for ${name}`);
    return { name, stats };
  });
  const y = scale(groups.flatMap(({ stats }) => [stats.minimum, stats.maximum]), 5, frame.bottom, frame.top);
  const ticks = groups.map(({ name }, i) => ({
    position: frame.left + (frame.right - frame.left) * (i + 0.5) / groups.length,
    label: name,
  }));
  const boxes = groups.map(({ name, stats }, i) => {
    const { q1, median, q3, lowerWhisker, upperWhisker, outliers } = stats;
    const x = ticks[i].position;
    const top = y.at(q3);
    const bottom = y.at(q1);
    const cap = value => line(x - 24, y.at(value), x + 24, y.at(value), blue, 3);
    return `<g><title>${escapeXml(name)}: Q1 ${q1}, median ${median}, Q3 ${q3}, whiskers ${lowerWhisker}–${upperWhisker}, outliers ${outliers.join(', ') || 'none'}</title>`
      + line(x, y.at(lowerWhisker), x, y.at(upperWhisker), blue, 3)
      + cap(lowerWhisker) + cap(upperWhisker)
      + `<rect x="${x - 54}" y="${top}" width="108" height="${bottom - top}" fill="#eff6ff" stroke="${blue}" stroke-width="3"/>`
      + line(x - 54, y.at(median), x + 54, y.at(median), ink, 3)
      + outliers.map(value => point(x, y.at(value), blue)).join('') + '</g>';
  }).join('');
  return axes(y, 'Class', 'Test score', ticks) + boxes;
}

function tree(example) {
  const result = createTreeData({
    columns: example.headers.map((name, i) => ({ id: String(i), name, kind: 'label' })),
    rows: example.rows.map((cells, i) => ({ id: String(i), cells })),
  });
  if (result.status !== 'ready') throw new Error(result.message);
  const nodes = [];
  const edges = [];
  let leaf = 0;
  function place(node, depth) {
    const children = node.children.map(child => place(child, depth + 1));
    const x = children.length
      ? (children[0].x + children.at(-1).x) / 2
      : 70 + 660 * (++leaf - 0.5) / result.leaves;
    const y = 115 + depth * 280 / Math.max(1, result.levels - 1);
    for (const child of children) {
      const mid = (y + child.y) / 2;
      edges.push(`<path d="M${x} ${y}V${mid}H${child.x}V${child.y}" fill="none" stroke="${blue}" stroke-width="3"/>`);
    }
    const level = depth === 0 ? 'Root' : children.length ? 'Branch' : 'Leaf';
    nodes.push(`<rect x="${x - 84}" y="${y - 26}" width="168" height="52" rx="8" fill="#eff6ff" stroke="${blue}" stroke-width="2"/>`
      + text(x, y - 5, level, { fill: muted, size: 15 })
      + text(x, y + 16, node.name));
    return { x, y };
  }
  place(result.root, 0);
  // A hierarchy uses labeled nodes and edges rather than numeric axes.
  return edges.join('') + nodes.join('');
}

const examples = [
  [xyToolPageConfig, 'Two Y series on one X axis', example => cartesian(example, { xStep: 1, yStep: 2, yLabel: 'Y', connected: true, legend: true })],
  [supplyDemandToolPageConfig, 'Supply and demand equilibrium', example => cartesian(example, { xStep: 10, yStep: 10, yLabel: 'Price', connected: true, legend: true, equilibrium: true })],
  [scatterToolPageConfig, 'Study time and exam scores', example => cartesian(example, { xStep: 1, yStep: 10, yLabel: example.headers[1] })],
  [boxPlotToolPageConfig, 'Test scores by class', boxPlot],
  [treeToolPageConfig, 'Project structure', tree],
];

for (const [config, title, draw] of examples) {
  const { src, alt } = config.exampleImage;
  const output = new URL(`../public${src}`, import.meta.url);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(title)}</title>
  <desc id="description">${escapeXml(alt)}</desc>
  <rect width="800" height="500" rx="12" fill="white" stroke="${grid}"/>
  <g font-family="Inter, Arial, sans-serif">
    ${text(400, 40, title, { size: 26 })}
    ${draw(config.example)}
  </g>
</svg>
`;
  if (Buffer.byteLength(svg) >= 30_000) throw new Error(`Example image exceeds 30 KB: ${src}`);
  await mkdir(new URL('.', output), { recursive: true });
  await writeFile(output, svg);
}