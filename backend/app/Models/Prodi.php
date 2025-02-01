<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

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
        'tanggalAkhirSubmit',
    ];

    public function getJurusanKeyword()
    {
        $mapping = [
            'Konstruksi Sipil' => 'Teknik Sipil',
            'Konstruksi Gedung' => 'Teknik Sipil',
            'Perancangan Jalan' => 'Teknik Sipil',
            'Perawatan Gedung' => 'Teknik Sipil',
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
            if (str_contains($this->name, $prodiKeyword)) {
                return $jurusanName;
            }
        }

        return null;
    }

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'jurusanId', '_id');
    }
}