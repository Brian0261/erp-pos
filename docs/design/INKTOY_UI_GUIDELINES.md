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

## Shell-Specific Rules (Block C2 - Advanced Sidebar)

1. Keep route targets unchanged; only reorganize visual hierarchy (groups, labels, icons, compact mode).
2. Keep RBAC visual parity with current route permissions; never show links not allowed by role.
3. Hide empty groups for each role; do not render group containers without visible items.
4. Keep sidebar expanded by default and allow compact mode as a UI preference only.
5. Persist compact/group state in localStorage with safe fallbacks for invalid values.
6. Keep menu scroll internal to sidebar navigation area; preserve fixed logout at the bottom.
7. Keep clear active state for current route and group context.
8. Use local icons only (inline/local resources), no external icon libraries required.
9. Keep user and role summary visible in expanded mode; compact mode can prioritize icon-only navigation with tooltips.
10. Preserve existing login/logout contracts, guards, interceptors, and backend authorization behavior.

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

## Inventory-Specific Rules (Block E2)

1. Keep inventory workflows unchanged; E2 is visual-only for warehouses, stock, initial stock, adjustments, transfers, and kardex.
2. Reuse shared wrappers for page head, alerts, and data tables (.ui-page-head, .ui-alert, .ui-table-wrapper, .ui-table).
3. Use semantic badges and labels for stock levels/movement types without changing backend contracts.
4. Preserve existing role behavior in inventory pages (for example: supervisor access to warehouses and kardex, operation routes for admin/almacenero).
5. Keep form validation, submit payload shape, and service calls exactly as implemented before E2.
6. Keep all inventory route names, guards, interceptors, and permission matrix untouched in E2.

## Purchases-Specific Rules (Block E4)

1. Keep suppliers and purchase-orders workflows unchanged; E4 is visual-only for suppliers and purchase order pages.
2. Preserve all lifecycle actions and conditions (`DRAFT`, `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`) exactly as implemented.
3. Keep role-driven behavior unchanged: `SUPERVISOR` lectura, `ADMIN/ALMACENERO` gestion en acciones de orden.
4. Preserve all reactive-form control names, validators, payload fields, and endpoint contracts in purchases services.
5. Reuse shared UI wrappers and tokens (`.ui-page-head`, `.ui-alert`, `.ui-table`, `.ui-button`, `.ui-badge`) before introducing local classes.
6. Keep all purchases route names, guards, interceptor logic, and backend authorization untouched in E4.

## Quotes-Specific Rules (Block E5)

1. Keep quotes workflows unchanged; E5 is visual-only for quotes list, create, detail, edit, and convert pages.
2. Preserve lifecycle behavior and status transitions exactly as implemented (`DRAFT`, `SENT`, `EXPIRED`, `CONVERTED`, `CANCELLED`).
3. Keep conversion validations untouched: open cash session, warehouse selection, payment totals, stock checks, and duplicate-conversion protection.
4. Preserve all reactive-form control names, validators, payload fields, and QuoteService endpoint contracts.
5. Keep role behavior unchanged: `ADMIN/CAJERO/SUPERVISOR` allowed in quotes routes, `ALMACENERO` blocked by current guard rules.
6. Reuse shared InkToy wrappers (`.ui-page-head`, `.ui-alert`, `.ui-table`, `.ui-button`, `.ui-badge`) before adding local styles.
7. Keep quotes routes, guards, interceptor behavior, backend authorization, and business logic untouched in E5.

## Billing-Specific Rules (Block E6)

