<?php


namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;

use App\Models\Led\LedData;
use App\Models\Project\Project;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Services\Calculations\ScoreCalculator;

use Illuminate\Support\Facades\Log;
use Exception;

class ButirController extends Controller
{
    public function getSkorPerButir($prodiId)
    {
        try {
            Log::debug("Start fetching LED data for prodiId: $prodiId");

            $ledData = LedData::orderBy('created_at', 'desc')->get();
            Log::debug("Total LED data fetched: " . $ledData->count());

            $filteredLedData = $ledData->filter(function ($item) use ($prodiId) {
                return $item->task && $item->task->tasklist &&
                    $item->task->tasklist->project &&
                    $item->task->tasklist->project->prodiId === $prodiId &&
                    in_array($item->task->tasklist->project->status, ['ACTIVE', 'IN PROGRESS']);
            });         

            Log::debug("Filtered LED data count: " . $filteredLedData->count());

            if ($filteredLedData->isEmpty()) {
                Log::warning("LED not found :", [
                    'prodiId' => $prodiId,
                    'count' => $ledData->count(),
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
            }

            // $projectIds = Project::where('prodiId', $prodiId)->pluck('id');
            // Log::debug('Project IDs: ' . json_encode($projectIds));

            // $taskListIds = TaskList::whereIn('projectId', $projectIds)->pluck('id');
            // Log::debug('TaskList IDs: ' . json_encode($taskListIds));

            // $allTasks = Task::whereIn('taskListId', $taskListIds)->get();
            // Log::debug("Total tasks: " . $allTasks->count());

            $uniqueByTaskId = $filteredLedData
                ->groupBy('taskId')
                ->map(function ($group) {
                    return $group->sortByDesc('created_at')->first(); 
                })
                ->values();
            
            Log::debug("Unique data by taskId: " . $uniqueByTaskId->count());
            
            // Ambil semua taskId dari hasil unik
            // $existingTaskIds = $uniqueByTaskId->pluck('taskId')->toArray();

            // // Cari task yang belum ada di filteredLedData
            // $missingTasks = $allTasks->filter(function ($t) use ($existingTaskIds) {
            //     return !in_array($t->id, $existingTaskIds);
            // });

            // Buat dummy data untuk task yang hilang
            $dummyItems = $uniqueByTaskId->map(function ($t) {
                return (object) [
                    'taskId' => $t->id,
                    'task' => $t,
                    'nilai' => 0,
                    'details' => [],
                    'created_at' => now(), // supaya bisa tetap disort jika dibutuhkan
                ];
            });

            // Gabungkan yang sudah ada + dummy
            $merged = collect($uniqueByTaskId)->values()->merge($dummyItems);

            $result = $merged->map(function ($item) {
                $no = null;
                $sub = null;

                if ($item->task) {
                    if ($item->task->ledItemId && $item->task->ledItem) {
                        $no = $item->task->ledItem->no;
                        $sub = $item->task->ledItem->sub;
                    } elseif ($item->task->lkpstableId) {
                        $lkpsId = $item->task->lkpstableId;
                        if (isset($lkpsMapping[$lkpsId])) {
                            $no = $lkpsMapping[$lkpsId]['no'];
                            $sub = $lkpsMapping[$lkpsId]['sub'];
                        }
                    }
                }
                
                return [
                    'no' => $item->task && $item->task->ledItem ? $item->task->ledItem->no : null,
                    'sub' => $item->task && $item->task->ledItem ? $item->task->ledItem->sub : null,
                    'nilai' => isset($item->nilai) 
                        ? $item->nilai 
                        : (isset($item->details[0]['nilai']) 
                            ? $item->details[0]['nilai'] 
                            : null),
                ];
            });

            Log::debug("Mapped result (no + nilai)", [
                'data' => $result,
            ]);

            $calculator = new ScoreCalculator();
            $groupedByNo = $result->groupBy('no');
            Log::debug("Grouped by 'no' count: " . $groupedByNo->count());
            $result = [];

            $finalResult = $groupedByNo->map(function ($items, $no) use ($calculator) {
                Log::debug("Calculating skor for no: $no", [
                    'items' => $items,
                ]);
                
                $nilai = $calculator->hitungSkor($no, $items->all());
                Log::debug("Calculated nilai for no $no: $nilai");

                return [
                    'no' => $no,
                    'nilai' => $nilai,
                ];
            })
            ->values()
            ->sortBy(function ($item) {
                return is_numeric($item['no']) ? (int)$item['no'] : PHP_INT_MAX;
            })
            ->values();

            $total = $finalResult->count();

            Log::debug("Final calculated result", [
                'data' => $finalResult,
            ]); 

            return response()->json([
                'status' => 'success',
                'count data' => $total,
                'data' => $finalResult, 
            ], 200);
        } catch (Exception $e) {
            Log::error("Error occurred in getSkorPerButir: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function dataLps() 
    {
        $lkpsMapping = [
            1 => ['no' => 10, 'sub' => 'A'],
            2 => ['no' => 10, 'sub' => 'B'],
            3 => ['no' => 13, 'sub' => 'B'],
            4 => ['no' => 14, 'sub' => 'A'],
            5 => ['no' => 14, 'sub' => 'B'],
            6 => ['no' => 16, 'sub' => 'A'],
            7 => ['no' => 16, 'sub' => 'A'], // 3a4
            8 => ['no' => 17, 'sub' => 'A'],
            9 => ['no' => 18, 'sub' => 'A'],
            10 => ['no' => 19, 'sub' => 'A'],
            11 => ['no' => 20, 'sub' => 'A'],
            12 => ['no' => 20, 'sub' => 'A'], // 3a1
            13 => ['no' => 21, 'sub' => 'A'],
            14 => ['no' => 22, 'sub' => 'A'],
            15 => ['no' => 23, 'sub' => 'A'],
            16 => ['no' => 24, 'sub' => 'A'],
            17 => ['no' => 25, 'sub' => 'A'],
            18 => ['no' => 26, 'sub' => 'A'],
            19 => ['no' => 27, 'sub' => 'A'],
            20 => ['no' => 28, 'sub' => 'A'],
            21 => ['no' => 29, 'sub' => 'A'],
            22 => ['no' => 30, 'sub' => 'A'],
            23 => ['no' => 31, 'sub' => 'A'],
            24 => ['no' => 33, 'sub' => 'A'],
            25 => ['no' => 33, 'sub' => 'B'],
            26 => ['no' => 34, 'sub' => 'A'],
            27 => ['no' => 35, 'sub' => 'A'],
            28 => ['no' => 36, 'sub' => 'A'],
            29 => ['no' => 39, 'sub' => 'A'],
            30 => ['no' => 39, 'sub' => 'A'], // 4c
            31 => ['no' => 44, 'sub' => 'A'],
            32 => ['no' => 47, 'sub' => 'A'],
            33 => ['no' => 48, 'sub' => 'A'],
            34 => ['no' => 49, 'sub' => 'A'],
            35 => ['no' => 49, 'sub' => 'A'], // 5b2
            36 => ['no' => 49, 'sub' => 'A'], // 5b3
            37 => ['no' => 50, 'sub' => 'A'],
            38 => ['no' => 52, 'sub' => 'A'],
            39 => ['no' => 54, 'sub' => 'A'],
            40 => ['no' => 56, 'sub' => 'A'],
            41 => ['no' => 58, 'sub' => 'A'],
            42 => ['no' => 59, 'sub' => 'A'],
            43 => ['no' => 60, 'sub' => 'A'],
            44 => ['no' => 61, 'sub' => 'A'],
            45 => ['no' => 62, 'sub' => 'A'],
            46 => ['no' => 63, 'sub' => 'A'],
            47 => ['no' => 65, 'sub' => 'A'],
            48 => ['no' => 66, 'sub' => 'A'],
            49 => ['no' => 67, 'sub' => 'A'],
            50 => ['no' => 68, 'sub' => 'A'],
            51 => ['no' => 69, 'sub' => 'A'],
            52 => ['no' => 70, 'sub' => 'A'],
            53 => ['no' => 71, 'sub' => 'A'],
            54 => ['no' => 73, 'sub' => 'A'],
            55 => ['no' => 74, 'sub' => 'A'],
        ];
    }
}