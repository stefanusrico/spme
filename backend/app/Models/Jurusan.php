<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Jurusan extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'jurusan';

    protected $fillable = [
        'name',
    ];


    public function prodi()
    {
        return $this->hasMany(Prodi::class);
    }

}