<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role'         => \App\Http\Middleware\RoleMiddleware::class,
            'trial'        => \App\Http\Middleware\CheckTrialStatus::class,
            'touch.session'=> \App\Http\Middleware\TouchSessionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ── JSON API: siempre devolver JSON, nunca HTML ──────────
        $exceptions->shouldRenderJsonWhen(function (\Illuminate\Http\Request $request) {
            return $request->expectsJson() || $request->is('api/*');
        });

        // ── Respuesta de error consistente ─────────────────────
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                $status = method_exists($e, 'getStatusCode')
                    ? $e->getStatusCode()
                    : ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface
                        ? $e->getStatusCode()
                        : 500);

                return response()->json([
                    'status'  => 'error',
                    'message' => $e->getMessage(),
                    'trace'   => $e->getTraceAsString(),
                    'code'    => $status,
                ], $status);
            }
        });
    })->create();
