<?php

namespace Database\Seeders;

use App\Models\QuinielaMatch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class QuinielaMatchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $matches = [
            ['México', 'Sudáfrica'], ['Rep.Corea', 'Rep.Checa'], ['Canadá', 'Bosnia y H.'], ['Estados Unidos', 'Paraguay'], ['Catar', 'Suiza'], ['Brasil', 'Marruecos'], ['Haití', 'Escocia'], ['Australia', 'Turquía'], ['Alemania', 'Curazao'], ['Países Bajos', 'Japón'], ['Costa de Marfil', 'Ecuador'], ['Suecia', 'Túnez'], ['España', 'Cabo Verde'], ['Bélgica', 'Egipto'], ['Arabia Saudí', 'Uruguay'], ['Irán', 'Nueva Zelanda'], ['Francia', 'Senegal'], ['Irak', 'Noruega'], ['Argentina', 'Argelia'], ['Austria', 'Jordania'], ['Portugal', 'RD Congo'], ['Inglaterra', 'Croacia'], ['Ghana', 'Panamá'], ['Uzbekistán', 'Colombia'], ['Rep.Checa', 'Sudáfrica'], ['Suiza', 'Bosnia y H.'], ['Canadá', 'Catar'], ['México', 'Rep.Corea'], ['Estados Unidos', 'Australia'], ['Escocia', 'Marruecos'], ['Brasil', 'Haití'], ['Turquía', 'Paraguay'], ['Países Bajos', 'Suecia'], ['Alemania', 'Costa de Marfil'], ['Ecuador', 'Curazao'], ['Túnez', 'Japón'], ['España', 'Arabia Saudí'], ['Bélgica', 'Irán'], ['Uruguay', 'Cabo Verde'], ['Nueva Zelanda', 'Egipto'], ['Argentina', 'Austria'], ['Francia', 'Irak'], ['Noruega', 'Senegal'], ['Jordania', 'Argelia'], ['Portugal', 'Uzbekistán'], ['Inglaterra', 'Ghana'], ['Panamá', 'Croacia'], ['Colombia', 'RD Congo'], ['Suiza', 'Canadá'], ['Bosnia y H.', 'Catar'], ['Escocia', 'Brasil'], ['Marruecos', 'Haití'], ['Rep.Checa', 'México'], ['Sudáfrica', 'Rep.Corea'], ['Curazao', 'Costa de Marfil'], ['Ecuador', 'Alemania'], ['Japón', 'Suecia'], ['Túnez', 'Países Bajos'], ['Turquía', 'Estados Unidos'], ['Paraguay', 'Australia'], ['Noruega', 'Francia'], ['Senegal', 'Irak'], ['Cabo Verde', 'Arabia Saudí'], ['Uruguay', 'España'], ['Egipto', 'Irán'], ['Nueva Zelanda', 'Bélgica'], ['Panamá', 'Inglaterra'], ['Croacia', 'Ghana'], ['Colombia', 'Portugal'], ['RD Congo', 'Uzbekistán'], ['Argelia', 'Austria'], ['Jordania', 'Argentina']
        ];

        // Fecha base: Por ejemplo, empezar el torneo dentro de 7 días al mediodía.
        $baseDate = Carbon::now()->addDays(7)->setTime(12, 0); 
        
        foreach ($matches as $index => $match) {
            // Lógica incremental: 3 partidos por día
            $dayOffset = floor($index / 3);
            // Cada partido del día inicia con 3 horas de diferencia (ej. 12:00, 15:00, 18:00)
            $hourOffset = ($index % 3) * 3; 
            
            $matchTime = clone $baseDate;
            $matchTime->addDays($dayOffset)->addHours($hourOffset);

            QuinielaMatch::create([
                'team_a' => $match[0],
                'team_b' => $match[1],
                'match_time' => $matchTime,
                'status' => 'PENDING',
            ]);
        }
    }
}
