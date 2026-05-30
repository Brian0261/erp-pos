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
  OnlinePublicationStatus,
  RobotsPolicy,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-online-profile-detail-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="ui-card ecommerce-detail-page">
      <header class="ui-page-head">
        <div>
          <a class="back-link" routerLink="/ecommerce-admin/perfiles">Volver al listado</a>
          <p class="ui-page-kicker">Catalogo online</p>
          <h1 class="ui-page-title">
            Perfil online del producto #{{ productId || "-" }}
          </h1>
          <p class="ui-page-description">
            Gestiona perfil, SEO, asset principal y override de precio para publicacion.
          </p>
        </div>

        <div class="header-actions" *ngIf="profile">
          <span class="ui-badge" [ngClass]="publicationBadgeClass(profile.publicationStatus)">
            {{ statusLabel(profile.publicationStatus) }}
          </span>

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
            Actualizar
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

      <section class="ui-module-section" *ngIf="!loading && profile">
        <div class="summary-grid">
          <article class="summary-card">
            <p class="summary-label">Producto</p>
            <p class="summary-value">#{{ profile.productId }}</p>
          </article>
          <article class="summary-card">
            <p class="summary-label">Perfil</p>
            <p class="summary-value">#{{ profile.profileId }}</p>
          </article>
          <article class="summary-card">
            <p class="summary-label">Publicado</p>
            <p class="summary-value">{{ formatDateTime(profile.publishedAt) }}</p>
          </article>
          <article class="summary-card">
            <p class="summary-label">Actualizado</p>
            <p class="summary-value">{{ formatDateTime(profile.updatedAt) }}</p>
          </article>
        </div>

        <p class="ui-alert ui-alert--info" *ngIf="!canManage && canView">
          Modo revision: como SUPERVISOR solo puedes consultar. Las acciones de cambio son exclusivas de ADMIN.
        </p>
      </section>

      <section class="ui-module-section" *ngIf="profile && publicationValidation">
        <header class="section-head">
          <h2>Checklist de publicacion (backend)</h2>
        </header>

        <div class="validation-head">
          <span
            class="ui-badge"
            [class.ui-badge--success]="publicationValidation.publishable"
            [class.ui-badge--danger]="!publicationValidation.publishable"
          >
            {{ publicationValidation.publishable ? "Publicable" : "Bloqueado" }}
          </span>
          <span class="ui-muted" *ngIf="publicationValidation.effectivePrice !== null">
            Precio efectivo backend:
            {{ formatCurrency(publicationValidation.effectivePrice, publicationValidation.currency) }}
          </span>
        </div>

        <ul class="validation-errors" *ngIf="publicationValidation.errors.length > 0; else noErrors">
          <li *ngFor="let error of publicationValidation.errors">{{ error }}</li>
        </ul>
        <ng-template #noErrors>
          <p class="ui-muted">Sin bloqueos de publicacion reportados por backend.</p>
        </ng-template>
      </section>

      <section class="ui-module-section" *ngIf="profile">
        <header class="section-head">
          <h2>Perfil online</h2>
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
              El nombre online excede el maximo permitido.
            </small>
          </label>

          <label class="field field--full">
            <span>Descripcion online</span>
            <textarea formControlName="onlineDescription" rows="4" maxlength="2000"></textarea>
          </label>

          <label class="field">
            <span>Categoria online</span>
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
            <span>Politica sin marca</span>
            <select formControlName="brandAbsencePolicy">
              <option [ngValue]="null">No aplica</option>
              <option *ngFor="let policy of brandAbsencePolicies" [ngValue]="policy">
                {{ policy }}
              </option>
            </select>
            <small class="field-help">Solo aplica cuando no hay marca seleccionada.</small>
          </label>

          <div class="section-actions" *ngIf="canManage">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="profileSaving"
            >
              Guardar perfil
            </button>
          </div>
        </form>

        <p class="ui-alert ui-alert--error" *ngIf="profileErrorMessage">
          {{ profileErrorMessage }}
        </p>
      </section>

      <section class="ui-module-section" *ngIf="profile">
        <header class="section-head">
          <h2>SEO</h2>
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
            <span>Canonical path</span>
            <input type="text" formControlName="canonicalPath" maxlength="300" />
          </label>

          <label class="field">
            <span>Robots policy</span>
            <select formControlName="robotsPolicy">
              <option [ngValue]="null">Sin definir</option>
              <option *ngFor="let policy of robotsPolicies" [ngValue]="policy">
                {{ policy }}
              </option>
            </select>
          </label>

          <label class="field field--checkbox">
            <input type="checkbox" formControlName="indexable" />
            <span>Indexable</span>
          </label>

          <label class="field">
            <span>OG title</span>
            <input type="text" formControlName="ogTitle" maxlength="160" />
          </label>

          <label class="field field--full">
            <span>OG description</span>
            <textarea formControlName="ogDescription" rows="3" maxlength="320"></textarea>
          </label>

          <label class="field">
            <span>OG image URL</span>
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

      <section class="ui-module-section" *ngIf="profile">
        <header class="section-head">
          <h2>Imagen principal</h2>
        </header>

        <form [formGroup]="assetForm" class="form-grid" (ngSubmit)="saveAsset()">
          <label class="field">
            <span>Asset type</span>
            <select formControlName="assetType">
              <option *ngFor="let assetType of assetTypes" [ngValue]="assetType">
                {{ assetType }}
              </option>
            </select>
          </label>

          <label class="field field--full">
            <span>URL de imagen</span>
            <input type="text" formControlName="assetUrl" maxlength="500" />
            <small class="field-help" *ngIf="isAssetInvalid('assetUrl')">
              La URL es obligatoria para guardar el asset principal.
            </small>
          </label>

          <label class="field">
            <span>Alt text</span>
            <input type="text" formControlName="altText" maxlength="250" />
          </label>

          <label class="field">
            <span>Fuente</span>
            <select formControlName="source">
              <option *ngFor="let source of assetSources" [ngValue]="source">
                {{ source }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Display order</span>
            <input type="number" formControlName="displayOrder" min="0" step="1" />
          </label>

          <label class="field field--checkbox">
            <input type="checkbox" formControlName="rightsConfirmed" />
            <span>Derechos confirmados</span>
          </label>

          <div class="section-actions" *ngIf="canManage">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="assetSaving"
            >
              Guardar imagen principal
            </button>
          </div>
        </form>

        <p class="ui-alert ui-alert--error" *ngIf="assetErrorMessage">
          {{ assetErrorMessage }}
        </p>
      </section>

      <section class="ui-module-section" *ngIf="profile">
        <header class="section-head">
          <h2>Override de precio online</h2>
        </header>

        <p class="ui-muted effective-price">
          Precio efectivo (backend):
          <strong>
            {{
              profile.effectivePrice
                ? formatCurrency(profile.effectivePrice.amount, profile.effectivePrice.currency)
                : "No disponible"
            }}
          </strong>
        </p>

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
            <span>Override activo</span>
          </label>

          <label class="field">
            <span>Valido desde</span>
            <input type="datetime-local" formControlName="validFrom" />
          </label>

          <label class="field">
            <span>Valido hasta</span>
            <input type="datetime-local" formControlName="validTo" />
          </label>

          <label class="field field--full">
            <span>Motivo</span>
            <textarea formControlName="reason" rows="2" maxlength="300"></textarea>
          </label>

          <div class="section-actions" *ngIf="canManage">
            <button type="submit" class="ui-button ui-button--primary" [disabled]="priceSaving">
              Guardar override
            </button>
          </div>
        </form>

        <p class="ui-alert ui-alert--error" *ngIf="priceErrorMessage">
          {{ priceErrorMessage }}
        </p>
      </section>
    </section>
  `,
  styles: [
    `
      .ecommerce-detail-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
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

      .header-actions {
        display: inline-flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-2);
      }

      .summary-card {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: var(--space-2);
        background: var(--color-bg-soft);
      }

      .summary-label {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .summary-value {
        margin: var(--space-1) 0 0;
        font-family: var(--font-family-mono);
        font-weight: 700;
      }

      .section-head {
        margin-bottom: var(--space-2);
      }

      .section-head h2 {
        margin: 0;
      }

      .validation-head {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-bottom: var(--space-2);
      }

      .validation-errors {
        margin: 0;
        padding-left: 1.2rem;
        display: grid;
        gap: 0.35rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
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

      .field--full {
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
        grid-column: 1 / -1;
        display: inline-flex;
        justify-content: flex-start;
      }

      .effective-price {
        margin-top: 0;
      }

      @media (max-width: 1100px) {
        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 860px) {
        .ecommerce-detail-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .field--full {
          grid-column: auto;
        }

        .section-actions {
          grid-column: auto;
        }

        .summary-grid {
          grid-template-columns: 1fr;
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
      this.errorMessage = "El productId de la ruta es invalido.";
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
          this.successMessage = "Override de precio actualizado correctamente.";
          this.refreshProfileAndValidation();
        },
        error: (error: unknown) => {
          this.priceSaving = false;
          this.priceErrorMessage = toHttpErrorMessage(
            error,
            "No se pudo actualizar el override de precio.",
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
        "El producto quedara visible para publicacion online si cumple reglas de negocio. Esta accion puede impactar SEO y visibilidad.",
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
        "El producto dejara de estar publicado online. Esta accion conserva datos de perfil y SEO para futuras revisiones.",
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
        return "Listo para revision";
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
