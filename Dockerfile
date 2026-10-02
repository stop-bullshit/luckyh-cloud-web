FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund
COPY . .
ARG COMMIT_HASH
RUN COMMIT_HASH="$COMMIT_HASH" npm run build

FROM nginx:alpine
ENV GATEWAY_UPSTREAM=http://host.docker.internal:8080
ENV NGINX_ENVSUBST_FILTER=GATEWAY_UPSTREAM
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
