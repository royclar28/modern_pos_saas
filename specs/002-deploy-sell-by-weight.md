# Spec: Despliegue en Producción — Venta por Peso + Fix Decimales + Categorías + unit_label

**Versión:** 1.0
**Fecha:** 2026-05-12
**Depende de:** [`specs/001-sell-by-weight-decimal-fix.md`](specs/001-sell-by-weight-decimal-fix.md)

---

## 0. Contexto

| Componente | Cobertura |
|---|---|
| **Código fuente** (Laravel + React) | ✅ Cubierto por Colify — `git push` y redeploy |
| **Base de datos** (migraciones) | ❌ NO cubierto — requiere ejecución manual |
| **Cachés** (config, rutas, vistas) | ❌ NO cubierto — requiere ejecución manual |

Este documento cubre **exclusivamente los pasos manuales en el servidor de producción**.

---

## 1. Resumen de Cambios que Requieren Acción en Producción

### 1.1 Tres migraciones nuevas

| # | Migración | Efecto |
|---|---|---|
| 1 | `2026_05_12_200000_add_sell_by_and_fix_receiving_qty` | Agrega columna `sell_by` (varchar 10) + cambia `receiving_quantity` de INTEGER → DECIMAL(15,2) en PostgreSQL |
| 2 | `2026_05_12_200001_create_categories_table` | Crea tabla `categories` con tenant-scoping, foreign key a `stores`, unique(`tenant_id`, `name`) |
| 3 | `2026_05_12_220000_add_unit_label_to_items` | Agrega columna `unit_label` (varchar 10, nullable, default 'und') |

### 1.2 Rutas nuevas

| Ruta | Método | Controlador |
|---|---|---|
| `/api/categories` | GET | `SyncReadController@getCategories` |
| `/api/categories/table` | GET | `SyncReadController@getCategoriesTable` |

> Ambas bajo `auth:sanctum` middleware. No requieren cambios en Nginx.

### 1.3 Cachés que deben regenerarse

- `config/cache` — si `config/*.php` cambió (no aplica aquí)
- `routes/cache` — **obligatorio**, se agregaron 2 rutas en `routes/api.php`
- `bootstrap/cache/services.php` — Laravel lo regenera automáticamente

---

## 2. Procedimiento de Despliegue

### 2.1 PRE-DESPLIEGUE: Backup de Base de Datos

```bash
# Conéctese al servidor de producción vía SSH
ssh usuario@produccion.merxpos.com

# Backup completo de PostgreSQL
pg_dump -U merx_user -h localhost -Fc merx_prod > /backups/pre_deploy_sell_by_weight_$(date +%Y%m%d_%H%M%S).dump

# Verificar que el dump se creó correctamente (debe pesar > 0)
ls -lh /backups/pre_deploy_sell_by_weight_*.dump
```

### 2.2 PASO 1: Entrar al contenedor de Laravel

```bash
# Si usan docker-compose.laravel.yml en producción:
cd /ruta/deploy/modern_pos_saas
sudo docker compose -f docker-compose.laravel.yml ps

# Ver el nombre del contenedor (debería ser 'merx_pos_backend')
sudo docker compose -f docker-compose.laravel.yml exec laravel bash
```

> Si NO usan Docker en producción, simplemente naveguen al directorio del proyecto Laravel (`apps/api-laravel/`) y ejecuten los comandos de artisan directamente.

### 2.3 PASO 2: Poner la app en mantenimiento (opcional pero recomendado)

```bash
php artisan down --secret="merx-deploy-2026" --retry=60
```

Esto muestra página de mantenimiento a los usuarios, pero permite acceder con `?secret=merx-deploy-2026` para verificar.

### 2.4 PASO 3: Ejecutar migraciones

```bash
# Verificar estado actual de migraciones (debe mostrar las 3 como 'Pending')
php artisan migrate:status | grep -E "sell_by|categories|unit_label"

# Ejecutar las migraciones
php artisan migrate --force

# Salida esperada:
#   2026_05_12_200000_add_sell_by_and_fix_receiving_qty ..... DONE
#   2026_05_12_200001_create_categories_table ............... DONE
#   2026_05_12_220000_add_unit_label_to_items ............... DONE

# Verificar que no queden pendientes
php artisan migrate:status
```

**⚠️ Nota importante sobre PostgreSQL:**
La migración `200000` ejecuta `ALTER COLUMN receiving_quantity TYPE DECIMAL(15,2)`. PostgreSQL no permite esto si hay datos en la tabla. La migración usa el driver detection:
- PostgreSQL: `ALTER ... TYPE DECIMAL(15,2)` — los valores integer existentes (1, 5, 10) se convierten automáticamente a `1.00`, `5.00`, `10.00`. **Sin pérdida de datos.**
- SQLite: No ejecuta ALTER (el cast `decimal:2` en el modelo Eloquent maneja la conversión en runtime).

Si por alguna razón hay un error de tipo en PostgreSQL, ejecute manualmente:

```bash
php artisan tinker
> DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity TYPE DECIMAL(15,2) USING receiving_quantity::DECIMAL(15,2)');
> exit
```

### 2.5 PASO 4: Limpiar y regenerar cachés

```bash
# Limpiar caché de rutas (OBLIGATORIO — se agregaron 2 rutas nuevas)
php artisan route:clear

# Regenerar caché de rutas para producción
php artisan route:cache

# Limpiar caché de configuración (por si acaso)
php artisan config:clear
php artisan config:cache

# Limpiar caché de eventos/descubrimiento
php artisan event:clear
php artisan event:cache

# Limpiar caché de vistas compiladas
php artisan view:clear
```

