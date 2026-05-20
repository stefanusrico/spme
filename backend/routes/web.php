<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    try {
        return response()->json([
            'status' => 'success',
            'message' => 'Laravel is running!',
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'environment' => app()->environment(),
            'app_debug' => config('app.debug'),
            'db_connection' => config('database.default')
        ]);
    } catch (Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ], 500);
    }
});

Route::get('/debug/jabatan-count', function () {
    try {
        // 1. Corrected and completed data array
        $sourceData = [
            ['selected' => true, 'jabatan_akademik' => 'Guru Besar', 'nama_dosen' => 'Prof. Dr. Andriyanto Setyawan, S.T., M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Ir. Budi Santoso, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Dr. Siti Aminah, S.T., M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Ir. Joko Widodo, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli', 'nama_dosen' => 'Dra. Rina Wulandari, M.Si.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar', 'nama_dosen' => 'Drs. Ahmad Fauzi', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Siti Nurhaliza, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Ir. Bambang Prasetyo, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Dr. Rudi Hartono, S.T., M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Endang Susanti, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Agus Setiawan, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar', 'nama_dosen' => 'Drs. Budi Santoso', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Ir. Siti Aminah, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli', 'nama_dosen' => 'Dra. Rina Wulandari, M.Si.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar', 'nama_dosen' => 'Drs. Ahmad Fauzi', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Siti Nurhaliza, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Ir. Bambang Prasetyo, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor', 'nama_dosen' => 'Dr. Rudi Hartono, S.T., M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Endang Susanti, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala', 'nama_dosen' => 'Dr. Agus Setiawan, M.T.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar', 'nama_dosen' => 'Drs. Budi Santoso', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Tidak Sesuai'],
            ['selected' => true, 'jabatan_akademik' => 'Guru Besar', 'nama_dosen' => 'Prof. Dr. Dewi Lestari, M.Sc.', 'kesesuaian_dengan_kompetensi_inti_ps_3' => 'Sesuai'],
        ];

        $dataCollection = collect($sourceData);

        $filteredAndCleaned = $dataCollection->filter(function ($item) {
            return ($item['selected'] ?? false) === true &&
                ($item['kesesuaian_dengan_kompetensi_inti_ps_3'] ?? '') === 'Sesuai';
        })->map(function ($item) {
            $item['jabatan_akademik'] = trim($item['jabatan_akademik']);
            return $item;
        });

        $groupedByJabatan = $filteredAndCleaned->groupBy('jabatan_akademik');

        // ======================= FIX IS HERE =======================
        // By adding 'use Illuminate\Support\Collection' at the top,
        // PHP now knows that 'Collection' refers to the correct class.
        $counts = $groupedByJabatan->map(fn(Collection $group) => $group->count());
        // =========================================================

        $expectedCounts = [
            'Guru Besar' => 2,
            'Lektor Kepala' => 7,
            'Lektor' => 4,
            'Asisten Ahli' => 2,
            'Tenaga Pengajar' => 0,
        ];

        return response()->json([
            'summary' => [
                'total_rows_in_source' => $dataCollection->count(),
                'total_rows_after_filtering' => $filteredAndCleaned->count(),
                'message' => 'Counts only include selected lecturers where "kesesuaian" is "Sesuai".',
            ],
            'counts_by_jabatan' => $counts,
            'expected_vs_actual' => [
                'guru_besar' => [
                    'expected' => $expectedCounts['Guru Besar'],
                    'actual' => $counts->get('Guru Besar', 0),
                    'match' => $counts->get('Guru Besar', 0) === $expectedCounts['Guru Besar'],
                ],
                'lektor_kepala' => [
                    'expected' => $expectedCounts['Lektor Kepala'],
                    'actual' => $counts->get('Lektor Kepala', 0),
                    'match' => $counts->get('Lektor Kepala', 0) === $expectedCounts['Lektor Kepala'],
                ],
                'lektor' => [
                    'expected' => $expectedCounts['Lektor'],
                    'actual' => $counts->get('Lektor', 0),
                    'match' => $counts->get('Lektor', 0) === $expectedCounts['Lektor'],
                ],
                'asisten_ahli' => [
                    'expected' => $expectedCounts['Asisten Ahli'],
                    'actual' => $counts->get('Asisten Ahli', 0),
                    'match' => $counts->get('Asisten Ahli', 0) === $expectedCounts['Asisten Ahli'],
                ],
                'tenaga_pengajar' => [
                    'expected' => $expectedCounts['Tenaga Pengajar'],
                    'actual' => $counts->get('Tenaga Pengajar', 0),
                    'match' => $counts->get('Tenaga Pengajar', 0) === $expectedCounts['Tenaga Pengajar'],
                ],
            ],
            'detailed_breakdown_of_counted_data' => $groupedByJabatan,
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'An error occurred during processing.',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], 500);
    }
});

