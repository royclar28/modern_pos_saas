# 🧪 Auditoría de Experiencia de Usuario (UX) — Merx POS Frontend

**Fecha:** 2025-05-25  
**Auditor:** Frontend Specialist  
**Alcance:** `apps/web/src/` — React + TypeScript + TailwindCSS + Dexie.js + Tauri v2 + PWA  
**Propósito:** Evaluar la calidad UX del frontend del POS SaaS multi-tenant, orientado a cajeros en tiendas retail con operación offline-first.

---

## Resumen Ejecutivo

| Dimensión | Hallazgos | Estado General |
|-----------|-----------|----------------|
| Perceived Performance | 2 🟡, 1 🟢 | ✅ Bueno |
| Offline-First UX | 1 🔴, 2 🟠, 2 🟡 | 🟠 Regular |
| Responsive Design | 2 🟠, 3 🟡 | 🟡 Aceptable |
| Accesibilidad (a11y) | 1 🔴, 3 🟠, 2 🟡 | 🔴 Necesita atención |
| Error Handling UX | 1 🟠, 3 🟡 | 🟡 Aceptable |
| Loading & Empty States | 2 🟡, 2 🟢 | ✅ Bueno |
| Cashier Flow (POS) | 1 🟠, 2 🟡, 3 ✅ | ✅ Muy bueno |
| Tauri Desktop vs PWA | 2 🟠, 1 🟡 | 🟠 Regular |
| Themes & White-Label | 1 🟠, 1 🟡, 2 ✅ | ✅ Bueno |
| Navigation & Routing | 1 🟡, 2 ✅ | ✅ Bueno |
| Form Validation UX | 1 🟠, 2 🟡 | 🟡 Aceptable |

---

## 1. 🚀 Perceived Performance

### ✅ Correct: [`useLiveQuery`](apps/web/src/hooks/useItems.ts:12) — Reactividad instantánea desde IndexedDB
El hook [`useItems()`](apps/web/src/hooks/useItems.ts:12) usa `dexie-react-hooks` para suscripciones reactivas. Cero latencia de red para lecturas después de la hidratación inicial.

### ✅ Correct: [`enqueueSyncEventBatch`](apps/web/src/db/enqueueSyncEvent.ts:194) — Transacciones atómicas Dexie
El checkout usa [`enqueueSyncEventBatch()`](apps/web/src/db/enqueueSyncEvent.ts:194) para ejecutar SALE:CREATE + N x ITEM:ADJUST_STOCK en una sola transacción atómica. Si falla, todo se revierte. Excelente para consistencia offline.

### ✅ Correct: [`flushSync` en InvoiceScannerModal](apps/web/src/components/InvoiceScannerModal.tsx:28) — Spinner inmediato
Usa [`flushSync()`](apps/web/src/components/InvoiceScannerModal.tsx:28) para forzar render del spinner antes de la operación async. Detalle técnico fino que mejora la percepción.

### 🟡 Medium: [`useSync`](apps/web/src/hooks/useSync.ts:166) — Drain loop sin feedback visual de progreso
El loop de drenaje del outbox corre cada 5s silenciosamente. No hay indicador visual de "sincronizando..." o "X eventos pendientes". El usuario no sabe si los datos se están subiendo.

**Sugerencia:** Agregar un badge de contador de eventos pendientes en el header del POS o Dashboard.

### 🟡 Medium: [`useInitialSync`](apps/web/src/hooks/useInitialSync.ts:17) — Sin barra de progreso granular
El hook muestra `{ steps: 0, total: 3 }` pero no hay una barra de progreso visual en la UI. El usuario ve un spinner genérico sin saber qué está pasando.

**Sugerencia:** Exponer el progreso en un componente visual con labels ("Descargando productos...", "Descargando clientes...").

---

## 2. 📡 Offline-First UX

### 🔴 Critical: Sin indicador de conectividad persistente en el POS
El POS no muestra el estado actual de conexión (online/offline) de forma prominente. El [`useSync`](apps/web/src/hooks/useSync.ts:166) drena silenciosamente, pero si la red falla, el usuario no tiene retroalimentación inmediata. Solo hay un toast de error cuando se agotan los reintentos (10 intentos × 5s = 50s después).

**Sugerencia:** Agregar un badge "🟢 Online" / "🔴 Offline" persistente en el header del POS, actualizado via `navigator.onLine` + eventos `online`/`offline`.

