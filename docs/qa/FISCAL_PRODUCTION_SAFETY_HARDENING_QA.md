# Fiscal production safety hardening QA

## Result

PASS

## Objective

Reinforce production guards in the fiscal module to prevent simulated issuance or productively consuming correlatives without a real provider/signature.

## Modified Files

- `backend/src/main/java/com/erppos/backend/erp/billing/application/service/BillingRuntimeSafetyPolicy.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/application/service/ElectronicDocumentApplicationService.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/domain/port/XmlSignerPort.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/provider/MockElectronicBillingProviderAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/signature/EnvironmentAwareXmlSignerAdapter.java`
- `backend/src/main/java/com/erppos/backend/erp/billing/infrastructure/signature/PfxXmlSignerAdapter.java`
- `backend/src/test/java/com/erppos/backend/erp/billing/BillingApplicationServiceTest.java`
- `docs/ai/CURRENT_STATUS.md`
- `docs/ai/CHANGE_CONTROL.md`

## Technical Summary

- `BillingRuntimeSafetyPolicy` centralizes runtime rules.
- PROD blocks mock provider usage.
- PROD blocks NOOP/placeholder signer usage.
- PROD blocks simulated `ACCEPTED`.
- PROD blocks `createFromSale()` before consuming correlativo if there is no real provider/signature.
- LOCAL/BETA remain controlled simulation environments.

## Validations

- `./mvnw -Dtest=BillingApplicationServiceTest test`: PASS, 35 tests.
- `./mvnw test`: PASS, 476 tests, BUILD SUCCESS.
- `git diff --check`: no errors, only CRLF warnings on Windows.

## Confirmations

- `.env` was not touched.
- Secrets were not printed.
- Real certificates were not touched.
- SUNAT direct was not implemented.
- PSE/OSE was not implemented.
- Full SUNAT UBL was not implemented.
- Real digital signature was not implemented.
- CDR was not implemented.
- PDF/ticket fiscal was not implemented.
- QR was not implemented.
- Notes or cancellations were not implemented.
- Frontend and Storefront were not touched.

## Pending Limitations

- Secret hardening.
- PSE/OSE sandbox adapter.
- Real SUNAT UBL XML.
- Real digital signature.
- Real CDR/response handling.
- Fiscal PDF/ticket with QR.
- Notes/cancellations.
- Deeper integration and concurrency tests.
