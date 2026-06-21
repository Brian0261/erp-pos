# Phase 2S.10D-B Responsive WebP and AVIF Spike QA

## Objetivo

Validar tecnicamente en entorno local y Docker/Linux si el backend puede generar variantes responsive WebP y evaluar si AVIF es viable sin tocar infraestructura, Dockerfile, docker-compose ni staging.

## Alcance

- Spike test-only bajo `backend/src/test/java`.
- No se modifico codigo productivo backend.
- No se agregaron migraciones.
- No se modifico `ecommerce_product_asset_variants`.
- No se modifico API publica ni `PublicImageResponse`.
- No se modifico Storefront ni Admin UI.
- No se tocaron staging, deploy, Caddy, DNS, AWS/S3/CloudFront/IAM, `.env`, Dockerfile, `docker-compose.yml` ni infraestructura.
- No se agregaron dependencias AVIF runtime ni test-scope.

## Archivos Test-Only Agregados

- `backend/src/test/java/com/erppos/backend/erp/ecommerce/ResponsiveImageResizeSpikeService.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/ResponsiveImageResizeSpikeServiceTest.java`
- `backend/src/test/java/com/erppos/backend/erp/ecommerce/AvifResponsiveSpikeTest.java`

## Tamano Evaluados

- `320w`
- `640w`
- `960w`
- `1280w`

## Fixtures

- JPEG programatico: `1600x1200`.
- PNG transparente programatico: `800x800`.
- JPEG pequeno programatico: `240x180` para validar no-upscaling.

## Resultado Local

Comando:

```powershell
.\mvnw.cmd "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test
```

Resultado:

```text
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Resultado Docker/Linux

Comando:

```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace/backend eclipse-temurin:17-jdk-jammy sh ./mvnw "-Dtest=ResponsiveImageResizeSpikeServiceTest,AvifResponsiveSpikeTest" test
```

Resultado:

```text
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## JPEG -> WebP Responsive

Fixture original:

- Formato: JPEG.
- Dimensiones: `1600x1200`.
- Peso: `46981` bytes.
- Variante WebP full-size actual comparable: `20748` bytes.

Metricas locales:

| Target | Width real | Height real | WebP bytes | Elapsed ms | Memory delta bytes | Checksum |
|--------|------------|-------------|------------|------------|--------------------|----------|
| 320w | 320 | 240 | 2598 | 13 | 844848 | `9980ad3a3adc5009790cd075ba81d26e2fb976edae203c6e1dd5a5870766bc76` |
| 640w | 640 | 480 | 6054 | 31 | 5115920 | `07f46c9c320866947a0cd98331b9b7614cae81c03a683b89621ed8ed53369c4d` |
| 960w | 960 | 720 | 10826 | 67 | 10485760 | `30b2700843673ea653fda750ff174ad944506e904ed079699b79bf1387591abc` |
| 1280w | 1280 | 960 | 15166 | 124 | 16777216 | `4351636225d341a16a1fea82e930f875bf037c7a8b469d1e9120ca07665cf796` |

Metricas Docker/Linux:

| Target | Width real | Height real | WebP bytes | Elapsed ms | Memory delta bytes | Checksum |
|--------|------------|-------------|------------|------------|--------------------|----------|
| 320w | 320 | 240 | 2598 | 16 | 844848 | `9980ad3a3adc5009790cd075ba81d26e2fb976edae203c6e1dd5a5870766bc76` |
| 640w | 640 | 480 | 6054 | 35 | 5242880 | `07f46c9c320866947a0cd98331b9b7614cae81c03a683b89621ed8ed53369c4d` |
| 960w | 960 | 720 | 10826 | 79 | 8690064 | `30b2700843673ea653fda750ff174ad944506e904ed079699b79bf1387591abc` |
| 1280w | 1280 | 960 | 15166 | 131 | 14981520 | `4351636225d341a16a1fea82e930f875bf037c7a8b469d1e9120ca07665cf796` |

Validaciones:

- Todas las variantes fueron `image/webp`.
- Todas las variantes conservaron aspect ratio `4:3`.
- Todas las variantes fueron validas con `EcommerceProductImageBinaryService.validate(...)`.
- Todas las variantes fueron menores al JPEG original.
- Todas las variantes fueron menores que la variante WebP full-size actual.
- Checksums SHA-256 consistentes de 64 caracteres.

## PNG Transparente -> WebP Responsive

Fixture original:

