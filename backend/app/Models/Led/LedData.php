<?php

namespace App\Models\Led;

use App\Models\User\User;
use App\Models\Project\Task;
use MongoDB\Laravel\Eloquent\Model;

class LedData extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'led_data';

    protected $fillable = [
        'taskId',
        'userId',
        'commit',
        
        'reference',
        'isianAsesi',
        'dataPendukung',
        'nilai',
        'masukan',
        'details'
    ];

    protected $casts = [
        'taskId' => 'string',
        'userId' => 'string',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class, 'taskId', '_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', '_id');
    }
}