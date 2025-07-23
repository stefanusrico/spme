<?php

namespace App\Http\Controllers\Led;

use App\Http\Controllers\Controller;

use App\Models\Led\LedData;
use App\Models\Project\Task;
use App\Models\Project\TaskList;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

use PhpOffice\PhpWord\TemplateProcessor;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Shared\Html;

class LedDocumentController extends Controller
{
    // Import Document of LED
    public function importTemplateLed(Request $request)
    {
        try {
            // Ambil file dari request
            $file = $request->file('file'); // pastikan 'file' sesuai dengan nama input dari frontend

            if (!$file) {
                throw new \Exception("Tidak ada file yang diunggah.");
            }

            // Buat nama file unik (bisa diganti kalau ingin yang fixed)
            $fileName = 'LED_template.docx';

            // Simpan file ke folder 'public/templates'
            $storedPath = $file->storeAs('templates', $fileName, 'public');

            if (!$storedPath) {
                throw new \Exception("Gagal menyimpan file template LED ke storage lokal.");
            }

            // Return full URL
            return response()->json([
                'success' => true,
                'message' => 'Berhasil upload template LED',
                'url' => asset('storage/' . $storedPath)
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Upload ke local storage gagal: ' . $e->getMessage());
            throw new \Exception("Upload ke local storage gagal: " . $e->getMessage());
        }
    }

    public function exportData(Request $request)
    {
        try {
            $this->validateRequest($request);

            $templatePath = storage_path('app/public/templates/LED_template.docx');
            if (!file_exists($templatePath)) {
                return response()->json([
                    'message' => 'Template file not found.'
                ], 404);
            }

            $kriterias = $this->getKriterias($request);
            $phpWord = new PhpWord();
            $phpWord->setDefaultFontName('Times New Roman');
            $section = $phpWord->addSection();

            foreach ($kriterias as $kriteria) {
                $this->generateDocumentSection($section, $kriteria, $request->input('projectId'));
            }

            $exportDir = storage_path("app/public/exports");
            if (!file_exists($exportDir)) {
                mkdir($exportDir, 0755, true);
            }

            $fileName = "output_kriteria_" . time() . ".docx";
            $savePath = "{$exportDir}/{$fileName}";

            $phpWordWriter = IOFactory::createWriter($phpWord, 'Word2007');
            $phpWordWriter->save($savePath);

            return response()->download($savePath)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Something went wrong.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function validateRequest(Request $request)
    {
        $request->validate([
            'kriteria' => 'required|array',
            'projectId' => 'required|string',
        ]);
    }


    private function getKriterias(Request $request): array
    {
        $kriteria = $request->input('kriteria');
        $kriterias = is_array($kriteria) ? $kriteria : [$kriteria];
        Log::info('Processing kriteria: ' . implode(', ', $kriterias));
        return $kriterias;
    }

    private function generateDocumentSection($section, $kriteria, $projectId)
    {
        $section->addText("Kriteria : {$kriteria}", [
            'bold' => true,
            'size' => 14
        ]);

        $taskList = Tasklist::where('projectId', $projectId)
            ->where('kriteria', $kriteria)
            ->first();

        if (!$taskList) {
            Log::warning("No task list found for kriteria: {$kriteria} in project ID: {$projectId}");
            return;
        }

        $tasks = Task::where('taskListId', $taskList->_id)
            ->where('nama', 'like', '%Butir%')
            ->get();

        $groupedByNo = [];

        foreach ($tasks as $task) {
            $latestLedData = LedData::with(['task.ledItem'])
                ->where('taskId', $task->_id)
                ->orderBy('created_at', 'desc')
                ->first();

            $no = $task->ledItem['no'] ?? null;
            $sub = $task->ledItem['sub'] ?? null;

            if (!$no || !$sub)
                continue;

            if (!$latestLedData || !$latestLedData->details) {
                Log::warning("No LED data for task ID: {$task->_id}, {$task->nama}");
                $groupedByNo[$no]['subs'][] = $sub;
                $groupedByNo[$no]['texts'][] = "Belum ada isian di sub {$sub}";
                continue;
            }

            $parsedText = $this->parseDetailsToText($latestLedData->details);
            $groupedByNo[$no]['subs'][] = $sub;
            $groupedByNo[$no]['texts'][] = $parsedText ?: 'Belum ada isian';
        }

        foreach ($groupedByNo as $no => $data) {
            $this->addContentToSection($section, $no, $data['subs'], $data['texts']);
        }
    }

    private function parseDetailsToText($details): string
    {
        $combinedText = '';

        foreach ($details as $item) {
            $isian = json_decode($item['isianAsesi'], true);
            $blocks = $isian['blocks'] ?? [];
            $entities = $isian['entityMap'] ?? [];

            foreach ($blocks as $block) {
                if ($block['type'] === 'unstyled') {
                    $text = $block['text'];
                    $entityRanges = $block['entityRanges'] ?? [];

                    // Process entity ranges (links, etc.) within the text
                    if (!empty($entityRanges)) {
                        $processedText = $this->processTextWithEntities($text, $entityRanges, $entities);
                        $combinedText .= "[[TEXT_WITH_LINKS::" . base64_encode(json_encode([
                            'text' => $text,
                            'entityRanges' => $entityRanges,
                            'entities' => $entities
                        ])) . "]]\n\n";
                    } else {
                        // No entities, add text as is
                        $text = trim($text);
                        if ($text !== '') {
                            $combinedText .= $text . "\n\n";
                        }
                    }
                } elseif ($block['type'] === 'atomic') {
                    $entityKey = $block['entityRanges'][0]['key'] ?? null;
                    if ($entityKey !== null && isset($entities[$entityKey])) {
                        $entity = $entities[$entityKey];
                        
                        // Handle images
                        if ($entity['type'] === 'IMAGE' && isset($entity['data']['src'])) {
                            $src = $entity['data']['src'];
                            $imagePath = public_path(str_replace(url('/'), '', $src));
                            if (file_exists($imagePath)) {
                                $combinedText .= "[[IMAGE::{$imagePath}]]\n\n";
                            } else {
                                $combinedText .= "[Gambar tidak ditemukan: {$src}]\n\n";
                            }
                        }
                    }
                }
            }
        }

        return trim($combinedText);
    }

    /**
     * Process text with entities (links, etc.) and format them appropriately
     */
    private function processTextWithEntities(string $text, array $entityRanges, array $entities): string
    {
        $processedText = $text;
        $offset = 0;

        // Sort entity ranges by offset to process them in order
        usort($entityRanges, function($a, $b) {
            return $a['offset'] <=> $b['offset'];
        });

        foreach ($entityRanges as $range) {
            $entityKey = $range['key'];
            $rangeOffset = $range['offset'] + $offset;
            $rangeLength = $range['length'];

            if (isset($entities[$entityKey])) {
                $entity = $entities[$entityKey];
                
                if ($entity['type'] === 'LINK' && isset($entity['data']['url'])) {
                    $url = $entity['data']['url'];
                    $linkText = substr($text, $range['offset'], $range['length']);
                    
                    // Replace the link text with formatted link
                    $formattedLink = "{$linkText} ({$url})";
                    
                    $processedText = substr_replace(
                        $processedText, 
                        $formattedLink, 
                        $rangeOffset, 
                        $rangeLength
                    );
                    
                    // Adjust offset for next replacements
                    $offset += strlen($formattedLink) - $rangeLength;
                }
            }
        }

        return $processedText;
    }

    /**
     * Add content with proper hyperlink support to document section
     */
    private function addContentToSection($section, $no, $subs, $texts, $ledDataArray = [])
    {
        // Gabungkan nilai sub yang unik menjadi string, dipisahkan koma (contoh: "a, b, c")
        $subsText = implode(', ', array_unique($subs));

        //Dipisahkan dua baris (\n\n)
        $textCombined = implode("\n\n", $texts);

        // Tambahkan judul butir dan sub ke dokumen dengan teks tebal
        $section->addText("Butir {$no} Sub {$subsText} :", [
            'bold' => true
        ]);

        // Pisahkan teks menjadi paragraf berdasarkan dua baris baru
        $paragraphs = preg_split("/\n{2,}/", $textCombined);

        foreach ($paragraphs as $index => $paragraph) {
            if (trim($paragraph) === '')
                continue;

            // Cek jika paragraf adalah tag gambar dengan format [[IMAGE::path]]
            if (str_starts_with($paragraph, '[[IMAGE::') && str_ends_with($paragraph, ']]')) {
                $imgPath = str_replace(['[[IMAGE::', ']]'], '', trim($paragraph));

                // Jika file gambar ditemukan, tambahkan ke dokumen
                if (file_exists($imgPath)) {
                    $section->addImage($imgPath, [
                        'width' => 400,
                        'wrappingStyle' => 'square',
                        'alignment' => Jc::CENTER,
                    ]);
                }
            }
            // Cek jika paragraf mengandung teks dengan link
            elseif (str_starts_with($paragraph, '[[TEXT_WITH_LINKS::') && str_ends_with($paragraph, ']]')) {
                $encodedData = str_replace(['[[TEXT_WITH_LINKS::', ']]'], '', trim($paragraph));
                $linkData = json_decode(base64_decode($encodedData), true);
                
                if ($linkData) {
                    // Get corresponding LED data for URL conversion
                    $ledData = $ledDataArray[$index] ?? null;
                    $this->addTextWithHyperlinks($section, $linkData, $ledData);
                }
            }
            else {
                // Jika bukan gambar atau link, tambahkan sebagai teks biasa dengan format paragraf
                $section->addText(trim($paragraph), [], [
                    'spaceAfter' => 200,
                    'indentation' => ['firstLine' => 600],
                    'alignment' => Jc::BOTH,
                    'size' => 12,
                ]);
            }
        }

        $section->addTextBreak();
    }

    /**
     * Add text with hyperlinks to document section
     */
    private function addTextWithHyperlinks($section, $linkData, $ledData = null)
    {
        $text = $linkData['text'];
        $entityRanges = $linkData['entityRanges'];
        $entities = $linkData['entities'];

        // Sort entity ranges by offset
        usort($entityRanges, function($a, $b) {
            return $a['offset'] <=> $b['offset'];
        });

        $textRun = $section->addTextRun([
            'spaceAfter' => 200,
            'indentation' => ['firstLine' => 600],
            'alignment' => Jc::BOTH,
        ]);

        $currentPos = 0;

        foreach ($entityRanges as $range) {
            $entityKey = $range['key'];
            $offset = $range['offset'];
            $length = $range['length'];

            // Add text before the link
            if ($offset > $currentPos) {
                $beforeText = substr($text, $currentPos, $offset - $currentPos);
                $textRun->addText($beforeText, ['size' => 12]);
            }

            // Add the hyperlink
            if (isset($entities[$entityKey]) && $entities[$entityKey]['type'] === 'LINK') {
                $localUrl = $entities[$entityKey]['data']['url'];
                $linkText = substr($text, $offset, $length);
                
                // Convert local URL to Google Drive URL
                // Use LED data method first (more efficient), fallback to API method
                $driveUrl = $ledData ? 
                    $this->convertLocalUrlToDriveUrlFromLedData($localUrl, $ledData) : 
                    $this->convertLocalUrlToDriveUrl($localUrl);
                
                $textRun->addLink($driveUrl, $linkText, [
                    'size' => 12,
                    'color' => '0000FF',
                    'underline' => 'single'
                ]);
            } else {
                // If not a link, add as regular text
                $regularText = substr($text, $offset, $length);
                $textRun->addText($regularText, ['size' => 12]);
            }

            $currentPos = $offset + $length;
        }

        // Add remaining text after the last link
        if ($currentPos < strlen($text)) {
            $remainingText = substr($text, $currentPos);
            $textRun->addText($remainingText, ['size' => 12]);
        }
    }

    /**
     * Convert local URL to Google Drive URL with caching
     */
    private function convertLocalUrlToDriveUrl($localUrl)
    {
        try {
            // Extract path after 'uploads/'
            if (preg_match('/\/uploads\/(.+)$/', $localUrl, $matches)) {
                $relativePath = urldecode($matches[1]);
                
                // Check cache first
                if (isset($this->driveUrlCache[$relativePath])) {
                    return $this->driveUrlCache[$relativePath];
                }
                
                // Find file in Google Drive using the relative path
                $driveUrl = $this->findFileInGoogleDrive($relativePath);
                
                if ($driveUrl) {
                    // Cache the result
                    $this->driveUrlCache[$relativePath] = $driveUrl;
                    return $driveUrl;
                }
            }
            
            return $localUrl; // Fallback to original URL
            
        } catch (\Exception $e) {
            Log::warning("Failed to convert local URL to Drive URL: {$localUrl}. Error: " . $e->getMessage());
            return $localUrl; // Fallback to original URL
        }
    }

    /**
     * Alternative method: Use existing pdfFiles data from LED details
     * This is more efficient as it uses existing data instead of API calls
     */
    private function convertLocalUrlToDriveUrlFromLedData($localUrl, $ledData)
    {
        try {
            // Check if we have pdfFiles data in LED details
            if (isset($ledData->details)) {
                foreach ($ledData->details as $detail) {
                    if (isset($detail['pdfFiles']) && is_array($detail['pdfFiles'])) {
                        foreach ($detail['pdfFiles'] as $pdfFile) {
                            if (isset($pdfFile['local_url']) && $pdfFile['local_url'] === $localUrl) {
                                return $pdfFile['drive_url'] ?? $localUrl;
                            }
                        }
                    }
                }
            }
            
            return $localUrl; // Fallback to original URL if not found
            
        } catch (\Exception $e) {
            Log::warning("Failed to convert local URL using LED data: {$localUrl}. Error: " . $e->getMessage());
            return $localUrl;
        }
    }

    /**
     * Find file in Google Drive based on relative path
     */
    private function findFileInGoogleDrive($relativePath)
    {
        try {
            $client = new \Google_Client();
            $client->setAuthConfig(storage_path('app/google-drive.json'));
            $client->addScope(\Google_Service_Drive::DRIVE_READONLY);
            
            $service = new \Google_Service_Drive($client);
            $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');
            
            if (!$parentFolderId) {
                Log::warning("GOOGLE_DRIVE_FOLDER_ID not set in environment");
                return null;
            }
            
            // Split path into folders and filename
            $pathParts = explode('/', $relativePath);
            $fileName = array_pop($pathParts);
            $folderPath = $pathParts;
            
            // Navigate through folder structure
            $currentFolderId = $parentFolderId;
            
            foreach ($folderPath as $folderName) {
                $currentFolderId = $this->findFolderInDrive($service, $folderName, $currentFolderId);
                if (!$currentFolderId) {
                    Log::warning("Folder not found in Drive: {$folderName}");
                    return null;
                }
            }
            
            // Find the file in the final folder
            $fileId = $this->findFileInDriveFolder($service, $fileName, $currentFolderId);
            
            if ($fileId) {
                return "https://drive.google.com/file/d/{$fileId}/view?usp=sharing";
            }
            
            Log::warning("File not found in Drive: {$fileName}");
            return null;
            
        } catch (\Exception $e) {
            Log::error("Error finding file in Google Drive: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Find folder in Google Drive
     */
    private function findFolderInDrive($service, $folderName, $parentId)
    {
        try {
            $query = "name='{$folderName}' and '{$parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
            
            $results = $service->files->listFiles([
                'q' => $query,
                'fields' => 'files(id, name)',
                'pageSize' => 1
            ]);
            
            $files = $results->getFiles();
            
            if (count($files) > 0) {
                return $files[0]->getId();
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error("Error finding folder in Drive: {$folderName}. Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Find file in specific Google Drive folder
     */
    private function findFileInDriveFolder($service, $fileName, $folderId)
    {
        try {
            $query = "name='{$fileName}' and '{$folderId}' in parents and trashed=false";
            
            $results = $service->files->listFiles([
                'q' => $query,
                'fields' => 'files(id, name)',
                'pageSize' => 1
            ]);
            
            $files = $results->getFiles();
            
            if (count($files) > 0) {
                return $files[0]->getId();
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error("Error finding file in Drive folder: {$fileName}. Error: " . $e->getMessage());
            return null;
        }
    }
}