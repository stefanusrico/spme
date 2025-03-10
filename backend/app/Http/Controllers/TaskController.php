<?php

namespace App\Http\Controllers;

use App\Models\TaskList;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use App\Http\Controllers\NotificationController;
use Carbon\Carbon;

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

    private function generateTaskName($no, $sub)
    {
        return "Butir {$no} - {$sub}";
    }

    /**
     * Static method to create a task
     * This is used by ProjectTemplateService
     * 
     * @param array $data Task data
     * @return Task
     */
    public static function createTask($data)
    {
        // Generate task ID based on project
        $lastTask = Task::where('projectId', $data['projectId'])
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lastTask) {
            $taskId = 'TSK-001';
        } else {
            $lastId = $lastTask->taskId;
            $number = intval(substr($lastId, 4)) + 1;
            $taskId = 'TSK-' . str_pad($number, 3, '0', STR_PAD_LEFT);
        }

        // Set default status and progress
        $taskData = array_merge([
            'taskId' => $taskId,
            'progress' => 0,
            'status' => 'UNASSIGNED',
            'owners' => []
        ], $data);

        return Task::create($taskData);
    }

    public function index($projectId, $taskListId)
    {
        $tasks = Task::where('projectId', $projectId)
            ->where('taskListId', $taskListId)
            ->orderBy('order', 'asc')
            ->get()
            ->map(function ($task) {
                $task['name'] = $this->generateTaskName($task->no, $task->sub);
                return $task;
            });

        return response()->json([
            'status' => 'success',
            'data' => $tasks
        ]);
    }

    public function store(Request $request, $projectId, $taskListId)
    {
        $request->validate([
            'no' => 'required|integer',
            'sub' => 'required|string|max:255',
            'owners' => 'nullable|array',
            'owners.*' => 'exists:users,_id',
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
            'no' => $request->no,
            'sub' => $request->sub,
            'progress' => 0,
            'owners' => $request->owners,
            'status' => 'UNASSIGNED',
            'startDate' => $request->startDate,
            'endDate' => $request->endDate,
            'order' => $order
        ]);

        $task['name'] = $this->generateTaskName($task->no, $task->sub);

        return response()->json([
            'status' => 'success',
            'message' => 'Task created successfully',
            'data' => $task
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

            $groupedData = collect($allData)->groupBy('c');

            foreach ($groupedData as $c => $tasks) {
                $taskList = TaskList::where('projectId', $project->_id)
                    ->where('c', $c)
                    ->first();

                if ($taskList) {
                    $maxOrder = Task::where('taskListId', $taskList->_id)
                        ->max('order') ?? 0;
                    $order = $maxOrder + 1;

                    $uniqueTasks = $tasks->unique(function ($item) {
                        return $item['no'] . $item['sub'];
                    });

                    foreach ($uniqueTasks as $taskData) {
                        Task::create([
                            'taskId' => $this->generateTaskId($project->_id),
                            'projectId' => $project->_id,
                            'taskListId' => $taskList->_id,
                            'no' => $taskData['no'],
                            'sub' => $taskData['sub'],
                            'progress' => 0,
                            'status' => 'UNASSIGNED',
                            'order' => $order++
                        ]);
                    }
                }
            }

            $tasks = Task::where('projectId', $project->_id)
                ->orderBy('order', 'asc')
                ->get()
                ->map(function ($task) {
                    $task['name'] = $this->generateTaskName($task->no, $task->sub);
                    return $task;
                });

            return response()->json([
                'status' => 'success',
                'message' => 'Tasks created successfully from LED data',
                'data' => $tasks
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateRow(Request $request, $projectId, $taskId)
    {
        $request->validate([
            'owners' => 'nullable|array',
            'owners.*' => 'exists:users,_id',
            'startDate' => 'nullable|date',
            'endDate' => 'nullable|date|after:startDate'
        ]);

        $task = Task::where('_id', $taskId)
            ->where('projectId', $projectId)
            ->firstOrFail();

        $project = Project::where('_id', $projectId)->firstOrFail();
        $currentUser = auth()->user();

        $existingOwners = $task->owners ?? [];

        $updates = array_filter($request->only([
            'owners',
            'startDate',
            'endDate'
        ]), function ($value) {
            return $value !== null;
        });

        if (isset($updates['owners']) && !empty($updates['owners'])) {
            $updates['status'] = 'ACTIVE';
        }

        $task->update($updates);
        $task->load('users');
        $task['name'] = $this->generateTaskName($task->no, $task->sub);

        if (isset($updates['owners'])) {
            $newOwners = $updates['owners'];
            $addedOwners = array_diff($newOwners, $existingOwners);

            foreach ($addedOwners as $ownerId) {
                $user = User::find($ownerId);
                if ($user) {
                    try {
                        $user->notify(new TaskAssignedNotification($task, $project, $currentUser));

                        $notificationController = new NotificationController();
                        $phone = $user->phone_number ?? null;

                        if ($phone) {
                            $message = "Hi *{$user->name}*, You've been assigned to a task:\n\n"
                                . "📝 Task: *Butir {$task->no} - {$task->sub}*\n"
                                . "📂 Project: *{$project->name}*\n"
                                . "👤 Assigned by: *{$currentUser->name}*\n"
                                . "📅 Due Date: *" . Carbon::parse($task->endDate)->format('d M Y') . "*\n"
                                . "🔗 *Access your task here:*\n"
                                . config('app.url') . "/projects/{$project->_id}\n\n"
                                . "💡 Click the link above to start.";

                            $notificationController->sendWhatsAppNotification($phone, $message);
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error sending task assignment notification:', [
                            'error' => $e->getMessage(),
                            'user_id' => $user->_id,
                            'task_id' => $task->_id
                        ]);
                    }
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Task updated successfully',
            'data' => $task
        ]);
    }

    public function updateOwners(Request $request, $no, $sub)
    {
        $request->validate([
            'owners' => 'nullable|array',
            'owners.*' => 'exists:users,_id',
            'startDate' => 'nullable|date',
            'endDate' => 'nullable|date|after:startDate'
        ]);

        $task = Task::where('no', $no)
            ->where('sub', $sub)
            ->firstOrFail();

        $updates = $request->only(['startDate', 'endDate']);

        // Jika owners dikirim, gabungkan dengan owners yang sudah ada
        if ($request->has('owners')) {
            $existingOwners = $task->owners ?? []; // Ambil owners lama
            $newOwners = array_unique(array_merge($existingOwners, $request->owners)); // Gabungkan
            $updates['owners'] = $newOwners;
        }

        $task->update($updates);

        $task->load('users');

        return response()->json([
            'status' => 'success',
            'message' => 'Task updated successfully',
            'data' => $task
        ]);
    }

    public function myTasks()
    {
        $userId = auth()->user()->_id;

        $tasks = Task::with(['project', 'tasklist', 'users'])
            ->where(function ($query) use ($userId) {
                $query->whereRaw(['owners' => ['$regex' => $userId]]);
            })
            ->orderBy('no', 'asc')
            ->get()
            ->map(function ($task) {
                $owners = is_string($task->owners) ? json_decode($task->owners, true) : $task->owners;
                $taskName = $this->generateTaskName($task->no, $task->sub);

                return [
                    'id' => $task->_id,
                    'taskId' => $task->taskId,
                    'no' => $task->no,
                    'sub' => $task->sub,
                    'name' => $taskName,
                    'status' => $task->status,
                    'progress' => $task->progress,
                    'startDate' => $task->startDate,
                    'endDate' => $task->endDate,
                    'owners' => $owners ?? [],
                    'project' => [
                        'id' => $task->project?->_id,
                        'projectId' => $task->project?->projectId,
                        'name' => $task->project?->name
                    ],
                    'taskList' => [
                        'id' => $task->tasklist?->_id,
                        'name' => $task->tasklist?->name
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
        $task = Task::where('_id', $taskId)
            ->where('projectId', $projectId)
            ->where('taskListId', $taskListId)
            ->firstOrFail();

        $request->validate([
            'no' => 'integer',
            'sub' => 'string|max:255',
            'progress' => 'float',
            'owners' => 'array',
            'owners.*' => 'exists:users,_id',
            'status' => 'in:ACTIVE,COMPLETED,UNASSIGNED',
            'startDate' => 'date',
            'endDate' => 'date|after:startDate',
            'order' => 'integer'
        ]);

        $task->update($request->only([
            'no',
            'sub',
            'progress',
            'owners',
            'status',
            'startDate',
            'endDate',
            'order'
        ]));

        $task['name'] = $this->generateTaskName($task->no, $task->sub);

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