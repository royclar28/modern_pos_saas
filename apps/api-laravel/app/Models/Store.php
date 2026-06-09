<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * Store — Entidad raíz del multi-tenant.
 * NO usa HasTenant porque ES el tenant.
 */
class Store extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'primary_color',
        'logo_url',
        'is_active',
        'plan',
        'rif',
        'owner_email',
        'trial_ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_active'     => 'boolean',
            'trial_ends_at' => 'datetime',
        ];
    }

    // ─── Trial Helpers ────────────────────────────────────

    /** True si el store tiene un trial activo (no expirado). */
    public function isOnTrial(): bool
    {
        return $this->trial_ends_at !== null && Carbon::now()->lessThan($this->trial_ends_at);
    }

    /** True si el trial existió y ya expiró. */
    public function trialHasExpired(): bool
    {
        return $this->trial_ends_at !== null && Carbon::now()->greaterThan($this->trial_ends_at);
    }

    // ─── Relations ──────────────────────────────────────────────

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'tenant_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'tenant_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'tenant_id');
    }

    public function configs(): HasMany
    {
        return $this->hasMany(StoreConfig::class, 'tenant_id');
    }
}
