<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\Project\TaskList;
use App\Models\Project\Task;
use App\Models\Project\Project;
use App\Models\Led\LedItem;
use App\Models\Lkps\LkpsTable;
use Illuminate\Http\Request;
use App\Models\User\User;
use App\Models\DatabaseNotification;
use App\Notifications\TaskAssignedNotification;
use App\Http\Controllers\NotificationController;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TaskController extends Controller
{
    /**
     * Find a task using multiple possible ID fields
     */
    private function findTask($id, $taskListId = null, $projectId = null)
    {
        // Try with different ID fields
        $query = Task::where(function ($q) use ($id) {
            $q->where('_id', $id)
                ->orWhere('id', $id);

            // If we have a taskId that looks like TSK-XXX pattern, try that too
            if (is_string($id) && preg_match('/^TSK-\d+$/', $id)) {
                $q->orWhere('taskId', $id);
            }
        });

        // Add additional constraints if provided
        if ($taskListId) {
            $query->where('taskListId', $taskListId);
        }

        if ($projectId && $taskListId) {
            // Verify this taskList belongs to this project
            $validTaskList = TaskList::where(function ($q) use ($taskListId) {
                $q->where('_id', $taskListId)
                    ->orWhere('id', $taskListId);
            })
                ->where('projectId', $projectId)
                ->exists();

            if (!$validTaskList) {
                return null;
            }
        }

        Log::debug("Attempting to find task with ID: $id", [
            'taskListId' => $taskListId,
            'projectId' => $projectId
        ]);

        return $query->first();
    }

    /**
     * Populate task details from references
     */
    private function populateTaskDetails($task)
    {
        // If the task already has populated data, skip
        if ($task->nama && $task->no && $task->sub) {
            return $task;
        }

        // For LED tasks
        if ($task->ledItemId) {
            $ledItem = LedItem::find($task->ledItemId);
            if ($ledItem) {
                $task->no = $ledItem->no;
                $task->sub = $ledItem->sub;
                $task->nama = "Butir {$ledItem->no} - {$ledItem->sub}";
            }
        }

        // For LKPS tasks
        if ($task->lkpsTableId) {
            $lkpsTable = LkpsTable::find($task->lkpsTableId);
            if ($lkpsTable) {
                // For LKPS tables, use kode as both no and sub for now
                $task->no = $lkpsTable->kode;
                $task->sub = "LKPS";
                $task->nama = "Tabel {$lkpsTable->kode}" . ($lkpsTable->judul ? " - {$lkpsTable->judul}" : "");
            }
        }

        // Default fallback if nothing else
        if (!$task->nama) {
            $task->nama = "Task {$task->taskId}";
        }

        return $task;
    }

    /**
     * Log route parameters for debugging
     */
    private function logRouteParams($methodName, $params = [])
    {
        Log::info("TaskController::{$methodName} called with parameters:", $params);
    }

    /**
     * Generate a task ID based on the task list
     */
    private function generateTaskId($taskListId)
    {
        $taskList = TaskList::find($taskListId);
        if (!$taskList) {
            return 'TSK-001';
        }

        $lastTask = Task::where('taskListId', $taskListId)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lastTask) {
            return 'TSK-001';
        }

        $lastId = $lastTask->taskId;
        $number = intval(substr($lastId, 4)) + 1;

        return 'TSK-' . str_pad($number, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a task name from no and sub
     */
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
        // Get project ID through task list
        $taskList = TaskList::find($data['taskListId']);
        if (!$taskList) {
            throw new \Exception("TaskList not found");
        }

        // Generate task ID
        $lastTask = Task::where('taskListId', $data['taskListId'])
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

    /**
     * Display a listing of tasks for a specific task list.
     */
    public function index($projectId, $taskListId)
    {
        $this->logRouteParams('index', compact('projectId', 'taskListId'));

        try {
            $taskList = TaskList::where(function ($q) use ($taskListId) {
                $q->where('_id', $taskListId)
                    ->orWhere('id', $taskListId);
            })
                ->where('projectId', $projectId)
                ->first();

            if (!$taskList) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Task list not found'
                ], 404);
            }

            $tasks = Task::where('taskListId', $taskList->_id)
                ->orderBy('order', 'asc')
                ->get()
                ->map(function ($task) {
                    $task = $this->populateTaskDetails($task);
                    return $task;
                });

            return response()->json([
                'status' => 'success',
                'data' => $tasks
            ]);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::index', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'projectId' => $projectId,
                'taskListId' => $taskListId
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while fetching tasks'
            ], 500);
        }
    }

    /**
     * Store a newly created task.
     */
    public function store(Request $request, $projectId, $taskListId)
    {
        $this->logRouteParams('store', compact('projectId', 'taskListId'));

        try {
            $request->validate([
                'no' => 'required|integer',
                'sub' => 'required|string|max:255',
                'owners' => 'nullable|array',
                'owners.*' => 'exists:users,_id',
                'startDate' => 'required|date',
                'endDate' => 'required|date|after:startDate',
                'order' => 'nullable|integer',
                'ledItemId' => 'nullable|exists:led_items,_id'
            ]);

            $project = Project::find($projectId);
            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found'
                ], 404);
            }

            $taskList = TaskList::find($taskListId);
            if (!$taskList) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Task list not found'
                ], 404);
            }

            if (!$request->order) {
                $maxOrder = Task::where('taskListId', $taskList->_id)
                    ->max('order') ?? 0;
                $order = $maxOrder + 1;
            } else {
                $order = $request->order;
            }

            $task = Task::create([
                'taskId' => $this->generateTaskId($taskList->_id),
                'taskListId' => $taskList->_id,
                'ledItemId' => $request->ledItemId,
                'no' => $request->no,
                'sub' => $request->sub,
                'nama' => "Butir {$request->no} - {$request->sub}",
                'progress' => 0,
                'owners' => $request->owners,
                'status' => 'UNASSIGNED',
                'startDate' => $request->startDate,
                'endDate' => $request->endDate,
                'order' => $order
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Task created successfully',
                'data' => $task
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::store', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while creating task: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store tasks from LED items.
     */
    public function storeFromLedItems(Request $request, $projectId)
    {
        $this->logRouteParams('storeFromLedItems', compact('projectId'));

        try {
            $project = Project::find($projectId);
            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found'
                ], 404);
            }

            $strataId = null;
            if ($project->prodi) {
                $strataId = $project->prodi->strataId;
            }

            if (!$strataId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Prodi does not have a valid Strata ID'
                ], 400);
            }

            $ledItems = LedItem::where('strataId', $strataId)
                ->whereNotNull('kriteria')
                ->orderBy('kriteria')
                ->orderBy('no')
                ->orderBy('sub')
                ->get();

            if ($ledItems->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No LedItems found for this Strata'
                ], 404);
            }

            $groupedByKriteria = $ledItems->groupBy('kriteria');
            $createdTasks = [];

            foreach ($groupedByKriteria as $kriteria => $items) {
                $taskList = TaskList::where('projectId', $project->_id)
                    ->where('kriteria', $kriteria)
                    ->first();

                if (!$taskList) {
                    // Create task list if it doesn't exist
                    $maxOrder = TaskList::where('projectId', $project->_id)->max('order') ?? 0;
                    $taskList = TaskList::create([
                        'projectId' => $project->_id,
                        'kriteria' => $kriteria,
                        'order' => $maxOrder + 1
                    ]);
                }

                $maxOrder = Task::where('taskListId', $taskList->_id)->max('order') ?? 0;
                $order = $maxOrder + 1;

                $uniqueTasks = $items->unique(function ($item) {
                    return $item->no . $item->sub;
                });

                foreach ($uniqueTasks as $item) {
                    $taskName = "Butir {$item->no} - {$item->sub}";

                    $task = Task::create([
                        'taskId' => $this->generateTaskId($taskList->_id),
                        'taskListId' => $taskList->_id,
                        'ledItemId' => $item->_id,
                        'no' => $item->no,
                        'sub' => $item->sub,
                        'nama' => $taskName,
                        'progress' => 0,
                        'status' => 'UNASSIGNED',
                        'order' => $order++
                    ]);

                    $createdTasks[] = $task;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Tasks created successfully from LED items',
                'data' => $createdTasks
            ]);

        } catch (\Exception $e) {
            Log::error('Error in TaskController::storeFromLedItems', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'projectId' => $projectId
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update task owners and dates.
     */
    public function updateRow(Request $request, $projectId, $taskId)
    {
        $this->logRouteParams('updateRow', compact('projectId', 'taskId'));

        try {
            $request->validate([
                'owners' => 'nullable|array',
                'owners.*' => 'exists:users,_id',
                'startDate' => 'nullable|date',
                'endDate' => 'nullable|date|after:startDate'
            ]);

            // Find the task
            $task = $this->findTask($taskId, null, $projectId);

            if (!$task) {
                Log::warning("Task not found in updateRow", [
                    'taskId' => $taskId,
                    'projectId' => $projectId
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Task not found'
                ], 404);
            }

            $project = Project::find($projectId);
            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found'
                ], 404);
            }

            $currentUser = auth()->user();
            $existingOwners = $task->owners ?? [];

            $updates = array_filter($request->only([
                'owners',
                'startDate',
                'endDate'
            ]), function ($value) {
                return $value !== null;
            });

            // Handle status based on owners
            if (isset($updates['owners'])) {
                if (!empty($updates['owners'])) {
                    // Ada owners, set status ke ACTIVE
                    $updates['status'] = 'ACTIVE';
                } else {
                    // Owners kosong, set status ke UNASSIGNED
                    $updates['status'] = 'UNASSIGNED';
                }
            }

            $task->update($updates);
            $task->load('users');

            // Ensure task details are populated
            $task = $this->populateTaskDetails($task);

            if (isset($updates['owners'])) {
                $newOwners = $updates['owners'];
                $addedOwners = array_diff($newOwners, $existingOwners);

                // Only send notifications for newly added owners
                foreach ($addedOwners as $ownerId) {
                    $user = User::find($ownerId);
                    if ($user) {
                        try {
                            $user->notify(new TaskAssignedNotification($task, $project, $currentUser));

                            $notificationController = new NotificationController();
                            $phone = $user->phone_number ?? null;

                            if ($phone) {
                                $message = "Hi *{$user->name}*, You've been assigned to a task:\n\n"
                                    . "📝 Task: *{$task->nama}*\n"
                                    . "📂 Project: *{$project->name}*\n"
                                    . "👤 Assigned by: *{$currentUser->name}*\n"
                                    . "📅 Due Date: *" . Carbon::parse($task->endDate)->format('d M Y') . "*\n"
                                    . "🔗 *Access your task here:*\n"
                                    . config('app.url') . "/projects/{$project->_id}\n\n"
                                    . "💡 Click the link above to start.";

                                $notificationController->sendWhatsAppNotification($phone, $message);
                            }
                        } catch (\Exception $e) {
                            Log::error('Error sending task assignment notification:', [
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
        } catch (\Exception $e) {
            Log::error('Error in TaskController::updateRow', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'taskId' => $taskId,
                'projectId' => $projectId
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while updating task: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update owners for a task by no and sub.
     */
    public function updateOwners(Request $request, $no, $sub, $prodiId)
    {
        $this->logRouteParams('updateOwners', compact('no', 'sub'));

        try {
            $request->validate([
                'owners' => 'nullable|array',
                'owners.*' => 'exists:users,_id',
                'startDate' => 'nullable|date',
                'endDate' => 'nullable|date|after:startDate'
            ]);
            $tasks = Task::with(['tasklist.project'])
                ->whereHas('ledItem', function ($query) use ($no, $sub) {
                    $query->where('no', $no)
                        ->where('sub', $sub);
                })
                ->get();

            $task = $tasks->first(function ($task) use ($prodiId) {
                return $task->tasklist &&
                    $task->tasklist->project &&
                    $task->tasklist->project->prodiId === $prodiId &&
                    in_array($task->taskList->project->status, ['ACTIVE', 'IN PROGRESS']);
            });

            if (!$task) {
                Log::warning("Task not found in updateOwners", [
                    'no' => $no,
                    'sub' => $sub,
                    'prodiId' => $prodiId,
                    'owners' => $request->owners,
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Task not found'
                ], 404);
            }

            $updates = $request->only(['startDate', 'endDate']);

            // If owners provided, merge with existing owners
            if ($request->has('owners')) {
                $existingOwners = $task->owners ?? []; // Get existing owners
                $newOwners = array_unique(array_merge($existingOwners, $request->owners)); // Merge
                $updates['owners'] = $newOwners;
            }

            $task->update($updates);
            $task->load('users');

            // Ensure task details are populated
            $task = $this->populateTaskDetails($task);

            return response()->json([
                'status' => 'success',
                'message' => 'Task updated successfully',
                'data' => $task
            ]);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::updateOwners', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'no' => $no,
                'sub' => $sub
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while updating task owners: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get tasks assigned to the current user.
     */
    public function myTasks()
    {
        $this->logRouteParams('myTasks');

        try {
            $userId = auth()->user()->_id;

            $tasks = Task::with(['tasklist.project', 'users'])
                ->where(function ($query) use ($userId) {
                    $query->whereRaw(['owners' => ['$regex' => $userId]]);
                })
                ->orderBy('no', 'asc')
                ->get()
                ->map(function ($task) {
                    // Ensure task details are populated
                    return $this->populateTaskDetails($task);
                })
                ->filter(function ($task) {
                    // Jangan kembalikan task jika sub-nya "LKPS"
                    return $task->sub !== 'LKPS';
                })
                ->map(function ($task) {
                    $owners = is_string($task->owners) ? json_decode($task->owners, true) : $task->owners;
                    $project = $task->tasklist->project ?? null;

                    return [
                        'id' => $task->_id,
                        'taskId' => $task->taskId,
                        'no' => $task->no,
                        'sub' => $task->sub,
                        'name' => $task->nama,
                        'project' => $project ? [
                            'id' => $project->_id,
                        ] : null,
                    ];
                })->sortBy([
                    ['no', 'asc'],
                    ['sub', 'asc'],
                ])->values()->all();

            return response()->json([
                'status' => 'success',
                'data' => $tasks
            ]);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::myTasks', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while fetching your tasks: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a specific task.
     */
    public function update(Request $request, $projectId, $taskListId, $taskId)
    {
        $this->logRouteParams('update', compact('projectId', 'taskListId', 'taskId'));

        try {
            // Find the task by ID
            $task = $this->findTask($taskId, $taskListId, $projectId);

            if (!$task) {
                Log::warning("Task not found in update", [
                    'taskId' => $taskId,
                    'taskListId' => $taskListId,
                    'projectId' => $projectId
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Task not found'
                ], 404);
            }

            $request->validate([
                'no' => 'integer',
                'sub' => 'string|max:255',
                'progress' => 'numeric',
                'owners' => 'array',
                'owners.*' => 'exists:users,_id',
                'status' => 'in:ACTIVE,COMPLETED,UNASSIGNED',
                'startDate' => 'date',
                'endDate' => 'date|after:startDate',
                'order' => 'integer',
                'ledItemId' => 'exists:led_items,_id'
            ]);

            $updateData = $request->only([
                'no',
                'sub',
                'progress',
                'owners',
                'status',
                'startDate',
                'endDate',
                'order',
                'ledItemId'
            ]);

            // Update the name if no/sub changed
            if (isset($updateData['no']) || isset($updateData['sub'])) {
                $no = $updateData['no'] ?? $task->no;
                $sub = $updateData['sub'] ?? $task->sub;
                $updateData['nama'] = "Butir {$no} - {$sub}";
            }

            $task->update($updateData);

            // Reload task with fresh data
            $task = $this->populateTaskDetails($task->fresh());

            return response()->json([
                'status' => 'success',
                'message' => 'Task updated successfully',
                'data' => $task
            ]);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::update', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'taskId' => $taskId,
                'taskListId' => $taskListId,
                'projectId' => $projectId
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while updating task: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update project progress based on task completion.
     */
    private function updateProjectProgress($projectId)
    {
        try {
            $project = Project::find($projectId);
            if (!$project) {
                return 0;
            }

            // Get all tasks associated with this project through task lists
            $taskLists = TaskList::where('projectId', $projectId)->pluck('_id');
            $totalTasks = Task::whereIn('taskListId', $taskLists)->count();

            if ($totalTasks === 0) {
                return 0;
            }

            $completedTasks = Task::whereIn('taskListId', $taskLists)
                ->where('status', 'COMPLETED')
                ->count();

            $progress = ($completedTasks / $totalTasks) * 100;

            $project->progress = round($progress, 2);
            $project->save();

            return $project->progress;
        } catch (\Exception $e) {
            Log::error('Error updating project progress', [
                'projectId' => $projectId,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Delete a task.
     */
    public function destroy($projectId, $taskListId, $taskId)
    {
        $this->logRouteParams('destroy', compact('projectId', 'taskListId', 'taskId'));

        try {
            // Find the task by ID
            $task = $this->findTask($taskId, $taskListId, $projectId);

            if (!$task) {
                Log::warning("Task not found for deletion", [
                    'taskId' => $taskId,
                    'taskListId' => $taskListId,
                    'projectId' => $projectId
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Task not found'
                ], 404);
            }

            $task->delete();

            // Update project progress after task deletion
            $this->updateProjectProgress($projectId);

            return response()->json([
                'status' => 'success',
                'message' => 'Task deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in TaskController::destroy', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'taskId' => $taskId,
                'taskListId' => $taskListId,
                'projectId' => $projectId
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while deleting task: ' . $e->getMessage()
            ], 500);
        }
    }
}