Route::get('/debug/pgblkl-test', function () {
    try {
        // Data aktual dari database Anda (31 dosen yang selected=true)
        $actualData = [
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 1
            ['selected' => true, 'jabatan_akademik' => 'Guru Besar'],        // 2 - NDGB
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar'],   // 3
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 4
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 5
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 6 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],      // 7
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 8 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 9
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 10 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 11 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 12
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 13
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar'],   // 14
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 15 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 16 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],      // 17
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar'],   // 18
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 19
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 20 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 21
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],      // 22
            ['selected' => true, 'jabatan_akademik' => 'Guru Besar'],        // 23 - NDGB
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 24 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 25
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 26
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],      // 27
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],            // 28 - NDL
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 29
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],     // 30
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],      // 31
        ];

        // Manual count
        $manualCounts = [
            'NDT' => count($actualData), // Total selected = 31
            'NDGB' => 0, // Guru Besar
            'NDLK' => 0, // Lektor Kepala
            'NDL' => 0,  // Lektor
            'NDAA' => 0, // Asisten Ahli
            'NDTP' => 0, // Tenaga Pengajar
        ];

        foreach ($actualData as $row) {
            if ($row['selected']) {
                $jabatan = $row['jabatan_akademik'];
                switch ($jabatan) {
                    case 'Guru Besar':
                        $manualCounts['NDGB']++;
                        break;
                    case 'Lektor Kepala':
                        $manualCounts['NDLK']++;
                        break;
                    case 'Lektor':
                        $manualCounts['NDL']++;
                        break;
                    case 'Asisten Ahli':
                        $manualCounts['NDAA']++;
                        break;
                    case 'Tenaga Pengajar':
                        $manualCounts['NDTP']++;
                        break;
                }
            }
        }

        // Manual PGBLKL calculation
        $manualPGBLKL = (($manualCounts['NDGB'] + $manualCounts['NDLK'] + $manualCounts['NDL']) / 12) * 100;

        // Test dengan parser
        $table = \App\Models\Lkps\LkpsTable::where('kode', '3a1')->first();
        if (!$table) {
            return response()->json(['error' => 'Table 3a1 not found'], 404);
        }

        $parser = new \App\Services\ExcelFormulaParser($table);

        // Test formula step by step
        $pgblklFormula = '=(NDGB + NDLK + NDL) / NDTPS * 100';

        \Log::info("🔥 MANUAL DEBUG PGBLKL", [
            'manual_counts' => $manualCounts,
            'manual_pgblkl' => $manualPGBLKL,
            'formula' => $pgblklFormula
        ]);

        $parserResult = $parser->evaluateFormula($pgblklFormula, $actualData);
        $details = $parser->getLastCalculationDetails();

        return response()->json([
            'manual_counts' => $manualCounts,
            'manual_pgblkl_calculation' => [
                'formula' => '(NDGB + NDLK + NDL) / NDTPS * 100',
                'values' => "({$manualCounts['NDGB']} + {$manualCounts['NDLK']} + {$manualCounts['NDL']}) / 12 * 100",
                'result' => $manualPGBLKL
            ],
            'parser_result' => $parserResult,
            'parser_details' => $details,
            'is_correct' => abs($parserResult - $manualPGBLKL) < 0.01,
            'test_data_count' => count($actualData)
        ]);

    } catch (\Exception $e) {
        \Log::error("Debug PGBLKL error: " . $e->getMessage());
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

Route::get('/test/formula-debug', function () {
    try {
        // Simulate data untuk tabel 3a1
        $testData = [
            ['selected' => true, 'jabatan_akademik' => 'Guru Besar'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor Kepala'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],
            ['selected' => true, 'jabatan_akademik' => 'Lektor'],
            ['selected' => true, 'jabatan_akademik' => 'Asisten Ahli'],
            ['selected' => true, 'jabatan_akademik' => 'Tenaga Pengajar'],
        ];

        // Get table 3a1
        $table = \App\Models\Lkps\LkpsTable::where('kode', '3a1')->first();
        if (!$table) {
            return response()->json(['error' => 'Table 3a1 not found'], 404);
        }

        // Create parser
        $parser = new \App\Services\ExcelFormulaParser($table);

        // Test PGBLKL formula step by step
        $pgblklFormula = '=(NDGB + NDLK + NDL) / NDTPS * 100';

        \Log::info("🔥 DEBUGGING PGBLKL FORMULA", [
            'formula' => $pgblklFormula,
            'expected_values' => ['NDGB' => 1, 'NDLK' => 5, 'NDL' => 4, 'NDTPS' => 12],
            'expected_result' => 83.33
        ]);

        // Evaluate formula
        $result = $parser->evaluateFormula($pgblklFormula, $testData);
        $details = $parser->getLastCalculationDetails();

        return response()->json([
            'formula' => $pgblklFormula,
            'result' => $result,
            'expected_result' => 83.33,
            'is_correct' => abs($result - 83.33) < 0.01,
            'calculation_details' => $details,
            'test_data_count' => count($testData)
        ]);

    } catch (\Exception $e) {
        \Log::error("Test formula debug error: " . $e->getMessage());
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

Route::get('/debug', function () {
    return response()->json([
        'env_vars' => [
            'APP_ENV' => env('APP_ENV'),
            'APP_DEBUG' => env('APP_DEBUG'),
            'APP_KEY' => env('APP_KEY') ? 'SET' : 'NOT SET',
            'DB_CONNECTION' => env('DB_CONNECTION'),
            'MONGODB_URI' => env('MONGODB_URI') ? 'SET' : 'NOT SET',
        ]
    ]);
});

Route::get('/test-mongo', function () {
    try {
        $mongo = DB::connection('mongodb')->getMongoClient();
        return 'MongoDB Connection Successful!';
    } catch (\Exception $e) {
        return 'Failed to connect to MongoDB: ' . $e->getMessage();
    }
});