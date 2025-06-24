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
 * 
 * Handles automated scoring of academic assessments using Gemini AI
 * with multimodal capabilities (text and image analysis).
 */
class GeminiScoringLedController extends Controller
{
    /**
     * Main method for scoring assessment submissions using Gemini AI.
     * 
     * This method evaluates student/institution submissions against predefined
     * rubrics using AI analysis of both text content and supporting images.
     *
     * @param Request $request The HTTP request containing rubric data and submission content
     * @return JsonResponse The scoring results with reasoning or error response
     */
    public function scoringLed(Request $request): JsonResponse
    {
        try {
            // Set extended time limit for AI processing (2 minutes)
            set_time_limit(120);
            
            // Validate incoming request data structure
            $request->validate([
                'dataLedItem' => 'required|array',  // Rubric/scoring criteria data
                'dataIsian' => 'required|array',    // Assessment submission data
            ]);

            // Extract validated data from request
            $dataLedItem = $request->input('dataLedItem');
            $dataIsian = $request->input('dataIsian');

            // Log input data for debugging purposes
            \Log::info([
                'data led item' => $dataLedItem,
                'data isian' => $dataIsian,
            ]);

            // Build the comprehensive AI prompt with rubric and submission data
            $prompt = $this->buildPrompt($dataLedItem, $dataIsian);
            $messages = [$prompt];

            // Process images from submission content
            \Log::info('Start download image at: ' . now());
            
            // Extract image URLs from the submission text
            $imageUrls = $this->extractImageUrls($dataIsian['isianAsesi']);
            \Log::info('Daftar URL gambar yang diekstrak dari isian asesi:', [
                'imageUrls' => $imageUrls
            ]);
            
            // Convert image URLs to blob data for AI processing
            $imageBlobs = $this->createImageBlobs($imageUrls);
            \Log::info('Daftar blob gambar yang berhasil:', [
                'imageBlobs' => $imageBlobs
            ]);
            
            \Log::info('End download image at: ' . now());

            // Combine text prompt with image blobs for multimodal AI analysis
            $contents = array_merge($messages, $imageBlobs);

            // Send request to Gemini AI for scoring analysis
            $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
                ->generateContent($contents);

            // Extract and process the AI response
            $responseText = $result->text();
            $jsonResult = $this->extractJsonFromText($responseText);

            // Log the complete AI interaction for debugging
            \Log::info('Gemini Response:', [
                'prompt' => $prompt,
                'response' => $responseText,
                'response json result' => $jsonResult
            ]);

            // Validate that AI returned properly formatted JSON
            if (!$jsonResult) {
                return $this->errorResponse(
                    'Failed to extract valid JSON mapping from Gemini response',
                    ['rawResponse' => $responseText]
                );
            }

            // Return successful scoring response
            return response()->json([
                'success' => true,
                'mapping' => $jsonResult
            ]);

        } catch (\Exception $e) {
            // Log any errors that occur during processing
            \Log::error('Error saat scoringLed:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return error response with details
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build a comprehensive prompt for Gemini AI evaluation.
     * 
     * Creates a detailed, structured prompt that defines the AI's role as an
     * academic evaluator and provides all necessary context for scoring.
     *
     * @param array $dataLedItem Rubric and scoring criteria data
     * @param array $dataIsian Assessment submission data
     * @return string The formatted prompt for AI processing
     */
    private function buildPrompt(array $dataLedItem, array $dataIsian): string
    {
        // Extract and organize rubric criteria from the data structure
        $details = $this->extractRubrikPenilaian($dataLedItem['details']);
        $isianAsesi = $dataIsian['isianAsesi'];

        // Build comprehensive prompt with role definition, rules, and data
        return <<<PROMPT
            Role:
            Anda adalah seorang evaluator akreditasi perguruan tinggi yang bertugas menilai kesesuaian antara isian asesi dengan indikator kualitatif berdasarkan rubrik penilaian yang ditentukan. pastikan isian asesi berisi **Penjelasan** tentang rubrik penilaian.

            Tujuan:
            Menilai apakah isian yang diberikan sesuai dengan indikator kualitatif, serta menentukan skor (0, 1, 2, 3, atau 4) berdasarkan rubrik. Penilaian harus dilakukan dengan penalaran bertahap.

            Aturan Penilaian (WAJIB UNTUK SEMUA INDIKATOR):
            - Istilah/metode/kegiatan tanpa **penjelasan pelaksanaan, bentuk, dampak, atau relevansi** maka nilainya = **Skor 0**.
            - Skor hanya diberikan jika ada **penjelasan bermakna**, bukan sekadar menyebut istilah atau kata kunci.
            - Jika tersedia, **analisis juga bukti pendukung** seperti gambar atau dokumen untuk memperkuat validitas isian.
            - Evaluasi berbasis **isi isian dan bukti pendukung**, bukan asumsi.
            - Untuk skor lebih tinggi, **semua komponen** dalam rubrik harus dipenuhi dan dijelaskan secara eksplisit serta, jika mungkin, didukung bukti.

            Langkah-langkah Penilaian:
            1. Pahami aturan penilaian.  
            2. Pahami indikator dan deskripsi rubrik penilaian.
            3. Baca dan analisis isi isian asesi secara menyeluruh.
            4. Identifikasi isian asesi menjelaskan semua indikator atau tidak.
            5. Periksa apakah isian sesuai dengan *guidance* yang diberikan. Jika *guidance* mengarah pada bentuk implementasi tertentu, pastikan isian mencerminkan hal tersebut.
            6. Identifikasi bukti atau pernyataan dalam isian yang relevan dengan rubrik penilaian.
            7. Tentukan apakah indikator memerlukan bukti pendukung berdasarkan deskripsi indikator dan rubrik penilaian. Jika diperlukan, periksa ketersediaan dan relevansi bukti pendukung.
            8. Jika tersedia, analisis bukti pendukung seperti gambar. Evaluasi apakah bukti tersebut **mendukung pernyataan dalam isian**, dan apakah bukti tersebut menggambarkan pelaksanaan, bentuk, dampak, atau relevansi kegiatan.
            9. Bandingkan temuan dalam isian dengan kriteria skor (0, 1, 2, 3, 4).
            10. Tentukan skor yang paling sesuai berdasarkan kesesuaian isi dan bukti pendukung. Jika terdapat istilah/metode/kegiatan tanpa **penjelasan pelaksanaan, bentuk, dampak, atau relevansi** maka nilainya = **Skor 0**.
            11. Berikan penjelasan ringkas (masukan) yang mendasari skor tersebut.

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
                "apakah memerlukan bukti pendukung?" : <jawaban dari langkah no 7>   
            }
          PROMPT;
    }

    /**
     * Extract image URLs from assessment submission text.
     * 
     * Searches for image references in the format "Gambar : [URL]" 
     * within the submission text using regex pattern matching.
     *
     * @param string $isianAsesi The assessment submission text
     * @return array Array of extracted image URLs
     */
    private function extractImageUrls(string $isianAsesi): array
    {
        // Use regex to find all image URL patterns in the text
        preg_match_all('/Gambar\s*:\s*(.+)/', $isianAsesi, $matches);
        
        // Clean and return the extracted URLs
        $urls = array_map('trim', $matches[1] ?? []);

        return $urls;
    }

    /**
     * Clean the assessment submission text by removing image references.
     * 
     * Removes image URL lines and excessive blank lines to prepare
     * clean text content for AI analysis.
     *
     * @param string $text The original submission text
     * @return string Cleaned text without image references
     */
    private function cleanIsianAsesi(string $text): string
    {
        // Remove lines containing "Gambar : ..." and following empty lines
        $text = preg_replace('/Gambar\s*:\s*.+(?:\r?\n)?/i', '', $text);

        // Remove excessive blank lines (more than one newline)
        $text = preg_replace("/(\r?\n){2,}/", "\n\n", $text);

        return trim($text);
    }

    /**
     * Convert image URLs to blob data for AI processing.
     * 
     * Downloads images from local file system and converts them to
     * base64-encoded blobs that can be sent to Gemini AI.
     *
     * @param array $urls Array of image URLs to process
     * @return array Array of Blob objects for AI consumption
     */
    private function createImageBlobs(array $urls): array
    {
        $blobs = [];

        foreach ($urls as $url) {
            try {
                // Convert URL to local file system path
                $parsedUrl = parse_url($url);
                $relativePath = urldecode($parsedUrl['path']); // e.g., /storage/uploads/...
                $localPath = public_path($relativePath); // Full path: /project/public/storage/uploads/...

                // Check if file exists before processing
                if (!file_exists($localPath)) {
                    \Log::warning("File tidak ditemukan: $localPath");
                    continue;
                }

                // Read image file content
                $imageData = file_get_contents($localPath);

                // Determine MIME type based on file extension
                $mimeType = MimeType::IMAGE_JPEG; // Default to JPEG
                if (str_ends_with($url, '.png')) {
                    $mimeType = MimeType::IMAGE_PNG;
                } elseif (str_ends_with($url, '.webp')) {
                    $mimeType = MimeType::IMAGE_WEBP;
                }

                // Create blob object with base64-encoded image data
                $blobs[] = new Blob(
                    mimeType: $mimeType,
                    data: base64_encode($imageData)
                );
                
            } catch (\Exception $e) {
                // Log any errors in image processing but continue with other images
                \Log::warning("Gagal membaca gambar dari path: $url. Pesan: " . $e->getMessage());
            }
        }

        return $blobs;
    }

    /**
     * Extract and organize rubric scoring criteria from structured data.
     * 
     * Processes the rubric data structure to extract different components
     * (elements, indicators, descriptions, scores) based on type identifiers.
     *
     * @param array $details Raw rubric data with type-based structure
     * @return array Organized rubric data with named keys
     */
    private function extractRubrikPenilaian(array $details): array
    {
        // Initialize result structure with all expected rubric components
        $result = [
            'element' => '',        // Main evaluation element
            'guidance' => '',       // Evaluation guidance
            'indikator' => '',      // Quality indicator
            'description' => '',    // Detailed description
            'score_0' => '',        // Score 0 criteria
            'score_1' => '',        // Score 1 criteria
            'score_2' => '',        // Score 2 criteria
            'score_3' => '',        // Score 3 criteria
            'score_4' => '',        // Score 4 criteria
        ];

        // Process each detail item based on its type identifier
        foreach ($details as $detail) {
            switch ($detail['type']) {
                case 'E': // Element
                    $result['element'] = $detail['reference']; 
                    break;
                case 'G': // Guidance
                    $result['guidance'] = $detail['reference']; 
                    break;
                case 'I': // Indicator
                    $result['indikator'] = $detail['reference']; 
                    break;
                case 'D': // Description
                    $result['description'] = $detail['reference']; 
                    break;
                case 'S': // Score criteria
                    $seq = $detail['seq']; // Score level (0-4)
                    if (isset($result["score_$seq"])) {
                        $result["score_$seq"] = $detail['reference'];
                    }
                    break;
            }
        }

        return $result;
    }

    /**
     * Extract JSON data from AI response text.
     * 
     * Handles AI responses that may be formatted with markdown code blocks
     * or plain text, attempting to parse valid JSON from the content.
     *
     * @param string $text The raw AI response text
     * @return array|null Parsed JSON as array, or null if parsing failed
     */
    private function extractJsonFromText(string $text): ?array
    {
        // First, try to extract JSON from markdown code blocks
        preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $matches);

        if (!empty($matches[1])) {
            // JSON found within code blocks
            $jsonText = trim($matches[1]);
        } else {
            // No code blocks found, treat entire text as potential JSON
            $jsonText = trim($text);
        }

        // Attempt to decode the JSON string
        $decoded = json_decode($jsonText, true);

        // Return decoded data only if JSON parsing was successful
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
    }

    /**
     * Create a standardized error response format.
     * 
     * Provides consistent error response structure across the application
     * with optional additional data for debugging purposes.
     *
     * @param string $message The primary error message
     * @param array $additionalData Optional additional data to include
     * @return JsonResponse Formatted error response with HTTP 500 status
     */
    private function errorResponse(string $message, array $additionalData = []): JsonResponse
    {
        // Build base error response structure
        $response = [
            'success' => false,
            'error' => $message,
        ];

        // Merge in any additional debugging data
        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        // Return as JSON response with 500 status code
        return response()->json($response, 500);
    }
}