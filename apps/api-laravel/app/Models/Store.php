<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * Store — Entidad raíz del multi-tenant.
 * NO usa HasTenant porque ES el tenant.
 */
class Store extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    public const BUSINESS_TYPES = [
        'MINIMARKET',
        'FERRETERIA',
        'LICORERIA',
        'FARMACIA',
        'BOUTIQUE',
        'CAFETERIA',
        'OTRO',
    ];

    protected $fillable = [
        'id',
        'name',
        'business_type',
        'primary_color',
        'logo_url',
        'is_active',
        'plan',
        'plan_changed_at',
        'rif',
        'owner_email',
        'whatsapp_number',
        'catalog_enabled',
        'trial_ends_at',
        'status',
        'last_active_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'       => 'boolean',
            'catalog_enabled' => 'boolean',
            'trial_ends_at'   => 'datetime',
            'plan_changed_at' => 'datetime',
            'last_active_at'  => 'datetime',
        ];
    }

    // ─── Trial Helpers ─────────────────────────────────────

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at !== null;
    }

    public function trialHasExpired(): bool
    {
        if (!$this->isOnTrial()) {
            return false;
        }
        return now()->greaterThan($this->trial_ends_at);
    }

    public function trialDaysLeft(): int
    {
        if (!$this->isOnTrial() || $this->trialHasExpired()) {
            return 0;
        }
        return max(0, (int) now()->diffInDays($this->trial_ends_at, false));
    }



    // ─── Business Type Presets ──────────────────────────────────

    public static function defaultCategoriesFor(?string $businessType): array
    {
        return match (strtoupper($businessType ?? 'MINIMARKET')) {
            'FERRETERIA' => [
                ['name' => 'Herramientas',             'sort_order' => 1],
                ['name' => 'Tornillería y Fijaciones', 'sort_order' => 2],
                ['name' => 'Electricidad',             'sort_order' => 3],
                ['name' => 'Plomería y Tuberías',      'sort_order' => 4],
                ['name' => 'Pinturas y Acabados',      'sort_order' => 5],
            ],
            'LICORERIA' => [
                ['name' => 'Cervezas',                 'sort_order' => 1],
                ['name' => 'Licores y Destilados',     'sort_order' => 2],
                ['name' => 'Vinos y Espumantes',       'sort_order' => 3],
                ['name' => 'Refrescos y Mezcladores',  'sort_order' => 4],
                ['name' => 'Snacks y Hielo',           'sort_order' => 5],
            ],
            'FARMACIA' => [
                ['name' => 'Medicamentos',             'sort_order' => 1],
                ['name' => 'Cuidado Personal',         'sort_order' => 2],
                ['name' => 'Vitaminas y Suplementos',  'sort_order' => 3],
                ['name' => 'Primeros Auxilios',        'sort_order' => 4],
                ['name' => 'Infantil y Maternidad',    'sort_order' => 5],
            ],
            'BOUTIQUE' => [
                ['name' => 'Damas',                    'sort_order' => 1],
                ['name' => 'Caballeros',               'sort_order' => 2],
                ['name' => 'Calzado',                  'sort_order' => 3],
                ['name' => 'Accesorios y Bolsos',      'sort_order' => 4],
                ['name' => 'Ofertas y Temporada',      'sort_order' => 5],
            ],
            'CAFETERIA' => [
                ['name' => 'Café y Bebidas Calientes', 'sort_order' => 1],
                ['name' => 'Panadería y Pastelería',   'sort_order' => 2],
                ['name' => 'Comida Rápida y Combos',   'sort_order' => 3],
                ['name' => 'Bebidas Frías y Jugos',    'sort_order' => 4],
                ['name' => 'Postres y Dulces',         'sort_order' => 5],
            ],
            'OTRO' => [
                ['name' => 'General',                  'sort_order' => 1],
                ['name' => 'Destacados',               'sort_order' => 2],
                ['name' => 'Servicios',                'sort_order' => 3],
                ['name' => 'Otros',                    'sort_order' => 4],
            ],
            default => [ // MINIMARKET
                ['name' => 'Víveres y Despensa',       'sort_order' => 1],
                ['name' => 'Lácteos y Charcutería',    'sort_order' => 2],
                ['name' => 'Bebidas y Refrescos',      'sort_order' => 3],
                ['name' => 'Limpieza y Hogar',         'sort_order' => 4],
                ['name' => 'Snacks y Golosinas',       'sort_order' => 5],
            ],
        };
    }

    public static function defaultConfigsFor(?string $businessType): array
    {
        $type = strtoupper($businessType ?? 'MINIMARKET');

        return [
            'business_type'       => $type,
            'enable_credit_sales' => in_array($type, ['MINIMARKET', 'FERRETERIA', 'LICORERIA'], true) ? 'true' : 'false',
        ];
    }

    // ─── Relations ──────────────────────────────────────────────

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'tenant_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'tenant_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'tenant_id');
    }

    public function configs(): HasMany
    {
        return $this->hasMany(StoreConfig::class, 'tenant_id');
    }
}
