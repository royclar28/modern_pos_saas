<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('category', 100);
            $table->string('item_number', 100)->nullable();
            $table->text('description')->nullable();
            $table->decimal('cost_price', 15, 2);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('stock', 15, 2)->default(0);
            $table->decimal('reorder_level', 15, 2)->default(0);
            $table->integer('receiving_quantity')->default(1);
            $table->boolean('allow_alt_description')->default(false);
            $table->boolean('is_serialized')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->index('tenant_id');
            $table->unique(['tenant_id', 'item_number']);
            $table->index(['tenant_id', 'category']);
            $table->index(['tenant_id', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
