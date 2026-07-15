<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Str;

/**
 * AuditService — Registro de auditoría inmutable.
 *
 * Cada operación de negocio que modifica datos debe registrar:
 *   - Quién (user_id autenticado)
 *   - Qué (entity_type + entity_id)
 *   - Acción (CREATE, UPDATE, DELETE, VOID, etc.)
 *   - Valor anterior (old_values)
 *   - Valor nuevo (new_values)
 *   - IP del cliente
 *
 * Uso:
 *   app(AuditService::class)->log('item', $itemId, 'UPDATE', $oldData, $newData);
 *   app(AuditService::class)->log('sale', $saleId, 'VOID');
 *   app(AuditService::class)->log('sale_payment', $paymentId, 'CREATE',
 *       metadata: ['amount' => 50.00, 'method' => 'EFECTIVO']);
 */
class AuditService
{
    /**
     * Registrar un evento de auditoría.
     *
     * @param  string       $entityType  Ej: 'item', 'sale', 'sale_payment', 'cash_shift', 'setting'
     * @param  string       $entityId    UUID del recurso afectado
     * @param  string       $action      Ej: 'CREATE', 'UPDATE', 'DELETE', 'VOID', 'ADJUST_STOCK'
     * @param  array|null   $oldValues   Estado anterior (solo para UPDATE/DELETE)
     * @param  array|null   $newValues   Estado nuevo (solo para CREATE/UPDATE)
     * @param  array|null   $metadata    Datos contextuales adicionales
     */
    public function log(
        string $entityType,
        string $entityId,
        string $action,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null
    ): AuditLog {
        return AuditLog::create([
            'id'          => (string) Str::uuid(),
            'tenant_id'   => auth()->user()?->tenant_id,
            'user_id'     => auth()->id(),
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'action'      => $action,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'metadata'    => $metadata,
            'ip_address'  => request()->ip(),
            'created_at'  => now(),
        ]);
    }
}
