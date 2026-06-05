# syntax=docker/dockerfile:1

# ---- Build stage: compile the PWA inside the container --------------------
# Runs npm + Vite in a clean Linux environment, so a broken local Node/npm on
# the host doesn't matter. Produces the static dist/ bundle.
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest and build (tsc -b && vite build).
COPY . .
RUN npm run build

# ---- Runtime stage: serve the static build with nginx ---------------------
FROM nginx:1.27-alpine AS runtime
# SPA + PWA aware nginx config (correct MIME types, no-cache on the service
# worker, long cache on hashed assets).
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
