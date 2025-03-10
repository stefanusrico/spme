<?php

namespace App\Models;

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
