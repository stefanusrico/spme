<?php

namespace App\Services;
use App\Http\Controllers\Project\TaskListController;
use App\Http\Controllers\Project\TaskController;
use App\Models\Led\Matriks;
use App\Models\Project\Project;
use App\Models\Prodi\Prodi;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Lkps\LkpsTable;
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
    $service->createLkpsTaskListAndTasks($projectId);

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

        $taskName = "Butir {$item->no} - {$item->sub}";

        Task::create([
          'taskId' => $this->generateTaskId($projectId),
          'projectId' => $projectId,
          'taskListId' => $taskList->_id,
          'c' => $c,
          'no' => $item->no,
          'sub' => $item->sub,
          'name' => $taskName,
          'progress' => 0,
          'status' => 'UNASSIGNED',
          'order' => $order++,
          'startDate' => null,
          'endDate' => null
        ]);
      }
    }
  }

  private function createLkpsTaskListAndTasks($projectId)
  {
    \Log::info("Creating LKPS Task List and Tasks for project ID: {$projectId}");

    $project = Project::find($projectId);
    if (!$project) {
      throw new \Exception("Project not found");
    }

    // Perubahan dari 'c' menjadi 'name' untuk mencari TaskList LKPS
    $lkpsTaskList = TaskList::where('projectId', $projectId)
      ->where('c', 'LKPS')
      ->first();

    if (!$lkpsTaskList) {
      $order = TaskList::where('projectId', $projectId)->max('order') + 1 ?? 1;

      \Log::info("Creating new LKPS Task List with order: {$order}");

      $lkpsTaskList = TaskList::create([
        'projectId' => $projectId,
        'c' => 'LKPS',
        'order' => $order
      ]);
    }

    $lkpsTables = LkpsTable::orderBy('created_at')->get();

    \Log::info("Found " . $lkpsTables->count() . " LKPS tables");

    if ($lkpsTables->isEmpty()) {
      \Log::warning("No LKPS tables found");
      return;
    }

    $order = 1;

    foreach ($lkpsTables as $table) {
      $taskName = "Tabel {$table->section_code}";

      $existingTask = Task::where('projectId', $projectId)
        ->where('taskListId', $lkpsTaskList->_id)
        ->where('section_code', $table->section_code)
        ->first();

      if (!$existingTask) {
        \Log::info("Creating new LKPS task: {$taskName}");

        Task::create([
          'taskId' => $this->generateTaskId($projectId),
          'projectId' => $projectId,
          'taskListId' => $lkpsTaskList->_id,
          'name' => $taskName,
          'section_code' => $table->section_code,
          'code' => $table->code,
          'progress' => 0,
          'status' => 'UNASSIGNED',
          'order' => $order++,
          'startDate' => null,
          'endDate' => null
        ]);
      } else {
        \Log::info("Task for section_code {$table->section_code} already exists");
      }
    }

    \Log::info("Completed creating LKPS tasks");
  }
}