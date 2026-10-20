# Editor JavaScript loading measurement

Measured against the local production preview on 20 October 2026 (Asia/Karachi), fresh Chromium pages with no interactions, ending when the first chart canvas is ready. Totals include requested local /_astro JavaScript, including React and shared ECharts dependencies. Gzip figures are computed with Node gzipSync, not observed production transfer sizes. This is a payload comparison, not a Core Web Vitals or network-latency benchmark.

| Page | Before raw bytes | After raw bytes | Before gzip bytes | After gzip bytes |
|---|---:|---:|---:|---:|
| Homepage | 1,008,907 | 898,251 | 327,951 | 300,398 |
| Tree maker | 1,015,860 | 909,671 | 330,406 | 303,547 |

The former 765,663-byte GraphWorkspace chunk is now 199,775 bytes. The largest remaining JavaScript chunk is the on-demand XLSX parser at 492,276 bytes. The production build no longer emits its 500 kB chunk warning without increasing the warning threshold.

Chart families load when requested and cache their module registration. This reduces unused chart code but increases small shared requests: homepage 6 to 27, tree page 7 to 25. Production HTTP caching, compression and network conditions should be measured after deployment before asserting faster load times. XLSX already used a dynamic import and remains absent from initial loads. No dependencies or persistence changes.

Regression: chart-loading.spec.ts checks unused chart and XLSX requests, switching to a new family, and chart-load retry. The full browser suite covers all tools, imports, persistence, PNG/SVG and viewport gestures.

Repeat with `npm run build`, start the production preview, then `node scripts/measure-editor-bundles.mjs http://127.0.0.1:4323`. Compare the printed local asset totals against this baseline.

After the draft-preservation extension on 20 October, the same isolated test-server measurement recorded 913,112 raw / 304,613 gzip bytes on the tree page (25 requests): about 1.1 kB gzip above the optimized baseline. The build still emits no chunk-size warning. This feature adds no dependencies; diagram contents remain in local storage rather than bundled JavaScript.