### 🟠 High: [`useSync`](apps/web/src/hooks/useSync.ts:53) — Filtra eventos FAILED con retries restantes pero sin orden claro
La lógica de selección de eventos mezcla PENDING + FAILED y los ordena por `occurred_at`, pero no hay priorización por tipo de evento (ej. SALE debe sincronizarse antes que ITEM:UPDATE). En teoría, si hay muchos eventos de items, una venta podría retrasarse.

**Sugerencia:** Priorizar eventos SALE:CREATE sobre otros tipos en el drain loop.

### 🟠 High: [`useInitialSync`](apps/web/src/hooks/useInitialSync.ts:17) — Sin caché de última sincronización
No hay un timestamp de "última sincronización exitosa" visible para el usuario. Si la app se abre y la red está lenta, el usuario no sabe si los datos están actualizados.

**Sugerencia:** Mostrar "Última sincronización: hace X min" en el Dashboard.

### 🟡 Medium: [`SettingsProvider`](apps/web/src/contexts/SettingsProvider.tsx:66) — Fallback a defaults sin indicación visual
Cuando la API de settings no responde, el provider usa defaults silenciosamente (`console.warn`). El usuario no sabe que los settings mostrados son valores por defecto y no los reales del servidor.

**Sugerencia:** Agregar un badge "Usando valores locales — sin conexión al servidor" cuando `error` no es null.

### 🟡 Medium: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:124) — Sin validación de stock offline
El modal de checkout no verifica stock disponible antes de procesar. Si el stock local está desactualizado (porque otro terminal vendió mientras estaba offline), se puede generar una venta con stock negativo.

**Sugerencia:** Agregar verificación de stock local antes de confirmar, con advertencia si algún item tiene stock insuficiente.

---

## 3. 📱 Responsive Design

### 🟠 High: [`PosPage`](apps/web/src/pages/PosPage.tsx:438) — Layout de 2 columnas en desktop, colapsa bien en mobile
El POS tiene un layout de 2 columnas (productos | carrito) que en mobile colapsa a una sola columna con FAB para el carrito. **Bien implementado.** Sin embargo:

- En tablets en landscape (1024px), el carrito ocupa ~50% del ancho, dejando poco espacio para productos.
- Los botones de cantidad en [`CartRow`](apps/web/src/pages/PosPage.tsx:130) usan `touch-none` para evitar el teclado virtual en táctil, pero en tablets con teclado físico la experiencia es subóptima.

### 🟡 Medium: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:322) — Modal de 2 paneles en desktop, apilado en mobile
El modal usa `flex-col md:flex-row` para apilarse en mobile. Los botones de pago rápido (`$1, $5, $10, $20`) son pequeños en pantallas < 360px.

**Sugerencia:** Usar `grid-cols-2` en mobile para los botones de pago rápido.

### 🟡 Medium: [`SettingsPage`](apps/web/src/pages/admin/SettingsPage.tsx:234) — Formularios largos sin scroll指示
La página de settings tiene 3 secciones (Local, Global, Security) que en mobile requieren mucho scroll. No hay un índice o tabs para navegar entre secciones.

**Sugerencia:** Agregar sticky tabs laterales o un menú de navegación rápida entre secciones.

### 🟡 Medium: [`SalesDashboard`](apps/web/src/pages/admin/SalesDashboard.tsx:166) — Tabla de ventas con overflow-x auto
La tabla de transacciones usa `overflow-x-auto`, lo cual es correcto. Pero en mobile, las columnas son muchas (8) y el usuario debe hacer scroll horizontal constantemente.

**Sugerencia:** Implementar un modo "card view" en mobile similar a [`ShiftHistoryPage`](apps/web/src/pages/admin/ShiftHistoryPage.tsx:156) que ya lo hace bien.

---

## 4. ♿ Accesibilidad (a11y)

### 🔴 Critical: [`PosPage`](apps/web/src/pages/PosPage.tsx:269) — Sin roles ARIA ni landmarks semánticos
El POS no tiene `role="main"`, `role="navigation"`, `aria-label` en los botones de acción principales. Los botones del carrito, checkout, y búsqueda no tienen `aria-label`. Los lectores de pantalla no pueden navegar eficientemente.

