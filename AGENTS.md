# Burbone Site Context

## Project Goal

Static Burbone app for generating daily operations lists and an admin dashboard for revenue, employee hours, products, and saved reports. The site runs on GitHub Pages. Locally it can use `dev-server.js` to persist JSON files through `PUT`.

## Stack

- Static HTML: `index.html`, `admin.html`
- JavaScript: ES modules without a bundler
- CSS: imported through `style.css`
- Data: JSON files in `database/<location>/<dd.mm.yyyy>.json`
- Catalogs: `database/locations.json` (points), `database/employees.json` (team), `database/products.json` (products)
- Charts: Chart.js from CDN on the admin page
- Icons: Google Material Symbols Rounded
- Design tokens: local Atlassian token set in `css/atlassian-tokens.css`
- Active app palette: Burbone aliases in `css/theme/palette.css`

## File Tree

```text
.
├── AGENTS.md
├── index.html
├── admin.html
├── robots.txt
├── style.css
├── dev-server.js
├── css/
│   ├── atlassian-tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── generator.css
│   ├── burgers.css
│   ├── admin.css
│   ├── admin-products-lists.css
│   ├── admin-employees.css
│   ├── admin-locations.css
│   ├── feedback.css
│   ├── components/
│   │   ├── custom-controls.css
│   │   └── notice.css
│   └── theme/
│       ├── palette.css
│       └── atlassian-overrides.css
├── js/
│   ├── main.js
│   ├── admin.js
│   ├── utils.js
│   ├── config/
│   │   ├── config.js
│   │   └── data.js
│   ├── services/
│   │   ├── analytics.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── employees.js
│   │   ├── locations.js
│   │   ├── products.js
│   │   ├── reportDates.js
│   │   ├── reportFormatter.js
│   │   ├── revenue.js
│   │   ├── storage.js
│   │   ├── trivia.js
│   │   └── weather.js
│   └── ui/
│       ├── adminEmployees.js
│       ├── adminLists.js
│       ├── adminLocations.js
│       ├── adminProducts.js
│       ├── adminRender.js
│       ├── burgerConfigurator.js
│       ├── mainRender.js
│       ├── payrollCalculator.js
│       ├── shared.js
│       └── components/
│           ├── Card.js
│           ├── customControls.js
│           └── notice.js
└── database/
    ├── locations.json
    ├── employees.json
    ├── products.json
    ├── burgers.json
    └── <location>/*.json
```

## Responsibilities

- `js/main.js`: report generator logic, generator/employees tabs, one-shift temporary employee, persistent form state.
- `js/admin.js`: admin dashboard controller, filters, admin tabs, revenue view, calculator, point-catalog mapping of loaded reports. Keeps `sourceData` (raw reports), `allData` (without archived points, feeds Listy) and `statsData` (points included in statistics, feeds every calculation).
- `js/ui/adminLists.js`: saved lists view, filtering, report preview, report copying.
- `js/ui/adminProducts.js`: product catalog editing, ordering, types, active state, saving.
- `js/ui/adminEmployees.js`: team catalog editing (add, rename, visibility, remove).
- `js/ui/adminLocations.js`: point catalog editing (add, rename, generator visibility, statistics switch, archive/restore), including the folder that keeps the archive in place.
- `js/ui/adminRender.js`: summaries, charts, tables, heatmap, tooltips.
- `js/ui/payrollCalculator.js`: shared hours calculator for the main page and admin. Rate and date fields stay disabled until an employee is chosen, and EKIPA-hidden people are not listed.
- `js/ui/components/customControls.js`: custom `select`, `date`, `time`, and dialog controls. Do not use `alert`, `confirm`, `prompt`, or native pickers as UI. It mirrors the native `disabled` state onto the visible control.
- `js/ui/components/notice.js` + `css/components/notice.css`: the single message system. Every user-facing message (inline notice, dialog notice, page-level status card) uses `.notice--<variant>` with `info`, `success`, `danger`, `warning`, `muted`, or `loading`; icons and colors come from the variant. Add new messages through `noticeService.render()` or `dialogService.alert/success/error/warning`, never as a bespoke styled element.
- `js/services/reportDates.js`: shared report date parsing, report keys, date sorting.
- `js/services/api.js`: read/write through the GitHub API or local dev server. Report paths use the point folder from the catalog.
- `js/services/locations.js`: point catalog model — normalizing, matching report names to points (name, folder, aliases), generator visibility, statistics switch, panel filters.
- `js/services/employees.js`: team catalog model — normalizing, resolving report names to people, visibility checks.
- `js/services/auth.js`: admin password check. Keep only the PBKDF2 salt and digest in the source; never put the plaintext password back.
- `js/services/analytics.js`: daily report aggregation and statistics. Per-point keys are derived from the point name, so a new point needs no code change.

## Design Direction

The app should feel like a calm, utility-first, dark Atlassian-style dashboard adapted to Burbone's current warm brand palette: compact radii, clear controls, dense admin views, and consistent typography. Prefer the active aliases from `css/theme/palette.css` and `css/base.css`; do not introduce unrelated colors or font stacks.

## Color System

All UI colors must come from the current palette and token aliases. New CSS should use variables, not raw hex/rgb values, unless the variable is being defined inside `css/theme/palette.css`.

Primary color roles:

