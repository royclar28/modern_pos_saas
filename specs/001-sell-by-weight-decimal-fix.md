# Spec: Venta por Peso/Unidad + Fix Decimales + Categorías por Defecto

**Versión:** 1.0  
**Stack:** Laravel 12 (Backend) + React/Dexie (Frontend Offline-First)  
**Fecha:** 2026-05-12

---

## 1. Diagnóstico del Bug de Decimales

### 1.1 Causa raíz

| Archivo | Línea | Problema |
|---------|-------|----------|
| [`database/migrations/0001_01_01_000004_create_items_table.php`](apps/api-laravel/database/migrations/0001_01_01_000004_create_items_table.php:22) | 22 | `$table->integer('receiving_quantity')->default(1)` → columna `INTEGER`, trunca decimales |
| [`app/Models/Item.php`](apps/api-laravel/app/Models/Item.php:32) | 32-43 | `$casts` NO incluye `receiving_quantity` → Eloquent no convierte el tipo |

Cuando el frontend envía `receivingQuantity: 5.5`, el SyncEventProcessor lo persiste con `(int) 5.5 = 5` o peor aún, si el valor es `0.5` se trunca a `0` y luego el default de DB lo pone en `1`.

El campo `stock` (decimal) sí está bien migrado y casteado, pero `receiving_quantity` se usa como sinónimo de stock en el frontend (InventoryPage, PosPage, CartProvider), creando inconsistencia.

### 1.2 Solución

1. Nueva migración que cambia `receiving_quantity` de `integer` a `decimal(15,2)`
2. Agregar cast `'receiving_quantity' => 'decimal:2'` en Item.php
3. El frontend ya usa `type="number" step="any"` en varios inputs — verificar consistencia

---

## 2. Cambios en Backend (Laravel)

### 2.1 Nueva Migración: `sell_by` + Fix `receiving_quantity`

**Archivo:** `database/migrations/2026_05_12_200000_add_sell_by_and_fix_receiving_qty.php`

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregar columna sell_by (cómo se vende el producto)
        Schema::table('items', function (Blueprint $table) {
            $table->string('sell_by', 10)->default('unit')->after('is_serialized');
            // valores: 'unit' | 'weight'
            $table->index(['tenant_id', 'sell_by']);
        });

        // 2. Corregir receiving_quantity: integer → decimal
        // Postgres no permite ALTER COLUMN TYPE directo si hay datos,
        // usamos USING explícito (el cast es seguro de int a decimal)
        DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity TYPE DECIMAL(15,2)');
        DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity SET DEFAULT 1');
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'sell_by']);
            $table->dropColumn('sell_by');
        });

        // Revertir a integer (puede perder precisión si hay decimales > 0)
        DB::statement('ALTER TABLE items ALTER COLUMN receiving_quantity TYPE INTEGER USING (receiving_quantity::INTEGER)');
    }
};
```

### 2.2 Modelo Item.php — Agregar casts y fillable

**Archivo:** `app/Models/Item.php`

Reemplazar el array `$fillable` y método `casts()`:

```php
protected $fillable = [
    'id',
    'tenant_id',
    'name',
    'category',
    'item_number',
    'description',
    'cost_price',
    'unit_price',
    'stock',
    'reorder_level',
    'min_stock_alert',
    'receiving_quantity',
    'allow_alt_description',
    'is_serialized',
    'sell_by',            // ← NUEVO
];

protected function casts(): array
{
    return [
        'cost_price'            => 'decimal:2',
        'unit_price'            => 'decimal:2',
        'stock'                 => 'decimal:2',
        'reorder_level'         => 'decimal:2',
        'min_stock_alert'       => 'decimal:2',
        'receiving_quantity'    => 'decimal:2',  // ← CORRECCIÓN DEL BUG
        'allow_alt_description' => 'boolean',
        'is_serialized'         => 'boolean',
    ];
}
```

### 2.3 Migración: Tabla `categories` (tenant-scoped)

**Archivo:** `database/migrations/2026_05_12_200001_create_categories_table.php`

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 100);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->unique(['tenant_id', 'name']);
            $table->index(['tenant_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
```

