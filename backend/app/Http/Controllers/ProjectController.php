<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskList;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use App\Services\ProjectTemplateService;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::with(['tasklists', 'tasks'])
            ->orderBy('createdAt', 'desc')  // Diubah dari metadata.createdAt
            ->paginate(10);

        return response()->json([
            'status' => 'success',
            'data' => $projects
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after:startDate',
        ]);

        $lastProject = Project::orderBy('created_at', 'desc')->first();
        $projectId = $lastProject
            ? 'PRJ-' . str_pad((intval(substr($lastProject->projectId, 4)) + 1), 3, '0', STR_PAD_LEFT)
            : 'PRJ-001';

        $project = Project::create([
            'projectId' => $projectId,
            'name' => $request->name,
            'progress' => false,
            'status' => 'ACTIVE',
            'startDate' => $request->startDate,
            'endDate' => $request->endDate,
            'createdBy' => auth()->user()->_id,
            'members' => [
                [
                    'userId' => auth()->user()->_id,
                    'role' => 'owner',
                    'joinedAt' => now()
                ]
            ]
        ]);

        $user = User::find(auth()->user()->_id);
        $existingProjects = $user->projects ?? [];
        $updatedProjects = array_merge($existingProjects, [
            [
                'projectId' => $project->projectId,
                'role' => 'owner'
            ]
        ]);
        $user->projects = $updatedProjects;
        $user->save();

        ProjectTemplateService::createDefaultStructure($project->_id);

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

    public function getProjectTaskLists($projectId)
    {
        try {
            $project = Project::where('id', $projectId)->first();

            if (!$project) {
                $project = Project::find($projectId);

                if (!$project) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Project not found'
                    ], 404);
                }
            }

            $taskLists = TaskList::where('projectId', $project->_id)
                ->with([
                    'tasks' => function ($query) {
                        $query->orderBy('order', 'asc')
                            ->with('user');
                    }
                ])
                ->orderBy('order', 'asc')
                ->get()
                ->map(function ($taskList) {
                    return [
                        'id' => $taskList->_id,
                        'name' => $taskList->name,
                        'order' => $taskList->order,
                        'tasks' => $taskList->tasks->map(function ($task) {
                            $startDate = new Carbon($task->startDate);
                            $endDate = new Carbon($task->endDate);
                            $today = Carbon::now()->startOfDay();

                            $duration = 0;
                            if ($today->lt($startDate)) {
                                $duration = $startDate->diffInDays($endDate);
                            } else if ($today->lte($endDate)) {
                                // Task is in progress
                                $duration = $today->diffInDays($endDate);
                            }
        
                            $ownerData = null;
                            if ($task->user) {
                                $ownerData = [
                                    'id' => $task->user->_id,
                                    'name' => $task->user->name,
                                    'profile_picture' => $task->user->profile_picture ?? null
                                ];
                            }

                            return [
                                'id' => $task->_id,
                                'taskId' => $task->taskId,
                                'name' => $task->name,
                                'status' => $task->status,
                                'progress' => $task->progress,
                                'startDate' => $startDate->format('Y-m-d'),
                                'endDate' => $endDate->format('Y-m-d'),
                                'duration' => (int) $duration,
                                'order' => $task->order,
                                'taskListId' => $task->taskListId,
                                'owner' => $ownerData
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
                    return $taskList['tasks']->where('status', 'COMPLETED')->count();
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

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error retrieving project task lists: ' . $e->getMessage()
            ], 500);
        }
    }

    public function addMember(Request $request, $projectId)
    {
        $project = Project::where('id', $projectId)->firstOrFail();

        $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => 'required|in:user,read-only user'
        ]);

        $user = User::where('email', $request->email)->first();

        $isMember = collect($project->members)
            ->where('userId', $user->_id)
            ->first();

        if ($isMember) {
            return response()->json([
                'status' => 'error',
                'message' => 'User is already a member of this project'
            ], 400);
        }

        $project->push('members', [
            'userId' => $user->_id,
            'role' => $request->role,
            'joinedAt' => now()
        ]);

        $existingProjects = $user->projects ?? [];
        $updatedProjects = array_merge($existingProjects, [
            [
                'projectId' => $project->projectId,
                'role' => $request->role
            ]
        ]);
        $user->projects = $updatedProjects;
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Member added successfully',
            'data' => $project
        ]);
    }

    public function getMembers($projectId)
    {
        $project = Project::where('id', $projectId)->firstOrFail();

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

        return response()->json([
            'status' => 'success',
            'data' => [
                'projectId' => $project->projectId,
                'projectName' => $project->name,
                'memberCount' => count($project->members),
                'members' => $memberDetails
            ]
        ]);
    }

    public function update(Request $request, $projectId)
    {
        $project = Project::where('projectId', $projectId)->firstOrFail();

        $request->validate([
            'name' => 'string|max:255',
            'description' => 'string',
            'status' => 'in:ACTIVE,ARCHIVED,COMPLETED',
            'startDate' => 'date',
            'endDate' => 'date|after:startDate'
        ]);

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

        $project = Project::where('projectId', $projectId)->firstOrFail();

        $member = collect($project->members)
            ->where('userId', $request->userId)
            ->first();

        if (!$member) {
            return response()->json([
                'status' => 'error',
                'message' => 'User is not a member of this project'
            ], 400);
        }

        if ($member['role'] === 'OWNER') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot remove project owner'
            ], 400);
        }

        $project->pull('members', ['userId' => $request->userId]);
        $project->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Member removed successfully',
            'data' => $project
        ]);
    }

    public function destroy($projectId)
    {
        $project = Project::where('projectId', $projectId)->firstOrFail();

        $isOwner = collect($project->members)
            ->where('userId', auth()->user()->_id)
            ->where('role', 'OWNER')
            ->first();

        if (!$isOwner) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only project owner can delete the project'
            ], 403);
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

        return response()->json([
            'status' => 'success',
            'data' => [
                'memberCount' => $memberCount,
                'taskListCount' => $taskListCount,
                'taskStats' => $taskStats,
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'progress' => round($progress, 2)
            ]
        ]);
    }
}