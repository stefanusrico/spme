<?php

namespace App\Models\Prodi;

use App\Models\SpreadsheetInfo;
use App\Models\Lkps\LkpsTable;
use MongoDB\Laravel\Eloquent\Model;

class Strata extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'strata';

    protected $fillable = [
        'name',
    ];

    public function spreadsheetInfo()
    {
        return $this->hasMany(SpreadsheetInfo::class, 'strataId', '_id');
    }

    public function prodis()
    {
        return $this->hasMany(Prodi::class, 'strataId', '_id');
    }


    public function lkpsTables()
    {
        return $this->hasMany(LkpsTable::class, 'strataId', '_id');
    }

    /**
     * Get total tables count for this strata
     */
    public function getTablesCountAttribute()
    {
        return $this->lkpsTables()->count();
    }


    public function getTablesWithColumnsAttribute()
    {
        return $this->lkpsTables()
            ->whereHas('semuaKolom')
            ->count();
    }
}