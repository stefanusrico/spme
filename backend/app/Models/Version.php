<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Version extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'version_control';

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