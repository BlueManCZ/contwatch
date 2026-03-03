FROM node:22-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Minimal output stage — copy built files to the mounted volume at runtime
FROM busybox:stable
COPY --from=build /app/dist /build
CMD ["cp", "-r", "/build/.", "/app/dist/"]
