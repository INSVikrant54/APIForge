---
name: APIForge
description: Automated edge-case verification and regression testing for modern APIs
colors:
  primary: "#38bdf8"
  primary-gradient-end: "#6366f1"
  neutral-bg: "#060911"
  neutral-surface: "#0b1120"
  neutral-card: "#10192e"
  neutral-card-hover: "#15223e"
  neutral-input: "#080d19"
  border-subtle: "#1a263d"
  border-active: "#2a3b5c"
  border-glow: "#38bdf844"
  text-main: "#f1f5f9"
  text-muted: "#94a3b8"
  text-dim: "#64748b"
  status-pass: "#10b981"
  status-fail: "#f43f5e"
  status-warn: "#f59e0b"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.04em"
  code:
    fontFamily: "'Fira Code', monospace, Consolas, Courier"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "rgba(244, 63, 94, 0.12)"
    textColor: "{colors.status-fail}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  input-field:
    backgroundColor: "{colors.neutral-input}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
  card-container:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: APIForge

## Overview

**Creative North Star: "The Precision Avionics Cockpit"**

APIForge is an engineered verification workbench designed for developers, QA engineers, and security teams testing mission-critical APIs. The interface operates like modern avionics telemetry: high-contrast dark surfaces, crisp monospace data readouts, and surgical electric cyan instrumentation. Every visual element serves diagnostic scanability and actionable triage.

The aesthetic rejects "SaaS Bloat" — no gratuitous purple gradients, washed-out low-contrast gray text, pastel toy badges, or slow decorative animations. Visual noise is treated as a defect. Interactive density is high, with tight structural spacing, clear 1px division boundaries, and unmistakable status cues that distinguish passing contracts from catastrophic failures at a glance.

**Key Characteristics:**
- High-contrast dark telemetry theme with stepped obsidian, slate, and navy tiers.
- Surgical cyan accents reserved strictly for primary actions, active indicators, and focus boundaries.
- Dedicated monospace typography for all endpoints, payloads, status codes, and assertions.
- Flat-by-default surfaces utilizing 1px structural hairline borders instead of muddy drop shadows.
- Unambiguous semantic indicators (emerald, rose, amber) dedicated solely to deterministic test verdicts.

## Colors

The palette is anchored in deep dark neutrals with focused electric cyan accents and strictly isolated semantic status indicators.

### Primary
- **Electric Beacon Cyan** (`#38bdf8`): Used exclusively for primary calls-to-action (Run Suite, Analyze), active navigation state, active tab underlines, and focus rings.
- **Beacon Indigo Gradient End** (`#6366f1`): Anchors the linear gradient for hero actions (`linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)`).

### Secondary
- **Telemetry Blue** (`#2563eb`): Used for secondary accents and supporting brand highlights.
- **Verification Purple** (`#a855f7`): Used for custom BYOK key indicators and Type Validation category tags.

### Neutral
- **Obsidian Void** (`#060911`): Base application canvas background.
- **Surface Slate** (`#0b1120`): Top navigation bar, telemetry sidebar, and secondary button backgrounds.
- **Deep Card Navy** (`#10192e`): Workbench container cards, config panels, and test case cards.
- **Card Hover Navy** (`#15223e`): Interactive card and secondary button hover states.
- **Console Input** (`#080d19`): Inset form fields, textareas, and code blocks.
- **Subtle Slate Border** (`#1a263d`): Primary structural hairline divider for cards, panels, and borders.
- **Active Border** (`#2a3b5c`): Border state on card hover, secondary button resting borders, and scrollbar thumbs.
- **Border Glow** (`#38bdf844`): Ambient 2px cyan glow box-shadow for focused inputs.
- **Text Main** (`#f1f5f9`): High-legibility off-white for titles, headers, and code values.
- **Text Muted** (`#94a3b8`): Form labels, descriptions, and secondary metadata.
- **Text Dim** (`#64748b`): Disabled controls, subtle icons, and tertiary timestamps.

### Semantic Status
- **Pass Emerald** (`#10b981`): Deterministic test pass (`rgba(16, 185, 129, 0.12)` background, `rgba(16, 185, 129, 0.3)` border).
- **Fail Rose** (`#f43f5e`): Deterministic test failure (`rgba(244, 63, 94, 0.12)` background, `rgba(244, 63, 94, 0.3)` border).
- **Review Amber** (`#f59e0b`): Ambiguous contract requiring developer review (`rgba(245, 158, 11, 0.12)` background, `rgba(245, 158, 11, 0.3)` border).

### Named Rules
**The Surgical Accent Rule.** Electric Cyan (`#38bdf8`) is strictly reserved for primary actions, active indicators, and focus rings (≤10% of any viewport). Its rarity creates immediate visual hierarchy.  
**The Semantic Isolation Rule.** Emerald (`#10b981`), Rose (`#f43f5e`), and Amber (`#f59e0b`) are strictly forbidden for generic decorative elements, neutral buttons, or navigation. They signify deterministic pass, fail, and ambiguity review states only.