### 2.4 Modelo Category.php

**Archivo:** `app/Models/Category.php`

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}
```

### 2.5 TenantRegistrationController — Seedear categorías al crear tienda

**Archivo:** `app/Http/Controllers/Api/TenantRegistrationController.php`

Modificar el método `register()`. Dentro de la transacción `DB::transaction()`, después de crear la tienda, insertar categorías por defecto:

```php
public function register(Request $request): JsonResponse
{
    $request->validate([
        'store_name' => 'required|string|max:255',
        'username'   => 'required|string|max:50|alpha_dash|unique:users,username',
        'email'      => 'required|email|max:255|unique:users,email',
        'password'   => 'required|string|min:8|confirmed',
        'first_name' => 'required|string|max:100',
        'last_name'  => 'nullable|string|max:100',
    ]);

    $user = DB::transaction(function () use ($request) {

        // ── 1. Crear el Tenant (Store) con trial de 30 días ───────────
        $store = Store::create([
            'id'            => Str::uuid()->toString(),
            'name'          => $request->store_name,
            'owner_email'   => $request->email,
            'plan'          => 'TRIAL',
            'is_active'     => true,
            'trial_ends_at' => Carbon::now()->addDays(30),
            'status'        => 'active',
        ]);

        // ── 1.1 Seed de categorías por defecto ───────────────────────
        $defaultCategories = [
            ['name' => 'Lácteos',   'sort_order' => 1],
            ['name' => 'Bebidas',   'sort_order' => 2],
            ['name' => 'Víveres',   'sort_order' => 3],
            ['name' => 'Otros',     'sort_order' => 4],
        ];

        foreach ($defaultCategories as $cat) {
            \App\Models\Category::create([
                'id'         => Str::uuid()->toString(),
                'tenant_id'  => $store->id,
                'name'       => $cat['name'],
                'sort_order' => $cat['sort_order'],
            ]);
        }

        // ── 2. Crear el usuario STORE_ADMIN ───────────────────────────
        $user = User::create([ /* ... igual que antes ... */ ]);

        return $user;
    });

    // ── 3. Emitir token (sin cambios) ────────────────────────────────
    // ...
}
```

### 2.6 SyncEventProcessor — Handler de ITEM:CREATE/UPDATE con `sell_by`

**Archivo:** `app/Services/Sync/SyncEventProcessor.php`

Modificar `handleItemCreate` (línea 291-311) para incluir `sell_by`:

```php
private function handleItemCreate(array $event): void
{
    $p = $event['payload'];

    Item::create([
        'id'                   => $p['id'],
        'tenant_id'            => $event['tenant_id'],
        'name'                 => $p['name'],
        'category'             => $p['category'],
        'item_number'          => $p['itemNumber'] ?? null,
        'description'          => $p['description'] ?? null,
        'cost_price'           => $p['costPrice'] ?? 0,
        'unit_price'           => $p['unitPrice'] ?? 0,
        'stock'                => $p['stock'] ?? 0,
        'reorder_level'        => $p['reorderLevel'] ?? 0,
        'min_stock_alert'      => $p['minStockAlert'] ?? null,
        'receiving_quantity'   => $p['receivingQuantity'] ?? 1,
        'allow_alt_description'=> $p['allowAltDescription'] ?? false,
        'is_serialized'        => $p['isSerialized'] ?? false,
        'sell_by'              => $p['sellBy'] ?? 'unit',   // ← NUEVO
    ]);
}
```

Modificar `handleItemUpdate` (línea 313-339), agregar `sell_by` al array de `$fields`:

```php
private function handleItemUpdate(array $event): void
{
    $p = $event['payload'];
    $item = Item::findOrFail($event['entity_id']);

    $fields = array_filter([
        'name'                 => $p['name'] ?? null,
        'category'             => $p['category'] ?? null,
        'item_number'          => $p['itemNumber'] ?? null,
        'description'          => $p['description'] ?? null,
        'cost_price'           => $p['costPrice'] ?? null,
        'unit_price'           => $p['unitPrice'] ?? null,
        'reorder_level'        => $p['reorderLevel'] ?? null,
        'receiving_quantity'   => $p['receivingQuantity'] ?? null,
        'allow_alt_description'=> $p['allowAltDescription'] ?? null,
        'is_serialized'        => $p['isSerialized'] ?? null,
        'sell_by'              => $p['sellBy'] ?? null,     // ← NUEVO
    ], fn ($v) => $v !== null);

    if (array_key_exists('minStockAlert', $p)) {
        $fields['min_stock_alert'] = $p['minStockAlert'];
    }

    $item->update($fields);
}
```

### 2.7 SyncReadController — Incluir `sell_by` en la respuesta

**Archivo:** `app/Http/Controllers/Api/SyncReadController.php`

Agregar `'sell_by'` al `select()` de `getItems()`:

```php
$items = Item::select([
    'id', 'name', 'category', 'item_number',
    'description', 'cost_price', 'unit_price',
    'stock', 'reorder_level', 'min_stock_alert',
    'receiving_quantity', 'allow_alt_description',
    'is_serialized', 'sell_by', 'updated_at', // ← agregado sell_by
])->get();
```

### 2.8 Nuevo Endpoint: `GET /api/categories`

Agregar al `SyncReadController`:

```php
/**
 * Devuelve las categorías del tenant actual (tabla categories).
 */
