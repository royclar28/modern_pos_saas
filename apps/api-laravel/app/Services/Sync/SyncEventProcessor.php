<?php

namespace App\Services\Sync;

use App\Exceptions\InsufficientStockException;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ProcessedSyncEvent;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * SyncEventProcessor — Motor de Eventos del POS.
 *
 * Responsabilidad única: recibir un evento validado y ejecutar
 * la lógica de negocio pura dentro de una transacción atómica.
 *
 * Flujo:
 * 1. Verificar idempotencia (¿ya se procesó este event_id?)
 * 2. Abrir DB::transaction()
 * 3. Enrutar al handler correcto según entity_type:action
 * 4. Registrar éxito en processed_sync_events
 * 5. Si falla → rollback automático + lanzar excepción hacia arriba
 *
 * Uso (desde el Controller de Víctor):
 *   $processor = app(SyncEventProcessor::class);
 *   $result = $processor->processEvent($eventData);
 *   // $result = ['status' => 'ok'] | ['status' => 'skipped'] | throw Exception
 */
class SyncEventProcessor
{
    /**
     * Procesa un evento individual del Drain Loop.
     *
     * @param  array  $event  Evento validado con keys: event_id, tenant_id, entity_type, action, entity_id, occurred_at, payload
     * @return array  ['status' => 'ok'|'skipped', 'event_id' => string]
     *
     * @throws InsufficientStockException  Si no hay stock suficiente (el controller responde 207)
     * @throws \Throwable                  Cualquier error inesperado (el controller responde 500)
     */
    public function processEvent(array $event): array
    {
        $eventId = $event['event_id'];

        // ─── 1. Idempotencia ────────────────────────────────────────
        if (ProcessedSyncEvent::wasProcessed($eventId)) {
            Log::debug("[Sync] Evento {$eventId} ya procesado — skip (idempotencia)");
            return ['status' => 'skipped', 'event_id' => $eventId];
        }

        // ─── 2. Transacción atómica ─────────────────────────────────
        DB::transaction(function () use ($event) {
            $route = $event['entity_type'] . ':' . $event['action'];

            Log::info("[Sync] Procesando {$route} — entity: {$event['entity_id']}");

            // ─── 3. Enrutamiento por entity_type:action ─────────────
            match ($route) {
                // ── Customers ───────────────────────────────────────
                'CUSTOMER:CREATE' => $this->handleCustomerCreate($event),
                'CUSTOMER:UPDATE' => $this->handleCustomerUpdate($event),
                'CUSTOMER:DELETE' => $this->handleCustomerDelete($event),

                // ── Sales ───────────────────────────────────────────
                'SALE:CREATE'     => $this->handleSaleCreate($event),
                'SALE:VOID'       => $this->handleSaleVoid($event),

                // ── Items (Inventory) ───────────────────────────────
                'ITEM:CREATE'       => $this->handleItemCreate($event),
                'ITEM:UPDATE'       => $this->handleItemUpdate($event),
                'ITEM:DELETE'       => $this->handleItemDelete($event),
                'ITEM:ADJUST_STOCK' => $this->handleItemAdjustStock($event),

                // ── Sale Payments (Abonos / Fiados) ─────────────────
                'SALE_PAYMENT:CREATE' => $this->handleSalePaymentCreate($event),
                'SALE_PAYMENT:VOID'   => $this->handleSalePaymentVoid($event),

                // ── Ruta desconocida ────────────────────────────────
                default => throw new \InvalidArgumentException(
                    "Tipo de evento no soportado: {$route}"
                ),
            };

            // ─── 4. Registrar éxito ─────────────────────────────────
            ProcessedSyncEvent::markProcessed($event);
        });

        return ['status' => 'ok', 'event_id' => $eventId];
    }

    /**
     * Procesa un batch completo de eventos (el array del Drain Loop).
     * Devuelve estadísticas para el response 200/207.
     *
     * @param  array[]  $events  Array de eventos ordenados por occurred_at
     * @return array  ['processed' => int, 'failed' => int, 'results' => array]
     */
    public function processBatch(array $events): array
    {
        $results = [];
        $processed = 0;
        $failed = 0;

        foreach ($events as $event) {
            try {
                $result = $this->processEvent($event);
                $results[] = $result;
                $processed++;
            } catch (InsufficientStockException $e) {
                // Error de negocio esperado — registrar como FAILED y continuar
                ProcessedSyncEvent::markFailed($event, $e->getMessage());

                $results[] = [
                    'status'   => 'failed',
                    'event_id' => $event['event_id'],
                    'error'    => $e->getMessage(),
                ];
                $failed++;

                Log::warning("[Sync] Stock insuficiente: {$e->getMessage()}");
            } catch (\Throwable $e) {
                // Error inesperado — registrar y detener el batch
                ProcessedSyncEvent::markFailed($event, $e->getMessage());

                $results[] = [
                    'status'   => 'failed',
                    'event_id' => $event['event_id'],
                    'error'    => $e->getMessage(),
                ];
                $failed++;

                Log::error("[Sync] Error fatal procesando evento {$event['event_id']}: {$e->getMessage()}", [
                    'exception' => $e,
                    'event'     => $event,
                ]);

                // Romper el batch — los eventos restantes dependen de orden causal
                break;
            }
        }

        return [
            'processed' => $processed,
            'failed'    => $failed,
            'results'   => $results,
        ];
    }

