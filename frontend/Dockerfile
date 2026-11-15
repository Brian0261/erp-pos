FROM node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS node-base
ARG TARGETPLATFORM
RUN test "$TARGETPLATFORM" = linux/amd64 || { echo 'Frontend build requires linux/amd64' >&2; exit 1; }

FROM node-base AS verified-pnpm
# Attested pnpm/pnpm v12.19.0 Linux x64 musl release, see TESTING.md.
ADD --checksum=sha256:b41d7b2d8f47187fdf9b3df170f984ffb02ef14bd27d353ccff704cef0d1af6e https://github.com/pnpm/pnpm/releases/download/v12.19.0/pnpm-linux-x64-musl.tar.gz /tmp/pnpm.tar.gz
RUN mkdir -p /opt/pnpm \
    && tar -xzf /tmp/pnpm.tar.gz -C /opt/pnpm \
    && echo '1b2c54de8db4c546016f4691537cc7d7605c550ba9af5557e377162d70d8afa0  /opt/pnpm/pnpm' | sha256sum -c -

FROM node-base AS build
COPY --from=verified-pnpm /opt/pnpm/ /opt/pnpm/
WORKDIR /app
RUN chown node:node /app
ENV PATH=/opt/pnpm:$PATH CI=true NG_CLI_ANALYTICS=false \
    PNPM_CONFIG_VIRTUAL_STORE_TYPE=local PNPM_CONFIG_STORE_DIR=/pnpm-store \
    PNPM_CONFIG_CACHE_DIR=/pnpm-store/cache PNPM_CONFIG_UPDATE_NOTIFIER=false
USER node

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=inktoy-pnpm4-frontend-linux-amd64-musl,target=/pnpm-store,uid=1000,gid=1000,sharing=locked \
    test "$(node --version)" = v22.23.4 \
    && test "$(/opt/pnpm/pnpm --version)" = 12.19.0 \
    && /opt/pnpm/pnpm install --frozen-lockfile

COPY . .
RUN --network=none PNPM_CONFIG_OFFLINE=true /opt/pnpm/pnpm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/erp-pos-frontend/browser/ /usr/share/nginx/html/

EXPOSE 80