public function getCategoriesTable(Request $request): JsonResponse
{
    $categories = \App\Models\Category::select(['id', 'name', 'sort_order'])
        ->orderBy('sort_order')
        ->get();

    return response()->json($categories);
}
```

Registrar ruta en `routes/api.php`:

```php
Route::middleware('auth:sanctum')->group(function () {
    // ... existing routes
    Route::get('/categories', [SyncReadController::class, 'getCategoriesTable']);
});
```

---

## 3. Cambios en Frontend (React + Dexie)

### 3.1 ItemDocType — Agregar `sellBy`

**Archivo:** `apps/web/src/db/schemas/item.schema.ts`

```typescript
// ─── Item DocType (TypeScript only — no RxDB dependency) ─────────────────────

export type ItemDocType = {
    id: string;
    storeId: string;
    name: string;
    category: string;
    itemNumber?: string;
    description?: string;
    costPrice: number;
    unitPrice: number;
    stock: number;
    minStockAlert?: number;
    reorderLevel: number;
    receivingQuantity: number;
    allowAltDescription: boolean;
    isSerialized: boolean;
    sellBy: 'unit' | 'weight';    // ← NUEVO
    updatedAt: number;
};
```

### 3.2 ItemModal (InventoryPage) — Agregar selector sell_by

**Archivo:** `apps/web/src/pages/admin/InventoryPage.tsx`

**3.2.1** Ampliar el schema Zod (línea 15-28) agregando `sellBy`:

```typescript
import { z } from 'zod';
// ... imports existentes ...

const itemSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio"),
    category: z.string().min(2, "La categoría es obligatoria"),
    itemNumber: z.string().optional(),
    description: z.string().optional(),
    costPrice: z.number().min(0, "Debe ser mayor o igual a 0"),
    unitPrice: z.number().min(0, "Debe ser mayor o igual a 0"),
    reorderLevel: z.number().min(0),
    receivingQuantity: z.number().min(0),  // ← ya no min(1), permite decimales
    sellBy: z.enum(['unit', 'weight']),    // ← NUEVO
}).refine((data) => data.unitPrice >= data.costPrice, { /* ... */ });

