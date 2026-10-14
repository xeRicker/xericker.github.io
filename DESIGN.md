---
name: Burbone
description: Dark, dense operations hub for a burger restaurant. One neon-orange accent signals action and state.
colors:
  brand-orange: "#D4521A"
  brand-orange-hover: "#E76A32"
  brand-orange-pressed: "#B74112"
  brand-orange-subtle: "#3A2118"
  app-black: "#151312"
  surface-dark: "#1F1B19"
  surface-raised: "#28221F"
  surface-overlay: "#302824"
  text-primary: "#F2ECE8"
  text-secondary: "#C8BAB3"
  text-muted: "#94847C"
  success: "#7DCE82"
  danger: "#FF8F82"
  warning: "#F6C85F"
  info: "#7AB8FF"
typography:
  display:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.app-black}"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  card:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Burbone

Professional, calm, scannable. Hierarchy comes from tonal contrast, text size and sparing orange — never from decoration.

## Hard limits
- **4 font sizes (24 / 18 / 14 / 12), 2 weights (400 / 700), one family.** No new sizes; handle overflow with wrapping or layout, not smaller text.
- **Spacing only from the scale** (4, 8, 12, 16, 20, 24). No arbitrary pixel values.
- **Colors only from the tokens above.** No new dominant colors, no gradients, no pure white or pure black as primary contrast.
- **Emphasis budget:** roughly 60% app-black/neutral, 30% surfaces, 10% orange. If everything is highlighted, nothing is.

## Color
- Orange means action, active state or the key result. It is not decoration.
- Hover: `brand-orange-hover`. Pressed: `brand-orange-pressed`. Selected/active fill: `brand-orange-subtle` plus an orange outline.
- Text: `text-primary` for key values, `text-secondary` for descriptions, `text-muted` for metadata. Text on filled orange is `app-black`.
- Semantic colors (`success`, `danger`, `warning`, `info`) only for status, and never as a second accent.

## Typography
- Display 24/700: brand name and top-level titles. Title 18/700: section and card headings. Body 14/400: forms, tables, reports. Label 12/700 with +0.02em tracking: control labels and statuses.
- Large numbers (KPIs, totals): body family with `font-variant-numeric: tabular-nums` so values don't jump as digits change. For a decimal part, reuse the Title size instead of adding one.

## Layout
- Generator: single column, ~600px container, tabs switch views. Admin: ~1240px, dense grids, tables, analytic panels.
- Group related elements tightly and separate groups with larger gaps; spacing inside elements follows the same scale.
- Mobile: grids collapse to one column, tabs wrap or scroll, filters stack. Touch targets stay comfortable without losing density.

## Depth and shape
- Layer by surface tone first, shadow only for lift or overlay. Cards: `surface-dark` + thin warm outline.
- Raised: `0 1px 1px rgba(0,0,0,.5), 0 0 0 1px rgba(255,244,238,.04)`. Overlay: `0 12px 28px rgba(0,0,0,.46), 0 0 0 1px var(--app-border)`.
- Radius: 12px cards/groups, 6px controls, pill for statuses and toggles. Outlines are thin and warm; stronger on focus or active.

## Components
- **Button primary:** orange, 6px radius, `8px 20px`, lighter on hover, visible focus ring. **Ghost:** transparent or tonal, `text-secondary`, outline.
- **Input:** `surface-raised`, thin outline, 6px radius; focus = orange outline + subtle ring; error = `danger`; disabled lowers contrast but stays visible.
- **Tabs/toggles:** neutral text, gentle surface change on hover; active = orange label/icon/outline + tonal background.
- **Icons:** Material Symbols Rounded as functional markers, not ornaments.
- **Daily Operations Generator:** one flow (revenue, team, burgers, ingredients, hours) that shows the next step, keeps form state, and ends in a clear generate/copy action.

## Copy
- Labels are short and say what the action does. A button names its real outcome, not an adjacent one.
- Don't repeat words already in the heading or section label above. State once, then drop it from values and buttons.
- Prefer clarity over completeness; if a label needs a second sentence, the layout is wrong.

## Do
- Reuse the same visual pattern for related things (same marker, same chip) so users connect them without reading.
- Choose the simpler visual when unsure: a clear chart beats a fancy one.
- Keep labels, keyboard focus and semantic control states.
- Design the mobile generator and dense admin together.

## Don't
- Put cards inside cards or add effects that cost data readability.
- Add gradients, blur, stacked shadows or skeuomorphic effects.
- Change data formats, features or control behavior during visual work.