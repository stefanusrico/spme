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

class WordController extends Controller
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
            $request->validate([
                'kriteria' => 'required|array',
                'projectId' => 'required|string',
            ]);

            $templatePath = storage_path('app/public/templates/LED_template.docx');
            Log::info('Processing path: ' . $templatePath);

            if (!file_exists($templatePath)) {
                return response()->json([
                    'message' => 'Template file not found.'
                ], 404);
            }

            if ($request->has('kriteria')) {
                $kriteria = $request->input('kriteria');
                $kriterias = is_array($kriteria) ? $kriteria : [$kriteria];
                Log::info('Processing kriteria: ' . implode(', ', $kriterias));
            }

            $templateProcessor = new TemplateProcessor($templatePath);
            // Gabungkan semua data ke dalam satu string
            $finalContent = '';
            $fileList = [];

            foreach ($kriterias as $kriteria) {
                
                $templateProcessor->setValue('kriteria_nama', $kriteria);

                $taskList = Tasklist::where('projectId', $request->input('projectId'))
                                    ->where('kriteria', $kriteria)
                                    ->first();

                if (!$taskList) {
                    Log::warning("No task list found for kriteria: {$kriteria}");
                    continue;
                }

                $tasks = Task::where('taskListId', $taskList->_id)->where('nama', 'like', '%Butir%')->get();
                
                $finalContent .= "Kriteria : {$kriteria}\n\n";

                Log::info('Processing task list: ', ['taskList' => $taskList]);
                Log::info('Processing Task: ', ['tasks' => $tasks]);

                $data = '';
                foreach($tasks as $task){
                    $latestLedData = LedData::with(['task.ledItem'])
                        ->where('taskId', $task->_id)
                        ->orderBy('created_at', 'desc')
                        ->first();
                    
                    if (!$latestLedData || !$latestLedData->details) {
                        Log::warning("No LED data found for task ID: {$task->_id}, {$task->nama}");
                        Log::warning("No LED data found for task list: {$kriteria}");
                        $finalContent .= "- Butir {$task->ledItem['no']} Sub {$task->ledItem['sub']} : Belum ada isian\n\n";
                        continue; // Lewati task ini jika tidak ada data
                    }    
                    Log::info('Processing LED Data: ' . $latestLedData?->toJson());

                    $details = $latestLedData->details;
                    $combinedText = '';
                    
                    foreach($details as $item){
                        $isian = json_decode($item['isianAsesi'], true);

                        // Periksa jika ada blocks
                        if (!empty($isian['blocks'])) {
                            foreach ($isian['blocks'] as $block) {
                                $text = trim($block['text']);

                                // Tambahkan jika teks tidak kosong
                                if ($text !== '') {
                                    $combinedText .= $text . ' ';
                                }
                            }
                        }
                    }

                    $combinedText = trim($combinedText);
                    $finalContent .= "- Butir {$task->ledItem['no']} Sub {$task->ledItem['sub']} : {$combinedText}\n\n";
                    $data .= "- Butir {$task->ledItem['no']} Sub {$task->ledItem['sub']} : {$combinedText}\n\n";
                }
                
                $finalContent .= "\n\n";
            }   

            $templateProcessor->setValue('butir_list', htmlspecialchars($finalContent));

            $exportDir = storage_path("app/public/exports");
            if (!file_exists($exportDir)) {
                mkdir($exportDir, 0755, true); // Pastikan foldernya ada
            }

            $fileName = "output_kriteria_" . time() . ".docx";
            $savePath = "{$exportDir}/{$fileName}";
            $templateProcessor->saveAs($savePath);

            return response()->download($savePath)->deleteFileAfterSend(true);
            // return response()->json([
            //     'success' => true,
            //     'message' => $fileName
            // ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Something went wrong.',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
