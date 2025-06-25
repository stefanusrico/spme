<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Models\Project\Project;
use App\Models\Project\ProjectMember;
use App\Models\Project\Task;
use App\Models\Project\TaskList;
use App\Models\Prodi\Prodi;
use App\Models\User\User;
use App\Models\Led\LedItem;
use App\Models\Lkps\LkpsTable;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Notification\NotificationController;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use App\Services\ProjectTemplateService;
use App\Notifications\ProjectMemberAddedNotification;
use App\Notifications\ProjectCreatedNotification;

class ProjectController extends Controller
{
    const ROLE_OWNER = 'owner';
    const ROLE_ADMIN = 'admin';
    const ROLE_USER = 'user';

    protected $availableRoles = [
        self::ROLE_ADMIN,
        self::ROLE_USER
    ];

    public function index()
    {
        $projects = Project::orderBy('created_at', 'desc')->get();

        $projectsWithOwner = $projects->map(function ($project) {
            $owner = ProjectMember::where('projectId', $project->_id)
                ->where('role', self::ROLE_OWNER)
                ->first();

            $ownerUser = null;
            if ($owner) {
                $ownerUser = User::find($owner->userId);
            }

            $prodi = Prodi::find($project->prodiId);

            $ownerJurusan = $ownerUser ? $ownerUser->jurusan : null;
            $jurusanName = $ownerJurusan ? $ownerJurusan->name : 'Unknown';

            return array_merge($project->toArray(), [
                'ownerName' => $ownerUser ? $ownerUser->name : 'Unknown',
                'prodiName' => $prodi ? $prodi->name : 'Unknown',
                'ownerJurusan' => $jurusanName
            ]);
        });

        return response()->json([
            'status' => 'success',
            'data' => $projectsWithOwner
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after:startDate',
        ]);

        $user = auth()->user();

        if (!$user->prodiId) {
            return response()->json([
                'status' => 'error',
                'message' => 'User harus memiliki prodi'
            ], 400);
        }

        $prodiModel = Prodi::find($user->prodiId);
        if (!$prodiModel) {
            return response()->json([
                'status' => 'error',
                'message' => 'Prodi tidak ditemukan'
            ], 400);
        }

        $latestProject = Project::where('prodiId', $prodiModel->_id)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($latestProject && $latestProject->status !== 'INACTIVE') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat membuat project baru. Project terakhir masih berstatus: ' .
                    $latestProject->status . '. Project harus berstatus INACTIVE terlebih dahulu.',
                'latestProject' => [
                    'name' => $latestProject->name,
                    'status' => $latestProject->status,
                    'endDate' => Carbon::parse($latestProject->endDate)->format('d M Y')
                ]
            ], 400);
        }

        // Generate project ID berdasarkan project terakhir
        $projectId = $latestProject
            ? 'PRJ-' . str_pad((intval(substr($latestProject->projectId, 4)) + 1), 3, '0', STR_PAD_LEFT)
            : 'PRJ-001';

        $project = Project::create([
            'projectId' => $projectId,
            'name' => $request->name,
            'progress' => 0,
            'status' => 'ACTIVE',
            'startDate' => $request->startDate,
            'endDate' => $request->endDate,
            'createdBy' => $user->_id,
            'prodiId' => $prodiModel->_id,
        ]);

        // Create project owner membership in the ProjectMember collection
        ProjectMember::create([
            'projectId' => $project->_id,
            'userId' => $user->_id,
            'role' => self::ROLE_OWNER,
            'joinedAt' => now()
        ]);

        $existingProjects = $user->projects ?? [];
        $updatedProjects = array_merge($existingProjects, [
            [
                'projectId' => $project->_id,
                'role' => self::ROLE_OWNER
            ]
        ]);
        $user->projects = $updatedProjects;
        $user->save();

        try {
            ProjectTemplateService::createDefaultStructure($project->_id);
        } catch (\Exception $e) {
            \Log::error('Error creating project template structure: ' . $e->getMessage(), [
                'projectId' => $project->_id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'warning',
                'message' => 'Project created but template generation failed: ' . $e->getMessage(),
                'data' => $project
            ], 201);
        }

        // Kirim notifikasi ke semua user dengan role Admin
        try {
            $adminUsers = User::where('role', 'Admin')
                ->get();

            foreach ($adminUsers as $adminUser) {
                try {
                    // Kirim notifikasi database dengan data prodi
                    $adminUser->notify(new ProjectCreatedNotification($project, $user, $prodiModel));

                    // Kirim WhatsApp notification jika ada nomor telepon
                    $notificationController = new NotificationController();
                    $phone = $adminUser->phone_number ?? null;

                    if ($phone) {
                        $projectUrl = config('app.url') . '/projects/' . $project->_id;
                        $message = "Hi *{$adminUser->name}*,\n\n"
                            . "🆕 *New Project Created*\n\n"
                            . "📂 Project: *{$project->name}*\n"
                            . "👤 Created by: *{$user->name}*\n"
                            . "🏢 Prodi: *{$prodiModel->name}*\n"
                            . "📅 Start Date: *" . Carbon::parse($project->startDate)->format('d M Y') . "*\n"
                            . "📅 End Date: *" . Carbon::parse($project->endDate)->format('d M Y') . "*\n"
                            . "🔗 *View project here:*\n"
                            . $projectUrl . "\n\n"
                            . "💡 Click the link above to monitor the project.";

                        $notificationController->sendWhatsAppNotification($phone, $message);
                    }

                    \Log::info('Project creation notification sent to admin:', [
                        'admin_id' => $adminUser->_id,
                        'admin_name' => $adminUser->name,
                        'project_id' => $project->_id
                    ]);

                } catch (\Exception $e) {
                    \Log::error('Error sending project creation notification to admin:', [
                        'admin_id' => $adminUser->_id,
                        'error' => $e->getMessage(),
                        'project_id' => $project->_id
                    ]);
                }
            }

            \Log::info('Project creation notifications sent to all admins', [
                'project_id' => $project->_id,
                'admin_count' => $adminUsers->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Error sending project creation notifications:', [
                'error' => $e->getMessage(),
                'project_id' => $project->_id,
                'trace' => $e->getTraceAsString()
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Project created successfully',
            'data' => $project
        ], 201);
    }

    public function myProjects()
    {
        $userId = auth()->user()->_id;

        $projects = Project::with(['tasklists', 'tasks'])
            ->where('createdBy', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $projects
        ]);
    }

    public function getProjectDetails($projectId)
    {
        try {
            // 1. Use caching to drastically improve response time
            $cacheKey = "project_details_{$projectId}";
            $cacheDuration = 5; // minutes

            // Skip cache if refresh is requested
            if (Cache::has($cacheKey) && !request()->has('refresh')) {
                return response()->json(Cache::get($cacheKey));
            }

            // 2. Use projection to limit fields retrieved
            $project = Project::select(
                '_id',
                'projectId',
                'name',
                'prodiId',
                'progress',
                'startDate',
                'endDate',
                'created_at'
            )
                ->with(['prodi:_id,name'])
                ->find($projectId);

            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found'
                ], 404);
            }

            // 3. Efficiently get task lists and tasks in a single query
            $taskLists = TaskList::where('projectId', $project->_id)
                ->select('_id', 'projectId')
                ->get();

            $taskListIds = $taskLists->pluck('_id')->toArray();

            // 4. Load tasks with needed fields only
            $tasks = Task::whereIn('taskListId', $taskListIds)
                ->select(
                    '_id',
                    'taskId',
                    'no',
                    'sub',
                    'nama',
                    'taskListId',
                    'status',
                    'progress',
                    'startDate',
                    'endDate',
                    'owners',
                    'created_at',
                    'updated_at',
                    'ledItemId',
                    'lkpsTableId'
                )
                ->get();

            // 5. Preload all task owners in a single query
            $ownerIds = $this->collectOwnerIds($tasks);
            $ownerDetails = $this->preloadUserDetails($ownerIds);

            // 6. Preload reference data if needed
            $ledItems = $this->preloadTaskReferences($tasks, 'ledItemId', LedItem::class, ['_id', 'no', 'sub']);
            $lkpsTables = $this->preloadTaskReferences($tasks, 'lkpsTableId', LkpsTable::class, ['_id', 'kode', 'judul']);

            // 7. Preload project members for resource allocation
            $projectMembers = ProjectMember::where('projectId', $project->_id)
                ->get(['userId', 'role']);

            $memberIds = $projectMembers->pluck('userId')->unique()->toArray();
            $membersInfo = !empty($memberIds) ?
                User::whereIn('_id', $memberIds)
                    ->select('_id', 'name', 'profile_picture')
                    ->get()
                    ->keyBy('_id')
                : collect([]);

            // 8. Process data efficiently
            $tasksByStatus = $this->organizeTasksByStatus($tasks, $ownerDetails, $ledItems, $lkpsTables);
            $weeklyTrends = $this->calculateWeeklyTrends($tasks);
            $resourceAllocation = $this->prepareResourceAllocation($projectMembers, $membersInfo, $tasks);
            $statistics = $this->calculateStatistics($tasks);

            // 9. Format the result
            $result = [
                'status' => 'success',
                'data' => [
                    'projectId' => $project->projectId,
                    'projectName' => $project->name,
                    'prodiName' => $project->prodi->name ?? 'Unknown',
                    'prodiId' => $project->prodiId,
                    'createdAt' => $project->created_at,
                    'startDate' => $project->startDate ? Carbon::parse($project->startDate)->toDateString() : null,
                    'endDate' => $project->endDate ? Carbon::parse($project->endDate)->toDateString() : null,
                    'statistics' => $statistics,
                    'tasks' => $tasksByStatus,
                    'todaysTasks' => array_slice($tasksByStatus['todaysTasks'] ?? [], 0, 5),
                    'overdueTasks' => array_slice($tasksByStatus['overdueTasks'] ?? [], 0, 5),
                    'weeklyTrends' => $weeklyTrends,
                    'resourceAllocation' => $resourceAllocation,
                ]
            ];

            // 10. Cache the result
            Cache::put($cacheKey, $result, $cacheDuration);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error retrieving project details:', [
                'error' => $e->getMessage(),
                'projectId' => $projectId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => config('app.debug') ?
                    'Error retrieving project details: ' . $e->getMessage() :
                    'An error occurred.'
            ], 500);
        }
    }

    /**
     * Collect all owner IDs from tasks
     */
    private function collectOwnerIds($tasks)
    {
        $ownerIds = collect();

        foreach ($tasks as $task) {
            if (isset($task->owners) && is_array($task->owners)) {
                foreach ($task->owners as $ownerId) {
                    $ownerIds->push($ownerId);
                }
            }
        }

        return $ownerIds->unique()->values()->all();
    }

    /**
     * Preload user details for all owner IDs
     */
    private function preloadUserDetails($ownerIds)
    {
        if (empty($ownerIds)) {
            return [];
        }

        return User::whereIn('_id', $ownerIds)
            ->select('_id', 'name', 'profile_picture')
            ->get()
            ->keyBy('_id')
            ->all();
    }

    /**
     * Preload task references (LedItems or LkpsTables)
     */
    private function preloadTaskReferences($tasks, $refField, $modelClass, $fields = ['*'])
    {
        $refIds = $tasks->pluck($refField)
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($refIds)) {
            return [];
        }

        return $modelClass::whereIn('_id', $refIds)
            ->select($fields)
            ->get()
            ->keyBy('_id')
            ->all();
    }

    /**
     * Organize tasks by status
     */
    private function organizeTasksByStatus($tasks, $ownerDetails, $ledItems, $lkpsTables)
    {
        $today = Carbon::today()->startOfDay();
        $tasksByStatus = ['ACTIVE' => [], 'COMPLETED' => [], 'UNASSIGNED' => [], 'CANCELLED' => []];
        $overdueTasksList = [];
        $todaysTasksList = [];

        foreach ($tasks as $task) {
            // Populate task name from references if needed
            $this->populateTaskName($task, $ledItems, $lkpsTables);

            // Get owner details
            $taskOwnersDetails = $this->getTaskOwnerDetails($task, $ownerDetails);

            // Format the task
            $formattedTask = [
                'id' => $task->_id,
                'no' => $task->no,
                'sub' => $task->sub,
                'name' => $task->nama ?: "Task " . $task->_id,
                'status' => $task->status,
                'progress' => $task->progress,
                'owners' => $taskOwnersDetails,
                'startDate' => $task->startDate ? Carbon::parse($task->startDate)->toDateString() : null,
                'endDate' => $task->endDate ? Carbon::parse($task->endDate)->toDateString() : null,
            ];

            // Add to appropriate collections
            if (isset($tasksByStatus[$task->status])) {
                $tasksByStatus[$task->status][] = $formattedTask;
            } elseif ($task->status === 'CANCELLED') {
                $tasksByStatus['CANCELLED'][] = $formattedTask;
            }

            if ($task->status === 'ACTIVE' && $task->startDate && Carbon::parse($task->startDate)->isSameDay($today)) {
                $todaysTasksList[] = $formattedTask;
            }

            if ($task->status === 'ACTIVE' && $task->endDate && Carbon::parse($task->endDate)->lt($today)) {
                $overdueTasksList[] = $formattedTask;
            }
        }

        $tasksByStatus['todaysTasks'] = $todaysTasksList;
        $tasksByStatus['overdueTasks'] = $overdueTasksList;

        return $tasksByStatus;
    }

    /**
     * Populate task name from references if needed
     */
    private function populateTaskName($task, $ledItems, $lkpsTables)
    {
        if (!empty($task->nama)) {
            return;
        }

        // Try to get name from LED item
        if (!empty($task->ledItemId) && isset($ledItems[$task->ledItemId])) {
            $ledItem = $ledItems[$task->ledItemId];
            $task->no = $ledItem->no;
            $task->sub = $ledItem->sub;
            $task->nama = "Butir {$ledItem->no} - {$ledItem->sub}";
            return;
        }

        // Try to get name from LKPS table
        if (!empty($task->lkpsTableId) && isset($lkpsTables[$task->lkpsTableId])) {
            $lkpsTable = $lkpsTables[$task->lkpsTableId];
            $task->no = $lkpsTable->kode;
            $task->sub = "LKPS";
            $task->nama = "Tabel {$lkpsTable->kode}";
            return;
        }

        // Default fallback
        $task->nama = "Task {$task->_id}";
    }

    /**
     * Get task owner details
     */
    private function getTaskOwnerDetails($task, $ownerDetails)
    {
        $taskOwnersDetails = collect();

        if (isset($task->owners) && is_array($task->owners)) {
            foreach ($task->owners as $ownerId) {
                if (isset($ownerDetails[$ownerId])) {
                    $user = $ownerDetails[$ownerId];
                    $taskOwnersDetails->push([
                        'id' => $user->_id,
                        'name' => $user->name,
                        'profile_picture' => $user->profile_picture
                    ]);
                }
            }
        }

        return $taskOwnersDetails->values()->all();
    }

    /**
     * Calculate weekly trends
     */
    private function calculateWeeklyTrends($tasks)
    {
        $today = Carbon::today()->startOfDay();
        $sevenDaysAgo = $today->copy()->subDays(6);

        $weeklyCompleted = array_fill(0, 7, 0);
        $weeklyActive = array_fill(0, 7, 0);

        foreach ($tasks as $task) {
            try {
                $taskDate = Carbon::parse($task->updated_at ?? $task->created_at)->startOfDay();
                if ($taskDate->betweenIncluded($sevenDaysAgo, $today)) {
                    $dayIndex = $today->diffInDays($taskDate);
                    if ($task->status === 'COMPLETED')
                        $weeklyCompleted[$dayIndex]++;
                    if ($task->status === 'ACTIVE')
                        $weeklyActive[$dayIndex]++;
                }
            } catch (\Exception $e) {
                // Skip invalid dates
            }
        }

        $dayLabels = [];
        $currentDate = $today->copy();
        for ($i = 0; $i < 7; $i++) {
            $dayLabels[] = $currentDate->copy()->subDays(6 - $i)->format('D');
        }

        return [
            'labels' => $dayLabels,
            'datasets' => [
                ['label' => 'Completed Tasks', 'data' => array_reverse($weeklyCompleted), 'backgroundColor' => '#4ade80', 'borderColor' => '#16a34a'],
                ['label' => 'Active Tasks', 'data' => array_reverse($weeklyActive), 'backgroundColor' => '#38bdf8', 'borderColor' => '#0284c7']
            ]
        ];
    }

    /**
     * Prepare resource allocation data
     */
    private function prepareResourceAllocation($projectMembers, $membersInfo, $tasks)
    {
        $taskCountsPerMember = [];

        // Count active tasks per user
        foreach ($tasks as $task) {
            if ($task->status !== 'COMPLETED' && $task->status !== 'CANCELLED' && isset($task->owners) && is_array($task->owners)) {
                foreach ($task->owners as $ownerId) {
                    $key = (string) $ownerId;
                    if (!isset($taskCountsPerMember[$key])) {
                        $taskCountsPerMember[$key] = 0;
                    }
                    $taskCountsPerMember[$key]++;
                }
            }
        }

        return $projectMembers->map(function ($memberData) use ($membersInfo, $taskCountsPerMember) {
            $userId = $memberData->userId;
            if (!$userId)
                return null;

            $userInfo = $membersInfo->get($userId);
            $taskCount = $taskCountsPerMember[(string) $userId] ?? 0;

            if (!$userInfo) {
                return [
                    'userId' => $userId,
                    'name' => 'Unknown User',
                    'profile_picture' => null,
                    'role' => $memberData->role ?? 'Unknown',
                    'taskCount' => $taskCount,
                ];
            }

            return [
                'userId' => $userInfo->_id,
                'name' => $userInfo->name,
                'profile_picture' => $userInfo->profile_picture,
                'role' => $memberData->role,
                'taskCount' => $taskCount,
            ];
        })->filter()->values();
    }

    /**
     * Calculate statistics from tasks
     */
    private function calculateStatistics($tasks)
    {
        $today = Carbon::today()->startOfDay();
        $overdueTasks = 0;
        $tasksDueToday = 0;
        $cancelled = 0;
        $completed = 0;
        $active = 0;
        $unassigned = 0;

        foreach ($tasks as $task) {
            // Count by status
            if ($task->status === 'COMPLETED') {
                $completed++;
            } elseif ($task->status === 'ACTIVE') {
                $active++;

                // Check if overdue
                if ($task->endDate && Carbon::parse($task->endDate)->lt($today)) {
                    $overdueTasks++;
                }

                // Check if due today
                if ($task->startDate && Carbon::parse($task->startDate)->isSameDay($today)) {
                    $tasksDueToday++;
                }
            } elseif ($task->status === 'UNASSIGNED') {
                $unassigned++;
            } elseif ($task->status === 'CANCELLED') {
                $cancelled++;
            }
        }

        return [
            'totalTasks' => $tasks->count(),
            'completedTasks' => $completed,
            'activeTasks' => $active,
            'unassignedTasks' => $unassigned,
            'overdueTasks' => $overdueTasks,
            'tasksDueToday' => $tasksDueToday,
            'cancelledTasks' => $cancelled
        ];
    }

    public function getProjectDetailsByProdi($prodiId)
    {
        try {
            $project = Project::where('prodiId', $prodiId)
                ->with([
                    'prodi',
                    'taskLists.tasks' => function ($query) {
                        $query->with(['users', 'ledItem'])
                            ->whereIn('status', ['ACTIVE', 'UNASSIGNED'])
                            ->whereNotNull('ledItemId');
                    }
                ])
                ->first();

            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project tidak ditemukan.'
                ], 404);
            }

            // Gabungkan semua tasks dari taskLists
            $tasks = collect();
            foreach ($project->taskLists as $taskList) {
                $tasks = $tasks->merge($taskList->tasks);
            }

            // Format dan urutkan tasks
            $formattedTasks = $tasks
                ->filter(function ($task) {
                    return $task->ledItem !== null; // pastikan ada ledItem
                })
                ->values()
                ->map(function ($task) {
                    return [
                        'id' => $task->_id,
                        'name' => $task->nama,
                        'status' => $task->status,
                        'no' => $task->ledItem->no,
                        'sub' => $task->ledItem->sub,
                        'project' => [
                            'id' => $task->taskList->project->_id,
                        ],
                        'owners' => $task->users->map(function ($user) {
                            return [
                                'id' => $user->id,
                                'name' => $user->name
                            ];
                        })->values()
                    ];
                });

            // Bangun response
            return response()->json([
                'status' => 'success',
                'data' => [
                    'projectId' => $project->_id,
                    'projectName' => $project->name,
                    'prodiName' => $project->prodi->name ?? null,
                    'prodiId' => $project->prodi->id ?? null,
                    'createdAt' => $project->created_at,
                    'statistics' => [
                        'totalTasks' => $formattedTasks->count()
                    ],
                    'tasks' => $formattedTasks
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Project details error:', [
                'error' => $e->getMessage(),
                'prodiId' => $prodiId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error retrieving project details: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getProjectTaskLists($projectId)
    {
        try {
            // 1. Add caching for project and task lists
            $cacheKey = "project_task_lists_{$projectId}";
            $cacheDuration = 5; // Cache for 5 minutes

            if (Cache::has($cacheKey) && !request()->has('refresh')) {
                return response()->json(Cache::get($cacheKey));
            }

            // 2. Use projection to limit fields retrieved
            $project = Project::select('_id', 'projectId', 'name')->find($projectId);

            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found'
                ], 404);
            }

            // 4. Optimize eager loading with specific field selection
            $taskLists = TaskList::where('projectId', $project->_id)
                ->select('_id', 'kriteria', 'order', 'projectId')
                ->with([
                    'tasks' => function ($query) {
                        $query->select(
                            '_id',
                            'taskListId',
                            'ledItemId',
                            'lkpsTableId',
                            'nama',
                            'no',
                            'sub',
                            'status',
                            'progress',
                            'startDate',
                            'endDate',
                            'order',
                            'owners'
                        )
                            ->orderBy('order', 'asc');
                    }
                ])
                ->orderBy('order', 'asc')
                ->get();

            // 5. Calculate statistics from all tasks
            $allTasks = collect();
            foreach ($taskLists as $taskList) {
                $allTasks = $allTasks->merge($taskList->tasks);
            }

            $statistics = $this->calculateTaskListStatistics($allTasks);

            // 6. Batch processing for large collections
            $result = [
                'status' => 'success',
                'data' => [
                    'projectId' => $project->projectId,
                    'projectName' => $project->name,
                    'taskLists' => [],
                    'statistics' => $statistics
                ]
            ];

            // 7. Preload related data to avoid repeated lookups
            $taskOwners = $this->preloadTaskOwners($taskLists);
            $ledItems = $this->preloadLedItems($taskLists);
            $lkpsTables = $this->preloadLkpsTables($taskLists);

            // 8. Process each task list efficiently
            foreach ($taskLists as $taskList) {
                $listName = "Kriteria {$taskList->kriteria}";
                $processedTasks = [];

                foreach ($taskList->tasks as $task) {
                    // Use preloaded data instead of making queries inside the loop
                    $taskDetails = $this->getTaskDetails($task, $ledItems, $lkpsTables);
                    $ownerDetails = isset($taskOwners[$task->_id]) ? $taskOwners[$task->_id] : [];

                    // Calculate different duration metrics
                    $totalDuration = $this->calculateDuration($task->startDate, $task->endDate);
                    $remainingDuration = $this->calculateRemainingDuration($task->startDate, $task->endDate, $task->status);

                    // Determine task urgency
                    $isOverdue = $task->endDate && Carbon::parse($task->endDate)->lt(Carbon::now()) && $task->status !== 'COMPLETED';
                    $isDueToday = $task->endDate && Carbon::parse($task->endDate)->isSameDay(Carbon::now());
                    $isDueSoon = $task->endDate && Carbon::parse($task->endDate)->between(Carbon::now(), Carbon::now()->addDays(3));

                    $processedTasks[] = [
                        'id' => $task->_id,
                        'ledItemId' => $task->ledItemId,
                        'lkpsTableId' => $task->lkpsTableId,
                        'no' => $taskDetails['no'],
                        'sub' => $taskDetails['sub'],
                        'name' => $taskDetails['name'],
                        'status' => $task->status,
                        'progress' => $task->progress,
                        'startDate' => $this->formatDate($task->startDate),
                        'endDate' => $this->formatDate($task->endDate),
                        'duration' => $totalDuration, // Total duration from start to end
                        'remainingDuration' => $remainingDuration, // Days remaining
                        'isOverdue' => $isOverdue,
                        'isDueToday' => $isDueToday,
                        'isDueSoon' => $isDueSoon,
                        'order' => $task->order,
                        'taskListId' => $task->taskListId,
                        'owners' => $ownerDetails
                    ];
                }

                $result['data']['taskLists'][] = [
                    'id' => $taskList->_id,
                    'kriteria' => $taskList->kriteria,
                    'name' => $listName,
                    'order' => $taskList->order,
                    'tasks' => $processedTasks
                ];
            }

            // 9. Cache the result
            Cache::put($cacheKey, $result, $cacheDuration);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error retrieving project task lists:', [
                'error' => $e->getMessage(),
                'projectId' => $projectId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => config('app.debug')
                    ? 'Error retrieving project task lists: ' . $e->getMessage()
                    : 'An error occurred.'
            ], 500);
        }
    }

    /**
     * Calculate task list statistics
     */
    private function calculateTaskListStatistics($tasks)
    {
        $statistics = [
            'totalTasks' => 0,
            'completedTasks' => 0,
            'activeTasks' => 0,
            'inProgressTasks' => 0,
            'unassignedTasks' => 0,
            'cancelledTasks' => 0,
        ];

        foreach ($tasks as $task) {
            $statistics['totalTasks']++;

            switch ($task->status) {
                case 'COMPLETED':
                    $statistics['completedTasks']++;
                    break;
                case 'ACTIVE':
                    $statistics['activeTasks']++;
                    break;
                case 'IN PROGRESS':
                    $statistics['inProgressTasks']++;
                    break;
                case 'UNASSIGNED':
                    $statistics['unassignedTasks']++;
                    break;
                case 'CANCELLED':
                    $statistics['cancelledTasks']++;
                    break;
            }
        }

        // Calculate percentage for each status
        $total = $statistics['totalTasks'];
        if ($total > 0) {
            $statistics['percentages'] = [
                'completed' => round(($statistics['completedTasks'] / $total) * 100, 1),
                'active' => round(($statistics['activeTasks'] / $total) * 100, 1),
                'inProgress' => round(($statistics['inProgressTasks'] / $total) * 100, 1),
                'unassigned' => round(($statistics['unassignedTasks'] / $total) * 100, 1),
                'cancelled' => round(($statistics['cancelledTasks'] / $total) * 100, 1),
            ];
        } else {
            $statistics['percentages'] = [
                'completed' => 0,
                'active' => 0,
                'inProgress' => 0,
                'unassigned' => 0,
                'cancelled' => 0,
            ];
        }

        return $statistics;
    }

    /**
     * Preload all task owners in one query
     */
    private function preloadTaskOwners($taskLists)
    {
        $allTaskIds = collect();
        $taskOwners = [];

        // Collect all task IDs
        foreach ($taskLists as $taskList) {
            foreach ($taskList->tasks as $task) {
                if (!empty($task->owners)) {
                    $allTaskIds->push($task->_id);
                }
            }
        }

        if ($allTaskIds->isEmpty()) {
            return [];
        }

        // Get all owner IDs
        $allOwnerIds = Task::whereIn('_id', $allTaskIds)
            ->get(['_id', 'owners'])
            ->flatMap(function ($task) {
                return isset($task->owners) && is_array($task->owners) ? $task->owners : [];
            })
            ->unique()
            ->values()
            ->all();

        if (empty($allOwnerIds)) {
            return [];
        }

        // Get all owners in one query
        $users = User::whereIn('_id', $allOwnerIds)
            ->select('_id', 'name', 'profile_picture')
            ->get()
            ->keyBy('_id');

        // Map owners to tasks
        foreach ($taskLists as $taskList) {
            foreach ($taskList->tasks as $task) {
                if (isset($task->owners) && is_array($task->owners)) {
                    $taskOwners[$task->_id] = collect($task->owners)
                        ->map(function ($ownerId) use ($users) {
                            $user = $users->get($ownerId);
                            if ($user) {
                                return [
                                    'id' => $user->_id,
                                    'name' => $user->name,
                                    'profile_picture' => $user->profile_picture
                                ];
                            }
                            return null;
                        })
                        ->filter()
                        ->values()
                        ->all();
                }
            }
        }

        return $taskOwners;
    }

    /**
     * Preload all LedItems in one query
     */
    private function preloadLedItems($taskLists)
    {
        $ledItemIds = collect();

        foreach ($taskLists as $taskList) {
            foreach ($taskList->tasks as $task) {
                if ($task->ledItemId) {
                    $ledItemIds->push($task->ledItemId);
                }
            }
        }

        if ($ledItemIds->isEmpty()) {
            return [];
        }

        return \App\Models\Led\LedItem::whereIn('_id', $ledItemIds)
            ->get(['_id', 'no', 'sub'])
            ->keyBy('_id')
            ->all();
    }

    /**
     * Preload all LkpsTables in one query
     */
    private function preloadLkpsTables($taskLists)
    {
        $lkpsTableIds = collect();

        foreach ($taskLists as $taskList) {
            foreach ($taskList->tasks as $task) {
                if ($task->lkpsTableId) {
                    $lkpsTableIds->push($task->lkpsTableId);
                }
            }
        }

        if ($lkpsTableIds->isEmpty()) {
            return [];
        }

        return \App\Models\Lkps\LkpsTable::whereIn('_id', $lkpsTableIds)
            ->get(['_id', 'kode', 'judul'])
            ->keyBy('_id')
            ->all();
    }

    /**
     * Get task details from preloaded data
     */
    private function getTaskDetails($task, $ledItems, $lkpsTables)
    {
        // Use existing name/no/sub if available
        if ($task->nama && $task->no && $task->sub) {
            return [
                'name' => $task->nama,
                'no' => $task->no,
                'sub' => $task->sub
            ];
        }

        // For LED tasks
        if ($task->ledItemId && isset($ledItems[$task->ledItemId])) {
            $ledItem = $ledItems[$task->ledItemId];
            return [
                'name' => "Butir {$ledItem->no} - {$ledItem->sub}",
                'no' => $ledItem->no,
                'sub' => $ledItem->sub
            ];
        }

        // For LKPS tasks
        if ($task->lkpsTableId && isset($lkpsTables[$task->lkpsTableId])) {
            $lkpsTable = $lkpsTables[$task->lkpsTableId];
            return [
                'name' => "Tabel {$lkpsTable->kode}",
                'no' => $lkpsTable->kode,
                'sub' => 'LKPS'
            ];
        }

        // Default fallback
        return [
            'name' => $task->nama ?: "Task {$task->taskId}",
            'no' => $task->no,
            'sub' => $task->sub
        ];
    }

    /**
     * Format date for output
     */
    private function formatDate($date)
    {
        if (empty($date)) {
            return null;
        }

        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            Log::warning("Failed to parse date '{$date}': " . $e->getMessage());
            return null;
        }
    }

    /**
     * Calculate duration between dates in days
     */
    private function calculateDuration($startDate, $endDate)
    {
        if (empty($startDate) || empty($endDate)) {
            return 0;
        }

        try {
            $carbonStartDate = Carbon::parse($startDate)->startOfDay();
            $carbonEndDate = Carbon::parse($endDate)->startOfDay();

            // Calculate total duration from start to end (including weekends)
            $totalDuration = $carbonStartDate->diffInDays($carbonEndDate) + 1; // +1 to include both start and end dates

            // If you want to exclude weekends, uncomment the following:
            // $totalDuration = $this->calculateWorkingDays($carbonStartDate, $carbonEndDate);

            return max(0, $totalDuration); // Ensure duration is never negative

        } catch (\Exception $e) {
            Log::warning("Failed to calculate duration for dates '{$startDate}' to '{$endDate}': " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Calculate working days between two dates (excluding weekends)
     * Uncomment this if you want to exclude weekends from duration calculation
     */
    private function calculateWorkingDays($startDate, $endDate)
    {
        if ($startDate->gt($endDate)) {
            return 0;
        }

        $workingDays = 0;
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            // Monday = 1, Sunday = 7
            if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) {
                $workingDays++;
            }
            $currentDate->addDay();
        }

        return $workingDays;
    }

    /**
     * Calculate remaining duration for active tasks
     */
    private function calculateRemainingDuration($startDate, $endDate, $status)
    {
        if (empty($startDate) || empty($endDate)) {
            return 0;
        }

        try {
            $carbonStartDate = Carbon::parse($startDate)->startOfDay();
            $carbonEndDate = Carbon::parse($endDate)->startOfDay();
            $today = Carbon::now()->startOfDay();

            // If task hasn't started yet
            if ($today->lt($carbonStartDate)) {
                return $carbonStartDate->diffInDays($carbonEndDate) + 1;
            }

            // If task is in progress or overdue
            if ($today->lte($carbonEndDate)) {
                return $today->diffInDays($carbonEndDate) + 1;
            }

            // If task is overdue
            if ($today->gt($carbonEndDate)) {
                return 0; // or return negative number for overdue days: $carbonEndDate->diffInDays($today) * -1
            }

            return 0;

        } catch (\Exception $e) {
            Log::warning("Failed to calculate remaining duration: " . $e->getMessage());
            return 0;
        }
    }

    protected function canManageMembers($projectId, $userId = null)
    {
        if (!$userId) {
            $userId = auth()->user()->_id;
        }
        return ProjectMember::where('projectId', $projectId)
            ->where('userId', $userId)
            ->whereIn('role', [self::ROLE_OWNER, self::ROLE_ADMIN])
            ->exists();
    }

    public function addMember(Request $request, $projectId)
    {
        try {
            $project = Project::where('_id', $projectId)->firstOrFail();
            $currentUser = auth()->user();

            if (!$this->canManageMembers($project->_id, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You do not have permission to add members to this project'
                ], 403);
            }

            $request->validate([
                'email' => 'required|email|exists:users,email',
                'role' => 'required|in:' . implode(',', $this->availableRoles)
            ]);

            $user = User::where('email', $request->email)->first();
            $addedBy = auth()->user();

            \Log::info('Adding member to project:', [
                'project_id' => $project->_id,
                'user_email' => $user->email,
                'role' => $request->role,
                'added_by' => $addedBy->name
            ]);

            $isMember = ProjectMember::where('projectId', $project->_id)
                ->where('userId', $user->_id)
                ->exists();

            if ($isMember) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User sudah terdaftar di project ini'
                ], 400);
            }

            if ($request->role === self::ROLE_ADMIN && !$this->isOwner($project->_id, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya owner yang dapat menambahkan admin'
                ], 403);
            }

            // Create new project member
            ProjectMember::create([
                'projectId' => $project->_id,
                'userId' => $user->_id,
                'role' => $request->role,
                'joinedAt' => now()
            ]);

            $existingProjects = $user->projects ?? [];
            $updatedProjects = array_merge($existingProjects, [
                [
                    'projectId' => $project->_id,
                    'role' => $request->role
                ]
            ]);
            $user->projects = $updatedProjects;
            $user->save();

            try {
                $user->notify(new ProjectMemberAddedNotification($project, $addedBy));

                $notificationController = new NotificationController();

                $phone = $user->phone_number ?? null;

                if ($phone) {
                    $projectUrl = config('app.url') . '/projects/' . $project->_id;
                    $message = "Hi *{$user->name}*, You've been added to\n\n"
                        . "📂 Project: *{$project->name}*\n"
                        . "👤 Added by: *{$addedBy->name}*\n"
                        . "🔑 Role: *" . ucfirst($request->role) . "*\n"
                        . "📅 Date: *" . now()->format('d M Y') . "*\n"
                        . "📅 End Date: *" . Carbon::parse($project->endDate)->format('d M Y') . "*\n"
                        . "🔗 *Access your project here:*\n"
                        . $projectUrl . "\n\n"
                        . "💡 Click the link above to start.";

                    $notificationController->sendWhatsAppNotification($phone, $message);
                }

                \Log::info('Notifications sent successfully');
            } catch (\Exception $e) {
                \Log::error('Error sending notifications:', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Member berhasil ditambahkan dan notifikasi berhasil dikirim',
                'data' => $project
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in addMember:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error adding member: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateMemberRole(Request $request, $projectId)
    {
        try {
            $project = Project::where('_id', $projectId)->firstOrFail();
            $currentUser = auth()->user();
            if (!$this->canManageMembers($project->_id, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You do not have permission to update member roles in this project'
                ], 403);
            }
            $request->validate([
                'userId' => 'required|exists:users,_id',
                'role' => 'required|in:' . implode(',', $this->availableRoles)
            ]);
            $targetUser = User::find($request->userId);
            if (!$targetUser) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found'
                ], 404);
            }
            $targetMember = ProjectMember::where('projectId', $project->_id)
                ->where('userId', $request->userId)
                ->first();
            if (!$targetMember) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User is not a member of this project'
                ], 400);
            }
            if ($targetMember->role === self::ROLE_OWNER) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot change the role of project owner'
                ], 400);
            }
            if ($request->role === self::ROLE_ADMIN && !$this->isOwner($project->_id, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only project owner can assign admin role'
                ], 403);
            }
            $targetMember->role = $request->role;
            $targetMember->save();
            $userProjects = $targetUser->projects ?? [];
            foreach ($userProjects as $key => $userProject) {
                if ($userProject['projectId'] === $project->_id) {
                    $userProjects[$key]['role'] = $request->role;
                }
            }
            $targetUser->projects = $userProjects;
            $targetUser->save();
            return response()->json([
                'status' => 'success',
                'message' => 'Member role updated successfully',
                'data' => $project
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating member role:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'Error updating member role: ' . $e->getMessage()
            ], 500);
        }
    }

    protected function isOwner($projectId, $userId)
    {
        return ProjectMember::where('projectId', $projectId)
            ->where('userId', $userId)
            ->where('role', self::ROLE_OWNER)
            ->exists();
    }

    public function getMembers($projectId)
    {
        $project = Project::where('_id', $projectId)->firstOrFail();
        $members = ProjectMember::where('projectId', $project->_id)->get();
        $memberDetails = $members->map(function ($member) {
            $user = User::find($member->userId);
            return [
                'userId' => $member->userId,
                'name' => $user->name ?? 'Unknown User',
                'email' => $user->email ?? 'N/A',
                'role' => $member->role,
                'joinedAt' => $member->joinedAt,
                'profile_picture' => $user->profile_picture ?? 'default_picture.jpg',
            ];
        });
        $membersByRole = [
            'owner' => $memberDetails->where('role', self::ROLE_OWNER)->values(),
            'admin' => $memberDetails->where('role', self::ROLE_ADMIN)->values(),
            'user' => $memberDetails->where('role', self::ROLE_USER)->values(),
        ];
        return response()->json([
            'status' => 'success',
            'data' => [
                'projectId' => $project->projectId,
                'projectName' => $project->name,
                'memberCount' => $members->count(),
                'members' => $memberDetails,
                'membersByRole' => $membersByRole
            ]
        ]);
    }

    public function projectsWithOwners()
    {
        $projects = Project::orderBy('created_at', 'desc')->get();
        $projectsWithOwner = $projects->map(function ($project) {
            $owner = ProjectMember::where('projectId', $project->_id)
                ->where('role', self::ROLE_OWNER)
                ->first();
            $ownerUser = null;
            if ($owner) {
                $ownerUser = User::find($owner->userId);
            }
            return array_merge($project->toArray(), [
                'owner' => $ownerUser ? [
                    'userId' => $ownerUser->_id,
                    'name' => $ownerUser->name,
                    'profile_picture' => $ownerUser->profile_picture
                ] : null
            ]);
        });
        return response()->json([
            'status' => 'success',
            'data' => $projectsWithOwner
        ]);
    }

    public function update(Request $request, $projectId)
    {
        $project = Project::where('projectId', $projectId)->firstOrFail();

        $currentUser = auth()->user();
        if (!$this->canManageMembers($project, $currentUser->_id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You do not have permission to update this project'
            ], 403);
        }

        $request->validate([
            'name' => 'string|max:255',
            'description' => 'string',
            'status' => 'in:ACTIVE',
            'startDate' => 'date',
            'endDate' => 'date|after:startDate'
        ]);

        if ($request->endDate && $request->endDate !== $project->endDate) {
            $otherActiveProject = Project::where('prodiId', $project->prodiId)
                ->where('_id', '!=', $project->_id)
                ->where('endDate', '>', now())
                ->exists();

            if ($otherActiveProject) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot update end date: Prodi already has another active project'
                ], 400);
            }
        }

        $project->update([
            'name' => $request->name ?? $project->name,
            'status' => $request->status ?? $project->status,
            'startDate' => $request->startDate ? new Carbon($request->startDate) : $project->startDate,
            'endDate' => $request->endDate ? new Carbon($request->endDate) : $project->endDate,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Project updated successfully',
            'data' => $project
        ]);
    }

    public function removeMember(Request $request, $projectId)
    {
        $request->validate([
            'userId' => 'required|exists:users,_id'
        ]);
        $project = Project::where('_id', $projectId)->firstOrFail();
        $currentUser = auth()->user();
        if (!$this->canManageMembers($project->_id, $currentUser->_id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You do not have permission to remove members from this project'
            ], 403);
        }
        $member = ProjectMember::where('projectId', $project->_id)
            ->where('userId', $request->userId)
            ->first();
        if (!$member) {
            return response()->json([
                'status' => 'error',
                'message' => 'User is not a member of this project'
            ], 400);
        }
        if ($member->role === self::ROLE_OWNER) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot remove project owner'
            ], 400);
        }
        if ($member->role === self::ROLE_ADMIN && !$this->isOwner($project->_id, $currentUser->_id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only project owner can remove admin members'
            ], 403);
        }
        $member->delete();
        $user = User::find($request->userId);
        if ($user && isset($user->projects)) {
            $updatedProjects = collect($user->projects)
                ->reject(function ($userProject) use ($project) {
                    return $userProject['projectId'] === $project->_id;
                })
                ->toArray();
            $user->projects = $updatedProjects;
            $user->save();
        }
        return response()->json([
            'status' => 'success',
            'message' => 'Member removed successfully',
            'data' => $project
        ]);
    }

    public function destroy($projectId)
    {
        $project = Project::where('projectId', $projectId)->firstOrFail();
        $currentUserId = auth()->user()->_id;
        if (!$this->isOwner($project->_id, $currentUserId)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only project owner can delete the project'
            ], 403);
        }
        $members = ProjectMember::where('projectId', $project->_id)->get();
        foreach ($members as $member) {
            $user = User::find($member->userId);
            if ($user && isset($user->projects)) {
                $updatedProjects = collect($user->projects)
                    ->reject(function ($userProject) use ($project) {
                        return $userProject['projectId'] === $project->_id;
                    })
                    ->toArray();
                $user->projects = $updatedProjects;
                $user->save();
            }
        }
        ProjectMember::where('projectId', $project->_id)->delete();
        $project->tasklists()->delete();
        $project->tasks()->delete();
        $project->delete();
        return response()->json([
            'status' => 'success',
            'message' => 'Project deleted successfully'
        ]);
    }

    public function getProjectStatistics($projectId)
    {
        $project = Project::where('projectId', $projectId)->firstOrFail();
        $taskStats = $project->tasks()
            ->get()
            ->groupBy('status')
            ->map(function ($tasks) {
                return count($tasks);
            });
        $memberCount = ProjectMember::where('projectId', $project->_id)->count();
        $taskListCount = $project->tasklists()->count();
        $totalTasks = $project->tasks()->count();
        $completedTasks = $taskStats['COMPLETED'] ?? 0;
        $progress = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;
        $memberStats = ProjectMember::where('projectId', $project->_id)
            ->get()
            ->groupBy('role')
            ->map(function ($members) {
                return count($members);
            })
            ->toArray();
        return response()->json([
            'status' => 'success',
            'data' => [
                'memberCount' => $memberCount,
                'memberStats' => $memberStats,
                'taskListCount' => $taskListCount,
                'taskStats' => $taskStats,
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'progress' => round($progress, 2)
            ]
        ]);
    }

    public function getAvailableRoles()
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'roles' => [
                    [
                        'id' => 'admin',
                        'name' => 'Admin',
                        'description' => 'Can manage project members and tasks'
                    ],
                    [
                        'id' => 'user',
                        'name' => 'User',
                        'description' => 'Can work on assigned tasks'
                    ]
                ]
            ]
        ]);
    }

    private function populateTaskDetails($task)
    {
        if ($task->nama && $task->no && $task->sub) {
            return;
        }

        if ($task->ledItemId) {
            $ledItem = \App\Models\Led\LedItem::find($task->ledItemId);
            if ($ledItem) {
                $task->no = $ledItem->no;
                $task->sub = $ledItem->sub;
                $task->nama = "Butir {$ledItem->no} - {$ledItem->sub}";
            }
        }

        if ($task->lkpsTableId) {
            $lkpsTable = \App\Models\Lkps\LkpsTable::find($task->lkpsTableId);
            if ($lkpsTable) {
                $task->no = $lkpsTable->kode;
                $task->sub = "LKPS";
                $task->nama = "Tabel - {$lkpsTable->kode}}";
            }
        }

        if (!$task->nama) {
            $task->nama = "Task " . $task->_id;
        }
    }
}
