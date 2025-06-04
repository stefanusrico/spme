<?php

namespace App\Http\Controllers\Akreditasi;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Project\Project;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsData;
use App\Models\Prodi\Prodi;
use Illuminate\Support\Facades\Log;

class DataAkreditasiController extends Controller
{

  private function decimal128ToFloat($value)
  {
    if ($value instanceof \MongoDB\BSON\Decimal128) {
      return (float) ((string) $value);
    }

    if (is_object($value)) {
      if (method_exists($value, '__toString')) {
        return (float) $value->__toString();
      } elseif (method_exists($value, 'toFloat')) {
        return $value->toFloat();
      }
    }

    return (float) $value;
  }
  /**
   * Get all task scores (nilai) for an active project
   * 
   * @param \Illuminate\Http\Request $request
   * @return \Illuminate\Http\JsonResponse
   */
  public function getProjectScores(Request $request)
  {
    $validator = \Validator::make($request->all(), [
      'prodiId' => 'required|string',
    ]);

    if ($validator->fails()) {
      return response()->json(['errors' => $validator->errors()], 422);
    }

    $prodiId = $request->input('prodiId');

    $project = \App\Models\Project\Project::where('prodiId', $prodiId)
      ->orderBy('created_at', 'desc')
      ->first();

    if (!$project) {
      return response()->json(['message' => 'No active project found for this Prodi'], 404);
    }

    $projectId = $project->_id;
    Log::info("Found latest project {$projectId} for prodiId {$prodiId}");

    $predefinedWeights = [
      'A' => 1.0,
      'B' => 1.0,
      'C1' => 2.84,
      'C2' => 6.62,
      'C3' => 6.62,
      'C4' => 9.46,
      'C5' => 6.62,
      'C6' => 17.97,
      'C7' => 1.89,
      'C8' => 2.84,
      'C9' => 32.15,
      'D' => 1.0,
      'E' => 1.0,
    ];

    // Find all task lists for this project
    $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

    if ($taskLists->isEmpty()) {
      Log::warning("No task lists found for active project {$projectId}");
      return response()->json(['message' => 'No task lists found for this project'], 404);
    }

    // Get all task list IDs
    $taskListIds = $taskLists->pluck('_id')->toArray();

    // Find all tasks with lkpsTableId in these task lists
    $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
      ->whereNotNull('lkpsTableId')
      ->get();

    if ($tasks->isEmpty()) {
      Log::warning("No tasks with lkpsTableId found in active project {$projectId}");
      return response()->json(['message' => 'No LKPS tasks found for this project'], 404);
    }

    $projectScores = [];

    foreach ($tasks as $task) {
      // Get the table information
      $table = LkpsTable::find($task->lkpsTableId);

      if (!$table) {
        Log::warning("Table not found for task {$task->_id}");
        continue;
      }

      // Get the TaskList information for this task
      $taskList = $taskLists->firstWhere('_id', $task->taskListId);

      // Get the LkpsData for this task
      $lkpsData = LkpsData::where('lkpsTableId', $task->lkpsTableId)
        ->where('taskId', $task->_id)
        ->first();

      $scoreData = [
        'taskId' => $task->_id,
        'tableCode' => $table->kode,
        'tableTitle' => $table->judul,
        'nilai' => null,
        'taskList' => [
          'taskListId' => $taskList ? $taskList->_id : null,
          'kriteria' => $taskList ? $taskList->kriteria : 'Unknown',
        ],
      ];

      if ($lkpsData) {
        $scoreData['nilai'] = $lkpsData->nilai;
        $scoreData['hasData'] = !empty($lkpsData->data);
      }

      $projectScores[] = $scoreData;
    }

    // Group scores by criteria (task list) with enhanced information
    $scoresByTaskList = [];
    foreach ($taskLists as $taskList) {
      $kriteria = $taskList->kriteria;

      // Skip 'Undefined' criteria
      if ($kriteria === 'Undefined') {
        continue;
      }

      $taskListScores = collect($projectScores)->where('taskList.taskListId', $taskList->_id)->values();

      if ($taskListScores->isNotEmpty()) {
        // Extract numeric values from nilai (whether array or numeric)
        $numericScores = [];
        $totalRawScore = 0;

        foreach ($taskListScores as $taskScore) {
          $nilai = $taskScore['nilai'];

          if (is_array($nilai)) {
            foreach ($nilai as $scoreItem) {
              if (is_array($scoreItem) && isset($scoreItem['nilai'])) {
                if (is_numeric($scoreItem['nilai'])) {
                  $numericScores[] = (float) $scoreItem['nilai'];
                  $totalRawScore += (float) $scoreItem['nilai'];
                }
              } elseif (is_numeric($scoreItem)) {
                $numericScores[] = (float) $scoreItem;
                $totalRawScore += (float) $scoreItem;
              }
            }
          } elseif (is_numeric($nilai)) {
            $numericScores[] = (float) $nilai;
            $totalRawScore += (float) $nilai;
          }
        }

        // Get predefined weight for this criteria
        $bobot = $predefinedWeights[$kriteria] ?? 0;

        // Skip if no predefined weight found
        if ($bobot === 0 && $kriteria !== 'E') {
          Log::warning("No predefined weight found for criteria: {$kriteria}");
          continue;
        }

        // Calculate NA contribution
        $naContribution = round($totalRawScore * ($bobot / 100), 4);

        $scoresByTaskList[] = [
          'taskListId' => $taskList->_id,
          'kriteria' => $kriteria,
          'order' => $taskList->order,
          'bobot' => $bobot,
          'bobotSource' => 'predefined', // Indicate this is from predefined weights
          'totalTasks' => $taskListScores->count(),
          'tasksWithData' => $taskListScores->where('hasData', true)->count(),
          'tasksWithScores' => count($numericScores),
          'totalRawScore' => round($totalRawScore, 4),
          'naContribution' => $naContribution,
          'tasks' => $taskListScores->toArray()
        ];
      }
    }

    // Calculate overall NA (Nilai Akreditasi) = Σ(Total_Score × Bobot/100)
    $totalNA = array_sum(array_column($scoresByTaskList, 'naContribution'));

    // Determine peringkat based on BAN-PT standards
    $peringkat = 'TMSP';
    if ($totalNA >= 361) {
      $peringkat = 'Unggul';
    } elseif ($totalNA >= 301) {
      $peringkat = 'Baik Sekali';
    } elseif ($totalNA >= 200) {
      $peringkat = 'Baik';
    }

    // Calculate total weight from ALL predefined weights (excluding 'Undefined')
    $totalWeight = 0;
    $usedCriteria = [];

    // Get all criteria that actually exist in task lists (excluding 'Undefined')
    foreach ($taskLists as $taskList) {
      $kriteria = $taskList->kriteria;
      if ($kriteria !== 'Undefined' && isset($predefinedWeights[$kriteria])) {
        if (!in_array($kriteria, $usedCriteria)) {
          $usedCriteria[] = $kriteria;
          $totalWeight += $predefinedWeights[$kriteria];
        }
      }
    }

    // Round for precision
    $totalWeight = round($totalWeight, 2);

    // Alternative calculation: sum all predefined weights directly
    $allPredefinedWeight = array_sum($predefinedWeights);
    $allPredefinedWeightRounded = round($allPredefinedWeight, 2);

    // Validation: Total weight should equal expected total
    $weightValidation = [
      'totalWeight' => $totalWeight,
      'allPredefinedWeight' => $allPredefinedWeightRounded,
      'usedCriteria' => $usedCriteria,
      'isValid' => $totalWeight == $allPredefinedWeightRounded,
      'message' => $totalWeight == $allPredefinedWeightRounded ? 'Weight distribution is valid' : "Warning: Total weight should equal {$allPredefinedWeightRounded}",
      'predefinedWeights' => $predefinedWeights,
      'excludedCriteria' => ['Undefined'],
      'missingCriteria' => array_diff(array_keys($predefinedWeights), $usedCriteria)
    ];

    // Sort by order
    usort($scoresByTaskList, function ($a, $b) {
      return ($a['order'] ?? 999) <=> ($b['order'] ?? 999);
    });

    Log::info("Retrieved scores for " . count($projectScores) . " tasks in active project {$projectId}");
    Log::info("Calculated NA: {$totalNA} with peringkat: {$peringkat}");
    Log::info("Total weight from predefined: {$totalWeight}");

    return response()->json([
      'projectId' => $projectId,
      'projectName' => $project->name,
      'projectStatus' => $project->status,
      'prodiId' => $prodiId,
      'prodiName' => $project->prodi ? $project->prodi->nama : null,
      'totalTasks' => count($projectScores),
      'totalTaskLists' => count($scoresByTaskList),
      'nilaiAkreditasi' => round($totalNA, 2),
      'peringkat' => $peringkat,
      'maxPossibleNA' => 400,
      'naPercentage' => round(($totalNA / 400) * 100, 2),
      'weightValidation' => $weightValidation,
      'scores' => $projectScores,
      'scoresByTaskList' => $scoresByTaskList,
    ]);
  }

