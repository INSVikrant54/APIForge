---
name: APIForge
description: Automated edge-case verification and regression testing for modern APIs
colors:
  primary: "#ff6c37"
  neutral-bg: "#1c1c1c"
  neutral-surface: "#212121"
  neutral-card: "#242424"
  neutral-card-hover: "#2d2d2d"
  neutral-input: "#161616"
  border-subtle: "#353535"
  border-active: "#4a4a4a"
  border-glow: "#ff6c3729"
  accent-surface: "rgba(255, 108, 55, 0.1)"
  accent-border: "rgba(255, 108, 55, 0.3)"
  overlay: "rgba(10, 10, 10, 0.82)"
  text-main: "#f2f2f2"
  text-muted: "#a6a6a6"
  text-dim: "#949494"
  status-pass: "#10b981"
  status-fail: "#f43f5e"
  status-warn: "#f59e0b"
  method-patch: "#a855f7"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
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
    textColor: "#061018"
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

APIForge is an operational instrument, not a marketing surface. The cockpit is dark, matte, and densely legible: a Cold Slate chassis (`#1c1c1c` → `#212121` → `#242424`) stepped in luminance rather than shadow, with a single Molten Ember (`#ff6c37`) annunciator that fires only when the operator must act or must read a verification payload. Emerald, rose, and amber remain caution and verdict lamps — they mean something or they are not lit.

Density is a feature. The workbench splits a configuration rail from a results rail and keeps both visible; nothing important hides behind a second navigation layer. Every surface reads at rest — no glow, no gradient, no lift — so that the one element that *does* change state (a focused input, a selected chip, a pressed primary button) is unambiguous at a glance.

The system deliberately refuses the purple-SaaS default, pastel illustration palettes, and glassmorphic blur. Depth comes from three flat greys and a 1px hairline; contrast comes from a three-step text ramp; identity comes from one hot accent and the near-absence of everything else.

**Key Characteristics:**
- Cold Slate chassis: three flat neutral steps separated by 1px hairlines, zero resting shadow.
- Molten Ember (`#ff6c37`) as the sole brand accent; no gradient partner, no secondary hue.
- Verdict colors are functional only — pass, fail, review, and HTTP method identity.
- Inter for language, Fira Code for anything the machine asserts.
- Compact, tool-like rhythm (14px body, 6px interactive radius, 20px card padding).

## Colors

The palette is a dark neutral ramp carrying exactly one hot accent and four functional signals.

### Primary

- **Molten Ember** (`#ff6c37`): the single brand accent. Used for the primary button fill, focused input borders, active filter-chip text and border, scrollbar-thumb hover, the active sidebar item, and the payload/code surface (`pre.code-block`). Its supporting tints are `rgba(255, 108, 55, 0.1)` (selected/active fill) and `rgba(255, 108, 55, 0.3)` (selected border); the focus ring is `#ff6c3729` (≈16% alpha).

### Neutral

- **Cold Slate chassis** (`#1c1c1c` → `#212121` → `#242424` → `#2d2d2d`): background, surface (sidebar/header), card, and card-hover respectively. The steps are deliberately small (5–9 points of value) so elevation is felt rather than announced.
- **Cold Slate well** (`#161616`): inputs and code blocks sit *darker* than their surroundings, reading as recessed wells rather than raised plates.
- **Hairline Gunmetal** (`#353535` rest, `#4a4a4a` interactive): every container edge in the product is a 1px line in one of these two values. `#4a4a4a` is earned only on hover and focus.
- **Text ramp** (`#f2f2f2` / `#a6a6a6` / `#949494`): primary, muted, dim. Only three levels; a fourth greys the hierarchy out of legibility.
- **Cockpit Overlay** (`rgba(10, 10, 10, 0.82)`): modal backdrop. Opaque enough to kill the workbench behind it.

### Semantic

