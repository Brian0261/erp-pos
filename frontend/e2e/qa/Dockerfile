# Tool preparation only. Runtime containers use an independently verified network:none namespace.
FROM node:22.23.3-bookworm AS toolchain
FROM mcr.microsoft.com/playwright:v1.61.1-noble
COPY --from=toolchain /usr/local/ /usr/local/
WORKDIR /app
COPY package.json package-lock.json ./
RUN test "$(node --version)" = v22.23.3 && test "$(npm --version)" = 10.9.9 && npm ci --no-audit --no-fund
COPY . .
USER pwuser
ENV CI=true NG_CLI_ANALYTICS=false
CMD ["node", "-e", "setInterval(()=>{}, 10000)"]
