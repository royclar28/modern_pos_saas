# 🔍 Auditoría de Base de Datos — Merx POS SaaS

**Auditor:** DBA PostgreSQL 16+  
**Fecha:** 2026-05-25  
**Sistema:** Merx POS — Multi-tenant Offline-First SaaS  
**Alcance:** Esquema, Integridad, Privacidad, Backups, Migraciones, Rendimiento

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítico | 4 |
| 🟠 Alto | 6 |
| 🟡 Medio | 8 |
| 🟢 Bajo | 5 |
| ✅ Correcto | 12 |

---

## 1. 🔴 Crítico — Riesgo de Pérdida o Corrupción de Datos

### 1.1 `cash_shifts.tenant_id` y `cash_shifts.user_id` como VARCHAR sin FK

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql:56) (producción), [`0001_01_01_000010_create_cash_shifts_table.php`](apps/api-laravel/database/migrations/0001_01_01_000010_create_cash_shifts_table.php:13) (migración)

```sql
-- Producción (dump)
tenant_id character varying(100) NOT NULL,   -- DEBERÍA SER UUID
user_id   character varying(100) NOT NULL,   -- DEBERÍA SER BIGINT
```

**Problema:** En la tabla `cash_shifts`, `tenant_id` es `VARCHAR(100)` en lugar de `UUID`, y `user_id` es `VARCHAR(100)` en lugar de `BIGINT`. No hay restricción de clave foránea (`REFERENCES stores(id)` / `REFERENCES users(id)`). Esto rompe la integridad referencial del tenant isolation.

**Riesgo:** 
- Un registro de turno podría quedar huérfano si se elimina el tenant
- No hay garantía de que `tenant_id` apunte a un store válido
- El tipo VARCHAR(100) es 4× más grande que UUID (36 chars vs 16 bytes), inflando índices

**Acción:** Migrar `cash_shifts.tenant_id` a `UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE` y `cash_shifts.user_id` a `BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`.

---

### 1.2 `sales` sin CHECK constraints en `payment_method` y `status` en producción

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql:407)

```sql
payment_method character varying(30) DEFAULT 'DIVISA'::character varying NOT NULL,
status character varying(20) DEFAULT 'PAGADO'::character varying NOT NULL,
-- NO HAY CHECK CONSTRAINTS
```

**Problema:** El DDL propuesto en [`dba_report.md`](dba_report.md:167) incluye CHECK constraints para `payment_method` y `status`, pero en la base de producción **no existen**. Cualquier valor inválido puede insertarse.

**Riesgo:** Datos financieros corruptos (ej. `status = 'CANCELED'` en lugar de `ANULADO`), reportes incorrectos.

**Acción:** Agregar CHECK constraints:
```sql
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check 
  CHECK (payment_method IN ('DIVISA','EFECTIVO_BS','PAGO_MOVIL','PUNTO','FIADO','MIXTO'));
ALTER TABLE sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('PAGADO','PENDIENTE','ANULADO'));
```

---

### 1.3 `sales_summary` como JSON (no JSONB) en producción

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql:56)

```sql
sales_summary json,   -- DEBERÍA SER JSONB
```

**Problema:** El DDL propuesto usa `JSONB` con índice GIN, pero en producción es `JSON` (sin índice). JSON no soporta índices GIN de manera eficiente, y las consultas de reportes sobre `sales_summary` harán sequential scans.

**Riesgo:** Degradación severa de performance en dashboards administrativos a medida que crecen los datos.

**Acción:** Migrar a `JSONB` y crear el índice GIN:
```sql
ALTER TABLE cash_shifts ALTER COLUMN sales_summary TYPE JSONB USING sales_summary::jsonb;
CREATE INDEX idx_cash_shifts_summary_gin ON cash_shifts USING GIN (sales_summary);
```

---

### 1.4 `unique_open_shift` sin condición parcial (permite múltiples CLOSED duplicados)

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql:1284)

```sql
ADD CONSTRAINT unique_open_shift UNIQUE (tenant_id, user_id, status);
```

**Problema:** La constraint `UNIQUE (tenant_id, user_id, status)` debería ser **parcial** (`WHERE status = 'OPEN'`) para permitir que un usuario tenga múltiples turnos cerrados históricos. Sin la condición parcial, un usuario solo puede tener UN turno CLOSED en todo el histórico.

**Riesgo:** Imposibilidad de cerrar un segundo turno para el mismo usuario. Error de integridad funcional.

