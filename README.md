# 🛒 Modern POS SaaS — MERX

> **Un sistema de Punto de Venta empresarial y Offline-First** — construido para ser confiable, rápido y adaptado a las operaciones comerciales modernas. La arquitectura "local-first" significa que tus cajeros pueden seguir vendiendo incluso si el internet se cae.

<div align="center">

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?style=for-the-badge&logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Sanctum](https://img.shields.io/badge/Sanctum-Auth-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![RxDB](https://img.shields.io/badge/RxDB-15-8D1F89?style=for-the-badge&logo=reactivex&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

</div>

---

## 📋 Tabla de Contenidos

- [Arquitectura y la Magia Offline-First](#-arquitectura-y-la-magia-offline-first)
- [Características (Features)](#-características-features)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Inicio Rápido (Docker)](#-inicio-rápido-con-docker)
- [Credenciales por Defecto](#-credenciales-por-defecto)
- [Rutas Disponibles](#-rutas-disponibles)
- [Base de Datos y Esquema](#-base-de-datos-y-esquema)
- [Tecnologías Usadas](#-tecnologías-usadas-tech-stack)
- [Roadmap](#-roadmap)

---

## 🏛️ Arquitectura y la Magia Offline-First

Este sistema está construido sobre una filosofía **local-first, sync-second**. A diferencia de las aplicaciones web tradicionales que se rompen en el momento en que se pierde la conexión, Modern POS SaaS mantiene tu negocio funcionando independientemente del estado de la red.

```
┌──────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cajero)                     │
│                                                          │
│  React UI  ──► CartProvider  ──► RxDB (IndexedDB)        │
│                  (Reducer)       ↑  ↓  BD Local           │
│                                  │  └── Lectura rápida    │
│                               useSync()                   │
│                           (Replicación Delta)             │
└─────────────────────────────┬────────────────────────────┘
                              │ HTTP (Sanctum Token)
                              │ sincroniza en 2do plano
                              │ solo si hay red
┌─────────────────────────────▼────────────────────────────┐
│              API Laravel 13  (puerto 8001)                │
│                                                          │
│  /api/login        ──► Sanctum Token (bcrypt)             │
│  /api/items        ──► Hidratación inicial offline        │
│  /api/sync/events  ──► Upsert por lotes (Outbox Drain)   │
│  /api/settings     ──► Configuración global de tienda     │
│  /api/settings/bcv ──► Tasa BCV (web scraping en vivo)    │
│  InvoiceVisionService ──► OCR de facturas con IA          │
│  RoleMiddleware    ──► RBAC por jerarquía de roles        │
└─────────────────────────────┬────────────────────────────┘
                              │ Eloquent ORM
┌─────────────────────────────▼────────────────────────────┐
│             PostgreSQL 16   (puerto 5434)                 │
│    User · Customer · Item · Sale · SaleItem               │
│    SalePayment · CashShift · Store · StoreConfig          │
│    ProcessedSyncEvent (idempotencia)                      │
└──────────────────────────────────────────────────────────┘
```

### ¿Cómo funciona en la práctica?

1. **Login una sola vez** — El navegador recibe un token de **Laravel Sanctum** (API Token personal). Todas las peticiones posteriores lo incluyen automáticamente como Bearer Token.
2. **Sincronización del catálogo** — Al inicio, `useInitialSync()` descarga los ítems, clientes y categorías del servidor a la base de datos **RxDB** local (respaldada por IndexedDB). Esto ocurre en segundo plano de forma transparente.
3. **Identidad Multi-Caja (Multi-Terminal)** — A cada caja o punto de venta físico se le asigna un `terminalId` único (ej. "CAJA_01") que se guarda en el `localStorage`.
4. **Ventas sin latencia (Cero Lag)** — Cuando un cajero pulsa **💳 COBRAR**, la venta se guarda *instantáneamente* en la base de datos local RxDB, estampada con su `terminalId` y con la tasa de impuestos (IVA) global vigente. **No hay peticiones API** en el momento crítico. La interfaz responde en milisegundos.
5. **Propagación automática (Outbox Pattern)** — El motor de replicación pone en cola los eventos de venta y los empuja a Laravel vía `/api/sync/events` en cuanto haya conectividad. El backend usa `ProcessedSyncEvent` para garantizar **idempotencia** — si el mismo evento se envía dos veces, se ignora.
6. **Reportes en tiempo real** — El Dashboard de Ventas (Reporte Z) se suscribe a las ventas locales de RxDB usando consultas reactivas (`$`). Los KPIs se actualizan en vivo en cuanto se confirma una venta en cualquier terminal, sin necesidad de recargar.

> **El resultado:** Un cajero puede procesar ventas todo su turno estando offline, cerrar el navegador, volver a conectarse luego, y cada venta será guardada de forma segura en PostgreSQL — automáticamente.

---

## ✨ Características (Features)

### 💰 Punto de Venta (Terminal POS)
- [x] Diseño de panel dividido: Catálogo de productos con búsqueda a la izquierda, y ticket en vivo a la derecha.
- [x] Agregar, quitar y ajustar cantidades con recálculo instantáneo de subtotales.
- [x] **IVA 16%** aplicado al subtotal del carrito (configurable desde Settings).
- [x] Soporte de descuentos por línea (0–100%).
- [x] Cobro en un clic — guarda en RxDB con cero latencia de red.
- [x] Modal de checkout con resumen completo de la venta.
- [x] Lectura de **código de barras** con hook `useBarcodeScanner`.

### 🖨️ Impresión de Tickets Térmicos
- [x] Diseño CSS `@media print` optimizado para **impresoras térmicas de 80mm**.
- [x] Lista de artículos con cantidades, precios unitarios y totales por renglón.
- [x] Desglose de Subtotal / IVA / Total.
- [x] Cabecera con marca de la tienda y fecha/hora.
- [x] Se dispara desde el modal posterior al cobro con un solo clic.

### 📦 Gestión de Inventario (Admin CRUD)
- [x] Crear / Leer / Actualizar / Eliminar para el catálogo de productos.
- [x] Campos: Nombre, Categoría, SKU, Descripción, Precio Costo, Precio Venta, Nivel de Reorden.
- [x] Búsqueda y filtrado en vivo por nombre, categoría y SKU.
- [x] Validación de formularios con **Zod** + **React Hook Form**.
- [x] Guarda de precios: el precio de venta debe ser ≥ al precio de costo.
- [x] **Escaneo inteligente de facturas con IA** (InvoiceVisionService) — Sube una foto de factura y el sistema extrae los ítems automáticamente.
- [x] Borrado lógico gestionado a través de una bandera `_deleted` de RxDB (sincronizada con el backend).

### 💵 Tasa BCV (Bolívar / Dólar)
- [x] Consulta automática de la tasa oficial del **Banco Central de Venezuela** mediante web scraping.
- [x] Endpoint público `/api/settings/bcv` para consultar la tasa vigente.
- [x] Sincronización manual disponible para ADMIN y MANAGER.
- [x] Hook `useBcv` en el frontend para mostrar precios en bolívares en tiempo real.

### 📊 Dashboard de Ventas (Reporte Z)
- [x] **Tarjetas de KPI reactivas** actualizadas en tiempo real desde RxDB:
  - 💰 Total Ingresos (suma de todos los campos `total`)
  - 🧾 Total Impuestos recaudados (`taxAmount`)
  - 🎫 Cantidad de tickets emitidos
  - 📈 Ticket Promedio
- [x] Tabla de transacciones completa: ID Ticket, Hora, Cantidad Artículos, Subtotal, IVA, Total.
- [x] Fila de totales en el pie de página por día.
- [x] **Filtro de fecha** (`<input type="date">`) — reejecuta la consulta local de RxDB para ver históricos.
- [x] Indicador "En Vivo" (badge) cuando se ven los datos del día de hoy.
- [x] Animaciones y estados de carga tipo "skeleton loader".

### 💳 Apertura y Cierre de Caja (Cash Shifts)
- [x] Registro de montos base (fondo de caja) al abrir turno.
- [x] Cierre de caja con cuadre de efectivo.
- [x] Modal `ShiftManagerModal` integrado en el POS.
- [x] Hook `useCashShift` para gestión de estado del turno activo.

### 📒 Cuaderno de Fiados
- [x] Gestión de créditos a clientes (fiados).
- [x] Página dedicada `/admin/fiados` para ADMIN y MANAGER.
- [x] Seguimiento de deudas pendientes por cliente.

### ⚙️ Ajustes Globales y Locales (Settings)
- [x] **Gestión Multi-Caja (Multi-Terminal)**: Define el nombre de la caja local y se guarda en el `localStorage` para rastrear qué ventas provienen de qué terminal.
- [x] **Configuración Global de Empresa**: Panel de administración para cambiar parámetros como el Impuesto (IVA), Moneda y Nombre de la Empresa.
- [x] **Propagación Dinámica**: Los cambios de configuración se actualizan de forma global en todos los terminales simultáneamente.
- [x] **Resiliencia Offline**: Los terminales usarán el último ajuste guardado o volverán a valores por defecto (16% IVA) si el servidor está caído al cobrar.
- [x] **Modo de Alta Visibilidad**: Hook `useHighVisibility` para optimizar la UI en pantallas difíciles.

### 🔐 Seguridad y Auth (RBAC)
- [x] Autenticación vía **Laravel Sanctum** (tokens de API personales).
- [x] Contraseñas encriptadas con **bcrypt** (hashing seguro nativo de Laravel).
- [x] **Control de Acceso Basado en Roles (RBAC)** con middleware `RoleMiddleware`.
- [x] Jerarquía de roles: `SUPER_ADMIN` > `ADMIN` > `MANAGER` > `CASHIER` (default).
- [x] `SUPER_ADMIN` **bypasses** todas las restricciones de rol (acceso SaaS root).
- [x] Rutas protegidas en React usando `<ProtectedRoute />` (auth) y `<RequireRole />` (RBAC).
- [x] Dashboard y Navbar ocultan opciones según el rol del usuario (CASHIER solo ve POS).
- [x] Flujo de **Recuperación de Contraseña** (`/forgot-password` → `/reset-password`).

#### Matriz de Permisos por Rol

| Recurso / Acción | CASHIER | MANAGER | ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|
| Punto de Venta (POS) | ✅ | ✅ | ✅ | ✅ |
| Sincronización / Ventas | ✅ | ✅ | ✅ | ✅ |
| Inventario (scan invoice) | ❌ | ✅ | ✅ | ✅ |
| Reportes (Reporte Z) | ❌ | ✅ | ✅ | ✅ |
| Fiados (créditos) | ❌ | ✅ | ✅ | ✅ |
| Sincronizar tasa BCV | ❌ | ✅ | ✅ | ✅ |
| Configuración (Settings) | ❌ | ❌ | ✅ | ✅ |
| Crear Usuarios | ❌ | ❌ | ✅ | ✅ |
| Panel SaaS (multi-tienda) | ❌ | ❌ | ❌ | ✅ |

### 🏗️ Infraestructura
- [x] Monorepo **Turborepo** usando espacios de trabajo `pnpm workspaces`.
- [x] Backend **Laravel 13** Dockerizado con PHP 8.4 y Composer.
- [x] Frontend **React + Vite** Dockerizado con hot-reload.
- [x] **PostgreSQL 16** como base de datos relacional.
- [x] Despliegue con **Docker Compose** (3 servicios: `postgres`, `laravel`, `web`).
- [x] Script `entrypoint.sh` con bootstrap automático (migraciones, scaffold, y arranque).
- [x] Script `deploy.sh` para despliegue en producción.
- [x] Soporte **PWA** (Progressive Web App) con íconos y `ReloadPrompt`.

---

## 📁 Estructura del Proyecto

```
modern_pos_saas/
├── apps/
│   ├── api-laravel/               # 🔴 Backend Laravel 13
│   │   ├── app/
│   │   │   ├── Http/
│   │   │   │   ├── Controllers/Api/
│   │   │   │   │   ├── AuthController.php        # Login + Sanctum Token
│   │   │   │   │   ├── SyncController.php         # Outbox drain (sync/events)
│   │   │   │   │   ├── SyncReadController.php     # Hidratación offline (items, customers, categories)
│   │   │   │   │   ├── SettingsController.php     # Config global + tasa BCV
│   │   │   │   │   ├── SaleController.php         # Historial de ventas
│   │   │   │   │   ├── InventoryController.php    # Scan invoice (IA)
│   │   │   │   │   ├── SaasController.php         # Multi-tienda (SUPER_ADMIN)
│   │   │   │   │   └── PasswordResetController.php
│   │   │   │   ├── Middleware/
│   │   │   │   │   └── RoleMiddleware.php         # RBAC por jerarquía
│   │   │   │   └── Requests/
│   │   │   ├── Models/
│   │   │   │   ├── User.php          # Roles + HasTenant trait
│   │   │   │   ├── Item.php          # Catálogo de productos
│   │   │   │   ├── Sale.php          # Venta (padre)
│   │   │   │   ├── SaleItem.php      # Renglones de venta
│   │   │   │   ├── SalePayment.php   # Pagos (efectivo, tarjeta, etc.)
│   │   │   │   ├── Customer.php      # Clientes
│   │   │   │   ├── CashShift.php     # Turnos de caja
│   │   │   │   ├── Store.php         # Tiendas (SaaS)
│   │   │   │   ├── StoreConfig.php   # Config llave-valor
│   │   │   │   └── ProcessedSyncEvent.php  # Idempotencia de sync
│   │   │   ├── Services/
│   │   │   │   ├── InvoiceVisionService.php  # OCR de facturas con IA
│   │   │   │   └── Sync/
│   │   │   │       └── SyncEventProcessor.php  # Motor de eventos
│   │   │   └── Exceptions/
│   │   ├── database/migrations/       # 14 migraciones ordenadas
│   │   ├── routes/api.php             # Definición de rutas API
│   │   ├── Dockerfile                 # PHP 8.4-cli + extensiones
│   │   ├── entrypoint.sh              # Bootstrap automático
│   │   └── deploy.sh                  # Script de producción
│   │
│   └── web/                           # 🔵 Frontend React (Vite + PWA)
│       └── src/
│           ├── contexts/
│           │   ├── AuthProvider.tsx       # Auth + Sanctum token
│           │   ├── CartProvider.tsx       # Estado del carrito (Reducer)
│           │   ├── SettingsProvider.tsx   # Config global reactiva
│           │   └── ThemeProvider.tsx      # Tema claro/oscuro
│           ├── db/
│           │   ├── outbox.ts             # Outbox pattern (sync queue)
│           │   ├── enqueueSyncEvent.ts   # Encolar eventos offline
│           │   └── schemas/              # RxDB schemas (sale, item, cashshift...)
│           ├── hooks/
│           │   ├── useInitialSync.ts      # Hidratación offline
│           │   ├── useBarcodeScanner.ts   # Lector de código de barras
│           │   ├── useBcv.ts             # Tasa BCV
│           │   ├── useCashShift.ts        # Turnos de caja
│           │   ├── useHighVisibility.ts   # Modo alta visibilidad
│           │   └── useInvoices.ts         # Facturas
│           ├── pages/
│           │   ├── PosPage.tsx            # 🛒 Terminal POS
│           │   ├── LoginPage.tsx          # 🔑 Login
│           │   ├── ForgotPassword.tsx     # Recuperar contraseña
│           │   ├── ResetPassword.tsx      # Restablecer contraseña
│           │   └── admin/
│           │       ├── InventoryPage.tsx      # 📦 CRUD Inventario
│           │       ├── SalesDashboard.tsx     # 📊 Reporte Z
│           │       ├── SettingsPage.tsx       # ⚙️ Configuraciones
│           │       ├── FiadosPage.tsx         # 📒 Cuaderno de fiados
│           │       └── SuperAdminPage.tsx     # 🏢 Panel SaaS Multi-Tienda
│           ├── components/
│           │   ├── CheckoutModal.tsx          # Modal de cobro
│           │   ├── InvoiceScannerModal.tsx    # Escáner de facturas (IA)
│           │   ├── ShiftManagerModal.tsx      # Apertura/cierre de caja
│           │   ├── RequireRole.tsx            # Guard RBAC
│           │   └── ReloadPrompt.tsx           # PWA update prompt
│           └── lib/
│               └── api.ts                # HTTP client centralizado
│
├── packages/
│   └── shared/                    # Tipos TypeScript compartidos
│
├── docker-compose.yml             # PostgreSQL + Web (Frontend)
├── docker-compose.laravel.yml     # Laravel Backend (API)
├── Dockerfile.dev                 # Imagen dev para el Frontend
├── ecosystem.config.js            # PM2 config (legacy NestJS)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 🚀 Inicio Rápido con Docker

> **Requisitos:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose v2). No necesitas PHP, Composer, ni instalar PostgreSQL localmente.

### 1. Clonar y configurar variables de entorno

```bash
git clone <tu-repo-url> modern_pos_saas
cd modern_pos_saas

# Copia los archivos preconfigurados de desarrollo
cp .env.example .env
cp apps/api-laravel/.env.example apps/api-laravel/.env
```

### 2. Levantar la Base de Datos y el Frontend

```bash
docker compose up -d
```

Esto arranca **PostgreSQL 16** y el **Frontend React/Vite**.

### 3. Levantar el Backend Laravel

```bash
docker compose -f docker-compose.laravel.yml up -d
```

El script `entrypoint.sh` ejecutará automáticamente:
1. `composer install` (dependencias PHP)
2. `php artisan key:generate` (si no existe `.env`)
3. `php artisan migrate --force` (migraciones)
4. `php artisan serve --host=0.0.0.0 --port=8000`

### 4. Ver los logs de arranque (opcional)

```bash
# Logs del backend Laravel
docker logs -f merx_pos_backend

# Logs del frontend
docker compose logs -f web
```

### 5. Acceder a la Aplicación

| Servicio | URL |
|---|---|
| 🖥️ **Frontend (React + Vite)** | http://localhost:5174 |
| ⚙️ **Backend API (Laravel)** | http://localhost:8001/api |
| 🐘 **PostgreSQL** | `localhost:5434` (Para conectarte mediante un gestor de BD) |

### Limpiar Contenedores

```bash
# Apagar sin borrar la base de datos
docker compose down
docker compose -f docker-compose.laravel.yml down

# Apagar Y borrar la base de datos (Reset Completo)
docker compose down -v
```

---

## 🔑 Credenciales por Defecto

| Campo | Valor |
|---|---|
| **Username** | `admin` |
| **Password** | `123456` |
| **Rol** | `SUPER_ADMIN` |
| **Email** | `admin@pos.com` |

---

## 🗺️ Rutas Disponibles

### Rutas del Frontend (React)

| Ruta | Módulo | Acceso (Roles) |
|---|---|---|
| `/login` | Auth | 🌐 Público |
| `/forgot-password` | Recuperar contraseña | 🌐 Público |
| `/reset-password` | Restablecer contraseña | 🌐 Público |
| `/` | Inicio (Dashboard) | 🔒 Todos (auth) |
| `/pos` | Terminal POS (Punto de Venta)| 🔒 Todos (auth) |
| `/admin/inventory` | CRUD de Inventario | 🔒 ADMIN, MANAGER |
| `/admin/sales` | Reporte Z Dashboard | 🔒 ADMIN, MANAGER |
| `/admin/fiados` | Cuaderno de Fiados | 🔒 ADMIN, MANAGER |
| `/admin/settings`| Multi-caja y Configuración| 🔒 Solo ADMIN |
| `/super-admin` | Panel SaaS Multi-Tienda | 🔒 Solo SUPER_ADMIN |

### Endpoints de API (Laravel)

#### 🌐 Rutas Públicas

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/login` | Otorga un token Sanctum. |
| `POST` | `/api/forgot-password` | Solicita email de recuperación. |
| `POST` | `/api/reset-password` | Restablece la contraseña. |
| `GET`  | `/api/settings/bcv` | Consulta la tasa BCV vigente. |

#### 🔒 Rutas Protegidas (Requieren Token Sanctum)

| Método | Endpoint | Roles | Descripción |
|---|---|---|---|
| `GET`  | `/api/user` | Todos | Perfil del usuario autenticado. |
| `POST` | `/api/sync/events` | Todos | Procesa lote de eventos de sync (Outbox). |
| `GET`  | `/api/items` | Todos | Hidratación de ítems para modo offline. |
| `GET`  | `/api/customers` | Todos | Hidratación de clientes. |
| `GET`  | `/api/categories` | Todos | Hidratación de categorías. |
| `GET`  | `/api/sales` | Todos | Historial de ventas. |
| `GET`  | `/api/settings` | Todos | Configuración global (IVA, moneda, etc.). |
| `POST` | `/api/inventory/scan-invoice` | ADMIN, MANAGER | Escanear factura con IA (OCR). |
| `POST` | `/api/settings/bcv/sync` | ADMIN, MANAGER | Forzar sincronización de tasa BCV. |
| `PATCH`| `/api/settings` | ADMIN | Actualizar configuración global. |
| `GET`  | `/api/saas/stores` | ADMIN | Listar tiendas (SaaS). |
| `POST` | `/api/saas/stores` | ADMIN | Crear nueva tienda. |
| `PATCH`| `/api/saas/stores/{id}/status` | ADMIN | Activar/desactivar tienda. |

---

## 🗄️ Base de Datos y Esquema

Los esquemas de PostgreSQL están manejados enteramente desde el código usando **Eloquent ORM** y las migraciones de **Laravel**. Los archivos en `database/migrations/` son la única fuente de la verdad.

### Modelos Nucleares

| Modelo | Campos Clave | Notas |
|---|---|---|
| `User` | `username`, `password`, `role`, `tenant_id` | Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `CASHIER` (default). Hashes bcrypt. Trait `HasTenant`. |
| `Store` | `name`, `slug`, `status` | Tiendas del sistema SaaS. Cada tienda aísla datos con `TenantScope`. |
| `Customer` | `first_name`, `last_name`, `document_id` | Clientes asociados a la tienda vía `tenant_id`. |
| `Item` | `name`, `category`, `cost_price`, `unit_price` | Sincronizado vía RxDB al frontend local para acceso offline. |
| `Sale` | `sale_time`, `employee_id`, `terminal_id` | El registro "Padre" de la transacción por caja (`terminal_id`). |
| `SaleItem` | `quantity_purchased`, `item_unit_price`, `discount_percent`| Los renglones asociados a la venta; se borran en cascada (Cascade). |
| `SalePayment` | `sale_id`, `method`, `amount` | Pagos asociados a cada venta (efectivo, tarjeta, etc.). |
| `CashShift` | `user_id`, `opened_at`, `closed_at` | Control de apertura/cierre de caja por turno. |
| `StoreConfig` | `key`, `value` | Almacenamiento tipo llave-valor para ajustes sistémicos (IVA, zona horaria, moneda, etc.). |
| `ProcessedSyncEvent` | `event_id`, `event_type`, `processed_at` | Tabla de idempotencia para evitar duplicados en la sincronización. |

> Todos los modelos incluyen `updated_at` (manejado por Eloquent de forma automática) y soporte para borrado lógico cuando aplica, de manera que funcionen bajo el protocolo de delta-sincronización de **RxDB**.

> 📊 Para más detalles a la hora de hacer minería y limpieza de datos, lee **[`dba_report.md`](./dba_report.md)** (para el equipo de Inteligencia de Negocios y DA).

---

## 🧰 Tecnologías Usadas (Tech Stack)

| Capa | Tecnología | Por qué |
|---|---|---|
| **Framework Backend** | Laravel 13 + PHP 8.4 | Ecosistema maduro, Eloquent ORM potente, y Sanctum para auth de API sin complejidad. |
| **Autenticación** | Laravel Sanctum | Tokens de API personales, ligero y sin la complejidad de OAuth. |
| **ORM** | Eloquent + Migraciones Laravel | Seguro de tipos, relaciones elegantes, y migraciones versionadas. |
| **Framework Frontend** | React 18 + Vite 5 | Hot-reload súper rápido, sin "Webpack hell". |
| **Lenguaje Frontend** | TypeScript 5 | Tipado estático para mayor confiabilidad en el frontend. |
| **Base de Datos Local** | RxDB 15 | Persistencia offline nativa, con motor de replicación transparente y consultas reactivas. |
| **Estilización** | Tailwind CSS v3 | CSS moderno con zero runtime. |
| **Formularios** | React Hook Form + Zod | Alta performance validando esquemas sin rerenders en masa. |
| **Base de Datos** | PostgreSQL 16 | ACID-compliant, segura para transacciones de cobro. |
| **Contenedores** | Docker Compose | Entorno reproducible para desarrollo y producción. |
| **Monorepo** | Turborepo + pnpm Workspaces | Tareas concurrentes y "caching" que acelera compilaciones. |
| **IA / OCR** | InvoiceVisionService | Escaneo inteligente de facturas para carga automática de inventario. |

---

## 🗺️ Roadmap

### ✅ Completado

- [x] **Migración de NestJS a Laravel** — Backend completamente reescrito en Laravel 13 con Sanctum.
- [x] **Sincronización Push de Ventas** — Outbox pattern con `ProcessedSyncEvent` para idempotencia.
- [x] **Apertura y Cierre de Caja** — Cash Shifts con fondos base y cuadre de efectivo.
- [x] **RBAC completo** — Jerarquía SUPER_ADMIN > ADMIN > MANAGER > CASHIER.
- [x] **Tasa BCV automática** — Web scraping en vivo del Banco Central de Venezuela.
- [x] **Cuaderno de Fiados** — Gestión de créditos a clientes.
- [x] **Escaneo de Facturas con IA** — OCR automático para carga de inventario.
- [x] **PWA** — Instalable como app nativa con íconos y prompt de actualización.
- [x] **Recuperación de Contraseña** — Flujo forgot → reset password.
- [x] **Multi-Tienda SaaS** — Panel SUPER_ADMIN para gestionar múltiples tiendas con aislamiento por `tenant_id`.

### 🔜 Próximos pasos

- [ ] **Tasas de IVA Personalizadas**: Permitir que ciertos artículos tengan tasas de IVA individuales más allá del default 16%.
- [ ] **Reportes Avanzados**: Gráficas de ventas por período, productos más vendidos, y análisis de margen.
- [ ] **Notificaciones Push**: Alertas de stock bajo, cierre de caja pendiente, etc.
- [ ] **Integración con métodos de pago electrónicos**: Pago móvil, Zelle, Binance Pay.

---

<div align="center">

**MERX POS** — Modern POS SaaS · Creado con ❤️ y Laravel + React

*"Cobra primero, sincroniza después."*

</div>
