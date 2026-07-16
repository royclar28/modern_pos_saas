# Auditoría de Arquitectura y Funcionalidades — MERX POS

**Fecha:** 2026-07-14 | **Versión:** 1.0

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm Workspaces |
| Frontend | React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3 + Dexie.js 4 |
| Backend | Laravel 13 + PHP 8.4 + Sanctum (autenticación) |
| Base de Datos | PostgreSQL 16 (multi-tenant por `tenant_id`) |
| Desktop App | Tauri v2 (Windows/Mac/Linux) |
| Contenedores | Docker Compose (postgres, laravel, web) |
| PWA | vite-plugin-pwa + service worker |

---

## 2. Arquitectura del Sistema

```
FRONTEND (React + Vite)
  ├── PosPage → CartProvider (Reducer)
  ├── Dexie.js IndexedDB (ventas, items, cashShifts)
  ├── useSync() Outbox Drain → POST /api/sync/events
  └── Hidratación: GET /api/items, /customers

BACKEND (Laravel 13)
  ├── SyncController → SyncEventProcessor
  │   ├── Idempotencia (ProcessedSyncEvent)
  │   ├── Tenant Isolation (auth()->user())
  │   ├── Row-Level Lock (lockForUpdate)
  │   └── Match router por entity_type:action
  └── RBAC Middleware (SUPER_ADMIN > ADMIN > MANAGER > CASHIER)

DATABASE (PostgreSQL 16)
  └── Aislamiento Multi-Tenant: tenant_id en cada tabla
```

---

## 3. Flujo de Usuario

### 3.1 Registro y Onboarding
- LandingPage → RegisterPage → TenantRegistrationController
- Crea Store, usuario STORE_ADMIN, seed categorías, trial 30 días

### 3.2 Sincronización Inicial
- Login → useInitialSync().hydrateLocalDB()
- GET /api/items → DexieDB.items.bulkPut()

### 3.3 Flujo de Venta POS (Offline-First)
- Apertura de Caja → ShiftManagerModal
- Catálogo + búsqueda + código de barras
- Carrito (CartProvider Reducer): ADD, REMOVE, UPDATE_QTY, SET_DISCOUNT, CLEAR
- Checkout: simple, dividido, mixto, crédito (FIADO)
- Impresión ticket térmico (@media print, 80mm)
- Cierre de Caja con cuadre

### 3.4 Sincronización (useSync cada 5s)
- POST /api/sync/events → SyncController.processBatch()
- Idempotencia + tenant isolation + row-locking + transacciones atómicas

### 3.5 Administración
- /admin/inventory → CRUD productos, sellBy (unit/weight), categorías
- /admin/sales → Reporte Z (KPIs, arqueo, tabla transacciones)
- /admin/shifts → Historial de caja con paginación
- /admin/creditos → Fiados con abonos FIFO
- /admin/settings → IVA, moneda, tema, terminal

### 3.6 Super Admin
- /super-admin → Panel SaaS multi-tienda
- /master-dashboard → Métricas globales

---

## 4. Modelo de Datos

| Tabla | Campos Clave |
|---|---|
| stores | id, name, plan, trial_ends_at, status, is_active |
| users | id, tenant_id (FK), username, email, password, role, softDeletes |
| categories | id, tenant_id, name, sort_order, softDeletes |
| items | id, tenant_id, name, category, cost/unit_price, stock, sell_by (unit/weight), softDeletes |
| customers | id, tenant_id, first/last_name, phone, softDeletes |
| sales | id, tenant_id, sale_time, employee_id, subtotal, tax_amount, total, status, paid_amount, softDeletes |
| sale_items | id, tenant_id, sale_id, item_id, quantity_purchased, discount_percent, softDeletes |
| sale_payments | id, tenant_id, sale_id, amount, payment_method, paid_at |
| cash_shifts | id, tenant_id, user_id, opened/closed_at, starting/actual/expected_cash, difference |
| store_configs | id, tenant_id, key, value |
| processed_sync_events | event_id (PK), tenant_id, entity_type, action, entity_id, status |

---

## 5. Endpoints Principales

| Método | Endpoint | Roles |
|---|---|---|
| POST | /api/login | Público |
| POST | /api/register | Público |
| GET | /api/user | Todos |
| POST | /api/sync/events | Todos |
| GET | /api/items | Todos |
| GET | /api/customers | Todos |
| GET | /api/dashboard/summary | Todos |
| GET | /api/sales | ADMIN, MANAGER |
| POST | /api/inventory/scan-invoice | ADMIN, MANAGER |
| GET | /api/cash-shifts | ADMIN, MANAGER |
| PATCH | /api/settings | ADMIN |
| GET | /api/saas/stores | SUPER_ADMIN |
| GET | /api/saas/metrics | SUPER_ADMIN |

---

## 6. Deuda Técnica

### Crítica
1. Dual Backend: NestJS (`apps/api/`) aún existe como código muerto
2. Sin tests automatizados en frontend ni backend
3. Sin CI/CD completo
4. Sin observabilidad (logging estructurado, métricas)

### Alta
5. Sin resolución de conflictos en sync concurrente
6. JWT hardcodeado en NestJS legacy
7. Sin rate limiting en sync/events

### Media
8. README menciona RxDB pero el código usa Dexie.js
9. Paquete `pos-shared` vacío en workspace
