<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Raffle;
use App\Models\RaffleParticipant;
use App\Models\RafflePrize;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RaffleController extends Controller
{
    /**
     * Get all raffles for the current tenant.
     */
    public function index()
    {
        $raffles = Raffle::orderBy('created_at', 'desc')->get();
        return response()->json($raffles);
    }

    /**
     * Create a new raffle.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'draw_date' => 'nullable|date',
            'status' => 'nullable|string|in:draft,active,completed',
        ]);

        $raffle = Raffle::create([
            'name' => $validated['name'],
            'draw_date' => $validated['draw_date'] ?? null,
            'status' => $validated['status'] ?? 'draft',
        ]);

        return response()->json($raffle, 201);
    }

    /**
     * Get a specific raffle with prizes and participants.
     */
    public function show($id)
    {
        $raffle = Raffle::with(['prizes', 'participants'])->findOrFail($id);
        return response()->json($raffle);
    }

    /**
     * Update a raffle.
     */
    public function update(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'draw_date' => 'nullable|date',
            'status' => 'sometimes|required|string|in:draft,active,completed',
        ]);

        $raffle->update($validated);

        return response()->json($raffle);
    }

    /**
     * Delete a raffle.
     */
    public function destroy($id)
    {
        $raffle = Raffle::findOrFail($id);
        $raffle->delete();
        return response()->json(['message' => 'Raffle deleted successfully']);
    }

    /**
     * Add a prize to a raffle.
     */
    public function addPrize(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'position' => 'required|integer|min:1',
        ]);

        $prize = $raffle->prizes()->create($validated);

        return response()->json($prize, 201);
    }

    /**
     * Add a participant to a raffle.
     */
    public function addParticipant(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'ticket_number' => 'required|string|max:255',
        ]);

        // Verificar unicidad de ticket en este sorteo
        $exists = $raffle->participants()->where('ticket_number', $validated['ticket_number'])->exists();
        if ($exists) {
            return response()->json(['message' => 'El número de boleto ya está registrado en este sorteo.'], 422);
        }

        $participant = $raffle->participants()->create($validated);

        return response()->json($participant, 201);
    }

    /**
     * Draw a winner for a specific prize.
     */
    public function drawWinner(Request $request, $id, $prizeId)
    {
        $raffle = Raffle::findOrFail($id);
        $prize = $raffle->prizes()->findOrFail($prizeId);

        if ($prize->winner_participant_id) {
            return response()->json(['message' => 'Este premio ya tiene un ganador.'], 422);
        }

        // Obtener todos los IDs de los participantes que ya ganaron un premio en este sorteo
        $alreadyWonIds = $raffle->prizes()->whereNotNull('winner_participant_id')->pluck('winner_participant_id');

        // Seleccionar un participante aleatorio que no haya ganado
        $winner = $raffle->participants()
            ->whereNotIn('id', $alreadyWonIds)
            ->inRandomOrder()
            ->first();

        if (!$winner) {
            return response()->json(['message' => 'No hay participantes disponibles para sortear.'], 422);
        }

        $prize->update(['winner_participant_id' => $winner->id]);

        return response()->json([
            'prize' => $prize,
            'winner' => $winner
        ]);
    }
}
