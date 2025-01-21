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
        'owners',
        'status',
        'startDate',
        'endDate',
        'order'
    ];

    protected $casts = [
        'progress' => 'boolean',
        'startDate' => 'datetime',
        'endDate' => 'datetime',
        'owners' => 'array'
    ];

    public function tasklist()
    {
        return $this->belongsTo(TaskList::class, 'taskListId', '_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId', '_id');
    }
    public function users()
    {
        return $this->belongsToMany(User::class, null, 'owners', '_id');
    }
}