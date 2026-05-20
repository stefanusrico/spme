<?php

namespace App\Models\Led;

use App\Models\Lam\Lam;
use App\Models\Prodi\Prodi;
use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;

class LedItem extends Model
{
    protected $connection = 'mongodb'; 
    protected $collection = 'led_items'; 
    protected $fillable = [
        'no',
        'sub',
        'lamId',
        'strataId',
        'kriteria',
        'details',
        'type', 
        'seq', 
        'reference',
    ];

    // protected $casts = [
    //     'details' => 'array', 
    // ];

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }
}