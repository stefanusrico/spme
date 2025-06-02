<?php


namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;

use App\Models\Led\LedData;
use App\Models\Lkps\LkpsData;
use App\Models\Project\Project;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Services\Calculations\ScoreCalculator;

use Illuminate\Support\Facades\Log;
use Exception;

class ButirController extends Controller
{
    public function getSkorPerButir($projectId)
    {
        try {
            Log::debug("Start fetching data for projectId: $projectId");

            [$filteredLedData, $filteredLkpsData] = $this->fetchAndFilterData($projectId);

            if ($filteredLedData->isEmpty() && $filteredLkpsData->isEmpty()) {
                return $this->respondNotFound($projectId);
            }

            $combinedData = $this->combineLedAndLkps($filteredLedData, $filteredLkpsData);

            $calculator = new ScoreCalculator();
            $resultButir = $this->calculateScorePerButir($combinedData, $calculator);
            $resultButirBobot = $this->calculateScorePerButirBobot($resultButir, $calculator);
            // $resultKriteria = $this->calculateScorePerKriteria($projectId, $resultButir, $calculator);

            $nilaiAkreditasi = round($resultButirBobot->sum(fn($d) => $d['nilai'] ?? 0.0), 2);

            return response()->json([
                'status' => 'success',
                'nilaiAkreditasi' => $nilaiAkreditasi,
                // 'count data per Kriteria' => $resultKriteria->count(),
                // 'data per Kriteria' => $resultKriteria,
                'count data per Butir setelah dihitung dengan bobot' => $resultButirBobot->count(),
                'data per Butir setelah dihitung dengan bobot' => $resultButirBobot,
                'count data per Butir sebelum dihitung dengan bobot' => $resultButir->count(),
                'data per Butir sebelum dihitung dengan bobot' => $resultButir,
            ], 200);
        } catch (Exception $e) {
            Log::error("Error in getSkorPerButir: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    private function fetchAndFilterData($projectId)
    {
        $ledData = LedData::latest()->get();
        $lkpsData = LkpsData::with('task.tasklist')->latest()->get();

        $filteredLedData = $ledData->filter(fn($item) =>
            $item->task && $item->task->tasklist &&
            $item->task->tasklist->projectId === $projectId
        );

        $filteredLkpsData = $lkpsData->filter(fn($item) =>
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

    private function calculateScorePerButirBobot($data, $calculator)
    {
        return $data->map(function ($item) use ($calculator) {
            $no = $item['no'];
            $items = [$item]; // atau kumpulan item yang diperlukan untuk perhitungan bobot
            return [
                'no' => $no,
                'kriteria' => $item['kriteria'] ?? null,
                'nilai' => $calculator->hitungSkorBobotButir($no, $items),
            ];
        })
        ->values()
        ->sortBy(function ($item) {
            return is_numeric($item['no']) ? (int) $item['no'] : PHP_INT_MAX;
        })
        ->values();
    }

    // private function calculateScorePerKriteria($projectId, $resultButir, $calculator)
    // {
    //     $bobotKriteria = TaskList::where('projectId', $projectId)->get()->toArray();

    //     return $resultButir->groupBy('kriteria')->map(function ($items, $kriteria) use ($calculator, $bobotKriteria) {
    //         return [
    //             'kriteria' => $kriteria,
    //             'nilai' => $calculator->hitungSkorKriteria($kriteria, $items->all(), $bobotKriteria),
    //         ];
    //     })->values();
    // }
}