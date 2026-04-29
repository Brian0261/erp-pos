# InkToy UI Guidelines (MVP)

## Objective

Apply visual consistency across the ERP/POS while preserving MVP behavior.

## Practical Guidelines

1. Use token variables from design-tokens.css instead of hardcoded colors.
2. Prefer semantic aliases (for example, --color-brand-primary) over direct brand primitives.
3. Reuse global classes (.ui-card, .ui-button, .ui-badge) before creating local variants.
4. Keep spacing aligned to token scale (--space-\*).
5. Use display font for section titles and body font for forms/table content.
6. Maintain minimum contrast and visible focus styles.

## Login-Specific Rules

1. Login can have a stronger branded composition than other pages.
2. Do not alter login form model, validator rules, or submit method signatures.
3. Preserve accessibility attributes (labels, alt text, focus states).

## Shell-Specific Rules (Block C)

1. Keep all route links and role conditions exactly as defined in layout RBAC rules.
2. Use visual states for active links without changing route names or navigation targets.
3. Keep logout behavior unchanged and always visible in shell actions.
4. Present user and role data clearly in sidebar/topbar while preserving existing data sources.
5. Ensure responsive behavior for sidebar and topbar without hiding allowed menus.

## Dashboard-Specific Rules (Block D)

1. Use existing services/endpoints only for KPI data and quick operational summaries.
2. Handle each KPI independently so one failing endpoint does not break the whole dashboard.
3. On `403`, show a friendly unavailable state instead of technical errors.
4. On empty data, show explicit empty states; never fabricate values.
5. Keep role-focused quick actions aligned with existing route visibility and RBAC matrix.
6. Keep dashboard responsive and readable for daily operational use.

## Catalog-Specific Rules (Block E1)

1. Keep product list/search/create/edit/deactivate behavior unchanged; only adjust visual presentation.
2. Preserve SKU and barcode as independent fields with separate helper text and validation states.
3. Use consistent page headers, filter blocks, and table wrappers across products, categories, and units.
4. Use semantic badges for active/inactive status and preserve ADMIN-only deactivation behavior.
5. Use tokenized button variants (primary/secondary/danger) for clear action hierarchy.
6. Keep empty, loading, success, and error messages visually consistent with reusable alert styles.
7. Do not alter routes, guards, interceptors, or service endpoint contracts for catalog modules.

## Rollout Sequence (Recommended)

1. Block A: foundation (tokens/assets/base classes) - completed.
2. Block B: login branding - completed.
3. Block C: shell/layout adaptation - completed.
4. Block D: dashboard identity refresh - completed.
5. Block E1: catalog visual upgrade (products/forms/categories/units) - completed.
6. Block E2+: remaining modules cards/forms.
7. Block F: tables, statuses, and badges across remaining modules.
8. Block G: final responsive and QA pass.

## Validation Checklist

- npm run build succeeds.
- Docker composition serves frontend and backend correctly.
- /api proxy remains functional.
- Login still authenticates seeded users.
- Guarded routes still require token and valid roles.
