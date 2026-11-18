This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

The Storefront uses Node.js **24.22.3** and pnpm **12.21.0**. Its pins and configuration are independent of the ERP/POS frontend.

Obtain the complete archive for your platform from the official [pnpm v12.21.0 release](https://github.com/pnpm/pnpm/releases/tag/v12.21.0).

| Platform | Archive | SHA-256 |
| --- | --- | --- |
| Windows x64 | pnpm-win32-x64.zip | 4fb64bb37e46c788309e0fd4ea93beb512546fdc7348121194fb704fbb72c09c |
| Linux x64 musl | pnpm-linux-x64-musl.tar.gz | 6dbcd9ea8ed37b5acbe279159ad0ed3a4ac614f5d7ae62d5ba51d32a85a589d7 |
| Linux arm64 musl | pnpm-linux-arm64-musl.tar.gz | 4faedaaa333b44d940ce5e38c223e829124affdbe5a6d3f694a69dd979a5a8d8 |

Before extracting or executing pnpm, compare the archive SHA-256 with this table using `Get-FileHash -Algorithm SHA256` on Windows or `sha256sum` on Linux, and verify its SLSA attestation with GitHub CLI.

~~~text
gh attestation verify <downloaded-archive> --repo pnpm/pnpm --predicate-type https://slsa.dev/provenance/v1 --signer-workflow pnpm/pnpm/.github/workflows/release.yml --source-ref refs/tags/v12.21.0 --source-digest b8d388835f9a40ee1ac53fbc2d4b58c3ebfa5600 --cert-oidc-issuer https://token.actions.githubusercontent.com
~~~

Both checks must pass. Extract the complete archive into a dedicated directory outside the repository, keeping `pnpm` or `pnpm.exe` beside `dist/`. Invoke that executable by its full path or add its directory to the current shell's PATH. Confirm the selected executable with `Get-Command pnpm` on Windows or `command -v pnpm` on Linux.

From `storefront/` with the approved Node.js on PATH, run:

~~~bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm run dev
~~~

Validation and production build commands are:

~~~bash
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
pnpm run start
~~~

`pnpm-workspace.yaml` keeps the virtual store inside the project and rejects incompatible tools, implicit installation before scripts and unreviewed dependency builds. The `unrs-resolver@1.12.2` postinstall is explicitly denied because the supported platforms use the locked prebuilt bindings. The exact release-age exception for `baseline-browser-mapping@2.11.38` preserves the version already verified in the npm security baseline B1.

The Dockerfile verifies the appropriate pnpm musl archive for each target architecture, installs from `pnpm-lock.yaml`, and builds the Next standalone output. Its remediated Node/npm/zlib base is preserved. The production runner starts `node server.js` as the existing non-root user.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Security and validation scope

The Docker base intentionally retains remediated npm `11.21.2` as inherited
tooling. Storefront dependency installation and builds use pnpm and the frozen
lockfile; npm's presence in the base does not indicate an incomplete migration.
The existing [local Docker commands](../docs/qa/PHASE2S8J_STOREFRONT_DOCKER_LOCAL_QA.md#comandos-de-uso-local)
describe the opt-in Storefront profile.

The repository's CI validates the ERP/POS backend, Angular frontend, Auth and
commercial gates. Those results do not replace Storefront-specific validation.
[PNPM-S1 closure](https://github.com/Brian0261/erp-pos/pull/31#issuecomment-6965093251)
records the approved Storefront QA: application checks on Linux, emulated arm64,
and Windows checks of the native pnpm executable and toolchain guards. It does
not claim application QA on native Windows. Reuse evidence only when its content
and execution conditions still apply.

OpenSSL and picomatch remain affected under the assessed baseline. Their
non-applicability conclusions are limited to the documented runtime and
controlled-glob conditions; they are not vulnerability fixes. Consult
[S-SEC1 security closure](https://github.com/Brian0261/erp-pos/pull/30#issuecomment-6939414919)
and the [PNPM-S1 focal assessment](https://github.com/Brian0261/erp-pos/pull/31#issuecomment-6963972727),
including moderate findings and platform limits. Changes to those conditions
require reevaluation. Technical CLOSED status and a successful production build
do not authorize a production deployment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
