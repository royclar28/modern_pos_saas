<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * User — Empleados / Cajeros / Administradores.
 *
 * NO usa el trait HasTenant porque su tenant_id se asigna
 * manualmente al crear el usuario (el admin elige la tienda).
 * En su lugar, la relación con Store se define explícitamente.
 */
class User extends Authenticatable
{
    use Notifiable, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'username',
        'password',
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'role',
        'telegram_chat_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'tenant_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'employee_id');
    }

    // ─── Helpers ────────────────────────────────────────────────

    public function isSuperAdmin(): bool
    {
        return $this->role === 'SUPER_ADMIN';
    }

    public function isStoreAdmin(): bool
    {
        return $this->role === 'STORE_ADMIN';
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
