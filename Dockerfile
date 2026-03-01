FROM node:24 AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY src/package.json src/package-lock.json ./
COPY src/prisma/ ./prisma/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/repo-ninja.db"
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create writable data directory for SQLite and .copilot cache for the Copilot binary
RUN mkdir -p /app/data /app/.copilot && chown nextjs:nodejs /app/data /app/.copilot

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules so prisma migrate deploy has all dependencies at startup
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema, migrations, generated client, and config (CLI needs config for DATABASE_URL)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# Copy knowledge base seed documents to both locations:
# - knowledge-base-seed: permanent copy in image, used by entrypoint to sync new files into the volume
# - knowledge-base: initial content that the Docker volume overlays on first creation
COPY --from=builder --chown=nextjs:nodejs /app/knowledge-base ./knowledge-base-seed
COPY --from=builder --chown=nextjs:nodejs /app/knowledge-base ./knowledge-base

# Copy and configure startup entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
ENV HOME=/app
EXPOSE 3000
ENV PORT=3000
CMD ["./docker-entrypoint.sh"]
