<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class LkpsTable extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_tables';

    protected $fillable = [
        'section_code',  // Reference to the section this table belongs to
        'code',          // Unique identifier for the table within a section (e.g., 'kerjasama')
        'title',         // Display title for the table
        'excel_start_row', // Which row to start reading from in Excel uploads
        'pagination',    // Pagination options as array, e.g., ['enabled' => true, 'size' => 10]
        'order',         // Display order within the section
        'used_in_formula' // Whether this table's data is used in formula calculations
    ];

    /**
     * Get the section this table belongs to
     */
    public function section()
    {
        return $this->belongsTo(LkpsSection::class, 'section_code', 'code');
    }

    /**
     * Get all columns for this table
     */
    public function columns()
    {
        return $this->hasMany(LkpsColumn::class, 'table_code', 'code')
            ->where('parent_id', null)
            ->orderBy('order');
    }

    /**
     * Get all columns including children
     */
    public function allColumns()
    {
        return LkpsColumn::where('table_code', $this->code)->get();
    }

    /**
     * Get data for this table across all LKPS documents
     */
    public function data()
    {
        return $this->hasMany(LkpsData::class, 'table_code', 'code');
    }

    /**
     * Get data for this table in a specific LKPS
     * 
     * @param string $lkpsId
     * @return LkpsData|null
     */
    public function getDataForLkps($lkpsId)
    {
        return LkpsData::where('lkpsId', $lkpsId)
            ->where('section_code', $this->section_code)
            ->where('table_code', $this->code)
            ->first();
    }
}