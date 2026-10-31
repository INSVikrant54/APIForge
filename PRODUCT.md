# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Backend and full-stack developers testing, debugging, and hardening REST APIs locally against logical and negative-boundary bugs; QA and DevOps engineers exporting automated regression test suites into CI/CD pipelines.

## Product Purpose

APIForge discovers hidden API defects, contract ambiguities, and unhandled edge cases by combining generative AI reasoning with a deterministic backend execution engine. It replaces biased manual testing and unverified AI suggestions with real HTTP execution, preventing subtle business-logic bugs, type-coercion defects, and contract drift before code ships to production.

## Positioning

Deterministic adversarial verification: Flexible multi-model AI synthesis (defaulting to `gemini-3.5-flash-lite` for high-speed low-latency generation, with built-in support for Gemma 4 `gemma-4-26b-a4b-it`, `gemini-3.5-flash`, `gemma-4-31b-it`, as well as user-defined custom model IDs paired with Bring-Your-Own-Key authentication) synthesizes adversarial test plans and edge-case payloads across 7 categories. Pass/fail verdicts are strictly evaluated via real HTTP execution and a deterministic assertion engine (zero hallucinated results). Paired with human-in-the-loop payload inspection, built-in interactive sandbox testing (Safe vs. Vulnerable modes), enterprise SSRF protection, and 1-click CI/CD regression suite export (Jest & Pytest).

## Operating Context

- Local and staging API development environments, developer terminals, and automated CI/CD runners.
- Modern dark-themed web console with dual sidebars, live configuration drawer, collapsible test cards, assertion editors, and key management modals.
- Interactive workflows targeting local server ports (`http://localhost:5000/api/demo/orders`), staging environments, and external REST APIs.
- Bring Your Own Key (BYOK) memory-only architecture: developers can use the server's default environment key or supply their own API key and choose any supported or custom model ID without server restarts.

## Capabilities and Constraints

- Multi-model & BYOK support: runtime model switching across available API models (`gemma-4-26b-a4b-it`, `gemma-4-31b-it`, `gemini-3.5-flash`, etc.), live connection testing, and support for custom model IDs with user-supplied API keys.
- 7 edge-case synthesis domains: Happy Path, Missing Field, Type Validation, Boundary Tests, Business Rules, Malformed Input, and Inconsistent Data.
- Strict assertion engine supporting status codes, JSONPath expressions, and operators (`equals`, `notEquals`, `exists`, `notExists`, `type`, `gt`, `lt`, `contains`).
- Contract ambiguity detection (`requiresReview` badge) for unspecified edge behaviors.
- SSRF guard blocking private IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and cloud metadata endpoints (`169.254.169.254`), with allowlist strictly for internal demo sandbox routes (`/api/demo/*`).
- Sensitive header redaction (`Authorization`, `Cookie`, `x-api-key`, `x-gemini-api-key`) in logs, cURL reproductions, and test exports.
- Zero client-side persistent secrets: default API keys loaded exclusively from server `.env`; client BYOK keys held in memory and passed via runtime request headers.

## Brand Commitments

- Product Name: **APIForge** ⚡
- Voice & Tone: Precision developer workbench, authoritative, security-conscious, direct, and technical.
- Visual Language: Dark console aesthetic (Charcoal `#0B0F19`, Slate `#1E293B`, Electric Cyan `#06B6D4` accents, crisp monospace code blocks, Lucide React icons).

## Evidence on Hand

- Functional full-stack codebase in `d:\APIForge` (React 18 + Vite frontend, Express.js backend).
- Built-in Order API demo sandbox (`POST /api/demo/orders`) with toggleable Safe Mode vs. Vulnerable Mode.
- End-to-end verification suites in `server/test/e2e.test.js`.
- Export adapters for Jest (`client/src/utils/exportJest.js`) and Pytest (`client/src/utils/exportPytest.js`).
- Complete architectural specification documented in `d:\APIForge\README.md`.

## Product Principles

1. **Deterministic reality over generative hallucination:** LLMs propose edge cases; strict HTTP executions and deterministic assertion engines deliver the final truth.
2. **Human-in-the-loop developer control:** Developers inspect, adjust, and approve payloads and assertions before firing a single request.
3. **Defense-in-depth safety:** Outbound network requests are strictly bounded and guarded against SSRF; secrets never touch disk or logs.
4. **Friction-free remediation:** Every failure delivers sanitized reproduction cURLs, AI root-cause diagnostics, and one-click runnable CI/CD test files.

## Accessibility & Inclusion

- High-contrast developer console compliance (WCAG 2.1 AA for status indicators, badge labels, and code blocks).
- Full keyboard navigation for expandable test cards, assertion editors, and modal dialogs.
- Clear visual and textual distinction for PASS (green), FAIL (red), and REQUIRES REVIEW (amber) states.

