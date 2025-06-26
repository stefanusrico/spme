<?php

namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GeminiDataMappingController extends Controller
{
    public function mappingData(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'database_columns' => 'required|array',
                'excel_headers' => 'required|array',
                'semantic_threshold' => 'nullable|numeric|min:0|max:1',
            ]);

            $dbColumns = $request->input('database_columns');
            $excelHeaders = $request->input('excel_headers');
            // Mengatur ambang batas default ke 0.75 (75%)
            $semanticThreshold = $request->input('semantic_threshold', 0.75);

            // Filter header Excel yang kosong
            $excelHeaders = array_filter($excelHeaders, fn($header) => !empty(trim($header)));

            $prompt = $this->buildPrompt($dbColumns, $excelHeaders, $semanticThreshold);

            $result = Gemini::generativeModel(model: 'gemini-1.5-flash-latest')
                ->generateContent($prompt);

            $responseText = $result->text();
            $jsonResult = $this->extractJsonFromText($responseText);

            if (!$jsonResult) {
                return $this->errorResponse(
                    'Gagal mengekstrak JSON yang valid dari respons Gemini.',
                    ['rawResponse' => $responseText]
                );
            }

            $validatedMapping = $this->validateConfidenceLevels($jsonResult, $semanticThreshold, $dbColumns);

            if (empty($validatedMapping) && !empty($jsonResult)) {
                return $this->errorResponse(
                    'Pemetaan gagal karena beberapa hasil dari AI memiliki tingkat keyakinan di bawah ambang batas yang ditetapkan atau tidak semua kolom berhasil dipetakan.',
                    ['rawResponse' => $jsonResult]
                );
            }

            return response()->json([
                'success' => true,
                'mapping' => $validatedMapping,
                'threshold_used' => $semanticThreshold
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Validasi:
     * - Semua kolom database (kecuali 'no') harus ada di mapping dan lolos threshold.
     * - Jika ada satu saja yang tidak, return [].
     * - Kolom 'no' diabaikan.
     */
    private function validateConfidenceLevels(array $mapping, float $threshold, array $dbColumns): array
    {
        // Ambil semua key yang wajib ada (kecuali 'no')
        $requiredKeys = [];
        foreach ($dbColumns as $col) {
            if (
                isset($col['indeksData']) &&
                strtolower($col['indeksData']) !== 'no'
            ) {
                $requiredKeys[] = $col['indeksData'];
            }
        }

        // Cek semua requiredKeys ada di mapping dan lolos threshold
        foreach ($requiredKeys as $dbColumn) {
            if (!isset($mapping[$dbColumn])) {
                return [];
            }
            $mappingData = $mapping[$dbColumn];
            if (!is_array($mappingData) || !isset($mappingData['confidence'])) {
                return [];
            }
            $confidence = (float) $mappingData['confidence'];
            if ($confidence < $threshold) {
                return [];
            }
        }

        // Hapus kolom "no" dari hasil mapping jika ada
        if (isset($mapping['no'])) {
            unset($mapping['no']);
        }

        return $mapping;
    }

    private function buildPrompt(array $dbColumns, array $excelHeaders, float $semanticThreshold): string
    {
        $thresholdPercentage = round($semanticThreshold * 100);

        return "Anda adalah asisten pemetaan data dengan kemampuan pemahaman semantik. Tugas Anda adalah mencocokkan header kolom Excel dengan nama kolom database berdasarkan makna dan konteks.

## Tugas
Cocokkan setiap kolom database (indeksData) dengan header kolom Excel yang paling sesuai berdasarkan pemahaman semantik. Anda harus mengevaluasi tingkat keyakinan/kemiripan untuk setiap potensi kecocokan.

## Ambang Batas Keyakinan (Confidence Threshold)
- KEYAKINAN MINIMUM YANG DIBUTUHKAN: {$thresholdPercentage}% ({$semanticThreshold})
- Hanya buat pemetaan jika tingkat keyakinan Anda >= {$thresholdPercentage}% ({$semanticThreshold}).
- Jika tidak ada header Excel yang memenuhi ambang batas keyakinan untuk sebuah kolom database, JANGAN sertakan kolom tersebut dalam pemetaan.
- Pertimbangkan makna semantik, bukan hanya kemiripan teks.
- Berlaku KETAT dalam penilaian keyakinan - hanya kecocokan berkualitas tinggi yang boleh melampaui ambang batas.

## Kriteria Evaluasi
1.  **Kecocokan semantik persis** (keyakinan 95-100%): Header Excel memiliki arti yang sama persis.
2.  **Kecocokan semantik kuat** (keyakinan 80-94%): Arti sangat mirip dengan sedikit perbedaan.
3.  **Kecocokan semantik sedang** (keyakinan {$thresholdPercentage}-79%): Konsep terkait tetapi ada beberapa perbedaan.
4.  **Kecocokan lemah** (di bawah {$thresholdPercentage}%): Hubungan tidak cukup kuat - JANGAN DISERTAKAN.

## Data Input
1.  KOLOM_DATABASE: " . json_encode($dbColumns) . "
2.  HEADER_EXCEL: " . json_encode($excelHeaders) . "

## Format Output yang Diharapkan
Kembalikan sebuah objek JSON di mana:
- Key adalah nilai `indeksData` dari kolom database (hanya untuk pemetaan dengan keyakinan >= {$semanticThreshold}).
- Value adalah objek yang berisi:
  - `excelIndex`: Indeks dari header Excel yang cocok (berbasis 0).
  - `excelHeader`: Teks header Excel yang cocok.
  - `confidence`: Skor keyakinan Anda (0.0 - 1.0) - HARUS >= {$semanticThreshold}.
  - `reasoning`: Penjelasan singkat mengapa pemetaan ini dipilih.

## Catatan Penting
- PERSYARATAN KETAT: Hanya sertakan pemetaan dengan keyakinan >= {$semanticThreshold}.
- Setiap header Excel hanya boleh dipetakan ke SATU kolom database (pilih yang paling cocok).
- Jika beberapa kolom database dapat cocok dengan header Excel yang sama, pilih yang memiliki keyakinan tertinggi.
- Bersikaplah konservatif dengan skor keyakinan - lebih baik memiliki lebih sedikit pemetaan berkualitas tinggi daripada banyak pemetaan berkualitas rendah.

## Contoh Format Output
```json
{
  \"kolom_satu\": {
    \"excelIndex\": 0,
    \"excelHeader\": \"Nama Siswa\",
    \"confidence\": 0.95,
    \"reasoning\": \"Kecocokan semantik langsung untuk identifikasi siswa.\"
  },
  \"kolom_dua\": {
    \"excelIndex\": 3,
    \"excelHeader\": \"Tahun Ajaran 2023/2024\",
    \"confidence\": 0.85,
    \"reasoning\": \"Tahun ajaran cocok dengan konteks akademik temporal.\"
  }
}
```
";
    }

    private function extractJsonFromText(string $text): ?array
    {
        preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $matches);

        $jsonText = !empty($matches[1]) ? trim($matches[1]) : trim($text);

        $decoded = json_decode($jsonText, true);

        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
    }

    private function errorResponse(string $message, array $additionalData = []): JsonResponse
    {
        $response = [
            'success' => false,
            'error' => $message,
        ];

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response, 500);
    }
}