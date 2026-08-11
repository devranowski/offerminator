# syntax=docker/dockerfile:1

FROM node:24.19.0-bookworm-slim AS base

WORKDIR /app

RUN npm install --global npm@11.17.0

FROM base AS build

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM base AS production-dependencies

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json

RUN npm ci --omit=dev --workspace @offerminator/api

FROM node:24.19.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=10000

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=node:node /app/packages/api-contracts/package.json ./packages/api-contracts/package.json
COPY --from=build --chown=node:node /app/packages/api-contracts/dist ./packages/api-contracts/dist
COPY --from=build --chown=node:node /app/data/jobs.json ./data/jobs.json

USER node

EXPOSE 10000

CMD ["node", "apps/api/dist/server.js"]
