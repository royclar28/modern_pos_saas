# 🛒 Modern POS SaaS

> **Un sistema de Punto de Venta empresarial y Offline-First** — construido para ser confiable, rápido y adaptado a las operaciones comerciales modernas. La arquitectura "local-first" significa que tus cajeros pueden seguir vendiendo incluso si el internet se cae.

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
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
│                    NAVEGADOR (Cajero)                    │
│                                                          │
│  React UI  ──► CartProvider  ──► RxDB (IndexedDB)       │
│                  (Reducer)       ↑  ↓  BD Local          │
│                                  │  └── Lectura rápida    │
│                               useSync()                  │
│                           (Replicación Delta)            │
└─────────────────────────────┬────────────────────────────┘
                              │ HTTP (JWT) — sincroniza en 
                              │ 2do plano solo si hay red
┌─────────────────────────────▼────────────────────────────┐
│                  API NestJS  (puerto 3333)               │
│                                                          │
│  /auth/login  ──► JWT (Expira 8h, Hash Argon2)           │
│  /items/sync  ──► Pull Delta (since=<updatedAt>)         │
│  /sync/push   ──► Upsert por lotes a PostgreSQL          │
└─────────────────────────────┬────────────────────────────┘
                              │ Prisma ORM
┌─────────────────────────────▼────────────────────────────┐
│             PostgreSQL 16   (puerto 5432)                │
│    Employee · Customer · Item · Sale · SaleItem          │
│                    StoreConfig                           │
└──────────────────────────────────────────────────────────┘
```

### ¿Cómo funciona en la práctica?

1. **Login una sola vez** — El navegador recibe un JWT (válido por 8 horas). Todas las peticiones posteriores lo incluyen automáticamente.
2. **Sincronización del catálogo** — Al inicio, `useSync()` descarga los últimos cambios del inventario (delta) del servidor a la base de datos **RxDB** local (respaldada por IndexedDB). Esto ocurre en segundo plano de forma transparente.
3. **Identidad Multi-Caja (Multi-Terminal)** — A cada caja o punto de venta físico se le asigna un `terminalId` único (ej. "CAJA_01") que se guarda en el `localStorage`.
4. **Ventas sin latencia (Cero Lag)** — Cuando un cajero pulsa **💳 COBRAR**, la venta se guarda *instantáneamente* en la base de datos local RxDB, estampada con su `terminalId` y con la tasa de impuestos (IVA) global vigente. **No hay peticiones API** en el momento crítico. La interfaz responde en milisegundos.
5. **Propagación automática** — El motor de replicación de RxDB pone en cola la nueva venta y la empuja a NestJS en cuanto haya conectividad. Si el internet está caído, reintentará automáticamente más tarde.
6. **Reportes en tiempo real** — El Dashboard de Ventas (Reporte Z) se suscribe a las ventas locales de RxDB usando consultas reactivas (`$`). Los KPIs se actualizan en vivo en cuanto se confirma una venta en cualquier terminal, sin necesidad de recargar o hacer "polling".

> **El resultado:** Un cajero puede procesar ventas todo su turno estando offline, cerrar el navegador, volver a conectarse luego, y cada venta será guardada de forma segura en PostgreSQL — automáticamente.

---

## ✨ Características (Features)

### 💰 Punto de Venta (Terminal POS)
- [x] Diseño de panel dividido: Catálogo de productos con búsqueda a la izquierda, y ticket en vivo a la derecha.
- [x] Agregar, quitar y ajustar cantidades con recálculo instantáneo de subtotales.
- [x] **IVA 16%** aplicado al subtotal del carrito.
- [x] Soporte de descuentos por línea (0–100%).
- [x] Cobro en un clic — guarda en RxDB con cero latencia de red.
- [x] Modal de éxito con resumen completo de la venta.

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
- [x] Borrado lógico gestionado a través de una bandera `_deleted` de RxDB (sincronizada con el backend).

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

### ⚙️ Ajustes Globales y Locales (Settings)
- [x] **Gestión Multi-Caja (Multi-Terminal)**: Define el nombre de la caja local (ej. "Caja Principal") y se guarda en el `localStorage` para rastrear qué ventas provienen de qué terminal.
- [x] **Configuración Global de Empresa**: Panel de administración para cambiar parámetros como el Impuesto (IVA), Moneda y Nombre de la Empresa mediante `PATCH /settings`.
- [x] **Propagación Dinámica**: Los cambios de configuración se actualizan de forma global en todos los terminales simultáneamente.
- [x] **Resiliencia Offline**: Los terminales usarán el último ajuste guardado o volverán a valores por defecto (16% IVA) de forma elegante si el servidor está caído al cobrar.

### 🔐 Seguridad y Auth
- [x] Autenticación JWT vía `@nestjs/jwt` + `passport-jwt`.
- [x] Contraseñas encriptadas con **Argon2id** (algoritmo moderno, protegido contra hardware/memoria).
- [x] Expiración de tokens de **8 horas** (alineado con un turno de cajero).
- [x] Sistema basado en roles: `SUPER_ADMIN` · `ADMIN` · `MANAGER` · `EMPLOYEE`.
- [x] Rutas protegidas en React usando el componente `ProtectedRoute`.

### 🏗️ Infraestructura
- [x] Monorepo **Turborepo** usando espacios de trabajo `pnpm workspaces`.
- [x] Entorno de desarrollo **Dockerizado** al 100% (con 3 servicios: postgres, api, web).
- [x] Automatizado: Prisma ejecuta migraciones y semilla (seed) de testeo en el arranque del contenedor.
- [x] Hot-reload listo (live-reload) tanto para NestJS (`--watch`) como para Vite (`--host 0.0.0.0`) dentro de los contenedores Docker.

---

## 📁 Estructura del Proyecto

```
modern_pos_saas/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/             
│   │   │   ├── schema.prisma   # Esquema final de base de datos
│   │   │   └── seed.ts         # User admin + StoreConfig
│   │   └── src/
│   │       ├── auth/           # Login JWT
│   │       ├── items/          # CRUD + /items/sync endpoint
│   │       ├── settings/       # Configs globales
│   │       ├── sync.controller.ts
│   │       └── main.ts
│   │
│   └── web/                    # Frontend React (Vite)
│       └── src/
│           ├── contexts/
│           │   ├── AuthProvider.tsx   
│           │   └── CartProvider.tsx   
│           ├── db/
│           │   ├── database.ts        # Singleton de RxDB 
│           │   └── schemas/           # sale.schema, item.schema...
│           ├── hooks/
│           │   ├── useItems.ts        # RxDB hooks
│           │   ├── useSync.ts         
│           │   ├── useSettings.ts     # Configs globales
│           │   └── useTerminal.ts     
│           ├── pages/
│           │   ├── PosPage.tsx        # 🛒 El Punto de Venta
│           │   ├── LoginPage.tsx
│           │   └── admin/
│           │       ├── InventoryPage.tsx  # 📦 CRUD Inventario
│           │       ├── SalesDashboard.tsx # 📊 Reporte Z
│           │       └── SettingsPage.tsx   # ⚙️ Configuraciones
│           └── components/
│               └── Receipt.tsx        # 🖨️ Plantilla térmica de impresión
│
├── packages/
│   └── shared/                 # Tipos TypeScript compartidos
│
├── docker-compose.yml
├── Dockerfile.dev
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 🚀 Inicio Rápido con Docker

