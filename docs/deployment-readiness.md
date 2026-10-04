# PASS

- Production source placeholders removed: contact email and legal update dates are conditional null fields; builder identity and unconfirmed export licensing sections are removed. No owner information was invented. No new tools or keyword pages were added.
- Files changed: `src/content/site.ts`, `src/components/ui/ContactLine.astro`, `src/pages/about.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`, `scripts/audit-built-html.py`, `tests/e2e/global-setup.ts`, and this report.
- Clean installation: `npm ci --allow-remote=root` exited 0. The flag permits the existing owner-selected SheetJS tarball dependency under npm 12. npm reported a blocked esbuild install script and seven high-severity vulnerabilities.
- `npm run lint` exited 0, including after the final verification changes.
- `npx playwright install chromium` exited 0; Chromium, headless shell, FFmpeg, and Winldd were installed.
- Supplementary `node scripts/verify-audit-source.mjs` exited 0 for 15 configured pages and 10 tools. This is source verification, not rendered output verification.
- `git diff --check` exited 0.
- Live HTTP checks on 2026-10-04: `https://graphmaker.site/about` returned 308 with `Location: /about/`; `https://graphmaker.site/about/` returned 200. These responses concern the currently deployed site, not the local changes.
- The built HTML auditor now rejects production placeholders and requires a noindex custom 404. Browser setup now refuses missing homepage build output.

# FAIL

- `npm run typecheck`, `npm test`, and `npm run build` exited 1 before checks could execute: Windows Application Control blocks `@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node` with `ERR_DLOPEN_FAILED`. The top-level loader misleadingly reports a missing native binding.
- `python scripts/audit-built-html.py` exited 1 because all 15 required HTML pages are missing.
- `npx playwright test` exited 1 in global setup because `dist/index.html` is missing. No browser assertions executed.
- `npm audit --json` reported seven high-severity dependency findings: astro-eslint-parser, braces, devalue, eslint-plugin-astro, fast-glob, http-cache-semantics, and micromatch. This report does not establish production exploitability; remediation/review remains outstanding.

# UNVERIFIED

- All 13 indexable pages in the new build: HTTP status/indexability, rendered canonical, title/description, Open Graph URL, schema, breadcrumbs, internal links, fragments, tool counts, sitemap consistency, and broken links.
- Custom 404 HTTP behavior and noindex output for the new build.
- Trailing-slash behavior for the new deployment, including the requested About redirect. Only the current live deployment's About behavior was checked.
- Unit results, full typecheck, editor/browser behavior, and placeholder absence in rendered HTML.
- Commands used the bundled Node runtime and npm/npx through `pnpm --package=npm dlx` because npm is not installed on the system PATH. No package manifest or lockfile changes were made in this pass.

# BLOCKERS BEFORE DEPLOYMENT

- Run the full requested pipeline on a working build host where the locked toolchain can load. This Windows host blocks the native binding; no installed WSL or Docker environment was available. Prior portable fallback attempts also failed and do not count as successful checks.
- Review the blocked esbuild install script and dependency vulnerability findings; apply justified fixes and rerun the pipeline.
- Require a successful build, built HTML audit, and full Playwright run before approving deployment. Verify all indexable routes and production HTTP behavior against that artifact.

# SAFE TO DEPLOY: NO
