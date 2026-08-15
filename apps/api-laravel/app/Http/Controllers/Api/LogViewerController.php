<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class LogViewerController extends Controller
{
    public function getLogs(Request $request)
    {
        $logPath = storage_path('logs/laravel.log');
        
        if (!File::exists($logPath)) {
            return response()->json([
                'status' => 'ok',
                'logs' => "No se encontró el archivo laravel.log o está vacío.\n"
            ]);
        }

        // Leer las últimas 500 líneas
        $file = file($logPath);
        if (!$file) {
            return response()->json(['logs' => "Error al leer laravel.log"]);
        }

        $lines = array_slice($file, -500);
        return response()->json([
            'status' => 'ok',
            'logs' => implode("", $lines)
        ]);
    }

    public function clearLogs(Request $request)
    {
        $logPath = storage_path('logs/laravel.log');
        
        if (File::exists($logPath)) {
            File::put($logPath, ""); // Vaciamos el archivo
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Logs limpiados correctamente.'
        ]);
    }
}