### 2.6 PASO 5: Verificar las rutas nuevas

```bash
# Listar todas las rutas y confirmar que aparecen categories
php artisan route:list | grep categories
```

Salida esperada:
```
GET|HEAD  api/categories ............. Api\SyncReadController@getCategories
GET|HEAD  api/categories/table ....... Api\SyncReadController@getCategoriesTable
```

### 2.7 PASO 6: Salir de mantenimiento

```bash
php artisan up
```

### 2.8 PASO 7: Salir del contenedor

```bash
exit
```

---

## 3. Verificación Post-Despliegue

### 3.1 Verificar estructura de la tabla Items

```sql
-- Conectarse a PostgreSQL
psql -U merx_user -h localhost merx_prod

-- Verificar columnas nuevas
\d items
-- Debe mostrar:
--   sell_by            | character varying(10)  | default 'unit'
--   unit_label         | character varying(10)  | default 'und'
--   receiving_quantity | numeric(15,2)          | default 1

-- Verificar que receiving_quantity ya no es integer
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'items' AND column_name = 'receiving_quantity';
-- Debe devolver: numeric | 15 | 2

-- Verificar tabla categories
\d categories
-- Debe mostrar: id, tenant_id, name, sort_order, timestamps, soft_deletes
```

### 3.2 Verificar que el endpoint responde

```bash
# Obtener un token válido (use credenciales reales de un admin)
TOKEN=$(curl -s -X POST https://merxpos.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' | jq -r '.token')

# Probar el endpoint de categorías
curl -s -H "Authorization: Bearer $TOKEN" \
  https://merxpos.com/api/categories/table | jq .
# Debe devolver un array vacío [] o las categorías del tenant

# Probar que los items incluyen sell_by y unit_label
curl -s -H "Authorization: Bearer $TOKEN" \
  https://merxpos.com/api/items | jq '.[0] | {sell_by, unit_label, receiving_quantity}'
# Debe mostrar: { "sell_by": "unit", "unit_label": "und", "receiving_quantity": "1.00" }
```

### 3.3 Verificar el frontend

1. Abrir `https://merxpos.com` en el navegador
2. Iniciar sesión con cualquier usuario
3. Ir a **Inventario** → Crear/Editar producto
4. Confirmar que aparece el selector **"Tipo de Venta"** (📦 Por Unidad / ⚖️ Por Peso)
5. Confirmar que el campo **"Stock Inicial"** acepta decimales (ej: `5.5`)
6. Crear un producto con `sell_by = 'weight'`
7. Ir al **POS** → Buscar ese producto → Confirmar que abre el modal de peso
8. Confirmar que el producto a granel se agrega al carrito con el peso exacto

---

## 4. Rollback (si algo sale mal)

### 4.1 Revertir migraciones

```bash
# Entrar al contenedor
sudo docker compose -f docker-compose.laravel.yml exec laravel bash

# Revertir las 3 migraciones en orden inverso
php artisan migrate:rollback --step=3 --force

# Verificar que se hayan revertido
php artisan migrate:status | grep -E "sell_by|categories|unit_label"
# Deben aparecer como 'Pending' o no listarse
```

### 4.2 Restaurar base de datos

```bash
# Salir del contenedor
exit

# Restaurar desde el backup
pg_restore -U merx_user -h localhost -d merx_prod --clean --if-exists \
  /backups/pre_deploy_sell_by_weight_YYYYMMDD_HHMMSS.dump
```

### 4.3 Regenerar cachés

```bash
php artisan route:clear
php artisan route:cache
php artisan config:clear
php artisan config:cache
```

---

## 5. Notas para el Equipo

| Item | Detalle |
|---|---|
| **¿Requiere downtime?** | Opcional. La migración con `--force` bloquea la tabla items por ~2 segundos en PostgreSQL. Si usan `php artisan down`, serán ~30 segundos total. |
| **¿Afecta datos existentes?** | No. `sell_by` y `unit_label` se agregan con default. `receiving_quantity` convierte integers existentes a decimal sin pérdida. |
| **¿Las tiendas existentes reciben categorías?** | No automáticamente. Las categorías solo se siembran al crear una tienda nueva vía `TenantRegistrationController`. Para tiendas existentes, usar `php artisan tinker` o un seed manual. |
| **¿El frontend se despliega automático?** | Sí, vía Colify. El `git push` dispara el build de Vite/React y el redeploy del contenedor web. |
| **¿Hay que modificar Nginx?** | No. Las rutas nuevas están bajo `/api/*` que ya está configurado para proxy_pass a Laravel. |

---

## 6. Ejecución Express (Resumen de Comandos)

Si el equipo prefiere un "copiar y pegar" rápido:

```bash
# ==== EN EL SERVIDOR DE PRODUCCIÓN ====

# 1. SSH
ssh usuario@produccion.merxpos.com

# 2. Backup
pg_dump -U merx_user -h localhost -Fc merx_prod > /backups/bak_$(date +%Y%m%d_%H%M).dump

# 3. Entrar al contenedor Laravel
cd /ruta/deploy/modern_pos_saas
sudo docker compose -f docker-compose.laravel.yml exec laravel bash

# 4. Migrar y cachear (todo en secuencia)
php artisan down --retry=60 --secret="merx-$(date +%s)" \
  && php artisan migrate --force \
  && php artisan route:cache \
  && php artisan config:cache \
  && php artisan event:cache \
  && php artisan up

# 5. Verificar
php artisan route:list | grep categories
php artisan migrate:status

# 6. Salir
exit
```
