<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Jurusan extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'jurusans';

    protected $fillable = [
        'lamId',
        'name'
    ];

    protected $indexes = [
        ['key' => ['lamId' => 1]],
        ['key' => ['name' => 1]]
    ];

    public function getLamName()
    {
        if ($this->lam) {
            return $this->lam;
        }

        $mapping = [
            'Teknik Sipil' => 'LAM TEKNIK',
            'Teknik Mesin' => 'LAM TEKNIK',
            'Teknik Refrigerasi dan Tata Udara' => 'LAM TEKNIK',
            'Teknik Konversi Energi' => 'LAM TEKNIK',
            'Teknik Elektro' => 'LAM TEKNIK',
            'Teknik Kimia' => 'LAMSAMA',
            'Teknik Komputer dan Informatika' => 'LAM INFOKOM',
            'Akuntansi' => 'LAMEMBA',
            'Administrasi Niaga' => 'LAMEMBA',
            'Bahasa Inggris' => 'BAN-PT'
        ];

        $lamName = $mapping[$this->name] ?? null;
        if (!$lamName)
            return null;

        $lam = Lam::where('name', $lamName)->first();
        if ($lam) {
            $this->lamId = $lam->_id;
            $this->save();
        }

        return $lam;
    }

    public function prodis()
    {
        return $this->hasMany(Prodi::class, 'jurusanId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($jurusan) {
            if (!$jurusan->lamId) {
                $mapping = [
                    'Teknik Sipil' => 'LAM TEKNIK',
                    'Teknik Mesin' => 'LAM TEKNIK',
                    'Teknik Refrigerasi dan Tata Udara' => 'LAM TEKNIK',
                    'Teknik Konversi Energi' => 'LAM TEKNIK',
                    'Teknik Elektro' => 'LAM TEKNIK',
                    'Teknik Kimia' => 'LAMSAMA',
                    'Teknik Komputer dan Informatika' => 'LAM INFOKOM',
                    'Akuntansi' => 'LAMEMBA',
                    'Administrasi Niaga' => 'LAMEMBA',
                    'Bahasa Inggris' => 'BAN-PT'
                ];

                $lamName = $mapping[$jurusan->name] ?? null;
                if ($lamName) {
                    $lam = Lam::where('name', $lamName)->first();
                    if ($lam) {
                        $jurusan->attributes['lamId'] = $lam->_id; // set di attributes
                    }
                }
            }
        });
    }
}