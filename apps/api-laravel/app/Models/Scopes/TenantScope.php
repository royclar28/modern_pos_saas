<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * TenantScope — Global Scope para aislamiento multi-tenant.
 *
 * Aplica automáticamente `WHERE tenant_id = ?` a TODAS las queries
 * de cualquier modelo que use el trait HasTenant.
 *
 * Es IMPOSIBLE olvidar el filtro de tenant porque se aplica a nivel de ORM.
 * La única forma de saltarlo es explícitamente:
 *   Model::withoutGlobalScope(TenantScope::class)->get()
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        if ($user && $user->tenant_id) {
            $builder->where($model->getTable() . '.tenant_id', $user->tenant_id);
        }
    }
}
