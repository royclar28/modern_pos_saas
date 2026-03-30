<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id', 100)->index();
            $table->string('user_id', 100)->index();
            $table->string('terminal_id', 50)->default('CAJA_01');

            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();

            $table->decimal('starting_cash', 12, 2)->default(0);   // Fondo de caja
            $table->decimal('expected_cash', 12, 2)->default(0);   // Calculado: starting_cash + ventas_efectivo
            $table->decimal('actual_cash', 12, 2)->nullable();      // Conteo físico del cajero
            $table->decimal('difference', 12, 2)->nullable();       // actual_cash - expected_cash

            $table->enum('status', ['OPEN', 'CLOSED'])->default('OPEN');
            $table->json('sales_summary')->nullable();              // Resumen por método de pago

            $table->timestamps();
            $table->softDeletes();

            // Un usuario solo puede tener un turno abierto a la vez
            $table->unique(['tenant_id', 'user_id', 'status'], 'unique_open_shift');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_shifts');
    }
};
