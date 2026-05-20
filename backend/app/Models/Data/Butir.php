<?php

namespace App\Models\Data;

use App\Models\Lam\Lam;
use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;

class Butir extends Model
{
    protected $connection = 'mongodb'; 
    protected $collection = 'bobot_butir'; 
    protected $fillable = [
        'butir',
        'elemen',
        'lamId',
        'strataId',
        'indikator',
        'bobot',
        'rumus'
    ];

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }
}