type ItemFormData = z.infer<typeof itemSchema>;
```

**3.2.2** Actualizar `defaultValues` del `useForm` en `ItemModal`:

```typescript
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: item ? {
        id: item.id,
        name: item.name,
        category: item.category,
        itemNumber: item.itemNumber || '',
        description: item.description || '',
        costPrice: item.costPrice,
        unitPrice: item.unitPrice,
        reorderLevel: item.reorderLevel,
        receivingQuantity: item.receivingQuantity,
        sellBy: item.sellBy || 'unit',     // ← NUEVO
    } : {
        costPrice: 0,
        unitPrice: 0,
        reorderLevel: 0,
        receivingQuantity: 1,
        sellBy: 'unit' as const,           // ← NUEVO
    }
});
```

**3.2.3** Agregar el Radio Group en el JSX del formulario, después del campo `reorderLevel`:

```tsx
{/* ── Sell By Selector ── */}
<div className="space-y-1 md:col-span-2">
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        Tipo de Venta
    </label>
    <div className="flex gap-4 mt-2">
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="radio"
                value="unit"
                {...register('sellBy')}
                className="accent-violet-600 w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700">
                📦 Por Unidad
            </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="radio"
                value="weight"
                {...register('sellBy')}
                className="accent-violet-600 w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700">
                ⚖️ Por Peso / Granel
            </span>
        </label>
    </div>
    <p className="text-[10px] text-slate-400 mt-1">
        {watchSellBy === 'weight'
            ? 'Al vender se pedirá el peso exacto (Kg/g).'
            : 'Se vende por pieza/unidad entera.'}
    </p>
</div>
```

> **Nota:** Para que `watchSellBy` funcione, agregar `const watchSellBy = watch('sellBy');` después del `useForm`.

**3.2.4** Corregir el input de `receivingQuantity` para usar `step="any"`:

```tsx
<div className="space-y-1">
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        Stock Inicial (Qty)
    </label>
    <input
        type="number"
        step="any"                    // ← CORRECCIÓN: permitir decimales
        min="0"
        {...register('receivingQuantity', { valueAsNumber: true })}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none"
    />
</div>
```

**3.2.5** Actualizar `handleSave` para incluir `sellBy` en el payload:

En la creación (línea 452-489), agregar al `newItem` y al `payload`:

```typescript
const newItem: ItemDocType = {
    // ... campos existentes ...
    sellBy: data.sellBy,        // ← NUEVO
    allowAltDescription: false,
    isSerialized: false,
    updatedAt: now,
};

await enqueueSyncEvent({
    // ...
    payload: {
        // ... campos existentes ...
        sellBy: data.sellBy,    // ← NUEVO
    },
    // ...
});
```

En la actualización (línea 490-521), igual:

```typescript
const updatedItem: ItemDocType = {
    ...modalItem,
    // ... campos existentes ...
    sellBy: data.sellBy,        // ← NUEVO
    updatedAt: now,
};

await enqueueSyncEvent({
    // ...
    payload: {
        // ... campos existentes ...
        sellBy: data.sellBy,    // ← NUEVO
    },
    // ...
});
```

### 3.3 WeightInputModal — Nuevo componente

**Archivo:** `apps/web/src/components/WeightInputModal.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';
import type { ItemDocType } from '../db/schemas/item.schema';

interface WeightInputModalProps {
    item: ItemDocType;
    isOpen: boolean;
    onConfirm: (item: ItemDocType, weight: number) => void;
    onClose: () => void;
}

