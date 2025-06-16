<?php

namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Controller for handling data mapping operations with Gemini AI.
 */
class GeminiScoringLedController extends Controller
{
  /**
   * Map Excel headers to database columns using Gemini AI.
   *
   * @param Request $request The HTTP request containing database columns and Excel headers
   * @return JsonResponse The mapping results or error response
   */
  public function scoringLed(Request $request): JsonResponse
  {
    try {
      // Validate request input
      $request->validate([
        'dataLedItem' => 'required|array',
        'dataIsian' => 'required|array',
      ]);

      // Extract request data
      $dataLedItem = $request->input('dataLedItem');
      $dataIsian = $request->input('dataIsian');

      // Build the Gemini prompt
      $prompt = $this->buildPrompt($dataLedItem, $dataIsian);

      // Generate mapping using Gemini AI
      $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
        ->generateContent($prompt);

      // Process the Gemini response
      $responseText = $result->text();
      $jsonResult = $this->extractJsonFromText($responseText);

      \Log::info('Gemini Response:', [
        'prompt' => $prompt,
        'response' => $responseText,
        'response json result' => $jsonResult
      ]);

      // Check if valid JSON was extracted
      if (!$jsonResult) {
        return $this->errorResponse(
          'Failed to extract valid JSON mapping from Gemini response',
          ['rawResponse' => $responseText]
        );
      }

      // Return successful response with mapping
      return response()->json([
        'success' => true,
        'mapping' => $jsonResult
      ]);

    } catch (\Exception $e) {
      return $this->errorResponse($e->getMessage());
    }
  }

  /**
   * Build the prompt for Gemini AI.
   *
   * @param array $dbColumns Database column definitions
   * @param array $excelHeaders Excel column headers
   * @return string The formatted prompt
   */
  private function buildPrompt(array $dataLedItem, array $dataIsian): string
    {
        $details = $this->extractDetails($dataLedItem['details']);
        $isianAsesi = $dataIsian['isianAsesi'];

        return <<<PROMPT
        Role:
        Anda adalah seorang evaluator akreditasi perguruan tinggi yang bertugas menilai kesesuaian antara isian asesi dengan indikator kualitatif berdasarkan rubrik penilaian yang ditentukan. pastikan isian asesi berisi **Penjelasan** tentang rubrik penilaian.

        Tujuan:
        Menilai apakah isian yang diberikan sesuai dengan indikator kualitatif, serta menentukan skor (0, 1, 2, 3, atau 4) berdasarkan rubrik. Penilaian harus dilakukan dengan penalaran bertahap.

        Aturan Penilaian (WAJIB UNTUK SEMUA INDIKATOR):
        - Istilah/metode/kegiatan tanpa **penjelasan pelaksanaan, bentuk, dampak, atau relevansi** = **Skor 0**.
        - Skor hanya diberikan jika ada **penjelasan bermakna**.
        - Jangan memberikan skor hanya karena istilah cocok dengan rubrik.
        - Evaluasi berbasis **isi isian**, bukan asumsi.
        - Untuk skor lebih tinggi, **semua komponen** dalam rubrik harus dipenuhi dan dijelaskan.

        Langkah-langkah Penilaian:
        1. Pahami aturan penilaian.  
        2. Pahami indikator dan deskripsi rubrik penilaian.
        3. Baca dan analisis isi isian asesi secara menyeluruh.
        4. Identifikasi isian asesi menjelaskan semua indikator atau tidak.
        5. Identifikasi bukti atau pernyataan dalam isian yang relevan dengan rubrik penilaian.
        6. Evaluasi apakah bukti atau pernyataan tersebut memiliki **penjelasan pelaksanaan, bentuk, dampak, atau relevansi**, bukan hanya menyebut istilah atau kata kunci.
        7. Bandingkan temuan dalam isian dengan kriteria skor (0, 1, 2, 3, 4).
        8. Tentukan skor yang paling sesuai berdasarkan kesesuaian.
        9. Berikan penjelasan ringkas (masukan) yang mendasari skor tersebut.

        Data Matriks

        Elemen: {$details['element']}
        Indikator: {$details['indikator']}
        Guidance: {$details['guidance']}
        Deskripsi Indikator:
        {$details['description']}

        Rubrik Penilaian:
        Skor 0: {$details['score_0']}
        Skor 1: {$details['score_1']}
        Skor 2: {$details['score_2']}
        Skor 3: {$details['score_3']}
        Skor 4: {$details['score_4']}

        Isian Asesi:
        {$isianAsesi}

        Tugas Anda:
        Lakukan penalaran bertahap berdasarkan langkah-langkah di atas dan berikan hasil akhir dalam format berikut. Jangan tambahkan teks lain di luar struktur JSON.

        Format Jawaban (JSON):
        {
            "langkah_penalaran": "<tuliskan reasoning bertahap di sini>",
            "nilai": "<skor akhir>",
            "masukan": "<penjelasan ringkas>"
        }
        PROMPT;
    }


  private function extractDetails(array $details): array
    {
        $result = [
            'element' => '',
            'guidance' => '',
            'indikator' => '',
            'description' => '',
            'score_0' => '',
            'score_1' => '',
            'score_2' => '',
            'score_3' => '',
            'score_4' => '',
        ];

        foreach ($details as $detail) {
            switch ($detail['type']) {
                case 'E': $result['element'] = $detail['reference']; break;
                case 'G': $result['guidance'] = $detail['reference']; break;
                case 'I': $result['indikator'] = $detail['reference']; break;
                case 'D': $result['description'] = $detail['reference']; break;
                case 'S':
                    $seq = $detail['seq'];
                    if (isset($result["score_$seq"])) {
                        $result["score_$seq"] = $detail['reference'];
                    }
                    break;
            }
        }

        return $result;
    }


  /**
   * Extract JSON from text that might be formatted with markdown.
   *
   * @param string $text The text potentially containing JSON
   * @return array|null The extracted JSON as an array, or null if extraction failed
   */
  private function extractJsonFromText(string $text): ?array
  {
    // Try to extract JSON between backticks if present
    preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $matches);

    if (!empty($matches[1])) {
      $jsonText = trim($matches[1]);
    } else {
      // If no backticks, take the whole text
      $jsonText = trim($text);
    }

    // Try to decode the JSON
    $decoded = json_decode($jsonText, true);

    // Return the decoded JSON or null if decoding failed
    return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
  }

  /**
   * Create a standardized error response.
   *
   * @param string $message The error message
   * @param array $additionalData Additional data to include in the response
   * @return JsonResponse The formatted error response
   */
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