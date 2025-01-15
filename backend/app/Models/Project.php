<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Project extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'projects';

    protected $fillable = [
        'projectId',
        'name',
        'progress',
        'status',
        'startDate',
        'endDate',
        'members',
        'createdBy'
    ];

    public function tasklists()
    {
        return $this->hasMany(TaskList::class, 'projectId', '_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'projectId', '_id');
    }
}