# Auditoría de Backend — Calidad de Código y Deuda Técnica

**Fecha:** 2026-05-25  
**Auditor:** Backend Senior (Laravel 13 / NestJS)  
**Alcance:** `apps/api-laravel` (Laravel 13) + `apps/api` (NestJS/Prisma)

---

## Resumen Ejecutivo

| Severidad | Conteo |
|-----------|--------|
| 🔴 Crítico | 2 |
| 🟠 Alto | 8 |
| 🟡 Medio | 12 |
| 🟢 Bajo | 10 |
| ✅ Correcto | 14 |

---

## 🔴 Crítico

### C1. [`AuthController::login()`](apps/api-laravel/app/Http/Controllers/Api/AuthController.php:22) — `orWhere` rompe el aislamiento multi-tenant

```php
$user = User::withoutGlobalScopes()
    ->where('username', $request->username)
    ->orWhere('email', $request->username)  // ← ¡Esto anula el where anterior!
    ->first();
```

**Problema:** El `orWhere` no está agrupado con paréntesis. La query generada es:
```sql
WHERE username = ? OR email = ?
```
Esto permite que un usuario de un tenant pueda loguearse con el email de un usuario de OTRO tenant. El `withoutGlobalScopes()` combinado con `orWhere` sin agrupar expone datos cross-tenant.

**Solución:** Encerrar en un grupo:
```php
->where(function ($q) use ($request) {
    $q->where('username', $request->username)
      ->orWhere('email', $request->username);
})
```

---

### C2. [`SaasService.createStore()`](apps/api/src/saas/saas.service.ts:34) — Contraseña temporal predecible y sin transacción

```typescript
const temporaryPassword = Math.random().toString(36).slice(-8);
```

**Problemas:**
1. `Math.random()` no es criptográficamente seguro. Genera contraseñas predecibles.
2. La creación de Store + User no está envuelta en una transacción de Prisma. Si falla el email, el store queda huérfano.
3. Si el usuario ya existe (L52-66), se le reasigna a otra tienda sin verificar permisos — un atacante podría secuestrar cuentas.

**Solución:** Usar `crypto.randomBytes()` y envolver en `$transaction()`.

---

## 🟠 Alto

### H1. [`DashboardController::summary()`](apps/api-laravel/app/Http/Controllers/Api/DashboardController.php:35) — Lógica de negocio en el controlador

El método `summary()` contiene ~60 líneas de lógica financiera directamente en el controlador. Violación del principio de responsabilidad única.

**Solución:** Extraer a una clase `Actions\Dashboard\CalculateDailySummaryAction`.

---

### H2. [`SettingsController::scrapeBcvRate()`](apps/api-laravel/app/Http/Controllers/Api/SettingsController.php:116) — Web scraping sincrónico en controlador

El scraping del BCV se ejecuta sincrónicamente dentro del ciclo de vida HTTP. Si el BCV tarda >10s, el worker de queue o el servidor web se bloquean.

**Solución:** Mover a un Job asíncrono (`FetchBcvRateJob`) y cachear el resultado.

---

### H3. [`SyncEventProcessor::handleSaleCreate()`](apps/api-laravel/app/Services/Sync/SyncEventProcessor.php:205) — Pre-validación de stock duplicada

Se hace pre-validación de stock (L212-229) y luego `handleItemAdjustStock` vuelve a validar. Esto duplica lógica y puede causar race conditions entre la pre-validación y el ajuste real.

**Solución:** Eliminar la pre-validación; confiar en `lockForUpdate()` en el handler de ajuste.

---

### H4. [`InvoiceVisionService`](apps/api-laravel/app/Services/InvoiceVisionService.php) — API Key de OpenAI hardcodeada en config

```php
$apiKey = config('services.openai.key');
```
Pero luego llama a `https://api.groq.com/...` (Groq, no OpenAI). La configuración es engañosa.

**Solución:** Usar `config('services.groq.key')` y renombrar la entrada en `config/services.php`.

---

### H5. [`SyncController::push()`](apps/api/src/sync.controller.ts:87) — Sin validación de DTO

El método `push()` recibe `body: { rows: PushRow[] }` sin validación de esquema. Cualquier payload malicioso o malformado pasa directamente a Prisma.

**Solución:** Implementar un DTO con `class-validator` y `ValidationPipe`.

---

### H6. [`TelegramModule`](apps/api/src/telegram/telegram.module.ts:13) — `execSync` con input de entorno en tiempo de compilación

