# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

# Vite embeds VITE_* variables into the static bundle during the build.
ARG VITE_API_BASE_URL
ARG VITE_PICKUP_ROUTE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PICKUP_ROUTE_URL=$VITE_PICKUP_ROUTE_URL
RUN pnpm build

# Runtime stage
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
