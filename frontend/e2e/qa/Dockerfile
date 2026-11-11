# Tool preparation only. Runtime containers use an independently verified network:none namespace.
FROM node:22.23.4-bookworm@sha256:7702d8aa4d5910871692af4480eb3ba86f23047a6417a44d857d06c95d060d3f AS toolchain
FROM mcr.microsoft.com/playwright:v1.61.1-noble
COPY --from=toolchain /usr/local/ /usr/local/
WORKDIR /app
COPY package.json package-lock.json ./
RUN test "$(node --version)" = v22.23.4 && test "$(npm --version)" = 10.9.9 && npm ci --no-audit --no-fund
COPY . .
USER pwuser
ENV CI=true NG_CLI_ANALYTICS=false
CMD ["node", "-e", "setInterval(()=>{}, 10000)"]
