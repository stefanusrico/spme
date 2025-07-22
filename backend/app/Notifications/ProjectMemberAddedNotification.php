<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Http\Controllers\NotificationController;

class ProjectMemberAddedNotification extends Notification
{
    use Queueable;

    protected $project;
    protected $addedBy;

    public function __construct($project, $addedBy)
    {
        $this->project = $project;
        $this->addedBy = $addedBy;
    }

    public function via($notifiable)
    {
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        $projectUrl = config('app.url') . '/projects/' . $this->project->_id;
        $endDate = \Carbon\Carbon::parse($this->project->endDate)->format('d M Y');

        return (new MailMessage)
            ->subject('Welcome to Project: ' . $this->project->name)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('You have been added to a project.')
            ->line('**Project Details:**')
            ->line('• Project Name: ' . $this->project->name)
            ->line('• Added by: ' . $this->addedBy->name)
            ->line('• End Date: ' . $endDate)
            ->action('Access Project', $projectUrl)
            ->line('You can now access and collaborate on this project.')
            ->line('Welcome aboard!');
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Added to Project',
            'message' => "You have been added to the project '{$this->project->name}' by {$this->addedBy->name}",
            'type' => 'project_invitation',
            'projectId' => $this->project->_id,
            'added_by' => [
                'id' => $this->addedBy->_id,
                'name' => $this->addedBy->name,
                'profile_picture' => $this->addedBy->profile_picture
            ],
            'project' => [
                'id' => $this->project->projectId,
                'name' => $this->project->name
            ]
        ];
    }
}
