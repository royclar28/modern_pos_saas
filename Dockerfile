# ETAPA 1: Construcción (Compilar React a estático)
FROM node:20-slim AS builder

RUN npm install -g pnpm@latest
WORKDIR /app

# Copiamos todo el código de tu monorepo
COPY . .

# Instalamos las dependencias
RUN pnpm install

# Construimos la aplicación web (Entramos a la carpeta y compilamos)
RUN cd apps/web && pnpm build

# ETAPA 2: Servidor de Producción (Nginx)
FROM nginx:alpine

# Copiamos los archivos estáticos ya compilados a Nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Le decimos a Nginx que si no encuentra una ruta, le pregunte a React (vital para el router)
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; try_files \$uri /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
