# Auditoría UX, Componentes Aislados y Cuellos de Botella — MERX POS

**Fecha:** 2026-07-14 | **Versión:** 1.0 | **Hallazgos:** 20

---

## Resumen

| Severidad | Cantidad |
|---|---|
| 🔴 Bloqueante UX | 5 |
| 🟠 Alto | 7 |
| 🟡 Medio | 8 |
| 🟢 Bajo | 5 |

---

## 1. Dashboard — Vacío

### 🔴 BLOQUEANTE
- **Sin KPIs**: Solo tarjetas de navegación, cero métricas de negocio
- **Fiados invisibles**: Sin indicador de deuda total, sin abonos del día
- El endpoint `/api/dashboard/summary` YA EXPONE métricas pero nadie las consume en el frontend

---

## 2. Fiados/Créditos

### ✅ Correcto
- Registro de abonos con algoritmo FIFO
- Botones rápidos (25%, 50%, 100%) en modal de abono

### 🟠 Alto
- **Abonos no visibles** en Dashboard ni Reporte Z
- **Tabla FIADO ausente** en SalesDashboard (arqueo)
- **Cierre de caja ignora abonos**: `expectedCash` no suma abonos del turno
- **SALE_PAYMENT:UPDATE sin handler backend**: frontend envía UPDATE pero el match solo tiene CREATE

---

## 3. Reporte Z (SalesDashboard)

### ✅ Correcto
- KPIs por método de pago (Gaveta Dólares, Bolívares, Bancos Digital)
- Tabla de transacciones completa

### 🟡 Medio
- Sin columna de estado FIADO/PAGADO en la tabla
- Sin exportación de reportes (CSV/PDF)
- Sin filtro por método de pago o empleado
- Sin breadcrumbs

---

## 4. Punto de Venta (POS)

### 🔴 BLOQUEANTE
- **Sin opción de ANULAR/VOID venta**
- **Sin reimpresión de tickets antiguos**

### 🟠 Alto
- Sin búsqueda de cliente en checkout normal (solo FIADO)

### 🟡 Medio
- WeightInputModal aislado sin indicador visual de venta por peso en ProductCard
- Sin búsqueda avanzada (rango precio, categoría, favoritos)
- Atajos de teclado no documentados visualmente

---

## 5. Componentes Aislados

### 🟠 Alto
- **SmartInventoryReceive** (escáner IA de facturas) sin integración con flujo POS
- **Sin página de gestión de clientes** — solo creados desde checkout FIADO

### 🟡 Medio
- SettingsPage mezcla ajustes locales (tema) con globales (IVA)
- ShiftHistoryPage usa api.get() pero FiadosPage usa fetch() directo

---

## 6. Cuellos de Botella

### 🟠 Alto
- **Sync secuencial con foreach**: cada evento abre transacción DB independiente
- Con 10 terminales sincronizando cada 5s, contención de locks

### 🟡 Medio
- **Hidratación inicial descarga TODOS los items** sin paginación
- Dexie liveQuery en SalesDashboard sin límite (1000+ filas)
- CartProvider recalcula totales en cada render

---

## 7. Consistencia Visual

### 🟡 Medio
- **Headers inconsistentes** entre 6 páginas (Dashboard, POS, Fiados, Sales, Shifts, Settings)
- Sin componente AppHeader reutilizable
- Sin breadcrumbs ni navegación contextual
- SalesDashboard → Fiados: sin link | POS → Fiados: sin link

---

## 8. Mapeo: Funcionalidad ↔ Visibilidad

| Funcionalidad | ¿Existe? | Dashboard | Reporte Z | POS |
|---|---|---|---|---|
| Ventas efectivo | ✅ | ❌ | ✅ | ✅ |
| Ventas Pago Móvil | ✅ | ❌ | ✅ | ✅ |
| Ventas Punto | ✅ | ❌ | ✅ | ✅ |
| **Ventas FIADO** | ✅ | ❌ | ❌ | ✅ |
| **Abonos a Fiados** | ✅ | ❌ | ❌ | ❌ |
| **Deuda total clientes** | ✅ | ❌ | ❌ | ❌ |
| Cierres de caja | ✅ | Solo link | ❌ | Botón |
| Inventario bajo | ✅ Backend | ❌ | ❌ | ❌ |

---

## 9. Recomendaciones Priorizadas

### Sprint 1 (Inmediato)
1. Rediseñar Dashboard con KPIs del endpoint `/api/dashboard/summary`
2. Agregar FIADO al Reporte Z
3. Agregar abonos al cálculo de cierre de caja
4. Verificar handler backend para SALE_PAYMENT:UPDATE

### Sprint 2
5. Crear página de Clientes (CRUD + historial + deuda)
6. Agregar reimpresión de tickets desde SalesDashboard
7. Agregar anulación de ventas (VOID)
8. Unificar headers con AppHeader

### Sprint 3
9. Paginación en hidratación inicial de items
10. Exportación CSV de reportes
11. Integrar SmartInventoryReceive en flujo POS
12. Filtros avanzados en buscador POS