- Brand primary and main actions: `--primary-color`, `--primary-hover`, `--primary-pressed`
- Soft selected/active brand surfaces: `--primary-soft`, `--surface-active`, `--primary-glow`
- Page background: `--bg-color`
- Default panels/cards/tables: `--surface-color`
- Raised panels, inputs, and grouped controls: `--surface-raised`
- Overlays, dropdowns, popovers, dialogs, and tooltip backgrounds: `--surface-overlay`
- Borders: `--border-color`, stronger focus/active borders: `--border-focused`
- Large text, headings, primary values, table primary cells: `--text-primary`
- Supporting/small text, descriptions, labels: `--text-secondary`
- Muted metadata, placeholders, secondary captions: `--text-muted`
- Inverse text on strong filled buttons or bright badges: `--app-text-inverse`
- Success states and positive totals: `--success-color`, `--app-success-bg`
- Danger/destructive states: `--danger-color`, `--app-danger-bg`
- Warning/Glovo states: `--glovo-color`, `--glovo-dark`, `--glovo-soft`
- Information states: `--app-info`, `--app-info-bg`
- Charts: `--app-chart-1` through `--app-chart-5`

Color rules:

- Keep Burbone orange (`--brand-primary` / `--primary-color`) as the only dominant brand accent.
- Use semantic variables for status colors instead of custom reds, greens, yellows, or blues.
- Use `--surface-overlay` for tooltip and popover backgrounds so floating UI matches dialogs and menus.
- Use `--text-primary` for important text and metrics, `--text-secondary` for readable supporting text, and `--text-muted` only for low-emphasis metadata.
- Use `color-mix()` only when deriving a transparent or hover state from an approved variable.
- Do not add new palette roles without updating this section and `css/theme/palette.css`.
- When touching older CSS with hard-coded colors, prefer migrating the touched block to the approved variables.

## Typography System

All typography must use the existing font library. Do not add custom font families or ad hoc font stacks.

Font roles:

- App body, paragraphs, inputs, table cells, descriptions: `--font-body`
- Headings, labels, buttons, tabs, table headers, compact UI controls: `--font-heading`
- Code-like technical values only: `--ds-font-family-code`
- Atlassian full text styles may be used when a complete size/weight/line-height token is needed: `--ds-font-heading-*`, `--ds-font-body`, `--ds-font-body-small`, `--ds-font-metric-*`

Typography rules:

- Use `--font-heading` for controls and UI labels that need stronger hierarchy.
- Use `--font-body` for all editable fields, descriptions, table content, helper text, and report content.
- Metrics and dashboard numbers should use heading/metric tokens, with color determined by the Color System.
- Keep letter spacing at `0` unless matching an existing local uppercase label pattern.
- Do not scale font size with viewport width. Use fixed sizes with responsive layout changes.
- Text must fit its container on mobile and desktop; prefer wrapping or layout changes over shrinking text aggressively.

## UI Rules

- All form controls should look like project components. `select`, `date`, and `time` should go through `enhanceCustomControls()`.
- Use `dialogService` from `customControls.js` for dialogs; do not use browser `alert`, `confirm`, or `prompt`.
- Use Material Symbols in buttons through `renderMaterialIcon()` or existing Material Symbols markup.
- Do not add decorative cards inside cards. Cards are for repeated items, tables, panels, and modals.
- When changing CSS, check mobile because the admin page has dense grids and fixed row actions.

## Local Development

Run locally with:

```bash
node dev-server.js
```

The server handles static files and local JSON writes. The site can open without it, but `PUT` saves will not work.

## Change Notes

- When changing JS files imported by HTML, bump the query string `?v=...` because there is no bundler.
- Before adding shared logic, check `js/services/` and `js/ui/components/`.
- Report data dates use `dd.mm.yyyy`; UI form dates use ISO `yyyy-mm-dd`.
- Teams in `js/config/data.js` are fixed, but the generator allows adding a temporary employee for the current report. That employee is not saved to `localStorage` and disappears after reload/reset.
- Points come from `database/locations.json`, not from code. A point has a mutable `name` and an immutable `path` (the folder in `database/`), plus `aliases` that keep old report names attached to the same point after a rename. The generator, the point filter in Listy and every statistic resolve report names through this catalog, so renaming or adding a point needs no code change.
- Point switches are independent: `enabled: false` hides the point only from the generator's point picker (its data still counts in statistics and stays in saved lists), `stats: false` keeps it in the generator and in Listy but drops it from every calculation (dashboard, comparison, hours table, payroll calculator — `statsData` in `admin.js`). `deleted: true` archives the point: out of both, while all its JSON files stay in `database/<path>/` untouched. Restoring brings back the previous switch values.
- Catalog edits are re-derived from the raw reports (`sourceData`) on every save, so archiving and restoring a point does not lose the loaded data.
- Locations may include Polish characters, for example `Oświęcim`. Do not normalize them aggressively without checking paths in `database/`.
- Do not change the JSON data structure without updating `api.js`, `analytics.js`, `reportFormatter.js`, and the admin panel.
- Generator form state in `localStorage` (`burbone_state`) expires at the end of the local calendar day, so a list started in the evening survives closing the browser and resets the next day.
- The site is meant to stay out of search results: `robots.txt` disallows everything and both pages carry `<meta name="robots" content="noindex, ...">`. GitHub Pages cannot send custom headers, so an `X-Robots-Tag` would only be possible behind a proxy/CDN.
