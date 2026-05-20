<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Http\Controllers\NotificationController;

class ProjectCreatedNotification extends Notification
{
    use Queueable;

    protected $project;
    protected $createdBy;
    protected $prodi;

    public function __construct($project, $createdBy, $prodi = null)
    {
        $this->project = $project;
        $this->createdBy = $createdBy;
        $this->prodi = $prodi;
    }

    public function via($notifiable)
    {
        // Add 'mail' to the channels
        return ['database', 'mail'];
    }

    // Add mail method for email notifications
    public function toMail($notifiable)
    {
        $prodiName = $this->prodi ? $this->prodi->name : 'Unknown Prodi';
        $projectUrl = config('app.url') . 'projects/' . $this->project->_id;

        return (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->subject('New Project Created: ' . $this->project->name)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('A new project has been created and requires your attention.')
            ->line('**Project Details:**')
            ->line('• Project Name: ' . $this->project->name)
            ->line('• Created by: ' . $this->createdBy->name)
            ->line('• Prodi: ' . $prodiName)
            ->line('• Start Date: ' . \Carbon\Carbon::parse($this->project->startDate)->format('d M Y'))
            ->line('• End Date: ' . \Carbon\Carbon::parse($this->project->endDate)->format('d M Y'))
            ->action('View Project', $projectUrl)
            ->line('You can monitor and manage this project through the dashboard.')
            ->line('Thank you for using our application!');
    }

    public function toArray($notifiable)
    {
        $prodiName = $this->prodi ? $this->prodi->name : 'Unknown Prodi';

        return [
            'title' => 'New Project Created',
            'message' => "New project '{$this->project->name}' has been created by {$this->createdBy->name} from {$prodiName}",
            'type' => 'project_created',
            'projectId' => $this->project->_id,
            'created_by' => [
                'id' => $this->createdBy->_id,
                'name' => $this->createdBy->name,
                'profile_picture' => $this->createdBy->profile_picture
            ],
            'project' => [
                'id' => $this->project->projectId,
                'name' => $this->project->name,
                'prodiId' => $this->project->prodiId,
                'startDate' => $this->project->startDate,
                'endDate' => $this->project->endDate,
            ],
            'prodi' => [
                'id' => $this->prodi ? $this->prodi->_id : null,
                'name' => $prodiName
            ]
        ];
    }
}