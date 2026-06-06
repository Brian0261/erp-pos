import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  AssetSource,
  AssetType,
  BrandAbsencePolicy,
  EcommerceAdminBrandResponse,
  EcommerceAdminOnlineCategoryResponse,
  EcommerceAdminOnlineProfileDetailResponse,
  EcommerceAdminPublicationValidationResponse,
  MissingRequirement,
  OnlinePublicationStatus,
  RobotsPolicy,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

interface RequirementGroup {
  title: string;
  anchor: string;
  requirements: MissingRequirement[];
}

@Component({
  selector: "app-online-profile-detail-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ecommerce-detail-page">
      <header class="detail-hero">
        <div class="hero-copy">
          <a class="back-link" routerLink="/ecommerce-admin/perfiles">Volver al listado</a>
          <p class="ui-page-kicker">Catálogo online</p>
          <h1 class="ui-page-title">
            {{ profile?.onlineName || profile?.productName || "Perfil online" }}
          </h1>
          <p class="ui-page-description">
            Revisa el contexto ERP/POS, corrige contenido ecommerce y completa los requisitos antes de publicar.
          </p>
        </div>

        <div class="hero-actions" *ngIf="profile">
          <span class="ui-badge" [ngClass]="publicationBadgeClass(profile.publicationStatus)">
            {{ statusLabel(profile.publicationStatus) }}
          </span>

          <a
            *ngIf="publicProductPath() as publicPath"
            class="ui-button ui-button--secondary"
            [href]="publicPath"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver público
          </a>

          <button
            *ngIf="canManage && profile.publicationStatus !== 'PUBLISHED'"
            type="button"
            class="ui-button ui-button--primary"
            (click)="publishProfile()"
            [disabled]="actionLoading || !publicationValidation?.publishable"
          >
            Publicar
          </button>

          <button
            *ngIf="canManage && profile.publicationStatus === 'PUBLISHED'"
            type="button"
            class="ui-button ui-button--secondary"
            (click)="unpublishProfile()"
            [disabled]="actionLoading"
          >
            Despublicar
          </button>

          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="reloadData()"
            [disabled]="loading"
          >
            Actualizar datos
          </button>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando perfil online...</p>

      <p class="ui-alert ui-alert--info" *ngIf="profile && !canManage && canView">
        Modo revisión: como SUPERVISOR solo puedes consultar. Las acciones de cambio son exclusivas de ADMIN.
      </p>

      <section class="overview-grid" *ngIf="!loading && profile">
        <article class="overview-card overview-card--product">
          <p class="overview-kicker">Producto ERP/POS readonly</p>
          <h2>{{ profile.productName || "Producto ERP no disponible" }}</h2>
          <div class="meta-line">
            <span>SKU: {{ profile.productSku || "-" }}</span>
            <span>#{{ profile.productId }}</span>
            <span
              class="ui-badge"
              [class.ui-badge--success]="profile.productActive"
              [class.ui-badge--danger]="!profile.productActive"
            >
              {{ profile.productActive ? "Activo" : "Inactivo" }}
            </span>
          </div>
        </article>

        <article class="overview-card">
          <p class="overview-kicker">Perfil ecommerce</p>
          <h3>{{ profile.onlineName || "Nombre online pendiente" }}</h3>
          <p class="summary-value">{{ profile.slug ? "/productos/" + profile.slug : "Slug pendiente" }}</p>
        </article>

        <article class="overview-card">
          <p class="overview-kicker">Taxonomía comercial</p>
          <h3>{{ onlineCategoryLabel(profile.onlineCategoryId) }}</h3>
          <p class="summary-value">{{ brandLabel(profile) }}</p>
        </article>

        <article class="overview-card">
          <p class="overview-kicker">Precio online</p>
          <h3>{{ effectivePriceLabel() }}</h3>
          <p class="summary-value">
            {{ profile.effectivePrice?.overrideApplied ? "Override ecommerce activo" : "Usa precio ERP/POS" }}
          </p>
        </article>
      </section>

      <div class="detail-layout" *ngIf="!loading && profile">
        <main class="detail-main">
          <section class="detail-card" id="contenido-ecommerce">
            <header class="card-head">
              <div>
                <p class="overview-kicker">Editable ecommerce</p>
                <h2>Contenido ecommerce</h2>
              </div>
              <span class="card-hint">Nombre, descripción, categoría y marca online.</span>
            </header>

            <form [formGroup]="profileForm" class="form-grid" (ngSubmit)="saveProfile()">
              <label class="field">
                <span>Slug</span>
                <input type="text" formControlName="slug" maxlength="180" />
                <small class="field-help">Se valida y normaliza en backend.</small>
              </label>

              <label class="field">
                <span>Nombre online</span>
                <input type="text" formControlName="onlineName" maxlength="180" />
                <small class="field-help" *ngIf="isProfileInvalid('onlineName')">
                  El nombre online excede el máximo permitido.
                </small>
              </label>

              <label class="field field--full">
                <span>Descripción online</span>
                <textarea formControlName="onlineDescription" rows="4" maxlength="2000"></textarea>
              </label>

              <label class="field">
                <span>Categoría online</span>
                <select formControlName="onlineCategoryId">
                  <option [ngValue]="null">Seleccionar</option>
                  <option *ngFor="let category of onlineCategories" [ngValue]="category.id">
                    {{ category.name }} (#{{ category.id }})
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Marca</span>
                <select formControlName="brandId">
                  <option [ngValue]="null">Sin marca</option>
                  <option *ngFor="let brand of brands" [ngValue]="brand.id">
                    {{ brand.name }} (#{{ brand.id }})
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Política sin marca</span>
                <select formControlName="brandAbsencePolicy">
                  <option [ngValue]="null">No aplica</option>
                  <option *ngFor="let policy of brandAbsencePolicies" [ngValue]="policy">
                    {{ brandAbsencePolicyLabel(policy) }}
                  </option>
                </select>
                <small class="field-help">Solo aplica cuando no hay marca seleccionada.</small>
              </label>

              <div class="section-actions" *ngIf="canManage">
                <button type="submit" class="ui-button ui-button--primary" [disabled]="profileSaving">
                  Guardar contenido
                </button>
              </div>
            </form>

            <p class="ui-alert ui-alert--error" *ngIf="profileErrorMessage">
              {{ profileErrorMessage }}
            </p>
          </section>

          <section class="detail-card" id="seo">
            <header class="card-head">
              <div>
                <p class="overview-kicker">SEO-first</p>
                <h2>SEO</h2>
              </div>
              <span class="card-hint">Metadatos para buscadores y redes sociales.</span>
            </header>

            <form [formGroup]="seoForm" class="form-grid" (ngSubmit)="saveSeo()">
              <label class="field">
                <span>SEO title</span>
                <input type="text" formControlName="seoTitle" maxlength="160" />
              </label>

              <label class="field field--full">
                <span>SEO description</span>
                <textarea formControlName="seoDescription" rows="3" maxlength="320"></textarea>
              </label>

              <label class="field">
                <span>Ruta canónica</span>
                <input type="text" formControlName="canonicalPath" maxlength="300" />
              </label>

              <label class="field">
                <span>Indexación para buscadores</span>
                <select formControlName="robotsPolicy">
                  <option [ngValue]="null">Sin definir</option>
                  <option *ngFor="let policy of robotsPolicies" [ngValue]="policy">
                    {{ robotsPolicyLabel(policy) }}
                  </option>
                </select>
              </label>

              <label class="field field--checkbox">
                <input type="checkbox" formControlName="indexable" />
                <span>Permitir indexación</span>
              </label>

              <label class="field">
                <span>Título para redes sociales</span>
                <input type="text" formControlName="ogTitle" maxlength="160" />
              </label>

              <label class="field field--full">
                <span>Descripción para redes sociales</span>
                <textarea formControlName="ogDescription" rows="3" maxlength="320"></textarea>
              </label>

              <label class="field">
                <span>Imagen para redes sociales</span>
                <input type="text" formControlName="ogImageUrl" maxlength="500" />
              </label>

              <div class="section-actions" *ngIf="canManage">
                <button type="submit" class="ui-button ui-button--primary" [disabled]="seoSaving">
                  Guardar SEO
                </button>
              </div>
            </form>

            <p class="ui-alert ui-alert--error" *ngIf="seoErrorMessage">
              {{ seoErrorMessage }}
            </p>
          </section>

          <section class="detail-card" id="imagen-principal">
            <header class="card-head">
              <div>
                <p class="overview-kicker">Activo visual</p>
                <h2>Imagen principal</h2>
              </div>
              <span class="card-hint">Imagen pública, alt text y derechos confirmados.</span>
            </header>

            <form [formGroup]="assetForm" class="form-grid" (ngSubmit)="saveAsset()">
              <label class="field">
                <span>Tipo de imagen</span>
                <select formControlName="assetType">
                  <option *ngFor="let assetType of assetTypes" [ngValue]="assetType">
                    {{ assetTypeLabel(assetType) }}
                  </option>
                </select>
              </label>

              <label class="field field--full">
                <span>URL de imagen</span>
                <input type="text" formControlName="assetUrl" maxlength="500" />
                <small class="field-help" *ngIf="isAssetInvalid('assetUrl')">
                  La URL es obligatoria para guardar la imagen principal.
                </small>
              </label>

              <label class="field">
                <span>Texto alternativo</span>
                <input type="text" formControlName="altText" maxlength="250" />
              </label>

              <label class="field">
                <span>Fuente</span>
                <select formControlName="source">
                  <option *ngFor="let source of assetSources" [ngValue]="source">
                    {{ assetSourceLabel(source) }}
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Orden de visualización</span>
                <input type="number" formControlName="displayOrder" min="0" step="1" />
              </label>

              <label class="field field--checkbox">
                <input type="checkbox" formControlName="rightsConfirmed" />
                <span>Derechos confirmados</span>
              </label>

              <div class="section-actions" *ngIf="canManage">
                <button type="submit" class="ui-button ui-button--primary" [disabled]="assetSaving">
                  Guardar imagen principal
                </button>
              </div>
            </form>

            <p class="ui-alert ui-alert--error" *ngIf="assetErrorMessage">
              {{ assetErrorMessage }}
            </p>
          </section>

          <section class="detail-card" id="precio-online">
            <header class="card-head">
              <div>
                <p class="overview-kicker">Comercial online</p>
                <h2>Precio online personalizado</h2>
              </div>
              <span class="card-hint">Override ecommerce sin modificar el precio ERP/POS.</span>
            </header>

            <div class="price-strip">
              <span>Precio efectivo</span>
              <strong>{{ effectivePriceLabel() }}</strong>
            </div>

            <form [formGroup]="priceForm" class="form-grid" (ngSubmit)="savePriceOverride()">
              <label class="field">
                <span>Monto</span>
                <input type="number" formControlName="amount" step="0.01" min="0.01" />
                <small class="field-help" *ngIf="isPriceInvalid('amount')">
                  El monto es obligatorio y debe ser mayor a cero.
                </small>
              </label>

              <label class="field">
                <span>Moneda</span>
                <input type="text" formControlName="currency" maxlength="3" />
              </label>

              <label class="field field--checkbox">
                <input type="checkbox" formControlName="active" />
                <span>Usar precio online diferente</span>
              </label>

              <label class="field">
                <span>Válido desde</span>
                <input type="datetime-local" formControlName="validFrom" />
              </label>

              <label class="field">
                <span>Válido hasta</span>
                <input type="datetime-local" formControlName="validTo" />
              </label>

              <label class="field field--full">
                <span>Motivo</span>
                <textarea formControlName="reason" rows="2" maxlength="300"></textarea>
              </label>

              <div class="section-actions" *ngIf="canManage">
                <button type="submit" class="ui-button ui-button--primary" [disabled]="priceSaving">
                  Guardar precio
                </button>
              </div>
            </form>

            <p class="ui-alert ui-alert--error" *ngIf="priceErrorMessage">
              {{ priceErrorMessage }}
            </p>
          </section>
        </main>

        <aside class="publish-panel" *ngIf="publicationValidation">
          <section class="publish-card">
            <div class="publish-card__head">
              <p class="overview-kicker">Requisitos para publicar</p>
              <span
                class="ui-badge"
                [class.ui-badge--success]="publicationValidation.publishable"
                [class.ui-badge--danger]="!publicationValidation.publishable"
              >
                {{ publicationValidation.publishable ? "Publicable" : "Pendiente" }}
              </span>
            </div>

            <p class="publish-state">
              {{ validationSummaryLabel() }}
            </p>

            <div class="checklist-group" *ngFor="let group of requirementGroups">
              <div class="checklist-group__head">
                <a [href]="'#' + group.anchor">{{ group.title }}</a>
                <span [class.is-ok]="groupPendingCount(group.requirements) === 0">
                  {{ groupPendingCount(group.requirements) === 0 ? "OK" : groupPendingCount(group.requirements) + " pendiente(s)" }}
                </span>
              </div>
              <ul class="checklist-list">
                <li
                  *ngFor="let requirement of group.requirements"
                  [class.is-missing]="isRequirementMissing(requirement)"
                >
                  <span class="check-dot"></span>
                  <div>
                    <strong>{{ requirementLabel(requirement) }}</strong>
                    <small>{{ requirementHelp(requirement) }}</small>
                  </div>
                </li>
              </ul>
            </div>

            <p class="ui-muted technical-count" *ngIf="publicationValidation.errors.length > 0">
              {{ publicationValidation.errors.length }} bloqueo(s) devueltos por backend. Se muestran arriba como tareas accionables.
            </p>
          </section>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .ecommerce-detail-page {
        display: grid;
        gap: var(--space-4);
      }

      .detail-hero,
      .overview-card,
      .detail-card,
      .publish-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
      }

      .detail-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
        padding: var(--space-5);
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.09), transparent 42%),
          var(--color-bg-surface);
      }

      .hero-copy {
        min-width: 0;
      }

      .back-link {
        display: inline-block;
        margin-bottom: var(--space-2);
        font-weight: 700;
        color: var(--color-brand-primary);
        text-decoration: none;
      }

      .back-link:hover {
        text-decoration: underline;
      }

      .hero-actions,
      .meta-line {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .hero-actions {
        justify-content: flex-end;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .overview-card {
        padding: var(--space-3);
        display: grid;
        gap: var(--space-2);
        min-width: 0;
      }

      .overview-card--product {
        background: var(--color-bg-soft);
      }

      .overview-card h2,
      .overview-card h3,
      .detail-card h2 {
        margin: 0;
      }

      .overview-kicker {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .summary-value,
      .meta-line {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .summary-value {
        font-family: var(--font-family-mono);
        overflow-wrap: anywhere;
      }

      .detail-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
        gap: var(--space-4);
        align-items: start;
      }

      .detail-main {
        display: grid;
        gap: var(--space-4);
        min-width: 0;
      }

      .detail-card,
      .publish-card {
        padding: var(--space-4);
      }

      .card-head,
      .publish-card__head,
      .checklist-group__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-3);
      }

      .card-head {
        margin-bottom: var(--space-3);
      }

      .card-hint {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        text-align: right;
        max-width: 18rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
        min-width: 0;
      }

      .field span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field input,
      .field select,
      .field textarea {
        width: 100%;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 0.58rem 0.65rem;
        background: var(--color-bg-surface);
        box-sizing: border-box;
      }

      .field--full,
      .section-actions {
        grid-column: 1 / -1;
      }

      .field--checkbox {
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: var(--space-2);
      }

      .field--checkbox input {
        width: auto;
      }

      .field-help {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .section-actions {
        display: flex;
        justify-content: flex-start;
      }

      .price-strip {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
      }

      .publish-panel {
        position: sticky;
        top: var(--space-4);
      }

      .publish-card {
        display: grid;
        gap: var(--space-3);
      }

      .publish-state {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .checklist-group {
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-3);
      }

      .checklist-group__head a {
        color: var(--color-text-primary);
        font-weight: 800;
        text-decoration: none;
      }

      .checklist-group__head a:hover {
        color: var(--color-brand-primary);
      }

      .checklist-group__head span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        white-space: nowrap;
      }

      .checklist-group__head span.is-ok {
        color: var(--color-success);
      }

      .checklist-list {
        list-style: none;
        margin: var(--space-2) 0 0;
        padding: 0;
        display: grid;
        gap: var(--space-2);
      }

      .checklist-list li {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--space-2);
        color: var(--color-text-secondary);
        opacity: 0.72;
      }

      .checklist-list li.is-missing {
        color: var(--color-text-primary);
        opacity: 1;
      }

      .checklist-list strong,
      .checklist-list small {
        display: block;
      }

      .checklist-list small {
        margin-top: 0.15rem;
        color: var(--color-text-secondary);
      }

      .check-dot {
        width: 0.62rem;
        height: 0.62rem;
        margin-top: 0.32rem;
        border-radius: 999px;
        background: var(--color-success);
      }

      .is-missing .check-dot {
        background: var(--color-danger);
      }

      .technical-count {
        margin: 0;
        font-size: var(--font-size-xs);
      }

      @media (max-width: 1180px) {
        .overview-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .detail-layout {
          grid-template-columns: 1fr;
        }

        .publish-panel {
          position: static;
        }
      }

      @media (max-width: 860px) {
        .detail-hero,
        .card-head,
        .price-strip {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-actions,
        .card-hint {
          justify-content: flex-start;
          text-align: left;
        }

        .overview-grid,
        .form-grid {
          grid-template-columns: 1fr;
        }

        .field--full,
        .section-actions {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class OnlineProfileDetailPageComponent implements OnInit {
  readonly robotsPolicies: RobotsPolicy[] = [
    "INDEX_FOLLOW",
    "NOINDEX_FOLLOW",
    "NOINDEX_NOFOLLOW",
  ];
  readonly assetTypes: AssetType[] = [
    "PRODUCT_IMAGE",
    "BRAND_LOGO",
    "CATEGORY_IMAGE",
    "OPEN_GRAPH_IMAGE",
  ];
  readonly assetSources: AssetSource[] = ["SUPPLIER", "OWN", "GENERATED", "OTHER"];
  readonly brandAbsencePolicies: BrandAbsencePolicy[] = ["GENERIC", "UNBRANDED"];
  readonly requirementGroups: RequirementGroup[] = [
    {
      title: "Producto ERP",
      anchor: "contenido-ecommerce",
      requirements: ["PRODUCT_INACTIVE", "SKU_MISSING"],
    },
    {
      title: "Contenido",
      anchor: "contenido-ecommerce",
      requirements: ["ONLINE_NAME_MISSING", "ONLINE_DESCRIPTION_MISSING", "SLUG_MISSING", "SLUG_DUPLICATE"],
    },
    {
      title: "Categoría y marca",
      anchor: "contenido-ecommerce",
      requirements: ["CATEGORY_MISSING", "CATEGORY_INACTIVE", "BRAND_MISSING", "BRAND_INACTIVE"],
    },
    {
      title: "Imagen",
      anchor: "imagen-principal",
      requirements: ["ASSET_MISSING", "ASSET_INVALID"],
    },
    {
      title: "SEO",
      anchor: "seo",
      requirements: ["SEO_MISSING", "SEO_INCOMPLETE"],
    },
    {
      title: "Precio",
      anchor: "precio-online",
      requirements: ["PRICE_INVALID"],
    },
  ];

  readonly profileForm = this.formBuilder.group({
    slug: ["", [Validators.maxLength(180)]],
    onlineName: ["", [Validators.maxLength(180)]],
    onlineDescription: ["", [Validators.maxLength(2000)]],
    onlineCategoryId: [null as number | null],
    brandId: [null as number | null],
    brandAbsencePolicy: [null as BrandAbsencePolicy | null],
  });

  readonly seoForm = this.formBuilder.group({
    seoTitle: ["", [Validators.maxLength(160)]],
    seoDescription: ["", [Validators.maxLength(320)]],
    canonicalPath: ["", [Validators.maxLength(300)]],
    robotsPolicy: ["NOINDEX_FOLLOW" as RobotsPolicy | null],
    indexable: [false],
    ogTitle: ["", [Validators.maxLength(160)]],
    ogDescription: ["", [Validators.maxLength(320)]],
    ogImageUrl: ["", [Validators.maxLength(500)]],
  });

  readonly assetForm = this.formBuilder.group({
    assetType: ["PRODUCT_IMAGE" as AssetType, Validators.required],
    assetUrl: ["", [Validators.required, Validators.maxLength(500)]],
    altText: ["", [Validators.maxLength(250)]],
    source: ["OWN" as AssetSource, Validators.required],
    rightsConfirmed: [false, Validators.required],
    displayOrder: [0],
  });

  readonly priceForm = this.formBuilder.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ["PEN", [Validators.maxLength(3)]],
    active: [true, Validators.required],
    validFrom: [""],
    validTo: [""],
    reason: ["", [Validators.maxLength(300)]],
  });

  productId: number | null = null;
  profile: EcommerceAdminOnlineProfileDetailResponse | null = null;
  publicationValidation: EcommerceAdminPublicationValidationResponse | null = null;
  brands: EcommerceAdminBrandResponse[] = [];
  onlineCategories: EcommerceAdminOnlineCategoryResponse[] = [];

  canView = false;
  canManage = false;

  loading = false;
  actionLoading = false;
  profileSaving = false;
  seoSaving = false;
  assetSaving = false;
  priceSaving = false;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";
  profileErrorMessage = "";
  seoErrorMessage = "";
  assetErrorMessage = "";
  priceErrorMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    const parsedProductId = Number(this.route.snapshot.paramMap.get("productId"));
    if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
      this.errorMessage = "El productId de la ruta es inválido.";
      return;
    }
    this.productId = parsedProductId;

    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.includes("ADMIN");
        this.canView = user.roles.some((role) => role === "ADMIN" || role === "SUPERVISOR");
        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para revisar perfiles online en esta pantalla.";
          this.disableMutationForms();
          return;
        }

        if (!this.canManage) {
          this.disableMutationForms();
        }

        this.loadInitialData();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
        this.disableMutationForms();
      },
    });
  }

  reloadData(): void {
    this.loadInitialData(true);
  }

  saveProfile(): void {
    if (!this.canManage || !this.productId) {
      return;
    }

    this.profileErrorMessage = "";
    this.successMessage = "";

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const brandId = raw.brandId ?? null;

    this.profileSaving = true;
    this.ecommerceAdminService
      .updateOnlineProfile(this.productId, {
        slug: this.trimToNull(raw.slug),
        onlineName: this.trimToNull(raw.onlineName),
        onlineDescription: this.trimToNull(raw.onlineDescription),
        onlineCategoryId: raw.onlineCategoryId ?? null,
        brandId,
        brandAbsencePolicy: brandId ? null : raw.brandAbsencePolicy ?? null,
      })
      .subscribe({
        next: (profile) => {
          this.profileSaving = false;
          this.profile = profile;
          this.publicationValidation = profile.publicationValidation;
          this.syncFormsFromProfile(profile);
          this.successMessage = "Perfil online actualizado correctamente.";
          this.refreshValidation();
        },
        error: (error: unknown) => {
          this.profileSaving = false;
          this.profileErrorMessage = toHttpErrorMessage(
            error,
            "No se pudo actualizar el perfil online.",
          );
        },
      });
  }

  saveSeo(): void {
    if (!this.canManage || !this.productId) {
      return;
    }

    this.seoErrorMessage = "";
    this.successMessage = "";

    if (this.seoForm.invalid) {
      this.seoForm.markAllAsTouched();
      return;
    }

    const raw = this.seoForm.getRawValue();
    this.seoSaving = true;

    this.ecommerceAdminService
      .upsertSeo(this.productId, {
        seoTitle: this.trimToNull(raw.seoTitle),
        seoDescription: this.trimToNull(raw.seoDescription),
        canonicalPath: this.trimToNull(raw.canonicalPath),
        robotsPolicy: raw.robotsPolicy ?? null,
        indexable: !!raw.indexable,
        ogTitle: this.trimToNull(raw.ogTitle),
        ogDescription: this.trimToNull(raw.ogDescription),
        ogImageUrl: this.trimToNull(raw.ogImageUrl),
      })
      .subscribe({
        next: (seo) => {
          this.seoSaving = false;
          if (this.profile) {
            this.profile = { ...this.profile, seo };
          }
          this.successMessage = "SEO actualizado correctamente.";
          this.refreshValidation();
        },
        error: (error: unknown) => {
          this.seoSaving = false;
          this.seoErrorMessage = toHttpErrorMessage(error, "No se pudo actualizar SEO.");
        },
      });
  }

  saveAsset(): void {
    if (!this.canManage || !this.productId) {
      return;
    }

    this.assetErrorMessage = "";
    this.successMessage = "";

    if (this.assetForm.invalid) {
      this.assetForm.markAllAsTouched();
      return;
    }

    const raw = this.assetForm.getRawValue();
    this.assetSaving = true;

    this.ecommerceAdminService
      .upsertPrimaryAsset(this.productId, {
        assetType: raw.assetType ?? "PRODUCT_IMAGE",
        assetUrl: String(raw.assetUrl || "").trim(),
        altText: this.trimToNull(raw.altText),
        source: raw.source ?? "OWN",
        rightsConfirmed: !!raw.rightsConfirmed,
        displayOrder: Math.max(Number(raw.displayOrder ?? 0), 0),
      })
      .subscribe({
        next: (primaryAsset) => {
          this.assetSaving = false;
          if (this.profile) {
            this.profile = { ...this.profile, primaryAsset };
          }
          this.successMessage = "Imagen principal actualizada correctamente.";
          this.refreshValidation();
        },
        error: (error: unknown) => {
          this.assetSaving = false;
          this.assetErrorMessage = toHttpErrorMessage(
            error,
            "No se pudo actualizar la imagen principal.",
          );
        },
      });
  }

  savePriceOverride(): void {
    if (!this.canManage || !this.productId) {
      return;
    }

    this.priceErrorMessage = "";
    this.successMessage = "";

    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }

    const raw = this.priceForm.getRawValue();
    this.priceSaving = true;

    this.ecommerceAdminService
      .upsertPriceOverride(this.productId, {
        amount: Number(raw.amount),
        currency: this.trimToNull(raw.currency),
        active: !!raw.active,
        validFrom: this.localInputToIso(raw.validFrom),
        validTo: this.localInputToIso(raw.validTo),
        reason: this.trimToNull(raw.reason),
      })
      .subscribe({
        next: () => {
          this.priceSaving = false;
          this.successMessage = "Precio online actualizado correctamente.";
          this.refreshProfileAndValidation();
        },
        error: (error: unknown) => {
          this.priceSaving = false;
          this.priceErrorMessage = toHttpErrorMessage(
            error,
            "No se pudo actualizar el precio online.",
          );
        },
      });
  }

  async publishProfile(): Promise<void> {
    if (!this.canManage || !this.productId || !this.profile) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Publicar perfil online",
      description:
        "El producto quedará visible para publicación online si cumple reglas de negocio. Esta acción puede impactar SEO y visibilidad.",
      confirmText: "Publicar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    this.actionLoading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.ecommerceAdminService.publish(this.productId).subscribe({
      next: (profile) => {
        this.actionLoading = false;
        this.profile = profile;
        this.publicationValidation = profile.publicationValidation;
        this.syncFormsFromProfile(profile);
        this.successMessage = "Perfil publicado correctamente.";
        this.refreshValidation();
      },
      error: (error: unknown) => {
        this.actionLoading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo publicar el perfil online.");
      },
    });
  }

  async unpublishProfile(): Promise<void> {
    if (!this.canManage || !this.productId || !this.profile) {
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: "Despublicar perfil online",
      description:
        "El producto dejará de estar publicado online. Esta acción conserva datos de perfil y SEO para futuras revisiones.",
      confirmText: "Despublicar",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    this.actionLoading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.ecommerceAdminService.unpublish(this.productId).subscribe({
      next: (profile) => {
        this.actionLoading = false;
        this.profile = profile;
        this.publicationValidation = profile.publicationValidation;
        this.syncFormsFromProfile(profile);
        this.successMessage = "Perfil despublicado correctamente.";
        this.refreshValidation();
      },
      error: (error: unknown) => {
        this.actionLoading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo despublicar el perfil online.",
        );
      },
    });
  }

  isProfileInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isAssetInvalid(controlName: string): boolean {
    const control = this.assetForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isPriceInvalid(controlName: string): boolean {
    const control = this.priceForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  publicationBadgeClass(status: OnlinePublicationStatus): string {
    switch (status) {
      case "PUBLISHED":
        return "ui-badge--success";
      case "READY_FOR_REVIEW":
      case "UNPUBLISHED":
        return "ui-badge--warning";
      case "BLOCKED":
      case "INCOMPLETE":
        return "ui-badge--danger";
      default:
        return "";
    }
  }

  statusLabel(status: OnlinePublicationStatus): string {
    switch (status) {
      case "DRAFT":
        return "Borrador";
      case "INCOMPLETE":
        return "Incompleto";
      case "READY_FOR_REVIEW":
        return "Listo para revisión";
      case "PUBLISHED":
        return "Publicado";
      case "UNPUBLISHED":
        return "Despublicado";
      case "BLOCKED":
        return "Bloqueado";
      default:
        return status;
    }
  }

  publicProductPath(): string | null {
    const slug = this.profile?.slug?.trim();
    if (!this.profile || this.profile.publicationStatus !== "PUBLISHED" || !slug) {
      return null;
    }
    return `/productos/${slug}`;
  }

  effectivePriceLabel(): string {
    const price = this.profile?.effectivePrice;
    if (!price) {
      return "No disponible";
    }
    return this.formatCurrency(price.amount, price.currency);
  }

  onlineCategoryLabel(categoryId: number | null): string {
    if (categoryId === null) {
      return "Sin categoría online";
    }
    const category = this.onlineCategories.find((item) => item.id === categoryId);
    return category ? `${category.name} (#${category.id})` : `Categoría #${categoryId}`;
  }

  brandLabel(profile: EcommerceAdminOnlineProfileDetailResponse): string {
    if (profile.brandId !== null) {
      const brand = this.brands.find((item) => item.id === profile.brandId);
      return brand ? `${brand.name} (#${brand.id})` : `Marca #${profile.brandId}`;
    }
    return profile.brandAbsencePolicy
      ? this.brandAbsencePolicyLabel(profile.brandAbsencePolicy)
      : "Sin marca definida";
  }

  brandAbsencePolicyLabel(policy: BrandAbsencePolicy): string {
    switch (policy) {
      case "GENERIC":
        return "Marca genérica";
      case "UNBRANDED":
        return "Producto sin marca";
      default:
        return policy;
    }
  }

  validationSummaryLabel(): string {
    const missingCount = this.publicationValidation?.missingRequirements.length ?? 0;
    if (missingCount === 0) {
      return "Sin pendientes de publicación.";
    }
    return `${missingCount} requisito(s) pendiente(s). Corrige las secciones marcadas antes de publicar.`;
  }

  isRequirementMissing(requirement: MissingRequirement): boolean {
    return this.publicationValidation?.missingRequirements.includes(requirement) ?? false;
  }

  groupPendingCount(requirements: MissingRequirement[]): number {
    return requirements.filter((requirement) => this.isRequirementMissing(requirement)).length;
  }

  requirementLabel(requirement: MissingRequirement): string {
    switch (requirement) {
      case "PRODUCT_INACTIVE":
        return "Producto ERP activo";
      case "SKU_MISSING":
        return "SKU operativo definido";
      case "ONLINE_NAME_MISSING":
        return "Nombre online";
      case "ONLINE_DESCRIPTION_MISSING":
        return "Descripción online";
      case "SLUG_MISSING":
        return "Slug público válido";
      case "SLUG_DUPLICATE":
        return "Slug único";
      case "CATEGORY_MISSING":
        return "Categoría online";
      case "CATEGORY_INACTIVE":
        return "Categoría online activa";
      case "BRAND_MISSING":
        return "Marca o política sin marca";
      case "BRAND_INACTIVE":
        return "Marca activa";
      case "ASSET_MISSING":
        return "Imagen principal";
      case "ASSET_INVALID":
        return "Imagen publicable";
      case "SEO_MISSING":
        return "SEO creado";
      case "SEO_INCOMPLETE":
        return "SEO completo e indexable";
      case "PRICE_INVALID":
        return "Precio efectivo válido";
      default:
        return requirement;
    }
  }

  requirementHelp(requirement: MissingRequirement): string {
    switch (requirement) {
      case "PRODUCT_INACTIVE":
        return "Activa el producto desde Catálogo ERP/POS.";
      case "SKU_MISSING":
        return "Define el SKU en el producto ERP/POS.";
      case "ONLINE_NAME_MISSING":
        return "Completa el nombre comercial para ecommerce.";
      case "ONLINE_DESCRIPTION_MISSING":
        return "Agrega una descripción útil para venta online.";
      case "SLUG_MISSING":
        return "Define una ruta limpia para la URL pública.";
      case "SLUG_DUPLICATE":
        return "Usa un slug que no exista en otro perfil.";
      case "CATEGORY_MISSING":
        return "Selecciona una categoría online activa.";
      case "CATEGORY_INACTIVE":
        return "Reactiva o cambia la categoría online.";
      case "BRAND_MISSING":
        return "Selecciona una marca o declara que el producto no tiene marca.";
      case "BRAND_INACTIVE":
        return "Reactiva o cambia la marca.";
      case "ASSET_MISSING":
        return "Carga la URL de la imagen principal.";
      case "ASSET_INVALID":
        return "Usa imagen de producto, alt text y derechos confirmados.";
      case "SEO_MISSING":
        return "Guarda metadatos SEO para el perfil.";
      case "SEO_INCOMPLETE":
        return "Completa title, description y política de indexación.";
      case "PRICE_INVALID":
        return "Verifica que el precio efectivo sea mayor a cero.";
      default:
        return "Revisa esta condición antes de publicar.";
    }
  }

  robotsPolicyLabel(policy: RobotsPolicy): string {
    switch (policy) {
      case "INDEX_FOLLOW":
        return "Indexar y seguir enlaces";
      case "NOINDEX_FOLLOW":
        return "No indexar, seguir enlaces";
      case "NOINDEX_NOFOLLOW":
        return "No indexar ni seguir enlaces";
      default:
        return policy;
    }
  }

  assetTypeLabel(assetType: AssetType): string {
    switch (assetType) {
      case "PRODUCT_IMAGE":
        return "Imagen de producto";
      case "BRAND_LOGO":
        return "Logo de marca";
      case "CATEGORY_IMAGE":
        return "Imagen de categoría";
      case "OPEN_GRAPH_IMAGE":
        return "Imagen para redes sociales";
      default:
        return assetType;
    }
  }

  assetSourceLabel(source: AssetSource): string {
    switch (source) {
      case "OWN":
        return "Propia";
      case "SUPPLIER":
        return "Proveedor";
      case "GENERATED":
        return "Generada";
      case "OTHER":
        return "Otra fuente";
      default:
        return source;
    }
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return "-";
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  private loadInitialData(showSuccess = false): void {
    if (!this.productId || !this.canView) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    if (!showSuccess) {
      this.successMessage = "";
    }

    forkJoin({
      profile: this.ecommerceAdminService.getOnlineProfile(this.productId),
      validation: this.ecommerceAdminService.validatePublication(this.productId),
      brands: this.ecommerceAdminService.listBrands(),
      onlineCategories: this.ecommerceAdminService.listOnlineCategories(),
    }).subscribe({
      next: ({ profile, validation, brands, onlineCategories }) => {
        this.loading = false;
        this.profile = profile;
        this.publicationValidation = validation;
        this.brands = brands;
        this.onlineCategories = onlineCategories;
        this.syncFormsFromProfile(profile);
        if (!this.canManage) {
          this.disableMutationForms();
        }
        if (showSuccess) {
          this.successMessage = "Datos actualizados correctamente.";
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle del perfil online.",
        );
      },
    });
  }

  private refreshValidation(): void {
    if (!this.productId) {
      return;
    }

    this.ecommerceAdminService.validatePublication(this.productId).subscribe({
      next: (validation) => {
        this.publicationValidation = validation;
      },
      error: () => {
        this.publicationValidation = null;
      },
    });
  }

  private refreshProfileAndValidation(): void {
    if (!this.productId) {
      return;
    }

    forkJoin({
      profile: this.ecommerceAdminService.getOnlineProfile(this.productId),
      validation: this.ecommerceAdminService.validatePublication(this.productId),
    }).subscribe({
      next: ({ profile, validation }) => {
        this.profile = profile;
        this.publicationValidation = validation;
        this.syncFormsFromProfile(profile);
      },
      error: () => {
        this.errorMessage =
          "Se guardaron cambios, pero no se pudo refrescar el detalle. Usa Actualizar para sincronizar.";
      },
    });
  }

  private syncFormsFromProfile(profile: EcommerceAdminOnlineProfileDetailResponse): void {
    this.profileForm.patchValue({
      slug: profile.slug || "",
      onlineName: profile.onlineName || "",
      onlineDescription: profile.onlineDescription || "",
      onlineCategoryId: profile.onlineCategoryId,
      brandId: profile.brandId,
      brandAbsencePolicy: profile.brandAbsencePolicy,
    });

    this.seoForm.patchValue({
      seoTitle: profile.seo?.seoTitle || "",
      seoDescription: profile.seo?.seoDescription || "",
      canonicalPath: profile.seo?.canonicalPath || "",
      robotsPolicy: profile.seo?.robotsPolicy ?? "NOINDEX_FOLLOW",
      indexable: profile.seo?.indexable ?? false,
      ogTitle: profile.seo?.ogTitle || "",
      ogDescription: profile.seo?.ogDescription || "",
      ogImageUrl: profile.seo?.ogImageUrl || "",
    });

    this.assetForm.patchValue({
      assetType: profile.primaryAsset?.assetType ?? "PRODUCT_IMAGE",
      assetUrl: profile.primaryAsset?.assetUrl || "",
      altText: profile.primaryAsset?.altText || "",
      source: profile.primaryAsset?.source ?? "OWN",
      rightsConfirmed: profile.primaryAsset?.rightsConfirmed ?? false,
      displayOrder: profile.primaryAsset?.displayOrder ?? 0,
    });

    this.priceForm.patchValue({
      amount: profile.activePriceOverride?.amount ?? null,
      currency: profile.activePriceOverride?.currency ?? "PEN",
      active: profile.activePriceOverride?.active ?? true,
      validFrom: this.isoToLocalInput(profile.activePriceOverride?.validFrom || null),
      validTo: this.isoToLocalInput(profile.activePriceOverride?.validTo || null),
      reason: profile.activePriceOverride?.reason || "",
    });
  }

  private disableMutationForms(): void {
    this.profileForm.disable();
    this.seoForm.disable();
    this.assetForm.disable();
    this.priceForm.disable();
  }

  private trimToNull(value: string | null | undefined): string | null {
    const raw = String(value || "").trim();
    return raw ? raw : null;
  }

  private isoToLocalInput(value: string | null): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private localInputToIso(value: string | null | undefined): string | null {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }
}
