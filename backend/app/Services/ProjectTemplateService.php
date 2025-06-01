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

  private function getLkpsTableMapping()
  {
    return [
      // Tata Pamong, Tata Kelola dan Kerjasama
      '1-1' => 'C2',
      '1-2' => 'C2',
      '1-3' => 'C2',

      // Mahasiswa
      '2a1' => 'C3',
      '2b' => 'C3',

      // Sumber Daya Manusia
      '3a1' => 'C4',
      '3a2' => 'C4',
      '3a3' => 'C4',
      '3a4' => 'C4',
      '3a5' => 'C4',
      '3b1' => 'C4',
      '3b2' => 'C4',
      '3b3' => 'C4',
      '3b5' => 'C4',
      '3b6' => 'C4',
      '3b7' => 'C4',
      '3b8-1' => 'C4',
      '3b8-2' => 'C4',
      '3b8-3' => 'C4',
      '3b8-4' => 'C4',
      '3c' => 'C4',

      // Keuangan, Sarana, dan Prasarana

      '4a' => 'C5',
      '4b' => 'C5',
      '4c' => 'C5',

      // Pendidikan
      '5a-1' => 'C6',
      '5a-2' => 'C6',
      '5a-3' => 'C6',
      '5a-4' => 'C6',
      '5b-1' => 'C6',
      '5b-2' => 'C6',
      '5b-3' => 'C6',
      '5c' => 'C6',
      '5d' => 'C6',

      // Penelitian
      '6a' => 'C7',

      // Pengabdian kepada Masyarakat
      '7' => 'C8',

      // Luaran dan Capaian Tridharma
      '8a' => 'C9',
      '8b1' => 'C9',
      '8b2' => 'C9',
      '8c' => 'C9',
      '8d1' => 'C9',
      '8d2' => 'C9',
      '8e1' => 'C9',
      '8e2' => 'C9',
      '8f2' => 'C9',
      '8f4' => 'C9',
      '8f5-1' => 'C9',
      '8f5-2' => 'C9',
      '8f5-3' => 'C9',
      '8f5-4' => 'C9',

      // Penjaminan Mutu
      '9a' => 'D',
      '9b' => 'D',

      'default' => 'Undefined'
    ];
  }

  private function createLkpsTaskListAndTasks($projectId)
  {
    \Log::info("Creating LKPS Tasks for project ID: {$projectId}");

    $project = Project::find($projectId);
    if (!$project) {
      throw new \Exception("Project not found");
    }

    $lkpsTables = LkpsTable::orderBy('kode')->get();
    \Log::info("Found " . $lkpsTables->count() . " LKPS tables");

    if ($lkpsTables->isEmpty()) {
      \Log::warning("No LKPS tables found");
      return;
    }

    $tableMapping = $this->getLkpsTableMapping();

    $existingTaskLists = TaskList::where('projectId', $projectId)->get()->keyBy('kriteria');

    $newCriteria = [];

    $tablesByKriteria = [];
    foreach ($lkpsTables as $table) {
      $mappedKriteria = $tableMapping[$table->kode] ?? $tableMapping['default'];

      if (!isset($tablesByKriteria[$mappedKriteria])) {
        $tablesByKriteria[$mappedKriteria] = [];
      }
      $tablesByKriteria[$mappedKriteria][] = $table;

      if (!$existingTaskLists->has($mappedKriteria)) {
        $newCriteria[$mappedKriteria] = true;
      }
    }

    $nextOrder = TaskList::where('projectId', $projectId)->max('order') + 1 ?? 1;
    foreach ($newCriteria as $kriteria => $value) {
      \Log::info("Creating new TaskList for criteria: {$kriteria}");

      $newTaskList = TaskList::create([
        'projectId' => $projectId,
        'kriteria' => $kriteria,
        'order' => $nextOrder++
      ]);

      $existingTaskLists[$kriteria] = $newTaskList;
    }

    foreach ($tablesByKriteria as $kriteria => $tables) {
      $taskList = $existingTaskLists->get($kriteria);

      if (!$taskList) {
        \Log::warning("TaskList for criteria '{$kriteria}' not found. Skipping related tables.");
        continue;
      }

      \Log::info("Adding " . count($tables) . " LKPS tables to criteria: {$kriteria}");

      $maxOrder = Task::where('taskListId', $taskList->_id)->max('order') ?? 0;
      $order = $maxOrder + 1;

      foreach ($tables as $table) {
        $taskName = "Tabel {$table->kode}";

        $existingTask = Task::where('taskListId', $taskList->_id)
          ->where('lkpsTableId', $table->_id)
          ->first();

        if (!$existingTask) {
          \Log::info("Creating new LKPS task: {$taskName} in criteria: {$kriteria}");

          Task::create([
            'taskListId' => $taskList->_id,
            'lkpsTableId' => $table->_id,
            'projectId' => $projectId,
            'nama' => $taskName,
            'progress' => 0,
            'status' => 'UNASSIGNED',
            'order' => $order++,
            'startDate' => null,
            'endDate' => null
          ]);
        } else {
          \Log::info("Task for table {$table->kode} already exists in criteria: {$kriteria}");
        }
      }
    }

    \Log::info("Completed creating LKPS tasks");
  }
}