<?php

namespace App\Models\Led;

use App\Models\Prodi\Prodi;
use App\Models\Project\Task;
use MongoDB\Laravel\Eloquent\Model;

class Version extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'versions';

    protected $fillable = [
        'c',
        'no',
        'sub',
        'type',
        'seq',
        'taskId',
        'prodiId',
        'reference',
        'isian_asesi',
        'data_pendukung',
        'nilai',
        'masukan',
        'commit',
        'komentar',
        'user_id',
        'details'
    ];

    protected $casts = [
        'taskId' => 'string',
        'prodiId' => 'string',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class, 'taskId', '_id');
    }

    public function prodi()
    {
        return $this->belongsTo(Prodi::class, 'prodiId', '_id');
    }
}