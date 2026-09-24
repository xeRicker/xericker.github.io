---
name: Burbone
description: A professional operations hub for the daily work of a burger restaurant.
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
  headline:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
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
    textColor: "{colors.text-primary}"
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

## Overview

**Creative North Star: "A night kitchen under control"**

Burbone has the character of a professional operations hub working in the background of the venue: dark surfaces limit visual noise, while a neon orange accent immediately signals an action, an active state, or an important result. The system is concrete and utilitarian, yet keeps the warmth that comes from the burger restaurant brand.

The layout is dense, functional, and built on clear panels. Hierarchy comes primarily from tonal contrast, text size, and the limited use of orange, not from decorative flourishes.

**Key Characteristics:**
- Professional, operational tone
- Black theme with a neon orange accent
- Dense, scannable panels and controls
- Warm neutral text instead of pure white
- Material Symbols icons as functional markers

## Colors

The palette combines a near-black background with warm, brown-toned surfaces and one dominant accent: Burbone's neon orange.

### Primary
- **Burbone neon orange**: The main color for actions, active tabs, selected products, icons, and key results.
- **Orange hover state**: A lighter reaction to interaction and focus.
- **Dark orange pressed**: The pressed state and a stronger variant of the accent.

### Neutral
- **Operational black**: The app's main background.
- **Warm surface**: Standard cards, sections, and tables.
- **Raised surface**: Form fields, control groups, and tonally active elements.
- **Overlay layer**: Dropdowns, dialogs, tooltips, and elements floating above the content.
- **Warm white**: The most important values and primary text.
- **Warm gray**: Descriptions, labels, and supporting text.

### Named Rules
**The One Accent Rule.** Orange is a signal of action or state; it is not meant to decorate every surface.

## Typography

**Display Font:** Segoe UI (with system sans-serif fallbacks)

**Body Font:** Segoe UI (with system sans-serif fallbacks)

**Label/Mono Font:** No separate mono typeface; technical values use the existing body stack.

**Character:** A single type family keeps a professional, calm rhythm. Heavier weights and label small caps support scanning panels, while body text stays neutral and readable.

### Hierarchy
- **Display** (700, 24px, 1.2): The brand name and the most important titles.
- **Headline** (700, 22px, 1.25): Main surface headings and key values.
- **Title** (700, 18px, 1.3): Section and card headings.
- **Body** (400, 14px, 1.5): Descriptions, forms, tables, and report content.
- **Label** (700, 12px, 1.2, slightly increased tracking): Control labels, statuses, and supporting headings.

## Layout

The generator uses a central container about 600px wide, while the admin panel expands to about 1240px. Sections are stacked vertically and grouped into cards; the generator switches between main views with tabs, while administration uses dense grids, tables, and analytical panels.

The rhythm is based mainly on spacing of 8, 12, 16, 20, and 24px. On smaller screens, grids collapse to a single column, tabs may wrap, and filter controls stack vertically. The interface must keep comfortable touch targets without losing information density.

## Elevation & Depth

The system uses a hybrid of tonal layering and subtle shadows. Ordinary cards are distinguished from the background primarily by surface color and a thin outline. Shadow is reserved for raised elements, overlays, dialogs, and selected interaction states.

### Shadow Vocabulary
- **Raised:** `0 1px 1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 244, 238, 0.04)` — the standard card lift.
- **Overlay:** `0 12px 28px rgba(0, 0, 0, 0.46), 0 0 0 1px var(--app-border)` — dropdowns, tooltips, and dialogs.

### Named Rules
**The Layered Surface Rule.** Use surface difference first, shadow only after; shadow should not replace structure.

## Shapes

The form is compact and slightly rounded. Standard cards and larger groups use a 12px radius, smaller controls use 6px, and statuses and toggles use pill shapes. Outlines are thin, warm, and semi-transparent; a stronger outline appears on focus or activity.

## Components

### Buttons
- **Shape:** A compact 6px radius with a clear touch target.
- **Primary:** Neon orange with dark contrasting text, usually `8px 20px` of padding.
- **Hover / Focus:** A lighter orange hover and a visible focus ring based on the brand color.
- **Secondary / Ghost:** A transparent or tonal background, calmer text, and an outline; used for supporting actions.

### Cards / Containers
- **Corner Style:** 12px for sections and cards, 6px for smaller elements.
- **Background:** A warm dark surface on a black background; raised surface for control groups.
- **Shadow Strategy:** Shadows only for lift or overlay.
- **Border:** A thin semantic outline, orange when active.
- **Internal Padding:** Most often 16–24px.

### Inputs / Fields
- **Style:** A raised dark surface, a thin outline, a 6px radius, and readable primary text.
- **Focus:** An orange outline and a subtle ring.
- **Error / Disabled:** Error uses the semantic danger color; disabled lowers contrast without hiding the state.

### Navigation
- **Style:** Tabs and toggles are compact, built on UI typography and the active surface.
- **Default / Hover:** Neutral text and a gentle surface change.
- **Active:** An orange label, icon, or outline plus a tonal active background.
- **Mobile:** Tabs may move to a single column or a scrollable list depending on context.

### Signature Component: Daily Operations Generator
The generator is the product's main component: it combines the revenue, team, burgers, ingredients, and hours calculator sections into one flow. It should expose the next step, keep the form state, and end with a clear action to generate or copy the list.

## Do's and Don'ts

### Do:
- **Do** use the existing color aliases and tokens instead of new values.
- **Do** reserve neon orange for action, activity, and important results.
- **Do** keep one type family and a spacing rhythm based on small, repeatable steps.
- **Do** design for the mobile generator and the dense admin panel in parallel.
- **Do** preserve labels, keyboard focus, and semantic control states.

### Don't:
- **Don't** add new dominant colors or arbitrary gradients.
- **Don't** use pure white and pure black as the primary contrast when warm text and surface tokens exist.
- **Don't** turn every section into a decorative card inside another card.
- **Don't** sacrifice data readability for visual effects.
- **Don't** change existing data formats, features, or control behavior during visual work.
