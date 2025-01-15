<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Task extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'tasks';

    protected $fillable = [
        'taskId',
        'taskListId',
        'projectId',
        'name',
        'progress',
        'owner',
        'status',
        'startDate',
        'endDate',
        'order'
    ];

    protected $casts = [
        'progress' => 'boolean',
        'startDate' => 'datetime',
        'endDate' => 'datetime'
    ];

    public function tasklist()
    {
        return $this->belongsTo(TaskList::class, 'taskListId', '_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId', '_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'owner', '_id');
    }
}