- **Pass Emerald** (`#10b981`), **Fail Rose** (`#f43f5e`), **Review Amber** (`#f59e0b`): each ships as a matched triple — fill `rgba(..., 0.12)`, text at full chroma, hairline `rgba(..., 0.3)`. Used for verdict badges, `.btn-danger`, and the sandbox/inspection affordances.
- **Method Violet** (`#a855f7`): PATCH only, tinted `rgba(168, 85, 247, 0.15)` with a `rgba(168, 85, 247, 0.3)` hairline.

### Method Pill Tints

GET `rgba(16, 185, 129, 0.15)` / `#10b981` / border `.3` · POST `rgba(255, 108, 55, 0.12)` / `#ff936d` / border `rgba(255, 108, 55, 0.28)` · PUT `rgba(245, 158, 11, 0.15)` / `#f59e0b` / border `.3` · PATCH `rgba(168, 85, 247, 0.15)` / `#a855f7` / border `.3` · DELETE `rgba(244, 63, 94, 0.15)` / `#f43f5e` / border `.3`. POST borrows the primary hue (`#ff936d` is Molten Ember lifted for text legibility on its own 12% tint).

### Light Theme

Opt-in via `:root[data-theme='light']`, persisted in `localStorage['apiforge_theme']`. It overrides neutrals only — `#eef2f7` background, `#f8fafc` surface, `#ffffff` card, `#edf3f8` card-hover, `#ffffff` input, `#d8e0ea` / `#b6c3d2` borders, `#111827` / `#4b5e72` / `#5c6b7a` text ramp, `rgba(15, 23, 42, 0.42)` overlay. `--accent-cyan` is intentionally not overridden: Molten Ember stays Molten Ember across both themes.

### Named Rules

**The Surgical Accent Rule.** Molten Ember (`#ff6c37`) marks action and state — primary buttons, focused inputs, selected chips and filters, the active navigation item, and the monospace verification surface. It is never used as a background fill, a card, a decorative wash, or neutral chrome.

**The Semantic Isolation Rule.** Emerald, rose, amber, and violet appear only where they encode HTTP method identity or a deterministic test verdict. They are forbidden as decoration, on neutral buttons, and in navigation.

## Typography

