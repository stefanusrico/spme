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
            Log::warning("No task list found for kriteria: {$kriteria}");
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
                    $text = trim($block['text']);
                    if ($text !== '') {
                        $combinedText .= $text . "\n\n";
                    }
                } elseif ($block['type'] === 'atomic') {
                    $entityKey = $block['entityRanges'][0]['key'] ?? null;
                    if ($entityKey !== null && isset($entities[$entityKey])) {
                        $entity = $entities[$entityKey];
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

    private function addContentToSection($section, $no, $subs, $texts)
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

        foreach ($paragraphs as $paragraph) {
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
            } else {
                // Jika bukan gambar, tambahkan sebagai teks biasa dengan format paragraf
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

}