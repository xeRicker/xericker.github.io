# Agent Instructions

## Quick Reference
- Run: `node dev-server.js` — serves static files and handles local JSON `PUT` writes under `database/`. Without it the site still opens but saves fail.
- No test suite, no build/lint step.
- Prod = GitHub Pages, static only, no `PUT`. Catalog/report JSON writes in prod go through `services/api.js` via the GitHub API instead.

## Never
- Native `alert/confirm/prompt` or native pickers — `select`/`date`/`time` go through `enhanceCustomControls()`, dialogs through `dialogService`.
- Raw hex/rgb outside `css/theme/palette.css` (`color-mix()` only, derived from an approved variable).
- A new dependency, wrapper, or abstraction when an existing `services/`/`components/` util already covers it.
- A bespoke styled message — always `noticeService`/`dialogService` (`.notice--<info|success|danger|warning|muted|loading>`).
- Decorative cards inside cards — cards are for repeated items, tables, panels, modals only.
- Comments in code, of any kind (see Comment Policy).
- An empty or silently-logged `catch` block (see Error Handling).
- Deleting data under `database/`, changing the JSON data shape, or touching `auth.js` without confirming first.

## Setup
- No install step confirmed — static HTML/ES modules, no bundler, no `package.json` dependencies referenced in this file. <!-- TODO: confirm whether `node dev-server.js` requires `npm install` -->
- Run locally: `node dev-server.js` — serves static files and handles local JSON `PUT` writes under `database/`. Without it the site still opens but saves fail.

## Test
- No test suite, no build/lint step. Verify by running `node dev-server.js` and exercising the changed flow in `index.html` / `admin.html`.
- Non-trivial pure logic (new calc in `services/analytics.js`, date parsing, etc.): sanity-check with a throwaway `node -e` assert before wiring it in — don't add a permanent test file, there's no runner configured.
- Check mobile viewport on any CSS change — admin has dense grids and fixed row actions.

## Deploy
- Prod is GitHub Pages, static, no PUT. Code changes ship by pushing to the branch Pages serves. <!-- TODO: confirm branch name (main / gh-pages) -->
- Catalog/report JSON writes in prod go through `services/api.js` via the GitHub API (commits files directly) — no separate deploy step for those.
- The GitHub API token used by `services/api.js` comes from the runtime/session — never hardcode, log, or print it.

## Debug
- User-facing errors/success surface only via `noticeService`/`dialogService` (see Key Modules) — never invent a bespoke message.
- A failed catalog write keeps the panel dirty with an actionable message (`saveLocalJson` re-reads, `saveGithubConfig` diffs the API response) — read that message before assuming a bug elsewhere.
- Local save failures: check the `node dev-server.js` terminal output.

## Stack
Static HTML (`index.html`, `admin.html`) + ES modules, no bundler. CSS via `style.css`. Chart.js from CDN (admin only). Icons: Material Symbols Rounded. Data: JSON in `database/<location>/<dd.mm.yyyy>.json`. Catalogs: `database/locations.json`, `employees.json`, `products.json`, `payments.json`.

## Layout
List the repo and grep actual usage before writing code — don't trust a hardcoded tree, a remembered file layout, or a memorized library API/version; verify against what's actually imported/called here. Stable shape:
- `css/theme/palette.css` — design tokens & active palette
- `css/*.css`, `css/components/` — per-feature and shared styles
- `js/config/` — static config, fixed team data
- `js/services/` — data models & I/O: api, auth, adminAccess, locations, employees, products, payments, analytics, revenue, reportDates, reportFormatter, mockData, reportCache, storage
- `js/ui/` — page controllers; `js/ui/components/` — shared UI (Card, customControls, notice)
- `database/` — catalogs + per-location report JSON

