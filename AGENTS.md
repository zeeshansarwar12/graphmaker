# Graph Maker — Codex Operating Rules

This repository is a long-running SEO-first graphing product. Treat repository documentation as the source of truth. Do not casually reinterpret product, architecture, SEO, or design decisions.

## Read before changing code
For every task, read the smallest relevant set of these files before editing:
- `docs/product.md`
- `docs/v1-scope.md`
- `docs/architecture.md`
- `docs/design-system.md`
- `docs/seo-map.md`
- `docs/testing.md`
- `docs/decisions.md`
- `docs/development-workflow.md`

If the task conflicts with a recorded decision, stop and report the conflict instead of silently overriding it.

## Core rules
1. One shared GraphEditor powers all chart-maker pages.
2. Do not create separate implementations for SEO pages when configuration can reuse shared code.
3. Do not create thin pages for modifiers such as `free`, `online`, `no signup`, or `no login`.
4. V1 has no backend, no accounts, and no cloud database.
5. V1 project saving uses IndexedDB and optional project-file export/import.
6. User data should remain client-side unless a future decision explicitly changes this.
7. Astro owns routing, static SEO content, and page shells. React islands are only for interactive graphing UI.
8. Apache ECharts is the chart engine for V1.
9. Reuse existing components and patterns before creating new abstractions.
10. Do not refactor unrelated files during a scoped task.
11. Do not add dependencies without explaining why the current stack cannot solve the problem.
12. Do not change URLs, page hierarchy, or internal-linking rules without checking `docs/seo-map.md`.
13. Do not change visual language without checking `docs/design-system.md`.
14. Do not optimize for hypothetical future graph types at the cost of current simplicity.

## Task execution
Before coding:
- inspect the relevant existing implementation;
- identify the smallest change set;
- state any assumption that affects architecture or UX.

During coding:
- keep changes task-scoped;
- preserve existing behavior unless the task explicitly changes it;
- add or update tests with behavior changes;
- keep accessibility and responsive behavior intact.

Before finishing:
- run lint;
- run typecheck;
- run unit tests;
- run relevant Playwright tests;
- run production build;
- report files changed, tests run, and any known limitation.

## Product principle
The generic homepage solves: **“I have data. I need a graph now.”**
Specialist pages solve a materially different job, such as XY graphing, scatter regression, box plots, or error bars.

## UX principle
Default to simplicity and progressive disclosure. A user should be able to make and download a basic graph without understanding advanced chart settings.

## SEO principle
A page exists because user intent or workflow is materially distinct, not because another keyword variant exists.
