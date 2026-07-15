# Guía de Despliegue a Producción — MERX POS SaaS

**Versión:** 1.0  
**Stack:** Laravel 13 + React 18 + PostgreSQL 16 + Docker Compose  
**Última actualización:** 2026-07-14

---

## 🚀 Deploy Automático (CI/CD)

```
git push → GitHub Actions → Build + Test → Colify Webhook → Deploy
                                                              │
                                          ┌───────────────────┘
                                          ▼
                                    ☕ Tú tomas café
```

### Activar (2 pasos)

1. **En GitHub** → Settings → Secrets and variables → Actions → New repository secret:
   - `COLIFY_WEBHOOK_URL`: La URL del webhook de deploy de Colify
   - `VITE_SUPPORT_WHATSAPP`: Tu número de WhatsApp

2. **Push a `main`** → El deploy se dispara solo.

Si Colify ya tiene **auto-deploy on push** activado, no necesitas el webhook — con el `git push` basta.

> 📖 Documentación detallada: `.github/DEPLOY-AUTOMATION.md`

---

## ⚙️ Deploy Manual (Docker Compose)

---

## Requisitos Previos

- **Servidor Linux** con Docker Engine 24+ y Docker Compose v2
- **Dominio** apuntando al servidor (ej: `merxpos.com`, `api.merxpos.com`)
- **SMTP** (Resend recomendado) para emails transaccionales
- **2 GB RAM mínimo**, 10 GB disco

---

## 1. Variables de Entorno

Copiar y editar los archivos `.env`:

```bash
# ── Raíz del proyecto ──────────────────────────
cp .env.example .env

# .env
DB_USER=postgres
DB_PASSWORD=<generar-contrasena-fuerte>
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/merx_prod?schema=public"
VITE_API_URL="https://api.merxpos.com/api"
FRONTEND_URL="https://merxpos.com"
```

```bash
# ── Laravel Backend ────────────────────────────
cp apps/api-laravel/.env.example apps/api-laravel/.env

# apps/api-laravel/.env
APP_NAME="Merx POS"
APP_ENV=production
APP_KEY=<generar-con-php-artisan-key-generate>
APP_DEBUG=false
APP_URL="https://api.merxpos.com"
APP_FRONTEND_URL="https://merxpos.com"

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=merx_prod
DB_USERNAME=postgres
DB_PASSWORD=<misma-contrasena-fuerte>

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.tudominio.com
MAIL_PORT=587
MAIL_USERNAME=tu_usuario_smtp
MAIL_FROM_ADDRESS="noreply@merxpos.com"
MAIL_FROM_NAME="${APP_NAME}"
RESEND_API_KEY=re_123456789_xxxxxxxxxxxx

SANCTUM_STATEFUL_DOMAINS="merxpos.com,api.merxpos.com"
SESSION_DOMAIN=".merxpos.com"

SUPPORT_WHATSAPP=584241234567
VITE_SUPPORT_WHATSAPP="${SUPPORT_WHATSAPP}"
```

```bash
# ── Frontend ───────────────────────────────────
cp apps/web/.env.example apps/web/.env

# apps/web/.env
VITE_API_URL="https://api.merxpos.com/api"
VITE_SUPPORT_WHATSAPP=584241234567
```

---

## 2. Generar APP_KEY

```bash
# En local o dentro del contenedor Laravel
docker run --rm \
  -v $(pwd)/apps/api-laravel:/var/www/html \
  -w /var/www/html \
  php:8.4-cli \
  php artisan key:generate --show

# Copiar el output a apps/api-laravel/.env → APP_KEY=
```

---

## 3. Despliegue con Docker Compose

Crear `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: merx_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: merx_prod
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  laravel:
    build:
      context: ./apps/api-laravel
      dockerfile: Dockerfile
    container_name: merx_backend
    restart: always
    env_file: ./apps/api-laravel/.env
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./apps/api-laravel/storage:/var/www/html/storage
    ports:
      - "8001:8000"
    command: >
      sh -c "
        php artisan migrate --force &&
        php artisan db:seed --force &&
        php artisan config:cache &&
        php artisan route:cache &&
        php artisan view:cache &&
        php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
      "

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: merx_frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - laravel

volumes:
  pgdata:
```

