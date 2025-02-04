<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Lam extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lam';

    protected $fillable = [
        'name',
        'hasBatch'
    ];

    protected $casts = [
        'hasBatch' => 'boolean'
    ];

    protected $indexes = [
        ['key' => ['name' => 1]]
    ];

    public function jadwals()
    {
        return $this->hasMany(JadwalLam::class, 'lamId', '_id');
    }

    public function jurusans()
    {
        return $this->hasMany(Jurusan::class, 'lamId', '_id');
    }

    public function prodis()
    {
        return $this->hasManyThrough(
            Prodi::class,
            JadwalLam::class,
            'lamId',
            'jadwalLamId',
            '_id',
            '_id'
        );
    }
}