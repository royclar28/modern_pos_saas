<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Artisan command to seed Venezuelan master data (categories + brands)
 * for one specific tenant or all active tenants.
 *
 * Usage:
 *   php artisan pos:seed-venezuela              # All active tenants
 *   php artisan pos:seed-venezuela --tenant=<uuid>  # Specific tenant
 */
class SeedVenezuelaMasterData extends Command
{
    protected $signature   = 'pos:seed-venezuela {--tenant= : UUID del tenant específico (opcional)}';
    protected $description = 'Siembra categorías y marcas del mercado venezolano para todos los tenants activos.';

    private static array $CATEGORIES = [
        ['name' => 'Granos y Cereales',         'sort_order' => 10],
        ['name' => 'Harina y Pastas',            'sort_order' => 20],
        ['name' => 'Arroz',                      'sort_order' => 25],
        ['name' => 'Aceites y Grasas',           'sort_order' => 30],
        ['name' => 'Lácteos',                    'sort_order' => 40],
        ['name' => 'Carnes y Embutidos',         'sort_order' => 50],
        ['name' => 'Aves',                       'sort_order' => 55],
        ['name' => 'Pescado y Mariscos',         'sort_order' => 58],
        ['name' => 'Frutas y Verduras',          'sort_order' => 60],
        ['name' => 'Bebidas',                    'sort_order' => 70],
        ['name' => 'Jugos y Refrescos',          'sort_order' => 75],
        ['name' => 'Agua y Hidratantes',         'sort_order' => 78],
        ['name' => 'Licores y Cervezas',         'sort_order' => 80],
        ['name' => 'Condimentos y Salsas',       'sort_order' => 90],
        ['name' => 'Enlatados y Conservas',      'sort_order' => 100],
        ['name' => 'Snacks y Galletas',          'sort_order' => 110],
        ['name' => 'Dulces y Confitería',        'sort_order' => 115],
        ['name' => 'Café, Té y Chocolate',       'sort_order' => 120],
        ['name' => 'Panadería y Repostería',     'sort_order' => 130],
        ['name' => 'Huevos',                     'sort_order' => 135],
        ['name' => 'Azúcar y Endulzantes',       'sort_order' => 140],
        ['name' => 'Sal y Especias',             'sort_order' => 145],
        ['name' => 'Aseo Personal',              'sort_order' => 150],
        ['name' => 'Higiene Bucal',              'sort_order' => 155],
        ['name' => 'Cuidado del Cabello',        'sort_order' => 160],
        ['name' => 'Cuidado de la Piel',         'sort_order' => 165],
        ['name' => 'Limpieza del Hogar',         'sort_order' => 170],
        ['name' => 'Papel y Servilletas',        'sort_order' => 180],
        ['name' => 'Pañales y Bebé',             'sort_order' => 190],
        ['name' => 'Medicamentos OTC',           'sort_order' => 200],
        ['name' => 'Vitaminas y Suplementos',    'sort_order' => 210],
        ['name' => 'Mascotas',                   'sort_order' => 220],
        ['name' => 'Ferretería y Herramientas',  'sort_order' => 230],
        ['name' => 'Tecnología y Accesorios',    'sort_order' => 240],
        ['name' => 'Ropa y Calzado',             'sort_order' => 250],
        ['name' => 'Otros',                      'sort_order' => 999],
    ];

    private static array $BRANDS = [
        'Polar', 'Mavesa', 'Plumrose', 'Diana', 'Mary',
        'Noel', 'Fama de América', 'Alfonzo Rivas',
        'Lácteos Los Andes', 'Indulac', 'Inlaca',
        'Promasa', 'Remavenca', 'BioSurya', 'Flor de Venezuela',
        'Caramelos Cri-Cri', 'Supan', 'Casa McGregor', 'Tiziana',
        'Nestlé', 'Unilever', 'Colgate-Palmolive', 'P&G',
        "Kellogg's", 'Heinz', 'Kraft', 'Mondelez',
        'PepsiCo', 'Coca-Cola FEMSA', 'Brahma',
        'Cervecería Polar', 'Bavaria',
        'Maggi', 'Fruco', 'Knorr', 'Barilla', 'Goya', 'Del Monte',
        'Johnson & Johnson', 'Kimberly-Clark', 'Henkel',
        'Reckitt Benckiser', 'Gillette', 'Always', 'Pampers',
        'Huggies', 'Head & Shoulders', 'Pantene', 'Dove',
        'Axe', 'Rexona', 'Lux', 'Savoy',
        'Clorox', 'Ajax', 'Mister Músculo', 'Fabuloso', 'Ace',
        'Sin Marca', 'Marca Propia',
    ];

    public function handle(): int
    {
        $tenantId = $this->option('tenant');

        $tenants = $tenantId
            ? Store::where('id', $tenantId)->get()
            : Store::where('is_active', true)->get();

        if ($tenants->isEmpty()) {
            $this->error('No se encontraron tenants activos.');
            return 1;
        }

        foreach ($tenants as $store) {
            $this->info("\n🏪 Sembrando para: {$store->name} ({$store->id})");
            $this->seedFor($store->id);
        }

        $this->info("\n✅ ¡Siembra completada!");
        return 0;
    }

    private function seedFor(string $tenantId): void
    {
        $catCount = 0;
        foreach (self::$CATEGORIES as $cat) {
            if (!Category::where('tenant_id', $tenantId)->where('name', $cat['name'])->exists()) {
                Category::create([
                    'id'         => Str::uuid(),
                    'tenant_id'  => $tenantId,
                    'name'       => $cat['name'],
                    'sort_order' => $cat['sort_order'],
                ]);
                $catCount++;
            }
        }
        $this->line("  📁 {$catCount} categorías nuevas.");

        $brandCount = 0;
        foreach (self::$BRANDS as $brandName) {
            if (!Brand::where('tenant_id', $tenantId)->where('name', $brandName)->exists()) {
                Brand::create([
                    'id'        => Str::uuid(),
                    'tenant_id' => $tenantId,
                    'name'      => $brandName,
                ]);
                $brandCount++;
            }
        }
        $this->line("  🏷️  {$brandCount} marcas nuevas.");
    }
}
