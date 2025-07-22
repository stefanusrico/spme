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
            set_time_limit(6000); // 10 menit
            ini_set('max_execution_time', 6000);

            // Validate incoming request data structure
            $request->validate([
                'dataLedItem' => 'required|array',  // Rubric/scoring criteria data
                'dataIsian' => 'required|array',    // Assessment submission data
            ]);

            // Extract validated data from request
            $prodi = $request->input('prodi');
            $dataLedItem = $request->input('dataLedItem');
            $dataIsian = $request->input('dataIsian');

            // Log input data for debugging purposes
            \Log::info([
                'data led item' => $dataLedItem,
                'data isian' => $dataIsian,
                'prodi' => $prodi,
            ]);

            // Process images and PDFs from submission content
            \Log::info('Start processing files at: ' . now());

            // Extract image URLs from the submission text
            $imageUrls = $this->extractImageUrls($dataIsian['isianAsesi']);
            \Log::info('Daftar URL gambar yang diekstrak dari isian asesi:', [
                'imageUrls' => $imageUrls
            ]);

            // Extract pdf URLs from the submission text
            $pdfUrls = $this->extractPdfUrls($dataIsian['isianAsesi']);
            \Log::info('Daftar URL pdf yang diekstrak dari isian asesi:', [
                'pdfUrls' => $pdfUrls
            ]);

            // Convert image URLs to blob data for AI processing
            $imageBlobs = $this->createImageBlobs($imageUrls);
            \Log::info('Image blobs processing result:', [
                'input_urls_count' => count($imageUrls),
                'output_blobs_count' => count($imageBlobs),
                'success_rate' => count($imageUrls) > 0 ? (count($imageBlobs) / count($imageUrls) * 100) . '%' : '0%'
            ]);

            // Convert PDF URLs to blob data for AI processing
            $pdfBlobs = $this->createPdfBlobs($pdfUrls);
            \Log::info('PDF blobs processing result:', [
                'input_urls_count' => count($pdfUrls),
                'output_blobs_count' => count($pdfBlobs),
                'success_rate' => count($pdfUrls) > 0 ? (count($pdfBlobs) / count($pdfUrls) * 100) . '%' : '0%'
            ]);

            \Log::info('End processing files at: ' . now());

            // Build the comprehensive AI prompt with rubric and submission data
            // Pass information about available evidence to the prompt
            $hasImageEvidence = !empty($imageBlobs);
            $hasPdfEvidence = !empty($pdfBlobs);
            $prompt = $this->buildPrompt($dataLedItem, $dataIsian, $prodi, $hasImageEvidence, $hasPdfEvidence, $imageUrls, $pdfUrls);

            // Combine text prompt with image/PDF blobs for multimodal AI analysis
            $contents = array_merge([$prompt], $imageBlobs, $pdfBlobs);

            // Count tokens for validation
            $tokenResponse = Gemini::generativeModel(model: 'gemini-2.0-flash')
                ->countTokens($contents);

            // Check if token count exceeds limit (1,000,000 tokens)
            if ($tokenResponse->totalTokens > 1000000) {
                return $this->errorResponse(
                    'Token count exceeds limit. Maximum allowed: 1,000,000 tokens, Current: ' . $tokenResponse->totalTokens . ' tokens',
                    ['token_count' => $tokenResponse->totalTokens, 'limit' => 1000000]
                );
            }

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
                'response json result' => $jsonResult,
                'has_image_evidence' => $hasImageEvidence,
                'has_pdf_evidence' => $hasPdfEvidence
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
                'mapping' => $jsonResult,
                'token_used' => $tokenResponse->totalTokens,
                'evidence_summary' => [
                    'images_found' => count($imageUrls),
                    'pdfs_found' => count($pdfUrls),
                    'images_processed' => count($imageBlobs),
                    'pdfs_processed' => count($pdfBlobs)
                ]
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
     * @param bool $hasImageEvidence Whether image evidence is available
     * @param bool $hasPdfEvidence Whether PDF evidence is available
     * @return string The formatted prompt for AI processing
     */
    private function buildPrompt(array $dataLedItem, array $dataIsian, string $prodi, bool $hasImageEvidence = false, bool $hasPdfEvidence = false, array $imageUrls = [], array $pdfUrls = []): string
    {
        // Extract and organize rubric criteria from the data structure
        $details = $this->extractRubrikPenilaian($dataLedItem['details']);
        $isianAsesi = $dataIsian['isianAsesi'];

        // Build evidence status information
        $evidenceStatus = $this->buildDetailedEvidenceStatus($hasImageEvidence, $hasPdfEvidence, $imageUrls, $pdfUrls);

        // Build comprehensive prompt with role definition, rules, and data
        return <<<PROMPT
        Role:
        Anda adalah seorang evaluator akreditasi perguruan tinggi yang bertugas menilai kesesuaian antara isian asesi dengan indikator kualitatif berdasarkan rubrik penilaian yang ditentukan. Pastikan isian asesi berisi **penjelasan substantif** tentang implementasi, bukan sekadar menyebut istilah.

        Tujuan:
        Menilai apakah isian yang diberikan sesuai dengan indikator kualitatif, serta menentukan skor (0, 1, 2, 3, atau 4) berdasarkan rubrik. Penilaian harus dilakukan dengan penalaran bertahap dan konsisten.

        **PRODI TARGET: {$prodi}**

        Prinsip Fundamental Penilaian:
        - **WAJIB**: Setiap istilah/metode/kegiatan HARUS disertai **penjelasan pelaksanaan, bentuk, dampak, atau relevansi**
        - **Tanpa penjelasan substantif = Skor 0**, regardless of keyword matching
        - **Konsistensi**: Gunakan standar yang sama untuk semua indikator sejenis
        - **Objektifitas**: Evaluasi berdasarkan fakta dalam isian, bukan asumsi atau ekspektasi
        - **Konservatif**: Jika ragu antara 2 skor, pilih yang lebih rendah dengan justifikasi jelas
        - **VALIDASI PRODI WAJIB**: Periksa kesesuaian dengan prodi target di SETIAP langkah penilaian

        Aturan Penilaian (CRITICAL):
        1. Isian kosong/placeholder/tidak relevan → **Skor 0**
        2. Menyebut istilah tanpa penjelasan → **Skor 0**
        3. Penjelasan parsial dengan pemahasan dasar → **Skor 1-2**
        4. Penjelasan lengkap sesuai rubrik → **Skor 3-4**
        5. Skor desimal hanya jika ada justifikasi yang sangat kuat
        6. Bukti pendukung **memperkuat** isian, bukan menggantikan penjelasan
        7. **ATURAN UPPS/PRODI (PRIORITAS TERTINGGI)**:
           - **Langkah WAJIB**: Identifikasi apakah indikator bersifat UPPS (umum institusi) atau PRODI (spesifik program studi)
           - **Jika indikator UPPS**: Isian boleh bersifat umum institusi, TIDAK boleh spesifik ke prodi tertentu
           - **Jika indikator PRODI**: Isian HARUS spesifik dan relevan dengan "{$prodi}". Isian yang mengarah ke prodi lain (seperti Teknik Mesin, Teknik Sipil, dll) → **OTOMATIS SKOR 0**
           - **Validasi Ketat**: Periksa nama prodi, mata kuliah, laboratorium, kegiatan, dan konteks yang disebutkan
           - **Zero Tolerance**: Tidak ada toleransi untuk ketidaksesuaian prodi pada indikator spesifik prodi

        Contoh Kalibrasi:
        ❌ SALAH: "Program studi memiliki sistem penjaminan mutu" → Skor 0 (tidak ada penjelasan)
        ✅ BENAR: "Program studi memiliki sistem penjaminan mutu melalui Tim SPMI yang melaksanakan audit internal semester, monitoring perkuliahan mingguan, dan evaluasi kurikulum tahunan dengan melibatkan stakeholder eksternal" → Skor 2-3

        PENTING - Status Bukti Pendukung:
        $evidenceStatus

        Langkah-langkah Penilaian (HARUS BERURUTAN):
        1. **Pahami prinsip fundamental dan aturan penilaian**
        2. **Pahami indikator, deskripsi, dan rubrik penilaian secara detail**
        3. **KRITIS: Identifikasi apakah indikator ini bersifat UPPS (umum) atau PRODI (spesifik)**
        4. **Baca dan analisis isi isian asesi secara komprehensif**
        5. **VALIDASI PRODI (LANGKAH KUNCI):**
           - Jika indikator PRODI: Periksa apakah SEMUA konteks dalam isian sesuai dengan "{$prodi}"
           - Identifikasi nama prodi, mata kuliah, lab, kegiatan yang disebutkan
           - Jika ada ketidaksesuaian dengan "{$prodi}" → LANGSUNG SKOR 0, STOP evaluasi
        6. **Identifikasi apakah isian menjelaskan semua komponen indikator**
        7. **Periksa kesesuaian isian dengan guidance yang diberikan**
        8. **Identifikasi bukti atau pernyataan dalam isian yang relevan dengan rubrik**
        9. **Tentukan apakah indikator memerlukan bukti pendukung berdasarkan konteks**
        10. **Analisis bukti pendukung (jika tersedia) dan relevansinya dengan isian**
        11. **Bandingkan temuan dengan kriteria skor (0-4) secara objektif**
        12. **Tentukan skor berdasarkan kesesuaian dengan rubrik, bukan ekspektasi**
        13. **Berikan masukan konstruktif yang spesifik dan actionable**

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

        Output Requirements:
        Lakukan penalaran bertahap berdasarkan 13 langkah di atas dengan PRIORITAS UTAMA pada validasi prodi di langkah 5. Berikan hasil dalam format JSON yang exact tanpa tambahan teks apapun.

        CRITICAL: Jangan membuat asumsi tentang bukti yang tidak tersedia. Hanya analisis bukti yang benar-benar diproses.

        Format Jawaban (JSON):
        {
            "langkah_penalaran": [
                "Langkah 1: <tuliskan reasoning>",
                "Langkah 2: <tuliskan reasoning>",
                "Langkah 3: <identifikasi apakah indikator bersifat UPPS atau PRODI>",
                "Langkah 4: <tuliskan reasoning>",
                "Langkah 5: <VALIDASI PRODI - periksa kesesuaian dengan {$prodi}, sebutkan secara eksplisit prodi apa yang terdeteksi dalam isian>",
                "...",
                "Langkah 13: <justifikasi dan masukan konstruktif>"
            ],
            "nilai": "<skor akhir, bisa juga berupa desimal, namun dengan alasan yang jelas>",
            "masukan": "<penjelasan ringkas, dan beri tahu apa yang kurang jika nilai tidak maskimal, dan beri komentar bukti pendukung jika tersedia, serta sebutkan ketidaksesuaian prodi jika ada>",
            "apakah_indikator_upps_atau_prodi": "<UPPS atau PRODI>",
            "prodi_terdeteksi_dalam_isian": "<sebutkan prodi apa yang terdeteksi, atau 'sesuai dengan target' jika cocok>",
            "apakah_sesuai_prodi_target": "<Ya/Tidak dengan penjelasan>",
            "apakah_memerlukan_bukti_pendukung": "<jawaban dari langkah evaluasi>",
            "apakah_ada_bukti_pendukung_gambar": [
                {
                "nama_file": "<nama file gambar>",
                "isi": "<penjelasan ringkas tentang isi gambar dan relevansinya>"
                }
            ],
            "apakah_ada_bukti_pendukung_pdf": [
                {
                "nama_file": "<nama file PDF>",
                "ringkasan": "<penjelasan ringkas isi PDF>"
                }
            ]
        }
      PROMPT;
    }

    /**
     * Build evidence status information for the prompt
     */
    private function buildDetailedEvidenceStatus(bool $hasImageEvidence, bool $hasPdfEvidence, array $imageUrls, array $pdfUrls): string
    {
        $status = [];

        if ($hasImageEvidence) {
            $status[] = "- Bukti pendukung GAMBAR: TERSEDIA (" . count($imageUrls) . " file)";
            foreach ($imageUrls as $i => $url) {
                $fileName = basename($url);
                $status[] = "  File " . ($i + 1) . ": $fileName";
            }
        } else {
            $status[] = "- Bukti pendukung GAMBAR: TIDAK TERSEDIA";
        }

        if ($hasPdfEvidence) {
            $status[] = "- Bukti pendukung PDF: TERSEDIA (" . count($pdfUrls) . " file)";
            foreach ($pdfUrls as $i => $url) {
                $fileName = basename($url);
                $status[] = "  File " . ($i + 1) . ": $fileName";
            }
        } else {
            $status[] = "- Bukti pendukung PDF: TIDAK TERSEDIA";
        }

        return implode("\n", $status);
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
    /**
     * Extract image URLs from assessment submission text.
     * Fixed version that handles URLs with spaces and special characters
     */
    private function extractImageUrls(string $isianAsesi): array
    {
        $urls = [];
        $lines = explode("\n", $isianAsesi);

        foreach ($lines as $line) {
            $line = trim($line);

            // Cari baris yang dimulai dengan "Gambar :" dan diikuti URL/path
            if (preg_match('/^Gambar\s*:\s*(.+)$/i', $line, $matches)) {
                $url = trim($matches[1]);

                if (empty($url)) {
                    continue;
                }

                // URL encode spaces and special characters for validation
                $encodedUrl = $this->encodeUrlSpaces($url);
                \Log::info("Original URL: $url");
                \Log::info("Encoded URL for validation: $encodedUrl");

                // Validasi URL yang lebih fleksibel
                $isValidUrl = $this->isValidImageUrl($url, $encodedUrl);

                if ($isValidUrl) {
                    $urls[] = $url; // Simpan URL asli
                    \Log::info("URL gambar valid ditemukan: $url");
                } else {
                    \Log::info("URL gambar tidak valid atau tidak memiliki ekstensi gambar: $url");
                }
            }
        }

        if (empty($urls)) {
            \Log::info("Tidak ada URL gambar yang valid ditemukan dalam format 'Gambar : [URL]'");
        }

        return $urls;
    }

    /**
     * Helper method to encode spaces in URLs for validation
     */
    private function encodeUrlSpaces(string $url): string
    {
        // Parse URL components
        $parsed = parse_url($url);

        if ($parsed === false) {
            return $url;
        }

        // Encode only the path component
        if (isset($parsed['path'])) {
            $parsed['path'] = str_replace(' ', '%20', $parsed['path']);
        }

        // Rebuild URL
        $encodedUrl = '';
        if (isset($parsed['scheme'])) {
            $encodedUrl .= $parsed['scheme'] . '://';
        }
        if (isset($parsed['host'])) {
            $encodedUrl .= $parsed['host'];
        }
        if (isset($parsed['port'])) {
            $encodedUrl .= ':' . $parsed['port'];
        }
        if (isset($parsed['path'])) {
            $encodedUrl .= $parsed['path'];
        }
        if (isset($parsed['query'])) {
            $encodedUrl .= '?' . $parsed['query'];
        }
        if (isset($parsed['fragment'])) {
            $encodedUrl .= '#' . $parsed['fragment'];
        }

        return $encodedUrl;
    }

    /**
     * More flexible URL validation for image URLs
     */
    private function isValidImageUrl(string $originalUrl, string $encodedUrl): bool
    {
        // Check if it has image extension
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        $hasImageExtension = false;

        foreach ($imageExtensions as $ext) {
            if (preg_match('/\.' . $ext . '$/i', $originalUrl)) {
                $hasImageExtension = true;
                break;
            }
        }

        if (!$hasImageExtension) {
            \Log::info("URL tidak memiliki ekstensi gambar yang valid: $originalUrl");
            return false;
        }

        // Try to validate encoded URL
        if (filter_var($encodedUrl, FILTER_VALIDATE_URL)) {
            \Log::info("URL valid setelah encoding: $encodedUrl");
            return true;
        }

        // Check if it's a local path (starts with /)
        if (strpos($originalUrl, '/') === 0) {
            \Log::info("URL adalah path lokal: $originalUrl");
            return true;
        }

        // Additional check for localhost URLs with spaces
        if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//', $originalUrl)) {
            \Log::info("URL adalah localhost dengan format khusus: $originalUrl");
            return true;
        }

        return false;
    }

    /**
     * Extract PDF URLs from assessment submission text.
     */
    private function extractPdfUrls(string $isianAsesi): array
    {
        $urls = [];
        $lines = explode("\n", $isianAsesi);

        foreach ($lines as $line) {
            $line = trim($line);

            // Hanya cari baris yang PERSIS dimulai dengan "PDF :" atau "Dokumen :" dan diikuti URL/path
            if (preg_match('/^(?:PDF|Dokumen)\s*:\s*(.+\.pdf)$/i', $line, $matches)) {
                $url = trim($matches[1]);

                // Validasi bahwa ini benar-benar URL atau path file PDF
                if (
                    !empty($url) && (
                        filter_var($url, FILTER_VALIDATE_URL) ||
                        (strpos($url, '/') === 0 && str_ends_with(strtolower($url), '.pdf'))
                    )
                ) {
                    $urls[] = $url;
                    \Log::info("URL PDF valid ditemukan: $url");
                } else {
                    \Log::info("URL PDF tidak valid: $url");
                }
            }
        }

        if (empty($urls)) {
            \Log::info("Tidak ada URL PDF yang valid ditemukan dalam format 'PDF : [URL]' atau 'Dokumen : [URL]'");
        }

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
        $text = preg_replace('/^Gambar\s*:\s*.+(?:\r?\n)?/im', '', $text);

        // Remove baris yang mengandung "PDF : ..." atau "Dokumen : ..."
        $text = preg_replace('/^(?:PDF|Dokumen)\s*:\s*.+(?:\r?\n)?/im', '', $text);

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
    /**
     * Convert image URLs to blob data for AI processing.
     * Fixed version that properly handles URLs with spaces
     */
    private function createImageBlobs(array $urls): array
    {
        if (empty($urls)) {
            \Log::info('Tidak ada URL Gambar untuk diproses');
            return [];
        }

        $blobs = [];

        foreach ($urls as $url) {
            try {
                \Log::info("Memproses URL: $url");

                // Convert URL to local file system path
                $parsedUrl = parse_url($url);

                if (!$parsedUrl || !isset($parsedUrl['path'])) {
                    \Log::warning("URL tidak valid atau tidak memiliki path: $url");
                    continue;
                }

                // Decode URL path to handle spaces and special characters
                $relativePath = urldecode($parsedUrl['path']); // e.g., /storage/uploads/...

                \Log::info("Relative path setelah decode: $relativePath");

                $localPath = public_path($relativePath); // Full path: /project/public/storage/uploads/...

                \Log::info("Local path lengkap: $localPath");

                // Check if file exists before processing
                if (!file_exists($localPath)) {
                    \Log::warning("File gambar tidak ditemukan: $localPath");

                    // Try alternative path construction
                    $alternativePath = public_path(ltrim($relativePath, '/'));
                    \Log::info("Mencoba path alternatif: $alternativePath");

                    if (file_exists($alternativePath)) {
                        $localPath = $alternativePath;
                        \Log::info("File ditemukan di path alternatif: $localPath");
                    } else {
                        \Log::warning("File tidak ditemukan di kedua lokasi");
                        continue;
                    }
                }

                // Check if it's actually a file (not directory)
                if (!is_file($localPath)) {
                    \Log::warning("Path bukan file: $localPath");
                    continue;
                }

                // Check file size (optional: skip very large files)
                $fileSize = filesize($localPath);
                if ($fileSize === false || $fileSize > 10 * 1024 * 1024) { // 10MB limit
                    \Log::warning("File terlalu besar atau tidak dapat dibaca: $localPath (Size: $fileSize bytes)");
                    continue;
                }

                // Read image file content
                $imageData = file_get_contents($localPath);
                if ($imageData === false) {
                    \Log::warning("Gagal membaca file gambar: $localPath");
                    continue;
                }

                // Determine MIME type based on file extension
                $mimeType = $this->determineMimeType($url);

                \Log::info("MIME type ditentukan: " . $mimeType->value);

                // Create blob object with base64-encoded image data
                $blobs[] = new Blob(
                    mimeType: $mimeType,
                    data: base64_encode($imageData)
                );

                \Log::info("Gambar berhasil diproses menjadi blob: $url (Size: " . strlen($imageData) . " bytes)");

            } catch (\Exception $e) {
                // Log any errors in image processing but continue with other images
                \Log::warning("Gagal memproses gambar dari URL: $url. Pesan: " . $e->getMessage());
                \Log::warning("Stack trace: " . $e->getTraceAsString());
            }
        }

        \Log::info("Total blob gambar yang berhasil dibuat: " . count($blobs));
        return $blobs;
    }

    /**
     * Helper method to determine MIME type from file extension
     */
    private function determineMimeType(string $url): MimeType
    {
        $extension = strtolower(pathinfo($url, PATHINFO_EXTENSION));

        return match ($extension) {
            'png' => MimeType::IMAGE_PNG,
            'webp' => MimeType::IMAGE_WEBP,
            'gif' => MimeType::IMAGE_GIF,
            'jpg', 'jpeg' => MimeType::IMAGE_JPEG,
            default => MimeType::IMAGE_JPEG, // Default fallback
        };
    }

    /**
     * Convert PDF URLs to blob data for AI processing.
     */
    private function createPdfBlobs(array $urls): array
    {
        if (empty($urls)) {
            \Log::info('Tidak ada URL PDF untuk diproses');
            return [];
        }

        $blobs = [];
        $successCount = 0;
        $failCount = 0;

        \Log::info("Memulai pemrosesan " . count($urls) . " URL PDF");

        foreach ($urls as $index => $url) {
            try {
                \Log::info("[$index] Memproses PDF URL: $url");

                // Convert URL ke path lokal
                $parsedUrl = parse_url($url);

                if (!$parsedUrl || !isset($parsedUrl['path'])) {
                    \Log::warning("[$index] URL tidak valid atau tidak memiliki path: $url");
                    $failCount++;
                    continue;
                }

                // Decode URL path untuk handle spaces dan karakter khusus
                $relativePath = urldecode($parsedUrl['path']);
                $localPath = public_path($relativePath);

                \Log::info("[$index] Relative path: $relativePath");
                \Log::info("[$index] Local path: $localPath");

                // Check apakah file PDF ada
                if (!file_exists($localPath)) {
                    \Log::warning("[$index] PDF tidak ditemukan: $localPath");

                    // Try alternative path construction
                    $alternativePath = public_path(ltrim($relativePath, '/'));
                    \Log::info("[$index] Mencoba path alternatif: $alternativePath");

                    if (file_exists($alternativePath)) {
                        $localPath = $alternativePath;
                        \Log::info("[$index] File ditemukan di path alternatif: $localPath");
                    } else {
                        \Log::warning("[$index] File tidak ditemukan di kedua lokasi");
                        $failCount++;
                        continue;
                    }
                }

                // Check if it's actually a file (not directory)
                if (!is_file($localPath)) {
                    \Log::warning("[$index] Path bukan file: $localPath");
                    $failCount++;
                    continue;
                }

                // Check file size (skip very large files > 20MB)
                $fileSize = filesize($localPath);
                if ($fileSize === false) {
                    \Log::warning("[$index] Tidak dapat membaca ukuran file: $localPath");
                    $failCount++;
                    continue;
                }

                if ($fileSize > 20 * 1024 * 1024) { // 20MB limit
                    \Log::warning("[$index] File terlalu besar: $localPath (Size: " . round($fileSize / 1024 / 1024, 2) . "MB)");
                    $failCount++;
                    continue;
                }

                \Log::info("[$index] File size: " . round($fileSize / 1024 / 1024, 2) . "MB");

                // Baca konten PDF
                $pdfData = file_get_contents($localPath);
                if ($pdfData === false) {
                    \Log::warning("[$index] Gagal membaca file PDF: $localPath");
                    $failCount++;
                    continue;
                }

                // Buat blob untuk PDF
                $blobs[] = new Blob(
                    mimeType: MimeType::APPLICATION_PDF,
                    data: base64_encode($pdfData)
                );

                $successCount++;
                \Log::info("[$index] PDF berhasil diproses menjadi blob: $url (Size: " . strlen($pdfData) . " bytes)");

            } catch (\Exception $e) {
                $failCount++;
                \Log::error("[$index] Exception saat memproses PDF: $url");
                \Log::error("[$index] Error message: " . $e->getMessage());
                \Log::error("[$index] Stack trace: " . $e->getTraceAsString());
            }
        }

        \Log::info("Hasil pemrosesan PDF - Berhasil: $successCount, Gagal: $failCount, Total blob: " . count($blobs));
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
