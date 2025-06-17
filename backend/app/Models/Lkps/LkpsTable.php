<?php

namespace App\Models\Lkps;

use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;
use App\Traits\ObjectIdConversion;

class LkpsTable extends Model
{
    use ObjectIdConversion;

    protected $connection = 'mongodb';
    protected $collection = 'lkps_tables';

    protected $fillable = [
        'kode',
        'judul',
        'strataId',
        'barisAwalExcel'
    ];

    /**
     * Relationship to Strata model
     */
    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }

    /**
     * Get kolom dengan parent null (root level) - updated relation
     */
    public function kolom()
    {
        return $this->hasMany(LkpsColumn::class, 'lkpsTableId', '_id')
            ->whereNull('parentId')
            ->orderBy('order');
    }

    /**
     * Get semua kolom (termasuk child) - updated relation
     */
    public function semuaKolom()
    {
        return $this->hasMany(LkpsColumn::class, 'lkpsTableId', '_id')
            ->orderBy('order');
    }

    /**
     * Get data entries for this table
     */
    public function data()
    {
        return $this->hasMany(LkpsData::class, 'kodeTabel', 'kode');
    }

    /**
     * Get data with specific conditions
     */
    public function getData()
    {
        return $this->data()->orderBy('created_at', 'desc');
    }

    /**
     * Get table configuration (columns structure)
     */
    public function getKonfigurasi()
    {
        return $this->kolom()->with('children')->get();
    }

    /**
     * Scope to filter by strata using relationship
     */
    public function scopeByStrata($query, $strataName)
    {
        return $query->whereHas('strata', function ($q) use ($strataName) {
            $q->where('name', $strataName);
        });
    }

    /**
     * Scope to filter by strata ID
     */
    public function scopeByStrataId($query, $strataId)
    {
        return $query->where('strataId', $this->convertToObjectId($strataId));
    }

    /**
     * Get available strata from related Strata model
     */
    public static function getAvailableStrata()
    {
        return Strata::whereHas('lkpsTables')->pluck('name', '_id');
    }

    /**
     * Check if table is for Sarjana Terapan strata
     */
    public function isSarjanaTerapan()
    {
        return $this->strata && $this->strata->name === 'Sarjana Terapan';
    }

    /**
     * Check if table is for Diploma Tiga strata
     */
    public function isDiplomaTiga()
    {
        return $this->strata && $this->strata->name === 'Diploma Tiga';
    }

    /**
     * Get strata name (with fallback for backward compatibility)
     */
    public function getStrataNameAttribute()
    {
        return $this->strata ? $this->strata->name : null;
    }

    /**
     * Set strata by name (helper method)
     */
    public function setStrataByName($strataName)
    {
        if (!$strataName) {
            $this->strataId = null;
            return;
        }

        $strata = Strata::where('name', $strataName)->first();
        if ($strata) {
            $this->strataId = $this->convertToObjectId($strata->_id);
        }
    }

    /**
     * Boot method to handle strata assignment
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($table) {
            // Auto-assign strataId if strata name is provided in fillable but not strataId
            if (isset($table->attributes['strata']) && !isset($table->attributes['strataId'])) {
                $table->setStrataByName($table->attributes['strata']);
                unset($table->attributes['strata']); // Remove old field
            }
        });

        static::updating(function ($table) {
            // Auto-assign strataId if strata name is provided
            if (isset($table->attributes['strata']) && $table->isDirty('strata')) {
                $table->setStrataByName($table->attributes['strata']);
                unset($table->attributes['strata']); // Remove old field
            }
        });
    }
}