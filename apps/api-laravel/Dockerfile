# ══════════════════════════════════════════════════════════════════════
# MERX POS — Backend API (FrankenPHP + Laravel Octane)
# Imagen base: dunglas/frankenphp (Alpine, PHP 8.4)
# Servidor: FrankenPHP vía Laravel Octane (sin Nginx, sin FPM)
# ══════════════════════════════════════════════════════════════════════
FROM dunglas/frankenphp:php8.4-alpine

# ── Variables de entorno de producción ────────────────────────────────
ENV APP_ENV=production \
    APP_DEBUG=false \
    OCTANE_SERVER=frankenphp \
    SERVER_NAME=":8001"

# ── Dependencias del sistema + extensiones PHP ─────────────────────────
RUN apk add --no-cache \
        bash \
        git \
        unzip \
        libpq \
        libzip \
    && apk add --no-cache --virtual .build-deps \
        postgresql-dev \
        libzip-dev \
        linux-headers \
    && install-php-extensions \
        pdo_pgsql \
        pdo_sqlite \
        zip \
        bcmath \
        pcntl \
        opcache \
        redis \
    && apk del .build-deps

# ── Composer ───────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── Directorio de trabajo ──────────────────────────────────────────────
WORKDIR /app

# ── Instalar dependencias (capa cacheada) ─────────────────────────────
# Copiamos los archivos mínimos necesarios para composer install.
# artisan es necesario para el script post-autoload-dump de Laravel.
COPY composer.json composer.lock artisan ./
RUN composer install \
        --no-interaction \
        --no-dev \
        --optimize-autoloader \
        --prefer-dist

# ── Copiar el código fuente ────────────────────────────────────────────
COPY . .

# ── Optimizaciones de producción ──────────────────────────────────────
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# ── Copiar y preparar entrypoint ─────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8001

ENTRYPOINT ["/entrypoint.sh"]