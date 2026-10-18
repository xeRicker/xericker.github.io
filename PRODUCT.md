# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — shift staff at a food truck, on a phone, during or right after service.**
They record the day's numbers at the truck and hand the result off to the team on Messenger. Their job: enter the day's takings, who worked and for how long, and what was sold, then get a ready-to-paste report list without typing prose.

**Secondary — the owner/manager, on desktop in `admin.html`.**
Their job: check how each truck performs (takings, card vs cash, Glovo) per day, week, month or custom range; track hours, wages and supplier payments; produce Instagram/Messenger post copy; and keep the catalogs (locations, employees, products, burgers, payments) current.

Both audiences are internal — staff and owner of the same small business, Polish-speaking.

## Product Purpose

BURBONE runs burgers from food trucks in Małopolska. The site is the operations tool for that business, in two surfaces:

- `index.html` — the daily operations generator. One flow (revenue, team, burgers, ingredients, hours) that ends in a copyable report list.
- `admin.html` — the admin panel. Analytics over the accumulated reports plus catalog management.

It exists because the numbers were otherwise kept by hand and rewritten for chat every day. Success means a shift closes out in a couple of minutes on a phone, and the owner can trust the totals without re-adding anything.

This is a live system holding the real business data: actual takings, hours, wages and payment records.

## Positioning

A single static site that is simultaneously the data entry tool, the reporting layer and the analytics dashboard for one food-truck business — with no backend and no separate data store. Its mechanism is a `database/` tree of `database/<location>/<dd.mm.yyyy>.json` reports plus JSON catalogs, read and written straight from the browser: locally through `dev-server.js`, in production through the GitHub API. A report is the unit of truth, and every view (daily list, heatmap, wages, payments) is derived from those files rather than from a parallel database.

## Operating Context

- Two active trucks: **Oświęcim** (12:00–21:00, phone 783 969 572, Glovo delivery) and **Osiek** (14:00–20:00, phone 663 141 122, no Glovo). Wilamowice and Kęty exist as locations but are switched off.
- Revenue is split three ways per day: total, card payments, Glovo orders. Cash desk is derived.
- The pasted report list carries the location, the date, the staff and the products — deliberately **not** the day's takings. Revenue stays in the report file and in the admin; the list is what goes to the team on Messenger. Do not "fix" this by adding Utarg/Karty/Glovo to the generated text.
- Daily revenue target is configured in `database/settings.json` (currently 2000 PLN).
- Staff are picked from a catalog; a one-shift extra worker can be added for a single day and is never persisted.
- Wage tracking is a rate (PLN/h) applied over a date range, with hours summed per employee and split across locations.
- Supplier payments (fees and installments) are tracked with a status and remaining amount that are always derived, never stored.
- Marketing post generation is part of the admin: burger, location-reminder, Glovo-reminder, promo and behind-the-scenes posts, with Instagram variants, hashtags, prompts and CTAs.
- Admin work favors desktop; the generator favors a phone at the truck.

## Capabilities and Constraints

- **Web app, static hosting, no server.** Production is GitHub Pages; the build only injects the GitHub token into `js/config/config.js`. A local JSON `PUT` endpoint exists in `dev-server.js` for development.
- **Writes go through `services/api.js`** using the GitHub API. Reads prefer the GitHub API over the Pages CDN when a token is configured, because Pages lags after a save.
- **UI copy is Polish; code identifiers are English.** No second language, no i18n layer.
- **Must stay unindexed:** `robots.txt` disallow plus `noindex` on both pages.
- **The `database/` JSON shape is fixed.** Changing it requires updating `api.js`, `analytics.js`, `reportFormatter.js` and the admin panel together. Report filenames are `dd.mm.yyyy`; forms use ISO `yyyy-mm-dd`.
- **Locations carry three independent switches:** `enabled` (generator picker only), `stats` (in or out of every calculation, still listed) and `deleted` (archived from both, files kept, restore reinstates the prior switches). `path` is the immutable folder name and is derived by `slugifyLocation`, never typed; `name` is mutable and `aliases` keep old report names matched after a rename. Names contain Polish characters (`Oświęcim`) and paths must not be normalized.
- **Admin is password-gated** (`services/auth.js`: PBKDF2-HMAC-SHA-256, 210k iterations, compared in constant time), with a 24-hour local session. On localhost the gate is bypassed.
- **Local development merges generated mock reports** for the last three months; a real report for the same location and date always wins. Production never generates mock data.
- **Generator state** lives in `localStorage` under `burbone_state` and expires at local end-of-day.
- Standard browser data volumes only: an admin load can pull 3, 6, 12 months or everything, and panels paginate.

## Brand Commitments

- Name **BURBONE**; the truck business is presented as two trucks, one grill.
- Voice is Polish, direct and unpretentious, tolerant of a joke, never corporate: short sentences, concrete nouns, no marketing filler. Staff-facing labels state what the action does; post copy talks to a hungry person nearby. "Bez ściemy", "Bez rezerwacji i ceregieli" is the register.
- The existing marketing templates in `js/config/marketing.js` (post bodies, CTAs, questions, Instagram variants, hashtags) are the sanctioned voice and stay the source for generated copy.
- The burger itself is treated as craft: fresh ingredients cut on the day, meat grilled only after the order.
- Aesthetic rules live in `DESIGN.md` and are not restated here.

## Evidence on Hand

- Real report data under `database/<location>/` for the active trucks, plus the catalogs `locations.json`, `employees.json`, `products.json`, `payments.json`, `settings.json` and `burgers.json` — including real per-burger macro data (kcal, protein, fat, carbs) used by the burger configurator.
- Real contact details, opening hours and delivery coverage in `js/config/marketing.js`.
- `js/services/mockData.js` generates synthetic reports for local development only; mock data is never real evidence and must not be presented as actual business figures.
- Absent: customer testimonials, press, ratings, certifications, legal/fiscal claims of any kind. Do not invent them. Wages, payments and takings shown in the UI come from the data files, never from sample prose.

## Product Principles

1. **The report file is the truth.** Every number a person sees is derived from the day's report JSON; no parallel store, no cached totals presented as authoritative.
2. **Close out a shift in minutes, on a phone.** The generator is the daily path and keeps its form state; extra steps, confirmations or options there need to earn their cost.
3. **Derive what can be derived.** Statuses, cash desk, percentages and remaining balances are computed from stored facts rather than entered twice.
4. **Internal tool, precise language.** Labels name the real outcome; if a label needs a second sentence the layout is wrong. Polish, terse, no filler.
5. **Failures are visible and actionable.** A failed save or read surfaces a message the user can act on and never resolves silently into a default.
6. **One business, one identity.** Both surfaces look and behave like the same product; patterns are reused rather than reinvented per panel.

## Accessibility & Inclusion

Standing expectations already enforced in the codebase and expected to hold: every control is keyboard reachable with a visible focus state, icons are decorative (`aria-hidden`) with ligature names that actually exist, sortable tables and tabs expose their state through ARIA, dialogs are modal and labelled, and native `alert`/`confirm`/`prompt` or native `select`/`date`/`time` popups are not used. Touch targets stay comfortable on a phone without losing the density the admin needs.
