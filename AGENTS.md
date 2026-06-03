# Burbone Site Context

## Project Goal

Static Burbone app for generating daily operations lists and an admin dashboard for revenue, employee hours, products, and saved reports. The site runs on GitHub Pages. Locally it can use `dev-server.js` to persist JSON files through `PUT`.

## Stack

- Static HTML: `index.html`, `admin.html`
- JavaScript: ES modules without a bundler
- CSS: imported through `style.css`
- Data: JSON files in `database/<location>/<dd.mm.yyyy>.json`
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
├── style.css
├── dev-server.js
├── css/
│   ├── atlassian-tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── generator.css
│   ├── admin.css
│   ├── admin-products-lists.css
│   ├── feedback.css
│   ├── components/custom-controls.css
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
│   │   ├── products.js
│   │   ├── reportDates.js
│   │   ├── reportFormatter.js
│   │   ├── revenue.js
│   │   ├── storage.js
│   │   ├── trivia.js
│   │   └── weather.js
│   └── ui/
│       ├── adminLists.js
│       ├── adminProducts.js
│       ├── adminRender.js
│       ├── mainRender.js
│       ├── payrollCalculator.js
│       ├── shared.js
│       └── components/customControls.js
└── database/
    ├── products.json
    ├── default.json
    └── <location>/*.json
```

## Responsibilities

- `js/main.js`: report generator logic, generator/employees tabs, one-shift temporary employee, persistent form state.
- `js/admin.js`: admin dashboard controller, filters, admin tabs, revenue view, calculator.
- `js/ui/adminLists.js`: saved lists view, filtering, report preview, report copying.
- `js/ui/adminProducts.js`: product catalog editing, ordering, types, active state, saving.
- `js/ui/adminRender.js`: summaries, charts, tables, heatmap, tooltips.
- `js/ui/payrollCalculator.js`: shared hours calculator for the main page and admin.
- `js/ui/components/customControls.js`: custom `select`, `date`, `time`, and dialog controls. Do not use `alert`, `confirm`, `prompt`, or native pickers as UI.
- `js/services/reportDates.js`: shared report date parsing, report keys, date sorting.
- `js/services/api.js`: read/write through the GitHub API or local dev server.
- `js/services/analytics.js`: daily report aggregation and statistics.

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
- Locations may include Polish characters, for example `Oświęcim`. Do not normalize them aggressively without checking paths in `database/`.
- Do not change the JSON data structure without updating `api.js`, `analytics.js`, `reportFormatter.js`, and the admin panel.
