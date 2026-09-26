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

Google Analytics 4 is enabled with the production web stream. For an alternate deployment, copy `.env.example` to `.env` or override this environment variable:

```text
PUBLIC_GOOGLE_ANALYTICS_ID=G-JM5S5JGFJJ
```

The shared layout validates any override and otherwise uses the production Measurement ID. Advertising personalization and Google signals remain disabled.
