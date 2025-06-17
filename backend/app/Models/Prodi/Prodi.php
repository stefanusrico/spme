<?php

namespace App\Models\Prodi;

use App\Models\User\User;
use App\Models\Jurusan\Jurusan;
use App\Models\Lam\Lam;
use App\Models\Lam\JadwalLam;
use App\Models\Project\Project;
use App\Models\Lkps\Lkps;
use App\Models\Led\Version;
use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;
use App\Traits\ObjectIdConversion;

class Prodi extends Model
{

    use ObjectIdConversion;
    protected $connection = 'mongodb';
    protected $collection = 'prodis';

    protected $fillable = [
        'name',
        'jurusanId',
        'lamId',
        'jadwalLamId',
        'strataId',
        'tanggalSubmit',
        'tanggalPengumuman',
        'akreditasi'
    ];

    protected $casts = [
        'akreditasi.tahun' => 'integer',
        'akreditasi.tanggalKedaluwarsa' => 'datetime',
        'tanggalSubmit' => 'datetime',
        'tanggalPengumuman' => 'datetime'
    ];

    protected $indexes = [
        ['key' => ['name' => 1]],
        ['key' => ['jurusanId' => 1]],
        ['key' => ['lamId' => 1]],
        ['key' => ['jadwalLamId' => 1]],
        ['key' => ['akreditasi.nomorSK' => 1]],
        ['key' => ['akreditasi.lembagaAkreditasi' => 1]]
    ];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'jurusanId', '_id');
    }

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'prodiId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }

    public function activeProject()
    {
        return $this->hasOne(Project::class, 'prodiId', '_id')
            ->where('endDate', '>', now());
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'prodiId', '_id');
    }

    public function getJurusanKeyword($name = null)
    {
        $prodiName = $name ?? $this->name;

        $mapping = [
            'Konstruksi Sipil' => 'Teknik Sipil',
            'Konstruksi Gedung' => 'Teknik Sipil',
            'Perancangan Jalan' => 'Teknik Sipil',
            'Perbaikan Gedung' => 'Teknik Sipil',
            'Rekayasa Infrastruktur' => 'Teknik Sipil',

            'Mesin' => 'Teknik Mesin',
            'Aeronautika' => 'Teknik Mesin',
            'Konstruksi Mesin' => 'Teknik Mesin',
            'Proses Manufaktur' => 'Teknik Mesin',

            'Tata Udara' => 'Teknik Refrigerasi dan Tata Udara',

            'Konversi Energi' => 'Teknik Konversi Energi',
            'Tenaga Listrik' => 'Teknik Konversi Energi',
            'Konservasi Energi' => 'Teknik Konversi Energi',

            'Elektronika' => 'Teknik Elektro',
            'Telekomunikasi' => 'Teknik Elektro',
            'Listrik' => 'Teknik Elektro',
            'Otomasi Industri' => 'Teknik Elektro',

            'Kimia' => 'Teknik Kimia',
            'Analis' => 'Teknik Kimia',
            'Produksi Bersih' => 'Teknik Kimia',

            'Informatika' => 'Teknik Komputer dan Informatika',

            'Akuntansi' => 'Akuntansi',
            'Keuangan' => 'Akuntansi',
            'Manajemen Pemerintahan' => 'Akuntansi',
            'Keuangan Syariah' => 'Akuntansi',
            'Perbankan Syariah' => 'Akuntansi',

            'Administrasi' => 'Administrasi Niaga',
            'Manajemen Pemasaran' => 'Administrasi Niaga',
            'Perjalanan Wisata' => 'Administrasi Niaga',
            'Manajemen Aset' => 'Administrasi Niaga',
            'Destinasi Pariwisata' => 'Administrasi Niaga',
            'Inovasi' => 'Administrasi Niaga',

            'Bahasa Inggris' => 'Bahasa Inggris'
        ];

        foreach ($mapping as $prodiKeyword => $jurusanName) {
            if (str_contains($prodiName, $prodiKeyword)) {
                return $jurusanName;
            }
        }

        return null;
    }

    private function setLamId(): void
    {
        if (!isset($this->akreditasi['lembagaAkreditasi'])) {
            $this->lamId = null;
            return;
        }

        $lamName = $this->akreditasi['lembagaAkreditasi'];
        if ($lamName === 'A.5') {
            $lamName = 'LAMEMBA';
        }

        $lam = Lam::where('name', $lamName)->first();

        $this->lamId = $lam ? $this->convertToObjectId($lam->_id) : null;
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($prodi) {
            $prodi->setLamId();
        });

        static::updating(function ($prodi) {
            if ($prodi->isDirty('akreditasi.lembagaAkreditasi')) {
                $prodi->setLamId();
            }
        });
    }
}