    // ════════════════════════════════════════════════════════════════
    // HANDLERS — Lógica de negocio pura por entidad
    // ════════════════════════════════════════════════════════════════

    // ── CUSTOMER ────────────────────────────────────────────────────

    private function handleCustomerCreate(array $event): void
    {
        $p = $event['payload'];

        Customer::create([
            'id'             => $p['id'],
            'tenant_id'      => $event['tenant_id'],
            'first_name'     => $p['first_name'],
            'last_name'      => $p['last_name'],
            'phone'          => $p['phone'] ?? null,
            'email'          => $p['email'] ?? null,
            'address'        => $p['address'] ?? null,
            'company_name'   => $p['company_name'] ?? null,
            'taxable'        => $p['taxable'] ?? true,
            'account_number' => $p['account_number'] ?? null,
        ]);
    }

    private function handleCustomerUpdate(array $event): void
    {
        $p = $event['payload'];

        $customer = Customer::findOrFail($event['entity_id']);
        $customer->update(array_filter([
            'first_name'     => $p['first_name'] ?? null,
            'last_name'      => $p['last_name'] ?? null,
            'phone'          => $p['phone'] ?? null,
            'email'          => $p['email'] ?? null,
            'address'        => $p['address'] ?? null,
            'company_name'   => $p['company_name'] ?? null,
            'taxable'        => $p['taxable'] ?? null,
            'account_number' => $p['account_number'] ?? null,
        ], fn ($v) => $v !== null));
    }

    private function handleCustomerDelete(array $event): void
    {
        Customer::findOrFail($event['entity_id'])->delete(); // SoftDelete
    }

    // ── SALE ────────────────────────────────────────────────────────

    private function handleSaleCreate(array $event): void
    {
        $p = $event['payload'];

        // Crear la cabecera de la venta
        $sale = Sale::create([
            'id'              => $p['id'],
            'tenant_id'       => $event['tenant_id'],
            'customer_id'     => $p['customer_id'] ?? null,
            'employee_id'     => $p['employee_id'],
            'terminal_id'     => $p['terminal_id'] ?? 'CAJA_01',
            'sale_time'       => $p['sale_time'],
            'invoice_number'  => $p['invoice_number'] ?? null,
            'comment'         => $p['comment'] ?? null,
            'status'          => $p['status'] ?? 'PAGADO',
            'payment_method'  => $p['payment_method'] ?? 'DIVISA',
            'subtotal'        => $p['subtotal'],
            'tax_percent'     => $p['tax_percent'],
            'tax_amount'      => $p['tax_amount'],
            'total'           => $p['total'],
            'paid_amount'     => $p['paid_amount'] ?? 0,
            'amount_received' => $p['amount_received'] ?? 0,
            'change_amount'   => $p['change_amount'] ?? 0,
            'reference'       => $p['reference'] ?? null,
            'due_date'        => $p['due_date'] ?? null,
        ]);

        // Crear las líneas de detalle (items de la venta)
        if (!empty($p['items'])) {
            foreach ($p['items'] as $lineItem) {
                SaleItem::create([
                    'id'                => $lineItem['id'] ?? (string) \Illuminate\Support\Str::uuid(),
                    'tenant_id'         => $event['tenant_id'],
                    'sale_id'           => $sale->id,
                    'item_id'           => $lineItem['item_id'],
                    'line'              => $lineItem['line'],
                    'description'       => $lineItem['description'] ?? null,
                    'serial_number'     => $lineItem['serial_number'] ?? null,
                    'quantity_purchased'=> $lineItem['quantity_purchased'],
                    'item_cost_price'   => $lineItem['item_cost_price'],
                    'item_unit_price'   => $lineItem['item_unit_price'],
                    'discount_percent'  => $lineItem['discount_percent'] ?? 0,
                ]);
            }
        }
    }

    private function handleSaleVoid(array $event): void
    {
        $sale = Sale::findOrFail($event['entity_id']);
        $sale->update(['status' => 'ANULADO']);

        // Revertir stock de cada línea (devolver al inventario)
        foreach ($sale->saleItems as $saleItem) {
            $item = Item::find($saleItem->item_id);
            if ($item) {
                // Delta positivo = devolver al inventario
                $item->adjustStock((float) $saleItem->quantity_purchased);
            }
        }
    }

