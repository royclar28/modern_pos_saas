<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'category_id',
        'brand_id',
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
        'sell_by',
        'unit_label',
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

    // ─── Relations ──────────────────────────────────────────────

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'item_id');
    }

    public function category(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    // ─── Stock Operations (Atomic) ──────────────────────────────

    /**
     * Ajuste atómico de stock con row-level lock.
     * Lanza excepción si el stock resultante sería negativo.
     *
     * @param  float  $delta  Positivo para entrada, negativo para salida.
     * @throws \App\Exceptions\InsufficientStockException
     */
    public function adjustStock(float $delta): void
    {
        $item = static::where('id', $this->id)
            ->lockForUpdate()
            ->firstOrFail();

        $newStock = (float) $item->stock + $delta;

        if ($newStock < 0) {
            throw new \App\Exceptions\InsufficientStockException(
                item: $this,
                requested: abs($delta),
                available: (float) $item->stock,
            );
        }

        $item->update(['stock' => $newStock]);

        // Refrescar el modelo actual con los valores actualizados
        $this->stock = $newStock;
    }
}
