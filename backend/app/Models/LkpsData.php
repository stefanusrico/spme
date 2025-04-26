<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class LkpsData extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_data';

    protected $fillable = [
        'lkpsId',
        'section_code',
        'table_code',
        'data',
        'score',
        'updatedBy',
        'scoreDetail',
    ];

    /**
     * Get the LKPS document this data belongs to
     */
    public function lkps()
    {
        return $this->belongsTo(Lkps::class, 'lkpsId', '_id');
    }

    /**
     * Get the section this data belongs to
     */
    public function section()
    {
        return $this->belongsTo(LkpsSection::class, 'section_code', 'code');
    }

    /**
     * Save data for a specific section and table in an LKPS document
     * 
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @param array $data
     * @param float|null $score
     * @param string $userId
     * @return LkpsData
     */
    public static function saveData($lkpsId, $sectionCode, $tableCode, $data, $score = null, $scoreDetail = null, $userId)
    {
        return self::updateOrCreate(
            [
                'lkpsId' => $lkpsId,
                'section_code' => $sectionCode,
                'table_code' => $tableCode,
            ],
            [
                'data' => $data,
                'score' => $score,
                'scoreDetail' => $scoreDetail,
                'updatedBy' => $userId
            ]
        );
    }

    /**
     * Get data for a specific section and table in an LKPS document
     * 
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @return array|null
     */
    public static function getData($lkpsId, $sectionCode, $tableCode)
    {
        $record = self::where('lkpsId', $lkpsId)
            ->where('section_code', $sectionCode)
            ->where('table_code', $tableCode)
            ->first();

        return $record ? $record->data : null;
    }

    /**
     * Get score for a specific section in an LKPS document
     * 
     * @param string $lkpsId
     * @param string $sectionCode
     * @return float|null
     */
    public static function getScore($lkpsId, $sectionCode)
    {
        $record = self::where('lkpsId', $lkpsId)
            ->where('section_code', $sectionCode)
            ->whereNotNull('score')
            ->first();

        return $record ? $record->score : null;
    }
}