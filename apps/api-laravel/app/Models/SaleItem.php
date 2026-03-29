<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaleItem extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'sale_id',
        'item_id',
        'line',
        'description',
        'serial_number',
        'quantity_purchased',
        'item_cost_price',
        'item_unit_price',
        'discount_percent',
    ];

    protected function casts(): array
    {
        return [
            'quantity_purchased' => 'decimal:2',
            'item_cost_price'   => 'decimal:2',
            'item_unit_price'   => 'decimal:2',
            'discount_percent'  => 'decimal:2',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    // ─── Helpers ────────────────────────────────────────────────

    /**
     * Monto total de esta línea (qty × price × (1 - discount%))
     */
    public function getLineTotalAttribute(): float
    {
        $price = (float) $this->item_unit_price;
        $qty   = (float) $this->quantity_purchased;
        $disc  = (float) $this->discount_percent / 100;

        return round($qty * $price * (1 - $disc), 2);
    }
}
