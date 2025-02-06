<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Jurusan extends Model
{
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