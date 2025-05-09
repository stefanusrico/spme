<?php

namespace App\Models\Lkps;

use MongoDB\Laravel\Eloquent\Model;

class LkpsTable extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_tables';

    protected $fillable = [
        'kode',          // Unique identifier for the table (e.g., 'kerjasama')
        'judul',         // Display title for the table
        'barisAwalExcel', // Which row to start reading from in Excel uploads
    ];

    /**
     * Get all columns for this table
     */
    public function kolom()
    {
        return $this->hasMany(LkpsColumn::class, 'kodeTabel', 'kode')
            ->where('parentId', null)
            ->orderBy('order');
    }

    /**
     * Get all columns including children
     */
    public function semuaKolom()
    {
        return $this->hasMany(LkpsColumn::class, 'kodeTabel', 'kode');
    }

    /**
     * Get data for this table across all LKPS documents
     */
    public function data()
    {
        return $this->hasMany(LkpsData::class, 'kodeTabel', 'kode');
    }

    /**
     * Get data for this table
     * 
     * @return LkpsData|null
     */
    public function getData()
    {
        return LkpsData::where('kodeTabel', $this->kode)->first();
    }

    /**
     * Get complete table configuration including columns
     */
    public function getKonfigurasi()
    {
        // Get all columns for this table
        $semuaKolom = $this->semuaKolom;

        // Get parent columns (those without parent_id)
        $kolomInduk = $semuaKolom->where('parentId', null)->sortBy('order');

        // Process columns and add children where applicable
        $kolomDiproses = $kolomInduk->map(function ($kolom) use ($semuaKolom) {
            if ($kolom->isGroup) {
                // If it's a group column, find its children
                $anak = $semuaKolom->where('parentId', $kolom->_id)->sortBy('order');
                $kolom->anak = $anak;
            }

            return $kolom;
        });

        $konfigurasi = [
            'id' => $this->kode,
            'judul' => $this->judul,
            'kolom' => $kolomDiproses,
        ];

        return $konfigurasi;
    }
}