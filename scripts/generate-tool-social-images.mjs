// Run with Node 24+: node scripts/generate-tool-social-images.mjs
import { Buffer } from 'node:buffer';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { surplusSocialImage } from '../src/content/guides/surplusExamples.ts';
import { allGraphTools } from '../src/content/graphTools.ts';
import { escapeXml } from './svg-helpers.mjs';

// Resolve the renderer already installed for Astro.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('astro/package.json'))('sharp');

const output = new URL('../public/images/social/', import.meta.url);
const template = await readFile(new URL('../public/images/graphmaker-social.svg', import.meta.url), 'utf8');
const width = 1200;
const height = 630;
const blue = '#2563eb';
const dark = '#1d4ed8';
const light = '#93c5fd';
const grid = '#dbe3ee';
const ink = '#10213a';

const rect = (x, y, w, h, fill = blue, radius = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const path = (d, stroke = blue, strokeWidth = 6, fill = 'none') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
const dot = (cx, cy, fill = blue, r = 8) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const dots = (points) => points.map(([x, y]) => dot(x, y)).join('');
const axes = path('M22 22V252H278 M22 182H278 M22 112H278 M22 42H278', grid, 2);
const plane = path('M22 42H278 M22 94H278 M22 198H278 M22 250H278 M48 20V270 M100 20V270 M204 20V270 M256 20V270', grid, 2)
  + path('M22 146H278 M152 20V270', '#8ca2bf', 3);
const bars = (xs, heights, w) =>
  xs.map((x, i) => rect(x, 252 - heights[i], w, heights[i])).join('');

const glyphs = {
  bar: axes + bars([45, 105, 165, 225], [90, 150, 112, 196], 38),
  line: axes + path('M42 211L92 161L148 177L204 90L258 57') + dots([[42, 211], [92, 161], [148, 177], [204, 90], [258, 57]]),
  pie: dot(150, 145, blue, 109)
    + '<path d="M150 145V36A109 109 0 0 1 254 179Z" fill="#93c5fd"/>'
    + '<path d="M150 145L254 179A109 109 0 0 1 71 220Z" fill="#1d4ed8"/>'
    + path('M150 36V145L254 179 M150 145L71 220', 'white', 4),
  xy: plane + path('M48 198L100 172L152 94L204 120L256 42') + dots([[48, 198], [100, 172], [152, 94], [204, 120], [256, 42]]),
  equation: plane + path('M47 40Q152 330 257 40'),
  scatter: axes + dots([[48, 207], [75, 181], [96, 216], [124, 142], [140, 172], [159, 131], [184, 95], [203, 118], [226, 77], [248, 57], [263, 90]]),
  histogram: axes + [52, 125, 192, 148, 91, 39].map((h, i) => rect(28 + i * 41, 252 - h, 41, h, i % 2 ? dark : blue, 0)).join(''),
  boxplot: axes + [70, 136, 202].map((y, i) => {
    const x = 62 + i * 15;
    return path(`M${x} ${y}H${x + 154} M${x} ${y - 14}v28 M${x + 154} ${y - 14}v28`, dark, 4)
      + rect(x + 34, y - 19, 84, 38, light)
      + path(`M${x + 69} ${y - 19}v38`, dark, 5);
  }).join('') + dot(260, 70),
  radar: path('M150 30L260 108L218 238H82L40 108Z M150 70L222 122L194 204H106L78 122Z M150 108L184 134L171 173H129L116 134Z M150 30V145L260 108 M218 238L150 145L82 238 M40 108L150 145', grid, 3)
    + path('M150 49L218 123L209 220L100 211L67 116Z', blue, 5, '#bfdbfe'),
  dotplot: path('M22 252H278 M47 252v10 M99 252v10 M151 252v10 M203 252v10 M255 252v10', grid, 3)
    + [2, 4, 7, 5, 3].map((count, i) => dots(Array.from({ length: count }, (_, j) => [47 + i * 52, 226 - j * 27]))).join(''),
  surplus: axes
    + '<path d="M22 53L149.5 138H22Z" fill="#bfdbfe"/>'
    + '<path d="M22 138H149.5L22 223Z" fill="#a7e4cf"/>'
    + path('M22 53L277 223')
    + path('M22 223L277 53', '#079669')
    + path('M149.5 138V252 M22 138H149.5', '#8ca2bf', 3) + dot(149.5, 138, ink, 9),
  supplydemand: axes + path('M43 222L256 53') + path('M43 53L256 222', '#079669')
    + path('M149.5 138V252 M22 138H149.5', '#8ca2bf', 3) + dot(149.5, 138, ink, 9),
  tree: path('M150 66V103H74V143 M150 103H226V143 M74 181V209H46V230 M74 209H102V230 M226 181V209H198V230 M226 209H254V230', blue, 4)
    + rect(120, 28, 60, 38) + rect(46, 143, 56, 38, dark) + rect(198, 143, 56, 38, dark)
    + [46, 102, 198, 254].map((x) => rect(x - 20, 230, 40, 28, light)).join(''),
  'stacked-bar-graph-maker': axes + [110, 166, 122, 204].map((h, i) => {
    const x = 45 + i * 60;
    return rect(x, 252 - h, 38, h, light, 0) + rect(x, 252 - h * .55, 38, h * .55, blue, 0);
  }).join(''),
  'horizontal-bar-graph-maker': path('M30 20V252H278 M105 20V252 M180 20V252 M255 20V252', grid, 2)
    + [226, 176, 140, 84].map((w, i) => rect(30, 36 + i * 55, w, 31)).join(''),
  'grouped-bar-chart-maker': axes + [95, 155, 187].map((h, i) => {
    const x = 43 + i * 80;
    return rect(x, 252 - h, 26, h) + rect(x + 29, 200 - h, 26, h + 52, light);
  }).join(''),
};

function cardSvg(tool) {
  const glyph = glyphs[tool.slug] ?? glyphs[tool.type];
  if (!glyph) throw new Error(`Missing chart glyph for ${tool.slug}`);

  const lines = tool.lines ?? (tool.name.length <= 19 ? [tool.name] : tool.name.split(/ (?=(?:Graph|Chart) Maker$)/));
  const title = lines.map((line, i) => `<tspan x="104" y="${294 + 74 * i}">${escapeXml(line)}</tspan>`).join('');
  const artwork = `
  <g font-family="Arial, sans-serif">
    <text x="104" y="168" font-size="36" font-weight="700" fill="${ink}">Graph<tspan fill="${blue}">Maker</tspan></text>
    <text font-size="64" font-weight="700" fill="${ink}">${title}</text>
    <text x="104" y="492" font-size="28" fill="${blue}">graphmaker.site</text>
  </g>
  <rect x="750" y="124" width="334" height="382" rx="22" fill="#eff6ff"/>
  <g transform="translate(767 170)">${glyph}</g>`;

  // Keep the default card's canvas and inset white panel.
  return template.replace(/<g\b[\s\S]*<\/svg>/, `${artwork}\n</svg>`);
}

await mkdir(output, { recursive: true });
for (const tool of allGraphTools) {
  const file = new URL(`${tool.slug}.png`, output);
  const png = await sharp(Buffer.from(cardSvg(tool))).png({ palette: true }).toBuffer();
  const metadata = await sharp(png).metadata();
  if (metadata.width !== width || metadata.height !== height || png.length >= 200_000) {
    throw new Error(`Invalid social image dimensions or file size for ${tool.slug}`);
  }
  await writeFile(file, png);
}
const guideFile = new URL(`../public${surplusSocialImage}`, import.meta.url);
await mkdir(new URL('.', guideFile), { recursive: true });
const guideCard = cardSvg({ name: 'Surplus', lines: ['Consumer and', 'Producer Surplus'], type: 'surplus' });
await writeFile(guideFile, await sharp(Buffer.from(guideCard)).png({ palette: true }).toBuffer());
