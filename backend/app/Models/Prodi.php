<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Prodi extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'prodis';

    protected $fillable = [
        'jurusanId',
        'name',
        'nomorSK',
        'tahunSK',
        'peringkat',
        'tanggalKedaluwarsa',
        'tanggalAkhirSubmit',
    ];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }
}