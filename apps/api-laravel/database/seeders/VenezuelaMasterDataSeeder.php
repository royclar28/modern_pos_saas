<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * VenezuelaMasterDataSeeder
 *
 * Siembra las categorías y marcas más comunes del mercado
 * venezolano de consumo masivo. Estas son agnósticas de tenant:
 * se asignan al tenant_id que se pase por argumento o se
 * puede ejecutar desde un comando artisan que itere todos los tenants.
 *
 * Uso:
 *   php artisan db:seed --class=VenezuelaMasterDataSeeder
 *
 * Para un tenant específico:
 *   php artisan db:seed --class=VenezuelaMasterDataSeeder --tenant=<uuid>
 */
class VenezuelaMasterDataSeeder extends Seeder
{
    /** Categorías comunes en supermercados venezolanos */
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

    /** Marcas líderes del mercado venezolano de consumo masivo */
    private static array $BRANDS = [
        // Empresas venezolanas
        'Polar', 'Mavesa', 'Plumrose', 'Diana', 'Mary',
        'Noel', 'Farmatodo', 'Procter & Gamble (PG Venezuela)',
        'Industrias Alimenticias Corralito', 'Caraota Tuy',
        'Susy', 'Fama de América', 'Alfonzo Rivas',
        'Venezolana de Azúcar', 'Lácteos Los Andes',
        'Indulac', 'Inlaca', 'Promasa', 'Remavenca',
        'Venalum', 'BioSurya', 'Flor de Venezuela',
        'Caramelos Cri-Cri', 'Confites los Andes',
        'Casa McGregor', 'Tiziana', 'Supan',
        // Multinacionales con fuerte presencia VE
        'Nestlé', 'Unilever', 'Colgate-Palmolive', 'P&G',
        'Kellogg\'s', 'Heinz', 'Kraft', 'Mondelez',
        'PepsiCo', 'Coca-Cola FEMSA', 'Brahma',
        'Cervecería Polar', 'Bavaria',
        // Marcas regionales/LAT
        'Maggi', 'Fruco', 'Knorr', 'La Serenísima',
        // Importadas comunes en VE
        'Goya', 'Bush\'s Beans', 'Del Monte',
        'Progresso', 'Barilla', 'Pampero',
        // Aseo / Cuidado personal
        'Johnson & Johnson', 'Procter & Gamble', 'Kimberly-Clark',
        'Henkel', 'Reckitt Benckiser', 'Gillette', 'Always',
        'Pampers', 'Huggies', 'Head & Shoulders', 'Pantene',
        'Dove', 'Axe', 'Rexona', 'Lux', 'Savoy',
        // Limpieza
        'Clorox', 'Ajax', 'Mister Músculo', 'Fabuloso', 'Ace',
        // Otras
        'Sin Marca', 'Marca Propia',
    ];

    public function run(): void
    {
        // ── Obtener o crear un tenant para el seed ────────────────
        $tenantId = \App\Models\Store::value('id');

        if (!$tenantId) {
            $this->command->error('No hay tenants creados. Ejecuta primero DatabaseSeeder.');
            return;
        }

        $this->command->info("Sembrando para tenant: {$tenantId}");

        // ── Categorías ────────────────────────────────────────────
        $catCount = 0;
        foreach (self::$CATEGORIES as $cat) {
            $exists = Category::where('tenant_id', $tenantId)
                ->where('name', $cat['name'])
                ->exists();

            if (!$exists) {
                Category::create([
                    'id'         => Str::uuid(),
                    'tenant_id'  => $tenantId,
                    'name'       => $cat['name'],
                    'sort_order' => $cat['sort_order'],
                ]);
                $catCount++;
            }
        }
        $this->command->info("✅ {$catCount} categorías creadas (duplicadas ignoradas).");

        // ── Marcas ────────────────────────────────────────────────
        $brandCount = 0;
        foreach (self::$BRANDS as $brandName) {
            $exists = Brand::where('tenant_id', $tenantId)
                ->where('name', $brandName)
                ->exists();

            if (!$exists) {
                Brand::create([
                    'id'        => Str::uuid(),
                    'tenant_id' => $tenantId,
                    'name'      => $brandName,
                ]);
                $brandCount++;
            }
        }
        $this->command->info("✅ {$brandCount} marcas creadas (duplicadas ignoradas).");
    }
}
