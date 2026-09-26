# Development Workflow for Codex / Vibe Coding

## Goal
Use AI as an implementation partner without letting prompts become the project memory. The repository is the memory.

## Operating model

### 1. One scoped task at a time
Good:
> Add CSV import to the existing GraphEditor.

Bad:
> Build all graph types, SEO pages, saving, imports, export, and polish the site.

### 2. Read before edit
Every substantive task should instruct Codex to read:
- `AGENTS.md`
- the relevant docs for that subsystem
- existing implementation files

### 3. Delta prompts
Prompts should describe only the change from current state. Do not repeatedly paste the entire project context.

### 4. Acceptance criteria
Every task needs observable completion criteria.

Example:
```text
Task: Add CSV import to shared GraphEditor.

Read first:
- AGENTS.md
- docs/product.md
- docs/architecture.md
- docs/testing.md

Scope:
- Add CSV upload and parsing.
- Populate the existing DataGrid.
- Re-render current graph after import.
- Handle header rows and malformed input.

Do not:
- Change page layout.
- Change graph styling.
- Add a backend.
- Refactor unrelated components.

Acceptance:
- Valid CSV works.
- Invalid CSV shows an inline error.
- Manual editing still works.
- Tests cover parser and one browser flow.
- Lint/typecheck/tests/build pass.

Report:
- Files changed
- Tests run
- Known limitation
```

### 5. Small commits
After a task is verified, create a checkpoint commit. Prefer one coherent behavior per commit.

Suggested commit style:
- `feat: add paste-to-grid parsing`
- `feat: add local project persistence`
- `fix: preserve series names on chart switch`
- `test: cover box plot outlier calculation`

### 6. No opportunistic rewrites
If Codex notices unrelated technical debt, record it separately. Do not mix it into the active task unless it blocks the task.

### 7. Vertical milestones
Recommended sequence:
1. repo foundation and docs
2. Astro shell + design tokens
3. homepage layout
4. DataGrid with sample data
5. working bar chart
6. live update
7. customization basics
8. paste flow
9. CSV import
10. XLSX import
11. IndexedDB save/reopen
12. PNG/SVG export
13. responsive/mobile
14. accessibility pass
15. complete test gate
16. add next chart type

### 8. Add graph types deliberately
For each new graph type:
- document input model
- document compatibility rules
- define specialist controls
- add config/adapter
- add tests
- add page content/internal links

Do not copy/paste an entire editor.

### 9. Change control
If a task proposes changing one of the following, treat it as an architecture/product decision rather than a normal implementation detail:
- framework
- chart engine
- storage model
- URL structure
- SEO page policy
- privacy/data boundary
- shared editor architecture
- major design pattern

Update `docs/decisions.md` if approved.

### 10. Definition of Done
A feature is done when:
- acceptance criteria are met;
- tests pass;
- production build passes;
- desktop/mobile behavior is checked where relevant;
- no unrelated behavior regressed;
- documentation is updated if the feature changes a contract or decision.
