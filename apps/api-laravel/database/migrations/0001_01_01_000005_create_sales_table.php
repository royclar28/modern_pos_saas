<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('invoice_number', 50)->nullable();
            $table->text('comment')->nullable();
            $table->timestamp('sale_time')->useCurrent();
            $table->string('terminal_id', 30)->default('CAJA_01');

            // Relations
            $table->uuid('customer_id')->nullable();
            $table->unsignedBigInteger('employee_id');

            // Financial
            $table->string('payment_method', 30)->default('DIVISA');
            $table->string('status', 20)->default('PAGADO'); // PAGADO, FIADO, ANULADO
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_percent', 5, 2)->default(16);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('amount_received', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->string('reference')->nullable(); // Ref de pago móvil, etc.
            $table->timestamp('due_date')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('employee_id')->references('id')->on('users');
            $table->index('tenant_id');
            $table->index(['tenant_id', 'sale_time']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'employee_id', 'sale_time']);
            $table->unique(['tenant_id', 'invoice_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
