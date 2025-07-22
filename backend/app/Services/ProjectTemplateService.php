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
use App\Models\Prodi\Strata;
use App\Traits\ObjectIdConversion;
use Carbon\Carbon;

class ProjectTemplateService
{
    use ObjectIdConversion;

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

        // Convert ObjectId to string for LedItem queries
        $strataIdString = $service->convertObjectIdToString($strataId);

        // Debug: Log detailed information
        \Log::info('Creating project template structure', [
            'projectId' => $projectId,
            'prodiId' => $prodi->_id,
            'prodiName' => $prodi->name,
            'strataId' => $strataId,
            'strataIdString' => $strataIdString,
            'strataIdType' => gettype($strataId),
            'strataIdStringType' => gettype($strataIdString)
        ]);

        try {
            // Try LED template creation first
            $taskLists = $service->createTaskListsFromLedItems($projectId, $strataIdString);
            $service->createTasksFromLedItems($projectId, $strataIdString);

            // Then create LKPS tasks
            $service->createLkpsTaskListAndTasks($projectId);

            return $taskLists;
        } catch (\Exception $e) {
            \Log::error('LED Template creation failed: ' . $e->getMessage());

            // Even if LED template fails, still create LKPS tasks
            try {
                $service->createLkpsTaskListAndTasks($projectId);
                \Log::info('LKPS tasks created successfully despite LED failure');

                // Return empty array if LED failed but LKPS succeeded
                return [];
            } catch (\Exception $lkpsError) {
                \Log::error('LKPS task creation also failed: ' . $lkpsError->getMessage());
                throw new \Exception('Both LED and LKPS template creation failed: ' . $e->getMessage() . ' | ' . $lkpsError->getMessage());
            }
        }
    }

    private function createTaskListsFromLedItems($projectId, $strataId)
    {
        // Ensure strataId is string for LedItem queries
        $strataIdString = is_string($strataId) ? $strataId : $this->convertObjectIdToString($strataId);

        // Debug: Log strataId yang diterima
        \Log::info("Debug: Received strataId for LedItem query: {$strataIdString}");
        \Log::info("Debug: StrataId type: " . gettype($strataIdString));

        // Debug: Check if LedItem collection has any data at all
        $totalLedItems = LedItem::count();
        \Log::info("Debug: Total LedItem records in database: {$totalLedItems}");

        if ($totalLedItems === 0) {
            throw new \Exception("No LedItem data found in database");
        }

        // Debug: Get all unique strataIds from LedItem
        $allStrataIds = LedItem::distinct('strataId')->pluck('strataId')->toArray();
        \Log::info("Debug: All available strataIds in LedItem:", $allStrataIds);

        // Debug: Try different query approaches
        $ledItemCount1 = LedItem::where('strataId', $strataIdString)->count();
        $ledItemCount2 = LedItem::where('strataId', '=', $strataIdString)->count();

        \Log::info("Debug: Query results - exact match: {$ledItemCount1}, explicit equals: {$ledItemCount2}");

        if ($ledItemCount1 === 0) {
            // Try to find similar strataIds (case insensitive or slight variations)
            $similarStrataIds = LedItem::whereRaw("LOWER(strataId) = ?", [strtolower($strataIdString)])->count();
            \Log::info("Debug: Case insensitive match count: {$similarStrataIds}");

            throw new \Exception("No LedItem data found for strataId: {$strataIdString}. Available strataIds: " . implode(', ', $allStrataIds));
        }

        $allLedItemRecords = LedItem::where('strataId', $strataIdString)
            ->get(['kriteria', 'no', 'sub', 'strataId']);

        \Log::info("Sample of first 5 LedItem records:", $allLedItemRecords->take(5)->toArray());

        $uniqueCriteria = LedItem::where('strataId', $strataIdString)
            ->whereNotNull('kriteria')
            ->distinct('kriteria')
            ->get(['kriteria'])
            ->pluck('kriteria')
            ->filter()
            ->sort()
            ->values();

        \Log::info("Found " . $uniqueCriteria->count() . " unique criteria values:", $uniqueCriteria->toArray());

        if ($uniqueCriteria->isEmpty()) {
            $manualUniqueCriteria = LedItem::where('strataId', $strataIdString)
                ->whereNotNull('kriteria')
                ->get(['kriteria'])
                ->pluck('kriteria')
                ->filter()
                ->unique()
                ->sort()
                ->values();

            \Log::info("Manual unique criteria check found " . $manualUniqueCriteria->count() . " values:", $manualUniqueCriteria->toArray());

            if ($manualUniqueCriteria->isEmpty()) {
                throw new \Exception("No valid criteria found in LedItems for strataId: {$strataIdString}. Please check your LedItem data.");
            }

            $uniqueCriteria = $manualUniqueCriteria;
        }

        $order = 1;
        $createdTaskLists = [];

        // FIX: Ensure uniqueCriteria is iterable
        if (!is_iterable($uniqueCriteria)) {
            \Log::error("uniqueCriteria is not iterable. Type: " . gettype($uniqueCriteria) . ", Value: " . json_encode($uniqueCriteria));
            throw new \Exception("Criteria data is not in expected format");
        }

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
        // Ensure strataId is string for LedItem queries
        $strataIdString = is_string($strataId) ? $strataId : $this->convertObjectIdToString($strataId);

        $project = Project::find($projectId);
        if (!$project) {
            throw new \Exception("Project not found");
        }

        $ledItems = LedItem::where('strataId', $strataIdString)
            ->whereNotNull('kriteria')
            ->orderBy('kriteria')
            ->orderBy('no')
            ->orderBy('sub')
            ->get();

        \Log::info("Found " . $ledItems->count() . " LED items for tasks");

        if ($ledItems->isEmpty()) {
            throw new \Exception("No valid task items found in LedItems for strataId: {$strataIdString}");
        }

        $groupedByKriteria = $ledItems->groupBy('kriteria');

        // FIX: Ensure groupedByKriteria is iterable
        if (!is_iterable($groupedByKriteria)) {
            \Log::error("groupedByKriteria is not iterable. Type: " . gettype($groupedByKriteria));
            throw new \Exception("Grouped criteria data is not in expected format");
        }

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

            // FIX: Ensure uniqueTasks is iterable
            if (!is_iterable($uniqueTasks)) {
                \Log::error("uniqueTasks is not iterable for criteria {$kriteria}. Type: " . gettype($uniqueTasks));
                continue;
            }

            foreach ($uniqueTasks as $index => $item) {
                if (!isset($item->no) || !isset($item->sub)) {
                    \Log::warning("Skipping task with invalid no/sub values: no=" . ($item->no ?? 'null') . ", sub=" . ($item->sub ?? 'null'));
                    continue;
                }

                $taskName = "Butir {$item->no} - {$item->sub}";

                Task::create([
                    'taskListId' => $taskList->_id,
                    'ledItemId' => $item->_id,
                    'projectId' => $projectId,
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
        \Log::info("Creating LKPS Tasks for project ID: {$projectId}");

        $project = Project::find($projectId);
        if (!$project) {
            throw new \Exception("Project not found");
        }

        // Get D-IV strata ID
        $divStrata = Strata::where('name', 'D-IV')->first();
        if (!$divStrata) {
            \Log::error("D-IV strata not found in database");
            throw new \Exception("D-IV strata not found in database");
        }

        \Log::info("Found D-IV strata with ID: {$divStrata->_id}");

        // Get all LKPS tables for D-IV strata
        $lkpsTables = LkpsTable::where('strataId', $divStrata->_id)
            ->orderBy('kode')
            ->get();

        \Log::info("Found " . $lkpsTables->count() . " LKPS tables for D-IV strata");

        if ($lkpsTables->isEmpty()) {
            \Log::warning("No LKPS tables found for D-IV strata");
            return;
        }

        // Check if "Tabel LKPS" TaskList already exists
        $lkpsTaskList = TaskList::where('projectId', $projectId)
            ->where('kriteria', 'Tabel LKPS')
            ->first();

        // Create "Tabel LKPS" TaskList if it doesn't exist
        if (!$lkpsTaskList) {
            $nextOrder = TaskList::where('projectId', $projectId)->max('order') + 1 ?? 1;

            \Log::info("Creating new TaskList for 'Tabel LKPS'");

            $lkpsTaskList = TaskList::create([
                'projectId' => $projectId,
                'kriteria' => 'Tabel LKPS',
                'order' => $nextOrder
            ]);
        }

        // Get the current max order for tasks in this TaskList
        $maxOrder = Task::where('taskListId', $lkpsTaskList->_id)->max('order') ?? 0;
        $order = $maxOrder + 1;
        $totalTasksCreated = 0;

        // Create tasks for all LKPS tables
        foreach ($lkpsTables as $table) {
            $taskName = "Tabel {$table->kode} - {$table->judul}";

            // Check if task already exists
            $existingTask = Task::where('taskListId', $lkpsTaskList->_id)
                ->where('lkpsTableId', (string) $table->_id)
                ->first();

            if (!$existingTask) {
                \Log::info("Creating new LKPS task: {$taskName}");

                Task::create([
                    'taskListId' => $lkpsTaskList->_id,
                    'lkpsTableId' => (string) $table->_id,
                    'projectId' => $projectId,
                    'nama' => $taskName,
                    'progress' => 0,
                    'status' => 'UNASSIGNED',
                    'order' => $order++,
                    'startDate' => null,
                    'endDate' => null
                ]);

                $totalTasksCreated++;
            } else {
                \Log::info("Task for table {$table->kode} already exists");
            }
        }

        \Log::info("Completed creating LKPS tasks. Total new tasks created: {$totalTasksCreated}");
        \Log::info("All LKPS tables grouped under 'Tabel LKPS' criteria");
    }
}