## Typography

**Display Font:** `Inter` (with `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Body Font:** `Inter` (with `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Label/Mono Font:** `Fira Code` (with `monospace, Consolas, Courier`)

**Character:** Technical, crisp, and developer-ergonomic. Clean geometric sans-serif for interface navigation and dense typography paired with high-legibility monospace fonts for all code, endpoints, JSON structures, and telemetry metrics.

### Hierarchy
- **Display** (Bold 700, `1.25rem` / `20px`, line-height `1.3`, letter-spacing `-0.02em`): Section titles, brand marks, and hero modal titles.
- **Headline** (Semi-bold 600, `1rem` / `16px`, line-height `1.4`): Top header titles, dialog headings.
- **Title** (Semi-bold 600, `0.95rem` / `15px`, line-height `1.4`): Panel headers, card titles.
- **Body** (Regular 400, `0.875rem` / `14px`, line-height `1.5`): General body text, form descriptions, instructions (max line length 65–75ch).
- **Label** (Medium 500/600, `0.75rem`–`0.8rem` / `12px`–`13px`, letter-spacing `0.04em`): Form field labels, category chips, navigation links.
- **Code / Monospace** (Regular 400, `0.78rem` / `12.5px`, line-height `1.4`): JSON payloads, cURL strings, HTTP paths, status codes, assertion expressions.

### Named Rules
**The Monospace Verification Rule.** All HTTP paths, payload bodies, status codes, cURL commands, and assertion parameters must render in `Fira Code` monospace typography to preserve mechanical precision.

## Layout

APIForge uses a dual-panel split workbench layout designed for concurrent configuration and execution monitoring:
- **Telemetry Sidebar:** Fixed `240px` width on the left, containing brand identity, navigation items, and run counts.
- **Top Header:** Fixed `56px` height with title telemetry, Hacktoberfest award badge, BYOK model selector pill, and demo mode switch.
- **Main Split Workbench:** Responsive flex layout with `1.25rem` (`20px`) gap:
  - **Left Configuration Panel:** Flexible `flex: 1.1`, minimum width `440px`, holding endpoint inputs, headers, sample payload, and business rules.
  - **Right Execution Panel:** Flexible `flex: 1.4`, minimum width `480px`, holding test execution summary, filtering chips, run controls, and scrollable test case cards.
- **Responsive Adaptability:** On viewports `<= 1024px`, the split panels collapse into a clean single-column vertical stack with configuration on top and execution below.

## Elevation & Depth

APIForge implements a **Tonal Layering with Glow Accents** strategy. Surfaces are flat at rest, with depth created purely through stepped luminance tiers:
1. Canvas Ground: `#060911`
2. Elevated Surfaces & Sidebar: `#0b1120`
3. Interactive Cards & Drawers: `#10192e`
4. Hover Card Highlight: `#15223e`
5. Recessed Code & Input Wells: `#080d19`

All container surfaces are defined by crisp `1px` structural borders (`#1a263d`). Ambient drop shadows are rejected in favor of luminous energy glows on interactive trigger states.

### Shadow Vocabulary
- **Primary Button Glow** (`box-shadow: 0 2px 10px rgba(56, 189, 248, 0.25)`): Applied to primary action buttons at rest.
- **Primary Button Hover** (`box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35)`): Applied to primary action buttons on hover with `-1px` vertical lift.
- **Input Focus Ring** (`box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.27)`): Inset cyan focus boundary on active inputs, textareas, and selects.
- **Modal Backdrop Elevation** (`box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6)`): Applied to dialogs with a dark translucent backdrop (`rgba(6, 9, 17, 0.8)`).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Depth is established through background luminance steps and 1px structural hairline borders. Shadows appear strictly as luminous responses to user focus, hover, or modal dialog elevation.

## Shapes

- **Control & Input Radius:** `6px` (`var(--radius-sm)`). Compact, precise corners for buttons, text inputs, textareas, code blocks, and category chips.
- **Card & Container Radius:** `10px` (`var(--radius-md)`). Subtle curve for workbench cards, configuration boxes, and execution panels.
- **Modal Dialog Radius:** `14px` (`var(--radius-lg)`). Softened perimeter for key management and failure diagnostic dialogs.
- **Status & Method Pills:** `9999px` (`full`). Fully rounded pill geometry for HTTP method badges (`GET`, `POST`, `PUT`, `DELETE`) and verification status badges (`PASS`, `FAIL`, `REQUIRES REVIEW`).
- **Dividers & Strokes:** Consistent `1px solid var(--border-subtle)` (`#1a263d`) providing structural wireframe clarity.

## Components

### Buttons
- **Shape:** Gently curved corners (`6px` / `var(--radius-sm)`).
- **Primary:** Gradient background (`linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)`), white text, `padding: 0.5rem 0.9rem` (`8px 14px`), subtle glow (`0 2px 10px rgba(56, 189, 248, 0.25)`).
- **Secondary:** Dark surface background (`#0b1120`), border `#2a3b5c`, text `#f1f5f9`. Hover shifts to `#15223e` with `#38bdf8` cyan border.
- **Danger:** Rose tint background (`rgba(244, 63, 94, 0.12)`), border `rgba(244, 63, 94, 0.3)`, text `#f43f5e`.
- **Small Variant:** `padding: 0.3rem 0.6rem`, font size `0.78rem` (`12.5px`).

### Chips and Badges
- **Method Pills:** `Fira Code` uppercase font, `0.75rem`, `9999px` pill radius, tinted backgrounds:
  - `GET`: Green tint (`rgba(16, 185, 129, 0.15)`, text `#10b981`)
  - `POST`: Cyan tint (`rgba(56, 189, 248, 0.15)`, text `#38bdf8`)
  - `PUT`: Amber tint (`rgba(245, 158, 11, 0.15)`, text `#f59e0b`)
  - `DELETE`: Rose tint (`rgba(244, 63, 94, 0.15)`, text `#f43f5e`)
- **Status Badges:** `9999px` pill radius, uppercase letter-spacing `0.04em`:
  - `PASS`: Emerald background `rgba(16, 185, 129, 0.12)`, text `#10b981`, border `rgba(16, 185, 129, 0.3)`.
  - `FAIL`: Rose background `rgba(244, 63, 94, 0.12)`, text `#f43f5e`, border `rgba(244, 63, 94, 0.3)`.
  - `REQUIRES REVIEW`: Amber background `rgba(245, 158, 11, 0.12)`, text `#f59e0b`, border `rgba(245, 158, 11, 0.3)`.

### Cards / Containers
- **Corner Style:** `10px` radius (`var(--radius-md)`).
- **Background:** Deep Card Navy (`#10192e`).
- **Border:** `1px solid #1a263d` (`var(--border-subtle)`), transitioning to `#2a3b5c` on hover.
- **Internal Padding:** `1.25rem` (`20px`).

### Inputs / Fields
- **Style:** Console Input recessed well (`#080d19`), border `1px solid #1a263d`, radius `6px`, text `#f1f5f9`.
- **Focus:** Cyan border `#38bdf8` with `0 0 0 2px rgba(56, 189, 248, 0.27)` glow ring.
- **Code Textareas:** Monospace `Fira Code`, `0.8rem`, tab-friendly line height `1.4`.

### Navigation
- **Sidebar Links:** Full-width rounded (`8px`) item, `padding: 0.6rem 0.75rem`, left-aligned Lucide icon. Inactive state `#94a3b8`; active state highlights with `#38bdf8` text, `#10192e` background, and `#2a3b5c` border.

### Expandable Test Case Card (Signature Component)
- **Header:** Row layout with checkbox, method badge (`POST`), endpoint path in monospace, category chip, status badge (`PASS`/`FAIL`/`REQUIRES REVIEW`), execution time badge, and quick cURL copy action.
- **Expansion State:** Smooth reveal of assertion inspection table, editable request body textarea, expected status code overrides, and "Diagnose Failure" trigger button.

## Do's and Don'ts

### Do:
- **Do** strictly limit Electric Cyan (`#38bdf8`) to primary CTAs, active selections, and focus rings (≤10% of viewport area).
- **Do** render all HTTP endpoints, JSON bodies, cURL commands, and assertion rules in `Fira Code` monospace.
- **Do** use stepped background luminance (`#060911` -> `#0b1120` -> `#10192e`) and 1px hairline borders (`#1a263d`) to convey depth.
- **Do** provide instant visual feedback on input focus with the `0 0 0 2px rgba(56, 189, 248, 0.27)` cyan glow ring.
- **Do** use uppercase method pills and status badges with dedicated semi-transparent tinted backgrounds.

### Don't:
- **Don't** use generic purple SaaS gradients or pastel cartoonish colors on neutral components or containers.
- **Don't** use emerald (`#10b981`), rose (`#f43f5e`), or amber (`#f59e0b`) for decorative UI elements; they are strictly reserved for deterministic pass/fail/review telemetry.
- **Don't** cast heavy, blurry black drop shadows under cards at rest; keep resting surfaces flat.
- **Don't** use low-contrast gray text on dark backgrounds; ensure text meets minimum 4.5:1 contrast against its immediate container.
- **Don't** introduce slow, distracting animations that delay developer workflows; keep transitions under `0.15s ease`.