## Key Modules
- `main.js` — report generator, generator/employees tabs, one-shift temp employee, persistent form state
- `admin.js` — admin controller: filters, tabs, revenue, calculator, point-catalog mapping. Holds `sourceData` (raw), `allData` (archived points removed, feeds Listy), `statsData` (feeds all calculations)
- `ui/adminLists.js` — saved lists, filtering, preview, copy
- `ui/adminProducts.js` — product catalog: order, types, active state
- `ui/adminEmployees.js` — team catalog: add/rename/visibility/remove
- `ui/adminLocations.js` — point catalog: add/rename/visibility/stats switch/archive-restore; `database/` folder slug is generated from the name (`slugifyLocation`), not typed by hand
- `ui/adminPayments.js` — payments catalog: obligations/debts, kinds, due dates, recurrence, partial payments, archive; dirty-state save like the other catalogs
- `ui/adminRender.js` — summaries, charts, tables, heatmap, tooltips, weekly overview, payments reminder for the Utargi page
- `ui/payrollCalculator.js` — shared hours calculator (main + admin); rate/date disabled until employee chosen; EKIPA-hidden people excluded; exposes the last summary via `getSummary()` and an `onRecalc` callback
- `ui/payslip.js` — admin Wynagrodzenia „PASEK”: draws the calculator summary to a branded PNG payslip (canvas) and opens it in a new tab; the PASEK panel is currently removed from `admin.html`, so `setupPayslipGenerator` returns a no-op until the panel returns
- `ui/components/customControls.js` — custom select/date/time/dialog; mirrors native `disabled` onto the visible control
- `ui/components/notice.js` + `css/components/notice.css` — the only message system: `.notice--<info|success|danger|warning|muted|loading>` via `noticeService.render()` / `dialogService.*`
- `services/reportDates.js` — report date parsing/keys/sorting
- `services/api.js` — GitHub API or local dev-server I/O; report paths come from the point's catalog folder; bulk report fetches run at higher concurrency and go through `reportCache`; on localhost merges real `database/` reports with generated ones
- `services/reportCache.js` — IndexedDB cache of report JSON keyed by Git blob SHA, so bulk month loads download only new/changed files; oldest entries pruned past 4000
- `services/mockData.js` — localhost-only generator: the last 3 months of report-shaped data (revenue, shifts, products) built from the live catalogs, used to fill missing location-days
- `services/locations.js` — point catalog: normalize, resolve report names → points (name/folder/aliases), visibility, stats switch, filters
- `services/employees.js` — team catalog: normalize, resolve report names → people, visibility
- `services/auth.js` — admin password check; only PBKDF2 salt+digest live in source, never the plaintext
- `services/payments.js` — payments catalog: normalize, derive status (do zapłaty/częściowe/przeterminowane/zapłacone), partial-payment sums, upcoming reminders, summaries
- `services/analytics.js` — daily aggregation/stats; per-point keys derive from point name, so new points need no code change

## Design Tokens
Dark Atlassian-style dashboard, warm accent palette, compact radii, dense admin views, consistent type. Use aliases from `css/theme/palette.css` / `css/base.css` only.

Colors — always via variables:
- `--primary-color/-hover/-pressed` — brand & main actions (orange stays the only dominant accent)
- `--primary-soft/--surface-active/--primary-glow` — soft selected/active surfaces
- `--bg-color` / `--surface-color` / `--surface-raised` / `--surface-overlay` — page bg / default panels / raised panels & inputs / overlays, dropdowns, dialogs, tooltips
- `--border-color` / `--border-focused` — borders / focus-active borders
- `--text-primary` / `--text-secondary` / `--text-muted` — headings & key values / supporting text / low-emphasis metadata
- `--app-text-inverse` — text on strong filled buttons/badges
- `--success-color/--app-success-bg`, `--danger-color/--app-danger-bg`, `--glovo-color/-dark/-soft`, `--app-info/--app-info-bg` — semantic status colors
- `--app-chart-1..5` — charts
- New palette role → add to `css/theme/palette.css` AND this list, same change. Migrate hard-coded colors to variables when you touch that block.

Typography — existing stacks only:
- `--font-body` — body text, inputs, table cells, descriptions, report content
- `--font-heading` — headings, labels, buttons, tabs, table headers, compact controls
- Letter spacing `0` unless matching an existing uppercase label pattern. Fixed sizes — handle overflow via wrapping/layout, not shrinking text.

Icons via `renderMaterialIcon()` — real ligature names only; a bad name renders as overlapping text, since `.material-symbols-rounded` clips via `overflow: hidden` rather than breaking layout.

## Comment Policy
- No comments in code. None. Not narrative, not a one-line purpose note, not a `ponytail:` marker — the project is vibe-coded, so skip all of it. If code needs explaining, fix naming/structure instead.
- Strip any comments you find in code you touch in passing; don't do a separate cleanup pass unless asked.

## Naming
- Pick the existing word for a concept and use it everywhere — don't introduce a synonym mid-codebase. `location` (matches `locations.json`, `services/locations.js`, `ui/adminLocations.js`) is the canonical term for a food-truck site in the catalog; treat "point" as this file's casual shorthand, not a name to start using in new code or variables.
- Match the CRUD verb set a catalog module already uses (`adminLocations.js`/`adminEmployees.js` use add/rename/visibility-toggle/remove) — don't introduce `create`/`update`/`delete` alongside it for the same catalog.
- Booleans read as assertions: `isArchived`, `hasReport`, `canEdit` — not `archived`, `report`, `editable`.

