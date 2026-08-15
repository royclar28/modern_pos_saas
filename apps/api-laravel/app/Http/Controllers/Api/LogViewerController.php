<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class LogViewerController extends Controller
{
    public function getLogs(Request $request)
    {
        Log::info('Test log entry to confirm logging works.');

        $logFiles = File::files(storage_path('logs'));
        $allLogs = "";

        foreach ($logFiles as $file) {
            $allLogs .= "--- File: " . $file->getFilename() . " ---\n";
            $allLogs .= File::get($file->getPathname()) . "\n\n";
        }

        return response()->json([
            'status' => 'ok',
            'logs' => $allLogs
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
