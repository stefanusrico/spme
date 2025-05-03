<?php

namespace App\Models\Jurusan;

use App\Models\Prodi\Prodi;
use App\Traits\ObjectIdConversion;
use MongoDB\Laravel\Eloquent\Model;

class Jurusan extends Model
{
    use ObjectIdConversion;
    protected $connection = 'mongodb';
    protected $collection = 'jurusans';

    protected $fillable = [
        'name'
    ];

    public function prodis()
    {
        return $this->hasMany(Prodi::class, 'jurusanId', '_id');
    }
}