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
  target: OnlineProfileDetailTab | "product";
  requirements: MissingRequirement[];
}

type OnlineProfileDetailTab = "content" | "seo" | "asset" | "price";

interface DetailTab {
  id: OnlineProfileDetailTab;
  label: string;
  description: string;
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
          <div class="hero-nav-row">
            <a class="back-link" routerLink="/ecommerce-admin/perfiles">← Volver a perfiles</a>
          </div>
          <h1 class="ui-page-title">
            {{ profile?.onlineName || profile?.productName || "Perfil online" }}
          </h1>
          <p class="ui-page-description">
            Revisa el producto ERP, completa la información online y corrige los pendientes antes de publicar.
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

      <section class="overview-grid" id="erp-identity-summary" *ngIf="!loading && profile">
        <article class="overview-card overview-card--product">
          <p class="overview-kicker">Identidad ERP/POS</p>
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
          <p class="overview-kicker">Categoría y marca</p>
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
          <section class="tabs-shell" id="profile-tabs">
            <div class="tab-list" role="tablist" aria-label="Secciones del perfil online">
              <button
                *ngFor="let tab of detailTabs"
                type="button"
                class="tab-button"
                role="tab"
                [class.is-active]="activeTab === tab.id"
                [attr.aria-selected]="activeTab === tab.id"
                [attr.aria-controls]="tab.id + '-panel'"
                (click)="setActiveTab(tab.id)"
              >
                <span>{{ tab.label }}</span>
                <span
                  class="tab-badge"
                  [class.is-ok]="pendingCountForTab(tab.id) === 0"
                >
                  {{ pendingCountForTab(tab.id) === 0 ? "OK" : pendingCountForTab(tab.id) }}
                </span>
              </button>
            </div>
          </section>

          <section
            class="detail-card"
            id="content-panel"
            role="tabpanel"
            [hidden]="activeTab !== 'content'"
          >
            <header class="card-head">
              <div>
                <p class="overview-kicker">Editable ecommerce</p>
                <h2>Contenido ecommerce</h2>
              </div>
            </header>

            <form [formGroup]="profileForm" class="form-grid" (ngSubmit)="saveProfile()">
              <label class="field">
                <span>Nombre online</span>
                <input type="text" formControlName="onlineName" maxlength="180" />
                <small class="field-help" *ngIf="isProfileInvalid('onlineName')">
                  El nombre online excede el máximo permitido.
                </small>
              </label>

              <label class="field">
                <span>Slug</span>
                <input type="text" formControlName="slug" maxlength="180" />
                <small class="field-help">Ruta pública del producto. Se normaliza al guardar.</small>
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

          <section
            class="detail-card"
            id="seo-panel"
            role="tabpanel"
            [hidden]="activeTab !== 'seo'"
          >
            <header class="card-head">
              <div>
                <h2>SEO</h2>
              </div>
            </header>

            <form [formGroup]="seoForm" class="form-grid" (ngSubmit)="saveSeo()">
              <p class="form-group-label form-group-label--full">SEO básico</p>

              <label class="field field--full">
                <span>Título SEO</span>
                <input type="text" formControlName="seoTitle" maxlength="160" />
              </label>

              <label class="field field--full">
                <span>Descripción SEO</span>
                <textarea formControlName="seoDescription" rows="3" maxlength="320"></textarea>
              </label>

              <label class="field">
                <span>Política de robots</span>
                <select formControlName="robotsPolicy">
                  <option [ngValue]="null">Sin definir</option>
                  <option *ngFor="let policy of robotsPolicies" [ngValue]="policy">
                    {{ robotsPolicyLabel(policy) }}
                  </option>
                </select>
                <small class="field-help">Define la instrucción técnica que recibirán los buscadores.</small>
              </label>

              <div class="field field--checkbox-block">
                <label class="field field--checkbox field--checkbox-inline">
                  <input type="checkbox" formControlName="indexable" />
                  <span>Habilitar indexación pública</span>
                </label>
                <small class="field-help field-help--nested">
                  Requiere política "Indexar y seguir enlaces" y SEO básico completo.
                </small>
              </div>

