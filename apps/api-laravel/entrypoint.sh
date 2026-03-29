#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  MERX POS Backend — Bootstrap Script"
echo "═══════════════════════════════════════════════"

# Si no hay vendor/ (primer arranque), scaffold Laravel
if [ ! -f "artisan" ]; then
    echo "📦 Creando proyecto Laravel fresco..."
    composer create-project laravel/laravel /tmp/laravel-fresh --no-interaction --prefer-dist
    
    # Mover todo el scaffold de Laravel al directorio actual
    # (preservando nuestros archivos custom que ya están montados)
    cp -rn /tmp/laravel-fresh/* /app/ 2>/dev/null || true
    cp -rn /tmp/laravel-fresh/.* /app/ 2>/dev/null || true
    rm -rf /tmp/laravel-fresh
    
    echo "✅ Scaffold de Laravel creado"
fi

# Instalar dependencias
if [ ! -d "vendor" ]; then
    echo "📦 Instalando dependencias Composer..."
    composer install --no-interaction --prefer-dist
fi

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️  Creando .env con SQLite..."
    cp .env.example .env 2>/dev/null || true
    php artisan key:generate --force
fi

# Crear SQLite si usamos ese driver
if grep -q "DB_CONNECTION=sqlite" .env 2>/dev/null; then
    touch database/database.sqlite
    echo "🗄️  Base de datos SQLite creada"
fi

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
php artisan migrate --force 2>/dev/null || echo "⚠️  Migraciones pendientes (ejecutar manualmente)"

echo ""
echo "🚀 Arrancando servidor en http://0.0.0.0:8000"
echo "═══════════════════════════════════════════════"
php artisan serve --host=0.0.0.0 --port=8000
