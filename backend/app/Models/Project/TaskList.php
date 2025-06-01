<?php

namespace App\Models\Project;

use MongoDB\Laravel\Eloquent\Model;

class TaskList extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'tasklists';

    protected $fillable = [
        'projectId',
        'kriteria',
        'order',
        'bobot'
    ];

    protected $casts = [
        'bobot' => 'float',
        'order' => 'integer'
    ];

    // FIX: Handle MongoDB Decimal128 properly
    public function getBobotAttribute($value)
    {
        if ($value === null) {
            return 0.0;
        }

        // Handle MongoDB Decimal128 - use __toString() or cast to string
        if ($value instanceof \MongoDB\BSON\Decimal128) {
            return (float) ((string) $value); // Cast to string, then to float
        }

        // Handle other MongoDB BSON types
        if (is_object($value)) {
            if (method_exists($value, '__toString')) {
                return (float) $value->__toString();
            } elseif (method_exists($value, 'toFloat')) {
                return $value->toFloat();
            }
        }

        return (float) $value;
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'taskListId', '_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId', '_id');
    }
}