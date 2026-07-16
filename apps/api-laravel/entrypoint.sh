#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  MERX POS Backend — FrankenPHP + Octane"
echo "═══════════════════════════════════════════════"

# ── Crear .env si no existe ────────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "⚙️  Creando .env desde .env.example..."
    cp .env.example .env 2>/dev/null || true
    php artisan key:generate --force
fi

# ── Crear base de datos SQLite si aplica ──────────────────────────────
if grep -q "DB_CONNECTION=sqlite" .env 2>/dev/null; then
    mkdir -p database
    touch database/database.sqlite
    echo "🗄️  Base de datos SQLite lista"
fi

# ── Ejecutar migraciones ───────────────────────────────────────────────
echo "🔄 Ejecutando migraciones..."
php artisan migrate --force || echo "⚠️  Error en migraciones — el servidor arrancará con la DB en estado anterior"

# ── Limpiar y regenerar caches de producción ──────────────────────────
echo "⚡ Optimizando caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo ""
echo "🚀 Arrancando FrankenPHP Octane en http://0.0.0.0:8001"
echo "   Workers: auto | Server: frankenphp"
echo "═══════════════════════════════════════════════"

# ── Iniciar servidor de producción ────────────────────────────────────
exec php artisan octane:start \
    --server=frankenphp \
    --host=0.0.0.0 \
    --port=8001 \
    --workers=auto \
    --no-interaction
