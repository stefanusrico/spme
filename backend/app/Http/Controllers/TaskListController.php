<?php

namespace App\Http\Controllers;

use App\Models\TaskList;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Str;

class TaskListController extends Controller
{
    public function index($projectId)
    {
        $tasklists = TaskList::where('id', $projectId)
            ->with([
                'tasks' => function ($query) {
                    $query->orderBy('order', 'asc');
                }
            ])
            ->orderBy('order', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $tasklists
        ]);
    }

    public function store(Request $request, $projectId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
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
            'name' => $request->name,
            'order' => $order
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Task list created successfully',
            'data' => $taskList
        ], 201);
    }

    public function update(Request $request, $projectId, $taskListId)
    {
        $taskList = TaskList::where('taskListId', $taskListId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        $request->validate([
            'name' => 'string|max:255',
            'order' => 'integer'
        ]);

        $taskList->update($request->only([
            'name',
            'order'
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Task list updated successfully',
            'data' => $taskList
        ]);
    }

    public function destroy($projectId, $taskListId)
    {
        $taskList = TaskList::where('taskListId', $taskListId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        // Delete associated tasks first
        Task::where('taskListId', $taskList->_id)->delete();
        $taskList->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Task list deleted successfully'
        ]);
    }
}