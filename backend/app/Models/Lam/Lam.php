<?php

namespace App\Models\Lam;

use App\Models\Led\Matriks;
use App\Models\SpreadsheetInfo;
use App\Models\Prodi\Prodi;
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

    public function matriks()
    {
        return $this->hasMany(Matriks::class, 'lamId', '_id');
    }

    public function spreadsheetInfo()
    {
        return $this->hasMany(SpreadsheetInfo::class, 'lamId', '_id');
    }
}