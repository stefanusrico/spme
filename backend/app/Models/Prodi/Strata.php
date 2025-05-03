<?php

namespace App\Models\Prodi;

use App\Models\Led\Matriks;
use App\Models\SpreadsheetInfo;
use MongoDB\Laravel\Eloquent\Model;

class Strata extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'strata';

    protected $fillable = [
        'name',
    ];

    public function matriks()
    {
        return $this->hasMany(Matriks::class, 'strataId', '_id');
    }

    public function spreadsheetInfo()
    {
        return $this->hasMany(SpreadsheetInfo::class, 'strataId', '_id');
    }

    public function prodis()
    {
        return $this->hasMany(Prodi::class, 'strataId', '_id');
    }
}