---
name: BURBONE
description: A dark, warm-charcoal operations console for a two-truck burger business, lit by a single burnt-orange heat source.
colors:
  grill-orange: "#D4521A"
  grill-orange-hover: "#E76A32"
  grill-orange-pressed: "#B74112"
  grill-orange-fill: "#E76A32"
  grill-orange-fill-hover: "color-mix(in srgb, #E76A32 84%, #F2ECE8)"
  ember-wash: "rgba(212, 82, 26, 0.14)"
  ember-soft: "#3A2118"
  ember-deeper: "#2A1A15"
  charcoal-shell: "#151312"
  charcoal-surface: "#1F1B19"
  charcoal-raised: "#28221F"
  charcoal-overlay: "#302824"
  hairline: "rgba(255, 244, 238, 0.14)"
  hairline-strong: "rgba(255, 244, 238, 0.24)"
  bone-white: "#F2ECE8"
  bone-muted: "#C8BAB3"
  bone-dim: "#A3948B"
  lettuce-green: "#7DCE82"
  lettuce-deep: "#1D2D1F"
  tomato-red: "#FF8F82"
  tomato-deep: "#3A1D18"
  glovo-gold: "#F6C85F"
  glovo-deep: "#332714"
  ticket-blue: "#7AB8FF"
  ticket-deep: "#1B2838"
  beet-violet: "#C58CFF"
  iced-cyan: "#9DD9EE"
typography:
  display:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  headline:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  title:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "12px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.grill-orange-fill}"
    textColor: "{colors.charcoal-shell}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.grill-orange-fill-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.grill-orange-pressed}"
  button-secondary:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.charcoal-overlay}"
  button-pill:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "36px"
  button-pill-active:
    backgroundColor: "{colors.grill-orange-fill}"
    textColor: "{colors.charcoal-shell}"
  fab:
    backgroundColor: "{colors.grill-orange-fill}"
    textColor: "{colors.charcoal-shell}"
    typography: "{typography.headline}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  icon-button:
    backgroundColor: "{colors.charcoal-surface}"
    textColor: "{colors.bone-white}"
    rounded: "{rounded.sm}"
    size: "44px"
  chip:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  chip-ember:
    backgroundColor: "{colors.ember-soft}"
    textColor: "{colors.grill-orange-hover}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-white}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "44px"
  input-money:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-white}"
    typography: "{typography.display}"
    rounded: "{rounded.sm}"
    height: "52px"
  card:
    backgroundColor: "{colors.charcoal-surface}"
    textColor: "{colors.bone-white}"
    rounded: "{rounded.md}"
    padding: "24px"
  tile:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.bone-white}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  state-switch-on:
    backgroundColor: "{colors.lettuce-green}"
    textColor: "{colors.charcoal-shell}"
    rounded: "{rounded.sm}"
    height: "38px"
  state-switch-off:
    backgroundColor: "{colors.tomato-red}"
    textColor: "{colors.charcoal-shell}"
    rounded: "{rounded.sm}"
    height: "38px"
  dialog-button-primary:
    backgroundColor: "{colors.grill-orange-fill}"
    textColor: "{colors.charcoal-shell}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  dialog-button-danger:
    backgroundColor: "{colors.tomato-red}"
    textColor: "{colors.charcoal-shell}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
---

# Design System: BURBONE

## Overview

**Creative North Star: "The Ember Console"**

A dark kitchen at night with exactly one heat source. The whole product sits on warm near-black charcoal, and a single burnt-orange ember is the only saturated thing most screens contain. Where the ember appears — a tab, a total, a save button armed with unsaved changes, a Glovo reminder, a day that beat its target — it means *this is the live, actionable number*. Everywhere else the interface is quiet: bone-coloured text, hairline borders, four steps of charcoal, and generous rounding.

The mood is warm industrial and low-light, because the primary usage scene is a phone held at a truck after service, sometimes in the dark, and the secondary is a desktop admin session at the end of the day. Heat is information, not decoration: the accent is never used to make something pretty, only to report state, rank or urgency. Density follows the surface: the generator (`index.html`) is one column of big touch targets, the admin (`admin.html`) is a dense grid of tables, tiles and week cards that still resolves to a single readable column on a phone.

