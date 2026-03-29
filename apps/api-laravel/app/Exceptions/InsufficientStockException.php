<?php

namespace App\Exceptions;

use App\Models\Item;
use RuntimeException;

/**
 * Se lanza cuando se intenta descontar más stock del disponible.
 * El EventProcessor atrapa esta excepción y marca el evento como FAILED.
 */
class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public readonly Item $item,
        public readonly float $requested,
        public readonly float $available,
    ) {
        parent::__construct(
            "Stock insuficiente para '{$item->name}' (ID: {$item->id}). " .
            "Solicitado: {$requested}, Disponible: {$available}"
        );
    }
}
