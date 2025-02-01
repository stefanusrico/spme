<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GeneralNotification extends Notification implements ShouldQueue
{
  use Queueable;

  protected $data;

  public function __construct($data)
  {
    $this->data = $data;
  }

  public function via($notifiable)
  {
    return ['database', 'mail'];
  }

  public function toMail($notifiable)
  {
    return (new MailMessage)
      ->subject($this->data['title'])
      ->markdown('emails.notification', [
        'notification' => $this
      ]);
  }

  public function toArray($notifiable)
  {
    return [
      'title' => $this->data['title'],
      'message' => $this->data['message'],
      'type' => $this->data['type'] ?? 'info',
      'action_url' => $this->data['action_url'] ?? null,
      'action_text' => $this->data['action_text'] ?? null,
    ];
  }
}