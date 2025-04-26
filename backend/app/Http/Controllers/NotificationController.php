<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\GeneralNotification;
use Illuminate\Http\Request;
use App\Notifications\TestNotification;
use App\Models\DatabaseNotification;
use App\Models\Project;

class NotificationController extends Controller
{
    public function index()
    {
        try {
            $user = auth()->user();

            $notifications = DatabaseNotification::where('notifiable_id', $user->_id)
                ->orderBy('created_at', 'desc')
                ->get();

            $notificationsWithProjectId = $notifications->map(function ($notification) {
                $notificationArray = $notification->toArray();

                $projectObjectId = null;

                if (isset($notificationArray['data']['project']['_id'])) {
                    $projectObjectId = $notificationArray['data']['project']['_id'];
                } elseif (isset($notificationArray['data']['project_id'])) {
                    $projectObjectId = $notificationArray['data']['project_id'];
                }

                $projectStringId = null;
                if (!$projectObjectId) {
                    $projectStringId = $notificationArray['data']['project']['id'] ??
                        $notificationArray['data']['project']['projectId'] ??
                        $notificationArray['data']['projectId'] ?? null;
                }

                \Log::debug('Processing notification', [
                    'notification_id' => $notification->id,
                    'project_object_id' => $projectObjectId,
                    'project_string_id' => $projectStringId
                ]);

                if ($projectObjectId || $projectStringId) {
                    $projectQuery = Project::query();

                    if ($projectObjectId) {
                        $projectQuery->where('_id', $projectObjectId);
                    } else {
                        $projectQuery->where('projectId', $projectStringId);

                        if (isset($notificationArray['data']['project']['name'])) {
                            $projectQuery->where('name', $notificationArray['data']['project']['name']);
                        }
                    }

                    $project = $projectQuery->first();

                    if ($project) {
                        $notificationArray['data']['project']['_id'] = $project->_id; // MongoDB ObjectId
                        $notificationArray['data']['project']['id'] = $project->projectId; // String ID
                        $notificationArray['data']['project']['name'] = $project->name;

                        \Log::debug('Project found and updated in notification', [
                            'notification_id' => $notification->id,
                            'project_id' => $project->_id
                        ]);

                        return (object) $notificationArray;
                    } else {
                        \Log::warning('Project not found for notification', [
                            'project_string_id' => $projectStringId,
                            'project_object_id' => $projectObjectId,
                            'notification_id' => $notification->id
                        ]);
                    }
                }

                return $notification;
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'notifications' => $notificationsWithProjectId,
                    'unread_count' => DatabaseNotification::where('notifiable_id', $user->_id)
                        ->whereNull('read_at')
                        ->count()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error getting notifications: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error getting notifications: ' . $e->getMessage()
            ], 500);
        }
    }


    public function markAsRead($id)
    {
        $notification = auth()->user()
            ->notifications()
            ->where('_id', $id)
            ->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead()
    {
        DatabaseNotification::where('notifiable_id', auth()->user()->_id)
            ->where('read_at', null)
            ->update(['read_at' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read'
        ]);
    }

    public function sendWhatsAppNotification($phone, $message)
    {
        $token = "ZkK0zVOscvjh06bDeGopbr7QFgqeRWGFCf2DUFJfUJZ3qvsrqUqGdEJ";
        $secret = "QHksVMKw";

        $curl = curl_init();

        $data = [
            'phone' => $phone,
            'message' => $message
        ];

        curl_setopt_array($curl, [
            CURLOPT_URL => "https://bdg.wablas.com/api/send-message",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => http_build_query($data),
            CURLOPT_HTTPHEADER => ["Authorization: $token.$secret"],
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0
        ]);

        $response = curl_exec($curl);
        curl_close($curl);

        return json_decode($response, true);
    }

    public function sendProjectAddedNotification($user, $project, $addedBy)
    {
        DatabaseNotification::create([
            'type' => 'App\Notifications\ProjectMemberAddedNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->_id,
            'data' => [
                'title' => 'Added to Project',
                'message' => "You have been added to project '{$project->name}' by {$addedBy->name}",
                'type' => 'project_invitation',
                'projectId' => $project->_id,
                'project' => ['id' => $project->projectId, 'name' => $project->name],
                'added_by' => ['id' => $addedBy->_id, 'name' => $addedBy->name]
            ],
            'read_at' => null
        ]);

        $message = "You have been added to project '{$project->name}' by {$addedBy->name}";
        $this->sendWhatsAppNotification("6287846667722", $message);
    }

    public function markProjectInviteAsAccepted($notificationId)
    {
        $notification = auth()->user()
            ->notifications()
            ->where('_id', $notificationId)
            ->first();

        if ($notification && $notification->data['type'] === 'project_invitation') {
            $notification->markAsRead();

            return response()->json([
                'status' => 'success',
                'message' => 'Project invitation accepted'
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Notification not found or invalid type'
        ], 404);
    }
}