<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $types = [
            ['code' => '01', 'name' => 'FACTURA', 'description' => 'FACTURA, DOCUMENTO FISCAL SENIAT'],
            ['code' => '02', 'name' => 'NOTA DE CREDITO', 'description' => 'NOTA DE CREDITO, DOCUMENTO FISCAL SENIAT'],
            ['code' => '03', 'name' => 'NOTA DE DEBITO', 'description' => 'NOTA DE DEBITO, DOCUMENTO FISCAL SENIAT'],
            ['code' => '04', 'name' => 'GUIA DE DESPACHO', 'description' => 'GUIA DE DESPACHO, DOCUMENTO FISCAL SENIAT'],
        ];

        foreach ($types as $type) {
            DB::table('fiscal_document_types')->insert([
                'id' => Str::uuid(),
                'code' => $type['code'],
                'name' => $type['name'],
                'description' => $type['description'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('fiscal_document_types')->whereIn('code', ['01', '02', '03', '04'])->delete();
    }
};
