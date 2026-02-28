FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk update
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /contwatch-client

FROM base AS prepare
RUN pnpm install turbo
COPY . .
RUN pnpm turbo prune contwatch-client --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS builder
# First install dependencies (as they change less often)
COPY --from=prepare /contwatch-client/out/json/ .
RUN pnpm install

# Build the project and its dependencies
COPY --from=prepare /contwatch-client/out/full/ .

# Uncomment and use build args to enable remote caching
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM

ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm turbo build --filter=contwatch-client...

FROM base AS runner
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/.next/static ./apps/contwatch-client/.next/static
COPY --from=builder --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/public ./apps/contwatch-client/public

CMD node apps/contwatch-client/server.js
