<?php

namespace App\Models\Traits;

use App\Models\Scopes\TenantScope;
use App\Models\Store;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * HasTenant — Trait para modelos multi-tenant.
 *
 * Uso:
 *   class Item extends Model {
 *       use HasTenant;
 *   }
 *
 * Esto automáticamente:
 * 1. Aplica el TenantScope (WHERE tenant_id = ?) a TODAS las queries.
 * 2. Inyecta el tenant_id del usuario autenticado al crear un modelo nuevo.
 * 3. Registra la relación belongsTo con Store.
 */
trait HasTenant
{
    public static function bootHasTenant(): void
    {
        // Registrar el Global Scope
        static::addGlobalScope(new TenantScope());

        // Auto-asignar tenant_id al crear un registro nuevo
        static::creating(function ($model) {
            if (empty($model->tenant_id) && auth()->check()) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    /**
     * Relación con la tienda (tenant) dueña de este registro.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'tenant_id');
    }
}
