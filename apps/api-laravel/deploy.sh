#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  deploy.sh — Script de Despliegue Automatizado para Merx POS (Laravel API)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Uso:
#    chmod +x deploy.sh
#    ./deploy.sh
#
#  El script ejecuta los siguientes pasos en orden:
#    1. Activa modo mantenimiento (php artisan down)
#    2. Pull de los últimos cambios desde Git
#    3. Instala dependencias de producción (composer install --no-dev)
#    4. Ejecuta migraciones forzadas (con rollback automático si falla)
#    5. Limpia y reconstruye TODAS las cachés
#    6. Reinicia queue workers (si existen)
#    7. Levanta el sistema (php artisan up)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Configuración ───────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="${APP_DIR}/storage/logs/deploy.log"
MAINTENANCE_SECRET="merx-bypass-$(date +%s)"
GIT_BRANCH="main"

# ─── Funciones Auxiliares ─────────────────────────────────────────────────────
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

warn() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1"
    echo -e "${RED}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

cleanup() {
    if [ $? -ne 0 ]; then
        error "Deploy FALLÓ. Levantando el sistema de emergencia..."
        cd "$APP_DIR"
        php artisan up 2>/dev/null || true
        error "Revisa el log: ${LOG_FILE}"
    fi
}

trap cleanup EXIT

# ═══════════════════════════════════════════════════════════════════════════════
#  INICIO DEL DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════

cd "$APP_DIR"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 Merx POS — Deploy a Producción${NC}"
echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── Verificaciones previas ──────────────────────────────────────────────────
log "Verificando entorno..."

if [ ! -f ".env" ]; then
    error "No se encontró archivo .env. Abortando."
    exit 1
fi

if grep -q "APP_ENV=local" .env; then
    warn "APP_ENV sigue en 'local'. ¿Estás seguro de deployar?"
    read -p "Continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deploy cancelado por el usuario."
        exit 1
    fi
fi

if grep -q "APP_DEBUG=true" .env; then
    warn "APP_DEBUG=true detectado. Se recomienda APP_DEBUG=false en producción."
fi

if grep -q "APP_KEY=$" .env || grep -q 'APP_KEY=""' .env; then
    error "APP_KEY está vacío. Generando..."
    php artisan key:generate --force
    success "APP_KEY generado exitosamente."
fi

# ─── PASO 1: Modo Mantenimiento ─────────────────────────────────────────────
log "PASO 1/7: Activando modo mantenimiento..."
php artisan down --secret="$MAINTENANCE_SECRET" --retry=60 2>/dev/null || true
success "Modo mantenimiento activado. Bypass: /${MAINTENANCE_SECRET}"

# ─── PASO 2: Git Pull ───────────────────────────────────────────────────────
log "PASO 2/7: Descargando últimos cambios de Git (branch: ${GIT_BRANCH})..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    BEFORE_HASH=$(git rev-parse HEAD)
    git pull origin "$GIT_BRANCH" --no-edit 2>&1 | tee -a "$LOG_FILE"
    AFTER_HASH=$(git rev-parse HEAD)
    
    if [ "$BEFORE_HASH" == "$AFTER_HASH" ]; then
        warn "No hay cambios nuevos en Git."
    else
        success "Git actualizado: ${BEFORE_HASH:0:8} → ${AFTER_HASH:0:8}"
    fi
else
    warn "No es un repositorio Git. Saltando git pull."
fi

# ─── PASO 3: Dependencias de Producción ─────────────────────────────────────
log "PASO 3/7: Instalando dependencias de producción..."
composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist \
    2>&1 | tail -5 | tee -a "$LOG_FILE"
success "Dependencias de producción instaladas."

# ─── PASO 4: Migraciones ────────────────────────────────────────────────────
log "PASO 4/7: Ejecutando migraciones..."
if php artisan migrate --force 2>&1 | tee -a "$LOG_FILE"; then
    success "Migraciones ejecutadas correctamente."
else
    error "Migraciones FALLARON. Se hará rollback del último batch..."
    php artisan migrate:rollback --force 2>&1 | tee -a "$LOG_FILE"
    error "Rollback completado. Revisa las migraciones y vuelve a intentar."
    exit 1
fi

# ─── PASO 5: Reconstruir Cachés ─────────────────────────────────────────────
log "PASO 5/7: Limpiando y reconstruyendo cachés..."

# Limpiar todo primero
php artisan config:clear  2>/dev/null
php artisan route:clear   2>/dev/null
php artisan view:clear    2>/dev/null
php artisan event:clear   2>/dev/null
php artisan cache:clear   2>/dev/null

# Reconstruir
php artisan config:cache  2>&1 | tee -a "$LOG_FILE"
php artisan route:cache   2>&1 | tee -a "$LOG_FILE"
php artisan view:cache    2>&1 | tee -a "$LOG_FILE"
php artisan event:cache   2>&1 | tee -a "$LOG_FILE"

success "Todas las cachés reconstruidas."

# ─── PASO 6: Reiniciar Queue Workers ────────────────────────────────────────
log "PASO 6/7: Reiniciando queue workers..."
php artisan queue:restart 2>/dev/null && success "Queue workers reiniciados." || warn "No hay queue workers activos."

# ─── PASO 7: Levantar Sistema ───────────────────────────────────────────────
log "PASO 7/7: Levantando el sistema..."
php artisan up
success "Sistema en línea."

# ─── Resumen ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOY COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${GREEN}  Log: ${LOG_FILE}${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
