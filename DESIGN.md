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

<!-- impeccable:design-map -->
Name: APIForge
Colors: primary: primary #ff6c37; neutral: neutral-bg #1c1c1c; semantic-pass: status-pass #10b981; semantic-fail: status-fail #f43f5e; semantic-warn: status-warn #f59e0b (+3 more in the sidecar)
Fonts: Inter (display, headline, title, body, label); Fira Code (code)
Spacing: xs 4px, sm 8px, md 16px, lg 20px, xl 24px
Radius: sm 6px, md 10px, lg 14px, full 9999px
North Star: "The Precision Avionics Cockpit"
Rules:
- The Surgical Accent Rule. Molten Ember (`#ff6c37`) marks action and state — primary buttons, focused inputs, selected chips and filters, the active navigation item, and the monospace verification surface.
- The Semantic Isolation Rule. Emerald, rose, amber, and violet appear only where they encode HTTP method identity or a deterministic test verdict.
- The Monospace Verification Rule. All HTTP paths, payload bodies, status codes, cURL commands, and assertion parameters render in Fira Code.
- The Flat-By-Default Rule. Surfaces are flat at rest.
Elevation:
- Modal Elevation: 0 12px 32px rgba(0, 0, 0, 0.32)
- Input Focus Ring: 0 0 0 2px rgba(255, 108, 55, 0.16)
Don't:
- Don't add a gradient partner to Molten Ember — `--accent-gradient` is `none` by design; no cyan→indigo sweep, no purple SaaS pastels.
- Don't put a glow or drop shadow under resting buttons, cards, or panels.
- Don't use emerald/rose/amber as decoration, or on navigation and neutral buttons.
- Don't render a second brand hue anywhere — blue and indigo have no active role.
- Don't slow transitions past `0.15s ease`, and don't animate without a `prefers-reduced-motion` fallback.
- Don't leave cyan-derived values behind in the light theme: `--border-glow`, `--accent-surface`, and `--accent-border` under `[data-theme='light']` must derive from `#ff6c37`, not `#38bdf8` / `#0284c7`.
- Don't give `.method-pill` a full pill radius; `9999px` is for `.status-badge` only.
Do:
- Do keep Molten Ember (`#ff6c37`) for primary actions, focus, selection, and the monospace payload surface — action and state only.
- Do build depth from the Cold Slate steps (`#1c1c1c` → `#212121` → `#242424`) and a 1px `#353535` hairline.
- Do render endpoints, JSON bodies, cURL commands, and assertion rules in Fira Code.
- (+3 more)
Full: .impeccable/design-full.md (read a section when you need its detail)
