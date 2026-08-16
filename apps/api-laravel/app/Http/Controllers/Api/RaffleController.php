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
    public function index()
    {
        $raffles = Raffle::orderBy('created_at', 'desc')->get();
        return response()->json($raffles);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'draw_date'             => 'nullable|date',
            'starts_at'             => 'nullable|date',
            'winner_claim_minutes'  => 'nullable|integer|min:1|max:60',
            'status'                => 'nullable|string|in:draft,active,completed',
        ]);

        $raffle = Raffle::create([
            'name'                  => $validated['name'],
            'draw_date'             => $validated['draw_date'] ?? null,
            'starts_at'             => $validated['starts_at'] ?? null,
            'winner_claim_minutes'  => $validated['winner_claim_minutes'] ?? null,
            'status'                => $validated['status'] ?? 'draft',
        ]);

        return response()->json($raffle, 201);
    }

    public function show($id)
    {
        $raffle = Raffle::with(['prizes', 'participants'])->findOrFail($id);
        return response()->json($raffle);
    }

    public function update(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name'                  => 'sometimes|required|string|max:255',
            'draw_date'             => 'nullable|date',
            'starts_at'             => 'nullable|date',
            'winner_claim_minutes'  => 'nullable|integer|min:1|max:60',
            'status'                => 'sometimes|required|string|in:draft,active,completed',
        ]);

        $raffle->update($validated);

        return response()->json($raffle);
    }

    public function destroy($id)
    {
        $raffle = Raffle::findOrFail($id);
        $raffle->delete();
        return response()->json(['message' => 'Raffle deleted successfully']);
    }

    public function addPrize(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'position'    => 'required|integer|min:1',
        ]);

        $prize = $raffle->prizes()->create($validated);

        return response()->json($prize, 201);
    }

    public function addParticipant(Request $request, $id)
    {
        $raffle = Raffle::findOrFail($id);

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
        ]);

        $participant = $raffle->participants()->create($validated);

        return response()->json($participant, 201);
    }

    /**
     * Draw a winner for a specific prize.
     */
    public function drawWinner(Request $request, $id, $prizeId)
    {
        $raffle = Raffle::findOrFail($id);
        $prize  = $raffle->prizes()->findOrFail($prizeId);

        if ($prize->winner_participant_id) {
            return response()->json(['message' => 'Este premio ya tiene un ganador.'], 422);
        }

        $alreadyWonIds = $raffle->prizes()
            ->whereNotNull('winner_participant_id')
            ->pluck('winner_participant_id');

        $winner = $raffle->participants()
            ->whereNotIn('id', $alreadyWonIds)
            ->inRandomOrder()
            ->first();

        if (!$winner) {
            return response()->json(['message' => 'No hay participantes disponibles para sortear.'], 422);
        }

        $prize->update(['winner_participant_id' => $winner->id]);

        // Guardar timestamp de cuándo se sorteó
        $raffle->update(['winner_drawn_at' => now()]);

        return response()->json([
            'prize'  => $prize,
            'winner' => $winner,
        ]);
    }

    /**
     * Re-draw: reset the current winner and pick a new one.
     * Called when winner doesn't claim in time.
     */
    public function redrawWinner(Request $request, $id, $prizeId)
    {
        $raffle = Raffle::findOrFail($id);
        $prize  = $raffle->prizes()->findOrFail($prizeId);

        // Quitar al ganador actual
        $prize->update(['winner_participant_id' => null]);

        // Los ya ganadores de otros premios siguen excluidos
        $alreadyWonIds = $raffle->prizes()
            ->whereNotNull('winner_participant_id')
            ->pluck('winner_participant_id');

        $winner = $raffle->participants()
            ->whereNotIn('id', $alreadyWonIds)
            ->inRandomOrder()
            ->first();

        if (!$winner) {
            return response()->json(['message' => 'No hay participantes disponibles para sortear.'], 422);
        }

        $prize->update(['winner_participant_id' => $winner->id]);
        $raffle->update(['winner_drawn_at' => now()]);

        return response()->json([
            'prize'   => $prize->fresh(),
            'winner'  => $winner,
            'redrawn' => true,
        ]);
    }
}
