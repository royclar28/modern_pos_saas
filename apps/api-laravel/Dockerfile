FROM php:8.4-cli

# Instalar extensiones necesarias para Laravel + SQLite/Postgres
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libsqlite3-dev \
    libpq-dev \
    libzip-dev \
    && docker-php-ext-install pdo_sqlite pdo_pgsql zip bcmath \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# 1. COPIAR TU CÓDIGO AL CONTENEDOR (Faltaba esto)
COPY . .

# 2. INSTALAR LAS DEPENDENCIAS DE LARAVEL (Faltaba esto)
RUN composer install --no-interaction --optimize-autoloader

EXPOSE 8000

# 3. ENCENDER EL SERVIDOR WEB DE LARAVEL (Faltaba esto)
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]