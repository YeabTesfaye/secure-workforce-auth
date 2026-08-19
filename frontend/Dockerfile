# --- STAGE 1: Dependencies ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency configuration files
COPY package.json package-lock.json* ./

# Install dependencies based on the lockfile
RUN npm ci

# --- STAGE 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disables Next.js anonymous analytics during the build stage
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- STAGE 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a secure non-root system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and public assets
COPY --from=builder /app/public ./public

# Set permissions for the built-in prerender cache folder
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Leverage Next.js standalone file tracing feature
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone feature builds a specialized server.js automatically
CMD ["node", "server.js"]
