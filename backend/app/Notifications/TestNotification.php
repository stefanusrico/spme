<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TestNotification extends Notification
{
  use Queueable;

  public function __construct()
  {
    //
  }

  public function via($notifiable)
  {
    return ['database'];
  }

  public function toArray($notifiable)
  {
    return [
      'title' => 'Test Notification',
      'message' => 'This is a test notification to create notifications collection',
      'type' => 'test',
      'data' => [
        'test_id' => 1,
        'test_name' => 'Test Name'
      ]
    ];
  }
}