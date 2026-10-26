import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openPage } from './navigation';

const outlierColor = [225, 29, 72];
const seriesColor = [37, 99, 235];

async function importCsv(page: Page, csv: string) {
  await page.getByLabel('Choose CSV file').setInputFiles({
    buffer: Buffer.from(csv), mimeType: 'text/csv', name: 'secondary-series.csv',
  });
  await expect(page.getByRole('region', { name: 'Preview import' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
}

// Inspect actual rasterized marks, independently of options and accessibility text.
async function canvasPixels(page: Page, color: number[]) {
  return page.locator('[data-chart-status="ready"] canvas').first().evaluate((canvas, color) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext('2d')!;
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 100 && color.every((value, c) => Math.abs(pixels[i + c] - value) < 20)) count++;
    }
    return count;
  }, color);
}

async function download(page: Page, format: 'PNG' | 'SVG', info: TestInfo, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: format, exact: true }).click();
  const file = await pending;
  const bytes = await readFile((await file.path())!);
  await info.attach(`${name}.${format.toLowerCase()}`, {
    body: bytes, contentType: format === 'PNG' ? 'image/png' : 'image/svg+xml',
  });
  return bytes;
}

async function pngPixels(page: Page, png: Buffer, color: number[]) {
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return page.evaluate(async ({ base64, color }) => {
    const bytes = Uint8Array.from(atob(base64), value => value.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0); image.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const contrastChannel = color.indexOf(Math.min(...color));
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      // PNG exports composite translucent scatter dots over white.
      const opacity = (255 - pixels[i + contrastChannel]) / (255 - color[contrastChannel]);
      if (opacity >= 0.5 && opacity <= 1.05 && color.every((value, c) => (
        Math.abs(pixels[i + c] - (255 + opacity * (value - 255))) < 15
      ))) count++;
    }
    return count;
  }, { base64: png.toString('base64'), color });
}

async function svgMarks(page: Page, svg: Buffer, kind: 'outlier' | 'trendline') {
  return page.evaluate(({ text, kind }) => {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    return [...doc.querySelectorAll('path')].filter(path => {
      const d = path.getAttribute('d') ?? '';
      return d.length > 10 && (kind === 'outlier'
        ? path.getAttribute('fill') === '#e11d48' && /[AC]/i.test(d)
        : !!path.getAttribute('stroke-dasharray') && /L/i.test(d)
          && path.getAttribute('stroke') !== 'none');
    }).length;
  }, { text: svg.toString(), kind });
}

for (const width of [1440, 390]) {
  for (const order of ['direct', 'after another chart'] as const) {
    test(`Box Plot draws and exports outliers: ${order}, ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await openPage(page, '/box-plot-maker/');
      await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
      if (order === 'after another chart') {
        const selector = page.getByRole('combobox', { name: 'Change chart type' });
        await selector.selectOption('xy');
        await expect(page.locator('[data-rendered-chart-type="xy"] canvas')).toBeVisible();
        await selector.selectOption('boxplot');
      }
      await importCsv(page, 'Score\n1\n2\n3\n4\n5\n100');
      const chart = page.locator('[data-chart-status="ready"]');
      await expect(chart).toContainText('Score: minimum 1, Q1 2, median 3.5, Q3 5, maximum 100, IQR 3, 1 outlier');
      await page.getByRole('region', { name: 'Graph preview', exact: true }).screenshot({ path: info.outputPath('outlier-canvas.png') });
      await expect.poll(() => canvasPixels(page, outlierColor)).toBeGreaterThan(10);
      const svg = await download(page, 'SVG', info, 'outlier');
      expect(await svgMarks(page, svg, 'outlier')).toBe(1);
      const png = await download(page, 'PNG', info, 'outlier');
      expect(await pngPixels(page, png, outlierColor)).toBeGreaterThan(30);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });

    test(`Scatter draws and exports regression: ${order}, ${width}px`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await openPage(page, '/scatter-plot-maker/');
      await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
      if (order === 'after another chart') {
        const selector = page.getByRole('combobox', { name: 'Change chart type' });
        await selector.selectOption('line');
        await expect(page.locator('[data-rendered-chart-type="line"] canvas')).toBeVisible();
        await selector.selectOption('scatter');
      }
      await importCsv(page, 'X,Y\n-2,-1\n0,3\n2,7');
      await expect(page.locator('[data-chart-status="ready"]')).toContainText('Scatter plot with 3 points. X axis: X. Y axis: Y.');
      // Exports disable chart animation, making the points-only baseline stable.
      const beforeSvg = await download(page, 'SVG', info, 'points-only');
      expect(await svgMarks(page, beforeSvg, 'trendline')).toBe(0);
      const beforePng = await download(page, 'PNG', info, 'points-only');
      const beforePngPixels = await pngPixels(page, beforePng, seriesColor);
      await expect.poll(() => canvasPixels(page, seriesColor)).toBeGreaterThan(30);
      const beforeCanvasPixels = await canvasPixels(page, seriesColor);
      await page.getByRole('button', { name: 'Customize', exact: true }).click();
      await page.getByLabel('Linear trendline and R²', { exact: true }).check();
      await expect(page.locator('[data-chart-insight]')).toHaveText('y = 2x + 3; R² = 1');
      await page.getByRole('button', { name: 'Customize', exact: true }).click();
      await page.getByRole('region', { name: 'Graph preview', exact: true }).screenshot({ path: info.outputPath('trendline-canvas.png') });
      await expect.poll(() => canvasPixels(page, seriesColor)).toBeGreaterThan(beforeCanvasPixels + 30);
      const svg = await download(page, 'SVG', info, 'regression');
      expect(await svgMarks(page, svg, 'trendline')).toBe(1);
      const png = await download(page, 'PNG', info, 'regression');
      expect(await pngPixels(page, png, seriesColor)).toBeGreaterThan(beforePngPixels + 60);
      await expect(page.locator('[data-chart-status="ready"]')).toContainText('Scatter plot with 3 points. X axis: X. Y axis: Y.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });
  }
}