**Display Font:** Inter (with `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Body Font:** Inter (same fallback stack)
**Label/Mono Font:** Fira Code (with `monospace, Consolas, Courier`)

**Character:** Inter is deliberately unexpressive — a neutral instrument face that lets color and monospace carry personality. Fira Code does the asserting: everything the machine says about the API is set in it, which makes verification visually distinct from UI prose at any size.

### Hierarchy

- **Display** (700, `clamp(2rem, 4vw, 3.25rem)`, 1.08, `-0.035em`): the start-workspace headline only. Collapses to a fixed `2.1rem` at ≤768px.
- **Headline** (600, 1rem, 1.4): section headings and card titles at large size.
- **Title** (600, 0.95rem, 1.4): `.card-title` and panel headings.
- **Body** (400, 0.875rem / 14px, 1.5): the application default, set on `body`.
- **Label** (600, 0.75rem, `0.04em`): uppercase status badges (0.72rem), method pills (0.75rem, 700), and the start-workspace kicker (0.78rem, 700).
- **Control** (500, 0.85rem): button text and `.form-label` (0.8rem).
- **Code** (400, 0.78rem, 1.4, Fira Code): payload/response blocks, `.form-textarea` (0.8rem), and everything rendered under the Monospace Verification Rule.

### Named Rules

**The Monospace Verification Rule.** All HTTP paths, payload bodies, status codes, cURL commands, and assertion parameters render in Fira Code. If the machine asserts it, it is monospace.

## Layout

A fixed 240px telemetry sidebar sits against a full-height `.main-wrapper` containing a 56px top header and a scrollable `.main-content` (padding `1.25rem`, gap `1.25rem`).

The workbench is a two-column split: `.panel-left` at `flex: 1.1` (min-width 440px) holds configuration, `.panel-right` at `flex: 1.4` (min-width 480px) holds results. The asymmetry is intentional — output deserves more room than input.

At ≤1024px the split collapses to a single column, `min-width` resets to 0, and padding/gap tighten to `1rem`. At ≤768px the start-workspace stacks its actions vertically, pins content to the top, and reduces the display size.

The empty state is a centered `.start-workspace` grid: copy block capped at 720px (headline 680px, supporting paragraph 540px), kicker → headline → paragraph → paired actions, with the error slot absolutely positioned at the bottom.

**Spacing rhythm:** 4 / 8 / 16 / 20 / 24px. Card padding is 20px, section gaps 16px, control gaps 8px, inline icon gaps 4px.

## Elevation & Depth

The system is **flat by default and structural when overlaid**. Resting surfaces — cards, sidebar, header, buttons, chips — carry no `box-shadow` at all. Depth is communicated by the Cold Slate luminance steps plus a 1px Hairline Gunmetal edge; the primary button explicitly declares `box-shadow: none`, and it has no resting glow or gradient. Shadow exists in exactly two situations: an overlay covering the workbench, and a control receiving keyboard focus.

### Shadow Vocabulary

- **Modal Elevation** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32)`): ApiKeyModal, FailureDetailModal, and RegressionExportModal. Paired with the `--overlay` backdrop (`rgba(10, 10, 10, 0.82)`).
- **Input Focus Ring** (`box-shadow: 0 0 0 2px rgba(255, 108, 55, 0.16)` via `--border-glow: #ff6c3729`, plus `border-color: #ff6c37`): every `.form-input` / `.form-textarea` / `.form-select` on focus.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is a statement that something is covering the workbench or receiving focus — never a decorative glow under a button, card, or panel.

## Shapes

Corners are consistently tight and consistent with a tool rather than a consumer product: 6px (`--radius-sm`) on every interactive control — buttons, inputs, chips, method pills, theme switch — 10px (`--radius-md`) on containers and cards, 14px (`--radius-lg`) reserved for larger panels, and 9999px (`--radius-full`) exclusively on status badges, which are the only true pills in the system.

Note the naming trap: `.method-pill` renders at **6px**, not a full pill. Only `.status-badge` is round-ended. Method pills are square tabs; status badges are pills. Keep that distinction.

Every container edge is a 1px hairline; there are no 2px borders, no double borders, and no borderless cards in the workbench. Code blocks and inputs clip their content (`overflow-x: auto`) rather than wrapping, preserving column alignment.

## Components

### Buttons

- **Shape:** 6px radius (`{rounded.sm}`), padding `8px 14px`, font `0.85rem / 500`, inline-flex with a 8px icon gap.
- **Primary:** Molten Ember fill (`{colors.primary}`) with near-black text (`#061018`). No shadow, no gradient, no lift — flat fill only. Hover keeps the fill and does not translate.
- **Secondary:** `{colors.neutral-surface}` fill, `{colors.text-main}` text, `1px {colors.border-active}` border. Hover darkens to `{colors.neutral-card-hover}` and raises the border to Molten Ember.
- **Danger:** Fail-rose tint `rgba(244, 63, 94, 0.12)` with a `rgba(244, 63, 94, 0.3)` hairline and rose text; hover deepens the tint to `rgba(244, 63, 94, 0.2)`.
- **Focus:** all buttons take a 2px Molten Ember focus outline via the shared focus ring.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`, no transform.
- **Sizes:** default and `.btn-sm` (`0.3rem 0.6rem` padding, 0.78rem text). Start-workspace actions enforce a 150×42px minimum.

### Inputs / Fields

- **Style:** `{colors.neutral-input}` well (`#161616`), 1px `{colors.border-subtle}` stroke, 6px radius, `9px 13px` padding, 0.85rem Inter.
- **Focus:** border shifts to Molten Ember with a 2px `#ff6c3729` ring — the only glow in the resting UI.
- **Textareas:** Fira Code at 0.8rem, vertically resizable — payload editing is machine text.

