<?php


namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;

use App\Models\Led\LedData;
use App\Models\Lkps\LkpsData;
use App\Models\Project\Project;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Prodi\Prodi;
use App\Models\Data\BobotButir;
use App\Services\Calculations\ScoreCalculator;

use Illuminate\Support\Facades\Log;
use Exception;

class ButirController extends Controller
{
    public function getSkorPerButir($prodiId)
    {
        try {
            Log::debug("Start fetching data for prodiId: $prodiId");

            // Cari project terbaru berdasarkan prodiId
            $latestProject = Project::where('prodiId', $prodiId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$latestProject) {
                Log::warning("No project found for prodiId: $prodiId");
                return response()->json([
                    'status' => 'error',
                    'message' => 'No project found for this prodi'
                ], 404);
            }

            $projectId = $latestProject->id;
            Log::debug("Found latest project: $projectId for prodiId: $prodiId");

            [$filteredLedData, $filteredLkpsData] = $this->fetchAndFilterData($projectId);

            if ($filteredLedData->isEmpty() && $filteredLkpsData->isEmpty()) {
                return $this->respondNotFound($projectId);
            }

            $combinedData = $this->combineLedAndLkps($filteredLedData, $filteredLkpsData);

            $calculator = new ScoreCalculator();
            $resultButir = $this->calculateScorePerButir($combinedData, $calculator);
            $resultButirBobot = $this->calculateScorePerButirBobot($resultButir, $calculator, $prodiId);

            $nilaiAkreditasi = round($resultButirBobot->sum(fn($d) => $d['nilai'] ?? 0.0), 2);

            return response()->json([
                'status' => 'success',
                'prodiId' => $prodiId,
                'projectId' => $projectId,
                'projectName' => $latestProject->name ?? null,
                'nilaiAkreditasi' => $nilaiAkreditasi,
                'count data per Butir setelah dihitung dengan bobot' => $resultButirBobot->count(),
                'data-dengan-bobot' => $resultButirBobot,
                'count data per Butir sebelum dihitung dengan bobot' => $resultButir->count(),
                'data-tanpa-bobot' => $resultButir,
            ], 200);
        } catch (Exception $e) {
            Log::error("Error in getSkorPerButirByProdi: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function fetchAndFilterData($projectId)
    {
        $ledData = LedData::latest()->get();
        $lkpsData = LkpsData::with('task.tasklist')->latest()->get();

        $filteredLedData = $ledData->filter(
            fn($item) =>
            $item->task && $item->task->tasklist &&
            $item->task->tasklist->projectId === $projectId
        );

        $filteredLkpsData = $lkpsData->filter(
            fn($item) =>
            $item->task && $item->task->tasklist->project &&
            $item->task->tasklist->projectId === $projectId
        );

        return [$filteredLedData, $filteredLkpsData];
    }

    private function respondNotFound($projectId)
    {
        Log::warning("No data found for projectId: $projectId");
        return response()->json(['status' => 'error', 'message' => 'No data found'], 404);
    }

    private function combineLedAndLkps($ledData, $lkpsData)
    {
        $combined = collect();

        $uniqueLed = $ledData->groupBy('taskId')
            ->map(fn($g) => $g->sortByDesc('created_at')->first())
            ->values();

        $uniqueLkps = $lkpsData->groupBy('taskId')
            ->map(fn($g) => $g->sortByDesc('created_at')->first())
            ->values();

        foreach ($uniqueLed as $item) {
            $combined->push([
                'no' => $item->task->ledItem->no ?? null,
                'sub' => $item->task->ledItem->sub ?? null,
                'kriteria' => $item->task->tasklist->kriteria ?? null,
                'nilai' => $item->nilai ?? ($item->details[0]['nilai'] ?? null),
            ]);
        }

        foreach ($uniqueLkps as $item) {
            $kriteria = $item->task->tasklist->kriteria ?? null;

            $details = $item->detailNilai['details'] ?? $item['nilai'] ?? [];
            foreach ($details as $d) {
                $combined->push([
                    'no' => $d['no'] ?? $d['butir'] ?? null,
                    'sub' => $d['sub'] ?? 'A',
                    'kriteria' => $kriteria,
                    'nilai' => $d['nilai'] ?? null,
                ]);
            }
        }

        return $combined->filter(fn($d) => $d['no'] !== null);
    }

    private function calculateScorePerButir($data, $calculator)
    {
        return $data->groupBy('no')->map(function ($items, $no) use ($calculator) {
            return [
                'no' => $no,
                'kriteria' => $items->first()['kriteria'] ?? null,
                'nilai' => $calculator->hitungSkorButir($no, $items->all()),
            ];
        })->values()->sortBy(function ($item) {
            return is_numeric($item['no']) ? (int) $item['no'] : PHP_INT_MAX;
        })->values();
    }

    private function calculateScorePerButirBobot($data, $calculator, $prodiId)
    {
        // 1. Panggil helper private untuk mendapatkan koleksi bobot
        $bobotCollection = $this->_getBobotCollection($prodiId);

        // Jika tidak ada data bobot, kembalikan koleksi kosong untuk menghindari error
        if ($bobotCollection->isEmpty()) {
            return collect(); 
        }

        // 2. Untuk efisiensi, ubah koleksi menjadi map dengan key 'butir'
        // Ini membuat pencarian bobot menjadi sangat cepat (O(1) lookup)
        $bobotMap = $bobotCollection->keyBy('butir');

        // 3. Lakukan mapping pada data skor
        return $data->map(function ($item) use ($calculator, $bobotMap) {
            $no = $item['no'];
            $items = [$item]; // atau kumpulan item yang diperlukan untuk perhitungan bobot

            // 4. Cari bobot yang sesuai dari map.
            // Gunakan ->get() yang akan mengembalikan null jika tidak ketemu, lebih aman.
            $matchedBobotData = $bobotMap->get($no);

            // Ambil nilai 'bobot', jika tidak ada, default ke 0 agar tidak error.
            $bobotValue = $matchedBobotData ? $matchedBobotData['bobot'] : 0;
            
            // 5. Panggil kalkulator dengan parameter bobot yang sudah ditemukan
            return [
                'no' => $no,
                'kriteria' => $item['kriteria'] ?? null,
                'nilai' => $calculator->hitungSkorBobotButir($no, $items, $bobotValue),
            ];
        })
            ->values()
            ->sortBy(function ($item) {
                return is_numeric($item['no']) ? (int) $item['no'] : PHP_INT_MAX;
            })
            ->values();
    }

    // private function getBobotButir($prodiId)
    // {
    //     try {
    //         $prodi = Prodi::findOrFail($prodiId);
    //         $lamId = (string) $prodi->lamId;
    //         $strataId = (string) $prodi->strataId;

    //         $dataBobot = BobotButir::where('lamId', $lamId)
    //             ->where('strataId', $strataId)
    //             ->get();

    //         // --- PERUBAHAN DIMULAI DI SINI ---

    //         // 1. Transformasi koleksi menggunakan metode map()
    //         // Metode map() akan mengiterasi setiap item dalam koleksi $dataBobot
    //         // dan membuat array baru hanya dengan data yang kita inginkan.
    //         $transformedData = $dataBobot->map(function ($item) {
    //             // Beberapa nilai 'bobot' di data Anda seperti "02.09".
    //             // Menggunakan (float) akan mengonversinya dengan benar menjadi 2.09.
    //             return [
    //                 'butir' => (int) $item->butir, // Konversi 'butir' menjadi integer
    //                 'bobot' => (float) $item->bobot, // Konversi 'bobot' menjadi float
    //             ];
    //         });

    //         return response()->json([
    //             'status' => 'success',
    //             'data' => $transformedData->values()->all()
    //         ]);
    //     } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
    //         return response()->json([
    //             'status' => 'error',
    //             'message' => "Prodi not found with ID: {$prodiId}"
    //         ], 404);
    //     } catch (\Throwable $th) {
    //         // Optional: log the error
    //         \Log::error($th);

    //         return response()->json([
    //             'status' => 'error',
    //             'message' => "Bobot Butir Not Found"
    //         ], 500);
    //     }
    // }

    /**
     * Fungsi PUBLIK untuk endpoint API.
     * Mengambil data bobot butir dan mengembalikannya sebagai JSON.
     */
    public function getBobotButir($prodiId)
    {
        try {
            // Panggil fungsi helper private untuk mendapatkan data
            $bobotCollection = $this->_getBobotCollection($prodiId);

            // Jika tidak ada data, kembalikan error not found
            if ($bobotCollection->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Bobot Butir Not Found for Prodi ID: {$prodiId}"
                ], 404);
            }

            // Jika ada, kembalikan respons sukses
            return response()->json([
                'status' => 'success',
                'data' => $bobotCollection->values()->all()
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'status' => 'error',
                'message' => "Prodi not found with ID: {$prodiId}"
            ], 404);
        } catch (\Throwable $th) {
            \Log::error($th);
            return response()->json([
                'status' => 'error',
                'message' => "An internal error occurred."
            ], 500);
        }
    }

    /**
     * Fungsi HELPER PRIVATE.
     * Mengambil data dari DB dan mentransformasinya menjadi collection.
     * Ini yang akan digunakan untuk kalkulasi internal.
     */
    private function _getBobotCollection($prodiId)
    {
        // findOrFail akan melempar exception jika Prodi tidak ada, 
        // yang akan ditangkap oleh fungsi publik di atas.
        $prodi = Prodi::findOrFail($prodiId);
        $lamId = (string) $prodi->lamId;
        $strataId = (string) $prodi->strataId;

        $dataBobot = BobotButir::where('lamId', $lamId)
            ->where('strataId', $strataId)
            ->get();

        // Transformasi data dan kembalikan sebagai Collection
        return $dataBobot->map(function ($item) {
            return [
                'butir' => (int) $item->butir,
                'bobot' => (float) $item->bobot,
            ];
        });
    }

}