> **Requisitos:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose v2). No necesitas Node, pnpm, ni instalar PostgreSQL localmente.

### 1. Clonar y configurar variables de entorno

```bash
git clone <tu-repo-url> modern_pos_saas
cd modern_pos_saas

# Copia los archivos preconfigurados de desarrollo
cp .env.example .env
```

> ⚠️ **Antes de continuar:** Abre `.env` y configura un `JWT_SECRET` fuerte si vas a usar esto en producción. El valor por defecto es inseguro.

### 2. Construir la imagen de Docker

```bash
docker compose build
```

Este paso creará una única imagen genérica útil tanto para el servicio `api` (Backend) como `web` (Frontend).

### 3. Lanzar todo el sistema

```bash
docker compose up -d
```

La secuencia de inicio es la siguiente:
1. **PostgreSQL 16** arranca.
2. **NestJS API** corre: `pnpm install` → `prisma generate` → `prisma migrate deploy` → `prisma db seed` → y finalmente `nest start --watch`.
3. **React / Vite** corre: `pnpm install` → `vite dev --host 0.0.0.0`.

### 4. Ver los logs de arranque (opcional)

```bash
# Ver ambos servicios
docker compose logs -f

# Mirar solo la API (útil para revisar si pasaron las migraciones y los seeds)
docker compose logs -f api
```

### 5. Acceder a la Aplicación

| Servicio | URL |
|---|---|
| 🖥️ **Frontend (React)** | http://localhost:5173 |
| ⚙️ **Backend API (NestJS)** | http://localhost:3333 |
| 🐘 **PostgreSQL** | `localhost:5432` (Para conectarte mediante un gestor de BD) |

### Limpiar Contenedores

```bash
# Apagar sin borrar la base de datos
docker compose down

# Apagar Y borrar la base de datos (Reset Completo)
docker compose down -v
```

---

## 🔑 Credenciales por Defecto

Estos usuarios se generan al volar en el `prisma/seed.ts` durante el primer arranque.

| Campo | Valor |
|---|---|
| **Username** | `admin` |
| **Password** | `123456` |
| **Rol** | `SUPER_ADMIN` |
| **Email** | `admin@pos.com` |

---

## 🗺️ Rutas Disponibles

