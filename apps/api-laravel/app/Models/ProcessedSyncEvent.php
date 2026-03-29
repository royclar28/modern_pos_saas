<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ProcessedSyncEvent — Tabla de idempotencia.
 *
 * NO usa HasTenant porque la query de idempotencia se hace
 * por event_id (PK) directamente, sin necesidad de scope.
 * El tenant_id se almacena solo para auditoría/trazabilidad.
 */
class ProcessedSyncEvent extends Model
{
    public $incrementing = false;
    public $timestamps   = false; // Usa processed_at manual, no created_at/updated_at

    protected $primaryKey = 'event_id';
    protected $keyType    = 'string';

    protected $fillable = [
        'event_id',
        'tenant_id',
        'entity_type',
        'action',
        'entity_id',
        'occurred_at',
        'processed_at',
        'status',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at'  => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    // ─── Static Helpers ─────────────────────────────────────────

    /**
     * ¿Ya se procesó este evento? (idempotencia)
     */
    public static function wasProcessed(string $eventId): bool
    {
        return static::where('event_id', $eventId)->exists();
    }

    /**
     * Registra un evento como procesado exitosamente.
     */
    public static function markProcessed(array $event): static
    {
        return static::create([
            'event_id'     => $event['event_id'],
            'tenant_id'    => $event['tenant_id'],
            'entity_type'  => $event['entity_type'],
            'action'       => $event['action'],
            'entity_id'    => $event['entity_id'],
            'occurred_at'  => $event['occurred_at'],
            'processed_at' => now(),
            'status'       => 'OK',
        ]);
    }

    /**
     * Registra un evento como fallido con su mensaje de error.
     */
    public static function markFailed(array $event, string $error): static
    {
        return static::create([
            'event_id'      => $event['event_id'],
            'tenant_id'     => $event['tenant_id'],
            'entity_type'   => $event['entity_type'],
            'action'        => $event['action'],
            'entity_id'     => $event['entity_id'],
            'occurred_at'   => $event['occurred_at'],
            'processed_at'  => now(),
            'status'        => 'FAILED',
            'error_message' => $error,
        ]);
    }
}
