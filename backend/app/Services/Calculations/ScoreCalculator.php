<?php

namespace App\Services\Calculations;
use Illuminate\Support\Facades\Log;
class ScoreCalculator
{
    public function hitungSkorButir(string $no, array $items): float
    {
        $nilaiMap = collect($items)
            ->filter(fn($item) => isset($item['sub'], $item['nilai']) && is_numeric($item['nilai']))
            ->mapWithKeys(fn($item) => [$item['sub'] => (float) $item['nilai']])
            ->toArray();

        switch ($no) {
            case '7': 
            case '8':
            case '15':  
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
        return round(array_values($nilai)[0] ?? 0.0, 2);
    }

    public function hitungSkorKriteria(string $kriteria, array $items, array $bobotKriteria) : float
    {
        Log::debug("Hitung Skor Kriteria - Kriteria: $kriteria");
        Log::debug("Items:", $items);
        Log::debug("Bobot Kriteria:", $bobotKriteria);


        $bobotButirCollection = collect($bobotKriteria);

        $bobotItem = $bobotButirCollection->firstWhere('kriteria', $kriteria);
        $bobot = isset($bobotItem['bobot']) ? (float) $bobotItem['bobot'] : 1.0;

        $nilai = 0.0;
        foreach ($items as $item) {
            $itemNilai = isset($item['nilai']) ? (float) $item['nilai'] : 0.0;
            $nilai += $itemNilai * $bobot;
        }
        
        Log::debug("Items JSON: " . json_encode($items, JSON_PRETTY_PRINT));
        Log::debug("BobotKriteria JSON: " . json_encode($bobotKriteria, JSON_PRETTY_PRINT));
                return round($nilai, 2);
    }

    public function hitungSkorBobotButir(string $no, array $items) : float
    {

        $bobotButir = collect($this->bobotButir())->firstWhere('butir', (int) $no);
        $bobot = $bobotButir ? (float) $bobotButir['bobot'] : 0.0;
        
        $nilai = 0.0;
        foreach ($items as $item) {
            $itemNilai = isset($item['nilai']) ? (float) $item['nilai'] : 0.0;
            $nilai += $itemNilai * $bobot;
        }

        return round($nilai, 2);
    }

    private function bobotButir()
    {
        return [
            // A. Kondisi Eksternal
            ["butir" => 1, "bobot" => 1.00],

            // B. Profil Unit Pengelola Program Studi
            ["butir" => 2, "bobot" => 1.00],

            // C. Kriteria
            ["butir" => 3, "bobot" => 0.47], // C.1 Visi, Misi, Tujuan dan Strategi
            ["butir" => 4, "bobot" => 0.47],
            ["butir" => 5, "bobot" => 0.47],
            ["butir" => 6, "bobot" => 1.42],

            ["butir" => 7, "bobot" => 0.66], // C.2.a Sistem Tata Pamong
            ["butir" => 8, "bobot" => 0.66], // C.2.b Kepemimpinan dan Kemampuan Manajerial
            ["butir" => 9, "bobot" => 1.32], // C.2.c Kerjasama

            ["butir" => 10, "bobot" => 0.66],
            ["butir" => 11, "bobot" => 1.32],
            ["butir" => 12, "bobot" => 1.99],
            ["butir" => 13, "bobot" => 3.31],
            ["butir" => 14, "bobot" => 2.21],
            ["butir" => 15, "bobot" => 1.10],
            ["butir" => 16, "bobot" => 0.47],
            ["butir" => 17, "bobot" => 0.76],
            ["butir" => 18, "bobot" => 0.38],
            ["butir" => 19, "bobot" => 0.38],
            ["butir" => 20, "bobot" => 0.28],
            ["butir" => 21, "bobot" => 0.66],
            ["butir" => 22, "bobot" => 0.19],
            ["butir" => 23, "bobot" => 0.28],
            ["butir" => 24, "bobot" => 0.09],
            ["butir" => 25, "bobot" => 0.57],
            ["butir" => 26, "bobot" => 0.57],
            ["butir" => 27, "bobot" => 0.28],
            ["butir" => 28, "bobot" => 0.57],
            ["butir" => 29, "bobot" => 0.38],
            ["butir" => 30, "bobot" => 0.57],
            ["butir" => 31, "bobot" => 0.47],
            ["butir" => 32, "bobot" => 1.70],
            ["butir" => 33, "bobot" => 0.85],
            ["butir" => 34, "bobot" => 0.83],
            ["butir" => 35, "bobot" => 0.83],
            ["butir" => 36, "bobot" => 0.41],
            ["butir" => 37, "bobot" => 0.41],
            ["butir" => 38, "bobot" => 0.83],
            ["butir" => 39, "bobot" => 3.31],
            ["butir" => 40, "bobot" => 2.25],
            ["butir" => 41, "bobot" => 0.45],
            ["butir" => 42, "bobot" => 1.62],
            ["butir" => 43, "bobot" => 0.90],
            ["butir" => 44, "bobot" => 0.54],
            ["butir" => 45, "bobot" => 2.25],
            ["butir" => 46, "bobot" => 1.62],
            ["butir" => 47, "bobot" => 0.72],
            ["butir" => 48, "bobot" => 0.72],
            ["butir" => 49, "bobot" => 0.36],
            ["butir" => 50, "bobot" => 1.62],
            ["butir" => 51, "bobot" => 2.25],
            ["butir" => 52, "bobot" => 2.70],
            ["butir" => 53, "bobot" => 0.63],
            ["butir" => 54, "bobot" => 1.26],
            ["butir" => 55, "bobot" => 0.94],
            ["butir" => 56, "bobot" => 1.89],
            ["butir" => 57, "bobot" => 2.09],
            ["butir" => 58, "bobot" => 2.09],
            ["butir" => 59, "bobot" => 3.22],
            ["butir" => 60, "bobot" => 0.64],
            ["butir" => 61, "bobot" => 2.09],
            ["butir" => 62, "bobot" => 2.09],
            ["butir" => 63, "bobot" => 2.09],
            ["butir" => 64, "bobot" => 3.22],
            ["butir" => 65, "bobot" => 3.22],
            ["butir" => 66, "bobot" => 2.09],
            ["butir" => 67, "bobot" => 2.09],
            ["butir" => 68, "bobot" => 4.02],
            ["butir" => 69, "bobot" => 1.93],
            ["butir" => 70, "bobot" => 0.64],
            ["butir" => 71, "bobot" => 0.64],

            //D. Penjaminan Mutu
            ["butir" => 72, "bobot" => 1.00],
            ["butir" => 73, "bobot" => 1.00],
            ["butir" => 74, "bobot" => 2.00],
            ["butir" => 75, "bobot" => 1.00],
            ["butir" => 76, "bobot" => 2.00],
            ["butir" => 77, "bobot" => 1.50],
            ["butir" => 78, "bobot" => 2.50],
        ];
    }


}
