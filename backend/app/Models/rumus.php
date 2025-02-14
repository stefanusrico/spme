<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;


class Rumus extends Model
{
    protected $connection = 'mongodb'; // Koneksi ke MongoDB
    protected $collection = 'rumus'; // Nama koleksi di MongoDB
    protected $fillable = ['nomor', 'sub', 'rumus']; // Kolom yang dapat diisi
}
