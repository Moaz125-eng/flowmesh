FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/web packages/web
RUN npm ci
RUN npm run build --workspace @flowmesh/web

FROM nginx:alpine AS runtime
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
