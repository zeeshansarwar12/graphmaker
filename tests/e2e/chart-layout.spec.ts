import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

test('waits for a measurable preview before initializing the chart', async ({ page }) => {
  await page.addInitScript(() => {
    const layout = new MutationObserver(() => {
      if (!document.documentElement) return;
      const style = document.createElement('style');
      style.id = 'test-zero-height-preview';
      style.textContent = '[data-chart-canvas] { height: 0 !important }';
      document.documentElement.append(style);
      layout.disconnect();
    });
    layout.observe(document, { childList: true });

    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      observe(target: Element, options?: ResizeObserverOptions) {
        super.observe(target, options);
        if (target.matches('[data-chart-canvas]')) {
          target.setAttribute('data-test-resize-observed', '');
        }
      }
    };
  });

  await openPage(page, '/');
  const container = page.locator('[data-chart-canvas][data-test-resize-observed]');
  await expect(container).toHaveCSS('height', '0px');
  await expect(container.locator('canvas')).toHaveCount(0);
  await expect(page.getByText('Loading chart…')).toBeVisible();

  await page.locator('#test-zero-height-preview').evaluate(style => style.remove());
  const canvas = page.locator('[data-chart-status="ready"] canvas');
  await expect(canvas).toBeVisible();
  const dimensions = await canvas.evaluate(element => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
});
