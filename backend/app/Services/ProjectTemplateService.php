<?php

namespace App\Services;
use App\Http\Controllers\TaskListController;
use App\Http\Controllers\TaskController;
use App\Models\Matriks;
use App\Models\Project;
use App\Models\Prodi;
use App\Models\TaskList;
use App\Models\Task;
use Carbon\Carbon;

class ProjectTemplateService
{
  protected $taskListController;
  protected $taskController;

  public function __construct()
  {
    $this->taskListController = new TaskListController();
    $this->taskController = new TaskController();
  }

  public static function createDefaultStructure($projectId)
  {
    $service = new self();

    $project = Project::find($projectId);
    if (!$project) {
      throw new \Exception("Project not found");
    }

    $prodi = Prodi::find($project->prodiId);
    if (!$prodi) {
      throw new \Exception("Prodi not found");
    }

    $lamId = $prodi->lamId;
    $strataId = $prodi->strataId;

    if (!$lamId || !$strataId) {
      throw new \Exception("Prodi does not have valid LAM ID or Strata ID");
    }

    \Log::info('Creating project template structure', [
      'projectId' => $projectId,
      'prodiId' => $prodi->_id,
      'prodiName' => $prodi->name,
      'lamId' => $lamId,
      'strataId' => $strataId
    ]);

    $taskLists = $service->createTaskListsFromMatriks($projectId, $lamId, $strataId);
    $service->createTasksFromMatriks($projectId, $lamId, $strataId);

    return $taskLists;
  }

  private function createTaskListsFromMatriks($projectId, $lamId, $strataId)
  {
    $matriksCount = Matriks::where('lamId', $lamId)
      ->where('strataId', $strataId)
      ->count();

    \Log::info("Found {$matriksCount} Matriks records for lamId: {$lamId}, strataId: {$strataId}");

    if ($matriksCount === 0) {
      throw new \Exception("No Matriks data found for lamId: {$lamId}, strataId: {$strataId}");
    }

    $allMatriksRecords = Matriks::where('lamId', $lamId)
      ->where('strataId', $strataId)
      ->get(['c', 'no', 'sub']);

    \Log::info("Sample of first 5 matriks records:", $allMatriksRecords->take(5)->toArray());

    $uniqueCriteria = Matriks::where('lamId', $lamId)
      ->where('strataId', $strataId)
      ->whereNotNull('c')
      ->distinct('c')
      ->get(['c'])
      ->pluck('c')
      ->filter()
      ->sort()
      ->values();

    \Log::info("Found " . $uniqueCriteria->count() . " unique criteria (c) values:", $uniqueCriteria->toArray());

    if ($uniqueCriteria->isEmpty()) {
      $manualUniqueCriteria = Matriks::where('lamId', $lamId)
        ->where('strataId', $strataId)
        ->whereNotNull('c')
        ->get(['c'])
        ->pluck('c')
        ->filter()
        ->unique()
        ->sort()
        ->values();

      \Log::info("Manual unique criteria check found " . $manualUniqueCriteria->count() . " values:", $manualUniqueCriteria->toArray());

      if ($manualUniqueCriteria->isEmpty()) {
        throw new \Exception("No valid criteria (c) found in Matriks for lamId: {$lamId} and strataId: {$strataId}. Please check your Matriks data.");
      }

      $uniqueCriteria = $manualUniqueCriteria;
    }

    $order = 1;
    $createdTaskLists = [];

    foreach ($uniqueCriteria as $c) {
      if (empty($c)) {
        \Log::warning("Skipping empty criteria value at index " . ($order - 1));
        continue;
      }

      \Log::info("Creating TaskList for criteria (c): {$c}");

      $taskList = TaskList::create([
        'projectId' => $projectId,
        'c' => $c,
        'order' => $order++
      ]);

      $createdTaskLists[] = $taskList;
    }

    return $createdTaskLists;
  }

  private function generateTaskId($projectId)
  {
    $lastTask = Task::where('projectId', $projectId)
      ->orderBy('created_at', 'desc')
      ->first();

    if (!$lastTask) {
      return 'TSK-001';
    }

    $lastId = $lastTask->taskId;
    $number = intval(substr($lastId, 4)) + 1;

    return 'TSK-' . str_pad($number, 3, '0', STR_PAD_LEFT);
  }

  private function createTasksFromMatriks($projectId, $lamId, $strataId)
  {
    $project = Project::find($projectId);
    if (!$project) {
      throw new \Exception("Project not found");
    }

    $matriksItems = Matriks::where('lamId', $lamId)
      ->where('strataId', $strataId)
      ->whereNotNull('c')
      ->orderBy('c')
      ->orderBy('no')
      ->orderBy('sub')
      ->get();

    \Log::info("Found " . $matriksItems->count() . " matriks items for tasks");

    if ($matriksItems->isEmpty()) {
      throw new \Exception("No valid task items found in Matriks for lamId: {$lamId} and strataId: {$strataId}");
    }

    $groupedByC = $matriksItems->groupBy('c');

    foreach ($groupedByC as $c => $items) {
      if (empty($c)) {
        \Log::warning("Skipping tasks for empty criteria value");
        continue;
      }

      \Log::info("Processing tasks for criteria (c): {$c}, found " . $items->count() . " items");

      $taskList = TaskList::where('projectId', $projectId)
        ->where('c', $c)
        ->first();

      if (!$taskList) {
        \Log::warning("TaskList for criteria {$c} was not found for project {$projectId}");
        continue;
      }

      $order = 1;
      $uniqueTasks = $items->unique(function ($item) {
        return $item->no . $item->sub;
      });

      foreach ($uniqueTasks as $index => $item) {
        if (!isset($item->no) || !isset($item->sub)) {
          \Log::warning("Skipping task with invalid no/sub values: no=" . ($item->no ?? 'null') . ", sub=" . ($item->sub ?? 'null'));
          continue;
        }

        Task::create([
          'taskId' => $this->generateTaskId($projectId),
          'projectId' => $projectId,
          'taskListId' => $taskList->_id,
          'c' => $c,
          'no' => $item->no,
          'sub' => $item->sub,
          'progress' => 0,
          'status' => 'UNASSIGNED',
          'order' => $order++,
          'startDate' => null,
          'endDate' => null
        ]);
      }
    }
  }
}