### Construir y levantar

```bash
# Construir imágenes
docker compose -f docker-compose.prod.yml build --no-cache

# Levantar servicios
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Verificar health
curl -s http://localhost:8001/up
```

---

## 4. Migraciones (si ya hay DB existente)

```bash
# Dentro del contenedor Laravel
docker exec merx_backend php artisan migrate --force

# Verificar estado
docker exec merx_backend php artisan migrate:status
```

---

## 5. Seed Inicial

```bash
# Crear SUPER_ADMIN default + tienda principal
docker exec merx_backend php artisan db:seed --force

# Credenciales default:
#   Username: admin
#   Email: admin@ejemplo.com
#   Password: password
# ⚠️ CAMBIAR INMEDIATAMENTE DESPUÉS DEL PRIMER LOGIN
```

---

## 6. HTTPS con Nginx + Certbot

En el servidor host, instalar Nginx como reverse proxy:

```nginx
# /etc/nginx/sites-available/merxpos
server {
    listen 80;
    server_name merxpos.com api.merxpos.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name merxpos.com;

    ssl_certificate /etc/letsencrypt/live/merxpos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merxpos.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.merxpos.com;

    ssl_certificate /etc/letsencrypt/live/merxpos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merxpos.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Obtener certificados SSL
certbot --nginx -d merxpos.com -d api.merxpos.com

# Renovación automática (ya configurada por certbot)
certbot renew --dry-run
```

---

## 7. Post-Deploy Checklist

- [ ] `.env` production sin `APP_DEBUG=true`
- [ ] `APP_KEY` generada y única (no copiada de otro entorno)
- [ ] `DB_PASSWORD` fuerte (> 20 caracteres, aleatoria)
- [ ] `RESEND_API_KEY` configurada y verificada
- [ ] CORS: `CORS_ALLOWED_ORIGINS` con dominio de producción
- [ ] HTTPS funcionando (certificado válido)
- [ ] Health check: `GET /up` responde 200
- [ ] Login funcional con credenciales default
- [ ] Cambiar contraseña del SUPER_ADMIN default
- [ ] Backup automático de PostgreSQL configurado
- [ ] Monitoreo (LOGS) funcionando

---

## 8. Backup de Base de Datos

```bash
# Backup diario (agregar a crontab)
0 2 * * * docker exec merx_postgres pg_dump -U postgres merx_prod | gzip > /backups/merx_$(date +\%Y\%m\%d).sql.gz

# Restaurar
gunzip -c /backups/merx_20260714.sql.gz | docker exec -i merx_postgres psql -U postgres merx_prod
```

---

## 9. Rollback

```bash
# Volver a versión anterior
git checkout <commit-anterior>

# Reconstruir
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache laravel web
docker compose -f docker-compose.prod.yml up -d

# Rollback de migraciones (si necesario)
docker exec merx_backend php artisan migrate:rollback --step=1
```

---

## 10. Comandos Útiles

```bash
# Ver logs de Laravel
docker exec merx_backend tail -f storage/logs/laravel.log

# Limpiar caché
docker exec merx_backend php artisan optimize:clear

# Reconstruir caché
docker exec merx_backend php artisan optimize

# Ver cola de jobs
docker exec merx_backend php artisan queue:monitor

# Reiniciar workers
docker exec merx_backend php artisan queue:restart

# Ver rutas registradas
docker exec merx_backend php artisan route:list

# Ver estado de migraciones
docker exec merx_backend php artisan migrate:status

# Crear nuevo SUPER_ADMIN
docker exec merx_backend php artisan tinker
> \App\Models\User::create([...]);
```

---

## Próximos Pasos Post-Deploy

1. Configurar monitoreo (Sentry/Laravel Telescope para dev)
2. Configurar backups automáticos (pg_dump + S3/rsync)
3. Revisar alertas de log (errores 5xx, sync failures)
4. Verificar envío de emails (registro de prueba)
5. Ejecutar smoke tests manuales:
   - Login → Dashboard
   - POS → Venta en efectivo → Sync → Ver en Reporte Z
   - POS → Venta a crédito → Registrar abono → Ver deuda saldada
   - Cierre de caja → Ver en Historial
   - Configuración → Cambiar IVA → Verificar en POS
