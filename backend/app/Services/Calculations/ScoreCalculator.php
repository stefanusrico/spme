<?php

namespace App\Services\Calculations;

class ScoreCalculator
{
    public function hitungSkor(string $no, array $items): float
    {
        $nilaiMap = collect($items)
            ->filter(fn($item) => isset($item['sub'], $item['nilai']) && is_numeric($item['nilai']))
            ->mapWithKeys(fn($item) => [$item['sub'] => (float) $item['nilai']])
            ->toArray();

        switch ($no) {
            case '7':
            case '8':
            case '42':
            case '52':
                return $this->rumusAB_Bobot2($nilaiMap);

            case '10':
                return $this->rumusA2B($nilaiMap);

            case '13':
            case '33':
                return $this->rataRataAB($nilaiMap);

            case '14':
                return $this->rumusA4B($nilaiMap);

            case '40':
            case '46':
                return $this->rumusA_B2_C2($nilaiMap);

            case '43':
                return $this->rumusA_B2_C2_D2_E2($nilaiMap);

            default:
                return $this->rataRataDefault($nilaiMap);
        }
    }

    private function rumusAB_Bobot2(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        return round(($A + (2 * $B)) / 3, 2);
    }

    private function rumusA2B(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        return round(((2 * $A) + $B) / 3, 2);
    }

    private function rataRataAB(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        return round(($A + $B) / 2, 2);
    }

    private function rumusA4B(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        return round(((4 * $A) + $B) / 5, 2);
    }

    private function rumusA_B2_C2(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        $C = $nilai['C'] ?? 0;
        return round(($A + (2 * $B) + (2 * $C)) / 5, 2);
    }

    private function rumusA_B2_C2_D2_E2(array $nilai): float
    {
        $A = $nilai['A'] ?? 0;
        $B = $nilai['B'] ?? 0;
        $C = $nilai['C'] ?? 0;
        $D = $nilai['D'] ?? 0;
        $E = $nilai['E'] ?? 0;
        return round(($A + (2 * $B) + (2 * $C) + (2 * $D) + (2 * $E)) / 9, 2);
    }

    private function rataRataDefault(array $nilai): float
    {
        return count($nilai)
            ? round(array_sum($nilai) / count($nilai), 2)
            : 0.0;
    }
}