| Ruta | Módulo | Acceso |
|---|---|---|
| `/login` | Auth | Público |
| `/` | Inicio (Dashboard) | 🔒 Autenticado |
| `/pos` | Terminal POS (Punto de Venta)| 🔒 Autenticado |
| `/admin/inventory` | CRUD de Inventario | 🔒 Autenticado |
| `/admin/sales` | Reporte Z Dashboard | 🔒 Autenticado |
| `/admin/settings`| Multi-caja y Configuración| 🔒 Autenticado |

### Puntos Finales de API (NestJS)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Otorga un token JWT. |
| `GET`  | `/items/sync?since=<ts>` | Descarga (pull) el delta actual de ítems (Gatillo de RxDB). |
| `POST` | `/sync/push` | Empuja cambios o ventas locales al servidor por lotes. |
| `GET`  | `/settings` | Obtiene configuraciones globales (ej. % de IVA). |
| `PATCH`| `/settings` | Actualiza configuraciones globales. |

---

## 🗄️ Base de Datos y Esquema

Los esquemas de PostgreSQL están manejados enteramente desde el código usando **Prisma**. El archivo `schema.prisma` es tu única fuente de la verdad.

### Modelos Nucleares

| Modelo | Campos Clave | Notas |
|---|---|---|
| `Employee` | `username`, `password`, `role` | `Role` enum: SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE. Hashes Argon2id. |
| `Customer` | `firstName`, `lastName`, `accountNumber` | Opcional, asociado posteriormente al recibo. |
| `Item` | `name`, `category`, `costPrice`, `unitPrice` | Sincronizado a través de RxDB al frontend local. |
| `Sale` | `saleTime`, `employeeId`, `terminalId` | El registro "Padre" de la transacción por caja (`terminalId`). |
| `SaleItem` | `quantityPurchased`, `itemUnitPrice`, `discountPercent`| Los renglones asociados a la venta; se borran en cascada si cae la venta (Cascade). |
| `StoreConfig` | `key`, `value` | Almacenamiento tipo llave-valor para ajustes sistémicos (IVA, zona horaria, moneda, etc.). |

> Todos los modelos incluyen `updatedAt` (manejado por Prisma de forma automática) y `deletedAt` (Soft-delete o Borrado lógico) de manera que funcionen bajo el protocolo de delta-sincronización de **RxDB**.

> 📊 Para más detalles a la hora de hacer minería y limpieza de datos, lee **[`dba_report.md`](./dba_report.md)** (para el equipo de Inteligencia de Negocios y DA).

---

## 🧰 Tecnologías Usadas (Tech Stack)

| Capa | Tecnología | Por qué |
|---|---|---|
| **Framework Frontend** | React 18 + Vite 5 | Hot-reload súper rápido, sin "Webpack hell". |
| **Lenguaje** | TypeScript 5 | Tipado estático y seguro en ambas puntas (Fullstack). |
| **Base de Datos Local** | RxDB 15 + Dexie | Persistencia offline nativa, con motor de replicación transparente y consultas reactivas. |
| **Estilización** | Tailwind CSS v3 | CSS moderno con zero runtime. |
| **Formularios** | React Hook Form + Zod | Alta performance validando esquemas sin rerenders en masa. |
| **Framework Backend** | NestJS 10 | Estilo modular con Inyección de Dependencias perfecto para backend escalable. |
| **ORM** | Prisma 5 | Seguro de tipos para el acceso a BD, con migraciones automáticas. |
| **Base de Datos** | PostgreSQL 16 | ACID-compliant, segura para transacciones de cobro. |
| **Autenticación** | JWT (8h) + Argon2id | Sesiones estables que resisten el offline; resiliencia contra hacks de hash. |
| **Estructura** | Turborepo + pnpm Workspaces | Tareas concurrentes y "caching" que acelera compilaciones. |

---

## 🗺️ Roadmap

Próximos pasos contemplados para los siguientes hitos:

- [ ] **Sincronización Push de Ventas**: Replicar realmente las ventas finalizadas (que ya viven en RxDB) de vuelta a PostgreSQL por la vía de `/sync/push`.
- [ ] **Tasas de IVA Personalizadas**: Permitir que ciertos artículos tengan tasas de interés o IVA individuales más allá del default "16%".
- [ ] **Asociación de Clientes**: Asignar tickets a Clientes o Empresas antes del Cobro.
- [ ] **Apertura y Cierre de Caja**: Registrar montos base (fondo de caja) de apertura, entradas o salidas de efectivo no asociadas a ventas, etc.
- [ ] **Múltiples Sucursales**: Agregar la capacidad de tener `TenantId` a nivel de API para separar negocios.

---

<div align="center">

**Modern POS SaaS** — MVP 1.0 · Creado con ❤️ y TypeScript

*"Cobra primero, sincroniza después."*

</div>
