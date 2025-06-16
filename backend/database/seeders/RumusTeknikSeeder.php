<?php

namespace Database\Seeders;

use App\Models\Rumus;
use Illuminate\Database\Seeder;

class RumusTeknikSeeder extends Seeder
{
    /**
     * Run the database seeds for formulas referencing LKPS tables.
     *
     * @return void
     */
    public function run()
    {
        // Clear existing formulas that reference LKPS tables
        Rumus::where('reference_type', 'LKPS')->delete();

        // Insert all formulas referencing LKPS tables
        $this->seedLKPSFormulas();
    }

    private function seedLKPSFormulas()
    {
        $formulas = [
            // Butir 10A - Table 1 LKPS (Kerjasama pendidikan, penelitian, dan PkM)
            [
                'nomor' => '10',
                'sub' => 'A',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 1 LKPS',
                'conditions' => [
                    [
                        'condition' => 'RK >= 4',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'RK < 4',
                        'formula' => 'RK'
                    ]
                ],
                'main_formula' => 'RK = ((a * N1) + (b * N2) + (c * N3)) / NDTPS',
                'parameters' => [
                    'a' => 2,
                    'b' => 1,
                    'c' => 3
                ],
                'description' => 'Kerjasama pendidikan, penelitian, dan PkM yang relevan dengan program studi',
                'notes' => 'N1 = Jumlah kerjasama pendidikan. N2 = Jumlah kerjasama penelitian. N3 = Jumlah kerjasama PkM. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 10B - Table 1 LKPS (Kerjasama tingkat internasional, nasional, wilayah/lokal)
            [
                'nomor' => '10',
                'sub' => 'B',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 1 LKPS',
                'conditions' => [
                    [
                        'condition' => 'NI >= a && NN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < NI < a || 0 < NN < b || 0 < NW <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'Skor = ((2 * A) + B) / 3',
                'parameters' => [
                    'a' => 1,
                    'b' => 4,
                    'c' => 6,
                    'A' => 'NI/a',
                    'B' => 'NN/b',
                    'C' => 'NW/c'
                ],
                'description' => 'Kerjasama tingkat internasional, nasional, wilayah/lokal yang relevan dengan program studi',
                'notes' => 'NI = Jumlah kerjasama tingkat internasional. NN = Jumlah kerjasama tingkat nasional. NW = Jumlah kerjasama tingkat wilayah/lokal.'
            ],
            // Butir 13B - Table 2.a.2 LKPS (Keketatan seleksi)
            [
                'nomor' => '13',
                'sub' => 'B',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 2.a.2) LKPS',
                'conditions' => [
                    [
                        'condition' => 'Rasio >= 3',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'Rasio < 3',
                        'formula' => '(4 * Rasio) / 3'
                    ]
                ],
                'main_formula' => 'Skor = (A + B) / 2',
                'description' => 'Keketatan seleksi'
            ],

            // Butir 15 - Table 3.a.1 & 3.a.4 LKPS
            [
                'nomor' => '15',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.1) LKPS, Tabel 3.a.4) LKPS',
                'conditions' => [
                    [
                        'condition' => 'NDTPS >= 12 && PDTT <= 10',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '3 <= NDTPS && NDTPS < 12 && 10 < PDTT && PDTT <= 40',
                        'formula' => '2 + 2 * (A * B)'
                    ],
                    [
                        'condition' => 'NDTPS >= 12 && 10 < PDTT && PDTT <= 40',
                        'formula' => '2 + (2 * B)'
                    ],
                    [
                        'condition' => '3 <= DTPS && DTPS < 12 && PDTT > 40',
                        'formula' => '1'
                    ],
                    [
                        'condition' => 'NDTPS <= 3 && PDTT == 0',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'PDTT = (NDTT / (NDT + NDTT)) * 100%, A = ((NDTPS-3)/9), B = (40%-PDTT)/30%',
                'description' => 'Kecukupan jumlah DTPS',
                'notes' => 'NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. NDT = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi.'
            ],

            // Butir 16 - Table 3.a.1 LKPS
            [
                'nomor' => '16',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PDS3 >= 10',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PDS3 < 10',
                        'formula' => '2 + (20 * PDS3)'
                    ]
                ],
                'main_formula' => 'PDS3 = (NDS3 / NDTPS) * 100%',
                'description' => 'Kualifikasi akademik DTPS',
                'notes' => 'NDS3 = Jumlah DTPS yang berpendidikan tertinggi Doktor/Doktor Terapan/Subspesialis. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 17 - Table 3.a.1 LKPS
            [
                'nomor' => '17',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PDSK >= 50',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PDSK < 50',
                        'formula' => '1 + (6 * PDSK)'
                    ]
                ],
                'main_formula' => 'PDSK = (NDSK / NDTPS) * 100%',
                'description' => 'Sertifikasi kompetensi/profesi/industri DTPS',
                'notes' => 'NDSK = Jumlah DTPS yang memiliki sertifikat kompetensi/profesi/industri. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 18 - Table 3.a.1 LKPS
            [
                'nomor' => '18',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PGBLKL >= 40',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PGBLKL < 40',
                        'formula' => '2 + ((20 * PGBLKL) / 4)'
                    ]
                ],
                'main_formula' => 'PGBLKL = ((NDGB + NDLK + NDL) / NDTPS) * 100%',
                'description' => 'Jabatan akademik DTPS',
                'notes' => 'NDGB = Jumlah DTPS yang memiliki jabatan akademik Guru Besar. NDLK = Jumlah DTPS yang memiliki jabatan akademik Lektor Kepala. NDL = Jumlah DTPS yang memiliki jabatan akademik Lektor.'
            ],

