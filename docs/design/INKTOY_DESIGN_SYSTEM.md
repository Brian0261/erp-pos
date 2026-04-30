# InkToy Design System (Bloques A-E7)

## Scope

This document defines the visual foundation introduced in Sprint 8 closure for the frontend.

Included in this phase:

- Block A: tokens, base styles, reusable utility classes, and brand asset structure.
- Block B: login visual brand alignment.
- Block C: shell visual adaptation (layout/sidebar/topbar/menu states/logout/user summary).
- Block D: dashboard operational hub with role-aware KPIs, quick actions, alerts, and recent activity.
- Block E1: catalog visual adaptation (products, categories, units).
- Block E2: inventory visual adaptation (warehouses, stock, initial stock, adjustments, transfers, kardex).
- Block E3: POS/cash/sales visual adaptation.
- Block E4: purchases/suppliers visual adaptation.
- Block E5: quotes visual adaptation.
- Block E6: billing visual adaptation.
- Block E7: reports and outbox/integrations visual adaptation.

Out of scope in this phase:

- No changes to backend APIs.
- No changes to auth guards, role matrix, or route permissions.
- No functional workflow changes in Angular modules.

## Source Files

- frontend/src/styles/design-tokens.css
- frontend/src/styles/base.css
- frontend/src/styles/components.css
- frontend/src/styles.css
- frontend/src/assets/images/brand/
- frontend/src/app/features/login/login.component.ts
- frontend/src/app/shared/layout/layout.component.ts
- frontend/src/app/features/dashboard/dashboard.component.ts

## Tokens

### Core Brand

- --inktoy-blue: #1217b8
- --inktoy-orange: #f24a0b
- --inktoy-yellow: #f4c20d
- --inktoy-black: #101114
- --inktoy-white: #ffffff

### Semantic

- Brand: --color-brand-primary, --color-brand-accent, --color-brand-highlight
- Text: --color-text-primary, --color-text-secondary, --color-text-on-dark
- Surfaces: --color-bg-canvas, --color-bg-surface, --color-bg-soft
- Borders: --color-border-default, --color-border-strong
- State: --color-success, --color-warning, --color-danger, --color-info

### Typography

- Body: Segoe UI, Roboto, Arial, sans-serif
- Display: Segoe UI, Roboto, Arial, sans-serif

### Layout and UI Rhythm

- Spacing scale: --space-1 .. --space-8
- Radius: --radius-sm, --radius-md, --radius-lg, --radius-pill
- Elevation: --shadow-sm, --shadow-md
- Layout anchors: --layout-max-content, --layout-sidebar-width

## Base Classes

Reusable classes currently available globally:

- .ui-card
- .ui-button + modifiers (.ui-button--primary, .ui-button--secondary, .ui-button--danger)
- .ui-badge + modifiers (.ui-badge--success, .ui-badge--warning, .ui-badge--danger)
- .ui-muted
- .ui-empty-state
- .ui-module-page
- .ui-module-section
- .ui-filter-grid
- .ui-kpi-grid
- .ui-chip (+ semantic modifiers)
- .ui-table-actions

## Asset Policy

Brand assets are stored in:

- frontend/src/assets/images/brand/

Current state:

- Official logo file in use: logo-inktoy.png.

## Regression Safety Rules

- Keep existing form control names for login: usernameOrEmail and password.
- Keep same submit flow and AuthService integration.
- Keep same route map and role-based guards.
- Keep role visibility matrix unchanged in sidebar links.
- Keep dashboard KPIs sourced from existing services/endpoints only (no mocked data).
- Keep backend contracts unchanged.

## Final QA Gate (Pilot)

Validated in final full-stack closure (2026-04-30):

- Frontend build and Docker runtime healthy.
- SPA routes load without Nginx fallback errors.
- Role matrix (`ADMIN`, `CAJERO`, `ALMACENERO`, `SUPERVISOR`) preserved.
- No unexpected browser runtime errors (`pageerror`, `500`, CORS).
- No direct frontend calls to `localhost:8080`; proxy `/api` remains authoritative.
