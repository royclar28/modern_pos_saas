<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuinielaMatch;
use App\Models\QuinielaPlayer;
use App\Models\QuinielaPrediction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class QuinielaController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:quiniela_players',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $player = QuinielaPlayer::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $player->createToken('quiniela-token')->plainTextToken;

        return response()->json([
            'player' => $player,
            'token' => $token,
        ], 201);
    }

    public function getMatches()
    {
        // Devuelve partidos ordenados por fecha ascendente
        $matches = QuinielaMatch::orderBy('match_time', 'asc')->get();

        return response()->json([
            'matches' => $matches,
        ]);
    }

    public function submitPredictions(Request $request)
    {
        $request->validate([
            'predictions' => 'required|array',
            'predictions.*.match_id' => 'required|exists:quiniela_matches,id',
            'predictions.*.predicted_score_a' => 'required|integer|min:0',
            'predictions.*.predicted_score_b' => 'required|integer|min:0',
        ]);

        $player = $request->user();

        foreach ($request->predictions as $prediction) {
            QuinielaPrediction::updateOrCreate(
                [
                    'player_id' => $player->id,
                    'match_id' => $prediction['match_id'],
                ],
                [
                    'predicted_score_a' => $prediction['predicted_score_a'],
                    'predicted_score_b' => $prediction['predicted_score_b'],
                ]
            );
        }

        return response()->json([
            'message' => 'Predictions submitted successfully.'
        ]);
    }
}
