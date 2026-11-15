# Tool preparation only. Runtime containers use an independently verified network:none namespace.
FROM node:22.23.4-bookworm@sha256:7702d8aa4d5910871692af4480eb3ba86f23047a6417a44d857d06c95d060d3f AS toolchain
ARG TARGETPLATFORM
RUN test "$TARGETPLATFORM" = linux/amd64 || { echo 'QA build requires linux/amd64' >&2; exit 1; }

FROM toolchain AS verified-pnpm
# Attested pnpm/pnpm v12.19.0 Linux x64 glibc release, see TESTING.md.
ADD --checksum=sha256:bf37edf4e26c3b31c1cac42c769ffabcb9231e9bc728762aeb1ee86bc711684a https://github.com/pnpm/pnpm/releases/download/v12.19.0/pnpm-linux-x64.tar.gz /tmp/pnpm.tar.gz
RUN mkdir -p /opt/pnpm \
    && tar -xzf /tmp/pnpm.tar.gz -C /opt/pnpm \
    && echo 'baae19a2dafc7b6d38980293904f8b8d0522adbe4cfda5c469c8e3175560e4d0  /opt/pnpm/pnpm' | sha256sum -c -

FROM mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48 AS browser
COPY --from=toolchain /usr/local/bin/node /usr/local/bin/node
WORKDIR /app

FROM browser AS dependencies
COPY --from=verified-pnpm /opt/pnpm/ /opt/pnpm/
RUN test "$(id -u pwuser):$(id -g pwuser)" = 1001:1001 && chown pwuser:pwuser /app
ENV PATH=/opt/pnpm:$PATH CI=true NG_CLI_ANALYTICS=false \
    PNPM_CONFIG_VIRTUAL_STORE_TYPE=local PNPM_CONFIG_STORE_DIR=/pnpm-store \
    PNPM_CONFIG_CACHE_DIR=/pnpm-store/cache PNPM_CONFIG_UPDATE_NOTIFIER=false
USER pwuser
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=inktoy-pnpm4-qa-linux-amd64-glibc,target=/pnpm-store,uid=1001,gid=1001,sharing=locked \
    test "$(node --version)" = v22.23.4 \
    && version="$(/opt/pnpm/pnpm --version)" && test "$version" = 12.19.0 \
    && /opt/pnpm/pnpm install --frozen-lockfile \
    && node -e 'const fs = require("node:fs"); const hash = path => require("node:crypto").createHash("sha256").update(fs.readFileSync(path)).digest("hex"); fs.writeFileSync(".qa-pnpm-install.json", JSON.stringify({ name: "pnpm", version: process.argv[1], platform: process.platform, arch: process.arch, sha256: hash("/opt/pnpm/pnpm"), lockfileSha256: hash("pnpm-lock.yaml") }));' "$version"

FROM browser
COPY . .
COPY --from=dependencies /app/node_modules/ /app/node_modules/
COPY --from=dependencies /app/.qa-pnpm-install.json /app/.qa-pnpm-install.json
COPY --from=verified-pnpm /opt/pnpm/pnpm /opt/pnpm/pnpm
USER pwuser
ENV PATH=/opt/pnpm:$PATH CI=true NG_CLI_ANALYTICS=false \
    PNPM_CONFIG_OFFLINE=true PNPM_CONFIG_VIRTUAL_STORE_TYPE=local \
    PNPM_CONFIG_STORE_DIR=/pnpm-store PNPM_CONFIG_UPDATE_NOTIFIER=false
CMD ["node", "-e", "setInterval(()=>{}, 10000)"]
