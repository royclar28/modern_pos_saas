# ETAPA 1: Construcción (Compilar React a estático)
FROM node:22-slim AS builder

RUN npm install -g pnpm@10.30.3
WORKDIR /app

# Copiamos manifiestos primero para aprovechar caché de dependencias en Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api-laravel/package.json ./apps/api-laravel/

# Instalamos dependencias requeridas por web aprovechando lockfile exacto
RUN pnpm install --filter web... --frozen-lockfile

# Copiamos configuración TS y código fuente del frontend
COPY tsconfig.base.json ./
COPY apps/web ./apps/web

# Limitamos memoria heap de Node para evitar picos OOM en VPS de 2GB RAM
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN cd apps/web && pnpm build

# ETAPA 2: Servidor de Producción (Nginx)
FROM nginx:1.27-alpine

# Copiamos los archivos estáticos ya compilados a Nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Le decimos a Nginx que si no encuentra una ruta, le pregunte a React (vital para el router)
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; try_files \$uri /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
