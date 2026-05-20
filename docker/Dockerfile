# syntax=docker/dockerfile:1

# ── 1. builder ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

# hoisted linker: node_modules is self-contained (no pnpm store symlinks)
# so copying it to the runner stage works without carrying the store across
RUN echo "node-linker=hoisted" > .npmrc

# Copy package manifests first — this layer is cached until they change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# prisma/ is needed by the postinstall script (prisma generate)
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── 2. runner ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next            ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules     ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json     ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma           ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated    ./src/generated
COPY --chown=nextjs:nodejs docker/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
