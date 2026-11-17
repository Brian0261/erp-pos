FROM node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS toolchain
ARG TARGETARCH

# Hashes pin the verified release archives. apk also verifies the Alpine signature.
RUN <<'SH'
set -eu
case "$TARGETARCH:$(uname -m)" in
    amd64:x86_64) alpine_arch=x86_64; zlib_sha=7b05bc778b8b25cd880835b40114182bd4d1581717504d0129c810c0a14291cb ;;
    arm64:aarch64) alpine_arch=aarch64; zlib_sha=d3e30d012a3445222b0b4a28f1d4d97ce67387f8b48561921111696da174f0de ;;
    *) exit 1 ;;
esac

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
node --input-type=module - "$work" "$alpine_arch" <<'JS'
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [directory, arch] = process.argv.slice(2);
const artifacts = [
    ['npm.tgz', 'https://registry.npmjs.org/npm/-/npm-11.21.2.tgz'],
    ['zlib.apk', 'https://dl-cdn.alpinelinux.org/alpine/v3.24/main/' + arch + '/zlib-1.4-r0.apk'],
];
for (const [file, url] of artifacts) {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error('Could not download ' + file + ': HTTP ' + response.status);
    await writeFile(join(directory, file), new Uint8Array(await response.arrayBuffer()));
}
JS

printf '%s  %s\n' \
    '8ad8563b81e71b90ef405b140bccf3ba9b5e7884ab210bd49ee4e2f4bc6f61f5' "$work/npm.tgz" \
    "$zlib_sha" "$work/zlib.apk" | sha256sum -c -
apk verify "$work/zlib.apk"
apk --repositories-file /dev/null --no-network add --no-cache "$work/zlib.apk"

npm_dir=/usr/local/lib/node_modules/npm
replacement=$(mktemp -d /usr/local/lib/node_modules/.npm.XXXXXX)
tar -xzf "$work/npm.tgz" --strip-components=1 -C "$replacement"
test "$(node "$replacement/bin/npm-cli.js" --version)" = 11.21.2
rm -r -- "$npm_dir"
mv -- "$replacement" "$npm_dir"
chmod 0755 "$npm_dir"

test "$(readlink -f /usr/local/bin/npm)" = "$npm_dir/bin/npm-cli.js"
test "$(readlink -f /usr/local/bin/npx)" = "$npm_dir/bin/npx-cli.js"
test "$(node --version)" = v24.22.3
test "$(npm --version)" = 11.21.2
test "$(npx --version)" = 11.21.2
test "$(apk info -v | grep '^zlib-')" = zlib-1.4-r0
SH

FROM toolchain AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM toolchain AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG STOREFRONT_API_BASE_URL=http://backend:8080
ARG STOREFRONT_PUBLIC_BASE_URL=http://localhost:3000
ARG STOREFRONT_INDEXING_ENABLED=false
ARG STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe
ENV STOREFRONT_API_BASE_URL=$STOREFRONT_API_BASE_URL
ENV STOREFRONT_PUBLIC_BASE_URL=$STOREFRONT_PUBLIC_BASE_URL
ENV STOREFRONT_INDEXING_ENABLED=$STOREFRONT_INDEXING_ENABLED
ENV STOREFRONT_IMAGE_ALLOWED_DOMAINS=$STOREFRONT_IMAGE_ALLOWED_DOMAINS

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM toolchain AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV STOREFRONT_API_BASE_URL=http://backend:8080
ENV STOREFRONT_PUBLIC_BASE_URL=http://localhost:3000
ENV STOREFRONT_INDEXING_ENABLED=false
ENV STOREFRONT_IMAGE_ALLOWED_DOMAINS=cdn-staging.inktoy.pe

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
