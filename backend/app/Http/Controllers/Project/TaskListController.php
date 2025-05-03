<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Project\Project;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;

class TaskListController extends Controller
{
    private function generateListName($c)
    {
        return "Kriteria {$c}";
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
                $taskList['name'] = $this->generateListName($taskList->c);
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
            'c' => 'required|string|max:255',
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
            'c' => $request->c,
            'order' => $order
        ]);

        $taskList['name'] = $this->generateListName($taskList->c);

        return response()->json([
            'status' => 'success',
            'message' => 'Task list created successfully',
            'data' => $taskList
        ], 201);
    }

    public function storeFromLed(Request $request, $projectId)
    {
        try {
            $project = Project::where('_id', $projectId)->firstOrFail();

            $allData = [];
            $sheets = config('google.sheets.spreadsheets.sheets');

            foreach ($sheets as $key => $gid) {
                $jsonPath = storage_path("app/public/led_{$key}.json");
                if (file_exists($jsonPath)) {
                    $ledData = json_decode(file_get_contents($jsonPath), true);
                    $allData = array_merge($allData, $ledData);
                }
            }

            $uniqueTasklists = collect($allData)
                ->unique('c')
                ->values()
                ->sortBy('c');

            $maxOrder = TaskList::where('projectId', $project->_id)->max('order') ?? 0;
            $order = $maxOrder + 1;

            foreach ($uniqueTasklists as $data) {
                TaskList::create([
                    'projectId' => $project->_id,
                    'c' => $data['c'],
                    'order' => $order++
                ]);
            }

            $tasklists = TaskList::where('projectId', $project->_id)
                ->orderBy('order', 'asc')
                ->get()
                ->map(function ($taskList) {
                    $taskList['name'] = $this->generateListName($taskList->c);
                    return $taskList;
                });

            return response()->json([
                'status' => 'success',
                'message' => 'Task lists created successfully from LED data',
                'data' => $tasklists
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
            'c' => 'string|max:255',
            'order' => 'integer'
        ]);

        $taskList->update($request->only([
            'c',
            'order'
        ]));

        $taskList['name'] = $this->generateListName($taskList->c);

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