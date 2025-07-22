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
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        $projectUrl = config('app.url') . '/projects/' . $this->project->_id;
        $dueDate = \Carbon\Carbon::parse($this->task->endDate)->format('d M Y');

        return (new MailMessage)
            ->subject('New Task Assignment: ' . $this->task->sub)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('You have been assigned to a new task.')
            ->line('**Task Details:**')
            ->line('• Task: ' . $this->task->no . ' - ' . $this->task->sub)
            ->line('• Project: ' . $this->project->name)
            ->line('• Assigned by: ' . $this->assignedBy->name)
            ->line('• Due Date: ' . $dueDate)
            ->action('View Task', $projectUrl)
            ->line('Please complete this task before the due date.')
            ->line('Thank you!');
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Assigned to Task',
            'message' => "You have been assigned to task '{$this->task->no} - {$this->task->sub}' in project '{$this->project->name}' by {$this->assignedBy->name}",
            'type' => 'task_assignment',
            'taskId' => $this->task->_id,
            'projectId' => $this->project->_id,
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
