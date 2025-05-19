<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Project\Project;
use App\Models\Led\LedItem;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;

class TaskListController extends Controller
{
    private function generateListName($kriteria)
    {
        return "Kriteria {$kriteria}";
    }

    public function index($projectId)
    {
        $tasklists = TaskList::where('projectId', $projectId)
            ->with([
                'tasks' => function ($query) {
                    $query->orderBy('order', 'asc');
                }
            ])
            ->orderBy('order', 'asc')
            ->get()
            ->map(function ($taskList) {
                $taskList['name'] = $this->generateListName($taskList->kriteria);
                return $taskList;
            });

        return response()->json([
            'status' => 'success',
            'data' => $tasklists
        ]);
    }

    public function store(Request $request, $projectId)
    {
        $request->validate([
            'kriteria' => 'required|string|max:255',
            'order' => 'nullable|integer'
        ]);

        $project = Project::where('_id', $projectId)->firstOrFail();

        if (!$request->order) {
            $maxOrder = TaskList::where('projectId', $project->_id)
                ->max('order') ?? 0;
            $order = $maxOrder + 1;
        } else {
            $order = $request->order;
        }

        $taskList = TaskList::create([
            'projectId' => $project->_id,
            'kriteria' => $request->kriteria,
            'order' => $order
        ]);

        $taskList['name'] = $this->generateListName($taskList->kriteria);

        return response()->json([
            'status' => 'success',
            'message' => 'Task list created successfully',
            'data' => $taskList
        ], 201);
    }

    public function storeFromLedItems(Request $request, $projectId)
    {
        try {
            $project = Project::where('_id', $projectId)->firstOrFail();
            $prodi = $project->prodi;

            if (!$prodi || !$prodi->strataId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project prodi does not have a valid Strata ID'
                ], 400);
            }

            $strataId = $prodi->strataId;

            $ledItems = LedItem::where('strataId', $strataId)
                ->whereNotNull('kriteria')
                ->get();

            if ($ledItems->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No LedItems found for this Strata'
                ], 404);
            }

            $uniqueCriteria = $ledItems->pluck('kriteria')
                ->filter()
                ->unique()
                ->sort()
                ->values();

            $maxOrder = TaskList::where('projectId', $project->_id)->max('order') ?? 0;
            $order = $maxOrder + 1;
            $createdTaskLists = [];

            foreach ($uniqueCriteria as $kriteria) {
                $taskList = TaskList::create([
                    'projectId' => $project->_id,
                    'kriteria' => $kriteria,
                    'order' => $order++
                ]);

                $taskList['name'] = $this->generateListName($kriteria);
                $createdTaskLists[] = $taskList;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Task lists created successfully from LED items',
                'data' => $createdTaskLists
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $projectId, $taskListId)
    {
        $taskList = TaskList::where('_id', $taskListId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        $request->validate([
            'kriteria' => 'string|max:255',
            'order' => 'integer'
        ]);

        $taskList->update($request->only([
            'kriteria',
            'order'
        ]));

        $taskList['name'] = $this->generateListName($taskList->kriteria);

        return response()->json([
            'status' => 'success',
            'message' => 'Task list updated successfully',
            'data' => $taskList
        ]);
    }

    public function destroy($projectId, $taskListId)
    {
        $taskList = TaskList::where('_id', $taskListId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        Task::where('taskListId', $taskList->_id)->delete();
        $taskList->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Task list deleted successfully'
        ]);
    }
}