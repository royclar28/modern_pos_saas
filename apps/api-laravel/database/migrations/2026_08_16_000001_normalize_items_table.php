<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add category_id and brand_id to items
        Schema::table('items', function (Blueprint $table) {
            $table->uuid('category_id')->nullable()->after('category');
            $table->uuid('brand_id')->nullable()->after('category_id');
        });

        // 2. Migrate existing categories
        $items = DB::table('items')->select('tenant_id', 'category')->whereNotNull('category')->distinct()->get();
        foreach ($items as $item) {
            $catName = trim($item->category);
            if (empty($catName)) continue;

            $existing = DB::table('categories')
                ->where('tenant_id', $item->tenant_id)
                ->where('name', $catName)
                ->first();

            $catId = $existing ? $existing->id : (string) Str::uuid();

            if (!$existing) {
                DB::table('categories')->insert([
                    'id' => $catId,
                    'tenant_id' => $item->tenant_id,
                    'name' => $catName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('items')
                ->where('tenant_id', $item->tenant_id)
                ->where('category', $item->category)
                ->update(['category_id' => $catId]);
        }

        // 3. Drop old category column and add foreign keys
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('category');
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
            $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();
            $table->index(['tenant_id', 'category_id']);
            $table->index(['tenant_id', 'brand_id']);
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('category', 100)->nullable()->after('name');
            $table->dropForeign(['category_id']);
            $table->dropForeign(['brand_id']);
            $table->dropIndex(['tenant_id', 'category_id']);
            $table->dropIndex(['tenant_id', 'brand_id']);
        });

        // Try to restore strings from categories
        DB::statement('
            UPDATE items i
            JOIN categories c ON i.category_id = c.id
            SET i.category = c.name
        ');

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('category_id');
            $table->dropColumn('brand_id');
        });
    }
};
