<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Plan — Niveles de suscripción con feature gating.
 *
 * Precios (referencia, cobro manual hasta integrar pasarela):
 *   BASIC      → $5/mes
 *   STANDARD   → $10/mes
 *   PRO        → $20/mes
 *   ENTERPRISE → $50/mes
 *
 * Control de dispositivos:
 *   Cada login desde un dispositivo nuevo (IP + navegador distinto)
 *   cuenta como un "device" activo. Si se alcanza el límite,
 *   no se permiten nuevos logins desde dispositivos no vistos.
 *   Mismo dispositivo = mismo fingerprint → no consume cupo extra.
 */
enum Plan: string
{
    case TRIAL     = 'TRIAL';
    case BASIC     = 'BASIC';
    case STANDARD  = 'STANDARD';
    case PRO       = 'PRO';
    case ENTERPRISE = 'ENTERPRISE';

    // ─── Metadata ──────────────────────────────────────────

    public function label(): string
    {
        return match ($this) {
            self::TRIAL     => 'Prueba 30 días',
            self::BASIC     => 'Básico',
            self::STANDARD  => 'Estándar',
            self::PRO       => 'Profesional',
            self::ENTERPRISE => 'Empresarial',
        };
    }

    public function price(): int
    {
        return match ($this) {
            self::TRIAL     => 0,
            self::BASIC     => 5,
            self::STANDARD  => 10,
            self::PRO       => 20,
            self::ENTERPRISE => 50,
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::TRIAL     => 'amber',
            self::BASIC     => 'teal',
            self::STANDARD  => 'blue',
            self::PRO       => 'violet',
            self::ENTERPRISE => 'slate',
        };
    }

    // ─── Feature Limits ────────────────────────────────────

    /** Máximo de dispositivos simultáneos (sesiones activas con fingerprint distinto) */
    public function maxDevices(): int
    {
        return match ($this) {
            self::TRIAL     => 1,
            self::BASIC     => 1,
            self::STANDARD  => 1,
            self::PRO       => 3,
            self::ENTERPRISE => 10,
        };
    }

    /** Máximo de usuarios (incluye ADMIN) */
    public function maxUsers(): int
    {
        return match ($this) {
            self::TRIAL     => 3,
            self::BASIC     => 3,
            self::STANDARD  => 5,
            self::PRO       => 10,
            self::ENTERPRISE => 999,
        };
    }

    /** Máximo de productos en catálogo */
    public function maxItems(): int
    {
        return match ($this) {
            self::TRIAL     => 300,
            self::BASIC     => 500,
            self::STANDARD  => 2_000,
            self::PRO       => 10_000,
            self::ENTERPRISE => 999_999,
        };
    }

    /** ¿Permite ventas a crédito (fiados)? */
    public function allowsCreditSales(): bool
    {
        return match ($this) {
            self::TRIAL     => false,
            self::BASIC     => false,
            self::STANDARD  => true,
            self::PRO       => true,
            self::ENTERPRISE => true,
        };
    }

    /**
     * Métodos de pago permitidos.
     * BASIC solo permite PAGO_MOVIL (sin punto, sin divisa).
     */
    public function allowedPaymentMethods(): array
    {
        return match ($this) {
            self::TRIAL     => ['DIVISA', 'EFECTIVO_BS', 'PAGO_MOVIL', 'PUNTO'],
            self::BASIC     => ['EFECTIVO_BS', 'PAGO_MOVIL'],          // sin divisa ni punto
            self::STANDARD  => ['DIVISA', 'EFECTIVO_BS', 'PAGO_MOVIL', 'PUNTO'],
            self::PRO       => ['DIVISA', 'EFECTIVO_BS', 'PAGO_MOVIL', 'PUNTO'],
            self::ENTERPRISE => ['DIVISA', 'EFECTIVO_BS', 'PAGO_MOVIL', 'PUNTO'],
        };
    }

    /** ¿Permite reportes avanzados? */
    public function allowsAdvancedReports(): bool
    {
        return match ($this) {
            self::TRIAL     => false,
            self::BASIC     => false,
            self::STANDARD  => false,
            self::PRO       => true,
            self::ENTERPRISE => true,
        };
    }
}
