# InkToy Design System (Bloques A-B)

## Scope

This document defines the visual foundation introduced in Sprint 8 closure for the frontend.

Included in this phase:

- Block A: tokens, base styles, reusable utility classes, and brand asset structure.
- Block B: login visual brand alignment.

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

- Body: Nunito Sans
- Display: Baloo 2

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

## Asset Policy

Brand assets are stored in:

- frontend/src/assets/images/brand/

Current state:

- Official logo file in use: logo-inktoy.png.

## Regression Safety Rules

- Keep existing form control names for login: usernameOrEmail and password.
- Keep same submit flow and AuthService integration.
- Keep same route map and role-based guards.
- Keep backend contracts unchanged.
