FROM node:22-alpine AS base

# The web Dockerfile is copy-pasted into our main docs at /docs/handbook/deploying-with-docker.
# Make sure you update this Dockerfile, the Dockerfile in the web workspace and copy that over to Dockerfile in the docs.

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /contwatch-client
RUN npm install turbo
COPY . .
RUN npx turbo prune contwatch-client --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /contwatch-client

# First install dependencies (as they change less often)
COPY --from=builder /contwatch-client/out/json/ .
RUN npm install

# Build the project and its dependencies
COPY --from=builder /contwatch-client/out/full/ .

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM

# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

RUN npx turbo build --filter=contwatch-client...

FROM base AS runner
WORKDIR /contwatch-client

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/.next/static ./apps/contwatch-client/.next/static
COPY --from=installer --chown=nextjs:nodejs /contwatch-client/apps/contwatch-client/public ./apps/contwatch-client/public

CMD node apps/contwatch-client/server.js
