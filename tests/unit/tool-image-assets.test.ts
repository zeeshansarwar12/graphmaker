import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allGraphTools } from '../../src/content/graphTools';
import * as toolPages from '../../src/content/toolPages';
import type { ToolPageConfig } from '../../src/content/toolPages';
import { groupedBarToolPageConfig } from '../../src/content/groupedBarPage';
import { horizontalBarToolPageConfig } from '../../src/content/horizontalBarPage';
import { stackedBarToolPageConfig } from '../../src/content/stackedBarPage';

const configs: ToolPageConfig[] = [
  ...Object.values(toolPages),
  groupedBarToolPageConfig,
  horizontalBarToolPageConfig,
  stackedBarToolPageConfig,
];
const examples = configs.flatMap(config => config.exampleImage ? [config.exampleImage.src] : []);
const social = allGraphTools.map(tool => `/images/social/${tool.slug}.png`);

describe('public tool image assets', () => {
  it.each([...social, ...examples])('includes %s', (src) => {
    const file = new URL(`../../public${src}`, import.meta.url);
    expect(statSync(file, { throwIfNoEntry: false })?.isFile(), `Missing asset: ${src}`).toBe(true);
  });
});