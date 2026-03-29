<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'invoice_number',
        'comment',
        'sale_time',
        'terminal_id',
        'customer_id',
        'employee_id',
        'payment_method',
        'status',
        'subtotal',
        'tax_percent',
        'tax_amount',
        'total',
        'paid_amount',
        'amount_received',
        'change_amount',
        'reference',
        'due_date',
    ];

    protected function casts(): array
    {
        return [
            'sale_time'       => 'datetime',
            'due_date'        => 'datetime',
            'subtotal'        => 'decimal:2',
            'tax_percent'     => 'decimal:2',
            'tax_amount'      => 'decimal:2',
            'total'           => 'decimal:2',
            'paid_amount'     => 'decimal:2',
            'amount_received' => 'decimal:2',
            'change_amount'   => 'decimal:2',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class)->orderBy('line');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class)->orderBy('paid_at');
    }

    // ─── Helpers ────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'FIADO';
    }

    public function isFullyPaid(): bool
    {
        return (float) $this->paid_amount >= (float) $this->total;
    }

    /**
     * Saldo pendiente de pago.
     */
    public function getBalanceDueAttribute(): float
    {
        return max(0, (float) $this->total - (float) $this->paid_amount);
    }
}
