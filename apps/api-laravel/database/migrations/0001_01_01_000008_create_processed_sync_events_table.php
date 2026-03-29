<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla de idempotencia para el endpoint POST /api/sync/events.
     *
     * Cada event_id que el frontend envía se registra aquí al ser procesado.
     * Si el Drain Loop reintenta un batch, los event_id que ya existan aquí
     * se ignoran silenciosamente (idempotencia garantizada).
     */
    public function up(): void
    {
        Schema::create('processed_sync_events', function (Blueprint $table) {
            $table->uuid('event_id')->primary();
            $table->uuid('tenant_id');
            $table->string('entity_type', 30);   // CUSTOMER, SALE, ITEM, SALE_PAYMENT
            $table->string('action', 30);          // CREATE, UPDATE, DELETE, ADJUST_STOCK, VOID
            $table->uuid('entity_id');
            $table->timestamp('occurred_at');       // Timestamp del cliente (cuándo el usuario hizo la acción)
            $table->timestamp('processed_at')->useCurrent(); // Cuándo el backend lo procesó
            $table->string('status', 20)->default('OK');     // OK, FAILED, SKIPPED
            $table->text('error_message')->nullable();

            $table->foreign('tenant_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->index('tenant_id');
            $table->index(['tenant_id', 'entity_type', 'entity_id']);
            $table->index(['tenant_id', 'processed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processed_sync_events');
    }
};