```typescript
const output = execSync(`curl -s https://api.telegram.org/bot${token}/getMe`, ...);
```

**Problema:** `execSync` bloquea el event loop de Node.js al arrancar la aplicación. Si la API de Telegram está caída, la app no inicia. Además, es una inyección de comando potencial si `token` contiene caracteres especiales.

**Solución:** Validar el token asíncronamente en `onModuleInit()`.

---

### H7. [`AuthController::login()`](apps/api/src/auth/auth.controller.ts:10) — `@Body() body: any` sin DTO

El body del login se tipa como `any`. No hay validación de esquema. Cualquier estructura de datos es aceptada.

**Solución:** Crear `LoginDto` con `@IsString()` y `@IsNotEmpty()`.

---

### H8. [`Prisma schema`](apps/api/prisma/schema.prisma) — Modelos NestJS usan `Int` como PK mientras Laravel usa `UUID`

| Entidad | Laravel (PK) | NestJS (PK) |
|---------|-------------|-------------|
| User | UUID (string) | Int (autoincrement) |
| Customer | UUID (string) | Int (autoincrement) |
| Item | UUID (string) | Int (autoincrement) |
| Sale | UUID (string) | Int (autoincrement) |

**Problema:** El frontend RxDB genera UUIDs. El Sync Push de NestJS hace `parseInt(doc.id, 10)` que fallará silenciosamente con UUIDs reales. Esto es una bomba de tiempo cuando ambos backends compartan datos.

---

## 🟡 Medio

### M1. [`AuthController`](apps/api-laravel/app/Http/Controllers/Api/AuthController.php) — Falta `declare(strict_types=1)`

El archivo no declara `strict_types`. Aunque no causa errores ahora, es una inconsistencia con el estándar del proyecto.

---

### M2. [`SaleController::index()`](apps/api-laravel/app/Http/Controllers/Api/SaleController.php:15) — Sin paginación

```php
->limit(50)->get()
```

Usa `limit(50)` en lugar de paginación real. Si hay más de 50 ventas, el cliente no tiene forma de obtener las anteriores.

**Solución:** Implementar `paginate()` con cursor o page-based.

---

### M3. [`SyncReadController::getItems()`](apps/api-laravel/app/Http/Controllers/Api/SyncReadController.php:21) — Sin paginación

```php
$items = Item::select([...])->get();
```

Para catálogos grandes (+10,000 items), esto puede agotar la memoria del servidor.

**Solución:** Implementar cursor-based pagination o chunking.

---

### M4. [`SaasController::index()`](apps/api-laravel/app/Http/Controllers/Api/SaasController.php:18) — N+1 en listado de tiendas

```php
$stores = Store::orderBy('created_at', 'desc')->get()->map(function ($store) {
    $owner = $store->users()->where('role', 'ADMIN')->first(); // ← Query N+1
```

Cada tienda ejecuta una query adicional para obtener el owner. Con 100 tiendas = 101 queries.

**Solución:** Usar `Store::with(['users' => fn($q) => $q->where('role', 'ADMIN')])`.

---

### M5. [`SaasMetricsController::metrics()`](apps/api-laravel/app/Http/Controllers/Api/SaasMetricsController.php:50) — N+1 en tiendas recientes

```php
$owner = $store->users()->whereIn('role', ['ADMIN', 'STORE_ADMIN'])->orderBy('created_at')->first();
```

Mismo problema que M4. 5 queries adicionales para 5 tiendas.

---

### M6. [`CashShiftController::fetchPagoMovilReferences()`](apps/api-laravel/app/Http/Controllers/Api/CashShiftController.php:119) — Dos queries casi idénticas

Las queries de `Sale` y `SalePayment` tienen la misma estructura y se concatenan. Podrían unificarse con un `UNION` SQL o una vista materializada.

---

### M7. [`InvoiceVisionService`](apps/api-laravel/app/Services/InvoiceVisionService.php:52) — URL hardcodeada a Groq

```php
->post('https://api.groq.com/openai/v1/chat/completions', [...])
```

La URL del proveedor de IA está hardcodeada. Debería estar en `config/services.php`.

---

### M8. [`InvoiceScannerService`](apps/api/src/inventory/invoice-scanner.service.ts) — Duplicación del servicio Laravel

El servicio `InvoiceScannerService` (NestJS) y `InvoiceVisionService` (Laravel) hacen EXACTAMENTE lo mismo: enviar imagen a Groq, parsear JSON, normalizar productos. Esto es código duplicado mantenido en dos backends.

**Solución:** Unificar en un solo microservicio o compartir el paquete `@pos/shared`.

---

### M9. [`SettingsService::updateMany()`](apps/api/src/settings/settings.service.ts:60) — `as any` en el where de upsert

```typescript
where: { storeId_key: { storeId, key: configKey } } as any,
```

El `as any` desactiva el type-checking de TypeScript. Si la estructura del índice compuesto cambia en Prisma, esto falla en runtime.

---

### M10. [`BcvService::updateBcvRateForAllStores()`](apps/api/src/settings/bcv.service.ts:17) — Actualización secuencial de todas las tiendas

```typescript
for (const store of stores) {
    await this.updateBcvRate(store.id);
}
```

Con 1,000 tiendas, esto hace 1,000 requests HTTP secuenciales a APIs externas. Puede tomar minutos.

**Solución:** Usar `Promise.allSettled()` con un límite de concurrencia (ej. 10).

---

### M11. [`TelegramService::sendReporteZ()`](apps/api/src/telegram/telegram.service.ts:48) — Sin filtro de tenant en `storeId`

La query de ventas solo filtra por `storeId` (L50), pero no verifica que el usuario autenticado en Telegram pertenezca a esa tienda. Un usuario malicioso podría registrar su chatId con un email de otra tienda.

**Solución:** Verificar que `user.storeId` coincida con el storeId de las ventas consultadas (ya se hace, pero falta verificar que el usuario no pueda cambiar su `telegramChatId` a otro storeId).

---

### M12. [`config/database.php`](apps/api-laravel/config/database.php:20) — Default SQLite en producción

```php
'default' => env('DB_CONNECTION', 'sqlite'),
```

El default es SQLite. Si la variable `DB_CONNECTION` no está configurada en producción, la app usa SQLite en vez de MySQL/MariaDB, causando fallos silenciosos.

---

## 🟢 Bajo

### L1. [`AuthController::login()`](apps/api-laravel/app/Http/Controllers/Api/AuthController.php:12) — Sin tipo de retorno

El método `login()` no declara `: JsonResponse`. Similar para `changePassword()`.

---

### L2. [`SaleController::index()`](apps/api-laravel/app/Http/Controllers/Api/SaleController.php:15) — Sin tipo de retorno

```php
public function index(Request $request)
```

Falta `: JsonResponse`.

---

### L3. [`SyncController::processBatch()`](apps/api-laravel/app/Http/Controllers/Api/SyncController.php:33) — Sin tipo de retorno explícito

```php
public function processBatch(SyncEventsRequest $request)
```

Falta `: JsonResponse`.

---

### L4. [`SettingsController::getSettings()`](apps/api-laravel/app/Http/Controllers/Api/SettingsController.php:32) — Sin tipo de retorno

```php
public function getSettings(Request $request)
```

Falta `: JsonResponse`.

---

### L5. [`SaasController::createStore()`](apps/api-laravel/app/Http/Controllers/Api/SaasController.php:39) — Sin tipo de retorno

```php
public function createStore(Request $request)
```

Falta `: JsonResponse`.

---

### L6. [`PasswordResetController`](apps/api-laravel/app/Http/Controllers/Api/PasswordResetController.php) — Sin `declare(strict_types=1)`

---

### L7. [`SyncController`](apps/api-laravel/app/Http/Controllers/Api/SyncController.php) — Sin `declare(strict_types=1)`

---

### L8. [`SettingsController`](apps/api-laravel/app/Http/Controllers/Api/SettingsController.php) — Sin `declare(strict_types=1)`

---

### L9. [`SaasController`](apps/api-laravel/app/Http/Controllers/Api/SaasController.php) — Sin `declare(strict_types=1)`

---

### L10. [`SaasMetricsController`](apps/api-laravel/app/Http/Controllers/Api/SaasMetricsController.php) — Sin `declare(strict_types=1)`

---

## ✅ Correcto (Buenas Prácticas)

### G1. [`SyncEventProcessor`](apps/api-laravel/app/Services/Sync/SyncEventProcessor.php) — Excelente manejo de idempotencia

El patrón de `ProcessedSyncEvent::wasProcessed()` + `DB::transaction()` + `markProcessed()` es correcto y robusto. Previene duplicados incluso en fallos de red.

---

### G2. [`InsufficientStockException`](apps/api-laravel/app/Exceptions/InsufficientStockException.php) — Excepción de dominio tipada

Uso de `readonly` properties en PHP 8.3, mensaje descriptivo, y herencia correcta de `RuntimeException`.

---

### G3. [`Item::adjustStock()`](apps/api-laravel/app/Models/Item.php:64) — Lock atómico con `lockForUpdate()`

```php
$item = static::where('id', $this->id)->lockForUpdate()->firstOrFail();
```

Protege contra race conditions en stock. Excelente.

---

### G4. [`TenantScope`](apps/api-laravel/app/Models/Scopes/TenantScope.php) — Aislamiento multi-tenant correcto

El Global Scope se aplica a nivel ORM, haciendo imposible olvidar el filtro de tenant. Bien implementado.

---

### G5. [`HasTenant` trait](apps/api-laravel/app/Models/Traits/HasTenant.php) — Auto-asignación de tenant_id

```php
static::creating(function ($model) {
    if (empty($model->tenant_id) && auth()->check()) {
        $model->tenant_id = auth()->user()->tenant_id;
    }
});
```

Previene la creación de registros huérfanos. Correcto.

---

### G6. [`SyncEventsRequest`](apps/api-laravel/app/Http/Requests/SyncEventsRequest.php) — Validación exhaustiva

Valida UUIDs, enum de entity_type/action, límite de 500 eventos por batch, y mensajes en español. Excelente.

---

### G7. [`CheckTrialStatus`](apps/api-laravel/app/Http/Middleware/CheckTrialStatus.php) — Middleware de trial con rutas whitelist

Uso correcto de HTTP 402 (Payment Required), lazy update de status, y bypass para SUPER_ADMIN.

---

### G8. [`RoleMiddleware`](apps/api-laravel/app/Http/Middleware/RoleMiddleware.php) — RBAC con bypass de SUPER_ADMIN

Correcto: permite SUPER_ADMIN en todas las rutas, normaliza roles, y devuelve 403 con detalles.

---

### G9. [`CashShiftController::fetchPagoMovilReferences()`](apps/api-laravel/app/Http/Controllers/Api/CashShiftController.php:119) — Query en lote bien optimizada

En lugar de hacer N queries por turno, hace 2 queries globales y filtra en memoria. Buen trade-off.

---

### G10. [`ProcessedSyncEvent`](apps/api-laravel/app/Models/ProcessedSyncEvent.php) — Modelo de idempotencia bien diseñado

Usa `event_id` como PK, timestamps manuales, y métodos estáticos claros (`wasProcessed`, `markProcessed`, `markFailed`).

---

### G11. [`CustomersService::payDebt()`](apps/api/src/customers/customers.service.ts:14) — Transacción interactiva correcta

```typescript
return await this.prisma.$transaction(async (tx) => { ... });
```

Usa `$transaction` con callback para operaciones atómicas de pago de deuda. Excelente.

---

### G12. [`InvoiceScannerService`](apps/api/src/inventory/invoice-scanner.service.ts) — Manejo de errores de Groq

Distingue entre 401, 413, 429 y errores genéricos, con logging apropiado. Bien estructurado.

---

### G13. [`BcvService`](apps/api/src/settings/bcv.service.ts) — Fallback de APIs

Intenta `dolarapi.com` primero, luego `pydolarve.org` como fallback. Resiliente.

---

### G14. [`config/cache.php`](apps/api-laravel/config/cache.php) — Failover configurado

```php
'failover' => ['stores' => ['database', 'array']],
```

Si la base de datos de cache falla, degrada a array. Correcto para alta disponibilidad.

---

## Análisis por Categoría

### 1. Calidad de Código
- **Laravel:** Los controladores tienen lógica de negocio (Dashboard, Settings). Falta extraer Actions.
- **NestJS:** Buena separación controller/service. Falta DTOs y validación de esquemas.
- **Ambos:** Duplicación del servicio de escaneo de facturas (Laravel `InvoiceVisionService` ≈ NestJS `InvoiceScannerService`).

### 2. Manejo de Errores
- **Laravel:** Bueno en SyncController (distingue 4 tipos de error). Regular en otros (try-catch genérico).
- **NestJS:** Bueno en InvoiceScannerService. Regular en AuthController (catch genérico con `error: any`).

### 3. Validación
- **Laravel:** Excelente en `SyncEventsRequest`. Regular en otros (validación inline en controladores).
- **NestJS:** Deficiente. La mayoría de endpoints usan `@Body() body: any` sin DTOs.

### 4. SQL / N+1
- **Laravel:** N+1 detectado en `SaasController::index()` y `SaasMetricsController::metrics()`.
- **NestJS:** Prisma maneja bien las relaciones, pero `SyncController::push()` hace `findFirst` por cada fila.

### 5. Transacciones
- **Laravel:** Correctas en `SyncEventProcessor` y `TenantRegistrationController`.
- **NestJS:** Correcta en `CustomersService::payDebt()`. Ausente en `SaasService::createStore()`.

### 6. Colas y Jobs
- **Laravel:** No se usan jobs. El scraping del BCV y el envío de emails son sincrónicos.
- **NestJS:** `BcvService` usa `@Cron` (scheduler), pero `EmailService` es sincrónico.

### 7. Logging
- **Laravel:** Niveles adecuados (info, warning, error). No se logea información sensible.
- **NestJS:** Logger de NestJS usado correctamente. `console.error` en TelegramService (L101) debería ser `this.logger.error`.

### 8. Caching
- **Laravel:** Solo se cachea la tasa BCV (2 horas). No hay cache para settings, items, o dashboard.
- **NestJS:** No implementa caching. Cada request a settings hace 2 queries (storeConfig + store).

### 9. Duplicación entre Backends
- Servicio de escaneo de facturas (duplicado).
- Lógica de settings (duplicada: Laravel `SettingsController` + NestJS `SettingsController`).
- Lógica de auth (duplicada: Laravel `AuthController` + NestJS `AuthController`).
- Lógica de SaaS (duplicada: Laravel `SaasController` + NestJS `SaasController`).

### 10. Tipado
- **Laravel:** Inconsistente. Algunos controladores tienen `: JsonResponse`, otros no. Falta `declare(strict_types=1)` en 7 archivos.
- **NestJS:** TypeScript estricto asumido, pero `any` usado extensivamente en bodies de requests.

### 11. Dependencias
- **Laravel:** Limpias. Solo `laravel/framework`, `sanctum`, `tinker`. Sin bloat.
- **NestJS:** `mysql2` instalado pero Prisma usa PostgreSQL. Dependencia innecesaria.

### 12. Idempotencia
- **Laravel:** Excelente. `ProcessedSyncEvent` con `wasProcessed()` antes de cada operación.
- **NestJS:** `SyncController::push()` implementa LWW (Last-Write-Wins) pero no tiene tabla de idempotencia. Si el mismo evento se envía dos veces, se procesa dos veces.

---

## Recomendaciones Prioritarias

| Prioridad | Acción | Archivo(s) |
|-----------|--------|------------|
| 🔴 C1 | Agrupar `orWhere` con paréntesis en login | [`AuthController.php:22`](apps/api-laravel/app/Http/Controllers/Api/AuthController.php:22) |
| 🔴 C2 | Usar `crypto.randomBytes` y `$transaction` en creación de store | [`saas.service.ts:34`](apps/api/src/saas/saas.service.ts:34) |
| 🟠 H1 | Extraer lógica de Dashboard a Action class | [`DashboardController.php`](apps/api-laravel/app/Http/Controllers/Api/DashboardController.php) |
| 🟠 H2 | Mover scraping BCV a Job asíncrono | [`SettingsController.php:116`](apps/api-laravel/app/Http/Controllers/Api/SettingsController.php:116) |
| 🟠 H5 | Implementar DTOs con class-validator en NestJS | [`sync.controller.ts`](apps/api/src/sync.controller.ts) |
| 🟠 H6 | Reemplazar `execSync` por validación asíncrona | [`telegram.module.ts:13`](apps/api/src/telegram/telegram.module.ts:13) |
| 🟠 H8 | Unificar PKs entre Laravel (UUID) y NestJS (Int) | [`schema.prisma`](apps/api/prisma/schema.prisma) |
| 🟡 M4 | Eager loading de usuarios en listado de tiendas | [`SaasController.php:18`](apps/api-laravel/app/Http/Controllers/Api/SaasController.php:18) |
| 🟡 M8 | Unificar servicio de escaneo de facturas | Ambos backends |
| 🟡 M12 | Cambiar default DB a MySQL/MariaDB | [`config/database.php:20`](apps/api-laravel/config/database.php:20) |

---

*Fin del reporte de auditoría de backend.*
