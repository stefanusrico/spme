<?php

namespace App\Models\Data;

use App\Models\Lam\Lam;
use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;

class SyaratPerluPeringkat extends Model
{
    protected $connection = 'mongodb'; 
    protected $collection = 'syarat_perlu_peringkat'; 
    protected $fillable = [
        'butir',
        'aspek_penilaian',
        'lamId',
        'strataId',
        'minimal_syarat_unggul',
        'minimal_syarat_baik_sekali',
        'no',
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