export const WeightInputModal: React.FC<WeightInputModalProps> = ({
    item,
    isOpen,
    onConfirm,
    onClose,
}) => {
    const [weight, setWeight] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setWeight('');
            // Pequeño delay para asegurar que el modal está renderizado
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        const parsed = parseFloat(weight.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
            onConfirm(item, parsed);
        }
    };

    const estimatedTotal = (() => {
        const w = parseFloat(weight.replace(',', '.'));
        if (isNaN(w) || w <= 0) return null;
        return (w * item.unitPrice).toFixed(2);
    })();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <span className="text-5xl mb-3 block">⚖️</span>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                        {item.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Producto a granel — Ingrese el peso
                    </p>
                </div>

                {/* Price reference */}
                <div className="bg-violet-50 rounded-2xl p-3 mb-5 text-center border border-violet-100">
                    <span className="text-xs text-violet-500 font-bold uppercase tracking-wider">
                        Precio por Kg
                    </span>
                    <p className="text-2xl font-black text-violet-700">
                        ${item.unitPrice.toFixed(2)}
                    </p>
                </div>

                {/* Weight Input */}
                <div className="mb-5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Peso (Kg)
                    </label>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            step="any"
                            min="0.001"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                                if (e.key === 'Escape') onClose();
                            }}
                            className="w-full px-4 py-4 text-3xl font-black text-slate-900 text-center border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                            placeholder="0.000"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                            Kg
                        </span>
                    </div>
                    {estimatedTotal !== null && (
                        <p className="text-center mt-2 text-sm font-bold text-emerald-600">
                            Total estimado: ${estimatedTotal}
                        </p>
                    )}
                </div>

                {/* Quick weight buttons */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[0.25, 0.5, 1, 2].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => {
                                setWeight(preset.toString());
                                inputRef.current?.focus();
                            }}
                            className="py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all active:scale-95 bg-slate-50 shadow-sm text-sm"
                        >
                            {preset} Kg
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!weight || parseFloat(weight.replace(',', '.')) <= 0}
                        className="flex-[1.5] py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                        ⚖️ Agregar {estimatedTotal ? `$${estimatedTotal}` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### 3.4 CartProvider — Soporte para `addToCart` con peso

**Archivo:** `apps/web/src/contexts/CartProvider.tsx`

**3.4.1** Agregar overload/signature al tipo `CartContextValue` para aceptar peso opcional:

```typescript
type CartContextValue = {
    // ... existente ...
    addToCart: (product: ItemDocType, weightOverride?: number) => void;
    // ... resto igual ...
};
```

**3.4.2** Modificar el reducer `ADD` para aceptar cantidad inicial:

```typescript
type CartAction =
    | { type: 'ADD'; product: ItemDocType; quantity?: number }
    | // ... resto igual ...
```

**3.4.3** Modificar el case `ADD` en el reducer:

```typescript
case 'ADD': {
    const qty = action.quantity ?? 1;
    const existing = state.items.find(i => i.product.id === action.product.id);
    if (existing) {
        return {
            items: state.items.map(i =>
                i.product.id === action.product.id
                    ? { ...i, quantity: i.quantity + qty }
                    : i
            ),
        };
    }
    return { items: [...state.items, { product: action.product, quantity: qty, discount: 0 }] };
}
```

**3.4.4** Modificar el callback `addToCart`:

```typescript
const addToCart = useCallback((product: ItemDocType, weightOverride?: number) => {
    const qty = weightOverride !== undefined ? weightOverride : 1;
    dispatch({ type: 'ADD', product, quantity: qty });
}, []);
```

### 3.5 PosPage — Integrar WeightInputModal en ProductCard

**Archivo:** `apps/web/src/pages/PosPage.tsx`

**3.5.1** Agregar estado para el modal de peso:

```typescript
// Dentro de PosPage component, después de los otros useState:
const [weightModalItem, setWeightModalItem] = useState<ItemDocType | null>(null);
```

**3.5.2** Modificar la función `onAdd` que se pasa a `ProductCard`:

Reemplazar la línea donde se llama a `addToCart`:

```typescript
// En PosPage, crear un handler:
const handleAddToCart = useCallback((item: ItemDocType) => {
    if (item.sellBy === 'weight') {
        setWeightModalItem(item);
    } else {
        addToCart(item);
        playBeep();
    }
}, [addToCart]);
```

**3.5.3** Pasar `handleAddToCart` a ProductCard en lugar de `addToCart`:

