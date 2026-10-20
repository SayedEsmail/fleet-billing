# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api apps/api
# Only the API's dependency graph; postinstall runs `prisma generate`.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @fleet/api...
RUN pnpm --filter @fleet/api build

# The runtime keeps the Prisma CLI and tsx so the same image can run
# `migrate deploy` and the seed (docker compose). Simplicity over size.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=4000
WORKDIR /repo
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/main.js"]
