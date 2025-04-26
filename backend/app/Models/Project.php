<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;
use App\Events\ProjectEndDatePassed;

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
        'createdBy',
        'prodiId'
    ];

    protected $casts = [
        'progress' => 'float',
        'startDate' => 'datetime',
        'endDate' => 'datetime'
    ];

    protected $indexes = [
        ['key' => ['prodiId' => 1]],
        ['key' => ['endDate' => 1]],
        ['key' => ['createdBy' => 1]],
        ['key' => ['status' => 1]]
    ];

    public function save(array $options = [])
    {
        if ($this->endDate < now()) {
            event(new ProjectEndDatePassed($this));
        }
        return parent::save($options);
    }

    public function prodi()
    {
        return $this->belongsTo(Prodi::class, 'prodiId', '_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'createdBy', '_id');
    }

    public function tasklists()
    {
        return $this->hasMany(TaskList::class, 'projectId', '_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'projectId', '_id');
    }

    public static function canCreateNewProject($prodiId)
    {
        return !self::where('prodiId', $prodiId)
            ->where('status', 'ACTIVE')
            ->where('endDate', '>', now())
            ->exists();
    }

    protected static function boot()
    {
        parent::boot();

        static::retrieved(function ($project) {
            if (
                $project->status === 'ACTIVE' &&
                Carbon::parse($project->endDate)->lt(Carbon::now())
            ) {
                $project->status = 'CLOSED';
                $project->save();
            }
        });
    }
}