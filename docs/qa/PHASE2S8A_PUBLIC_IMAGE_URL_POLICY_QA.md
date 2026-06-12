# Phase 2S.8A Public Image URL Policy QA

## Scope

- Hardened ecommerce public product image URL validation for `ProductAsset.assetUrl`.
- Kept public ecommerce images under Product online profile assets.
- Did not move images to ERP Product.
- Did not implement upload, storage/CDN, ZIP, image import, gallery, Storefront changes, `remotePatterns`, structured data or indexation.

## Implemented Policy

- Relative public paths are allowed when they start with `/` and do not start with `//`.
- Absolute public image URLs must use `https://`.
- Absolute `https://` URLs must match `app.ecommerce.public-images.allowed-domains` / `ECOMMERCE_PUBLIC_IMAGE_ALLOWED_DOMAINS`.
- The allowlist is empty by default, so external domains are rejected unless explicitly configured.
- Blocked values include blank strings, unsafe whitespace/control characters, `http://`, `file:`, `data:`, `ftp:`, missing host, credentials in URL, localhost, `127.0.0.1`, `0.0.0.0`, private IP ranges, `.test`, `.example`, `.example.com` and `.example.test`.

## Readiness And Publication

- Existing requirements remain active: active primary asset, `PRODUCT_IMAGE`, alt text and rights confirmed.
- New requirement: asset URL must be public and allowed by the image URL policy.
- Invalid image URL adds publication error and marks asset readiness as invalid.
- Admin list/readiness SQL now counts an asset as valid only if it uses a public relative path or an allowed `https` domain.

## Angular Admin

- Product online profile detail now only offers `PRODUCT_IMAGE` as asset type.
- URL helper text explains that image URL must be a public approved path or `https` URL from an allowed domain.
- Alt text and rights helper text clarify publication requirements.
- No upload, ZIP, storage picker or Storefront changes were added.

## Validations

| Command | Result |
|---|---|
| `mvn -DskipTests compile` | OK |
| `mvn -Dtest=EcommerceCatalogApplicationServiceTest test` | 27 tests, 0 failures, BUILD SUCCESS |
| `mvn "-Dtest=EcommerceAdminProfilesIntegrationTest,EcommerceOnlineProfileImportIntegrationTest,StorefrontPublicProductsIntegrationTest,StorefrontPublicCategoriesIntegrationTest,StorefrontPublicSitemapIntegrationTest,EcommerceAdminTaxonomyIntegrationTest" test` | 79 tests, 0 failures, BUILD SUCCESS |
| `npm run build` in `frontend` | OK |

## Notes

- Storefront remains unchanged and still does not enable `remotePatterns`.
- Existing public contract remains unchanged.
- Integration test output includes expected stack traces from negative tests for non-numeric pagination parameters; Maven result is success.

## Risks Pending

- External image rendering still requires a later Storefront/Next phase with `remotePatterns` or an approved public path strategy.
- No binary upload validation exists yet because storage/CDN is intentionally out of scope.
- No technical metadata is stored yet for width, height, mime type or file size.
- Existing database rows with invalid absolute URLs will be blocked by publication validation, but may require cleanup before final indexation.

## Recommendation

- Close 2S.8A as policy hardening MVP.
- Next phase: choose storage/CDN strategy or implement Storefront-safe rendering for approved public image domains without enabling indexation.