  public function getScoreSyaratPerluPeringkat(Request $request)
  {
    $validator = \Validator::make($request->all(), [
      'prodiId' => 'required|string',
    ]);

    if ($validator->fails()) {
      return response()->json(['errors' => $validator->errors()], 422);
    }

    $prodiId = $request->input('prodiId');

    // Definisikan butir yang diinginkan
    $allowedButirs = [17, 19, 47, 65, 66];

    // Get latest project
    $project = \App\Models\Project\Project::where('prodiId', $prodiId)
      ->orderBy('created_at', 'desc')
      ->first();

    if (!$project) {
      return response()->json(['message' => 'No project found for this Prodi'], 404);
    }

    $projectId = $project->_id;
    Log::info("Found latest project {$projectId} for prodiId {$prodiId}");

    // Get task lists
    $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
    $taskListIds = $taskLists->pluck('_id')->toArray();

    // Get all LKPS tasks
    $tasksLKPS = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
      ->whereNotNull('lkpsTableId')
      ->get();

    if ($tasksLKPS->isEmpty()) {
      Log::warning("No tasks with lkpsTableId found in project {$projectId}");
      return response()->json(['message' => 'No LKPS tasks found for this project'], 404);
    }

    // Optimization: Batch load all required data
    $lkpsTableIds = $tasksLKPS->pluck('lkpsTableId')->unique()->toArray();
    $taskIds = $tasksLKPS->pluck('_id')->toArray();

    // Load all tables at once
    $tables = LkpsTable::whereIn('_id', $lkpsTableIds)->get()->keyBy('_id');

    // Load all LkpsData at once
    $lkpsDataCollection = LkpsData::whereIn('lkpsTableId', $lkpsTableIds)
      ->whereIn('taskId', $taskIds)
      ->get();

    // Create lookup map for faster access
    $lkpsDataMap = [];
    foreach ($lkpsDataCollection as $data) {
      $key = $data->taskId . '_' . $data->lkpsTableId;
      $lkpsDataMap[$key] = $data;
    }

    // Process data
    $allNilaiItems = [];

    foreach ($tasksLKPS as $task) {
      // Get table from pre-loaded collection
      $table = $tables->get($task->lkpsTableId);

      if (!$table) {
        continue;
      }

      // Get LkpsData from map
      $key = $task->_id . '_' . $task->lkpsTableId;
      $lkpsData = $lkpsDataMap[$key] ?? null;

      $tableCode = $table->kode;

      if ($lkpsData && isset($lkpsData->nilai) && is_array($lkpsData->nilai)) {
        $nilaiArray = $lkpsData->nilai;

        // Check if it's in the expected format with butir and nilai
        $hasButirFormat = !empty($nilaiArray) &&
          is_array($nilaiArray[0] ?? null) &&
          isset($nilaiArray[0]['butir']) &&
          isset($nilaiArray[0]['nilai']);

        if ($hasButirFormat) {
          // Add each nilai item to the flat array with tableCode information
          foreach ($nilaiArray as $item) {
            // Filter hanya butir yang diinginkan
            if (in_array($item['butir'], $allowedButirs)) {
              $item['tableCode'] = $tableCode;
              $allNilaiItems[] = $item;
            }
          }
        }
      }
    }

    // Hanya return nilaiItems yang sudah difilter
    return response()->json($allNilaiItems);
  }
}