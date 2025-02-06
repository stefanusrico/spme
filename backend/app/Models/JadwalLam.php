<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class JadwalLam extends Model
{
  protected $connection = 'mongodb';
  protected $collection = 'jadwal_lam';

  protected $fillable = [
    'lamId',
    'tahun',
    'batch',
    'jadwal'
  ];

  protected $casts = [
    'tahun' => 'integer',
    'batch' => 'integer',
    'jadwal.tanggalSubmit' => 'datetime',
    'jadwal.tanggalPengumuman' => 'datetime'
  ];

  public function lam()
  {
    return $this->belongsTo(Lam::class, 'lamId', '_id');
  }

  public function prodis()
  {
    return $this->hasMany(Prodi::class, 'jadwal.jadwalLamId', '_id');
  }

  protected static function boot()
  {
    parent::boot();

    static::creating(function ($jadwalLam) {
      if ($jadwalLam->lam && $jadwalLam->lam->hasBatch) {
        if (!in_array($jadwalLam->batch, [1, 2, 3])) {
          throw new \Exception('Batch harus bernilai 1, 2, atau 3');
        }
      }
    });
  }
}