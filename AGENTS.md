# AGENTS.md

## Commands
- `node dev-server.js` — serves the site and handles local JSON `PUT` under `database/`. Without it the site opens but saves fail; check its terminal for save errors.
- No test runner. Verify by exercising the changed flow in `index.html` / `admin.html`. For non-trivial pure logic, sanity-check with a throwaway `node -e` assert; don't add test files.
- After any CSS change, check a mobile viewport (admin has dense grids and fixed row actions).

## Never
- Native `alert/confirm/prompt` or native `select`/`date`/`time` — use `dialogService` and `enhanceCustomControls()`.
- Bespoke messages — only `noticeService` / `dialogService` (`.notice--<info|success|danger|warning|muted|loading>`).
- Raw hex/rgb outside `css/theme/palette.css`; derive with `color-mix()` from an existing variable.
- A new dependency, wrapper or abstraction when something in `js/services/` or `js/ui/components/` already covers it.
- Cards inside cards. Cards are for repeated items, tables, panels and modals only.
- Code comments of any kind. Strip ones you find in code you touch; no separate cleanup pass.
- Empty or log-only `catch`. Every catch shows a notice/dialog or rethrows. A failed fetch/API call never resolves to a silent default.
- Hardcoding, logging or printing the GitHub token used by `services/api.js`.

## Ask first
- Deleting anything under `database/`.
- Changing the JSON data shape (requires updating `api.js`, `analytics.js`, `reportFormatter.js` and the admin panel together).
- Touching `services/auth.js`.
- Any request that could reasonably mean two different things.

## Data model gotchas
- Layout: `database/<location-folder>/<dd.mm.yyyy>.json` reports; catalogs `locations.json`, `employees.json`, `products.json`, `payments.json`, `settings.json`, `burgers.json`.
- Dates: `dd.mm.yyyy` in reports, ISO `yyyy-mm-dd` in forms.
- Locations: `path` (folder) is immutable, `name` is mutable, `aliases` keep old report names matched after a rename. Folder slug comes from `slugifyLocation`, never typed by hand. Names contain Polish characters (`Oświęcim`) — don't normalize paths. New/renamed locations need no code change.
- Location switches are independent: `enabled: false` hides from the generator picker only; `stats: false` drops from every calculation but stays in generator and Listy; `deleted: true` archives from both, files stay, restore reinstates previous switches.
- Admin data sets: `sourceData` (raw) → `allData` (archived removed, feeds Listy) → `statsData` (feeds all calculations). Calculations must use `statsData`.
- Payments: status and remaining amount are derived in `services/payments.js`, never stored.
- Generator state (`localStorage: burbone_state`) expires at local end-of-day; the one-shift temp employee is never persisted.

## Environments
- Prod is GitHub Pages: static, no `PUT`. Catalog/report writes go through `services/api.js` via the GitHub API; no separate deploy step for data. Code ships by pushing to the Pages branch.
- Catalog reads prefer the GitHub API over the Pages CDN when a token is configured (Pages lags after a save). A catalog changed in another tab prompts for confirmation instead of silently reverting.
- Localhost: `fetchAllData` merges real `database/` reports with generated mock data for the last 3 months (`services/mockData.js`); a real report for the same location+date wins. Prod never generates.
- A failed catalog write keeps the panel dirty with an actionable message — read it before assuming a bug elsewhere.
- The site must stay unindexed (`robots.txt` disallow, `noindex` on both pages).

## Conventions
- Tokens only: colors from `css/theme/palette.css`, fonts via `--font-body` / `--font-heading`.
- `css/theme/palette.css` is the single source of token values; `DESIGN.md` describes how those tokens are used (palette, type, layout, elevation, shapes, components). It is a reference, not a checklist.
- Icons via `renderMaterialIcon()` with real Material Symbols ligature names; a bad name renders as overlapping text.
- Naming: one word per concept. `location` is canonical (not "point") in new code. Catalog modules use add / rename / visibility-toggle / remove — don't mix in create/update/delete. Booleans read as assertions: `isArchived`, `hasReport`, `canEdit`.
- Size: files ~400 lines, functions ~50, nesting ~3 levels. Split along an existing seam (never a grab-bag `utils.js`) and flatten with guard clauses. These are splitting triggers, not rewrite triggers.

## Working style
- Before writing code: reuse an existing util/pattern → native feature → installed dependency → shortest correct one-liner. Grep real usage; don't trust memory of file layout or library APIs.
- A bug report names one symptom — grep every caller and fix the shared function once.
- No unrequested features, options, copy or UI. Match existing patterns over parallel ones.
- Reversible ambiguity: state the assumption in one line and proceed; list assumptions at the top of the summary.
- Terse summaries: which files changed and why, one or two lines.
- Update this file only when a change makes a statement here false.

## Failure log
Add one imperative line, specific to this repo, whenever you are corrected on something.
- Never rewrite repo files through PowerShell `Get-Content`/`Set-Content`: Windows PowerShell decodes UTF-8 as ANSI and silently corrupts Polish characters (`Oświęcim`, `Ilość`). Use the editor tools, or `[System.IO.File]::ReadAllText`/`WriteAllText` with an explicit UTF-8 encoder.