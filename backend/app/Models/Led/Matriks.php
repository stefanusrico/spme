<?php

namespace App\Models\Led;

use App\Models\Lam\Lam;
use App\Models\Prodi\Prodi;
use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;

class Matriks extends Model
{
    protected $connection = 'mongodb'; 
    protected $collection = 'matriks'; 
    protected $fillable = [
        'strataId',
        'lamId',
        'c',
        'no',
        'sub',
        'details',
        'type', 
        'seq', 
        'reference',
    ];

    // protected $casts = [
    //     'details' => 'array', 
    // ];
    public function prodi()
    {
        return $this->belongsTo(Prodi::class, 'prodiId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }
}