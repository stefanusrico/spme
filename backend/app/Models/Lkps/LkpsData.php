<?php

namespace App\Models\Lkps;

use App\Models\Project\Task;
use MongoDB\Laravel\Eloquent\Model;

class LkpsData extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_data';

    protected $fillable = [
        'kodeTabel',
        'data',
        'nilai',
        'detailNilai',
    ];

    /**
     * Get the table this data belongs to
     */
    public function tabel()
    {
        return $this->belongsTo(LkpsTable::class, 'kodeTabel', 'kode');
    }

    /**
     * Get the tasks associated with this LKPS data
     */
    public function tasks()
    {
        return $this->hasMany(Task::class, 'lkpsDataId', '_id');
    }

    /**
     * Save data for a specific table
     * 
     * @param string $kodeTabel Table code
     * @param array $data The data to save
     * @param float|null $nilai Score
     * @param array $detailNilai Score details
     * @return LkpsData
     */
    public static function saveData($kodeTabel, $data, $nilai = null, $detailNilai = [])
    {
        return self::updateOrCreate(
            [
                'kodeTabel' => $kodeTabel,
            ],
            [
                'data' => $data,
                'nilai' => $nilai,
                'detailNilai' => $detailNilai
            ]
        );
    }

    /**
     * Get data for a specific table
     * 
     * @param string $kodeTabel Table code
     * @return array|null
     */
    public static function getData($kodeTabel)
    {
        $record = self::where('kodeTabel', $kodeTabel)->first();
        return $record ? $record->data : null;
    }

    /**
     * Get all data with table information
     * 
     * @return \Illuminate\Support\Collection
     */
    public static function getAllWithTableInfo()
    {
        $records = self::all();

        return $records->map(function ($record) {
            $tabel = LkpsTable::where('kode', $record->kodeTabel)->first();
            $record->tableTitle = $tabel ? $tabel->judul : null;
            return $record;
        });
    }

    /**
     * Check if this data has valid score
     * 
     * @return bool
     */
    public function hasValidScore()
    {
        return $this->nilai !== null && is_numeric($this->nilai);
    }
}