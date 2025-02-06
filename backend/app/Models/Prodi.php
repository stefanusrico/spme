<?php
namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;

class Prodi extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'prodis';

    protected $fillable = [
        'name',
        'jurusanId',
        'lamId',
        'akreditasi',
        'jadwal'
    ];

    protected $casts = [
        'akreditasi.tahun' => 'integer',
        'akreditasi.tanggalKedaluwarsa' => 'datetime',
        'jadwal.tanggalSubmit' => 'datetime',
        'jadwal.tanggalPengumuman' => 'datetime'
    ];

    protected $indexes = [
        ['key' => ['name' => 1]],
        ['key' => ['jurusanId' => 1]],
        ['key' => ['lamId' => 1]],
        ['key' => ['akreditasi.nomorSK' => 1]],
        ['key' => ['akreditasi.lembagaAkreditasi' => 1]],
        ['key' => ['jadwal.jadwalLamId' => 1]]
    ];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'jurusanId', '_id');
    }

    public function lam()
    {
        return $this->belongsTo(Lam::class, 'lamId', '_id');
    }

    public function jadwalLam()
    {
        return $this->belongsTo(JadwalLam::class, 'jadwal.jadwalLamId', '_id');
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

    public function assignJadwalLam()
    {
        \Log::info("Starting assignJadwalLam for " . $this->name);

        // Check if jadwal already exists and is complete
        if (
            isset($this->jadwal['jadwalLamId']) &&
            isset($this->jadwal['tanggalSubmit']) &&
            isset($this->jadwal['tanggalPengumuman'])
        ) {
            \Log::info("Skip: already has complete schedule");
            return;
        }

        // Check for tanggalKedaluwarsa
        if (!isset($this->akreditasi['tanggalKedaluwarsa'])) {
            \Log::info("No tanggalKedaluwarsa");
            return;
        }

        // Get LAM directly from lamId
        $lam = Lam::find($this->lamId);
        if (!$lam) {
            \Log::info("No LAM found with ID: " . $this->lamId);
            return;
        }
        \Log::info("Found LAM: " . $lam->name);

        // Process LAM schedule search
        $tanggalKedaluwarsa = Carbon::parse($this->akreditasi['tanggalKedaluwarsa']);
        \Log::info("Looking for schedule for year: " . $tanggalKedaluwarsa->year);

        $firstSchedule = JadwalLam::where('lamId', $this->lamId)
            ->where('tahun', $tanggalKedaluwarsa->year)
            ->first();
        \Log::info("First schedule found: " . ($firstSchedule ? 'yes' : 'no'));

        if (!$firstSchedule) {
            \Log::info("No schedule found for year");
            return;
        }
        \Log::info("Has batch: " . ($firstSchedule->hasBatch ? 'yes' : 'no'));

        $jadwal = $this->findAppropriateSchedule($lam, $tanggalKedaluwarsa);
        if ($jadwal) {
            \Log::info("Found schedule:", [
                'jadwalLamId' => $jadwal->_id,
                'tanggalSubmit' => $jadwal->jadwal['tanggalSubmit'],
                'tanggalPengumuman' => $jadwal->jadwal['tanggalPengumuman']
            ]);

            $this->jadwal = [
                'jadwalLamId' => $jadwal->_id,
                'tanggalSubmit' => $jadwal->jadwal['tanggalSubmit'],
                'tanggalPengumuman' => $jadwal->jadwal['tanggalPengumuman']
            ];
            $this->save();
        } else {
            \Log::info("No appropriate schedule found");
        }
    }

    private function setLamId()
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
        $this->lamId = $lam ? $lam->_id : null;
    }

    private function findAppropriateSchedule($lam, $tanggalKedaluwarsa)
    {
        $baseQuery = JadwalLam::where('lamId', $lam->_id);

        if ($lam->hasBatch) {
            // Logic for LAM with batch
            $jadwal = $baseQuery
                ->where('jadwal.tanggalPengumuman', '<=', $tanggalKedaluwarsa)
                ->orderBy('jadwal.tanggalPengumuman', 'desc')
                ->first();

            if (!$jadwal) {
                $jadwal = $baseQuery
                    ->where('jadwal.tanggalPengumuman', '>', $tanggalKedaluwarsa)
                    ->orderBy('jadwal.tanggalPengumuman', 'asc')
                    ->first();
            }
            return $jadwal;
        } else {
            // Logic for LAM without batch
            $jadwal = $baseQuery
                ->where('tahun', $tanggalKedaluwarsa->year)
                ->first();

            if (!$jadwal) {
                $jadwal = $baseQuery
                    ->where('tahun', $tanggalKedaluwarsa->year + 1)
                    ->first();
            }
            return $jadwal;
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($prodi) {
            $prodi->setLamId();
            if (isset($prodi->akreditasi['lembagaAkreditasi'])) {
                $prodi->assignJadwalLam();
            }
        });

        static::updating(function ($prodi) {
            if ($prodi->isDirty('akreditasi.lembagaAkreditasi')) {
                $prodi->setLamId();
            }
            if (
                $prodi->isDirty('akreditasi.tanggalKedaluwarsa') ||
                $prodi->isDirty('akreditasi.lembagaAkreditasi')
            ) {
                $prodi->assignJadwalLam();
            }
        });
    }
}