<?php

namespace App\Http\Controllers;

use App\Models\TaskList;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;

class TaskController extends Controller
{
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


    public function index($projectId, $taskListId)
    {
        $tasks = Task::where('projectId', $projectId)
            ->where('taskListId', $taskListId)
            ->orderBy('order', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $tasks
        ]);
    }

    public function store(Request $request, $projectId, $taskListId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'owner' => 'nullable|exists:users,_id',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after:startDate',
            'order' => 'nullable|integer'
        ]);

        $project = Project::where('_id', $projectId)->firstOrFail();
        $taskList = TaskList::where('_id', $taskListId)->firstOrFail();

        if (!$request->order) {
            $maxOrder = Task::where('taskListId', $taskList->_id)
                ->max('order') ?? 0;
            $order = $maxOrder + 1;
        } else {
            $order = $request->order;
        }

        $task = Task::create([
            'taskId' => $this->generateTaskId($project->_id),
            'projectId' => $project->_id,
            'taskListId' => $taskList->_id,
            'name' => $request->name,
            'progress' => false,
            'owner' => $request->owner,
            'status' => 'ACTIVE',
            'startDate' => $request->startDate,
            'endDate' => $request->endDate,
            'order' => $order
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Task created successfully',
            'data' => $task
        ], 201);
    }

    public function updateRow(Request $request, $projectId, $taskId)
    {
        $request->validate([
            'owner' => 'nullable|exists:users,_id',
            'startDate' => 'nullable|date',
            'endDate' => 'nullable|date|after:startDate'
        ]);

        $task = Task::where('_id', $taskId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        $updates = array_filter($request->only([
            'owner',
            'startDate',
            'endDate'
        ]), function ($value) {
            return $value !== null;
        });

        $task->update($updates);

        $task->load('user');

        return response()->json([
            'status' => 'success',
            'message' => 'Task updated successfully',
            'data' => $task
        ]);
    }

    public function myTasks()
    {
        $userId = auth()->user()->_id;

        $tasks = Task::with(['project', 'taskList'])
            ->where('owner', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->_id,
                    'taskId' => $task->taskId,
                    'name' => $task->name,
                    'status' => $task->status,
                    'progress' => $task->progress,
                    'startDate' => $task->startDate,
                    'endDate' => $task->endDate,
                    'project' => [
                        'id' => $task->project->_id,
                        'projectId' => $task->project->projectId,
                        'name' => $task->project->name
                    ],
                    'taskList' => [
                        'id' => $task->taskList->_id,
                        'name' => $task->taskList->name
                    ]
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $tasks
        ]);
    }

    public function update(Request $request, $projectId, $taskListId, $taskId)
    {
        $task = Task::where('-id', $taskId)
            ->where('projectId', $projectId)
            ->where('taskListId', $taskListId)
            ->firstOrFail();

        $request->validate([
            'name' => 'string|max:255',
            'progress' => 'boolean',
            'owner' => 'exists:users,_id',
            'status' => 'in:ACTIVE,COMPLETED,CANCELLED',
            'startDate' => 'date',
            'endDate' => 'date|after:startDate',
            'order' => 'integer'
        ]);

        $task->update($request->only([
            'name',
            'progress',
            'owner',
            'status',
            'startDate',
            'endDate',
            'order'
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Task updated successfully',
            'data' => $task
        ]);
    }

    public function destroy($projectId, $taskListId, $taskId)
    {
        $task = Task::where('taskId', $taskId)
            ->where('projectId', $projectId)
            ->where('taskListId', $taskListId)
            ->firstOrFail();

        $task->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Task deleted successfully'
        ]);
    }
}