- Formato: PNG.
- Dimensiones: `800x800`.
- Peso: `7108` bytes.
- Alpha channel: presente.

Metricas locales:

| Target | Width real | Height real | WebP bytes | Elapsed ms | Memory delta bytes | Checksum |
|--------|------------|-------------|------------|------------|--------------------|----------|
| 320w | 320 | 320 | 1264 | 20 | 1048576 | `77f92df35be8be1d22f5d1b5d990f8f670eca28de831aa600d50198fda6097be` |
| 640w | 640 | 640 | 2936 | 46 | 6291456 | `871a7d2c0c03fcfb46dd6188d9eb035798a06135edc0deef263a10e80ef699e2` |

Metricas Docker/Linux:

| Target | Width real | Height real | WebP bytes | Elapsed ms | Memory delta bytes | Checksum |
|--------|------------|-------------|------------|------------|--------------------|----------|
| 320w | 320 | 320 | 1264 | 20 | 1228848 | `77f92df35be8be1d22f5d1b5d990f8f670eca28de831aa600d50198fda6097be` |
| 640w | 640 | 640 | 2936 | 64 | -26212192 | `871a7d2c0c03fcfb46dd6188d9eb035798a06135edc0deef263a10e80ef699e2` |

Validaciones:

- Las variantes fueron `image/webp`.
- Las variantes conservaron alpha channel.
- La esquina transparente permanecio transparente.
- El centro opaco permanecio opaco.
- Las variantes fueron validas con `EcommerceProductImageBinaryService.validate(...)`.
- Checksums SHA-256 consistentes de 64 caracteres.

Nota: `memoryDeltaBytes` es aproximado y puede ser negativo por actividad del GC durante el test.

## Regla No-Upscaling

Fixture:

- JPEG `240x180`.

Validacion:

- Target `320w`: no genera variante.
- Target `640w`: no genera variante.

Resultado: PASS.

## AVIF Spike

Validacion ejecutada:

- `ImageIO.getImageWritersByMIMEType("image/avif")`
- `ImageIO.getImageReadersByMIMEType("image/avif")`

Resultado local y Docker/Linux:

```text
AVIF_SPIKE status=BLOCKED reason=no-imageio-avif-support writer=false reader=false dockerfileRequired=true runtimeDependencyAdded=false
```

Conclusion AVIF:

- Estado: **BLOQUEADO / NO APTO por ahora**.
- El classpath actual no tiene writer ni reader AVIF via ImageIO.
- No se agrego dependencia AVIF test-scope porque no se identifico una opcion segura que funcione sin riesgo de dependencia nativa/paquetes del sistema dentro del alcance permitido.
- No se debe mover AVIF a runtime.
- No se debe tocar Dockerfile ni instalar paquetes del sistema para habilitar AVIF en 2S.10D-B.

## Conclusion WebP Responsive

Estado: **APTO**.

El backend puede generar variantes WebP responsive mediante ImageIO/WebP actual en local y Docker/Linux, sin tocar Dockerfile, docker-compose ni paquetes del sistema.

El spike valida:

- Resize JPEG -> WebP para `320w`, `640w`, `960w`, `1280w`.
- Resize PNG transparente -> WebP para `320w`, `640w` preservando alpha.
- No-upscaling.
- Validacion con parser actual de `EcommerceProductImageBinaryService.validate(...)`.
- Checksum SHA-256 y `sizeBytes` consistentes.

## Riesgos Residuales

- `webp-imageio` 0.1.6 sigue siendo dependencia no mantenida activamente.
- El uso de memoria crece con dimensiones mayores y debe controlarse en implementacion productiva.
- La calidad visual requiere validacion manual con imagenes reales.
- AVIF requiere una decision tecnica posterior sobre libreria segura o queda fuera de 2S.10D.
- Generar multiples variantes incrementara uso de S3 y necesidad de cleanup posterior.

## Recomendacion Siguiente

- Avanzar a **2S.10D-C Modelo** para ajustar el modelo de variantes y permitir multiples tamanos WebP activos.
- Continuar 2S.10D con WebP responsive primero.
- Dejar AVIF para una fase posterior o un spike dedicado adicional si aparece una dependencia segura compatible con Docker/Linux sin infraestructura.

## Resultado

**PASS con AVIF BLOQUEADO**

- WebP responsive: PASS.
- Docker/Linux: PASS.
- AVIF: BLOQUEADO/NO APTO por ahora, documentado sin fallar el spike.