            // Butir 19 - Tables 2.a.1 & 3.a.1 LKPS
            [
                'nomor' => '19',
                'formula_type' => 'range',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 2.a.1) LKPS, Tabel 3.a.1) LKPS',
                'range_field' => 'RMD',
                'ranges' => [
                    ['min' => 10, 'max' => 20, 'score' => 4],
                    ['min' => 0, 'max' => 10, 'formula' => '(2 * RMD) / 5'],
                    ['min' => 20, 'max' => 30, 'formula' => '(60 - (2 * RMD)) / 5'],
                    ['min' => 30, 'max' => null, 'score' => 0]
                ],
                'main_formula' => 'RMD = NM / NDTPS',
                'description' => 'Rasio jumlah mahasiswa program studi terhadap jumlah DTPS',
                'notes' => 'NM = Jumlah mahasiswa pada saat TS. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 20 - Table 3.a.2 LKPS
            [
                'nomor' => '20',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.2) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RDPU <= 6',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '6 < RDPU && RDPU <= 10',
                        'formula' => '7 - (RDPU / 2)'
                    ],
                    [
                        'condition' => 'RDPU > 10',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'RDPU = Rata-rata jumlah bimbingan sebagai pembimbing utama di seluruh program/semester',
                'description' => 'Penugasan DTPS sebagai pembimbing utama tugas akhir mahasiswa'
            ],

            // Butir 21 - Table 3.a.3 LKPS
            [
                'nomor' => '21',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.3) LKPS',
                'conditions' => [
                    [
                        'condition' => 'EWMP == 14',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '12 <= EWMP && EWMP < 14',
                        'formula' => '((3 * EWMP) - 34) / 2'
                    ],
                    [
                        'condition' => '14 < EWMP && EWMP <= 16',
                        'formula' => '(50 - (3 * EWMP)) / 2'
                    ],
                    [
                        'condition' => 'EWMP < 12 || EWMP > 16',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => null,
                'description' => 'Ekuivalensi Waktu Mengajar Penuh DTPS'
            ],

            // Butir 22 - Table 3.a.4 LKPS
            [
                'nomor' => '22',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.4) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PDTT == 0 && NDTPS >= 5',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < PDTT && PDTT <= 40 && NDTPS >= 5',
                        'formula' => '4 - (5 * PDTT)'
                    ],
                    [
                        'condition' => '40 < PDTT && PDTT <= 60 && NDTPS >= 5',
                        'formula' => '1'
                    ],
                    [
                        'condition' => 'PDTT > 60',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'PDTT = (NDTT / (NDT + NDTT)) * 100%',
                'description' => 'Dosen tidak tetap',
                'notes' => 'NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. NDT = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi.'
            ],

            // Butir 23 - Table 3.a.5 LKPS
            [
                'nomor' => '23',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.a.5) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PMKI >= 20',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PMKI < 20',
                        'formula' => '2 + (10 * PMKI)'
                    ]
                ],
                'main_formula' => 'PMKI = (MKKI / MKK) * 100%',
                'description' => 'Keterlibatan dosen industri/praktisi',
                'notes' => 'MKKI = Jumlah mata kuliah kompetensi yang diampu oleh dosen industri/praktisi. MKK = Jumlah mata kuliah kompetensi.'
            ],

            // Butir 24 - Table 3.b.1 LKPS
            [
                'nomor' => '24',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RRD >= 0.25',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'RRD < 0.25',
                        'formula' => '2 + (8 * RRD)'
                    ]
                ],
                'main_formula' => 'RRD = NRD / NDTPS',
                'description' => 'Pengakuan/rekognisi atas kepakaran/prestasi/kinerja DTPS',
                'notes' => 'NRD = Jumlah pengakuan atas prestasi/kinerja DTPS yang relevan dengan bidang keahlian dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 25 - Table 3.b.2 LKPS
            [
                'nomor' => '25',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.2) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RL && RL <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RL = NL / 3 / NDTPS',
                'parameters' => [
                    'a' => 0.05,
                    'b' => 0.3,
                    'c' => 1,
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RL/c'
                ],
                'description' => 'Kegiatan penelitian DTPS yang relevan dengan bidang program studi dalam 3 tahun terakhir',
                'notes' => 'NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NL = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 26 - Table 3.b.3 LKPS
            [
                'nomor' => '26',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.3) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RL && RL <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RI = NI / 3 / NDTPS, RN = NN / 3 / NDTPS, RL = NL / 3 / NDTPS',
                'parameters' => [
                    'a' => 0.05,
                    'b' => 0.3,
                    'c' => 1,
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RL/c'
                ],
                'description' => 'Kegiatan PkM DTPS yang relevan dengan bidang program studi dalam 3 tahun terakhir',
                'notes' => 'NI = Jumlah PkM dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir. NN = Jumlah PkM dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir. NL = Jumlah PkM dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 27 - Table 3.b.5 LKPS
            [
                'nomor' => '27',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.5) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RW && RW <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RW = (NA1 + NB1 + NC1) / NDTPS, RN = (NA2 + NA3 + NB2 + NC2) / NDTPS, RI = (NA4 + NB3 + NC3) / NDTPS',
                'parameters' => [
                    'a' => 0.05,
                    'b' => 0.5,
                    'c' => 1,
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RW/c'
                ],
                'description' => 'Pagelaran/pameran/presentasi/publikasi ilmiah dengan tema yang relevan dengan bidang Program Studi',
                'notes' => 'NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi. NA2 = Jumlah publikasi di jurnal nasional terakreditasi. NA3 = Jumlah publikasi di jurnal internasional. NA4 = Jumlah publikasi di jurnal internasional bereputasi. NB1 = Jumlah publikasi di seminar wilayah/lokal/PT. NB2 = Jumlah publikasi di seminar nasional. NB3 = Jumlah publikasi di seminar internasional. NC1 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat wilayah. NC2 = Jumlah pagelaran/pameran/presentasi dalam forum di tingkat nasional. NC3 = Jumlah pagealran/pameran/presentasi dalam forum di tingkat internasional.'
            ],

            // Butir 28 - Table 3.b.7 LKPS
            [
                'nomor' => '28',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.7) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RS >= 1',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'RS < 1',
                        'formula' => '2 + (2 * RS)'
                    ]
                ],
                'main_formula' => 'RS = NAPJ / NDTPS',
                'description' => 'Produk/jasa yang diadopsi oleh industri/masyarakat',
                'notes' => 'NAPJ = Jumlah produk/jasa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir. NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi.'
            ],

            // Butir 29 - Table 3.b.8 LKPS
            [
                'nomor' => '29',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 3.b.8) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RLP >= 1',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'RLP < 1',
                        'formula' => '2 + (2 * RLP)'
                    ]
                ],
                'main_formula' => 'RLP = (2 * (NA + NB + NC) + ND) / NDTPS',
                'description' => 'Luaran penelitian dan PkM yang dihasilkan DTPS',
                'notes' => 'NA = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana). NB = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Hak Cipta, Desain Produk Industri, Perlindungan Varietas Tanaman, Desain Tata Letak Sirkuit Terpadu, dll.). NC = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk (Produk Terstandarisasi, Produk Tersertifikasi), Karya Seni, Rekayasa Sosial. ND = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.'
            ],

            // Butir 32 - Table 4.a LKPS
            [
                'nomor' => '32',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 4.a LKPS',
                'conditions' => [
                    [
                        'condition' => 'DOP >= 20',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'DOP < 20',
                        'formula' => 'DOP / 5'
                    ]
                ],
                'main_formula' => null,
                'description' => 'Biaya operasional pendidikan',
                'notes' => 'DOP = Rata-rata dana operasional pendidikan/mahasiswa/ tahun dalam 3 tahun terakhir (dalam juta rupiah).'
            ],
            // Butir 33 - Table 4.a LKPS (continued)
            [
                'nomor' => '33',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 4.a LKPS',
                'conditions' => [
                    [
                        'condition' => 'DPD >= 10',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'DPD < 10',
                        'formula' => '(2 * DPD) / 5'
                    ]
                ],
                'main_formula' => null,
                'description' => 'Dana penelitian DTPS',
                'notes' => 'DPD = Rata-rata dana penelitian DTPS/ tahun dalam 3 tahun terakhir (dalam juta rupiah).'
            ],

            // Butir 34 - Table 4.a LKPS
            [
                'nomor' => '34',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 4.a LKPS',
                'conditions' => [
                    [
                        'condition' => 'DPkMD >= 5',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'DPkMD < 5',
                        'formula' => '(4 * DPkMD) / 5'
                    ]
                ],
                'main_formula' => null,
                'description' => 'Dana pengabdian kepada masyarakat DTPS',
                'notes' => 'DPkMD = Rata-rata dana PkM DTPS/ tahun dalam 3 tahun terakhir (dalam juta rupiah).'
            ],

            // Butir 42 - Table 5.a.1 LKPS
            [
                'nomor' => '42',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 5.a.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PJP >= 50',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PJP < 50',
                        'formula' => '8 * PJP'
                    ]
                ],
                'main_formula' => 'PJP = (JP / JB) * 100%',
                'description' => 'Pembelajaran yang dilaksanakan dalam bentuk praktikum, praktik studio, praktik bengkel, atau praktik lapangan',
                'notes' => 'JP = Jam pembelajaran praktikum, praktik studio, praktik bengkel, atau praktik lapangan (termasuk KKN). JB = Jam pembelajaran total selama masa pendidikan.'
            ],

            // Butir 45 - Table 5.c LKPS
            [
                'nomor' => '45',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 5.c LKPS',
                'conditions' => [
                    [
                        'condition' => 'NMKI > 3',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'NMKI == 2 || NMKI == 3',
                        'formula' => '3'
                    ],
                    [
                        'condition' => 'NMKI == 1',
                        'formula' => '2'
                    ],
                    [
                        'condition' => 'NMKI < 1',
                        'formula' => '1'
                    ]
                ],
                'main_formula' => null,
                'description' => 'Integrasi kegiatan penelitian dan PkM dalam pembelajaran oleh DTPS dalam 3 tahun terakhir',
                'notes' => 'NMKI = Jumlah mata kuliah yang dikembangkan berdasarkan hasil penelitian/PkM DTPS dalam 3 tahun terakhir.'
            ],

            // Butir 47 - Table 5.d LKPS
            [
                'nomor' => '47',
                'sub' => 'A',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 5.d LKPS',
                'conditions' => [
                    [
                        'condition' => 'TKM >= 75',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'TKM >= 25 && TKM < 75',
                        'formula' => '(8 * TKM) - 2'
                    ],
                    [
                        'condition' => 'TKM < 25',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'TKM = ƩTKMi / 5',
                'description' => 'Tingkat kepuasan mahasiswa terhadap proses pendidikan',
                'notes' => 'TKM1: Reliability; TKM2: Responsiveness; TKM3: Assurance; TKM4: Empathy; TKM5: Tangible. Tingkat kepuasan mahasiswa pada aspek ke-i dihitung dengan rumus: TKMi = (4 * ai) + (3 * bi) + (2 * ci) + di, i = 1, 2, ..., 7, dimana: ai = persentase "Sangat Baik"; bi = persentase "Baik"; ci = persentase "Cukup"; di = persentase "Kurang".'
            ],

            // Butir 50 - Table 7 LKPS
            [
                'nomor' => '50',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 7 LKPS',
                'conditions' => [
                    [
                        'condition' => 'PPkMDM >= 25',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PPkMDM < 25',
                        'formula' => '2 + (8 * PPkMDM)'
                    ]
                ],
                'main_formula' => 'PPkMDM = (NPkMM / NPkMD) * 100%',
                'description' => 'PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir',
                'notes' => 'NPkMM = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. NPkMD = Jumlah judul PkM DTPS dalam 3 tahun terakhir.'
            ],

            // Butir 52 - Table 8.a LKPS
            [
                'nomor' => '52',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.a LKPS',
                'conditions' => [
                    [
                        'condition' => 'RIPK >= 3.25',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'RIPK >= 2.00 && RIPK < 3.25',
                        'formula' => '((8 * RIPK) - 6) / 5'
                    ],
                    [
                        'condition' => 'RIPK < 2.00',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'RIPK = Rata-rata IPK lulusan dalam 3 tahun terakhir',
                'description' => 'IPK lulusan'
            ],

            // Butir 53 - Table 8.b.1 LKPS
            [
                'nomor' => '53',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.b.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RW && RW <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RI = NI / NM, RN = NN / NM, RW = NW / NM',
                'parameters' => [
                    'a' => 0.0005, // 0.05%
                    'b' => 0.01, // 1%
                    'c' => 0.02, // 2%
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RW/c'
                ],
                'description' => 'Prestasi mahasiswa di bidang akademik dalam 3 tahun terakhir',
                'notes' => 'NI = Jumlah prestasi akademik internasional. NN = Jumlah prestasi akademik nasional. NW = Jumlah prestasi akademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS.'
            ],

            // Butir 54 - Table 8.b.2 LKPS
            [
                'nomor' => '54',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.b.2) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RW && RW <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RI = NI / NM, RN = NN / NM, RW = NW / NM',
                'parameters' => [
                    'a' => 0.001, // 0.1%
                    'b' => 0.02, // 2%
                    'c' => 0.04, // 4%
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RW/c'
                ],
                'description' => 'Prestasi mahasiswa di bidang nonakademik dalam 3 tahun terakhir',
                'notes' => 'NI = Jumlah prestasi nonakademik internasional. NN = Jumlah prestasi nonakademik nasional. NW = Jumlah prestasi nonakademik wilayah/lokal. NM = Jumlah mahasiswa pada saat TS.'
            ],

            // Butir 55 - Table 8.c LKPS
            [
                'nomor' => '55',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.c LKPS',
                'conditions' => [
                    [
                        'condition' => 'MS >= 3 && MS <= 3.5',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'MS > 3.5 && MS <= 5',
                        'formula' => '(40 - (8 * MS)) / 3'
                    ],
                    [
                        'condition' => 'MS < 3',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'MS = Rata-rata masa studi lulusan (tahun)',
                'description' => 'Masa studi'
            ],

            // Butir 56 - Table 8.c LKPS
            [
                'nomor' => '56',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.c LKPS',
                'conditions' => [
                    [
                        'condition' => 'PTW >= 70',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PTW < 70',
                        'formula' => '1 + ((30 * PTW) / 70)'
                    ]
                ],
                'main_formula' => 'PTW = Persentase kelulusan tepat waktu',
                'description' => 'Kelulusan tepat waktu'
            ],

            // Butir 57 - Table 8.c LKPS
            [
                'nomor' => '57',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.c LKPS',
                'conditions' => [
                    [
                        'condition' => 'MDO <= 6',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'MDO > 6 && MDO < 45',
                        'formula' => '(180 - (400 * MDO)) / 39'
                    ],
                    [
                        'condition' => 'MDO >= 45',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'MDO = ((a)-(b)-(c) / (a)) * 100%',
                'description' => 'Persentase mahasiswa yang DO atau mengundurkan diri',
                'notes' => 'a = Jumlah mahasiswa pada angkatan yang diamati, b = jumlah mahasiswa yang lulus, c = jumlah mahasiswa yang masih aktif'
            ],

            // Butir 59 - Table 8.d.1 LKPS
            [
                'nomor' => '59',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.d.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'WT < 3',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'WT >= 3 && WT <= 6',
                        'formula' => '(24 - (4 * WT)) / 3'
                    ],
                    [
                        'condition' => 'WT > 6',
                        'formula' => '0'
                    ]
                ],
                'main_formula' => 'WT = waktu tunggu lulusan untuk mendapatkan pekerjaan pertama dalam 3 tahun, mulai TS-4 s.d. TS-2',
                'description' => 'Waktu tunggu'
            ],

            // Butir 60 - Table 8.d.2 LKPS
            [
                'nomor' => '60',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.d.2) LKPS',
                'conditions' => [
                    [
                        'condition' => 'PBS >= 80',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'PBS < 80',
                        'formula' => '5 * PBS / 100'
                    ]
                ],
                'main_formula' => 'PBS = Kesesuaian bidang kerja lulusan saat mendapatkan pekerjaan pertama dalam 3 tahun, mulai TS-4 s.d. TS-2',
                'description' => 'Kesesuaian bidang kerja'
            ],

            // Butir 61 - Table 8.e.1 LKPS
            [
                'nomor' => '61',
                'formula_type' => 'complex',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.e.1) LKPS',
                'conditions' => [
                    [
                        'condition' => 'RI >= a && RN >= b',
                        'formula' => '4'
                    ],
                    [
                        'condition' => '0 < RI && RI < a || 0 < RN && RN < b || 0 < RW && RW <= c',
                        'formula' => '4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))'
                    ]
                ],
                'main_formula' => 'RI = (NI / NL) * 100%, RN = (NN / NL) * 100%, RW = (NW / NL) * 100%',
                'parameters' => [
                    'a' => 5, // 5%
                    'b' => 20, // 20%
                    'c' => 90, // 90%
                    'A' => 'RI/a',
                    'B' => 'RN/b',
                    'C' => 'RW/c'
                ],
                'description' => 'Tingkat dan ukuran tempat kerja lulusan',
                'notes' => 'NI = Jumlah lulusan yang bekerja di badan usaha tingkat multi nasional/internasional. NN = Jumlah lulusan yang bekerja di badan usaha tingkat nasional atau berwirausaha yang berizin. NW = Jumlah lulusan yang bekerja di badan usaha tingkat wilayah/lokal atau berwirausaha tidak berizin. NL = Jumlah lulusan.'
            ],

            // Butir 62 - Table 8.e.2 LKPS
            [
                'nomor' => '62',
                'formula_type' => 'average',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.e.2) LKPS',
                'main_formula' => 'Skor = ƩTKi / 7',
                'description' => 'Tingkat kepuasan pengguna lulusan',
                'notes' => 'Tingkat kepuasan aspek ke-i dihitung dengan rumus sebagai berikut: TKi = (4 * ai) + (3 * bi) + (2 * ci) + di i = 1, 2, ..., 7. ai = persentase "sangat baik". bi = persentase "baik". ci = persentase "cukup". di = persentase "kurang".'
            ],

            // Butir 63 - Table 8.f.4 LKPS
            [
                'nomor' => '63',
                'formula_type' => 'conditional',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 8.f.4) LKPS',
                'conditions' => [
                    [
                        'condition' => 'NAPJ >= 2',
                        'formula' => '4'
                    ],
                    [
                        'condition' => 'NAPJ == 1',
                        'formula' => '3'
                    ],
                    [
                        'condition' => 'NAPJ == 0',
                        'formula' => '2'
                    ]
                ],
                'main_formula' => 'NAPJ = Jumlah produk/jasa karya mahasiswa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir',
                'description' => 'Produk/jasa karya mahasiswa, yang dihasilkan secara mandiri atau bersama DTPS, yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir'
            ],

            // Tables from section D (Penjaminan Mutu)
            // Butir 65 - Table 9.b LKPS
            [
                'nomor' => '65',
                'formula_type' => 'descriptive',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 9.b LKPS',
                'main_formula' => null,
                'description' => 'Ketersediaan dokumen sistem penjaminan mutu (Kebijakan SPMI, Manual SPMI, Standar SPMI dan Formulir SPMI) dan memiliki pengakuan mutu dari lembaga audit eksternal, lembaga akreditasi, dan lembaga sertifikasi'
            ],

            // Butir 66 - Table 9.a LKPS
            [
                'nomor' => '66',
                'formula_type' => 'descriptive',
                'reference_type' => 'LKPS',
                'reference_table' => 'Tabel 9.a LKPS',
                'main_formula' => null,
                'description' => 'Keterlaksanaan Sistem Penjaminan Mutu Internal (SPMI)'
            ]
        ];

        foreach ($formulas as $formula) {
            Rumus::create($formula);
        }
    }
}