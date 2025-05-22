<?php

namespace App\Models\Project;

use App\Models\User\User;
use MongoDB\Laravel\Eloquent\Model;

class Task extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'tasks';

    protected $fillable = [
        'taskListId',
        'ledItemId',
        'lkpsTableId',
        'nama',
        'progress',
        'status',
        'startDate',
        'endDate',
        'owners',
        'order',
    ];

    protected $casts = [
        'progress' => 'float',
        'startDate' => 'datetime',
        'endDate' => 'datetime',
        'owners' => 'array',
        'sub' => 'string',
        'no' => 'integer'
    ];

    public function tasklist()
    {
        return $this->belongsTo(TaskList::class, 'taskListId', '_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, null, 'owners', '_id');
    }

    public function getProject()
    {
        return $this->tasklist ? $this->tasklist->project : null;
    }
}