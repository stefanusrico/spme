<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Prodi;
use App\Models\User;
use App\Http\Controllers\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use App\Services\ProjectTemplateService;
use App\Notifications\ProjectMemberAddedNotification;

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
            $owner = collect($project->members)
                ->where('role', self::ROLE_OWNER)
                ->first();

            $ownerUser = null;
            if ($owner) {
                $ownerUser = User::find($owner['userId']);
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

        if (!Project::canCreateNewProject($prodiModel->_id)) {
            $existingProject = Project::where('prodiId', $prodiModel->_id)
                ->where('status', 'ACTIVE')
                ->where('endDate', '>', now())
                ->first();

            return response()->json([
                'status' => 'error',
                'message' => 'Prodi sudah memiliki project aktif. Tanggal selesai: ' .
                    Carbon::parse($existingProject->endDate)->format('d M Y'),
            ], 400);
        }

        $lastProdiProject = Project::where('prodiId', $prodiModel->_id)
            ->orderBy('created_at', 'desc')
            ->first();

        $projectId = $lastProdiProject
            ? 'PRJ-' . str_pad((intval(substr($lastProdiProject->projectId, 4)) + 1), 3, '0', STR_PAD_LEFT)
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
            'members' => [
                [
                    'userId' => $user->_id,
                    'role' => self::ROLE_OWNER,
                    'joinedAt' => now()
                ]
            ]
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
            $project = Project::where('_id', $projectId)
                ->with(['prodi', 'tasks'])
                ->firstOrFail();

            $allTasks = $project->tasks;

            $tasksByStatus = ['ACTIVE' => [], 'COMPLETED' => [], 'UNASSIGNED' => [], 'CANCELLED' => []];
            $overdueTasksList = [];
            $todaysTasksList = [];
            $taskCountsPerMember = [];
            $weeklyCompleted = array_fill(0, 7, 0);
            $weeklyActive = array_fill(0, 7, 0);

            $today = Carbon::today()->startOfDay();
            $sevenDaysAgo = $today->copy()->subDays(6);

            foreach ($allTasks as $task) {
                $taskOwnersDetails = collect();
                $currentTaskOwnerIds = [];

                if (isset($task->owners) && is_array($task->owners)) {
                    foreach ($task->owners as $ownerId) {
                        $user = User::select('_id', 'name', 'profile_picture')->find($ownerId);

                        if ($user) {
                            $userId = $user->_id;

                            $taskOwnersDetails->push([
                                'id' => $userId,
                                'name' => $user->name,
                                'profile_picture' => $user->profile_picture
                            ]);
                            $currentTaskOwnerIds[] = (string) $userId;

                            if ($task->status !== 'COMPLETED' && $task->status !== 'CANCELLED') {
                                $key = (string) $userId;
                                if (!isset($taskCountsPerMember[$key])) {
                                    $taskCountsPerMember[$key] = 0;
                                }
                                $taskCountsPerMember[$key]++;
                            }
                        } else {
                            Log::warning("User not found for owner ID: {$ownerId} in task ID: {$task->_id}");
                        }
                    }
                }

                $formattedTask = [
                    'id' => $task->_id,
                    'taskId' => $task->taskId,
                    'no' => $task->no,
                    'sub' => $task->sub,
                    'name' => $task->name ?? "Butir {$task->no} - {$task->sub}",
                    'status' => $task->status,
                    'progress' => $task->progress,
                    'owners' => $taskOwnersDetails->values()->all(),
                    'startDate' => $task->startDate ? Carbon::parse($task->startDate)->toDateString() : null,
                    'endDate' => $task->endDate ? Carbon::parse($task->endDate)->toDateString() : null,
                ];

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
                    Log::warning("Invalid date format for weekly trend task {$task->_id}");
                }
            }

            $memberIds = collect($project->members ?? [])->pluck('userId')->filter()->unique()->all();
            $membersInfo = [];
            if (!empty($memberIds)) {
                $membersInfo = User::whereIn('_id', $memberIds)
                    ->select('_id', 'name', 'profile_picture')
                    ->get()->keyBy('_id');
            }

            $resourceAllocation = collect($project->members ?? [])->map(function ($memberData) use ($membersInfo, $taskCountsPerMember, $project) {
                $userId = $memberData['userId'] ?? null;
                if (!$userId)
                    return null;

                $userInfo = $membersInfo->get($userId);
                $taskCount = $taskCountsPerMember[(string) $userId] ?? 0;

                if (!$userInfo) {
                    return [
                        'userId' => $userId,
                        'name' => 'Unknown User',
                        'profile_picture' => null,
                        'role' => $memberData['role'] ?? 'Unknown',
                        'taskCount' => $taskCount,
                    ];
                }

                return [
                    'userId' => $userInfo->_id,
                    'name' => $userInfo->name,
                    'profile_picture' => $userInfo->profile_picture,
                    'role' => $memberData['role'],
                    'taskCount' => $taskCount,
                ];
            })->filter()->values();

            $dayLabels = [];
            $currentDate = $today->copy();
            for ($i = 0; $i < 7; $i++) {
                $dayLabels[] = $currentDate->copy()->subDays(6 - $i)->format('D');
            }
            $weeklyTrends = [
                'labels' => $dayLabels,
                'datasets' => [
                    ['label' => 'Completed Tasks', 'data' => array_reverse($weeklyCompleted), 'backgroundColor' => '#4ade80', 'borderColor' => '#16a34a'],
                    ['label' => 'Active Tasks', 'data' => array_reverse($weeklyActive), 'backgroundColor' => '#38bdf8', 'borderColor' => '#0284c7']
                ]
            ];

            $statistics = [
                'totalTasks' => $allTasks->count(),
                'completedTasks' => $allTasks->where('status', 'COMPLETED')->count(),
                'activeTasks' => $allTasks->where('status', 'ACTIVE')->count(),
                'unassignedTasks' => $allTasks->where('status', 'UNASSIGNED')->count(),
                'overdueTasks' => count($overdueTasksList),
                'tasksDueToday' => count($todaysTasksList),
                'cancelledTasks' => $allTasks->where('status', 'CANCELLED')->count()
            ];

            $prodiName = $project->prodi->name ?? 'Unknown';

            return response()->json([
                'status' => 'success',
                'data' => [
                    'projectId' => $project->projectId,
                    'projectName' => $project->name,
                    'prodiName' => $prodiName,
                    'prodiId' => $project->prodiId,
                    'createdAt' => $project->created_at,
                    'startDate' => $project->startDate ? Carbon::parse($project->startDate)->toDateString() : null,
                    'endDate' => $project->endDate ? Carbon::parse($project->endDate)->toDateString() : null,
                    'statistics' => $statistics,
                    'tasks' => $tasksByStatus,
                    'todaysTasks' => array_slice($todaysTasksList, 0, 5),
                    'overdueTasks' => array_slice($overdueTasksList, 0, 5),
                    'weeklyTrends' => $weeklyTrends,
                    'resourceAllocation' => $resourceAllocation,
                ]
            ]);

        } catch (ModelNotFoundException $e) {
            Log::warning('Project not found:', ['projectId' => $projectId, 'error' => $e->getMessage()]);
            return response()->json(['status' => 'error', 'message' => 'Project not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error retrieving project details:', ['error' => $e->getMessage(), 'projectId' => $projectId, 'trace' => $e->getTraceAsString()]);
            $message = config('app.debug') ? 'Error retrieving project details: ' . $e->getMessage() : 'An error occurred.';
            return response()->json(['status' => 'error', 'message' => $message], 500);
        }
    }

    public function getProjectDetailsByProdi($prodiId)
    {
        try {
            $project = Project::where('prodiId', $prodiId)
                ->with([
                    'prodi',
                    'tasks' => function ($query) {
                        $query->with('users')
                            ->whereIn('status', ['ACTIVE', 'UNASSIGNED']);
                    }
                ])
                ->first();

            if (!$project) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Project not found for given prodiId'
                ], 404);
            }

            $sortedTasks = $project->tasks->sortBy([
                ['no', 'asc'],
                ['sub', 'asc']
            ])->values();

            $tasks = $sortedTasks->map(function ($task) {
                return [
                    'id' => $task->_id,
                    'taskId' => $task->taskId,
                    'no' => $task->no,
                    'sub' => $task->sub,
                    'name' => "Butir {$task->no} - {$task->sub}",
                    'progress' => $task->progress,
                    'owners' => $task->users->map(function ($user) {
                        return [
                            'id' => $user->_id,
                            'name' => $user->name,
                            'profile_picture' => $user->profile_picture
                        ];
                    }),
                    'startDate' => $task->startDate,
                    'endDate' => $task->endDate
                ];
            })->toArray();

            $statistics = [
                'totalTasks' => count($tasks)
            ];

            return response()->json([
                'status' => 'success',
                'data' => [
                    'projectId' => $project->_id,
                    'projectName' => $project->name,
                    'prodiName' => $project->prodi->name ?? 'Unknown',
                    'prodiId' => $project->prodiId,
                    'createdAt' => $project->created_at,
                    'statistics' => $statistics,
                    'tasks' => $tasks
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
            $project = Project::where('_id', $projectId)->firstOrFail();

            $taskLists = TaskList::where('projectId', $project->_id)
                ->with([
                    'tasks' => function ($query) {
                        $query->orderBy('order', 'asc')->with('users:_id,name,profile_picture');
                    }
                ])
                ->orderBy('order', 'asc')
                ->get()
                ->map(function ($taskList) {
                    $listName = $taskList->name ?? "Kriteria {$taskList->c}";

                    return [
                        'id' => $taskList->_id,
                        'c' => $taskList->c,
                        'name' => $listName,
                        'order' => $taskList->order,
                        'tasks' => $taskList->tasks->map(function ($task) {
                            $carbonStartDate = null;
                            $formattedStartDate = null;
                            $carbonEndDate = null;
                            $formattedEndDate = null;
                            $duration = 0;

                            if (!empty($task->startDate)) {
                                try {
                                    $carbonStartDate = Carbon::parse($task->startDate);
                                    $formattedStartDate = $carbonStartDate->format('Y-m-d');
                                } catch (\Exception $e) {
                                    Log::warning("Failed to parse startDate '{$task->startDate}' for task ID {$task->_id}: " . $e->getMessage());
                                }
                            }

                            if (!empty($task->endDate)) {
                                try {
                                    $carbonEndDate = Carbon::parse($task->endDate);
                                    $formattedEndDate = $carbonEndDate->format('Y-m-d');
                                } catch (\Exception $e) {
                                    Log::warning("Failed to parse endDate '{$task->endDate}' for task ID {$task->_id}: " . $e->getMessage());
                                }
                            }

                            if ($carbonStartDate && $carbonEndDate) {
                                $today = Carbon::now()->startOfDay();
                                if ($today->lt($carbonStartDate)) {
                                    $duration = $carbonStartDate->diffInDays($carbonEndDate);
                                } else if ($today->lte($carbonEndDate)) {
                                    $duration = $today->diffInDays($carbonEndDate);
                                }
                                $duration = max(0, $duration);
                            }

                            $owners = collect();
                            if (isset($task->owners) && is_array($task->owners)) {
                                $owners = collect($task->owners)->map(function ($ownerId) use ($task) {
                                    if (empty($ownerId))
                                        return null;

                                    $user = User::select('_id', 'name', 'profile_picture')->find($ownerId);
                                    if ($user) {
                                        return [
                                            'id' => $user->_id,
                                            'name' => $user->name,
                                            'profile_picture' => $user->profile_picture
                                        ];
                                    } else {
                                        Log::warning("User not found for owner ID: {$ownerId} in task ID: {$task->_id} during TaskList generation.");
                                        return null;
                                    }
                                })->filter();
                            }

                            return [
                                'id' => $task->_id,
                                'taskId' => $task->taskId,
                                'no' => $task->no,
                                'sub' => $task->sub,
                                'name' => $task->name,
                                'status' => $task->status,
                                'progress' => $task->progress,
                                'startDate' => $formattedStartDate,
                                'endDate' => $formattedEndDate,
                                'duration' => (int) $duration,
                                'order' => $task->order,
                                'taskListId' => $task->taskListId,
                                'owners' => $owners->values()->all()
                            ];
                        })
                    ];
                });

            $statistics = [
                'totalTaskLists' => $taskLists->count(),
                'totalTasks' => $taskLists->sum(function ($taskList) {
                    return $taskList['tasks']->count();
                }),
                'completedTasks' => $taskLists->sum(function ($taskList) {
                    return collect($taskList['tasks'])->where('status', 'COMPLETED')->count();
                }),
                'inProgressTasks' => $taskLists->sum(function ($taskList) {
                    return collect($taskList['tasks'])->where('status', 'ACTIVE')->count();
                }),
                'notStartedTasks' => $taskLists->sum(function ($taskList) {
                    return collect($taskList['tasks'])->where('status', 'UNASSIGNED')->count();
                }),
            ];

            return response()->json([
                'status' => 'success',
                'data' => [
                    'projectId' => $project->projectId,
                    'projectName' => $project->name,
                    'taskLists' => $taskLists,
                    'statistics' => $statistics
                ]
            ]);

        } catch (ModelNotFoundException $e) {
            Log::warning("Project not found for TaskLists:", ['projectId' => $projectId, 'error' => $e->getMessage()]);
            return response()->json(['status' => 'error', 'message' => 'Project not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error retrieving project task lists:', [
                'error' => $e->getMessage(),
                'projectId' => $projectId,
                'trace' => $e->getTraceAsString()
            ]);
            $message = config('app.debug') ? 'Error retrieving project task lists: ' . $e->getMessage() : 'An error occurred.';
            return response()->json(['status' => 'error', 'message' => $message], 500);
        }
    }

    protected function canManageMembers($project, $userId = null)
    {
        if (!$userId) {
            $userId = auth()->user()->_id;
        }

        $member = collect($project->members)
            ->where('userId', $userId)
            ->first();

        if (!$member) {
            return false;
        }

        return in_array($member['role'], [self::ROLE_OWNER, self::ROLE_ADMIN]);
    }

    public function addMember(Request $request, $projectId)
    {
        try {
            $project = Project::where('_id', $projectId)->firstOrFail();
            $currentUser = auth()->user();

            if (!$this->canManageMembers($project, $currentUser->_id)) {
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

            $isMember = collect($project->members)
                ->where('userId', $user->_id)
                ->first();

            if ($isMember) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User sudah terdaftar di project ini'
                ], 400);
            }

            if ($request->role === self::ROLE_ADMIN && !$this->isOwner($project, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya owner yang dapat menambahkan admin'
                ], 403);
            }

            $project->push('members', [
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

            if (!$this->canManageMembers($project, $currentUser->_id)) {
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

            $targetMember = collect($project->members)
                ->where('userId', $request->userId)
                ->first();

            if (!$targetMember) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User is not a member of this project'
                ], 400);
            }

            if ($targetMember['role'] === self::ROLE_OWNER) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot change the role of project owner'
                ], 400);
            }

            if ($request->role === self::ROLE_ADMIN && !$this->isOwner($project, $currentUser->_id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only project owner can assign admin role'
                ], 403);
            }

            Project::where('_id', $project->_id)
                ->update([
                    'members.$[elem].role' => $request->role
                ], [
                    'arrayFilters' => [
                        ['elem.userId' => $request->userId]
                    ]
                ]);

            $userProjects = $targetUser->projects ?? [];
            foreach ($userProjects as $key => $userProject) {
                if ($userProject['projectId'] === $project->projectId) {
                    $userProjects[$key]['role'] = $request->role;
                }
            }
            $targetUser->projects = $userProjects;
            $targetUser->save();

            $project = Project::find($project->_id);

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

    protected function isOwner($project, $userId)
    {
        $member = collect($project->members)
            ->where('userId', $userId)
            ->first();

        if (!$member) {
            return false;
        }

        return $member['role'] === self::ROLE_OWNER;
    }

    public function getMembers($projectId)
    {
        $project = Project::where('_id', $projectId)->firstOrFail();

        $memberDetails = collect($project->members)->map(function ($member) {
            $user = User::find($member['userId']);
            return [
                'userId' => $member['userId'],
                'name' => $user->name ?? 'Unknown User',
                'email' => $user->email ?? 'N/A',
                'role' => $member['role'],
                'joinedAt' => $member['joinedAt'],
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
                'memberCount' => count($project->members),
                'members' => $memberDetails,
                'membersByRole' => $membersByRole
            ]
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

        if (!$this->canManageMembers($project, $currentUser->_id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You do not have permission to remove members from this project'
            ], 403);
        }

        $member = collect($project->members)
            ->where('userId', $request->userId)
            ->first();

        if (!$member) {
            return response()->json([
                'status' => 'error',
                'message' => 'User is not a member of this project'
            ], 400);
        }

        if ($member['role'] === self::ROLE_OWNER) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot remove project owner'
            ], 400);
        }

        if ($member['role'] === self::ROLE_ADMIN && !$this->isOwner($project, $currentUser->_id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only project owner can remove admin members'
            ], 403);
        }

        $project->pull('members', ['userId' => $request->userId]);
        $project->save();

        $user = User::find($request->userId);
        if ($user && isset($user->projects)) {
            $updatedProjects = collect($user->projects)
                ->reject(function ($userProject) use ($project) {
                    return $userProject['projectId'] === $project->id;
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

        if (!$this->isOwner($project, $currentUserId)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only project owner can delete the project'
            ], 403);
        }

        foreach ($project->members as $member) {
            $user = User::find($member['userId']);
            if ($user && isset($user->projects)) {
                $updatedProjects = collect($user->projects)
                    ->reject(function ($userProject) use ($project) {
                        return $userProject['projectId'] === $project->projectId;
                    })
                    ->toArray();

                $user->projects = $updatedProjects;
                $user->save();
            }
        }

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

        $memberCount = count($project->members);
        $taskListCount = $project->tasklists()->count();
        $totalTasks = $project->tasks()->count();
        $completedTasks = $taskStats['COMPLETED'] ?? 0;
        $progress = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;

        $memberStats = collect($project->members)
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
}