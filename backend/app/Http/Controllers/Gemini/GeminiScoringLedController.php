<?php

namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;

use Gemini\Data\Blob;
use Gemini\Enums\MimeType;
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
      set_time_limit(120);
      // Validate request input
      $request->validate([
        'dataLedItem' => 'required|array',
        'dataIsian' => 'required|array',
      ]);

      // Extract request data
      $dataLedItem = $request->input('dataLedItem');
      $dataIsian = $request->input('dataIsian');

      \Log::info([
        'data led item' => $dataLedItem,
        'data isian' => $dataIsian,
      ]);


      // Build the Gemini prompt
      $prompt = $this->buildPrompt($dataLedItem, $dataIsian);
      $messages = [$prompt];

      \Log::info('Start download image at: ' . now());
      $imageUrls = $this->extractImageUrls($dataIsian['isianAsesi']);
      \Log::info('Daftar URL gambar yang diekstrak dari isian asesi:', [
        'imageUrls' => $imageUrls
      ]);
      $imageBlobs = $this->createImageBlobs($imageUrls);
      \Log::info('Daftar blob gambar yang berhasil:', [
        'imageBlobs' => $imageBlobs
      ]);
      \Log::info('End download image at: ' . now());


      $contents = array_merge($messages, $imageBlobs);

      // Generate mapping using Gemini AI
      $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
        ->generateContent($contents);
      // $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
      //   ->generateContent([
      //     $messages,
      //     new Blob(
      //       mimeType: $imageBlobs,
      //       data: base64_encode($imageData)
      //     )
      //   ]);

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
      \Log::error('Error saat scoringLed:', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
      ]);

      return response()->json([
        'success' => false,
        'error' => $e->getMessage()
      ], 500);
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
    $details = $this->extractRubrikPenilaian($dataLedItem['details']);
    $isianAsesi = $dataIsian['isianAsesi'];

    return <<<PROMPT
    Role:
    Anda adalah seorang evaluator akreditasi perguruan tinggi yang bertugas menilai kesesuaian antara isian asesi dengan indikator kualitatif berdasarkan rubrik penilaian yang ditentukan. pastikan isian asesi berisi **Penjelasan** tentang rubrik penilaian.

    Tujuan:
    Menilai apakah isian yang diberikan sesuai dengan indikator kualitatif, serta menentukan skor (0, 1, 2, 3, atau 4) berdasarkan rubrik. Penilaian harus dilakukan dengan penalaran bertahap.

    Aturan Penilaian (WAJIB UNTUK SEMUA INDIKATOR):
    - Istilah/metode/kegiatan tanpa **penjelasan pelaksanaan, bentuk, dampak, atau relevansi** = **Skor 0**.
    - Skor hanya diberikan jika ada **penjelasan bermakna**, bukan sekadar menyebut istilah atau kata kunci.
    - Jika tersedia, **analisis juga bukti pendukung** seperti gambar atau dokumen untuk memperkuat validitas isian.
    - Evaluasi berbasis **isi isian dan bukti pendukung**, bukan asumsi.
    - Untuk skor lebih tinggi, **semua komponen** dalam rubrik harus dipenuhi dan dijelaskan secara eksplisit serta, jika mungkin, didukung bukti.

    Langkah-langkah Penilaian:
    1. Pahami aturan penilaian.  
    2. Pahami indikator dan deskripsi rubrik penilaian.
    3. Baca dan analisis isi isian asesi secara menyeluruh.
    4. Identifikasi isian asesi menjelaskan semua indikator atau tidak.
    5. Identifikasi bukti atau pernyataan dalam isian yang relevan dengan rubrik penilaian.
    6. Jika tersedia, analisis bukti pendukung seperti gambar. Evaluasi apakah bukti tersebut **mendukung pernyataan dalam isian**, dan apakah bukti tersebut menggambarkan pelaksanaan, bentuk, dampak, atau relevansi kegiatan.
    7. Bandingkan temuan dalam isian dengan kriteria skor (0, 1, 2, 3, 4).
    8. entukan skor yang paling sesuai berdasarkan kesesuaian isi dan bukti pendukung.
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
    {$this->cleanIsianAsesi($dataIsian['isianAsesi'])}

    Bukti pendukung:
    Terlampir

    Tugas Anda:
    Lakukan penalaran bertahap berdasarkan langkah-langkah di atas dan berikan hasil akhir dalam format berikut. Jangan tambahkan teks lain di luar struktur JSON. Untuk bagian "langkah_penalaran", buat dalam bentuk array yang berisi 9 langkah, satu string per langkah.

    Format Jawaban (JSON):
    {
        "langkah_penalaran": [
            "Langkah 1: <tuliskan reasoning>",
            "Langkah 2: <tuliskan reasoning>",
            "...",
            "Langkah N: <tuliskan reasoning>"
        ],
        "nilai": "<skor akhir>",
        "masukan": "<penjelasan ringkas, dan beri tahu apa yang kurang jika nilai tidak maskimal, dan beri komentar bukti pendukung jika tersedia>"
        "apakah ada bukti pendukung?" : "<jika ada bukti pendukung, jelaskan gambar tersebut>"
    }
    PROMPT;
  }

  private function extractImageUrls(string $isianAsesi): array
  {
    preg_match_all('/Gambar\s*:\s*(.+)/', $isianAsesi, $matches);
    $urls = array_map('trim', $matches[1] ?? []);

    return $urls;
  }

  private function cleanIsianAsesi(string $text): string
  {
    // Hapus baris yang mengandung "Gambar : ..." dan baris kosong sesudahnya
    $text = preg_replace('/Gambar\s*:\s*.+(?:\r?\n)?/i', '', $text);

    // Hapus baris kosong berlebih (lebih dari satu newline)
    $text = preg_replace("/(\r?\n){2,}/", "\n\n", $text);

    return trim($text);
  }

  private function createImageBlobs(array $urls): array
  {
      $blobs = [];

      foreach ($urls as $url) {
          try {
              // Ubah URL menjadi path lokal
              $parsedUrl = parse_url($url);
              $relativePath = urldecode($parsedUrl['path']); // misal: /storage/uploads/...
              $localPath = public_path($relativePath); // hasil: /project/public/storage/uploads/...

              if (!file_exists($localPath)) {
                  \Log::warning("File tidak ditemukan: $localPath");
                  continue;
              }

              $imageData = file_get_contents($localPath);

              $mimeType = MimeType::IMAGE_JPEG;
              if (str_ends_with($url, '.png')) {
                  $mimeType = MimeType::IMAGE_PNG;
              } elseif (str_ends_with($url, '.webp')) {
                  $mimeType = MimeType::IMAGE_WEBP;
              }

              $blobs[] = new Blob(
                  mimeType: $mimeType,
                  data: base64_encode($imageData)
              );
          } catch (\Exception $e) {
              \Log::warning("Gagal membaca gambar dari path: $url. Pesan: " . $e->getMessage());
          }
      }

      return $blobs;
  }

  private function extractRubrikPenilaian(array $details): array
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