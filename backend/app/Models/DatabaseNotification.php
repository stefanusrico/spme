<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class DatabaseNotification extends Model
{
  protected $connection = 'mongodb';
  protected $collection = 'notifications';

  protected $fillable = [
    'type',
    'notifiable_type',
    'notifiable_id',
    'data',
    'read_at'
  ];

  protected $casts = [
    'data' => 'array',
    'read_at' => 'datetime',
  ];

  public function markAsRead()
  {
    if (is_null($this->read_at)) {
      $this->forceFill(['read_at' => now()])->save();
    }
  }
}