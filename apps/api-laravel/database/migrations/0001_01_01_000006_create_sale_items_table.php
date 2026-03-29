<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sale_id');
            $table->uuid('item_id');
            $table->integer('line')->default(0);
            $table->string('description')->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->decimal('quantity_purchased', 15, 2)->default(0);
            $table->decimal('item_cost_price', 15, 2);
            $table->decimal('item_unit_price', 15, 2);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
            $table->foreign('item_id')->references('id')->on('items');
            $table->index('tenant_id');
            $table->unique(['sale_id', 'item_id', 'line']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
