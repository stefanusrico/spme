<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Lkps extends Model
{
    protected $collection = 'lkps'; // Nama koleksi MongoDB
    protected $connection = 'mongodb'; // Nama koneksi

    protected $fillable = [
        'prodiId',
        'sections',
    ];

    protected $casts = [
        'sections' => 'array',
    ];
}