```tsx
{filtered.map(item => (
    <ProductCard
        key={item.id}
        item={item}
        onAdd={handleAddToCart}
        exchangeRate={exchangeRate}
        hv={hv}
    />
))}
```

**3.5.4** Actualizar el barcode scanner para que también respete `sellBy`:

```typescript
useBarcodeScanner(useCallback((barcode) => {
    if (isCheckoutModalOpen || completedSale) return;
    const item = items.find(i =>
        i.itemNumber === barcode ||
        i.id === barcode ||
        i.name.toLowerCase() === barcode.toLowerCase()
    );
    if (item) {
        handleAddToCart(item);   // ← usa el handler que abre modal si es weight
    } else {
        toast.error(`Producto no encontrado: ${barcode}`);
    }
}, [items, handleAddToCart, isCheckoutModalOpen, completedSale]));
```

**3.5.5** Agregar el WeightInputModal al final del JSX (junto a los otros modales):

```tsx
{/* ── Weight Input Modal (productos a granel) ── */}
<WeightInputModal
    item={weightModalItem!}
    isOpen={weightModalItem !== null}
    onConfirm={(item, weight) => {
        addToCart(item, weight);
        playBeep();
        setWeightModalItem(null);
    }}
    onClose={() => setWeightModalItem(null)}
/>
```

**3.5.6** Agregar el import:

```typescript
import { WeightInputModal } from '../components/WeightInputModal';
```

---

## 4. Resumen de Archivos Modificados

### Backend (Laravel)

| Archivo | Acción |
|---------|--------|
| `database/migrations/2026_05_12_200000_add_sell_by_and_fix_receiving_qty.php` | **CREAR** — Nueva migración |
| `database/migrations/2026_05_12_200001_create_categories_table.php` | **CREAR** — Nueva migración |
| `app/Models/Item.php` | **MODIFICAR** — Agregar `sell_by` a fillable + `receiving_quantity` a casts |
| `app/Models/Category.php` | **CREAR** — Nuevo modelo |
| `app/Http/Controllers/Api/TenantRegistrationController.php` | **MODIFICAR** — Seed categorías default |
| `app/Services/Sync/SyncEventProcessor.php` | **MODIFICAR** — Handlers ITEM con `sell_by` |
| `app/Http/Controllers/Api/SyncReadController.php` | **MODIFICAR** — Incluir `sell_by` en select + nuevo endpoint |
| `routes/api.php` | **MODIFICAR** — Nueva ruta GET /categories |

### Frontend (React)

| Archivo | Acción |
|---------|--------|
| `apps/web/src/db/schemas/item.schema.ts` | **MODIFICAR** — Agregar `sellBy` |
| `apps/web/src/pages/admin/InventoryPage.tsx` | **MODIFICAR** — Zod schema, ItemModal UI, handleSave |
| `apps/web/src/components/WeightInputModal.tsx` | **CREAR** — Nuevo componente |
| `apps/web/src/contexts/CartProvider.tsx` | **MODIFICAR** — `addToCart` con peso, reducer ADD |
| `apps/web/src/pages/PosPage.tsx` | **MODIFICAR** — Integrar WeightInputModal, handleAddToCart |

---

## 5. Orden de Implementación

1. **Backend primero:**
   - [ ] Crear las 2 migraciones
   - [ ] Modificar Item.php (casts + fillable)
   - [ ] Crear Category.php
   - [ ] Modificar TenantRegistrationController
   - [ ] Modificar SyncEventProcessor (ITEM handlers)
   - [ ] Modificar SyncReadController (select + endpoint categorías)
   - [ ] Agregar ruta en api.php
   - [ ] Ejecutar `php artisan migrate`

2. **Frontend después:**
   - [ ] Modificar `item.schema.ts`
   - [ ] Modificar `InventoryPage.tsx` (schema, formulario, handleSave)
   - [ ] Crear `WeightInputModal.tsx`
   - [ ] Modificar `CartProvider.tsx`
   - [ ] Modificar `PosPage.tsx` (integrar modal)
