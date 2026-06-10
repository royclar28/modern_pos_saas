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

    public function updateMatchResult(Request $request)
    {
        $user = $request->user();
        if (!$user || !isset($user->role) || !in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'MANAGER'])) {
            return response()->json(['message' => 'Unauthorized. Admin role required.'], 403);
        }

        $request->validate([
            'match_id' => 'required|exists:quiniela_matches,id',
            'real_score_a' => 'required|integer|min:0',
            'real_score_b' => 'required|integer|min:0',
        ]);

        $match = QuinielaMatch::findOrFail($request->match_id);
        
        // Update the match result
        $match->update([
            'real_score_a' => $request->real_score_a,
            'real_score_b' => $request->real_score_b,
            'status' => 'FINISHED'
        ]);

        // Calculate points
        $this->calculatePointsForMatch($match);

        return response()->json(['message' => 'Match result updated and points calculated successfully.']);
    }

    private function calculatePointsForMatch(QuinielaMatch $match)
    {
        $predictions = QuinielaPrediction::where('match_id', $match->id)->get();

        foreach ($predictions as $prediction) {
            $points = 0;
            
            $realA = $match->real_score_a;
            $realB = $match->real_score_b;
            $predA = $prediction->predicted_score_a;
            $predB = $prediction->predicted_score_b;

            // Exact match
            if ($predA === $realA && $predB === $realB) {
                $points = 3;
            } 
            // Winner match or draw match
            else {
                $realResult = $realA <=> $realB; // 1 if A wins, -1 if B wins, 0 if draw
                $predResult = $predA <=> $predB;
                
                if ($realResult === $predResult) {
                    $points = 1;
                }
            }

            if ($points > 0) {
                $prediction->update(['points_earned' => $points]);
                
                // Add points to player's total_points
                $player = QuinielaPlayer::find($prediction->player_id);
                if ($player) {
                    $player->increment('total_points', $points);
                }
            }
        }
    }

    public function getLeaderboard()
    {
        $leaderboard = QuinielaPlayer::select('first_name', 'last_name', 'total_points')
            ->orderBy('total_points', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'leaderboard' => $leaderboard
        ]);
    }
}
