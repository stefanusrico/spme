<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class JadwalLam extends Model
{
  protected $connection = 'mongodb';
  protected $collection = 'jadwal_lam';

  protected $fillable = [
    'lamId',
    'hasBatch',
    'tahun',
    'batch',
    'tanggalSubmit',
    'tanggalPengumuman'
  ];

  protected $casts = [
    'tanggalSubmit' => 'datetime',
    'tanggalPengumuman' => 'datetime',
    'hasBatch' => 'boolean'
  ];

  protected $indexes = [
    ['key' => ['lamId' => 1]],
    ['key' => ['tahun' => 1]],
    ['key' => ['tanggalPengumuman' => 1]]
  ];

  public function lam()
  {
    return $this->belongsTo(Lam::class, 'lamId', '_id');
  }

  public function prodis()
  {
    return $this->hasMany(Prodi::class, 'jadwalLamId', '_id');
  }
}