**Acción:** Reemplazar con índice único parcial:
```sql
DROP INDEX IF EXISTS unique_open_shift;
CREATE UNIQUE INDEX idx_unique_open_shift 
  ON cash_shifts (tenant_id, user_id) WHERE status = 'OPEN';
```

---

## 2. 🟠 Alto — Riesgo de Integridad o Privacidad

### 2.1 Ausencia total de Row-Level Security (RLS)

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql)

```sql
SET row_security = off;  -- Línea 26 del dump
```

**Problema:** No hay `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en ninguna tabla. El tenant isolation depende exclusivamente de la lógica de aplicación (Laravel/NestJS). Un query malicioso o un bug en el middleware podría exponer datos de otros tenants.

**Riesgo:** **ALTO** — Violación masiva de privacidad de datos de clientes (PII). En un sistema multi-tenant, RLS es la última línea de defensa.

**Acción:** Implementar RLS en todas las tablas con `tenant_id`:
```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customers 
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
-- Repetir para cada tabla
```

---

### 2.2 Datos PII (Personally Identifiable Information) sin encriptación

**Archivo:** [`0001_01_01_000003_create_customers_table.php`](apps/api-laravel/database/migrations/0001_01_01_000003_create_customers_table.php:11)

**Campos PII identificados:**

| Tabla | Campos PII | ¿Encriptado? |
|-------|-----------|:------------:|
| `customers` | `first_name`, `last_name`, `email`, `phone`, `address` | ❌ No |
| `users` | `first_name`, `last_name`, `email`, `phone`, `address` | ❌ No |
| `stores` | `owner_email`, `rif` | ❌ No |

**Riesgo:** En caso de breach de base de datos, toda la información personal de clientes y empleados queda expuesta en texto plano. Sin `pgcrypto` ni cifrado a nivel de columna.

**Acción:** 
1. Implementar cifrado a nivel de aplicación para campos sensibles (ej. `pgp_sym_encrypt` de `pgcrypto` o cifrado en Laravel con `encrypt()`)
2. Al menos, encriptar `email` y `phone` con `pgcrypto`
3. Documentar política de retención de PII (GDPR Art. 5)

---

### 2.3 `password_reset_tokens` sin expiración automática ni tenant_id

**Archivo:** [`0001_01_01_000002_create_users_table.php`](apps/api-laravel/database/migrations/0001_01_01_000002_create_users_table.php:31)

```sql
CREATE TABLE password_reset_tokens (
    email      VARCHAR(255) PRIMARY KEY,
    token      VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ
);
```

**Problema:** 
- No hay `tenant_id` — un token de reset podría usarse entre tenants
- No hay expiración automática (el token vive para siempre)
- No hay índice en `created_at` para limpieza periódica

**Riesgo:** Un token de reset robado podría usarse para acceder a cuentas de otros tenants.

**Acción:** Agregar `tenant_id UUID REFERENCES stores(id)`, índice en `created_at`, y TTL de expiración (60 min).

---

### 2.4 `sales.employee_id` sin ON DELETE CASCADE ni SET NULL

**Archivo:** [`merxpos_produccion.sql`](merxpos_produccion.sql:1570)

```sql
ADD CONSTRAINT sales_employee_id_foreign FOREIGN KEY (employee_id) REFERENCES public.users(id);
-- Sin ON DELETE
```

**Problema:** Si se elimina un usuario (soft delete no evita hard delete), las ventas asociadas quedan huérfanas. La migración Laravel tampoco define `ON DELETE`.

**Riesgo:** Pérdida de trazabilidad de auditoría financiera.

**Acción:** Cambiar a `ON DELETE SET NULL` (o `ON DELETE RESTRICT` si no se permite eliminar usuarios con ventas).

---

## 3. 🟡 Medio — Mejora Recomendada

### 3.1 Migraciones no son todas reversibles (down incompleto)

**Archivo:** [`2026_04_02_163800_add_manager_role_to_users_table.php`](apps/api-laravel/database/migrations/2026_04_02_163800_add_manager_role_to_users_table.php:34)

```php
public function down(): void
{
    DB::table('users')->where('role', 'ADMIN')->update(['role' => 'STORE_ADMIN']);
    DB::table('users')->where('role', 'MANAGER')->update(['role' => 'CASHIER']);
}
```

**Problema:** El `down()` asume que no hay nuevos registros con rol `ADMIN` o `MANAGER` desde que se ejecutó el `up()`. Si hay datos nuevos, se pierde información de roles al revertir.

**Afecta también a:** [`2026_05_12_200000_add_sell_by_and_fix_receiving_qty.php`](apps/api-laravel/database/migrations/2026_05_12_200000_add_sell_by_and_fix_receiving_qty.php:38) — revertir `receiving_quantity` de DECIMAL a INTEGER puede truncar datos.

---

### 3.2 `users` usa BIGSERIAL (no UUID) — inconsistencia con el resto del esquema

**Archivo:** [`0001_01_01_000002_create_users_table.php`](apps/api-laravel/database/migrations/0001_01_01_000002_create_users_table.php:12)

```php
$table->id();  // BIGSERIAL / AUTO_INCREMENT
```

**Problema:** Justificado por compatibilidad con Sanctum (requiere integer morph), pero crea una dualidad: todas las demás tablas usan UUID, `users` usa BIGSERIAL. `employee_id` en `sales` es `BIGINT` referenciando `users.id`, pero `customer_id` es UUID. Esto puede causar confusión en joins y reportes.

**Mitigación:** Documentar explícitamente esta excepción. Considerar migrar a UUIDv7 para `users` cuando Sanctum lo soporte.

---

### 3.3 `stores` sin `tenant_id` (es la tabla raíz, pero no hay campo de "parent tenant")

**Archivo:** [`0001_01_01_000001_create_stores_table.php`](apps/api-laravel/database/migrations/0001_01_01_000001_create_stores_table.php:11)

**Problema:** En una arquitectura multi-tenant con marca blanca, la tabla `stores` es el tenant raíz. No hay un `parent_id` o `group_id` para agrupar stores bajo un mismo dueño corporativo. Esto limita la escalabilidad a cadenas de tiendas.

**Acción:** Considerar agregar `group_id UUID REFERENCES store_groups(id)` para el futuro.

---

### 3.4 `sessions` sin tenant_id — sesiones no aisladas por tenant

**Archivo:** [`0001_01_01_000002_create_users_table.php`](apps/api-laravel/database/migrations/0001_01_01_000002_create_users_table.php:37)

```php
Schema::create('sessions', function (Blueprint $table) {
    $table->string('id')->primary();
    $table->foreignId('user_id')->nullable()->index();
    // ...
});
```

**Problema:** No hay `tenant_id` en la tabla `sessions`. Un usuario con sesión activa en un tenant no puede ser distinguido de otro. Para limpieza de sesiones por tenant, se necesita escanear toda la tabla.

---

### 3.5 `sale_items` sin FK a `items` con ON DELETE RESTRICT explícito

**Archivo:** [`0001_01_01_000006_create_sale_items_table.php`](apps/api-laravel/database/migrations/0001_01_01_000006_create_sale_items_table.php:28)

```php
$table->foreign('item_id')->references('id')->on('items');
// Sin ON DELETE
```

**Problema:** La FK a `items` no especifica `ON DELETE`. PostgreSQL por defecto usa `NO ACTION`, que es equivalente a `RESTRICT` pero difiere en el timing. Debería ser explícito.

---

### 3.6 `processed_sync_events` no tiene TTL / política de limpieza

**Archivo:** [`0001_01_01_000008_create_processed_sync_events_table.php`](apps/api-laravel/database/migrations/0001_01_01_000008_create_processed_sync_events_table.php:18)

**Problema:** Esta tabla crece indefinidamente. Cada evento de sincronización se registra para siempre. Con ~10,000 ventas/mes × 3 eventos c/u = 30,000 filas/mes. En 2 años: 720,000 filas. Sin particionamiento ni política de retención.

**Acción:** Implementar particionamiento por mes (`RANGE (processed_at)`) y job de limpieza para eventos > 90 días.

---

### 3.7 `items.stock` como NUMERIC(15,2) — posible problema de concurrencia

**Archivo:** [`0001_01_01_000004_create_items_table.php`](apps/api-laravel/database/migrations/0001_01_01_000004_create_items_table.php:20)

**Problema:** El stock se actualiza con `SELECT ... FOR UPDATE` + `UPDATE` en dos queries separados. Aunque el lock de fila previene race conditions, el patrón correcto es `UPDATE items SET stock = stock + $delta WHERE id = ? AND stock + $delta >= 0` (UPDATE atómico con CHECK).

**Riesgo:** Entre el `SELECT ... FOR UPDATE` y el `UPDATE`, aunque improbable, una excepción podría dejar la transacción inconsistente.

---

### 3.8 `stores` sin `deleted_at` (soft delete)

**Archivo:** [`0001_01_01_000001_create_stores_table.php`](apps/api-laravel/database/migrations/0001_01_01_000001_create_stores_table.php:11)

**Problema:** Todas las tablas de negocio tienen `softDeletes()`, pero `stores` no. Si se elimina un store (tenant), se pierde todo el histórico por el `CASCADE`. No hay forma de recuperar.

---

## 4. 🟢 Bajo — Optimización

### 4.1 `sessions.last_activity` como INTEGER en lugar de TIMESTAMPTZ

**Archivo:** [`0001_01_01_000002_create_users_table.php`](apps/api-laravel/database/migrations/0001_01_01_000002_create_users_table.php:43)

```php
$table->integer('last_activity')->index();
```

**Problema:** Almacenar timestamp como INTEGER (Unix epoch) es menos legible y no permite usar funciones de fecha de PostgreSQL directamente. Cambiar a `timestamp(0) without time zone`.

---

### 4.2 `cash_shifts.sales_summary` como JSON en producción vs JSONB en DDL

Ya cubierto en 1.3.

---

### 4.3 Índice `idx_items_low_stock` no existe en producción

**Archivo:** [`dba_report.md`](dba_report.md:148) (propuesto) vs producción (ausente)

**Problema:** El índice parcial `(tenant_id, stock, reorder_level) WHERE deleted_at IS NULL` está en el DDL propuesto pero no en producción. Las alertas de stock bajo harán sequential scan.

---

### 4.4 `users` sin índice en `(tenant_id, role)` para filtros por rol

**Problema:** Consultas frecuentes como "dame todos los cajeros de esta tienda" (`WHERE tenant_id = ? AND role = 'CASHIER'`) no tienen índice compuesto.

---

### 4.5 `personal_access_tokens` sin tenant_id

**Archivo:** [`2026_03_28_235315_create_personal_access_tokens_table.php`](apps/api-laravel/database/migrations/2026_03_28_235315_create_personal_access_tokens_table.php:14)

**Problema:** No se puede revocar todos los tokens de un tenant sin escanear toda la tabla.

---

## 5. ✅ Correcto — Bien Implementado

### 5.1 UUID como PK en tablas de negocio
✅ Decisión correcta para arquitectura Offline-First. UUIDv4 evita colisiones en generación distribuida.

### 5.2 Soft Deletes en tablas de negocio
✅ `customers`, `items`, `sales`, `sale_items`, `sale_payments`, `users`, `cash_shifts`, `store_configs`, `categories` — todas tienen `deleted_at`.

### 5.3 Índices compuestos con tenant_id como leading column
✅ Todos los índices comienzan con `tenant_id`, lo que permite partition pruning y tenant isolation eficiente.

### 5.4 Foreign Keys con CASCADE en tenant_id
✅ `ON DELETE CASCADE` en todas las FKs de `tenant_id` → `stores(id)`. Correcto para limpieza de tenant.

### 5.5 Precisión decimal en datos financieros
✅ `NUMERIC(15,2)` / `DECIMAL(15,2)` en todos los campos monetarios. Sin floats.

### 5.6 Unique constraints compuestas con tenant_id
✅ `UNIQUE(tenant_id, item_number)`, `UNIQUE(tenant_id, account_number)`, `UNIQUE(tenant_id, invoice_number)` — correcto para tenant isolation.

### 5.7 `sale_items` con `@@unique([saleId, itemId, line])` en Prisma
✅ Evita duplicación de líneas en una misma venta.

### 5.8 `sales` FK a `customers` con `nullOnDelete`
✅ `ON DELETE SET NULL` — correcto: si se elimina un cliente, las ventas históricas se conservan.

### 5.9 `processed_sync_events` con índices de idempotencia
✅ Índices en `(tenant_id, entity_type, entity_id)` y `(tenant_id, processed_at)` — cubren los patrones de consulta del Drain Loop.

### 5.10 `categories` con `sort_order` y `UNIQUE(tenant_id, name)`
✅ Correcto para ordenamiento y evitar duplicados por tenant.

### 5.11 Migraciones con `down()` implementado
✅ Todas las migraciones tienen método `down()`, aunque algunas tienen limitaciones (ver 3.1).

### 5.12 Uso de `declare(strict_types=1)` en migraciones recientes
✅ Buenas prácticas de tipado en PHP 8+.

---

## 6. 📊 Resumen de Índices

| Tabla | Índices Existentes | Índices Faltantes |
|-------|:------------------:|:-----------------:|
| `stores` | 1 (PK) | `(is_active, plan)` para filtros SaaS |
| `users` | 3 (PK, username, tenant_id) | `(tenant_id, role)`, `(tenant_id, deleted_at)` |
| `customers` | 2 (PK, tenant_id) + 1 UNIQUE | `(tenant_id, deleted_at)` |
| `items` | 4 (PK, tenant_id, category, deleted_at) + 1 UNIQUE | `idx_items_low_stock` (parcial) |
| `sales` | 5 (PK, tenant_id, time, status, employee) + 1 UNIQUE | `(tenant_id, customer_id, status)` parcial para fiados |
| `sale_items` | 2 (PK, tenant_id, sale_id) + 1 UNIQUE | `(tenant_id, item_id)` |
| `sale_payments` | 2 (tenant_id, sale_id) | `(tenant_id, paid_at)` |
| `cash_shifts` | 3 (tenant_id, user_id, unique_open) | GIN en sales_summary |
| `processed_sync_events` | 3 (tenant_id, entity, processed_at) | `(tenant_id, occurred_at)` |
| `store_configs` | 1 UNIQUE | `(tenant_id, key)` ya cubierto |
| `categories` | 1 (sort_order) + 1 UNIQUE | ✅ Suficiente |

---

## 7. 🔐 Privacidad de Datos (PII) — Checklist GDPR

| Requisito GDPR | Estado | Acción Requerida |
|----------------|:-----:|------------------|
| Derecho al olvido (Art. 17) | ❌ | No hay función de anonimización masiva de PII por tenant |
| Portabilidad de datos (Art. 20) | ❌ | No hay exportación estructurada de datos de un cliente |
| Cifrado de datos personales (Art. 32) | ❌ | PII en texto plano en customers, users, stores |
| Minimización de datos (Art. 5) | 🟡 | Se almacenan campos innecesarios (address en users) |
| Consentimiento (Art. 7) | ❌ | No hay registro de consentimiento para almacenar PII |
| Notificación de breaches (Art. 33) | ❌ | No hay audit log de accesos a datos sensibles |
| DPO designado | ❌ | No identificado |

---

## 8. 💾 Backups y Recuperación

### Estado Actual
- ✅ Existe dump SQL (`merxpos_produccion.sql`) — evidencia de backup manual
- ❌ No se detecta configuración de `pg_dump` automatizado
- ❌ No hay evidencia de Point-in-Time Recovery (WAL archiving)
- ❌ No hay script de restauración probado
- ❌ No hay política de retención de backups

### Recomendaciones
1. Configurar `archive_mode = on` y `archive_command` para WAL archiving
2. Implementar `pg_dump` diario + WAL continuo para PITR
3. Probar restauración en ambiente de staging mensualmente
4. Definir RPO (Recovery Point Objective) ≤ 5 minutos y RTO (Recovery Time Objective) ≤ 1 hora

---

## 9. 🏗️ Schema Versioning y Migraciones

### Problemas Identificados

| Problema | Detalle |
|----------|---------|
| Naming inconsistente | Migraciones con timestamp `0001_01_01` mezcladas con `2026_03_28` y `2026_05_12` |
| Sin `batch` en migraciones | Laravel usa tabla `migrations` con batch, pero algunas migraciones no son idempotentes |
| Prisma desactualizado | Schema Prisma no refleja `sell_by`, `unit_label`, `min_stock_alert`, `categories`, `trial_ends_at`, `status` en stores |
| Dual schema management | Laravel migrations + Prisma migrations = dos fuentes de verdad |

### Recomendación
Elegir UNA herramienta de schema management. Si el backend principal es Laravel, Prisma debería ser readonly o viceversa.

---

## 10. 📈 Recomendaciones Prioritarias

### Inmediatas (Sprint Actual)
1. 🔴 **Migrar `cash_shifts.tenant_id` a UUID con FK** — riesgo de integridad referencial
2. 🔴 **Agregar CHECK constraints a `sales`** — riesgo de datos financieros corruptos
3. 🔴 **Corregir `unique_open_shift` a índice parcial** — bug funcional
4. 🟠 **Implementar RLS en todas las tablas** — breach de privacidad

### Corto Plazo (Siguiente Sprint)
5. 🟠 **Encriptar PII** (`email`, `phone`, `address`) con `pgcrypto`
6. 🟠 **Agregar `tenant_id` a `password_reset_tokens` y `sessions`**
7. 🟡 **Particionar `processed_sync_events` por mes**
8. 🟡 **Sincronizar schema Prisma con Laravel migrations**

### Mediano Plazo
9. 🟢 **Migrar a UUIDv7** para reducir fragmentación de índices B-Tree
10. 🟢 **Configurar WAL archiving y PITR**
11. 🟢 **Implementar política de retención de datos (GDPR)**
12. 🟢 **Agregar `deleted_at` a `stores`**

---

*Reporte generado por DBA Audit Tool — Merx POS SaaS*
*Para cualquier aclaración, contactar al equipo de ingeniería.*