              <p class="ui-alert ui-alert--info seo-index-warning" *ngIf="shouldShowIndexingWarning()">
                Para habilitar indexación pública, cambia la política de robots a "Indexar y seguir enlaces".
              </p>

              <p class="form-group-label form-group-label--full">SEO avanzado y redes sociales</p>

              <label class="field">
                <span>Ruta canónica</span>
                <input type="text" formControlName="canonicalPath" maxlength="300" />
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

          <section
            class="detail-card"
            id="asset-panel"
            role="tabpanel"
            [hidden]="activeTab !== 'asset'"
          >
            <header class="card-head">
              <div>
                <h2>Imagen principal</h2>
              </div>
            </header>

            <form [formGroup]="assetForm" class="form-grid" (ngSubmit)="saveAsset()">
              <p class="form-group-label form-group-label--full">Datos de imagen</p>

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

              <p class="form-group-label form-group-label--full">Origen y derechos</p>

              <label class="field">
                <span>Fuente</span>
                <select formControlName="source">
                  <option *ngFor="let source of assetSources" [ngValue]="source">
                    {{ assetSourceLabel(source) }}
                  </option>
                </select>
              </label>

              <label class="field field--checkbox">
                <input type="checkbox" formControlName="rightsConfirmed" />
                <span>Derechos confirmados</span>
              </label>

              <p class="form-group-label form-group-label--full">Configuración</p>

              <label class="field">
                <span>Tipo de imagen</span>
                <select formControlName="assetType">
                  <option *ngFor="let assetType of assetTypes" [ngValue]="assetType">
                    {{ assetTypeLabel(assetType) }}
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Orden de visualización</span>
                <input type="number" formControlName="displayOrder" min="0" step="1" />
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

          <section
            class="detail-card"
            id="price-panel"
            role="tabpanel"
            [hidden]="activeTab !== 'price'"
          >
            <header class="card-head">
              <div>
                <h2>Precio online</h2>
              </div>
            </header>

            <p class="form-group-label form-group-label--full">Precio actual</p>
            <div class="price-strip">
              <span>Precio efectivo</span>
              <strong>{{ effectivePriceLabel() }}</strong>
            </div>

            <form [formGroup]="priceForm" class="form-grid" (ngSubmit)="savePriceOverride()">
              <p class="form-group-label form-group-label--full">Precio personalizado</p>

              <div class="field field--full field--checkbox-block field--price-toggle">
                <label class="field field--checkbox field--checkbox-inline field--price-toggle-inline">
                  <input type="checkbox" formControlName="active" />
                  <span>Usar precio personalizado online</span>
                </label>
                <small class="field-help field-help--nested field-help--price-toggle">
                  Solo cambia el precio mostrado online. No modifica el precio del ERP/POS.
                </small>
              </div>

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
                {{ publicationValidation.publishable ? "OK" : "Pendiente" }}
              </span>
            </div>

            <div class="publish-summary" aria-label="Resumen de requisitos de publicación">
              <div class="publish-summary__item publish-summary__item--pending">
                <strong>{{ pendingRequirementsCount() }}</strong>
                <span>Pendientes</span>
              </div>
              <div class="publish-summary__item">
                <strong>{{ completedRequirementsCount() }}</strong>
                <span>Completados</span>
              </div>
            </div>

            <p class="publish-state" *ngIf="firstPendingRequirementLabel() as nextRequirement">
              Siguiente pendiente: {{ nextRequirement }}
            </p>

            <p class="publish-state" *ngIf="!hasPendingRequirements()">
              Sin pendientes de publicación.
            </p>

            <button
              type="button"
              class="first-pending-button"
              (click)="goToFirstPending()"
              [disabled]="!hasPendingRequirements()"
            >
              Ir al primer pendiente
            </button>

