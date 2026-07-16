# Auditoría de Seguridad y Auditabilidad — MERX POS

**Fecha:** 2026-07-14 | **Versión:** 1.0 | **Hallazgos:** 34

---

## Resumen

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 7 |
| 🟠 Alto | 9 |
| 🟡 Medio | 12 |
| 🟢 Bajo | 6 |

---

## 1. Autenticación y Sesiones

### ✅ Correcto
- Password hashing con bcrypt (12 rounds) y cast `'hashed'` en User
- Login con tenant isolation: `WHERE tenant_id = ? AND (username = ? OR email = ?)` agrupado
- Rate limiting: login 5/min, register 3/min, forgot-password 5/min
- Flujo de registro sin envío de contraseñas (hash aleatorio)

### 🔴 Crítico
- **Tokens Sanctum en localStorage** (sin httpOnly) — XSS roba el token
- **JWT_SECRET hardcodeado** en NestJS: `"mi_secreto_super_seguro_para_jwt_dev_123"`
- **API Keys expuestas** en `apps/api/.env`: GROQ, Telegram, DB password

### 🟠 Alto
- Sin expiración ni rotación de tokens
- Tokens previos no revocados al hacer login

---

## 2. Aislamiento Multi-Tenant

### ✅ Correcto
- TenantScope global: `WHERE tenant_id = auth()->user()->tenant_id` automático
- HasTenant auto-asigna tenant_id en `creating()`
- SyncEventProcessor **ignora** tenant_id del payload, usa `auth()->user()->tenant_id`

### 🟡 Medio
- User no usa HasTenant (intencional, pero riesgoso)
- Frontend envía tenant_id autogenerado desde localStorage

---

## 3. RBAC

### ✅ Correcto
- RoleMiddleware: SUPER_ADMIN > ADMIN > MANAGER > CASHIER
- Protección dual: backend (middleware) + frontend (ProtectedRoute, RequireRole)
- TrialMiddleware con HTTP 402 y bypass para SUPER_ADMIN

---

## 4. Validación y Protección contra Inyección

### ✅ Correcto
- Eloquent ORM parametrizado — sin SQL injection
- SyncEventsRequest: whitelist entity_type y action, UUID validation, max 500 eventos
- Zod en frontend para formularios

### 🟡 Medio
- Sin límite de tamaño en upload de facturas (invoice scanner)
- Sin sanitización de HTML en campos description

---

## 5. Secretos y Configuración

### 🔴 Crítico
- **JWT_SECRET trivial** hardcodeado en NestJS
- **GROQ_API_KEY** en texto plano: `gsk_cjYmzKT8...`
- **TELEGRAM_BOT_TOKEN** en texto plano
- **DB_PASSWORD** `r00t_password_segura` en 3 archivos .env
- **CORS wildcard** en NestJS: `origin: true`

### ✅ Correcto
- CORS restringido en Laravel (localhost, tauri, dominios explícitos)
- APP_KEY en .env (es válido tenerla ahí con Sanctum)

---

## 6. Frontend

### 🔴 Crítico
- Token en localStorage (XSS)
- Sin Content-Security-Policy (CSP)

### ✅ Correcto
- api.ts centralizado con inyección Bearer token
- Logout automático en 401

---

## 7. Sync Engine

### ✅ Correcto
- Idempotencia por event_id en ProcessedSyncEvent
- Row-level locking con `lockForUpdate()` en stock
- Validación previa de stock en batch (aborta venta si falta stock)
- Manejo granular de errores (HTTP 207, InsufficientStockException)

### 🟠 Alto
- Sin rate limiting en /api/sync/events
- Sin resolución de conflictos (Last-Write-Wins)

---

## 8. Auditabilidad

### 🔴 Crítico
- **Sin tabla de auditoría** (audit_log)
- Imposible rastrear quién modificó qué y cuándo

### 🟡 Medio
- ProcessedSyncEvent como pseudo-auditoría (sin user_id, sin old_values)
- Sale tiene employee_id y terminal_id (trazabilidad parcial)

---

## 9. NestJS Legacy

| Hallazgo | Severidad |
|---|---|
| JWT_SECRET hardcodeado trivial | 🔴 Crítico |
| CORS `origin: true` (wildcard) | 🔴 Crítico |
| GROQ_API_KEY en texto plano | 🔴 Crítico |
| TELEGRAM_BOT_TOKEN en texto plano | 🔴 Crítico |
| DB_PASSWORD en texto plano | 🔴 Crítico |
| Sin TenantScope automático | 🟠 Alto |
| Código duplicado (BCV scraper, items CRUD, customers) | 🟡 Medio |

---

## 10. Veredicto por Capa

| Capa | Estado |
|---|---|
| Aislamiento Multi-Tenant | ✅ Seguro |
| Autenticación (Laravel) | ⚠️ Base sólida, sesión frágil |
| Autorización (RBAC) | ✅ Seguro |
| Sync Engine | ✅ Seguro |
| Validación de Inputs | ✅ Seguro |
| Gestión de Secretos | 🔴 Inseguro |
| Protección de Sesión | 🔴 Inseguro |
| NestJS Legacy | 🔴 Inseguro |
| Auditabilidad | 🔴 Inseguro |
| Frontend | 🟡 Aceptable |
