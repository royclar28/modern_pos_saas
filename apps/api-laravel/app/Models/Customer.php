<?php

namespace App\Models;

use App\Models\Traits\HasTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasUuids, HasTenant, SoftDeletes;

    protected $fillable = [
        'id',
        'tenant_id',
        'first_name',
        'last_name',
        'company_name',
        'account_number',
        'taxable',
        'email',
        'phone',
        'address',
    ];

    protected function casts(): array
    {
        return [
            'taxable' => 'boolean',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'customer_id');
    }

    // ─── Helpers ────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