            <div class="publish-card__body">
              <section class="checklist-section" *ngIf="pendingRequirementGroups().length > 0">
                <p class="checklist-section-title">Pendientes</p>

                <div class="checklist-group checklist-group--pending" *ngFor="let group of pendingRequirementGroups()">
                  <div class="checklist-group__head">
                    <button type="button" class="checklist-nav" (click)="openRequirementGroup(group)">
                      {{ group.title }}
                    </button>
                    <span>{{ groupPendingCount(group.requirements) }} pendiente(s)</span>
                  </div>
                  <ul class="checklist-list checklist-list--pending">
                    <li
                      *ngFor="let requirement of pendingRequirementsForGroup(group)"
                      class="is-missing"
                    >
                      <span class="check-dot"></span>
                      <button type="button" class="checklist-item" (click)="openRequirement(requirement)">
                        <strong>{{ requirementLabel(requirement) }}</strong>
                        <small>{{ requirementHelp(requirement) }}</small>
                      </button>
                    </li>
                  </ul>
                </div>
              </section>

              <details
                class="checklist-section checklist-section--completed completed-details"
                *ngIf="hasPendingRequirements() && completedRequirementsCount() > 0"
              >
                <summary>
                  <span>Completados</span>
                  <strong>{{ completedRequirementsCount() }} OK</strong>
                </summary>

                <div class="completed-group" *ngFor="let group of completedRequirementGroups()">
                  <button type="button" class="checklist-nav completed-group__button" (click)="openRequirementGroup(group)">
                    {{ group.title }}
                  </button>
                  <span>{{ group.requirements.length }} OK</span>
                </div>

                <div class="completed-group" *ngFor="let group of partialCompletedRequirementGroups()">
                  <button type="button" class="checklist-nav completed-group__button" (click)="openRequirementGroup(group)">
                    {{ group.title }}
                  </button>
                  <span>{{ completedCountForGroup(group.requirements) }} OK</span>
                </div>
              </details>

              <section class="checklist-section checklist-section--ready" *ngIf="!hasPendingRequirements()">
                <p class="ready-note">Todos los requisitos principales están completos.</p>
                <details class="completed-details ready-details">
                  <summary>
                    <span>Ver requisitos completados</span>
                    <strong>{{ completedRequirementsCount() }} OK</strong>
                  </summary>

                  <div class="completed-group" *ngFor="let group of requirementGroups">
                    <button type="button" class="checklist-nav completed-group__button" (click)="openRequirementGroup(group)">
                      {{ group.title }}
                    </button>
                    <span>{{ group.requirements.length }} OK</span>
                  </div>
                </details>
              </section>