Everything is **tactile and confident**: controls are chunky (44px minimum, pills for anything selectable), pressed states are immediate, and hover performs no lift-shift — the system settles rather than floats. Depth is tonal, not cast: surfaces separate by four charcoal steps and hairline borders, and the only glow in the system is a state glow on the one thing that is currently live or successful. The product is Polish, terse and unpretentious; the interface never explains itself twice.

**Key Characteristics:**
- Four-step warm charcoal shell with hairline separation and no ambient shadow at rest.
- One ember accent, reserved for live state, primaries and success — not for decoration.
- System font stack, hierarchy from size and weight; money, hours and quantities are always tabular.
- Pills for anything the user selects; 6px and 12px radii for containers and fields.
- 44px touch targets and safe-area-aware fixed actions on the phone surface; density only in the admin.
- Material Symbols Rounded, inline and decorative, one icon language on both surfaces.

## Colors

A warm monochrome shell — near-black brown-grey, not blue-grey — with one hot accent and a small set of semantic signals that double as data-series colours.

Every name below maps to a token in `css/theme/palette.css`, which stays the single normative source: **Grill Orange** = `--brand-primary`, **Charcoal Shell** = `--app-bg`, **Charcoal Surface** = `--app-surface`, **Charcoal Raised** = `--app-surface-raised`, **Charcoal Overlay** = `--app-surface-overlay`, **Warm Bone** = `--app-text`, **Bone Muted** = `--app-text-subtle`, **Bone Dim** = `--app-text-muted`, **Hairline** = `--app-border`, **Hairline Strong** = `--app-border-strong`, **Ember Soft** = `--brand-primary-subtle`, **Ember Wash** = `--surface-active`, **Glovo Gold** = `--app-warning`, **Lettuce Green** = `--app-success`, **Tomato Red** = `--app-danger`, **Ticket Blue** = `--app-info`, and the `<name>-deep` steps are the matching `--app-*-bg` surfaces. Code keeps its existing variable names; this file keeps the descriptive ones.

