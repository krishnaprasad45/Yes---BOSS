# syntax=docker/dockerfile:1
# Backend image. Build context = repo root (needs packages/shared + apps/backend).

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Trim the workspace to backend + shared so the RN mobile app's heavy deps
# aren't installed in the server image.
RUN node -e "const p=require('./package.json');p.workspaces={packages:['apps/backend','packages/shared']};require('fs').writeFileSync('package.json',JSON.stringify(p,null,2));"

RUN yarn install --network-timeout 600000
RUN yarn workspace @yes-boss/shared build \
 && yarn workspace @yes-boss/backend prisma:generate \
 && yarn workspace @yes-boss/backend build

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend
EXPOSE 4000
# Apply pending migrations, then start. (DATABASE_URL comes from the env file.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
