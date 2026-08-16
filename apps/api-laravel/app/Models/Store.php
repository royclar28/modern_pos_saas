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
        'plan_changed_at',
        'rif',
        'owner_email',
        'whatsapp_number',
        'catalog_enabled',
        'trial_ends_at',
        'status',
        'last_active_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'       => 'boolean',
            'catalog_enabled' => 'boolean',
            'trial_ends_at'   => 'datetime',
            'plan_changed_at' => 'datetime',
            'last_active_at'  => 'datetime',
        ];
    }

    // ─── Trial Helpers ─────────────────────────────────────

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at !== null;
    }

    public function trialHasExpired(): bool
    {
        if (!$this->isOnTrial()) {
            return false;
        }
        return now()->greaterThan($this->trial_ends_at);
    }

    public function trialDaysLeft(): int
    {
        if (!$this->isOnTrial() || $this->trialHasExpired()) {
            return 0;
        }
        return max(0, (int) now()->diffInDays($this->trial_ends_at, false));
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