              <details class="technical-count" *ngIf="publicationValidation.errors.length > 0">
                <summary>{{ publicationValidation.errors.length }} bloqueo(s) técnicos</summary>
                <p>
                  El backend devolvió bloqueos adicionales. Se muestran arriba como tareas accionables cuando aplican.
                </p>
              </details>
            </div>
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
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-4);
        padding: var(--space-4);
        background:
          linear-gradient(135deg, rgba(148, 163, 184, 0.1), transparent 48%),
          var(--color-bg-surface);
      }

      .hero-copy {
        display: grid;
        gap: var(--space-2);
        min-width: 0;
      }

      .hero-nav-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        width: fit-content;
        margin: 0;
        padding: 0.55rem 0.95rem;
        border: 1px solid color-mix(in srgb, var(--color-border-strong) 82%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-bg-soft) 86%, var(--color-bg-surface));
        font-weight: 700;
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        text-decoration: none;
        box-shadow: var(--shadow-sm);
        transition:
          background-color 140ms ease,
          border-color 140ms ease,
          color 140ms ease,
          transform 140ms ease;
      }

      .back-link:hover {
        background: color-mix(in srgb, var(--color-bg-soft) 100%, var(--color-bg-surface));
        border-color: color-mix(in srgb, var(--color-text-secondary) 55%, transparent);
        text-decoration: none;
        transform: translateY(-1px);
      }

      .back-link:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--color-text-secondary) 75%, white);
        outline-offset: 2px;
      }

      .hero-actions,
      .meta-line {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .hero-actions {
        align-self: start;
        justify-content: flex-end;
        padding-top: 0.2rem;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
        gap: var(--space-2);
      }

      .overview-card {
        padding: 0.85rem 1rem;
        display: grid;
        gap: 0.35rem;
        min-width: 0;
      }

      .overview-card--product {
        background: var(--color-bg-soft);
        border-color: color-mix(in srgb, var(--color-border-strong) 40%, transparent);
      }

      .overview-card h2,
      .overview-card h3,
      .detail-card h2 {
        margin: 0;
      }

      .overview-card h2 {
        font-size: 1.02rem;
        line-height: 1.15;
      }

      .overview-card h3 {
        font-size: 0.95rem;
        line-height: 1.18;
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
        font-size: var(--font-size-xs);
      }

      .summary-value {
        font-family: var(--font-family-mono);
        overflow-wrap: anywhere;
      }

      .overview-card--product .meta-line {
        row-gap: 0.25rem;
      }

      .ui-page-title {
        margin: 0;
        line-height: 1.08;
      }

      .ui-page-description {
        margin: 0;
        max-width: 58rem;
      }

      .detail-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(295px, 325px);
        gap: var(--space-4);
        align-items: start;
      }

      .detail-main {
        display: grid;
        gap: var(--space-4);
        min-width: 0;
      }

      .detail-card,
      .tabs-shell,
      .publish-card {
        padding: var(--space-3);
      }

      .tabs-shell {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .tab-list {
        display: flex;
        gap: var(--space-1);
        overflow-x: auto;
        padding: var(--space-1);
      }

      .tab-button {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        min-width: 8.5rem;
        border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
        border-radius: var(--radius-md);
        padding: 0.62rem 0.75rem;
        background: color-mix(in srgb, var(--color-bg-soft) 42%, transparent);
        color: var(--color-text-secondary);
        font: inherit;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }

      .tab-button:hover {
        background: color-mix(in srgb, var(--color-bg-soft) 88%, var(--color-bg-surface));
        border-color: color-mix(in srgb, var(--color-border-strong) 56%, transparent);
        color: var(--color-text-primary);
      }

      .tab-button:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--color-text-secondary) 72%, white);
        outline-offset: 2px;
      }

      .tab-button.is-active {
        border-color: color-mix(in srgb, var(--color-border-strong) 88%, transparent);
        background: color-mix(in srgb, var(--color-bg-soft) 100%, var(--color-bg-surface));
        color: var(--color-text-primary);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-text-secondary) 12%, transparent);
      }

      .tab-badge {
        min-width: 1.7rem;
        border-radius: 999px;
        padding: 0.1rem 0.45rem;
        background: color-mix(in srgb, var(--color-warning-bg) 88%, var(--color-bg-surface));
        color: color-mix(in srgb, var(--color-warning-text) 84%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        text-align: center;
      }

      .tab-badge.is-ok {
        background: var(--color-success-bg);
        color: var(--color-success-text);
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
        margin-bottom: var(--space-2);
      }

      .card-hint {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        text-align: right;
        max-width: 14rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-2);
      }

      .field {
        display: grid;
        gap: var(--space-1);
        min-width: 0;
        align-content: start;
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
        padding: 0.5rem 0.65rem;
        background: var(--color-bg-surface);
        box-sizing: border-box;
      }

      .field input,
      .field select {
        min-height: 2.75rem;
      }

      .field--full,
      .section-actions {
        grid-column: 1 / -1;
      }

      .form-group-label {
        margin: var(--space-1) 0 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .form-group-label--full {
        grid-column: 1 / -1;
      }

      .field--checkbox {
        grid-template-columns: auto 1fr;
        align-items: center;
        min-height: 2.75rem;
        align-self: center;
        gap: var(--space-2);
      }

      .field--checkbox-block {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.05rem;
        min-width: 0;
        align-self: center;
      }

      .field--checkbox-inline {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin: 0;
        transform: translateY(0);
      }

      .field--price-toggle {
        align-self: stretch;
        justify-content: flex-start;
        gap: 0;
      }

      .field--price-toggle-inline {
        min-height: auto;
        align-self: start;
        transform: translateY(0);
      }

      .field--checkbox input {
        width: auto;
        margin-top: 0;
      }

      .field-help--nested {
        padding-left: calc(1rem + 0.45rem);
        max-width: 100%;
        margin-top: -0.05rem;
        line-height: 1.2;
      }

      .field-help--price-toggle {
        margin-top: 0;
      }

      .seo-index-warning {
        grid-column: 1 / -1;
        margin-top: calc(var(--space-1) * -1);
        margin-bottom: 0;
        border: 1px solid color-mix(in srgb, var(--color-warning-bg) 70%, var(--color-border-default));
        background: color-mix(in srgb, var(--color-warning-bg) 18%, var(--color-bg-surface));
        color: color-mix(in srgb, var(--color-warning-text) 82%, var(--color-text-primary));
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
        margin-bottom: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
      }

      .publish-panel {
        position: sticky;
        top: 1rem;
        max-height: calc(100vh - 2rem);
        overflow: hidden;
      }

      .publish-card {
        display: grid;
        gap: 0.75rem;
        max-height: calc(100vh - 2rem);
      }

      .publish-state {
        margin: 0;
        color: color-mix(in srgb, var(--color-text-secondary) 88%, var(--color-text-primary));
        font-size: var(--font-size-sm);
        line-height: 1.35;
      }

      .publish-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-2);
      }

      .publish-summary__item {
        display: grid;
        gap: 0.1rem;
        padding: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
      }

      .publish-summary__item strong {
        color: var(--color-text-primary);
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1;
      }

      .publish-summary__item span {
        color: color-mix(in srgb, var(--color-text-secondary) 86%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        font-weight: 700;
        text-transform: uppercase;
      }

      .publish-summary__item--pending strong {
        color: var(--color-warning-text);
      }

      .publish-card__body {
        overflow-y: auto;
        padding-right: 0.35rem;
      }

      .publish-card__body::-webkit-scrollbar {
        width: 0.55rem;
      }

      .publish-card__body::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--color-border-strong) 70%, transparent);
        border-radius: 999px;
      }

      .first-pending-button {
        width: 100%;
        border: 1px solid color-mix(in srgb, var(--color-border-strong) 82%, transparent);
        border-radius: var(--radius-md);
        padding: 0.55rem 0.75rem;
        background: color-mix(in srgb, var(--color-bg-soft) 86%, var(--color-bg-surface));
        color: var(--color-text-primary);
        font: inherit;
        font-size: var(--font-size-sm);
        font-weight: 800;
        cursor: pointer;
      }

      .first-pending-button:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-bg-soft) 100%, var(--color-bg-surface));
        border-color: color-mix(in srgb, var(--color-text-secondary) 55%, transparent);
      }

      .first-pending-button:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--color-text-secondary) 72%, white);
        outline-offset: 2px;
      }

      .first-pending-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .checklist-group {
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-2);
      }

      .checklist-section {
        display: grid;
        gap: var(--space-2);
      }

      .checklist-section + .checklist-section {
        margin-top: var(--space-2);
      }

      .checklist-section-title {
        margin: 0;
        color: color-mix(in srgb, var(--color-text-secondary) 84%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .checklist-group--pending {
        padding: var(--space-2);
        border: 1px solid color-mix(in srgb, var(--color-warning-bg) 48%, var(--color-border-default));
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-warning-bg) 8%, transparent);
      }

      .completed-details {
        padding: var(--space-2);
        border: 1px solid color-mix(in srgb, var(--color-border-default) 82%, transparent);
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-bg-soft) 52%, transparent);
      }

      .completed-details summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        color: color-mix(in srgb, var(--color-text-secondary) 86%, var(--color-text-primary));
        cursor: pointer;
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        list-style: none;
        text-transform: uppercase;
      }

      .completed-details summary::-webkit-details-marker {
        display: none;
      }

      .completed-details summary::before {
        content: "+";
        color: var(--color-text-secondary);
        font-weight: 900;
      }

      .completed-details[open] summary::before {
        content: "-";
      }

      .completed-details summary span {
        flex: 1;
      }

      .completed-details summary strong {
        color: color-mix(in srgb, var(--color-success) 78%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        white-space: nowrap;
      }

      .ready-details {
        margin-top: var(--space-2);
      }

      .checklist-nav {
        border: 0;
        padding: 0;
        background: transparent;
        color: var(--color-text-primary);
        font-weight: 700;
        font-size: var(--font-size-sm);
        font-family: inherit;
        text-decoration: none;
        cursor: pointer;
      }

      .checklist-nav:hover,
      .checklist-item:hover strong {
        color: var(--color-text-primary);
      }

      .checklist-nav:focus-visible,
      .checklist-item:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--color-text-secondary) 72%, white);
        outline-offset: 2px;
      }

      .checklist-group__head span {
        color: color-mix(in srgb, var(--color-text-secondary) 82%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        font-weight: 700;
        white-space: nowrap;
      }

      .checklist-group__head span.is-ok {
        color: color-mix(in srgb, var(--color-success) 84%, var(--color-text-primary));
      }

      .checklist-list {
        list-style: none;
        margin: var(--space-1) 0 0;
        padding: 0;
        display: grid;
        gap: var(--space-1);
      }

      .checklist-list--pending {
        margin-top: var(--space-2);
      }

      .checklist-list li {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--space-1);
        color: var(--color-text-secondary);
        opacity: 0.7;
        padding: 0.15rem 0;
      }

      .checklist-item {
        border: 0;
        padding: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .checklist-list li.is-missing {
        color: var(--color-text-primary);
        opacity: 1;
      }

      .checklist-list strong,
      .checklist-list small {
        display: block;
      }

      .checklist-list strong {
        font-size: var(--font-size-sm);
        font-weight: 600;
        line-height: 1.25;
      }

      .checklist-list small {
        margin-top: 0.1rem;
        color: color-mix(in srgb, var(--color-text-secondary) 88%, var(--color-text-primary));
        font-size: 0.73rem;
        line-height: 1.3;
      }

      .check-dot {
        width: 0.54rem;
        height: 0.54rem;
        margin-top: 0.28rem;
        border-radius: 999px;
        background: var(--color-success);
      }

      .is-missing .check-dot {
        background: var(--color-danger);
      }

      .completed-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        padding: 0.35rem 0;
        border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
        color: color-mix(in srgb, var(--color-text-secondary) 84%, var(--color-text-primary));
      }

      .completed-group:first-of-type {
        border-top: 0;
      }

      .completed-group__button {
        color: color-mix(in srgb, var(--color-text-secondary) 84%, var(--color-text-primary));
        font-weight: 700;
      }

      .completed-group span {
        color: color-mix(in srgb, var(--color-success) 74%, var(--color-text-primary));
        font-size: var(--font-size-xs);
        font-weight: 700;
        white-space: nowrap;
      }

      .ready-note {
        margin: 0;
        padding: var(--space-2);
        border: 1px solid color-mix(in srgb, var(--color-success-bg) 52%, var(--color-border-default));
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-success-bg) 12%, transparent);
        color: color-mix(in srgb, var(--color-success-text) 88%, var(--color-text-primary));
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .technical-count {
        margin: 0;
        font-size: var(--font-size-xs);
        color: color-mix(in srgb, var(--color-text-secondary) 82%, var(--color-text-primary));
      }

      .technical-count summary {
        cursor: pointer;
        font-weight: 700;
      }

      .technical-count p {
        margin: var(--space-1) 0 0;
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
          max-height: none;
          overflow: visible;
        }

        .publish-card {
          max-height: none;
        }

        .publish-card__body {
          overflow: visible;
          padding-right: 0;
        }
      }

      @media (max-width: 860px) {
        .detail-hero,
        .card-head,
        .price-strip {
          flex-direction: column;
          align-items: stretch;
        }

        .detail-hero {
          grid-template-columns: 1fr;
        }

        .detail-hero {
          padding: var(--space-4);
        }

        .hero-nav-row {
          align-items: flex-start;
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

        .overview-grid {
          gap: var(--space-2);
        }

        .field--full,
        .section-actions {
          grid-column: auto;
        }

        .field--checkbox-inline {
          margin-top: 0;
        }

        .overview-card,
        .detail-card,
        .tabs-shell,
        .publish-card {
          padding: var(--space-3);
        }

        .tab-list {
          padding: 0;
        }

        .tab-button {
          min-width: 7.5rem;
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
  readonly detailTabs: DetailTab[] = [
    {
      id: "content",
      label: "Contenido",
      description: "Nombre, slug, descripción, categoría y marca.",
      requirements: [
        "ONLINE_NAME_MISSING",
        "ONLINE_DESCRIPTION_MISSING",
        "SLUG_MISSING",
        "SLUG_DUPLICATE",
        "CATEGORY_MISSING",
        "CATEGORY_INACTIVE",
        "BRAND_MISSING",
        "BRAND_INACTIVE",
      ],
    },
    {
      id: "seo",
      label: "SEO",
      description: "Metadatos para búsqueda y redes sociales.",
      requirements: ["SEO_MISSING", "SEO_INCOMPLETE"],
    },
    {
      id: "asset",
      label: "Imagen",
      description: "Imagen principal, alt text y derechos.",
      requirements: ["ASSET_MISSING", "ASSET_INVALID"],
    },
    {
      id: "price",
      label: "Precio",
      description: "Precio efectivo y override ecommerce.",
      requirements: ["PRICE_INVALID"],
    },
  ];
  readonly requirementGroups: RequirementGroup[] = [
    {
      title: "Producto ERP",
      target: "product",
      requirements: ["PRODUCT_INACTIVE", "SKU_MISSING"],
    },
    {
      title: "Contenido",
      target: "content",
      requirements: ["ONLINE_NAME_MISSING", "ONLINE_DESCRIPTION_MISSING", "SLUG_MISSING", "SLUG_DUPLICATE"],
    },
    {
      title: "Categoría y marca",
      target: "content",
      requirements: ["CATEGORY_MISSING", "CATEGORY_INACTIVE", "BRAND_MISSING", "BRAND_INACTIVE"],
    },
    {
      title: "Imagen",
      target: "asset",
      requirements: ["ASSET_MISSING", "ASSET_INVALID"],
    },
    {
      title: "SEO",
      target: "seo",
      requirements: ["SEO_MISSING", "SEO_INCOMPLETE"],
    },
    {
      title: "Precio",
      target: "price",
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
  activeTab: OnlineProfileDetailTab = "content";
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

  pendingRequirementsCount(): number {
    return this.publicationValidation?.missingRequirements.length ?? 0;
  }

  completedRequirementsCount(): number {
    return Math.max(this.totalRequirementsCount() - this.pendingRequirementsCount(), 0);
  }

  completedCountForGroup(requirements: MissingRequirement[]): number {
    return requirements.length - this.groupPendingCount(requirements);
  }

  pendingRequirementGroups(): RequirementGroup[] {
    return this.requirementGroups.filter((group) => this.groupPendingCount(group.requirements) > 0);
  }

  completedRequirementGroups(): RequirementGroup[] {
    if (!this.hasPendingRequirements()) {
      return [];
    }
    return this.requirementGroups.filter((group) => this.groupPendingCount(group.requirements) === 0);
  }

  partialCompletedRequirementGroups(): RequirementGroup[] {
    return this.requirementGroups.filter((group) => {
      const pendingCount = this.groupPendingCount(group.requirements);
      return pendingCount > 0 && pendingCount < group.requirements.length;
    });
  }

  pendingRequirementsForGroup(group: RequirementGroup): MissingRequirement[] {
    return group.requirements.filter((requirement) => this.isRequirementMissing(requirement));
  }

  firstPendingRequirementLabel(): string | null {
    const firstPending = this.firstPendingRequirement();
    return firstPending ? this.requirementLabel(firstPending) : null;
  }

  setActiveTab(tab: OnlineProfileDetailTab): void {
    this.activeTab = tab;
  }

  pendingCountForTab(tab: OnlineProfileDetailTab): number {
    const detailTab = this.detailTabs.find((item) => item.id === tab);
    if (!detailTab) {
      return 0;
    }
    return this.groupPendingCount(detailTab.requirements);
  }

  hasPendingRequirements(): boolean {
    return (this.publicationValidation?.missingRequirements.length ?? 0) > 0;
  }

  goToFirstPending(): void {
    const firstPending = this.firstPendingRequirement();
    if (!firstPending) {
      return;
    }
    this.openRequirement(firstPending);
  }

  openRequirementGroup(group: RequirementGroup): void {
    this.openRequirementTarget(group.target);
  }

  openRequirement(requirement: MissingRequirement): void {
    this.openRequirementTarget(this.targetForRequirement(requirement));
  }

  private initializeActiveTab(validation: EcommerceAdminPublicationValidationResponse): void {
    const firstEditablePending = validation.missingRequirements
      .map((requirement) => this.targetForRequirement(requirement))
      .find((target): target is OnlineProfileDetailTab => target !== "product");
    this.activeTab = firstEditablePending ?? "content";
  }

  private firstPendingRequirement(): MissingRequirement | null {
    const missing = this.publicationValidation?.missingRequirements ?? [];
    const priority: MissingRequirement[] = [
      "PRODUCT_INACTIVE",
      "SKU_MISSING",
      "ONLINE_NAME_MISSING",
      "ONLINE_DESCRIPTION_MISSING",
      "SLUG_MISSING",
      "SLUG_DUPLICATE",
      "CATEGORY_MISSING",
      "CATEGORY_INACTIVE",
      "BRAND_MISSING",
      "BRAND_INACTIVE",
      "SEO_MISSING",
      "SEO_INCOMPLETE",
      "ASSET_MISSING",
      "ASSET_INVALID",
      "PRICE_INVALID",
    ];
    return priority.find((requirement) => missing.includes(requirement)) ?? null;
  }

  private totalRequirementsCount(): number {
    return this.requirementGroups.reduce((total, group) => total + group.requirements.length, 0);
  }

  private targetForRequirement(requirement: MissingRequirement): OnlineProfileDetailTab | "product" {
    switch (requirement) {
      case "PRODUCT_INACTIVE":
      case "SKU_MISSING":
        return "product";
      case "SEO_MISSING":
      case "SEO_INCOMPLETE":
        return "seo";
      case "ASSET_MISSING":
      case "ASSET_INVALID":
        return "asset";
      case "PRICE_INVALID":
        return "price";
      default:
        return "content";
    }
  }

  private openRequirementTarget(target: OnlineProfileDetailTab | "product"): void {
    if (target === "product") {
      this.scrollToElement("erp-identity-summary");
      return;
    }
    this.activeTab = target;
    this.scrollToElement("profile-tabs");
  }

  private scrollToElement(elementId: string): void {
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        return "Metadatos SEO guardados";
      case "SEO_INCOMPLETE":
        return "SEO listo para publicar";
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
        return "Completa título, descripción y configuración de indexación.";
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

  shouldShowIndexingWarning(): boolean {
    const raw = this.seoForm.getRawValue();
    return !!raw.indexable && raw.robotsPolicy !== "INDEX_FOLLOW";
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
        this.initializeActiveTab(validation);
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