**Sugerencia:** Agregar landmarks ARIA (`<main>`, `<nav>`) y `aria-label` en todos los botones sin texto visible.

### 🟠 High: [`ProductCard`](apps/web/src/pages/PosPage.tsx:61) — Sin `alt` text en emojis como iconos
Los emojis usados como iconos (💵, 📱, 💳, etc.) no tienen `role="img"` ni `aria-label`. Los lectores de pantalla leerán el nombre del emoji, pero en algunos casos es confuso.

**Sugerencia:** Envolver emojis decorativos en `<span aria-hidden="true">` y emojis informativos en `<span role="img" aria-label="...">`.

### 🟠 High: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:321) — Modal sin `role="dialog"` ni `aria-modal`
El modal de checkout es un `div` sin atributos ARIA de diálogo. Los lectores de pantalla no saben que es un modal y el foco no está atrapado dentro del modal.

**Sugerencia:** Agregar `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y manejar el foco con `focus-trap`.

### 🟠 High: Contraste de color en High Visibility Mode
El modo de alta visibilidad agranda la tipografía pero no hay garantía de contraste WCAG AA (4.5:1) en todos los temas. Los colores primarios dinámicos (vía CSS vars) podrían combinarse con fondos que no cumplen contraste.

**Sugerencia:** Validar que el modo HV siempre use colores de alto contraste (ej. texto negro sobre fondo amarillo, o blanco sobre negro).

### 🟡 Medium: [`Receipt`](apps/web/src/components/Receipt.tsx:4) — Ticket imprimible sin semántica
El componente de recibo usa `<table>` para el layout, lo cual es correcto para impresión térmica, pero no tiene `aria-label` en la tabla ni `scope` en los `<th>`.

**Sugerencia:** Agregar `scope="col"` en los `<th>` y un `aria-label="Resumen de venta"` en la tabla.

### 🟡 Medium: Sin skip-to-content link
No hay un enlace de "Saltar al contenido principal" al inicio de la página. Los usuarios de teclado deben tabular por todo el header antes de llegar al contenido.

**Sugerencia:** Agregar un `SkipLink` componente oculto que aparezca al recibir foco.

---

## 5. ⚠️ Error Handling UX

### 🟠 High: [`LoginPage`](apps/web/src/pages/LoginPage.tsx:52) — `alert()` con stack trace en error de red
Cuando falla la red en el login, se muestra `alert()` con el mensaje de error completo (incluyendo stack trace). Esto expone información técnica al usuario.

```typescript
// Línea ~80-90 en LoginPage.tsx
alert('Error de conexión: ' + err.message);
```

**Sugerencia:** Usar el sistema de toast inline para errores de red, con mensajes amigables ("No se pudo conectar con el servidor. Verifica tu conexión a internet.").

### 🟡 Medium: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:241) — `alert()` para referencia faltante
Cuando el usuario intenta pagar con Pago Móvil sin referencia, se usa `alert()` nativo del browser.

```typescript
if (paymentMethod === 'PAGO_MOVIL' && !reference.trim()) {
    alert('Referencia es requerida para Pago Móvil');
    return;
}
```

**Sugerencia:** Usar validación inline con mensaje de error debajo del campo de referencia.

### 🟡 Medium: [`InvoiceScannerModal`](apps/web/src/components/InvoiceScannerModal.tsx:63) — `alert()` como fallback de error
Si no se provee `onError`, el scanner usa `alert()`.

```typescript
if (onError) {
    onError(err.message || 'Error al procesar la factura. Intenta de nuevo.');
} else {
    alert(err.message || 'Error al procesar la factura. Intenta de nuevo.');
}
```

**Sugerencia:** Siempre proveer `onError` desde el caller, o usar un sistema de notificación global.

### 🟡 Medium: [`useSync`](apps/web/src/hooks/useSync.ts:139) — Toast de error solo tras 10 reintentos
El usuario no recibe feedback de errores de sincronización hasta que se agotan 10 reintentos (~50 segundos). Para entonces, puede haber múltiples eventos fallidos.

**Sugerencia:** Mostrar un toast más temprano (ej. tras 3 reintentos) con opción de "Reintentar ahora".

---

## 6. 🔄 Loading & Empty States

### ✅ Correct: [`SalesDashboard`](apps/web/src/pages/admin/SalesDashboard.tsx:309) — Skeleton loading para tabla de ventas
Usa `Array.from({ length: 5 })` para mostrar 5 filas de skeleton con animación `animate-pulse`. Excelente.

### ✅ Correct: [`ShiftHistoryPage`](apps/web/src/pages/admin/ShiftHistoryPage.tsx:183) — Skeleton loading + empty state + error state
La página maneja los 3 estados (loading, empty, error) con componentes visuales distintos. El empty state tiene un icono y mensaje amigable.

### ✅ Correct: [`FiadosPage`](apps/web/src/pages/admin/FiadosPage.tsx:282) — Empty state con icono
Muestra un mensaje "No hay deudas pendientes 🎉" cuando no hay créditos activos.

### 🟡 Medium: [`PosPage`](apps/web/src/pages/PosPage.tsx:478) — Empty state genérico para búsqueda sin resultados
Cuando la búsqueda de productos no encuentra resultados, muestra un mensaje genérico. No hay sugerencias de acciones (ej. "¿Quieres crear este producto?").

**Sugerencia:** Agregar un botón "Crear producto" en el empty state de búsqueda.

### 🟡 Medium: [`ProductsPage`](apps/web/src/pages/ProductsPage.tsx:112) — Loading state básico
Solo muestra un `<td>` con "Cargando..." sin skeleton. Comparado con otras páginas que tienen skeletons, esta se siente incompleta.

**Sugerencia:** Reemplazar con skeleton rows como en SalesDashboard.

---

## 7. 🛒 Cashier Flow (POS)

### ✅ Correct: [`PosPage`](apps/web/src/pages/PosPage.tsx:269) — Flujo completo de venta
El flujo es impecable:
1. Búsqueda por nombre o código de barras (F2 focus)
2. Escáner de código de barras con audio beep
3. Agregar al carrito con cantidad y descuento
4. Checkout modal con múltiples métodos de pago
5. Split payment (pago fraccionado)
6. Fiado (crédito) con selección de cliente
7. Success modal con opción de imprimir y nueva venta
8. Keyboard shortcuts (F2, F12, Esc, Enter)

### ✅ Correct: [`WeightInputModal`](apps/web/src/components/WeightInputModal.tsx:11) — Productos a granel
Modal dedicado para productos sell-by-weight con:
- Precio por Kg visible
- Input de peso con botones rápidos (0.25, 0.5, 1, 2 Kg)
- Estimación de total en tiempo real
- Atajo de teclado Enter/Escape

### ✅ Correct: [`ShiftManagerModal`](apps/web/src/components/ShiftManagerModal.tsx:25) — Gestión de turnos
Flujo completo de apertura/cierre de caja:
- Formulario de fondo de caja inicial
- Resumen de ventas del turno con desglose por método
- Corte Z con diferencia calculada
- Reporte de cierre con indicador visual (cuadrada/sobrante/faltante)

### 🟠 High: [`PosPage`](apps/web/src/pages/PosPage.tsx:363) — Sin confirmación de descarte de carrito
Si el usuario presiona Escape (que limpia el carrito), no hay confirmación. Un cajero podría accidentalmente borrar todo el carrito con productos ya escaneados.

**Sugerencia:** Agregar confirmación "¿Estás seguro de limpiar el carrito?" solo si hay items en el carrito.

### 🟡 Medium: [`PosPage`](apps/web/src/pages/PosPage.tsx:438) — Sin indicador de terminal activa en el POS
El header del POS muestra el nombre del cajero pero no el terminal ID ni el turno activo. El cajero debe abrir el ShiftManagerModal para verificar.

**Sugerencia:** Mostrar un badge "🟢 Turno Activo · CAJA_01" en el header del POS.

### 🟡 Medium: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:124) — Sin vista previa del recibo antes de confirmar
El usuario no puede ver el recibo completo antes de confirmar el pago. Solo ve el total y los items en el carrito.

**Sugerencia:** Agregar un botón "Ver recibo" en el modal que muestre una vista previa del ticket.

---

## 8. 🖥️ Tauri Desktop vs PWA Consistency

### 🟠 High: Sin detección de plataforma (Tauri vs PWA vs Web)
No hay código que diferencie entre la experiencia Tauri (nativa) y la PWA/web. Por ejemplo:
- En Tauri, se podría usar la API de sistema de archivos para guardar recibos PDF.
- En PWA, se podría usar la API de Share.
- En web, se podría ofrecer descarga directa.

**Sugerencia:** Crear un hook `usePlatform()` que detecte el entorno y adapte la UI.

### 🟠 High: [`WhatsAppButton`](apps/web/src/components/WhatsAppButton.tsx:28) — Sin integración Tauri deep link
El botón de WhatsApp abre `https://wa.me/...` en el navegador. En Tauri, esto abre el navegador externo, rompiendo la experiencia nativa. En PWA, abre el navegador o la app de WhatsApp si está instalada.

