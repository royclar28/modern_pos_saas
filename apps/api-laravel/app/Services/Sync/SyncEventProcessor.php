<?php

namespace App\Services\Sync;

use App\Exceptions\InsufficientStockException;
use App\Models\CashShift;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ProcessedSyncEvent;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Services\AuditService;
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
    public function __construct(
        private readonly AuditService $audit
    ) {}
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

        // ─── 0. Tenant Isolation — Blindaje por autenticación ─────────
        // El tenant_id que llega en el payload se ignora completamente.
        // Siempre usamos el tenant del usuario autenticado en la request.
        // Esto previene ataques de inyección cross-tenant (Hallazgo #10).
        $authenticatedTenantId = auth()->user()?->tenant_id;
        if ($authenticatedTenantId) {
            $event['tenant_id'] = $authenticatedTenantId;
        }

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
                // UPDATE es el alias que envía el frontend (FiadosPage usa action=UPDATE),
                // ambos crean un nuevo registro de abono porque no hay payment_id previo.
                'SALE_PAYMENT:CREATE' => $this->handleSalePaymentCreate($event),
                'SALE_PAYMENT:UPDATE' => $this->handleSalePaymentCreate($event),
                'SALE_PAYMENT:VOID'   => $this->handleSalePaymentVoid($event),

                // ── Cash Shifts (Turnos de Caja) ─────────────────────
                'SHIFT:OPEN'  => $this->handleShiftOpen($event),
                'SHIFT:CLOSE' => $this->handleShiftClose($event),

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

        // ── Pre-validación de stock (defensa en profundidad) ─────────────────
        if (!empty($p['items'])) {
            foreach ($p['items'] as $lineItem) {
                $itemId = $lineItem['item_id'] ?? $lineItem['itemId'] ?? null;
                if (!$itemId) continue;

                $item = Item::where('id', $itemId)
                    ->lockForUpdate()
                    ->first();

                if (!$item) continue;

                $qty = (float) ($lineItem['quantity_purchased'] ?? $lineItem['quantity'] ?? 0);
                if ((float) $item->stock < $qty) {
                    throw new InsufficientStockException(
                        item: $item,
                        requested: $qty,
                        available: (float) $item->stock,
                    );
                }
            }
        }

        // Crear la cabecera de la venta
        $saleTime = $p['sale_time'] ?? $p['saleTime'] ?? now();
        
        // Resolver employee_id si viene como string (username) en lugar de ID numérico
        $employeeId = $p['employee_id'] ?? $p['employeeId'] ?? null;
        if ($employeeId && !is_numeric($employeeId)) {
            $user = \App\Models\User::where('username', $employeeId)
                ->where('tenant_id', $event['tenant_id'])
                ->first();
            $employeeId = $user ? $user->id : null;
        }

        $sale = Sale::create([
            'id'              => $p['id'],
            'tenant_id'       => $event['tenant_id'],
            'customer_id'     => $p['customer_id'] ?? $p['customerId'] ?? null,
            'employee_id'     => $employeeId,
            'terminal_id'     => $p['terminal_id'] ?? $p['terminalId'] ?? 'CAJA_01',
            'sale_time'       => is_numeric($saleTime) ? date('Y-m-d H:i:s', $saleTime/1000) : $saleTime,
            'invoice_number'  => $p['invoice_number'] ?? $p['invoiceNumber'] ?? null,
            'comment'         => $p['comment'] ?? null,
            'status'          => $p['status'] ?? 'PAGADO',
            'payment_method'  => $p['payment_method'] ?? $p['paymentMethod'] ?? 'DIVISA',
            'subtotal'        => $p['subtotal'] ?? 0,
            'tax_percent'     => $p['tax_percent'] ?? $p['taxPercent'] ?? 0,
            'tax_amount'      => $p['tax_amount'] ?? $p['taxAmount'] ?? 0,
            'total'           => $p['total'] ?? 0,
            'paid_amount'     => $p['paid_amount'] ?? $p['paidAmount'] ?? $p['amountReceived'] ?? 0,
            'amount_received' => $p['amount_received'] ?? $p['amountReceived'] ?? 0,
            'change_amount'   => $p['change_amount'] ?? $p['changeAmount'] ?? 0,
            'reference'       => $p['reference'] ?? null,
            'due_date'        => $p['due_date'] ?? $p['dueDate'] ?? null,
        ]);

        // Crear las líneas de detalle (items de la venta)
        if (!empty($p['items'])) {
            $line = 1;
            foreach ($p['items'] as $lineItem) {
                SaleItem::create([
                    'id'                => $lineItem['id'] ?? (string) \Illuminate\Support\Str::uuid(),
                    'tenant_id'         => $event['tenant_id'],
                    'sale_id'           => $sale->id,
                    'item_id'           => $lineItem['item_id'] ?? $lineItem['itemId'] ?? null,
                    'line'              => $lineItem['line'] ?? $line++,
                    'description'       => $lineItem['description'] ?? null,
                    'serial_number'     => $lineItem['serial_number'] ?? $lineItem['serialNumber'] ?? null,
                    'quantity_purchased'=> $lineItem['quantity_purchased'] ?? $lineItem['quantity'] ?? 0,
                    'item_cost_price'   => $lineItem['item_cost_price'] ?? $lineItem['costPrice'] ?? 0,
                    'item_unit_price'   => $lineItem['item_unit_price'] ?? $lineItem['unitPrice'] ?? 0,
                    'discount_percent'  => $lineItem['discount_percent'] ?? $lineItem['discountPercent'] ?? 0,
                ]);
            }
        }

        // ── Generar documento fiscal si aplica ──────────────────────
        $activeResolution = \App\Models\FiscalResolution::where('tenant_id', $event['tenant_id'])
            ->where('is_active', true)
            ->lockForUpdate()
            ->first();

        if ($activeResolution && $activeResolution->current_number <= $activeResolution->to_number) {
            $controlNumber = $activeResolution->prefix . str_pad($activeResolution->current_number, 8, '0', STR_PAD_LEFT);

            \App\Models\SaleFiscalDocument::create([
                'tenant_id' => $event['tenant_id'],
                'sale_id' => $sale->id,
                'document_type_id' => $activeResolution->document_type_id,
                'resolution_id' => $activeResolution->id,
                'control_number' => $controlNumber,
                'status' => 'EMITIDO',
            ]);

            $activeResolution->increment('current_number');
        }
    }

    private function handleSaleVoid(array $event): void
    {
        $sale = Sale::where('id', $event['entity_id'])
            ->lockForUpdate()
            ->firstOrFail();

        // Idempotencia: si ya está anulada, no hacer nada
        if ($sale->status === 'ANULADO') {
            Log::warning("[Sync] Venta {$sale->id} ya estaba anulada — skip");
            return;
        }

        $oldStatus = $sale->status;
        $sale->update(['status' => 'ANULADO']);

        // Revertir stock de cada línea (devolver al inventario)
        foreach ($sale->saleItems as $saleItem) {
            $item = Item::where('id', $saleItem->item_id)
                ->lockForUpdate()
                ->first();

            if ($item) {
                // Delta positivo = devolver al inventario
                $item->adjustStock((float) $saleItem->quantity_purchased);
            }
        }

        // ── Auditoría ───────────────────────────────────────────
        $this->audit->log(
            entityType: 'sale',
            entityId: $sale->id,
            action: 'VOID',
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'ANULADO'],
            metadata: [
                'items_count' => $sale->saleItems->count(),
                'total'       => (float) $sale->total,
            ],
        );

        Log::info("[Sync] Venta anulada: {$sale->id}");
    }

    // ── ITEM (INVENTORY) ────────────────────────────────────────────

    private function handleItemCreate(array $event): void
    {
        $p = $event['payload'];

        Item::create([
            'id'                   => $p['id'],
            'tenant_id'            => $event['tenant_id'],
            'name'                 => $p['name'],
            'category_id'          => $p['category_id'] ?? null,
            'brand_id'             => $p['brand_id'] ?? null,
            'item_number'          => $p['itemNumber'] ?? null,
            'description'          => $p['description'] ?? null,
            'cost_price'           => $p['costPrice'] ?? 0,
            'unit_price'           => $p['unitPrice'] ?? 0,
            'stock'                => $p['stock'] ?? $p['receivingQuantity'] ?? 0,
            'reorder_level'         => $p['reorderLevel'] ?? 0,
            'min_stock_alert'        => $p['minStockAlert'] ?? null,
            'receiving_quantity'     => $p['receivingQuantity'] ?? 1,
            'allow_alt_description'=> $p['allowAltDescription'] ?? false,
            'is_serialized'        => $p['isSerialized'] ?? false,
            'sell_by'              => $p['sellBy'] ?? 'unit',   // ← NUEVO
            'unit_label'           => $p['unitLabel'] ?? 'und',
        ]);
    }

    private function handleItemUpdate(array $event): void
    {
        $p = $event['payload'];
        $item = Item::findOrFail($event['entity_id']);

        // Construir array de campos a actualizar
        $fields = array_filter([
            'name'                 => $p['name'] ?? null,
            'category_id'          => $p['category_id'] ?? null,
            'brand_id'             => $p['brand_id'] ?? null,
            'item_number'          => $p['itemNumber'] ?? null,
            'description'          => $p['description'] ?? null,
            'cost_price'           => $p['costPrice'] ?? null,
            'unit_price'           => $p['unitPrice'] ?? null,
            'reorder_level'        => $p['reorderLevel'] ?? null,
            'receiving_quantity'   => $p['receivingQuantity'] ?? null,
            'stock'                => $p['receivingQuantity'] ?? null, // Sincroniza el stock real con la cantidad del frontend
            'allow_alt_description'=> $p['allowAltDescription'] ?? null,
            'is_serialized'        => $p['isSerialized'] ?? null,
            'sell_by'              => $p['sellBy'] ?? null,     // ← NUEVO
            'unit_label'           => $p['unitLabel'] ?? null,
        ], fn ($v) => $v !== null);

        // min_stock_alert puede ser null intencionalmente (borrar alerta),
        // por eso no va dentro del array_filter
        if (array_key_exists('minStockAlert', $p)) {
            $fields['min_stock_alert'] = $p['minStockAlert'];
        }

        $item->update($fields);
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

        $itemId = $p['item_id'] ?? $p['itemId'] ?? $p['id'] ?? null;
        $delta  = (float) ($p['delta'] ?? $p['receivingQuantity'] ?? 0);

        if (!$itemId) {
            throw new \InvalidArgumentException("Missing item id in ADJUST_STOCK payload.");
        }

        $item = Item::where('id', $itemId)
            ->lockForUpdate()
            ->firstOrFail();

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

        // ── Normalizar campos: el frontend envía camelCase (saleId, method),
        //     mientras que otros orígenes pueden enviar snake_case (sale_id, payment_method).
        $saleId        = $p['sale_id'] ?? $p['saleId'] ?? null;
        $paymentMethod = $p['payment_method'] ?? $p['method'] ?? 'EFECTIVO';
        $amount        = (float) $p['amount'];
        $paymentId     = $p['id'] ?? (string) \Illuminate\Support\Str::uuid();

        if (!$saleId || $amount <= 0) {
            throw new \InvalidArgumentException('sale_id/saleId y amount > 0 son requeridos para un abono');
        }

        // Crear el registro del abono (con user_id del autenticado)
        $payment = SalePayment::create([
            'id'             => $paymentId,
            'tenant_id'      => $event['tenant_id'],
            'user_id'        => auth()->id(),
            'sale_id'        => $saleId,
            'amount'         => $amount,
            'payment_method' => $paymentMethod,
            'reference'      => $p['reference'] ?? null,
            'note'           => $p['note'] ?? null,
            'paid_at'        => $p['paid_at'] ?? now(),
        ]);

        // Actualizar el monto pagado de la venta (con lock para atomicidad)
        $sale = Sale::where('id', $saleId)
            ->lockForUpdate()
            ->firstOrFail();

        $oldStatus = $sale->status;
        $oldPaid = (float) $sale->paid_amount;

        $newPaidAmount = $oldPaid + $amount;
        $sale->paid_amount = $newPaidAmount;

        // Auto-cambiar status si ya se cubrió el total
        if ($newPaidAmount >= (float) $sale->total) {
            $sale->status = 'PAGADO';
            Log::info("[Sync] Fiado saldado completamente: Sale {$sale->id}");
        }

        $sale->save();

        // ── Auditoría ───────────────────────────────────────────
        $this->audit->log(
            entityType: 'sale_payment',
            entityId: $paymentId,
            action: 'CREATE',
            metadata: [
                'sale_id'        => $saleId,
                'amount'         => $amount,
                'payment_method' => $paymentMethod,
                'sale_old_paid'  => $oldPaid,
                'sale_new_paid'  => $newPaidAmount,
                'sale_old_status'=> $oldStatus,
                'sale_new_status'=> $sale->status,
                'reference'      => $p['reference'] ?? null,
            ],
        );
    }

    private function handleSalePaymentVoid(array $event): void
    {
        $payment = SalePayment::findOrFail($event['entity_id']);

        // Revertir el monto del abono en la venta padre
        $sale = Sale::where('id', $payment->sale_id)
            ->lockForUpdate()
            ->firstOrFail();

        $oldPaid = (float) $sale->paid_amount;
        $oldStatus = $sale->status;

        $sale->paid_amount = max(0, $oldPaid - (float) $payment->amount);

        // Si ya no está completamente pagada, volver a FIADO
        if ((float) $sale->paid_amount < (float) $sale->total && $oldStatus === 'PAGADO') {
            $sale->status = 'FIADO';
        }

        $sale->save();

        // SoftDelete del abono
        $payment->delete();

        // ── Auditoría ───────────────────────────────────────────
        $this->audit->log(
            entityType: 'sale_payment',
            entityId: $payment->id,
            action: 'VOID',
            oldValues: [
                'amount'         => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
            ],
            newValues: ['deleted_at' => now()->toISOString()],
            metadata: [
                'sale_id'        => $payment->sale_id,
                'sale_old_paid'  => $oldPaid,
                'sale_new_paid'  => (float) $sale->paid_amount,
                'sale_old_status'=> $oldStatus,
                'sale_new_status'=> $sale->status,
            ],
        );

        Log::info("[Sync] Abono anulado: {$payment->id} — Sale {$payment->sale_id} ajustado");
    }

    // ── CASH SHIFTS (TURNOS DE CAJA) ────────────────────────────────

    private function handleShiftOpen(array $event): void
    {
        $p = $event['payload'];

        $userId = $p['user_id'] ?? null;
        if ($userId && !is_numeric($userId)) {
            $user = \App\Models\User::where('username', $userId)
                ->where('tenant_id', $event['tenant_id'])
                ->first();
            $userId = $user ? $user->id : null;
        }

        CashShift::create([
            'id'            => $p['id'],
            'tenant_id'     => $event['tenant_id'],
            'user_id'       => $userId ?? $p['user_id'],
            'terminal_id'   => $p['terminal_id'] ?? 'CAJA_01',
            'opened_at'     => $p['opened_at'],
            'starting_cash' => $p['starting_cash'],
            'status'        => 'OPEN',
        ]);

        Log::info("[Sync] Turno abierto: {$p['id']} por usuario {$p['user_id']}");
    }

    private function handleShiftClose(array $event): void
    {
        $p = $event['payload'];

        $shift = CashShift::where('id', $p['shift_id'])
            ->lockForUpdate()
            ->firstOrFail();

        if (!$shift->isOpen()) {
            Log::warning("[Sync] Turno {$p['shift_id']} ya estaba cerrado — skip");
            return;
        }

        $shift->close(
            actualCash: (float) $p['actual_cash'],
            expectedCash: (float) $p['expected_cash'],
            salesSummary: $p['sales_summary'] ?? null,
        );

        Log::info("[Sync] Turno cerrado: {$p['shift_id']} — Diferencia: {$shift->difference}");
    }
}
