<?php

namespace App\Models\Data;

use App\Models\Lam\Lam;
use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;

class SpreadsheetInfo extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'strata';

    protected $fillable = [
        'name',
        'lamId',
        'strataId',
        'spreadsheetId',
        'sheets',
    ];

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }
}