**Sugerencia:** Usar `tauri://` deep links o `window.open` con detección de plataforma.

### 🟡 Medium: Sin splash screen personalizada para Tauri
El `tauri.conf.json` no está configurado con splash screen. Al abrir la app de escritorio, hay un flash de pantalla blanca antes de que React cargue.

**Sugerencia:** Configurar splash screen en Tauri con el logo de Merx POS.

---

## 9. 🎨 Themes & White-Label (Multi-tenant)

### ✅ Correct: [`tailwind.config.js`](apps/web/tailwind.config.js:1) — CSS custom properties para colores primarios
```javascript
colors: {
    primary: {
        DEFAULT: 'var(--color-primary, #7C3AED)',
        hover: 'var(--color-primary-hover, #6D28D9)',
        light: 'var(--color-primary-light, #EDE9FE)',
    },
}
```
Excelente uso de CSS variables con fallback. Cada tenant puede tener su color primario.

### ✅ Correct: [`ThemeProvider`](apps/web/src/contexts/ThemeProvider.tsx:51) — Inyección de tema desde backend
El provider obtiene el `primaryColor` del endpoint `/settings` y lo inyecta como CSS custom properties. También genera variantes hover y light automáticamente vía HSL.

### 🟠 High: [`ThemeProvider`](apps/web/src/contexts/ThemeProvider.tsx:102) — Bloqueo de pantalla completa mientras carga el tema
```typescript
if (!themeReady) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
    );
}
```
El provider bloquea toda la app con un spinner hasta que el tema se carga. Si la API de settings es lenta, el usuario ve un spinner en blanco por segundos.

