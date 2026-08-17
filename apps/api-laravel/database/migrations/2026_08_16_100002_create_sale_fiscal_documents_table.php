<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_fiscal_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sale_id')->unique();
            $table->uuid('document_type_id');
            $table->uuid('resolution_id');
            $table->string('control_number');
            $table->string('status', 20)->default('EMITIDO'); // EMITIDO, ANULADO
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->foreign('document_type_id')->references('id')->on('fiscal_document_types')->onDelete('cascade');
            $table->foreign('resolution_id')->references('id')->on('fiscal_resolutions')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_fiscal_documents');
    }
};
