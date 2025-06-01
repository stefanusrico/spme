<?php

namespace App\Models\Project;

use App\Models\Prodi\Prodi;
use App\Models\User\User;
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
        if (isset($this->endDate) && Carbon::parse($this->endDate)->lt(now())) {
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

    public function members()
    {
        return $this->hasMany(ProjectMember::class, 'projectId', '_id');
    }

    public function tasklists()
    {
        return $this->hasMany(TaskList::class, 'projectId', '_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'projectId', '_id');
    }

    public function getOwner()
    {
        return $this->members()->where('role', 'owner')->first();
    }

    public function getAdmins()
    {
        return $this->members()->where('role', 'admin')->get();
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
                isset($project->endDate) &&
                Carbon::parse($project->endDate)->lt(Carbon::now())
            ) {
                $project->status = 'CLOSED';
                $project->save();
            }
        });
    }
}