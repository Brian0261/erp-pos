FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
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

FROM node:20-alpine AS runner
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