    // ── ITEM (INVENTORY) ────────────────────────────────────────────

    private function handleItemCreate(array $event): void
    {
        $p = $event['payload'];

        Item::create([
            'id'                   => $p['id'],
            'tenant_id'            => $event['tenant_id'],
            'name'                 => $p['name'],
            'category'             => $p['category'],
            'item_number'          => $p['item_number'] ?? null,
            'description'          => $p['description'] ?? null,
            'cost_price'           => $p['cost_price'],
            'unit_price'           => $p['unit_price'],
            'stock'                => $p['stock'] ?? 0,
            'reorder_level'        => $p['reorder_level'] ?? 0,
            'receiving_quantity'   => $p['receiving_quantity'] ?? 1,
            'allow_alt_description'=> $p['allow_alt_description'] ?? false,
            'is_serialized'        => $p['is_serialized'] ?? false,
        ]);
    }

    private function handleItemUpdate(array $event): void
    {
        $p = $event['payload'];
        $item = Item::findOrFail($event['entity_id']);

        $item->update(array_filter([
            'name'                 => $p['name'] ?? null,
            'category'             => $p['category'] ?? null,
            'item_number'          => $p['item_number'] ?? null,
            'description'          => $p['description'] ?? null,
            'cost_price'           => $p['cost_price'] ?? null,
            'unit_price'           => $p['unit_price'] ?? null,
            'reorder_level'        => $p['reorder_level'] ?? null,
            'receiving_quantity'   => $p['receiving_quantity'] ?? null,
            'allow_alt_description'=> $p['allow_alt_description'] ?? null,
            'is_serialized'        => $p['is_serialized'] ?? null,
        ], fn ($v) => $v !== null));
    }

    private function handleItemDelete(array $event): void
    {
        Item::findOrFail($event['entity_id'])->delete(); // SoftDelete
    }

    /**
     * Ajuste atómico de stock con row-level lock.
     * Este es el handler más crítico del sistema — protege
     * contra sobrevendimiento con lockForUpdate().
     */
    private function handleItemAdjustStock(array $event): void
    {
        $p = $event['payload'];

        $item = Item::where('id', $p['item_id'])
            ->lockForUpdate()
            ->firstOrFail();

        $delta    = (float) $p['delta'];
        $newStock = (float) $item->stock + $delta;

        if ($newStock < 0) {
            throw new InsufficientStockException(
                item: $item,
                requested: abs($delta),
                available: (float) $item->stock,
            );
        }

        $item->update(['stock' => $newStock]);

        Log::info("[Sync] Stock ajustado: {$item->name} ({$item->id}) delta={$delta} nuevo_stock={$newStock}");
    }

    // ── SALE PAYMENT (ABONOS / FIADOS) ──────────────────────────────

    private function handleSalePaymentCreate(array $event): void
    {
        $p = $event['payload'];

        // Crear el registro del abono
        $payment = SalePayment::create([
            'id'             => $p['id'],
            'tenant_id'      => $event['tenant_id'],
            'sale_id'        => $p['sale_id'],
            'amount'         => $p['amount'],
            'payment_method' => $p['payment_method'] ?? 'EFECTIVO',
            'reference'      => $p['reference'] ?? null,
            'note'           => $p['note'] ?? null,
            'paid_at'        => $p['paid_at'] ?? now(),
        ]);

        // Actualizar el monto pagado de la venta (con lock para atomicidad)
        $sale = Sale::where('id', $p['sale_id'])
            ->lockForUpdate()
            ->firstOrFail();

        $newPaidAmount = (float) $sale->paid_amount + (float) $p['amount'];
        $sale->paid_amount = $newPaidAmount;

        // Auto-cambiar status si ya se cubrió el total
        if ($newPaidAmount >= (float) $sale->total) {
            $sale->status = 'PAGADO';
            Log::info("[Sync] Fiado saldado completamente: Sale {$sale->id}");
        }

        $sale->save();
    }

    private function handleSalePaymentVoid(array $event): void
    {
        $payment = SalePayment::findOrFail($event['entity_id']);

        // Revertir el monto del abono en la venta padre
        $sale = Sale::where('id', $payment->sale_id)
            ->lockForUpdate()
            ->firstOrFail();

        $sale->paid_amount = max(0, (float) $sale->paid_amount - (float) $payment->amount);

        // Si ya no está completamente pagada, volver a FIADO
        if ((float) $sale->paid_amount < (float) $sale->total && $sale->status === 'PAGADO') {
            $sale->status = 'FIADO';
        }

        $sale->save();

        // SoftDelete del abono
        $payment->delete();
    }
}
