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

}