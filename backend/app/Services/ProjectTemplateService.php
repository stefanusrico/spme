<?php

namespace App\Services;
use App\Http\Controllers\Project\TaskListController;
use App\Http\Controllers\Project\TaskController;
use App\Models\Led\LedItem;
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

    $strataId = $prodi->strataId;

    if (!$strataId) {
      throw new \Exception("Prodi does not have valid Strata ID");
    }

    \Log::info('Creating project template structure', [
      'projectId' => $projectId,
      'prodiId' => $prodi->_id,
      'prodiName' => $prodi->name,
      'strataId' => $strataId
    ]);

    $taskLists = $service->createTaskListsFromLedItems($projectId, $strataId);
    $service->createTasksFromLedItems($projectId, $strataId);
    $service->createLkpsTaskListAndTasks($projectId);

    return $taskLists;
  }

  private function createTaskListsFromLedItems($projectId, $strataId)
  {
    $ledItemCount = LedItem::where('strataId', $strataId)
      ->count();

    \Log::info("Found {$ledItemCount} LedItem records for strataId: {$strataId}");

    if ($ledItemCount === 0) {
      throw new \Exception("No LedItem data found for strataId: {$strataId}");
    }

    $allLedItemRecords = LedItem::where('strataId', $strataId)
      ->get(['kriteria', 'no', 'sub']);

    \Log::info("Sample of first 5 LedItem records:", $allLedItemRecords->take(5)->toArray());

    $uniqueCriteria = LedItem::where('strataId', $strataId)
      ->whereNotNull('kriteria')
      ->distinct('kriteria')
      ->get(['kriteria'])
      ->pluck('kriteria')
      ->filter()
      ->sort()
      ->values();

    \Log::info("Found " . $uniqueCriteria->count() . " unique criteria values:", $uniqueCriteria->toArray());

    if ($uniqueCriteria->isEmpty()) {
      $manualUniqueCriteria = LedItem::where('strataId', $strataId)
        ->whereNotNull('kriteria')
        ->get(['kriteria'])
        ->pluck('kriteria')
        ->filter()
        ->unique()
        ->sort()
        ->values();

      \Log::info("Manual unique criteria check found " . $manualUniqueCriteria->count() . " values:", $manualUniqueCriteria->toArray());

      if ($manualUniqueCriteria->isEmpty()) {
        throw new \Exception("No valid criteria found in LedItems for strataId: {$strataId}. Please check your LedItem data.");
      }

      $uniqueCriteria = $manualUniqueCriteria;
    }

    $order = 1;
    $createdTaskLists = [];

    foreach ($uniqueCriteria as $kriteria) {
      if (empty($kriteria)) {
        \Log::warning("Skipping empty criteria value at index " . ($order - 1));
        continue;
      }

      \Log::info("Creating TaskList for criteria: {$kriteria}");

      $taskList = TaskList::create([
        'projectId' => $projectId,
        'kriteria' => $kriteria,
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

  private function createTasksFromLedItems($projectId, $strataId)
  {
    $project = Project::find($projectId);
    if (!$project) {
      throw new \Exception("Project not found");
    }

    $ledItems = LedItem::where('strataId', $strataId)
      ->whereNotNull('kriteria')
      ->orderBy('kriteria')
      ->orderBy('no')
      ->orderBy('sub')
      ->get();

    \Log::info("Found " . $ledItems->count() . " LED items for tasks");

    if ($ledItems->isEmpty()) {
      throw new \Exception("No valid task items found in LedItems for strataId: {$strataId}");
    }

    $groupedByKriteria = $ledItems->groupBy('kriteria');

    foreach ($groupedByKriteria as $kriteria => $items) {
      if (empty($kriteria)) {
        \Log::warning("Skipping tasks for empty criteria value");
        continue;
      }

      \Log::info("Processing tasks for criteria: {$kriteria}, found " . $items->count() . " items");

      $taskList = TaskList::where('projectId', $projectId)
        ->where('kriteria', $kriteria)
        ->first();

      if (!$taskList) {
        \Log::warning("TaskList for criteria {$kriteria} was not found for project {$projectId}");
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
          'taskListId' => $taskList->_id,
          'ledItemId' => $item->_id,
          'nama' => $taskName,
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

    $lkpsTaskList = TaskList::where('projectId', $projectId)
      ->where('kriteria', 'LKPS')
      ->first();

    if (!$lkpsTaskList) {
      $order = TaskList::where('projectId', $projectId)->max('order') + 1 ?? 1;

      \Log::info("Creating new LKPS Task List with order: {$order}");

      $lkpsTaskList = TaskList::create([
        'projectId' => $projectId,
        'kriteria' => 'LKPS',
        'order' => $order
      ]);
    }

    $lkpsTables = LkpsTable::orderBy('kode')->get();

    \Log::info("Found " . $lkpsTables->count() . " LKPS tables");

    if ($lkpsTables->isEmpty()) {
      \Log::warning("No LKPS tables found");
      return;
    }

    $order = 1;

    foreach ($lkpsTables as $table) {
      $taskName = "Tabel - {$table->kode}";

      $existingTask = Task::where('taskListId', $lkpsTaskList->_id)
        ->where('lkpsTableId', $table->_id)
        ->first();

      if (!$existingTask) {
        \Log::info("Creating new LKPS task: {$taskName}");

        Task::create([
          'taskId' => $this->generateTaskId($projectId),
          'taskListId' => $lkpsTaskList->_id,
          'lkpsTableId' => $table->_id,
          'nama' => $taskName,
          'progress' => 0,
          'status' => 'UNASSIGNED',
          'order' => $order++,
          'startDate' => null,
          'endDate' => null
        ]);
      } else {
        \Log::info("Task for table {$table->kode} already exists");
      }
    }

    \Log::info("Completed creating LKPS tasks");
  }
}