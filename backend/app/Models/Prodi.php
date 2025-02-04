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
        'nomorSK',
        'tahunSK',
        'peringkat',
        'tanggalKedaluwarsa',
        'jadwalLamId'
    ];

    protected $casts = [
        'tahunSK' => 'integer',
        'tanggalKedaluwarsa' => 'datetime'
    ];

    protected $appends = [
        'tanggalAkhirSubmit',
        'tanggalPengumuman'
    ];

    protected $indexes = [
        ['key' => ['jurusanId' => 1]],
        ['key' => ['jadwalLamId' => 1]],
        ['key' => ['name' => 1]],
        ['key' => ['nomorSK' => 1]]
    ];

    public function getTanggalAkhirSubmitAttribute()
    {
        return $this->jadwalLam?->tanggalSubmit;
    }

    public function getTanggalPengumumanAttribute()
    {
        return $this->jadwalLam?->tanggalPengumuman;
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

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'jurusanId', '_id');
    }

    public function jadwalLam()
    {
        return $this->belongsTo(JadwalLam::class, 'jadwalLamId', '_id');
    }

    public function assignJadwalLam()
    {
        \Log::info("Starting assignJadwalLam for " . $this->name);

        if ($this->jadwalLamId && $this->tanggalAkhirSubmit && $this->tanggalPengumuman) {
            \Log::info("Skip: already has complete schedule");
            return;
        }

        if (!$this->tanggalKedaluwarsa) {
            \Log::info("No tanggalKedaluwarsa");
            return;
        }

        // 1. Dapatkan keyword jurusan dari nama prodi
        $jurusanKeyword = $this->getJurusanKeyword();
        \Log::info("JurusanKeyword: " . $jurusanKeyword);
        if (!$jurusanKeyword) {
            \Log::info("No jurusanKeyword found");
            return;
        }

        // 2. Dapatkan jurusan berdasarkan keyword 
        $jurusan = Jurusan::where('name', $jurusanKeyword)->first();
        \Log::info("Jurusan found: " . ($jurusan ? $jurusan->name : 'null'));
        if (!$jurusan) {
            \Log::info("No jurusan found");
            return;
        }

        // 3. Dapatkan LAM dari jurusan
        if (!$jurusan->lam) {
            \Log::info("No LAM found for jurusan");
            return;
        }
        \Log::info("Found LAM: " . $jurusan->lam->name);

        // 4. Proses pencarian jadwal LAM
        $tanggalKedaluwarsa = Carbon::parse($this->tanggalKedaluwarsa);
        \Log::info("Looking for schedule for year: " . $tanggalKedaluwarsa->year);

        $firstSchedule = JadwalLam::where('lamId', $jurusan->lam->_id)
            ->where('tahun', $tanggalKedaluwarsa->year)
            ->first();

        \Log::info("First schedule found: " . ($firstSchedule ? 'yes' : 'no'));
        if (!$firstSchedule) {
            \Log::info("No schedule found for year");
            return;
        }

        \Log::info("Has batch: " . ($firstSchedule->hasBatch ? 'yes' : 'no'));

        $jadwal = $this->findAppropriateSchedule($jurusan->lam, $tanggalKedaluwarsa);

        if ($jadwal) {
            \Log::info("Found schedule:", [
                'jadwalLamId' => $jadwal->_id,
                'tanggalAkhirSubmit' => $jadwal->tanggalSubmit,
                'tanggalPengumuman' => $jadwal->tanggalPengumuman
            ]);

            $this->jadwalLamId = $jadwal->_id;
            $this->tanggalAkhirSubmit = $jadwal->tanggalSubmit;
            $this->tanggalPengumuman = $jadwal->tanggalPengumuman;
            $this->save();
        } else {
            \Log::info("No appropriate schedule found");
        }
    }

    private function findAppropriateSchedule($lam, $tanggalKedaluwarsa)
    {
        $baseQuery = JadwalLam::where('lamId', $lam->_id);

        if ($lam->hasBatch) {
            // Logic untuk LAM dengan batch
            // Cari jadwal yang tanggal pengumumannya sebelum kedaluwarsa
            $jadwal = $baseQuery->where('tanggalPengumuman', '<', $tanggalKedaluwarsa)
                ->orderBy('tanggalPengumuman', 'desc')
                ->first();

            if (!$jadwal) {
                // Jika tidak ada, cari jadwal terdekat setelahnya
                $jadwal = $baseQuery->where('tanggalPengumuman', '>=', $tanggalKedaluwarsa)
                    ->orderBy('tanggalPengumuman', 'asc')
                    ->first();
            }

            return $jadwal;
        } else {
            // Logic untuk LAM tanpa batch
            $jadwal = $baseQuery->where('tahun', $tanggalKedaluwarsa->year)
                ->first();

            if (!$jadwal) {
                // Cek tahun berikutnya
                $jadwal = $baseQuery->where('tahun', $tanggalKedaluwarsa->year + 1)
                    ->first();
            }

            return $jadwal;
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($prodi) {
            $prodi->assignJadwalLam();
        });

        static::updating(function ($prodi) {
            if ($prodi->isDirty('tanggalKedaluwarsa')) {
                $prodi->assignJadwalLam();
            }
        });
    }
}