<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Http\Controllers\NotificationController;

class TaskAssignedNotification extends Notification
{
  use Queueable;

  protected $task;
  protected $project;
  protected $assignedBy;

  public function __construct($task, $project, $assignedBy)
  {
    $this->task = $task;
    $this->project = $project;
    $this->assignedBy = $assignedBy;
  }

  public function via($notifiable)
  {
    return ['database'];
  }

  public function toArray($notifiable)
  {
    return [
      'title' => 'Assigned to Task',
      'message' => "You have been assigned to task '{$this->task->no} - {$this->task->sub}' in project '{$this->project->name}' by {$this->assignedBy->name}",
      'type' => 'task_assignment',
      'task_id' => $this->task->_id,
      'project_id' => $this->project->projectId,
      'assigned_by' => [
        'id' => $this->assignedBy->_id,
        'name' => $this->assignedBy->name,
        'profile_picture' => $this->assignedBy->profile_picture
      ],
      'project' => [
        'id' => $this->project->projectId,
        'name' => $this->project->name
      ],
      'task' => [
        'id' => $this->task->_id,
        'no' => $this->task->no,
        'sub' => $this->task->sub,
        'start_date' => $this->task->startDate,
        'end_date' => $this->task->endDate
      ]
    ];
  }
}