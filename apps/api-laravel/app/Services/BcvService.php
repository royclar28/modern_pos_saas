<?php

declare(strict_types=1);

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * BcvService — Obtiene la tasa de cambio USD/VES desde el BCV.
 *
 * Usa web scraping con fallback a regex y caché de 2 horas.
 * Si el scraping falla y no hay caché, devuelve un fallback seguro.
 */
class BcvService
{
    private const CACHE_KEY = 'bcv_usd_rate';
    private const CACHE_TTL = 7200; // 2 horas
    private const FALLBACK_RATE = 36.5;
    private const BCV_URL = 'https://www.bcv.org.ve/';

    /**
     * Obtener la tasa BCV vigente con fallback en caché.
     *
     * @return array{rate: float, updated_at: string, source: string}
     */
    public function getRate(): array
    {
        $rateData = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->fetchFromBcv();
        });

        // Si el scraping falló pero hay datos cacheados, Cache::remember
        // devuelve el error. Lo invalidamos para el próximo intento.
        if (isset($rateData['error'])) {
            Cache::forget(self::CACHE_KEY);
        }

        return $rateData;
    }

    /**
     * Forzar refresco de tasa (ignora caché).
     */
    public function refresh(): array
    {
        Cache::forget(self::CACHE_KEY);
        return $this->getRate();
    }

    /**
     * Tasa de fallback segura cuando todo falla.
     */
    public function fallbackRate(): float
    {
        return self::FALLBACK_RATE;
    }

    // ─── Private ────────────────────────────────────────────────

    private function fetchFromBcv(): array
    {
        try {
            $response = Http::withoutVerifying()
                ->timeout(10)
                ->get(self::BCV_URL);

            if ($response->failed()) {
                throw new \RuntimeException('No se pudo conectar a la página del BCV.');
            }

            $html = $response->body();

            // ── Intento 1: DOM XPath ─────────────────────────
            $dom = new DOMDocument();
            @$dom->loadHTML($html);
            $xpath = new DOMXPath($dom);

            $nodes = $xpath->query('//div[@id="dolar"]//strong');
            if ($nodes && $nodes->length > 0) {
                $rateText = trim($nodes->item(0)->nodeValue);
                $rateFloat = (float) str_replace(',', '.', $rateText);
                if ($rateFloat > 0) {
                    return $this->success($rateFloat, 'BCV (Oficial)');
                }
            }

            // ── Intento 2: Regex fallback ─────────────────────
            if (preg_match('/<div id="dolar".*?<strong>\s*([0-9]+,[0-9]+)\s*<\/strong>/is', $html, $matches)) {
                $rateFloat = (float) str_replace(',', '.', $matches[1]);
                return $this->success($rateFloat, 'BCV (Regex)');
            }

            throw new \RuntimeException('No se encontró la tasa en el HTML del BCV.');

        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function success(float $rate, string $source): array
    {
        return [
            'rate'       => $rate,
            'updated_at' => now()->toIso8601String(),
            'source'     => $source,
        ];
    }
}
