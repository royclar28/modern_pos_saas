<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // 1. Añadir CHECK constraints a la tabla sales
            DB::statement('ALTER TABLE sales ADD CONSTRAINT sales_total_check CHECK (total >= 0);');
            DB::statement('ALTER TABLE sales ADD CONSTRAINT sales_subtotal_check CHECK (subtotal >= 0);');
            DB::statement('ALTER TABLE sales ADD CONSTRAINT sales_paid_amount_check CHECK (paid_amount >= 0);');

            // 2. Añadir CHECK constraints a la tabla sale_items
            DB::statement('ALTER TABLE sale_items ADD CONSTRAINT sale_items_quantity_purchased_check CHECK (quantity_purchased > 0);');
            DB::statement('ALTER TABLE sale_items ADD CONSTRAINT sale_items_item_unit_price_check CHECK (item_unit_price >= 0);');

            // 3. Añadir índice GIN a la tabla cash_shifts para optimizar JSON
            Schema::table('cash_shifts', function (Blueprint $table) {
                $table->index('sales_summary', 'cash_shifts_sales_summary_gin', 'gin');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Revertir el índice GIN
            Schema::table('cash_shifts', function (Blueprint $table) {
                $table->dropIndex('cash_shifts_sales_summary_gin');
            });

            // Revertir CHECK constraints de sale_items
            DB::statement('ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_quantity_purchased_check;');
            DB::statement('ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_unit_price_check;');

            // Revertir CHECK constraints de sales
            DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_total_check;');
            DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_subtotal_check;');
            DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_paid_amount_check;');
        }
    }
};
