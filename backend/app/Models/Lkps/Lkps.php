<?php

namespace App\Models\Lkps;

use App\Models\Prodi\Prodi;
use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;

class Lkps extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps';

    protected $fillable = [
        'prodiId',
        'periode',
        'tahunAkademik',
        'status',
        'tanggalPembuatan',
        'tanggalSubmit',
        'lastUpdated',
        'isActive',
        'createdBy',
        'updatedBy'
    ];

    protected $casts = [
        'tanggalPembuatan' => 'datetime',
        'tanggalSubmit' => 'datetime',
        'lastUpdated' => 'datetime',
        'isActive' => 'boolean'
    ];

    /**
     * Get the prodi this LKPS belongs to
     */
    public function prodi()
    {
        return $this->belongsTo(Prodi::class, 'prodiId', '_id');
    }

    /**
     * Get all data for this LKPS
     */
    public function data()
    {
        return $this->hasMany(LkpsData::class, 'lkpsId', '_id');
    }

    /**
     * Get active LKPS for a specific prodi
     * 
     * @param string $prodiId
     * @return Lkps|null
     */
    public static function getActiveForProdi($prodiId)
    {
        return self::where('prodiId', $prodiId)
            ->where('isActive', true)
            ->first();
    }

    /**
     * Create a new LKPS for a prodi, ensuring there's only one active LKPS per period
     * 
     * @param string $prodiId
     * @param string $periode Accreditation period (e.g., "2021-2026")
     * @param string $tahunAkademik Academic year (e.g., "2021/2022")
     * @param string $userId User creating the LKPS
     * @return Lkps
     */
    public static function createForProdi($prodiId, $periode, $tahunAkademik, $userId)
    {
        $existingLkps = self::where('prodiId', $prodiId)
            ->where('periode', $periode)
            ->where('isActive', true)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($existingLkps) {
            return $existingLkps;
        }

        return self::create([
            'prodiId' => $prodiId,
            'periode' => $periode,
            'tahunAkademik' => $tahunAkademik,
            'status' => 'draft',
            'tanggalPembuatan' => now(),
            'lastUpdated' => now(),
            'isActive' => true,
            'createdBy' => $userId,
            'updatedBy' => $userId
        ]);
    }


    /**
     * Calculate current accreditation period based on tanggalKedaluwarsa
     * 
     * @param \DateTime $tanggalKedaluwarsa
     * @return string Period in format "YYYY-YYYY"
     */
    public static function calculatePeriode($tanggalKedaluwarsa)
    {
        $endYear = Carbon::parse($tanggalKedaluwarsa)->year;
        $startYear = $endYear - 5;

        return "{$startYear}-{$endYear}";
    }

    /**
     * Submit this LKPS
     */
    public function submit()
    {
        $this->status = 'submitted';
        $this->tanggalSubmit = now();
        $this->lastUpdated = now();
        $this->save();

        return $this;
    }
}