**Sugerencia:** Usar los valores por defecto inmediatamente y aplicar el tema de forma asíncrona sin bloqueo.

### 🟡 Medium: [`SettingsPage`](apps/web/src/pages/admin/SettingsPage.tsx:460) — Sin preview de color primario en modo oscuro
La paleta de colores y el selector personalizado se muestran, pero no hay preview de cómo se ve el color en modo oscuro. Un color que se ve bien en fondo blanco puede ser ilegible en fondo oscuro.

**Sugerencia:** Agregar un preview dividido (mitad claro, mitad oscuro) o un toggle de preview.

---

## 10. 🧭 Navigation & Routing

### ✅ Correct: [`App.tsx`](apps/web/src/App.tsx:299) — Estructura de rutas clara y protegida
Las rutas están bien organizadas:
- Públicas: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/`
- Protegidas: `/dashboard`, `/pos`, `/products`
- Admin con roles: `/admin/inventory`, `/admin/sales`, `/admin/settings`, etc.
- Super Admin: `/super-admin`, `/master-dashboard`

### ✅ Correct: [`ProtectedRoute`](apps/web/src/components/ProtectedRoute.tsx:4) + [`RequireRole`](apps/web/src/components/RequireRole.tsx:26) — Guards de autenticación y roles
Dos capas de protección: autenticación (token) y roles (RBAC). El `RequireRole` redirige a `/pos` si no tiene permisos.

### 🟡 Medium: Sin breadcrumbs ni indicador de ubicación actual
No hay breadcrumbs ni indicación visual de dónde está el usuario en la jerarquía de navegación. El usuario debe memorizar la estructura.

**Sugerencia:** Agregar breadcrumbs dinámicos en páginas admin (ej. "Dashboard > Inventario > Productos").

---

## 11. 📝 Form Validation UX

### 🟠 High: [`RegisterPage`](apps/web/src/pages/RegisterPage.tsx:44) — Validación manual sin librería
La página de registro usa validación manual con `if/else` en lugar de `react-hook-form` + `zod` (como sí usa LoginPage). Esto es inconsistente y más propenso a errores.

```typescript
const validate = () => {
    if (!form.first_name.trim()) { showToast('El nombre es obligatorio', 'error'); return false; }
    if (!form.last_name.trim()) { showToast('El apellido es obligatorio', 'error'); return false; }
    // ... más validaciones manuales
};
```

**Sugerencia:** Refactorizar RegisterPage para usar `react-hook-form` + `zod` como LoginPage.

### 🟡 Medium: [`ForgotPassword`](apps/web/src/pages/ForgotPassword.tsx:9) — Validación básica sin feedback inline
El formulario de forgot-password solo valida que el email no esté vacío. No hay validación de formato de email ni feedback inline.

**Sugerencia:** Agregar validación de formato de email con mensaje inline.

### 🟡 Medium: [`SettingsPage`](apps/web/src/pages/admin/SettingsPage.tsx:150) — Sin validación en campos numéricos
Los campos de tasa de IVA y tipo de cambio aceptan cualquier texto. No hay validación de que sean números positivos.

**Sugerencia:** Usar `type="number"` con `min="0"` y validación adicional.

---

## 12. 🔍 Hallazgos Adicionales

### 🟠 High: [`CheckoutModal`](apps/web/src/components/CheckoutModal.tsx:124) — Split payment sin límite de pagos
El sistema de split payment permite agregar pagos ilimitados. Un cajero podría agregar 50 pagos de $0.01, causando problemas de rendimiento y sync.

**Sugerencia:** Limitar a máximo 10 pagos por transacción.

### 🟡 Medium: [`PosPage`](apps/web/src/pages/PosPage.tsx:695) — CSS-in-JS inline en el componente
```typescript
<style dangerouslySetInnerHTML={{__html: `...`}} />
```
Hay CSS inline en el componente POS. Esto no escala bien y mezcla estilos con lógica.

**Sugerencia:** Mover estilos personalizados a `index.css` o un archivo CSS dedicado.

### 🟡 Medium: [`Receipt`](apps/web/src/components/Receipt.tsx:15) — Nombre de tienda hardcodeado
```typescript
<h2 className="text-xl font-bold uppercase mb-1">Boutique Femenina</h2>
```
El nombre de la tienda en el recibo está hardcodeado como "Boutique Femenina". Debería venir de `SettingsProvider`.

**Sugerencia:** Pasar `company` como prop desde el caller, obtenido de `useSettingsContext()`.

### 🟢 Low: [`useBcv`](apps/web/src/hooks/useBcv.ts:9) — Sin refetch periódico
La tasa BCV se obtiene una sola vez al montar el componente. Si el POS está abierto por horas, la tasa queda desactualizada.

**Sugerencia:** Agregar refetch cada 30 minutos o un botón "Actualizar tasa".

---

## Resumen de Prioridades

### 🔴 Crítico (Corregir ASAP)
1. **Sin roles ARIA ni landmarks en POS** — Afecta a usuarios de lectores de pantalla
2. **Sin indicador de conectividad persistente** — El usuario no sabe si está offline

### 🟠 Alto (Corregir pronto)
1. **`alert()` con stack trace en LoginPage** — Mala UX y fuga de información
2. **ThemeProvider bloquea toda la app** — Spinner hasta que carga settings
3. **Sin detección de plataforma Tauri vs PWA** — Experiencias inconsistentes
4. **Validación manual en RegisterPage** — Inconsistente con LoginPage
5. **Sin confirmación de descarte de carrito** — Riesgo de pérdida accidental
6. **Split payment sin límite** — Potencial problema de rendimiento
7. **Contraste de color en HV mode** — Posible incumplimiento WCAG

### 🟡 Medio (Mejorar)
1. Sin feedback visual de progreso de sync
2. Sin breadcrumbs de navegación
3. Sin preview de recibo antes de confirmar
4. Sin barra de progreso en initial sync
5. Nombre de tienda hardcodeado en Receipt
6. Sin refetch periódico de tasa BCV
7. CSS-in-JS inline en PosPage
8. Sin indicador de terminal activa en POS header

### 🟢 Bajo (Futuras iteraciones)
1. Sin splash screen de Tauri
2. Sin caché de última sincronización
3. Sin skip-to-content link

---

*Auditoría generada el 2025-05-25. Basada en revisión de código fuente de `apps/web/src/`.*
