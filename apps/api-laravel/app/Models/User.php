<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * User — Empleados / Cajeros / Administradores.
 *
 * NO usa el trait HasTenant porque su tenant_id se asigna
 * manualmente al crear el usuario (el admin elige la tienda).
 * En su lugar, la relación con Store se define explícitamente.
 */
class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

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

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN' || $this->role === 'SUPER_ADMIN';
    }

    public function isManager(): bool
    {
        return $this->role === 'MANAGER';
    }

    public function isCashier(): bool
    {
        return $this->role === 'CASHIER';
    }

    /**
     * Check if user has at least the given role level.
     * Hierarchy: SUPER_ADMIN > ADMIN > MANAGER > CASHIER
     */
    public function hasRoleLevel(string $minimumRole): bool
    {
        $hierarchy = ['CASHIER' => 0, 'MANAGER' => 1, 'ADMIN' => 2, 'SUPER_ADMIN' => 3];
        $userLevel = $hierarchy[$this->role] ?? -1;
        $requiredLevel = $hierarchy[strtoupper($minimumRole)] ?? 999;
        return $userLevel >= $requiredLevel;
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