## Code Size
- Files: soft limit ~400 lines. Past that, split along an existing seam (a sub-tab, a catalog, a render concern) into a new module in the same folder — never into a grab-bag `utils.js`.
- Functions: ~50 lines. Past that, extract named helpers for each distinct step instead of one function doing everything.
- Nesting: max ~3 levels of `if`/`for`/callback. Flatten with early returns/guard clauses instead of adding another level.
- These are splitting triggers, not rewrite triggers — split without changing behavior; don't refactor logic you weren't asked to touch.

## Error Handling
- No empty `catch` and no `catch (e) { console.log(e) }` — every catch either shows a `noticeService`/`dialogService` message or rethrows so the caller can.
- Never let a failed `fetch`/API call resolve to a silent default — surface it through the notice system so whoever's using the panel knows the save or load failed (see Debug on reading catalog-write error messages).

## Working Style
- Full read/write repo access; verify freely — see Never for the confirm-first exceptions.
- Before writing code, climb: reuse an existing util/pattern → stdlib/native feature → an already-installed dependency → shortest correct one-liner (edge-case-correct beats merely shorter). Skip a rung only if the one above genuinely doesn't cover it. New options default to off, no unrequested abstractions.
- A bug report names one symptom — grep every caller of the function you're fixing and patch the shared function once, not just the reported path.
- No unrequested features/options/copy/UI beyond what was asked.
- Match existing patterns (notice system, customControls, catalog model) over a parallel one.
- Terse responses: which files changed and why, in a line or two. No restating the request, no explaining unchanged code.
- State a reasonable assumption in one line and proceed, for anything reversible. Stop and ask instead when the request could reasonably mean two different things, or touches anything in the Never confirm-first list. List any assumption you did make at the top of your summary.
- Keep this file in sync: renaming/moving/deleting a file, adding/removing a service, or changing a catalog field/switch documented here → update every reference in this file in the same change.

## Data & Behavior Notes
- Report dates: `dd.mm.yyyy`; UI form dates: ISO `yyyy-mm-dd`.
- `js/config/data.js` teams are fixed; the generator can add one temporary employee per report (not persisted to `localStorage`, gone on reload/reset).
- Points live in `database/locations.json`, not code: mutable `name`, immutable `path` (folder), `aliases` (keep old report names matched after a rename). Generator, Listy filter, and every stat resolve names through this catalog — new/renamed points need no code change.
- Point switches, independent: `enabled: false` — hidden from generator picker only, still counted/saved. `stats: false` — stays in generator + Listy, dropped from every calculation (`statsData` in `admin.js`). `deleted: true` — archived out of both; files stay untouched in `database/<path>/`; restore reinstates prior switch values.
- Catalog reads prefer the GitHub API over the Pages CDN when a token is configured (`fetchRootCatalog`), since Pages can lag right after a save. `locations.json` carries `updatedAt`; a catalog changed in another tab prompts for confirmation instead of silently reverting.
- Locations may contain Polish characters (e.g. `Oświęcim`) — don't normalize aggressively without checking `database/` paths.
- Changing the JSON data shape requires updating `api.js`, `analytics.js`, `reportFormatter.js`, and the admin panel together.
- Payments live in `database/payments.json` (new catalog; `{ version, updatedAt, items[] }`). Item: mutable `title`, `kind`, `contractor`, `amountTotal`, `dueDate` (ISO), `recurrence`, `note`, `archived`, plus `payments[]` partial payments `{ id, date, amount, note }`. Status and remaining amount are derived in `services/payments.js`, never stored. The Utargi page shows a reminder panel with overdue/due-soon totals and open obligations as a share of the selected period's utarg.
- Generator form state (`localStorage: burbone_state`) expires at local end-of-day — an evening list survives a browser close, resets the next day.
- On localhost `fetchAllData` always merges real `database/` reports with generated data for the last 3 months (`services/mockData.js`); a real report for the same location+date wins. Prod (`GitHub Pages`) never generates.
- Site is meant to stay unindexed: `robots.txt` disallows all, both pages carry `noindex`. GitHub Pages can't send custom headers, so `X-Robots-Tag` would need a proxy/CDN in front.

## Failure Log
This file grows from real mistakes, not anticipated ones. When you get corrected on something specific to this repo, add one line here in the imperative, then keep going. Keep it specific to this repo — general advice belongs in the sections above, not here.
