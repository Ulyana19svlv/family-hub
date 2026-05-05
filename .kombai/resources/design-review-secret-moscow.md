# Design Review: Secret Moscow

## Context

Current product shape:

- `index.html` is the family portal with three knowledge bases.
- `site/index.html` is the Moscow places app with Yandex Maps, search, filters, place cards, and a details drawer.
- `site/inbox.html` is the intake parser for incoming Instagram/Telegram notes.

## Problem Table

| # | Area | Problem | Severity | File / Surface | Recommendation |
|---|------|---------|----------|----------------|----------------|
| 1 | Visual design | Decorative pseudo-elements and clipped stars create visual noise. | High | `site/styles.css` | Replace illustration clutter with 1-2 functional accents: category strip, card accent bar, drawer header line. |
| 2 | Visual design | Duplicate token sets create conflicts and make future changes risky. | Medium | `site/styles.css`, `index.html`, `site/inbox.html` | Use `site/tokens.css` as the single source of truth. |
| 3 | Visual design | One aggressive shadow value is used everywhere. | Medium | `site/styles.css` | Use `--shadow-sm`, `--shadow-md`, `--shadow-lg` based on hierarchy. |
| 4 | Visual design | Typography differs between pages. | High | `index.html`, `site/styles.css`, `site/inbox.html` | Use `--font-display` and `--font-body` across all pages. |
| 5 | Visual design | Too many accent colors compete for attention. | Medium | `site/styles.css` | Reduce to `--primary`, `--accent`, `--support`, `--info`, `--warm`. |
| 6 | Visual design | `clip-path` decorations are not responsive and are expensive to paint. | Low | `site/styles.css` | Remove decorative polygons; prefer borders, bars, and flat fills. |
| 7 | Visual design | Landing has isolated inline styles. | Medium | `index.html` | Move to `site/landing.css` and share tokens. |
| 8 | Visual design | Inbox has a third visual system. | Medium | `site/inbox.html` | Move to `site/inbox.css` and share tokens. |
| 9 | Layout | Desktop `overflow: hidden` can hide content if panels grow unexpectedly. | High | `site/styles.css` | Keep shell fixed only for map-first desktop; make internal panels scroll. |
| 10 | Mobile | Mobile list height was artificially capped. | High | `site/styles.css` | Let list page scroll naturally; avoid `max-height: 42dvh`. |
| 11 | Mobile | Details panel can cover map without a clear mode. | Medium | `site/styles.css`, `site/app.js` | Treat details as animated bottom sheet on mobile. |
| 12 | Responsive | Missing tablet breakpoint. | Medium | `site/styles.css` | Add `max-width: 768px` layout shift. |
| 13 | Mobile | Touch targets under 44px. | High | `site/styles.css` | Enforce `min-height: 44px` for chips, buttons, links. |
| 14 | Cards | Place cards used fixed `min-height`, causing content pressure. | Medium | `site/styles.css` | Use content-driven card height and clamp only secondary text. |
| 15 | Mobile UX | No list/map toggle. | High | `site/index.html`, `site/app.js` | Add a fixed mobile toggle button and body state. |
| 16 | Interaction | Details drawer toggled without motion. | High | `site/styles.css`, `site/app.js` | Use slide-in on desktop and slide-up on mobile. |
| 17 | Loading | Map has no loading state. | Medium | `site/app.js`, `site/styles.css` | Add a small skeleton while Yandex script initializes. |
| 18 | Interaction | Card transitions only cover transform/shadow. | Medium | `site/styles.css` | Add background and opacity transitions. |
| 19 | Filtering | Category changes fully re-render without visual continuity. | Medium | `site/app.js` | Add a short fade via `requestAnimationFrame`. |
| 20 | Placeholder | No skeleton/placeholder on first load. | Low | `site/app.js` | Use map loading skeleton; avoid blocking content list. |
| 21 | Random | Random button has no feedback. | Low | `site/app.js` | Add one-shot highlight and scroll selected card into view. |
| 22 | Hover | Icon hover feedback is too subtle. | Low | `site/styles.css` | Use visible background change, movement, and focus ring. |
| 23 | Accessibility | Keyboard focus states are inconsistent. | High | all interactive pages | Add shared `:focus-visible` ring in `tokens.css`. |
| 24 | Deployment | Pages deploy depends on GitHub default behavior only. | Medium | `.github/workflows` | Add explicit GitHub Pages workflow. |

## Token Plan

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#fff8ec` | Page canvas |
| `--color-surface` | `#fffdf7` | Panels and cards |
| `--color-text` | `#151718` | Main text |
| `--color-muted` | `#67645d` | Secondary text |
| `--color-border` | `#202020` | High-contrast outlines |
| `--color-primary` | `#0f6b52` | Main actions and map identity |
| `--color-accent` | `#ff4f7b` | Editorial accents |
| `--color-support` | `#d9ff48` | Dopamine highlight |
| `--shadow-sm` | `2px 2px 0 rgba(...)` | Buttons and small controls |
| `--shadow-md` | `5px 5px 0 rgba(...)` | Cards |
| `--shadow-lg` | `10px 10px 0 rgba(...)` | Floating panels |

## Phases

### Phase 0: Preparation

- Add `site/tokens.css`.
- Use `Unbounded` for display and `Manrope` for body text.
- Add `.github/workflows/deploy.yml`.

### Phase 1: Visual Refactor

- Replace decorative clutter with clean accent bars.
- Move portal CSS to `site/landing.css`.
- Move inbox CSS to `site/inbox.css`.
- Keep the dopamine mood via contrast, sharp color roles, and typography instead of many gradients.

### Phase 2: Responsiveness

- Use map-first desktop layout.
- Add mobile List/Map toggle.
- Let the mobile list scroll naturally.
- Convert details panel to bottom sheet.

### Phase 3: Micro-Interactions

- Animate drawer open/close.
- Add map loading skeleton.
- Add random-pick highlight.
- Add smooth filter fade.
- Add shared focus rings.

### Phase 4: Wireframe

- Use `.kombai/resources/wireframe-map-first.html` as the layout reference for the map-first redesign.
