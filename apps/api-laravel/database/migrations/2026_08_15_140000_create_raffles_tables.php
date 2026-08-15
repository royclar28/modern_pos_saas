<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tabla de sorteos
        Schema::create('raffles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id'); // store id
            $table->string('name');
            $table->string('status')->default('draft'); // draft, active, completed
            $table->timestamp('draw_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('stores')->onDelete('cascade');
        });

        // Tabla de premios
        Schema::create('raffle_prizes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('raffle_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('position'); // 1 = 1st prize, 2 = 2nd prize
            // El ganador se asignará durante el sorteo. 
            // Puede ser null hasta que se sortee.
            $table->uuid('winner_participant_id')->nullable(); 
            $table->timestamps();

            $table->foreign('raffle_id')->references('id')->on('raffles')->onDelete('cascade');
            // winner_participant_id foreign key se agregará después de crear la tabla de participantes
        });

        // Tabla de participantes
        Schema::create('raffle_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('raffle_id');
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('ticket_number'); // Número o boleto único
            $table->timestamps();

            $table->foreign('raffle_id')->references('id')->on('raffles')->onDelete('cascade');
            // En 3FN, cada participante es único por sorteo y ticket
            $table->unique(['raffle_id', 'ticket_number']);
        });

        // Agregamos la restricción de llave foránea para el ganador del premio
        Schema::table('raffle_prizes', function (Blueprint $table) {
            $table->foreign('winner_participant_id')->references('id')->on('raffle_participants')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raffle_prizes');
        Schema::dropIfExists('raffle_participants');
        Schema::dropIfExists('raffles');
    }
};
