<?php

namespace App\Http\Controllers\Led;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;


class GPTController extends Controller
{
    private function createPrompt($dataMatriks, $dataIsian)
    {
        $element = '';
        $guidance = '';
        $indikator = '';
        $description = '';
        $score_0 = '';
        $score_1 = '';
        $score_2 = '';
        $score_3 = '';
        $score_4 = '';

        foreach ($dataMatriks['details'] as $detail) {
            switch ($detail['Type']) {
                case 'E':
                    $element = $detail['Reference'];
                    break;
                case 'G':
                    $guidance = $detail['Reference'];
                    break;
                case 'I':
                    $indikator = $detail['Reference'];
                    break;
                case 'D':
                    $description = $detail['Reference'];
                    break;
                case 'S':
                    switch ($detail['Seq']) {
                        case '0':
                            $score_0 = $detail['Reference'];
                            break;
                        case '1':
                            $score_1 = $detail['Reference'];
                            break;
                        case '2':
                            $score_2 = $detail['Reference'];
                            break;
                        case '3':
                            $score_3 = $detail['Reference'];
                            break;
                        case '4':
                            $score_4 = $detail['Reference'];
                            break;
                    }
                    break;
            }
        }
        ;

        $isian_asesi = $dataIsian['Isian Asesi'];

        $prompt = "
            Saya memiliki beberapa matriks penilaian kualitatif untuk akreditasi suatu perguruan tinggi, matriks tersebut memiliki nilai 0, 1, 2, 3, 4, dengan penjelasan untuk masing-masing nilai. Tolong bantu saya menganalisis suatu isian berdasarkan matriks berikut :

                Elemen: $element
                
                Penilaian:
                - 0: $score_0
                - 1: $score_1
                - 2: $score_2
                - 3: $score_3
                - 4: $score_4

                Isian:
                $isian_asesi
                
                Pertanyaan:
                Apakah isiian di atas memenuhi poin penilaian kriteria indikator '$indikator'? Jika isian tidak relevan atau tidak memberikan informasi yang sesuai dengan kriteria penilaian, langsung berikan nilai 0 dan beri masukan 'Informasi tidak mencukupi untuk evaluasi.'

                Tolong jawab HANYA dalam format JSON tanpa tambahan teks lain, sebagai berikut:

                json
                {
                    \"nilai\": \"<skor yang sesuai>\",
                    \"masukan\": \"<penjelasan ringkas>\"
                }
        ";

        return $prompt;
    }


    public function analyze(Request $request)
    {
        $request->validate([
            'dataMatriks' => 'required|array',
            'dataIsian' => 'required|array',
        ]);

        $dataMatriks = $request->input('dataMatriks');
        $dataIsian = $request->input('dataIsian');

        $prompt = $this->createPrompt($dataMatriks, $dataIsian);

        $apiKey = config('services.openai.api_key');
        Log::info('OpenAI Request Initiated');
        Log::info('API Key exists: ' . ($apiKey ? 'Yes' : 'No'));
        Log::info('Current environment: ' . app()->environment());
        Log::info('API Key length: ' . ($apiKey ? strlen($apiKey) : 0));
        $apiUrl = "https://api.openai.com/v1/chat/completions";

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer $apiKey",
                'Content-Type' => 'application/json',
            ])->post($apiUrl, [
                        'model' => 'gpt-3.5-turbo',
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                        'max_tokens' => 600,
                    ]);

            // Cek jika request gagal
            if ($response->failed()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to get response from OpenAI',
                    'error' => $apiKey // Kirim error dari API
                ], 500);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Response received',
                'data' => $response->json()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Something went wrong',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}