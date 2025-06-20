FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN npm run build --workspace @flowmesh/shared
RUN npm run build --workspace @flowmesh/server

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/src/db/schema.sql ./dist/db/schema.sql
COPY --from=build /app/packages/shared/dist ./node_modules/@flowmesh/shared/src
COPY --from=deps /app/node_modules ./node_modules
COPY packages/server/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