1. Keep billing workflows unchanged; E6 is visual-only for `/facturacion/configuracion`, `/facturacion/series`, `/facturacion/comprobantes`, `/facturacion/comprobantes/:id`, and `/facturacion/emitir/:saleId`.
2. Preserve electronic document lifecycle behavior exactly as implemented (`DRAFT`, `GENERATED`, `SIGNED`, `SENT`, `ACCEPTED`, `REJECTED`, `ERROR`, `CANCELLED`).
3. Keep role behavior unchanged in billing routes and actions: `ADMIN` full management, `SUPERVISOR` consult/send flow, `CAJERO` operational billing scope, `ALMACENERO` blocked by current guards.
4. Preserve all reactive-form control names, validators, payload fields, and endpoint contracts in billing services.
5. Reuse shared wrappers (`.ui-page-head`, `.ui-alert`, `.ui-table`, `.ui-button`, `.ui-badge`) and avoid local styles that duplicate global tokenized primitives.
6. Keep workflow actions (generate XML, sign, send mock/sandbox) visually differentiated without changing existing enable/disable logic.
7. Keep billing routes, guards, interceptor behavior, backend authorization, and business rules untouched in E6.

## Reports/Outbox-Specific Rules (Block E7)

1. Keep reports and outbox workflows unchanged; E7 is visual-only for reports dashboard, reports detail pages, outbox list, and outbox detail pages.
2. Preserve all filter form controls, defaults, and query parameter mapping used by `ReportsService` and `OutboxService`.
3. Keep role behavior unchanged in routing and views: reports by `ROLES_REPORTS` / `ROLES_REPORTS_COMMERCIAL`, outbox by `ADMIN` only.
4. Reuse shared wrappers and primitives (`.ui-module-page`, `.ui-module-section`, `.ui-filter-grid`, `.ui-kpi-grid`, `.ui-chip`, `.ui-table-actions`) before creating local style variants.
5. Keep visual helper methods (for example, status/movement/ranking/conversion chip class mappers) presentation-only, without changing data contracts.
6. Keep outbox actions (`markPublished`, `retry`) with the same endpoint calls and enable/disable rules as before E7.
7. Keep reports/outbox routes, guards, interceptor behavior, backend authorization, and business logic untouched in E7.

## Rollout Sequence (Recommended)

1. Block A: foundation (tokens/assets/base classes) - completed.
2. Block B: login branding - completed.
3. Block C: shell/layout adaptation - completed.
4. Block D: dashboard identity refresh - completed.
5. Block E1: catalog visual upgrade (products/forms/categories/units) - completed.
6. Block E2: inventory visual upgrade (warehouses/stock/initial stock/adjustments/transfers/kardex) - completed.
7. Block E3: POS/Caja/Ventas visual upgrade - completed.
8. Block E4: Compras/Proveedores visual upgrade - completed.
9. Block E5: Cotizaciones visual upgrade - completed.
10. Block E6: Facturacion visual upgrade (configuracion/series/comprobantes/detalle/emitir) - completed.
11. Block E7: Reportes/Outbox visual upgrade (dashboard reportes, reportes detalle, outbox list/detail) - completed.
12. Block F: tables, statuses, and badges across remaining modules.
13. Block G: final responsive and QA pass.

## Validation Checklist

- npm run build succeeds.
- Docker composition serves frontend and backend correctly.
- /api proxy remains functional.
- Login still authenticates seeded users.
- Guarded routes still require token and valid roles.

## Final Pilot Gate (2026-04-30)

1. Validate login, dashboard, sidebar visibility by role, logout, and protected-route redirect after logout.
2. Validate role matrix end-to-end for `ADMIN`, `CAJERO`, `ALMACENERO`, and `SUPERVISOR` on allowed and blocked routes.
3. Validate visual consistency on all primary operational modules before pilot (dashboard, catalog, inventory, purchases, pos/caja/ventas, quotes, billing, reports, outbox).
4. Validate SPA direct refresh on critical routes with no Nginx `404` fallback and no `Cannot GET` body.
5. Validate smoke navigation and minimal interactions (catalog search, stock, kardex, purchases list, pos, cash, sales, quotes, billing docs, reports, outbox).
6. Validate browser runtime quality gate: no unexpected JS errors, no `pageerror`, no HTTP `500`, no CORS, no direct `localhost:8080` calls, and no `fonts.googleapis.com` dependency.
