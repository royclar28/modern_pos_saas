<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\SyncEventsRequest;
use App\Services\Sync\SyncEventProcessor;
use Illuminate\Support\Facades\Log;

/**
 * SyncController — Endpoint HTTP para el Drain Loop del frontend.
 *
 * Recibe un batch de eventos, los procesa uno a uno usando
 * SyncEventProcessor, y devuelve un reporte detallado.
 *
 * Response codes:
 *   200 → Todos los eventos procesados exitosamente
 *   207 → Procesamiento parcial (algunos fallaron)
 *   422 → Payload con errores de validación (manejado por SyncEventsRequest)
 */
class SyncController extends Controller
{
    public function __construct(
        private readonly SyncEventProcessor $processor,
    ) {}

    /**
     * POST /api/sync/events
     *
     * Procesa un batch de eventos del Drain Loop offline-first.
     */
    public function processBatch(SyncEventsRequest $request)
    {
        $events = $request->validated()['events'];
        $responses = [];
        $processed = 0;
        $failed = 0;
        $skipped = 0;

        Log::info("[SyncController] Recibido batch de " . count($events) . " eventos.");

        foreach ($events as $event) {
            try {
                $result = $this->processor->processEvent($event);

                if ($result['status'] === 'skipped') {
                    $skipped++;
                } else {
                    $processed++;
                }

                $responses[] = [
                    'event_id' => $event['event_id'],
                    'status'   => $result['status'], // 'ok' o 'skipped'
                ];
            } catch (InsufficientStockException $e) {
                // ── Error de negocio esperado ──────────────────────
                // No detiene el batch — los siguientes eventos pueden
                // ser independientes (ej. otro producto, otro customer)
                $failed++;

                $responses[] = [
                    'event_id' => $event['event_id'],
                    'status'   => 'failed',
                    'error'    => $e->getMessage(),
                    'type'     => 'INSUFFICIENT_STOCK',
                ];

                Log::warning("[SyncController] Stock insuficiente: {$e->getMessage()}");

            } catch (\InvalidArgumentException $e) {
                // ── Tipo de evento no soportado ───────────────────
                $failed++;

                $responses[] = [
                    'event_id' => $event['event_id'],
                    'status'   => 'failed',
                    'error'    => $e->getMessage(),
                    'type'     => 'UNSUPPORTED_EVENT',
                ];

                Log::warning("[SyncController] Evento no soportado: {$e->getMessage()}");

            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                // ── Entidad referenciada no existe ─────────────────
                $failed++;

                $responses[] = [
                    'event_id' => $event['event_id'],
                    'status'   => 'failed',
                    'error'    => "Entidad no encontrada: {$e->getMessage()}",
                    'type'     => 'ENTITY_NOT_FOUND',
                ];

                Log::warning("[SyncController] Entidad no encontrada: {$e->getMessage()}");

            } catch (\Throwable $e) {
                // ── Error inesperado ──────────────────────────────
                // Loguear completo, devolver mensaje genérico al cliente
                $failed++;

                $responses[] = [
                    'event_id' => $event['event_id'],
                    'status'   => 'failed',
                    'error'    => 'Error interno del servidor al procesar este evento.',
                    'type'     => 'INTERNAL_ERROR',
                ];

                Log::error("[SyncController] Error inesperado en evento {$event['event_id']}: {$e->getMessage()}", [
                    'exception' => $e,
                    'event'     => $event,
                ]);
            }
        }

        // ── Decidir HTTP Status Code ──────────────────────────────
        $summary = [
            'status'    => $failed === 0 ? 'ok' : 'partial',
            'processed' => $processed,
            'skipped'   => $skipped,
            'failed'    => $failed,
            'total'     => count($events),
            'results'   => $responses,
        ];

        $httpStatus = $failed === 0 ? 200 : 207;

        Log::info("[SyncController] Batch completado: {$processed} ok, {$skipped} skip, {$failed} fail");

        return response()->json($summary, $httpStatus);
    }
}
