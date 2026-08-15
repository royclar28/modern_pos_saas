<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Raffle;
use Illuminate\Http\Request;

class PublicRaffleController extends Controller
{
    /**
     * Get raffle details for the public live draw screen.
     */
    public function show($id)
    {
        // Al no estar autenticado, TenantScope no se aplicará,
        // pero como buscamos por UUID, no hay riesgo de cruce de datos.
        $raffle = Raffle::with([
            'prizes', 
            // Ocultamos el teléfono de los participantes en la API pública por privacidad, 
            // solo necesitamos el nombre y el número de ticket para la animación.
            'participants' => function($query) {
                $query->select('id', 'raffle_id', 'name', 'ticket_number');
            }
        ])->findOrFail($id);

        if ($raffle->status !== 'active' && $raffle->status !== 'completed') {
            return response()->json(['message' => 'El sorteo no está disponible públicamente.'], 403);
        }

        return response()->json($raffle);
    }
}
