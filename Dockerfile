# Production image (Next standalone output).

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV HUSKY=0
RUN npm ci --no-audit --no-fund

# Image for `prisma migrate deploy`: the standalone runner does not include the Prisma CLI.
FROM deps AS migrate
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-bookworm-slim AS build
WORKDIR /app
# NEXT_PUBLIC_* are inlined into the client bundle at build time: passing them at runtime is not enough.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REALTIME_MODE
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_R2_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_REALTIME_MODE=$NEXT_PUBLIC_REALTIME_MODE \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL=$NEXT_PUBLIC_R2_PUBLIC_BASE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY \
    NEXT_OUTPUT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
# System ffmpeg: metadata stripping fails closed without it, and ffmpeg-static is not in the standalone trace.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 voxer && useradd --system --uid 1001 --gid voxer voxer
COPY --from=build --chown=voxer:voxer /app/.next/standalone ./
COPY --from=build --chown=voxer:voxer /app/.next/static ./.next/static
COPY --from=build --chown=voxer:voxer /app/public ./public
USER voxer
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