### Cards / Containers

- **Corner Style:** 10px (`{rounded.md}`)
- **Background:** `{colors.neutral-card}` (`#242424`) on `{colors.bg-base}`
- **Border:** 1px `{colors.border-subtle}`, brightening to `{colors.border-active}` on hover over `0.15s ease`
- **Shadow Strategy:** none — flat, per the Flat-By-Default Rule
- **Internal Padding:** 20px (`1.25rem`)

### Method Pills

Mono, uppercase, 6px radius, 0.75rem/700, padding `0.25rem 0.5rem`, filled with the tint triple listed under Colors. They are readouts, not controls — no hover state, no cursor change.

### Status Badges

The only 9999px elements. Uppercase, 0.72rem/600, `0.04em` tracking, `0.2rem 0.55rem` padding, with a leading dot for color-blind-safe redundancy. Always carry the matched fill + text + hairline triple.

### Navigation

- **Sidebar:** 240px, `{colors.neutral-surface}`, 1px right hairline, full-height flex column. Active item uses `{colors.accent-surface}` fill with `{colors.accent-border}` — never a full accent fill.
- **Header:** 56px, `{colors.neutral-surface}`, 1px bottom hairline, 0.5rem/1.5rem padding.
- **Theme switch:** 34×34px, `{colors.neutral-surface}` with a `{colors.border-subtle}` stroke and `{colors.text-muted}` glyph; hover raises the border to `{colors.border-active}` and the glyph to `{colors.text-main}`.

### Start Workspace (signature)

The empty state is the product's first impression: an uppercase letter-spaced kicker, a tightly tracked display headline, a 540px supporting line, and two paired actions — primary `Run the demo`, secondary `Test my API`. It is the only place the display token appears, and the only place the layout centers.

### Modals / Overlays

Fixed full-screen `.overlay` painted with `{colors.overlay}`, content centered, panel at Modal Elevation, body scroll locked, Escape to dismiss. Modal panels that list options tint the selected row with `{colors.accent-surface}`.

## Do's and Don'ts

### Do:

- **Do** keep Molten Ember (`#ff6c37`) for primary actions, focus, selection, and the monospace payload surface — action and state only.
- **Do** build depth from the Cold Slate steps (`#1c1c1c` → `#212121` → `#242424`) and a 1px `#353535` hairline.
- **Do** render endpoints, JSON bodies, cURL commands, and assertion rules in Fira Code.
- **Do** carry emerald/rose/amber/violet only as HTTP-method or verdict signals, always as the matched fill + text + hairline triple.
- **Do** keep transitions at `0.15s ease`, and honor `prefers-reduced-motion` (the stylesheet ships a block that neutralizes `.spin-icon`, `.pulse-dot`, and all transition durations).
- **Do** keep text at or above 4.5:1 against its immediate container; the three-step text ramp exists to be used, not bypassed.

### Don't:

- **Don't** add a gradient partner to Molten Ember — `--accent-gradient` is `none` by design; no cyan→indigo sweep, no purple SaaS pastels.
- **Don't** put a glow or drop shadow under resting buttons, cards, or panels.
- **Don't** use emerald/rose/amber as decoration, or on navigation and neutral buttons.
- **Don't** render a second brand hue anywhere — blue and indigo have no active role.
- **Don't** slow transitions past `0.15s ease`, and don't animate without a `prefers-reduced-motion` fallback.
- **Don't** leave cyan-derived values behind in the light theme: `--border-glow`, `--accent-surface`, and `--accent-border` under `[data-theme='light']` must derive from `#ff6c37`, not `#38bdf8` / `#0284c7`.
- **Don't** give `.method-pill` a full pill radius; `9999px` is for `.status-badge` only.
