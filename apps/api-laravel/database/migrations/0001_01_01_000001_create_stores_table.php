<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('primary_color', 20)->default('#3B82F6');
            $table->string('logo_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('plan', 30)->default('FREE');
            $table->string('rif', 30)->nullable();
            $table->string('owner_email')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
