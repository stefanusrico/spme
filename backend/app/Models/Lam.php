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

    public function prodis()
    {
        return $this->hasMany(Prodi::class, 'lamId', '_id');
    }

    public function jadwals()
    {
        return $this->hasMany(JadwalLam::class, 'lamId', '_id');
    }
}