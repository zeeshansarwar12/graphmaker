# Graph Maker Project Specification Pack

This pack is the persistent product/architecture context for the Graph Maker website.

Start with:
1. `AGENTS.md`
2. `docs/product.md`
3. `docs/v1-scope.md`
4. `docs/architecture.md`
5. `docs/design-system.md`
6. `docs/seo-map.md`
7. `docs/testing.md`
8. `docs/decisions.md`
9. `docs/development-workflow.md`

`docs/reference-homepage.png` is the current approved visual direction for the homepage.

Use these files inside the repository so Codex can reread the decisions instead of relying on chat history.

## Google Analytics

Google Analytics 4 is optional. Copy `.env.example` to `.env` for local testing or set this environment variable in the production deployment:

```text
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Use the GA4 Measurement ID from the production web data stream. When the variable is absent or invalid, no Google Analytics scripts are rendered.
