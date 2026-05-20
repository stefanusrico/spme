<?php

namespace App\Services\Calculations;
use Illuminate\Support\Facades\Log;
class ScoreCalculator
{
    public function hitungSkorButir(string $no, array $items, string $rumusValue): float
    {
        $nilaiMap = collect($items)
            ->filter(fn($item) => isset($item['sub'], $item['nilai']) && is_numeric($item['nilai']))
            ->mapWithKeys(fn($item) => [$item['sub'] => (float) $item['nilai']])
            ->toArray();

        $A = $nilaiMap['A'] ?? 0;
        $B = $nilaiMap['B'] ?? 0;
        $C = $nilaiMap['C'] ?? 0;
        $D = $nilaiMap['D'] ?? 0;
        $E = $nilaiMap['E'] ?? 0;

        try {
            // Tambahkan tanda $ ke variabel dalam string rumus
            $parsedRumus = preg_replace_callback('/\b([A-E])\b/', fn($match) => '$' . $match[1], $rumusValue);

            // Evaluasi ekspresi dengan eval
            $result = 0;
            eval('$result = ' . $parsedRumus . ';');

            return round((float) $result, 2);
        } catch (\Throwable $e) {
            // Error handling jika rumus rusak
            return 0.0;
        }       
    }

    public function hitungSkorBobotButir(string $no, array $items, float $bobotValue): float
    {
        $nilai = 0.0;
        foreach ($items as $item) {
            $itemNilai = isset($item['nilai']) ? (float) $item['nilai'] : 0.0;
            $nilai += $itemNilai * $bobotValue;
        }

        return round($nilai, 2);
    }
}