### Primary
- **Grill Orange** (#D4521A): the ember. Active tab and filter pills, primary buttons, the generator's FAB, the `h1`, selected rows and cards, focused borders, progress fills and the glow on live state. It is the only colour allowed to carry "this is the important one".
- **Grill Orange Hover** (#E76A32): hover and glow-adjacent text on ember surfaces, today's date in the calendar, and the text colour on ember-washed chips.
- **Grill Orange Pressed** (#B74112): heatmap's hottest band and pressed feedback on primary controls.
- **Grill Orange Fill** (#E76A32 — `--brand-primary-fill`, aliasing the hover step): the background of every filled ember control — the FAB, the active tab, primary and confirm buttons, the unsaved-changes save button. It exists so inverse text clears AA at 5.74:1 instead of the 4.43:1 that Grill Orange itself yields.
- **Grill Orange Fill Hover** (`color-mix(in srgb, #E76A32 84%, #F2ECE8)`): the hover step for those fills, at 6.72:1 against inverse text.
- **Ember Soft** (#3A2118) / **Ember Deeper** (#2A1A15): the two wash surfaces under selected rows, quantity counters and temporary staff rows — ember reduced to a surface, never to a border-only tint.
- **Ember Wash** (`rgba(212, 82, 26, 0.14)`): the 14%-alpha ember used for selected pills, table-row hover and pressed surfaces.

### Secondary
- **Glovo Gold** (#F6C85F) / **Glovo Deep** (#332714): delivery orders and warnings are the same token. Gold marks anything that needs watching — a missed target, an attendance event, a payment due soon, a product marked as "fried" — and it is what the user reads as "Glovo" in the revenue row.

### Tertiary
- **Lettuce Green** (#7DCE82) / **Lettuce Deep** (#1D2D1F): success and money. Confirmed product toggles, "target hit", total columns, positive deltas, "all obligations settled".
- **Tomato Red** (#FF8F82) / **Tomato Deep** (#3A1D18): destructive and negative. Delete actions, disabled/off location switches, negative deltas, failed saves.
- **Ticket Blue** (#7AB8FF) / **Ticket Deep** (#1B2838): the neutral informational series. Card payments, "current week", calendar events and protein macros.
- **Beet Violet** (#C58CFF) and **Iced Cyan** (#9DD9EE): chart series 5 and 7, and staff-identity colours. They never carry meaning of their own; they exist to keep seven employees and five chart series distinguishable.

### Neutral
- **Charcoal Shell** (#151312): the page. Everything else is a surface on top of it, including the fixed bottom action bar and textarea wells.
- **Charcoal Surface** (#1F1B19): panels and cards — `section-card`, `chart-card`, `table-card`, `summary-box`, tooltip body, dialogs.
- **Charcoal Raised** (#28221F): inputs, tiles, secondary buttons, table headers, chips and popovers.
- **Charcoal Overlay** (#302824): the topmost tonal step — dropdown popovers, modal dialog bodies, hover on raised controls, avatars and archived rows.
- **Warm Bone** (#F2ECE8): primary text and the inverse text on ember/green/red fills.
- **Bone Muted** (#C8BAB3): secondary text — labels, section headings, captions.
- **Bone Dim** (#A3948B): tertiary text — field labels, hints, pagination, disabled text, empty states.
- **Hairline** (`rgba(255, 244, 238, 0.14)`) / **Hairline Strong** (`rgba(255, 244, 238, 0.24)`): every border, divider and control outline.

### Named Rules

**The One Ember Rule.** Grill Orange and its washes cover roughly a tenth of any screen or less. It marks live state, the primary action, rank and success-adjacent emphasis — never a decorative background, never two competing ember elements in one card. Its rarity is what makes it read as heat.

**The No New Hex Rule.** New tints are made with `color-mix()` from a palette value and an existing surface — never a new literal colour outside this file. Every tint in the system is a percentage of Grill Orange, a semantic colour, or a charcoal step.

**The Glovo Gold Is Warning Rule.** Gold means delivery *or* "watch this", and the two never need to be told apart because both mean attention. It is never a general-purpose highlight; that job belongs to the ember.

**The Ember Text Rule.** Grill Orange is a state colour, not a text colour and not a fill. As text on charcoal it measures 3.45–4.43:1, so it is only legible enough at 24px and above, where the large-text threshold applies; at body and label sizes the ember step for text is **Grill Orange Hover** (4.86–5.74:1), which is the project's existing convention for orange labels, active rows and tooltip values. As a *fill* behind text, use **Grill Orange Fill** (5.74:1 with inverse text) — Grill Orange itself is never the background of a control that carries a label, because inverse text on it reaches only 4.43:1.

## Typography

**Display Font:** Segoe UI (with -apple-system, BlinkMacSystemFont, sans-serif)
**Body Font:** Segoe UI (same stack — one family, two roles)
**Icon Font:** Material Symbols Rounded, loaded from Google Fonts, always `aria-hidden`

**Character:** A system-rendered, unshowy pairing of one family against itself. Hierarchy comes from size, weight and a 0.02em label tracking, not from typeface contrast — the surface has to load instantly on a phone at the truck. Because numbers are the content, the system's most typographic decision is tabular figures on every monetary, hourly and quantity value.

### Hierarchy
- **Display** (700, 24px, 1.3): `h1` on both surfaces, the money inputs in the generator, metric-tile values, weekly-card totals, location totals and tooltip hero numbers.
- **Headline** (700, 18px, 0.02em): card and section headings (`h2`/`h3`), the FAB label, bottom-sheet titles, category names, dialog titles when prominent.
- **Title** (700, 14px, 0.02em): compact headings, summary-box `h3`, card titles with an icon, and the base size for buttons and controls.
- **Body** (400, 14px, 1.5): the workhorse. Product and employee names, table cells, help text, generated marketing copy in its textarea, and the report preview.
- **Label** (700, 12px, 0.02em): the field/tile micro-label — uppercase-ish field headers, metric kickers, table `th`, badge and pill text, pagination labels, heatmap values.

### Named Rules

**The Tabular Numbers Rule.** Any value a person might compare down a column — money, hours, quantities, percentages, dates in tables — carries `font-variant-numeric: tabular-nums`. Set it wherever a number is rendered, not on the table as a whole.

**The Two-Size Label Rule.** Labels are either 12px (field and kicker labels, `--text-muted` or `--text-secondary`) or 14px (everything readable). Nothing in the interface renders below 12px except inside chips and badges, where 12px is the floor.

**The No Second Family Rule.** No webfont, no mono face, no display face. The only downloaded font is the icon font; adding a text font costs a request on a phone at a truck.

**The Closed Scale Rule.** Four sizes (24 / 18 / 14 / 12) and two weights (400 / 700) are the entire type scale. There is no fifth size and no 500/600 weight; overflow is solved with wrapping, truncation or layout, never with a new size or a thinner weight.

## Layout

Two container widths, one rhythm. The generator is a single column capped at **600px**; the admin caps at **1240px**. Outer margin is 20–24px with 16–20px side padding, tightening to 12–16px below 700px. Everything vertical is a multiple of the 4px base: 4 / 8 / 12 / 16 / 20 / 24, exposed as `--space-1` … `--space-6`, with 24px between cards and 24px after a card's own 24px padding.

Cards are the container primitive on both surfaces: surface background, 12px radius, 1px hairline, 24px padding (16px under 700px). Repeating content inside them uses `repeat(auto-fit, minmax(…)px, 1fr)` grids — 220px for summary tiles, 200px for weekly cards and calculator inputs, 240px for location cards, 170–180px for payment tiles — so columns reflow without media queries. The admin's dashboard uses an explicit `2fr 1fr` split that collapses to one column under 1000px, and the catalog pages use a `380px / 1fr` list-and-preview split that stacks under 760px.

The generator is phone-first: the revenue fields are three columns above 700px and one column below; the product grid is one column becoming two at 768px; time inputs are fixed at 105px so the two clock fields align under a thumb. Its only persistent action is the fixed bottom bar (`.floating-bar`, z-index 90) holding the primary FAB and the reset icon-button, padded with `env(safe-area-inset-bottom)`, with a 100px `.spacer-bottom` so content never hides under it. Touch targets are never below 44px (`--control-height`), with 40px (`--control-h-md`) for compressed admin controls and 36px (`--control-h-sm`) only for week tabs, pagination and chart selects.

Breakpoints in use: 440px (admin tabs to one column), 600px (dialogs go full width), 640px / 700px (table and generator density, heatmap gaps tighten to 4px), 760px (admin rows stack, catalog splits collapse), 900px (period bar and header actions stack, load-all grid collapses), 1000px (dashboard to one column).

### Named Rules

**The 40px Rule.** No interactive target measures under 40×40px. The generator's tabs, quantity steppers and header links sit at 40–46px, its fields and selects at 44–45px, and the FAB and sheet rows at 56px; the admin's compressed week tabs, pagination and chart selects stop at 36px. Icon actions keep a 44px hit area even when the glyph is 20px.

**The One Action Bar Rule.** The generator has exactly one persistent action area, the fixed bottom bar. New actions go into a card or the bottom sheet — never a second floating control.

**The Safe-Area Rule.** Anything fixed to a viewport edge pads with the matching `env(safe-area-inset-*)`: the generator's bottom bar and sheet, the admin toast layer at the top.

## Elevation & Depth

The system is **flat at rest and tonal by construction**. Depth is carried by four charcoal steps in fixed order — shell → surface → raised → overlay — plus hairline borders, so a card is a surface lift and an input is a step above it. There is no ambient shadow theatre: `--shadow-raised` is a 1px drop plus a 0.04-alpha white inner ring, which reads as a seam rather than a cast shadow, and the overrides file actively strips `transform` and `box-shadow` from hover states across buttons, cards and rows.

Shadow survives in only two jobs: detaching an overlay from the page, and glowing the one live thing. Overlays (popovers, dialogs, tooltips, drag ghosts, the icon picker) get `--shadow-overlay`; primary, active and success states get a `--primary-glow` halo or a success-tinted glow. The loader, the target tile and the heatmap's top two bands use animated glows; each is disabled under `prefers-reduced-motion: reduce`, as are all transitions in the system.

### Shadow Vocabulary
- **Seam** (`box-shadow: 0 1px 1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 244, 238, 0.04)`): `--shadow-raised`. The default for cards, panels, tiles and the header bar. Reads as a hairline, not a lift.
- **Overlay** (`box-shadow: 0 12px 28px rgba(0, 0, 0, 0.46), 0 0 0 1px var(--app-border)`): `--shadow-overlay`. Popovers, dialogs, tooltips, toasts, drag ghosts.
- **Ember Glow** (`box-shadow: 0 4px 15px var(--primary-glow)`): the FAB, active pills, `has-unsaved-changes` on save. Always implies "live".
- **Success Glow** (`box-shadow: 0 0 18px color-mix(in srgb, var(--success-color) 22%, transparent)`): target hit and the clean/loaded load button.
- **Focus Ring** (`box-shadow: 0 0 0 2px var(--primary-hover)`): `--focus-ring`, on `:focus-visible` for inputs, buttons, links and custom controls. Never removed without an equivalent.
- **Scrim** (`background: color-mix(in srgb, var(--bg-color) 78%, transparent)`): the single overlay dim behind sheets, dialogs and the icon picker.

### Named Rules

**The Flat-By-Default Rule.** Surfaces do not lift on hover and do not cast ambient shadows. If something needs attention, change its border colour, its background step, or give it an ember glow — do not add a drop shadow.

**The Glow Means State Rule.** A glow is never styling. It appears only on the primary or active control, a success state, or an overlay that must detach from the page.

**The No Cast Light Rule.** No gradients, no backdrop blur, no stacked shadow effects, no skeuomorphic surfaces. Depth is tone and hairline; the only filter in the system is the `drop-shadow` glow on the attention icon, which is a state, not a material.

## Shapes

Soft rectangular, with pills for interaction. Two radii do nearly all the work: **6px** (`--radius-sm`) for anything you type into or act with — inputs, selects, buttons, chips-with-text, small rows, popovers, nav buttons — and **12px** (`--radius-md`) for anything you look into, i.e. cards, tiles, panels, cells, dialogs and the bottom sheet's top corners. **999px** (`--radius-pill`) is the interaction signature: generator tabs and week tabs, filter and status chips, quantity counters, badges, progress bars, the FAB and the scrollbar thumb.

Circles are reserved for three identities: the staff avatar, the location rank, and the round icon button. Dashed borders carry a second, consistent meaning: *add* (the temporary-worker row, the empty product note), *empty* (empty heatmap cell, empty payments panel) and *archived* (deleted locations and payment rows). There is exactly one illustration in the system — the burger loader, five stacked rounded bars (bun, lettuce, cheese, patty, base) built from palette values and floated in a glowing ember halo.

### Named Rules

**The Pill Means Selectable Rule.** A pill shape means the user picks it: tabs, filters, week selectors, counters, badges. Outlined rectangles mean fields, actions and containers — never selection.

**The Dashed Means Provisional Rule.** Dashed borders indicate absence, invitation or archive — never a normal state.

## Components

### Buttons
- **Shape:** 6px radius, 14px/700 label type, no tracking changes between variants. Minimum height 44px, 40px for compressed admin buttons, 36px for week tabs.
- **Primary:** Grill Orange Fill with Charcoal Shell text (`--app-text-inverse`). One per view: the generator FAB ("Skopiuj listę"), the cart's add button, dialog confirm, save with unsaved changes. Hover steps to Grill Orange Fill Hover; the save button also gains an ember glow.
- **Secondary:** Charcoal Raised fill, Hairline border, Warm Bone text — back/admin links, burger actions, "Zobacz wszystkie". Hover raises the step to Charcoal Overlay and the border to Hairline Strong.
- **Pills:** The tab, week-tab, view-toggle, filter-chip and payment-action family. Inactive: Charcoal Raised with Bone Muted text. Hover: ember border, Warm Bone text, no transform. Active: Grill Orange fill, Charcoal Shell text, `0 4px 15px` ember glow.
- **Icon actions:** 38–44px square, 6px radius, Charcoal Raised fill, Bone Muted glyph. Hover takes the ember border; `--danger` hover takes the tomato border for delete/remove; `--move` is pre-tinted ember-soft to advertise draggability.
- **State switches:** filled, not sliding — Lettuce Green ("Włączona"/on) or Tomato Red ("Wyłączona"/off) with inverse text, gold when a third state exists.

### Chips
- **Style:** pill, 4px/8px padding, 12px/700 label, Charcoal Raised on Hairline.
- **State:** ember-tinted on selection (`chip-ember` / `--accent`), Lettuce/Ember/Tomato tinted for status flags (weekly "best"/"worst"/"top", payment status badges), `currentColor`-derived for the burger macro chips (kcal = ember, protein = blue, fat = gold, carbs = green).

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** Charcoal Surface for cards and panels; Charcoal Raised for nested tiles, table heads and repeated rows.
- **Shadow Strategy:** Seam only — flat by default, no hover lift (see Elevation & Depth).
- **Border:** 1px Hairline, in ember at 38–48% mix when the card is the lead/selected one.
- **Internal Padding:** 24px (`--space-6`), 16px under 700px, 12px for compact rows. Cards never nest inside cards; repeated items inside a card are tiles or dashed rows.

### Inputs / Fields
- **Style:** Charcoal Raised fill, 1px Hairline (Hairline Strong on the wrapping input groups), 6px radius, 44px minimum height, Warm Bone text. Money inputs are 24px/400, right-aligned, tabular, with a Bone Dim `PLN` prefix inside the same wrapper. Field labels are 12px/700 heading-font, Bone Muted.
- **Focus:** no outline; the wrapper takes `box-shadow: var(--focus-ring)` and an ember-mixed border. The Glovo field variant focuses in gold instead of ember.
- **Disabled / Invalid:** `opacity: .55` plus `cursor: not-allowed` on the fieldset; `aria-invalid` switches the border to Tomato Red. Clearable fields expose a 44px clear affordance that appears only when there is a value.
- **Hidden native controls:** where a native control sits behind a custom visual, the native input stays focusable at 1×1px with `opacity: 0` (never `display: none`), carries an `aria-label`, and its focus is surfaced on the visible wrapper with `:focus-within` — the product toggle cards use exactly this, so the checkbox is reachable by keyboard and the card shows the ember ring.

### Navigation
- **Header bar:** Charcoal Surface (admin: Charcoal Raised), 12px radius, hairline, 20–24px padding; a 42px rounded-square logo, the 24px ember `h1` wordmark, an optional Bone Muted subtitle line, and one pill action link on the right (`Admin` on the generator, `Wyloguj` in the admin). Under 900px it stacks with the brand block centred.
- **Generator tabs:** 3-up grid of pills (Lista / Burgery / Wynagrodzenia) — one column under 700px — with the active tab filled ember and glowing. They are a real tablist: each tab carries an `id`, `aria-selected` (kept in sync by the switcher) and `aria-controls`, pointing at panels that carry `role="tabpanel"`, `aria-labelledby` and `tabindex="0"`.
- **Admin page tabs:** 2-up grid of 6px-radius outlined buttons, one column under 440px, ember-filled when active; the week selector beneath is a scrollable strip of pills inside a raised track.
- **Custom controls:** native `select`/`date`/`time` are replaced by `.custom-control` — a raised 6px button with a Bone Dim chevron that opens a Charcoal Overlay popover of rows, or a custom calendar with a 7-column grid, today highlighted in ember, and count markers for days that already have a report.

### Dialogs & Overlays
- **Scrim:** one dim for every layer — `color-mix(in srgb, var(--bg-color) 78%, transparent)` — behind sheets, dialogs, the icon picker and the tooltip.
- **Dialog surface:** Charcoal Overlay for the compact confirm/prompt dialog (`min(420px, 100%)`), Charcoal Surface for the wide pickers (`min(720px, 100%)`, up to `88vh` tall), 12px radius, `--shadow-overlay`, 20px padding. Below 600px the layer padding drops to 12px and the dialog goes full width.
- **Anatomy:** an 18px heading (24px in the prominent variant, which also widens to `min(520px, 100%)` and sets its input at 18px), an optional 14px explanation in Bone Muted, a `notice--dialog` slot for inline error text, then a right-aligned action row. `--danger` / `--success` variants recolour only the heading; the confirm button carries the matching fill, and the prompt input's `aria-invalid` border is Tomato Red.
- **Z-index tiers:** content < floating bar (90) < sheet scrim (98) < sheet (99) < custom-control popover (140) < icon picker (150) < dialog layer (100000) < floating popover (100020) < toast (100030) < top progress bar (100000).
- **Bottom sheet (mobile form):** Charcoal Surface, 12px top corners, a 40×4px hairline handle, 24px padding plus the bottom safe-area inset, and full-width 12px-radius action rows — the destructive row tinted Tomato Deep. Enters with `transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)`, disabled under reduced motion.
- **Tooltips:** Charcoal Overlay, 12px radius, `--shadow-overlay`, and a 4px Grill Orange left edge as their only chrome — the system's one asymmetrical border.

### Feedback & Empty States
- **Notices:** the only feedback channel. A 12px row — icon, optional 12px/700 title, text — at 6px radius, tinted by mixing the semantic colour against Charcoal Raised (info, success, danger, warning, muted, loading). `--sm` tightens padding to 8px; `--lg` opens it to 16px at 14px text with a 12px radius.
- **Toasts** anchor top-centre in the safe area, `min(420px, calc(100vw - 32px))` wide, carry `--shadow-overlay`, and dismiss on a 44px close affordance. The loading variant swaps in a spinning ember icon and a 5px indeterminate bar.
- **Status cards:** for a failed load or a blocked state — a centred grid at `min(34rem, 100vw - 32px)`, a 52px icon tile, an 18px title and one explanatory line; the danger variant tints the icon tile and border.
- **Empty states:** a 1px dashed hairline on Charcoal Raised, centred Bone Muted text, never a blank panel. Large empties (`admin-list-empty`) run to 260px tall with a 24px ember icon and an 18px bold line; small ones (payments, burger ingredients, locations) are a single padded row. A chart with no data hides its canvas and centres its icon and message instead.

### Signature Components
- **The burger loader:** the app's only illustration and its loading state on both surfaces — five stacked rounded bars in bun-orange, lettuce-green, cheese-gold, patty-ember and base-orange, floating inside a pulsing ember halo above a 3px indeterminate progress track. It is the one place where the palette is used decoratively, and it is still built from the palette.
- **Tabular metric tiles:** the admin's reading unit — a 12px kicker label, an icon, a 24px tabular value, and a hint or delta line. State is expressed by the value's colour (ember for revenue, green for totals, gold for watch, Tomato Red for negative) plus a mixed border, never by a background the eye has to decode twice.
- **The heatmap cell:** a square, 12px-radius cell whose ember mix encodes the day's revenue band, with day-of-month, value, and up to two staff-initial badges; the top two bands add a glow. Empty days are dashed and inert; weekends and holidays are explained by a tooltip that keeps its ember left edge and `--shadow-overlay`.

## Do's and Don'ts

### Do:
- **Do** pull every colour through the tokens in `css/theme/palette.css`; tint with `color-mix()` against a surface token (e.g. `color-mix(in srgb, var(--primary-color) 14%, var(--surface-raised))`).
- **Do** use Grill Orange Hover for orange text at body and label sizes, and Grill Orange itself only as a fill, a state or a 24px-and-up heading.
- **Do** reserve Grill Orange for live state, primary action, selection and success-adjacent emphasis, at roughly a tenth of the screen or less.
- **Do** keep targets at 40px or larger — 44px for inputs and primary actions, 36px for the admin's compressed controls — and pad fixed edges with `env(safe-area-inset-*)`.
- **Do** render every comparable number with `font-variant-numeric: tabular-nums`, and give each value its state through colour plus one hairline, not a filled block.
- **Do** use pills for anything selectable, 6px for fields and actions, 12px for containers, and dashed borders only for add/empty/archived.
- **Do** keep depth tonal and flat: change border tone, background step or add an ember/success glow.
- **Do** honour `prefers-reduced-motion: reduce` for every transition, glow, confetti and loader animation.
- **Do** theme the browser's own surfaces from the palette — scrollbars, text selection (`::selection`) and focus rings all carry design, and the caret already inherits the text colour.
- **Do** gate feedback through `noticeService` / `dialogService` with the semantic `--info/--success/--danger/--warning/--muted/--loading` treatments, and keep icons `aria-hidden` with real Material Symbols ligature names.

### Don't:
- **Don't** introduce a hex, `rgb()` or `hsl()` literal outside `css/theme/palette.css`.
- **Don't** add a text webfont, a second family or a mono face; the system stack plus Material Symbols is the whole type budget.
- **Don't** lift surfaces on hover, add ambient shadows to cards, or animate `transform` on buttons and rows — the overrides deliberately strip these.
- **Don't** use Glovo Gold as a general highlight, or Lettuce Green / Tomato Red for anything other than success/money and destructive/negative.
- **Don't** put cards inside cards; repeated content inside a card is a tile, a row or a list item.
- **Don't** use native `alert`/`confirm`/`prompt`, or native `select`/`date`/`time` popups — the custom control layer owns those interactions.
- **Don't** render a value below 12px, or set a label in body weight; labels are 12px/700 with 0.02em tracking.
- **Don't** reach for a fifth type size, a third weight, a gradient, a backdrop blur or a stacked shadow to solve a density or emphasis problem.
- **Don't** add a second floating action on the generator or hide the fixed action bar to make room for content.
