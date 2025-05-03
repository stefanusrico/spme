<?php

namespace App\Models\Project;

use MongoDB\Laravel\Eloquent\Model;

class TaskList extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'tasklists';

    protected $fillable = [
        'projectId',
        'c',
        'order'
    ];

    public function tasks()
    {
        return $this->hasMany(Task::class, 'taskListId', '_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId', '_id');
    }
}