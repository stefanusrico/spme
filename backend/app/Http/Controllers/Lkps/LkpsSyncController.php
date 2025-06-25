<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Lkps\LkpsImportController;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsColumn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use MongoDB\BSON\ObjectId;
use Illuminate\Support\Str;

class LkpsSyncController extends Controller
{
    private $lkpsImportController;
    private $spreadsheetId;
    private $generatedStructure = [
        'tables' => 0,
        'columns' => 0
    ];
    private $attemptedTables = 0;
    private $successTables = 0;
    private $failedTables = 0;
    private $debug = false;
    private $syncLogs = [];

    public function syncLkpsStructure(Request $request)
    {
        set_time_limit(400);
        ini_set('memory_limit', '512M');

        try {
            $validated = $request->validate([
                'spreadsheet_id' => 'required|string',
                'program' => ['nullable', 'string', Rule::in(['D-IV', 'D-III'])],
                'clear_existing' => 'boolean',
                'debug' => 'boolean'
            ]);

            $this->spreadsheetId = $validated['spreadsheet_id'];
            $program = $validated['program'] ?? null;
            $clearExisting = $validated['clear_existing'] ?? false;
            $this->debug = $validated['debug'] ?? false;

            $this->addLog('info', "🚀 Memulai sinkronisasi LKPS struktur dari Google Sheets");
            if ($program) {
                $this->addLog('info', "🎯 Program filter: {$program}");
                $this->addLog('info', "🔧 CREATE MODE: Buat entri baru dengan strata {$program}");
                $this->addLog('info', "📋 Filter: " . ($program === 'D-IV' ? 'Hanya tabel dengan checkmark STr' : 'Hanya tabel dengan checkmark D3'));
                $this->addLog('info', "🔗 Kode tabel tetap original, entri terpisah per strata");
                $this->addLog('info', "🚫 TIDAK override existing entries");
            }
            $this->addLog('info', "📝 Spreadsheet ID: {$this->spreadsheetId}");
            $this->addLog('info', "♻️  Tidak membuat strata baru, hanya menggunakan yang sudah ada");

            $this->lkpsImportController = new LkpsImportController(new Request(['spreadsheet_id' => $this->spreadsheetId]));

            if ($clearExisting) {
                $this->clearExistingStructure();
            }

            // Fetch tables with strata mapping from Daftar Tabel
            $response = $this->fetchTablesFromGoogleSheet();
            if (!$response) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mendapatkan data dari Google Sheets',
                    'logs' => $this->syncLogs
                ], 500);
            }

            // Filter by program if specified
            if ($program) {
                $response = $this->filterTablesByProgram($response, $program);
            }

            // Create tables
            $this->createTables($response, $program);

            // Update column indices
            $this->updateColumnDataIndicesWithParent();

            // Final verification
            $finalVerification = $this->performFinalVerification($program);

            $this->addLog('success', "✅ Sinkronisasi selesai!");
            $this->addLog('info', "📊 Summary:");
            $this->addLog('info', "   - Tables: {$this->generatedStructure['tables']} (Success: {$this->successTables}, Failed: {$this->failedTables})");
            $this->addLog('info', "   - Columns: {$this->generatedStructure['columns']}");
            if ($program) {
                $this->addLog('info', "🔧 Mode: CREATE entri baru dengan strata {$program}");
                $this->addLog('info', "📋 Filter: " . ($program === 'D-IV' ? 'STr checkmarks only' : 'D3 checkmarks only'));
                $this->addLog('info', "🔗 Kode tabel: Original (multiple entries per code allowed)");
                $this->addLog('info', "🚫 No override: Existing entries preserved");
            } else {
                $this->addLog('info', "🔄 Mode: Mapping individual berdasarkan detected strata");
            }

            return response()->json([
                'success' => true,
                'message' => "Sinkronisasi LKPS berhasil" . ($program ? " untuk program {$program} (CREATE entri baru dengan strata {$program})" : ""),
                'program_filter' => $program,
                'create_separate_entries' => $program ? true : false,
                'target_strata' => $program,
                'original_table_codes' => true,
                'no_override' => true,
                'spreadsheet_id' => $this->spreadsheetId,
                'summary' => [
                    'tables_attempted' => $this->attemptedTables,
                    'tables_success' => $this->successTables,
                    'tables_failed' => $this->failedTables,
                    'total_columns' => $this->generatedStructure['columns']
                ],
                'verification' => $finalVerification,
                'logs' => $this->syncLogs
            ]);

        } catch (\Exception $e) {
            $this->addLog('error', "❌ Terjadi kesalahan: {$e->getMessage()}");
            Log::error('Error syncing LKPS structure via API: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat sinkronisasi',
                'error' => $e->getMessage(),
                'logs' => $this->syncLogs
            ], 500);
        }
    }

    /**
     * Fetch tables from Google Sheets with strata mapping
     */
    private function fetchTablesFromGoogleSheet()
    {
        try {
            $this->addLog('info', '📥 Mengambil data dari Google Sheets...');

            $request = new Request(['spreadsheet_id' => $this->spreadsheetId]);
            $response = $this->lkpsImportController->getAvailableTables($request);

            if (!isset($response->original)) {
                $this->addLog('error', 'Response tidak memiliki property "original"');
                return null;
            }

            $data = $response->original;

            if (!$data['success']) {
                $this->addLog('error', 'Google Sheets API mengembalikan error');
                return null;
            }

            $totalTables = $data['total_tables'] ?? count($data['mapping'] ?? []);
            $this->addLog('success', "✅ Berhasil mendapatkan {$totalTables} tabel dengan informasi strata");

            if ($this->debug && isset($data['strata_summary'])) {
                $this->addLog('debug', 'Strata summary: ' . json_encode($data['strata_summary']));
            }

            return $data;

        } catch (\Exception $e) {
            $this->addLog('error', "❌ Error fetching tables: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Filter tables by program based on checkmarks in D3/STr columns
     */
    private function filterTablesByProgram($response, $program)
    {
        $this->addLog('info', "🔍 Memfilter tabel untuk program {$program}...");

        $filteredMapping = [];
        $filteredCount = 0;
        $totalCount = count($response['mapping'] ?? []);

        // Debug: log strata distribution
        $strataDistribution = [
            'has_d3_checkmark' => 0,
            'has_str_checkmark' => 0,
            'has_both_checkmarks' => 0,
            'no_checkmarks' => 0
        ];

        foreach ($response['mapping'] as $code => $tableInfo) {
            $strataInfo = $tableInfo['strata_info'] ?? [];

            $hasD3 = $strataInfo['D3'] ?? false;
            $hasStr = $strataInfo['STr'] ?? false;

            // Update distribution stats
            if ($hasD3 && $hasStr) {
                $strataDistribution['has_both_checkmarks']++;
            } elseif ($hasD3) {
                $strataDistribution['has_d3_checkmark']++;
            } elseif ($hasStr) {
                $strataDistribution['has_str_checkmark']++;
            } else {
                $strataDistribution['no_checkmarks']++;
            }

            $shouldInclude = false;
            $reason = '';

            // PERUBAHAN UTAMA: Cek langsung dari strata_info untuk D3 dan STr
            if ($program === 'D-IV') {
                // Untuk D-IV, cek apakah ada checkmark di kolom STr
                if ($hasStr) {
                    $shouldInclude = true;
                    $reason = "STr checkmark found (for D-IV program)";
                } else {
                    $shouldInclude = false;
                    $reason = "no STr checkmark";
                }
            } elseif ($program === 'D-III') {
                // Untuk D-III, cek apakah ada checkmark di kolom D3
                if ($hasD3) {
                    $shouldInclude = true;
                    $reason = "D3 checkmark found (for D-III program)";
                } else {
                    $shouldInclude = false;
                    $reason = "no D3 checkmark";
                }
            }

            if ($shouldInclude) {
                $filteredMapping[$code] = $tableInfo;
                $filteredCount++;

                if ($this->debug) {
                    $this->addLog('debug', "  ✓ Include: {$tableInfo['title']} ({$reason})");
                }
            } else {
                if ($this->debug) {
                    $this->addLog('debug', "  ✗ Exclude: {$tableInfo['title']} ({$reason})");
                }
            }
        }

        $this->addLog('info', "📊 Hasil filtering: {$filteredCount} dari {$totalCount} tabel untuk program {$program}");
        $this->addLog('info', "📈 Distribusi checkmarks:");
        $this->addLog('info', "   - D3 only: {$strataDistribution['has_d3_checkmark']}");
        $this->addLog('info', "   - STr only: {$strataDistribution['has_str_checkmark']}");
        $this->addLog('info', "   - Both D3+STr: {$strataDistribution['has_both_checkmarks']}");
        $this->addLog('info', "   - No checkmarks: {$strataDistribution['no_checkmarks']}");

        if ($filteredCount === 0) {
            $this->addLog('warning', "⚠️  Tidak ada tabel yang ditemukan untuk program {$program}!");
            $this->addLog('info', "🔍 Debug: Periksa apakah ada checkmark di kolom " . ($program === 'D-IV' ? 'STr' : 'D3') . " di sheet 'Daftar Tabel'");
        }

        $response['mapping'] = $filteredMapping;
        $response['total_tables'] = $filteredCount;
        $response['program_filter'] = $program;
        $response['checkmark_distribution'] = $strataDistribution;
        $response['filter_logic'] = [
            'program' => $program,
            'detection_method' => $program === 'D-IV' ? 'Check STr column for checkmarks' : 'Check D3 column for checkmarks',
            'checkmark_logic' => 'Any non-empty value (except -, x, X, 0, false, no) is considered a checkmark',
            'separate_entries' => 'Each program creates separate table entries even if same physical table'
        ];

        return $response;
    }

    /**
     * Create tables from filtered response - CREATE separate entries per program
     */
    private function createTables($response, $program = null)
    {
        $this->addLog('info', '📋 Membuat struktur tabel...');

        $mapping = $response['mapping'] ?? [];
        if (empty($mapping)) {
            $this->addLog('error', 'Tidak ada mapping tabel yang ditemukan setelah filtering');
            return;
        }

        $totalTables = count($mapping);
        $this->addLog('info', "Total tabel yang akan diproses: {$totalTables}");

        if ($program) {
            $this->addLog('info', "🎯 Program filter aktif: {$program}");
            $this->addLog('info', "📋 SEMUA tabel akan menggunakan strata {$program}");
            $this->addLog('info', "🔧 Kode tabel tetap original, buat entri baru jika belum ada");
            $this->addLog('info', "🚫 TIDAK override, buat entri terpisah per strata");
        }

        // Determine target strata based on program
        $targetStrataName = null;
        if ($program) {
            switch (strtoupper($program)) {
                case 'D-IV':
                    $targetStrataName = 'D-IV';
                    break;
                case 'D-III':
                    $targetStrataName = 'D-III';
                    break;
            }
        }

        if ($targetStrataName) {
            // Find target strata (harus sudah ada di database)
            $targetStrata = \App\Models\Prodi\Strata::where('name', $targetStrataName)->first();
            if (!$targetStrata) {
                $this->addLog('error', "❌ Strata '{$targetStrataName}' tidak ditemukan di database");
                return;
            }
            $this->addLog('info', "🎯 Target strata: {$targetStrataName} (ID: {$targetStrata->_id})");
        }

        foreach ($mapping as $code => $tableInfo) {
            $this->attemptedTables++;

            try {
                $title = $tableInfo['title'];
                $sheetName = $tableInfo['sheet_name'];
                $strataInfo = $tableInfo['strata_info'] ?? [];

                $this->addLog('info', "📝 Memproses: {$title}");

                // Gunakan kode original
                $originalTableCode = $code;
                $originalTitle = $title;

                // Log detected checkmarks
                $d3Checkmark = $strataInfo['D3'] ?? false;
                $strCheckmark = $strataInfo['STr'] ?? false;
                $this->addLog('info', "  📋 Checkmarks: D3=" . ($d3Checkmark ? 'YES' : 'NO') . ", STr=" . ($strCheckmark ? 'YES' : 'NO'));
                $this->addLog('info', "  🔧 Kode: {$originalTableCode} (tetap original)");

                // FORCE strata berdasarkan program
                $finalStrataId = null;
                $finalStrataName = null;

                if ($program && $targetStrata) {
                    // FORCE menggunakan strata sesuai program
                    $finalStrataId = $targetStrata->_id;
                    $finalStrataName = $targetStrata->name;
                    $this->addLog('info', "  🔧 FORCE strata: {$finalStrataName} (sesuai program {$program})");
                } else {
                    // Jika tidak ada program filter, gunakan mapping detected strata
                    $detectedStrata = $tableInfo['detected_strata'] ?? null;
                    $existingStrataName = $this->mapToExistingStrata($detectedStrata);
                    if (!$existingStrataName) {
                        $this->addLog('warning', "  ⚠️  SKIP: {$title} - strata '{$detectedStrata}' tidak dikenal");
                        continue;
                    }

                    $strata = \App\Models\Prodi\Strata::where('name', $existingStrataName)->first();
                    if (!$strata) {
                        $this->addLog('error', "  ❌ Strata '{$existingStrataName}' tidak ditemukan di database");
                        continue;
                    }

                    $finalStrataId = $strata->_id;
                    $finalStrataName = $strata->name;
                    $this->addLog('info', "  🔄 Mapping: {$detectedStrata} → {$finalStrataName}");
                }

                // PERUBAHAN UTAMA: Cek apakah sudah ada entry dengan kode dan strata yang sama
                $existingTable = LkpsTable::where('kode', $originalTableCode)
                    ->where('strataId', $finalStrataId)
                    ->first();

                if ($existingTable) {
                    $this->addLog('info', "  ✅ Tabel sudah ada: {$existingTable->kode} dengan strata {$finalStrataName} - skip");
                    $this->generatedStructure['tables']++;
                    $this->successTables++;
                    continue; // Skip jika sudah ada entry dengan kode dan strata yang sama
                }

                // Create NEW table entry (tidak ada updateOrCreate, hanya create)
                $table = LkpsTable::create([
                    'kode' => $originalTableCode, // Kode tetap original
                    'judul' => $originalTitle, // Title juga tetap original
                    'strataId' => $finalStrataId,
                    'barisAwalExcel' => 2, // Will be updated during column analysis
                ]);

                $this->addLog('success', "  ✅ Tabel baru dibuat: {$table->kode} (strata: {$finalStrataName}, ID: {$table->_id})");

                // Create columns using original code
                $columnCreateResult = $this->createColumnsForTable($table, $code, $program);

                if ($columnCreateResult) {
                    $this->generatedStructure['tables']++;
                    $this->successTables++;
                } else {
                    $this->failedTables++;
                    // Table was deleted due to no columns
                }

            } catch (\Exception $e) {
                $this->failedTables++;
                $this->addLog('error', "  ❌ Gagal membuat tabel {$code}: {$e->getMessage()}");

                if ($this->debug) {
                    $this->addLog('debug', substr($e->getTraceAsString(), 0, 500) . '...');
                }
            }
        }
    }

    /**
     * Map detected strata to existing strata names
     */
    private function mapToExistingStrata($detectedStrata)
    {
        $mapping = [
            'Sarjana Terapan' => 'D-IV',  // STr column -> D-IV strata
            'Diploma Tiga' => 'D-III'     // D3 column -> D-III strata
        ];

        return $mapping[$detectedStrata] ?? null;
    }

    private function processInfoSections($infoSections, $rowData)
    {
        foreach ($infoSections as &$section) {
            $infoRow = $section['info_row'];
            $infoColumnLetter = $section['info_column'];
            $infoColumnIndex = $this->columnLetterToIndex($infoColumnLetter) - 1;

            \Log::info("🔍 Processing INFO section with 3-column structure", [
                'info_cell' => $infoColumnLetter . $infoRow,
                'info_column_letter' => $infoColumnLetter,
                'info_column_index_0_based' => $infoColumnIndex
            ]);

            $dataBelow = [];

            // ✅ NEW: 3-column layout for INFO
            $variabelColumnIndex = $infoColumnIndex;      // Column with INFO header (contains variabel)
            $kondisiColumnIndex = $infoColumnIndex + 1;   // Column to the RIGHT (contains kondisi)
            $formulaColumnIndex = $infoColumnIndex + 2;   // Column FURTHER RIGHT (contains formula)

            $variabelColumnLetter = $this->columnIndexToLetter($variabelColumnIndex + 1);
            $kondisiColumnLetter = $this->columnIndexToLetter($kondisiColumnIndex + 1);
            $formulaColumnLetter = $this->columnIndexToLetter($formulaColumnIndex + 1);

            \Log::info("🔍 INFO Column mapping (3-column structure)", [
                'info_header_column' => $infoColumnLetter . ' (contains header "INFO")',
                'variabel_column' => $variabelColumnLetter . ' (index: ' . $variabelColumnIndex . ') - contains variabel like "A", "Rasio", "NM"',
                'kondisi_column' => $kondisiColumnLetter . ' (index: ' . $kondisiColumnIndex . ') - contains kondisi text (optional)',
                'formula_column' => $formulaColumnLetter . ' (index: ' . $formulaColumnIndex . ') - contains formula',
                'layout' => 'INFO_HEADER=' . $infoColumnLetter . ', VARIABEL=' . $variabelColumnLetter . ', KONDISI=' . $kondisiColumnLetter . ', FORMULA=' . $formulaColumnLetter
            ]);

            // Look for data in rows below the INFO cell
            for ($rowIndex = $infoRow; $rowIndex < min($infoRow + 10, count($rowData)); $rowIndex++) {
                if (!isset($rowData[$rowIndex]) || !$rowData[$rowIndex]->getValues()) {
                    continue;
                }

                $row = $rowData[$rowIndex];
                $values = $row->getValues();
                $currentRowNum = $rowIndex + 1;

                \Log::info("🔍 Processing INFO data row", [
                    'row_number' => $currentRowNum,
                    'total_columns_in_row' => count($values),
                    'variabel_column_index' => $variabelColumnIndex,
                    'kondisi_column_index' => $kondisiColumnIndex,
                    'formula_column_index' => $formulaColumnIndex
                ]);

                // ✅ Get variabel from INFO column (same as before)
                $variabelText = null;
                if (isset($values[$variabelColumnIndex])) {
                    $variabelCell = $values[$variabelColumnIndex];
                    $variabelValue = $this->getCellValue($variabelCell);

                    \Log::info("🔍 Reading variabel from INFO column", [
                        'row' => $currentRowNum,
                        'variabel_column' => $variabelColumnLetter,
                        'variabel_raw_value' => $variabelValue
                    ]);

                    // Skip empty cells atau cell yang berisi "INFO"
                    if (!$variabelValue || trim($variabelValue) === '' || strtoupper(trim($variabelValue)) === 'INFO') {
                        \Log::info("⚠️ Skipping header/empty row", [
                            'row' => $currentRowNum,
                            'reason' => 'INFO header text or empty'
                        ]);
                        continue;
                    }

                    $variabelText = trim($variabelValue);
                    \Log::info("✅ VARIABEL extracted from INFO column", [
                        'row' => $currentRowNum,
                        'variabel' => $variabelText
                    ]);
                } else {
                    \Log::info("❌ No variabel cell available", [
                        'row' => $currentRowNum,
                        'variabel_column_index' => $variabelColumnIndex
                    ]);
                    continue;
                }

                // ✅ NEW: Get kondisi from RIGHT column (optional)
                $kondisiText = null;
                if (isset($values[$kondisiColumnIndex])) {
                    $kondisiCell = $values[$kondisiColumnIndex];
                    $kondisiValue = $this->getCellValue($kondisiCell);

                    \Log::info("🔍 Reading kondisi from RIGHT column", [
                        'row' => $currentRowNum,
                        'kondisi_column' => $kondisiColumnLetter,
                        'kondisi_raw_value' => $kondisiValue,
                        'is_empty' => empty($kondisiValue)
                    ]);

                    if ($kondisiValue && trim($kondisiValue) !== '') {
                        $kondisiText = trim($kondisiValue);
                        \Log::info("✅ KONDISI text extracted from RIGHT column", [
                            'row' => $currentRowNum,
                            'kondisi_text' => $kondisiText
                        ]);
                    } else {
                        \Log::info("ℹ️ KONDISI column is empty - will be excluded from object", [
                            'row' => $currentRowNum
                        ]);
                    }
                } else {
                    \Log::info("ℹ️ No kondisi cell available - will be excluded from object", [
                        'row' => $currentRowNum,
                        'kondisi_column_index' => $kondisiColumnIndex
                    ]);
                }

                // ✅ Get formula from FURTHER RIGHT column
                $formulaText = '0';
                $formulaValue = null;
                $formulaType = 'default';

                if (isset($values[$formulaColumnIndex])) {
                    $formulaCell = $values[$formulaColumnIndex];
                    $formulaCellValue = $this->getCellValue($formulaCell);

                    \Log::info("🔍 Reading formula from FURTHER RIGHT column", [
                        'row' => $currentRowNum,
                        'formula_column' => $formulaColumnLetter,
                        'formula_raw_value' => $formulaCellValue
                    ]);

                    // ✅ Get formula if available
                    $formula = $this->getCellFormula($formulaCell);

                    if ($formula) {
                        $formulaText = $formula;
                        $formulaType = 'formula';
                        \Log::info("✅ FORMULA extracted", [
                            'row' => $currentRowNum,
                            'formula' => $formula,
                            'type' => 'formula'
                        ]);
                    } elseif ($formulaCellValue !== null && trim($formulaCellValue) !== '') {
                        $formulaText = trim($formulaCellValue);
                        $formulaType = 'value';
                        \Log::info("✅ FORMULA VALUE extracted", [
                            'row' => $currentRowNum,
                            'formula' => $formulaText,
                            'type' => 'value'
                        ]);
                    }

                    $formulaValue = $formulaCellValue;
                } else {
                    \Log::info("⚠️ No formula cell available - using default", [
                        'row' => $currentRowNum,
                        'formula_column_index' => $formulaColumnIndex,
                        'default_formula' => '0'
                    ]);
                }

                if (!$variabelText) {
                    \Log::info("⚠️ Skipping row - missing variabel", [
                        'row' => $currentRowNum,
                        'has_variabel' => !empty($variabelText)
                    ]);
                    continue;
                }

                // ✅ NEW: Build data item with conditional kondisi field
                $dataItem = [
                    'row' => $currentRowNum,
                    'variabel_column' => $variabelColumnLetter,
                    'kondisi_column' => $kondisiColumnLetter,
                    'formula_column' => $formulaColumnLetter,
                    'variabel' => $variabelText,
                    'formula' => $formulaText,
                    'formula_value' => $formulaValue,
                    'formula_type' => $formulaType,
                    'type' => 'variabel_data'
                ];

                // ✅ CRITICAL: Only add kondisi field if it has value
                if ($kondisiText !== null && $kondisiText !== '') {
                    $dataItem['kondisi'] = $kondisiText;
                    \Log::info("✅ INFO data item created WITH kondisi", [
                        'row' => $currentRowNum,
                        'final_data' => [
                            'variabel' => $variabelText,
                            'kondisi' => $kondisiText,
                            'formula' => $formulaText
                        ]
                    ]);
                } else {
                    \Log::info("✅ INFO data item created WITHOUT kondisi (empty/null)", [
                        'row' => $currentRowNum,
                        'final_data' => [
                            'variabel' => $variabelText,
                            'formula' => $formulaText
                        ]
                    ]);
                }

                $dataBelow[] = $dataItem;
            }

            $section['data_below'] = $dataBelow;
            $section['data_count'] = count($dataBelow);
            $section['column_structure'] = [
                'variabel_column' => $variabelColumnLetter,
                'kondisi_column' => $kondisiColumnLetter,
                'formula_column' => $formulaColumnLetter,
                'layout' => 'INFO_HEADER=' . $infoColumnLetter . ', VARIABEL=' . $variabelColumnLetter . ', KONDISI=' . $kondisiColumnLetter . ', FORMULA=' . $formulaColumnLetter,
                'three_column_structure' => true
            ];

            \Log::info("✅ INFO section completed with 3-column structure", [
                'info_cell' => $infoColumnLetter . $infoRow,
                'data_count' => count($dataBelow),
                'structure' => $section['column_structure'],
                'sample_data' => array_slice($dataBelow, 0, 2)
            ]);
        }

        return $infoSections;
    }

    /**
     * ✅ NEW: Process KONDISI sections untuk extract kondisi dan formula
     */
    private function processKondisiSections($kondisiSections, $rowData)
    {
        foreach ($kondisiSections as &$section) {
            $kondisiRow = $section['kondisi_row'];
            $kondisiColumnLetter = $section['kondisi_column'];
            $kondisiColumnIndex = $this->columnLetterToIndex($kondisiColumnLetter) - 1;

            $dataBelow = [];

            // ✅ Check for butir column (column to the LEFT of KONDISI)
            $butirColumnIndex = $kondisiColumnIndex - 1; // Left of KONDISI column
            $butirValue = null;

            // Try to get butir value from the same row as KONDISI header or rows below
            if ($butirColumnIndex >= 0) {
                // First try to get butir from KONDISI header row
                if (isset($rowData[$kondisiRow - 1]) && $rowData[$kondisiRow - 1]->getValues()) {
                    $kondisiHeaderRow = $rowData[$kondisiRow - 1];
                    $kondisiHeaderValues = $kondisiHeaderRow->getValues();

                    if (isset($kondisiHeaderValues[$butirColumnIndex])) {
                        $butirCell = $kondisiHeaderValues[$butirColumnIndex];
                        $butirCellValue = $this->getCellValue($butirCell);

                        // Check if it's a number (butir)
                        if (is_numeric($butirCellValue)) {
                            $butirValue = (int) $butirCellValue;

                            \Log::info("✅ BUTIR found in KONDISI header row", [
                                'kondisi_cell' => $kondisiColumnLetter . $kondisiRow,
                                'butir_column' => $this->columnIndexToLetter($butirColumnIndex + 1),
                                'butir_value' => $butirValue
                            ]);
                        }
                    }
                }

                // If no butir in header row, try first data row
                if ($butirValue === null && isset($rowData[$kondisiRow]) && $rowData[$kondisiRow]->getValues()) {
                    $firstDataRow = $rowData[$kondisiRow];
                    $firstDataValues = $firstDataRow->getValues();

                    if (isset($firstDataValues[$butirColumnIndex])) {
                        $butirCell = $firstDataValues[$butirColumnIndex];
                        $butirCellValue = $this->getCellValue($butirCell);

                        if (is_numeric($butirCellValue)) {
                            $butirValue = (int) $butirCellValue;

                            \Log::info("✅ BUTIR found in first data row", [
                                'kondisi_cell' => $kondisiColumnLetter . $kondisiRow,
                                'butir_column' => $this->columnIndexToLetter($butirColumnIndex + 1),
                                'butir_value' => $butirValue
                            ]);
                        }
                    }
                }
            }

            // Look for data in rows below the KONDISI cell (starting from next row)
            for ($rowIndex = $kondisiRow; $rowIndex < min($kondisiRow + 15, count($rowData)); $rowIndex++) {
                if (!isset($rowData[$rowIndex]) || !$rowData[$rowIndex]->getValues()) {
                    continue;
                }

                $row = $rowData[$rowIndex];
                $values = $row->getValues();

                // Check cell directly below KONDISI (same column)
                if (isset($values[$kondisiColumnIndex])) {
                    $cell = $values[$kondisiColumnIndex];
                    $cellValue = $this->getCellValue($cell);

                    // Skip empty cells atau cell yang berisi "KONDISI"
                    if (!$cellValue || trim($cellValue) === '' || strtoupper(trim($cellValue)) === 'KONDISI') {
                        continue;
                    }

                    $currentRowNum = $rowIndex + 1;
                    $cellLetter = $this->columnIndexToLetter($kondisiColumnIndex + 1);

                    // ✅ Try to get butir from current row if not found yet
                    $currentRowButir = $butirValue;
                    if ($currentRowButir === null && $butirColumnIndex >= 0 && isset($values[$butirColumnIndex])) {
                        $currentButirCell = $values[$butirColumnIndex];
                        $currentButirValue = $this->getCellValue($currentButirCell);

                        if (is_numeric($currentButirValue)) {
                            $currentRowButir = (int) $currentButirValue;

                            \Log::info("✅ BUTIR found in current data row", [
                                'row' => $currentRowNum,
                                'butir_column' => $this->columnIndexToLetter($butirColumnIndex + 1),
                                'butir_value' => $currentRowButir
                            ]);
                        }
                    }

                    $dataItem = [
                        'row' => $currentRowNum,
                        'column' => $cellLetter,
                        'cell' => $cellLetter . $currentRowNum,
                        'butir' => $currentRowButir, // ✅ NEW: Add butir field
                        'kondisi' => trim($cellValue), // "RDPU > 10", "6 < RDPU ≤ 10", etc.
                        'type' => 'kondisi'
                    ];

                    // ✅ Check for formula/value in the cell to the right
                    $rightColumnIndex = $kondisiColumnIndex + 1;
                    if (isset($values[$rightColumnIndex])) {
                        $rightCell = $values[$rightColumnIndex];
                        $rightCellValue = $this->getCellValue($rightCell);
                        $rightCellLetter = $this->columnIndexToLetter($rightColumnIndex + 1);

                        // ✅ Get formula if available
                        $formula = $this->getCellFormula($rightCell);

                        $dataItem['formula_cell'] = $rightCellLetter . $currentRowNum;
                        $dataItem['formula_value'] = $rightCellValue;

                        if ($formula) {
                            $dataItem['formula'] = $formula;
                            $dataItem['formula_type'] = 'formula';
                        } else {
                            // If no formula, treat the value as a simple formula or value
                            $dataItem['formula'] = $rightCellValue ?: '0';
                            $dataItem['formula_type'] = 'value';
                        }
                    } else {
                        // No formula cell found
                        $dataItem['formula'] = '0';
                        $dataItem['formula_type'] = 'default';
                        $dataItem['formula_cell'] = null;
                        $dataItem['formula_value'] = null;
                    }

                    $dataBelow[] = $dataItem;
                }
            }

            $section['data_below'] = $dataBelow;
            $section['data_count'] = count($dataBelow);
            $section['detected_butir'] = $butirValue;
        }

        return $kondisiSections;
    }

    /**
     * ✅ NEW: Get cell formula (if available)
     */
    private function getCellFormula($cell)
    {
        try {
            // Try to get user entered value which might contain formula
            if ($cell->getUserEnteredValue()) {
                $userValue = $cell->getUserEnteredValue();

                // Check if it's a formula value
                if ($userValue->getFormulaValue()) {
                    return $userValue->getFormulaValue();
                }
            }

            // Alternative: check if formatted value starts with =
            $formattedValue = $cell->getFormattedValue();
            if ($formattedValue && strpos($formattedValue, '=') === 0) {
                return $formattedValue;
            }

            return null;

        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Create columns for table dengan special case handling + INFO sections
     */
    private function createColumnsForTable($table, $tableRef, $program = null)
    {
        $this->addLog('info', "  📊 Menganalisis kolom untuk tabel {$table->kode}...");

        // Check if this is a special table
        $isSpecialTable = $this->isSpecialTable($tableRef);
        if ($isSpecialTable && $program) {
            $this->addLog('info', "  🔴 SPECIAL CASE: Tabel {$tableRef} dengan program {$program}");
        }

        try {
            $request = new Request([
                'spreadsheet_id' => $this->spreadsheetId,
                'table_ref' => $tableRef,
                'program' => $program
            ]);

            $response = $this->lkpsImportController->getColoredCellsByTable($request, $tableRef);
            $originalData = $response->original;

            // ✅ Check response success first
            if (!$originalData['success']) {
                $this->addLog('error', "  ❌ Gagal mendapatkan data dari Google Sheets untuk tabel {$tableRef}");
                return false;
            }

            // ✅ Process INFO sections (existing)
            if (isset($originalData['info_sections']) && !empty($originalData['info_sections'])) {
                $this->addLog('info', "  🔍 Ditemukan " . count($originalData['info_sections']) . " INFO sections (3-column structure)");

                $rumusArray = [];

                foreach ($originalData['info_sections'] as $infoSection) {
                    $this->addLog('info', "    📍 INFO di {$infoSection['info_column']}{$infoSection['info_row']} dengan {$infoSection['data_count']} data items");

                    foreach ($infoSection['data_below'] as $item) {
                        // ✅ NEW: Build rumus item with conditional kondisi field
                        $rumusItem = [
                            'variabel' => $item['variabel'],
                            'formula' => $item['formula']
                        ];

                        // ✅ CRITICAL: Only add kondisi field if it exists in the item
                        if (isset($item['kondisi']) && $item['kondisi'] !== null && $item['kondisi'] !== '') {
                            $rumusItem['kondisi'] = $item['kondisi'];
                            $this->addLog('info', "      • Variabel: {$item['variabel']} → Kondisi: {$item['kondisi']} → Formula: {$item['formula']}");
                        } else {
                            $this->addLog('info', "      • Variabel: {$item['variabel']} → Formula: {$item['formula']} (no kondisi)");
                        }

                        $rumusArray[] = $rumusItem;
                    }
                }

                if (!empty($rumusArray)) {
                    $table->rumus = $rumusArray;
                    $table->save();
                    $this->addLog('success', "  ✅ Menyimpan " . count($rumusArray) . " rumus ke field rumus tabel (3-column structure)");

                    if ($this->debug) {
                        $this->addLog('debug', "  📋 Format rumus (3-column array): " . json_encode(array_slice($rumusArray, 0, 2), JSON_PRETTY_PRINT));
                    }
                }
            } else {
                $this->addLog('info', "  ℹ️  Tidak ada INFO sections ditemukan untuk tabel {$table->kode}");
            }

            // ✅ UPDATED: Process KONDISI sections with butir - HANYA yang ORANGE
            if (isset($originalData['kondisi_sections']) && !empty($originalData['kondisi_sections'])) {
                $this->addLog('info', "  🟠 Ditemukan " . count($originalData['kondisi_sections']) . " KONDISI sections (4-COLUMN PARSING)");

                $kondisiArray = [];

                foreach ($originalData['kondisi_sections'] as $kondisiSection) {
                    $columnStructure = $kondisiSection['column_structure'] ?? [];
                    $this->addLog('info', "    📍 KONDISI di {$kondisiSection['kondisi_cell']} dengan {$kondisiSection['data_count']} data items");

                    if (!empty($columnStructure)) {
                        $this->addLog('info', "    📊 Layout: {$columnStructure['layout']}");
                    }

                    foreach ($kondisiSection['data_below'] as $item) {
                        // ================== PERUBAHAN UTAMA DI SINI ==================
                        $kondisiItem = [
                            'butir'   => $item['butir'] ?? null,
                            'kondisi' => $item['kondisi'] ?? '',
                            'formula' => $item['formula'] ?? '0'
                        ];

                        // 2. Tambahkan field 'sub' HANYA JIKA nilainya tidak kosong.
                        // Fungsi !empty() akan mengevaluasi true untuk string yang tidak kosong dan tidak null.
                        if (!empty($item['sub'])) {
                            $kondisiItem['sub'] = $item['sub'];
                        }

                        // ==============================================================

                        $kondisiArray[] = $kondisiItem;

                        // Update logging untuk mencerminkan logika baru
                        $butirDisplay = $kondisiItem['butir'] ? "Butir {$kondisiItem['butir']}" : "No butir";
                        $subDisplay = !empty($kondisiItem['sub']) ? "Sub '{$kondisiItem['sub']}'" : "No sub";
                        $this->addLog('info', "      • {$butirDisplay} - {$subDisplay} | Kondisi: {$item['kondisi']} → Formula: {$item['formula']}");
                    }
                }



                if (!empty($kondisiArray)) {
                    $table->kondisi = $kondisiArray;
                    $table->save();
                    $this->addLog('success', "  ✅ Menyimpan " . count($kondisiArray) . " kondisi dengan butir ke field kondisi tabel (ORANGE CELLS ONLY)");

                    if ($this->debug) {
                        $this->addLog('debug', "  📋 Format kondisi dengan butir (clean array): " . json_encode(array_slice($kondisiArray, 0, 2), JSON_PRETTY_PRINT));
                    }
                }
            } else {
                $this->addLog('info', "  ℹ️  Tidak ada KONDISI sections ditemukan untuk tabel {$table->kode} (requires ORANGE color)");

                // ✅ UPDATED: STRICT fallback with butir detection
                $kondisiArray = $this->findKondisiByOrangeColorOnlyWithButir($originalData);
                if (!empty($kondisiArray)) {
                    $table->kondisi = $kondisiArray;
                    $table->save();
                    $this->addLog('success', "  ✅ Menyimpan " . count($kondisiArray) . " kondisi dengan butir via ORANGE-only fallback search");
                } else {
                    $this->addLog('info', "  ⚠️  KONDISI fallback failed: No ORANGE cells dengan text 'KONDISI' ditemukan");
                }
            }

            // Continue with rest of method...
            // Log special case info if available
            if (isset($originalData['is_special_table']) && $originalData['is_special_table']) {
                $specialInfo = $originalData['special_case_info'];
                $this->addLog('info', "  🔴 Special case aktif: {$specialInfo['search_text']} di baris {$specialInfo['target_row']}");
                $this->addLog('info', "  📍 Range deteksi: baris {$specialInfo['detection_start']} - " . ($specialInfo['detection_end'] ?? 'akhir'));
            }

            // ✅ Log STRICT validation results
            $orangeCount = $originalData['orange_cells_count'] ?? 0;
            $kondisiCount = $originalData['kondisi_cells_count'] ?? 0;

            $this->addLog('info', "  🔍 STRICT validation results:");
            $this->addLog('info', "    - Orange cells detected: {$orangeCount}");
            $this->addLog('info', "    - KONDISI text in orange cells: {$kondisiCount}");
            $this->addLog('info', "    - KONDISI sections processed: " . count($originalData['kondisi_sections'] ?? []));

            if ($orangeCount > 0 && $kondisiCount === 0) {
                $this->addLog('warning', "  ⚠️  Orange cells found but no KONDISI text - check if cells contain 'KONDISI' text");
            }

            // Update barisAwalExcel
            if (isset($originalData['first_yellow_row']) && $originalData['first_yellow_row'] > 0) {
                $table->barisAwalExcel = $originalData['first_yellow_row'];
                $table->save();
                $this->addLog('info', "  📊 barisAwalExcel: {$table->barisAwalExcel} (first yellow row)");
            } elseif (isset($originalData['data_start_row'])) {
                $table->barisAwalExcel = $originalData['data_start_row'];
                $table->save();
                $this->addLog('info', "  📊 barisAwalExcel: {$table->barisAwalExcel} (data start row)");
            }

            // Strata sudah diset dari program forcing
            $strataName = $table->strata ? $table->strata->name : 'neutral';
            $this->addLog('info', "  📋 Strata: {$strataName} (FORCED dari program)");

            // Process yellow columns for fillable detection
            $yellowColumns = array_keys($originalData['yellow_columns'] ?? []);
            if (!empty($yellowColumns)) {
                $this->addLog('info', "  🟡 Ditemukan " . count($yellowColumns) . " kolom fillable (kuning)");
            }

            // ✅ Get header data dengan multiple fallbacks
            $headerData = $this->getHeaderDataWithFallbacks($originalData);

            if (empty($headerData) || empty($headerData['columns'])) {
                $this->addLog('error', "  ❌ Tidak dapat mendapatkan struktur header setelah semua fallback");
                $table->delete();
                return false;
            }

            $this->addLog('success', "  ✅ Berhasil mendapatkan struktur header dengan " . count($headerData['columns']) . " kolom");

            // Delete old columns by table ID
            $deletedColumns = LkpsColumn::where('lkpsTableId', (string) $table->_id)->delete();
            $this->addLog('info', "  🗑️  Menghapus {$deletedColumns} kolom lama");

            // Create new columns
            $columnCount = $this->createColumnsFromHeaderData($table, $headerData['columns'], null, 0, $yellowColumns);

            if ($columnCount > 0) {
                $this->addLog('success', "  ✅ Berhasil membuat {$columnCount} kolom");
                $this->generatedStructure['columns'] += $columnCount;
                return true;
            } else {
                $this->addLog('warning', "  ⚠️  Tidak ada kolom yang dibuat, menghapus tabel");
                $table->delete();
                return false;
            }

        } catch (\Exception $e) {
            $this->addLog('error', "  ❌ Gagal membuat kolom untuk tabel {$table->kode}: {$e->getMessage()}");

            if ($this->debug) {
                $this->addLog('debug', substr($e->getTraceAsString(), 0, 300) . '...');
            }

            $table->delete();
            return false;
        }
    }

    public function debugInfoStructure(Request $request)
    {
        try {
            $tableRef = $request->input('table_ref', '3a1');
            $spreadsheetId = $request->input('spreadsheet_id', $this->spreadsheetId);

            if (!$spreadsheetId) {
                return response()->json([
                    'error' => 'Missing spreadsheet_id parameter',
                    'usage' => 'GET /api/lkps/debug-info-structure?table_ref=3a1&spreadsheet_id=YOUR_SHEET_ID'
                ]);
            }

            // Initialize LkpsImportController untuk akses Google Sheets
            $importController = new LkpsImportController(new Request(['spreadsheet_id' => $spreadsheetId]));

            // Get colored cells untuk table ini
            $request->merge(['spreadsheet_id' => $spreadsheetId]);
            $response = $importController->getColoredCellsByTable($request, $tableRef);

            if (!isset($response->original) || !$response->original['success']) {
                return response()->json([
                    'error' => 'Failed to get sheet data',
                    'table_ref' => $tableRef,
                    'spreadsheet_id' => $spreadsheetId
                ]);
            }

            $originalData = $response->original;

            // Analyze INFO sections yang sudah ada
            $infoSections = $originalData['info_sections'] ?? [];

            $analysis = [
                'debug_info' => [
                    'table_ref' => $tableRef,
                    'spreadsheet_id' => $spreadsheetId,
                    'sheet_name' => $originalData['sheet_name'] ?? 'Unknown',
                    'info_sections_found' => count($infoSections)
                ],
                'info_sections_analysis' => [],
                'current_saved_data' => []
            ];

            // Analyze each INFO section
            foreach ($infoSections as $index => $section) {
                $sectionAnalysis = [
                    'section_index' => $index,
                    'info_cell' => $section['info_column'] . $section['info_row'],
                    'data_count' => $section['data_count'] ?? 0,
                    'column_structure' => $section['column_structure'] ?? null,
                    'sample_data' => array_slice($section['data_below'] ?? [], 0, 3),
                    'three_column_detection' => [
                        'has_three_column_structure' => isset($section['column_structure']['three_column_structure']),
                        'variabel_column' => $section['column_structure']['variabel_column'] ?? null,
                        'kondisi_column' => $section['column_structure']['kondisi_column'] ?? null,
                        'formula_column' => $section['column_structure']['formula_column'] ?? null
                    ]
                ];

                $analysis['info_sections_analysis'][] = $sectionAnalysis;
            }

            // Get current saved data dari database
            $table = LkpsTable::where('kode', $tableRef)->first();
            if ($table) {
                $analysis['current_saved_data'] = [
                    'table_id' => (string) $table->_id,
                    'kode' => $table->kode,
                    'judul' => $table->judul,
                    'has_rumus' => !empty($table->rumus),
                    'rumus_count' => is_array($table->rumus) ? count($table->rumus) : 0,
                    'rumus_sample' => is_array($table->rumus) ? array_slice($table->rumus, 0, 3) : null,
                    'expected_struktur' => [
                        'should_have_kondisi_field' => 'Only when middle column has value',
                        'example_with_kondisi' => [
                            'variabel' => 'B',
                            'kondisi' => 'PDTT ≤ 40%',
                            'formula' => 'some_formula'
                        ],
                        'example_without_kondisi' => [
                            'variabel' => 'A',
                            'formula' => 'some_formula'
                        ]
                    ]
                ];
            }

            return response()->json($analysis);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : 'Debug mode disabled'
            ]);
        }
    }

    private function findKondisiByOrangeColorOnlyWithButir($originalData)
    {
        $kondisiArray = [];

        try {
            // ✅ STRICT: ONLY check orange cells, tidak termasuk blue/yellow/other colors
            $orangeCells = $originalData['orange_cells'] ?? [];

            foreach ($orangeCells as $cell) {
                $value = $cell['value'] ?? '';

                if ($value && (stripos($value, 'kondisi') !== false || strtoupper(trim($value)) === 'KONDISI')) {
                    $row = $cell['row'] ?? 0;
                    $column = $cell['column'] ?? '';

                    // Try to detect butir from nearby cells (simple approach)
                    $detectedButir = null;

                    // For fallback, we can't easily detect butir without accessing sheet data
                    // So we'll use a placeholder or try to extract from context
                    if (isset($originalData['kondisi_context'])) {
                        $detectedButir = $originalData['kondisi_context']['butir'] ?? null;
                    }

                    // Create simple fallback entry with butir
                    $kondisiArray[] = [
                        'butir' => $detectedButir, // ✅ Add butir field
                        'kondisi' => 'KONDISI detected in orange cell',
                        'formula' => '0'
                    ];

                    $this->addLog('info', "  🟠 STRICT fallback KONDISI found at {$column}{$row}: {$value} (orange cell only, butir: " . ($detectedButir ?? 'unknown') . ")");
                    break; // Only take first match for now
                }
            }

        } catch (\Exception $e) {
            $this->addLog('debug', "  ❌ Error in findKondisiByOrangeColorOnlyWithButir: {$e->getMessage()}");
        }

        return $kondisiArray;
    }

    /**
     * ✅ HELPER: Get cell value from Google Sheets cell object
     */
    private function getCellValue($cell)
    {
        try {
            if (!$cell) {
                return null;
            }

            // Try user entered value first
            if ($cell->getUserEnteredValue()) {
                $userValue = $cell->getUserEnteredValue();

                if ($userValue->getStringValue() !== null) {
                    return $userValue->getStringValue();
                }

                if ($userValue->getNumberValue() !== null) {
                    return $userValue->getNumberValue();
                }

                if ($userValue->getBoolValue() !== null) {
                    return $userValue->getBoolValue() ? 'TRUE' : 'FALSE';
                }
            }

            // Fallback to formatted value
            return $cell->getFormattedValue();

        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * ✅ HELPER: Convert column index to letter (1=A, 2=B, ..., 26=Z, 27=AA, ...)
     */
    private function columnIndexToLetter($index)
    {
        $letter = '';

        while ($index > 0) {
            $index--; // Make it 0-based
            $letter = chr(65 + ($index % 26)) . $letter;
            $index = intval($index / 26);
        }

        return $letter;
    }

    /**
     * ✅ IMPROVED: Fallback method untuk mencari KONDISI via text search
     */
    private function getHeaderDataWithFallbacks($originalData)
    {
        // ✅ FALLBACK 1: Try restructured_data first
        $headerData = $originalData['restructured_data'] ?? [];

        if (!empty($headerData) && isset($headerData[0]['columns']) && !empty($headerData[0]['columns'])) {
            $this->addLog('success', "  ✅ Menggunakan restructured_data dengan " . count($headerData[0]['columns']) . " kolom");
            return $headerData[0]; // Return first table structure
        }

        $this->addLog('warning', "  ⚠️  Tidak ada restructured_data, mencoba blue cells...");

        // ✅ FALLBACK 2: Try blue colored cells (header detection)
        $coloredCells = $originalData['colored_cells'] ?? [];

        if (!empty($coloredCells)) {
            $this->addLog('info', "  🔵 Ditemukan " . count($coloredCells) . " blue cells untuk header");

            $fallbackColumns = [];
            foreach ($coloredCells as $cell) {
                $fallbackColumns[] = [
                    'name' => $cell['value'] ?: 'Column ' . $cell['column'],
                    'column' => $cell['column'],
                    'cell' => $cell['cell'],
                    'children' => []
                ];
            }

            if (!empty($fallbackColumns)) {
                $this->addLog('success', "  ✅ Fallback 1: Menggunakan " . count($fallbackColumns) . " blue cells sebagai header");
                return [
                    'header_row' => $originalData['header_last_row'] ?? 1,
                    'columns' => $fallbackColumns
                ];
            }
        }

        // ✅ FALLBACK 3: Try yellow cells if no blue cells
        $this->addLog('warning', "  ⚠️  Blue cells kosong, mencoba yellow cells...");

        $yellowCells = $originalData['yellow_cells'] ?? [];
        if (!empty($yellowCells)) {
            $this->addLog('info', "  🟡 Ditemukan " . count($yellowCells) . " yellow cells");

            // Group by row to find header row
            $yellowByRow = [];
            foreach ($yellowCells as $cell) {
                $yellowByRow[$cell['row']][] = $cell;
            }

            // Use first row with most cells as header
            ksort($yellowByRow);
            $headerRow = reset($yellowByRow);

            if ($headerRow && count($headerRow) > 0) {
                $fallbackColumns = [];
                foreach ($headerRow as $cell) {
                    $fallbackColumns[] = [
                        'name' => $cell['value'] ?: 'Column ' . $cell['column'],
                        'column' => $cell['column'],
                        'cell' => $cell['cell'],
                        'children' => []
                    ];
                }

                if (!empty($fallbackColumns)) {
                    $this->addLog('success', "  ✅ Fallback 2: Menggunakan " . count($fallbackColumns) . " yellow cells sebagai header");
                    return [
                        'header_row' => $headerRow[0]['row'],
                        'columns' => $fallbackColumns
                    ];
                }
            }
        }

        // ✅ FALLBACK 4: Try any available columns from raw data
        $this->addLog('warning', "  ⚠️  Yellow cells kosong, mencoba semua colored cells...");

        // Try to use ANY colored cells as potential headers
        $allColoredCells = [];

        // Collect all colored cells from different sources
        if (isset($originalData['colored_cells'])) {
            $allColoredCells = array_merge($allColoredCells, $originalData['colored_cells']);
        }
        if (isset($originalData['yellow_cells'])) {
            $allColoredCells = array_merge($allColoredCells, $originalData['yellow_cells']);
        }
        if (isset($originalData['magenta_cells'])) {
            $allColoredCells = array_merge($allColoredCells, $originalData['magenta_cells']);
        }
        if (isset($originalData['orange_cells'])) {
            $allColoredCells = array_merge($allColoredCells, $originalData['orange_cells']);
        }

        if (!empty($allColoredCells)) {
            $this->addLog('info', "  🎨 Ditemukan " . count($allColoredCells) . " total colored cells");

            // Group by row and find the row with most cells (likely header)
            $cellsByRow = [];
            foreach ($allColoredCells as $cell) {
                $row = $cell['row'] ?? 1;
                $cellsByRow[$row][] = $cell;
            }

            // Sort by row number
            ksort($cellsByRow);

            // Find row with most cells (probably header)
            $maxCells = 0;
            $bestRow = null;
            foreach ($cellsByRow as $row => $cells) {
                if (count($cells) > $maxCells) {
                    $maxCells = count($cells);
                    $bestRow = $row;
                }
            }

            if ($bestRow && $maxCells > 0) {
                $bestRowCells = $cellsByRow[$bestRow];

                // Sort by column
                usort($bestRowCells, function ($a, $b) {
                    return strcmp($a['column'] ?? 'A', $b['column'] ?? 'A');
                });

                $fallbackColumns = [];
                foreach ($bestRowCells as $cell) {
                    $fallbackColumns[] = [
                        'name' => $cell['value'] ?: 'Column ' . ($cell['column'] ?? 'A'),
                        'column' => $cell['column'] ?? 'A',
                        'cell' => $cell['cell'] ?? 'A1',
                        'children' => []
                    ];
                }

                if (!empty($fallbackColumns)) {
                    $this->addLog('success', "  ✅ Fallback 3: Menggunakan " . count($fallbackColumns) . " colored cells dari row {$bestRow} sebagai header");
                    return [
                        'header_row' => $bestRow,
                        'columns' => $fallbackColumns
                    ];
                }
            }
        }

        // ✅ FALLBACK 5: Create basic structure with typical table columns
        $this->addLog('warning', "  ⚠️  Semua fallback gagal, membuat struktur berdasarkan yellow columns...");

        // Check if this table has yellow columns (fillable columns) to create better structure
        $yellowColumns = array_keys($originalData['yellow_columns'] ?? []);

        if (!empty($yellowColumns)) {
            $this->addLog('info', "  🟡 Menggunakan " . count($yellowColumns) . " yellow columns untuk struktur");

            $fallbackColumns = [];
            foreach ($yellowColumns as $column) {
                $fallbackColumns[] = [
                    'name' => 'Data ' . $column,
                    'column' => $column,
                    'cell' => $column . '1',
                    'children' => []
                ];
            }

            // Add a "No" column at the beginning if not present
            if (!in_array('A', $yellowColumns)) {
                array_unshift($fallbackColumns, [
                    'name' => 'No',
                    'column' => 'A',
                    'cell' => 'A1',
                    'children' => []
                ]);
            }

            $this->addLog('success', "  ✅ Fallback 4: Membuat struktur berdasarkan " . count($fallbackColumns) . " yellow columns");
            return [
                'header_row' => 1,
                'columns' => $fallbackColumns
            ];
        }

        // ✅ FALLBACK 6: Last resort - create minimal 3-column structure
        $this->addLog('warning', "  ⚠️  Membuat struktur minimal 3 kolom");

        return [
            'header_row' => 1,
            'columns' => [
                ['name' => 'No', 'column' => 'A', 'cell' => 'A1', 'children' => []],
                ['name' => 'Data', 'column' => 'B', 'cell' => 'B1', 'children' => []],
                ['name' => 'Keterangan', 'column' => 'C', 'cell' => 'C1', 'children' => []]
            ]
        ];
    }

    /**
     * ✅ IMPROVED: Fallback method untuk mencari KONDISI via text search
     */
    private function findKondisiByTextSearch($originalData)
    {
        $kondisiArray = [];

        try {
            // Check if we have raw sheet data to search through
            $allColoredCells = [];
            if (isset($originalData['orange_cells'])) {
                $allColoredCells = array_merge($allColoredCells, $originalData['orange_cells']);
            }
            if (isset($originalData['yellow_cells'])) {
                $allColoredCells = array_merge($allColoredCells, $originalData['yellow_cells']);
            }

            // Look for text that contains "kondisi" (case-insensitive)
            foreach ($allColoredCells as $cell) {
                $value = $cell['value'] ?? '';

                if ($value && stripos($value, 'kondisi') !== false) {
                    // Found potential KONDISI text, try to extract conditions
                    $row = $cell['row'] ?? 0;
                    $column = $cell['column'] ?? '';

                    // For now, create a simple fallback entry
                    $kondisiArray[] = [
                        'kondisi' => 'Fallback KONDISI detection',
                        'formula' => '0'
                    ];

                    $this->addLog('info', "  🔍 Fallback KONDISI found at {$column}{$row}: {$value}");
                    break; // Only take first match for now
                }
            }

        } catch (\Exception $e) {
            $this->addLog('debug', "  ❌ Error in findKondisiByTextSearch: {$e->getMessage()}");
        }

        return $kondisiArray;
    }

    public function checkRumusData(Request $request)
    {
        try {
            $tableCode = $request->input('table_code');

            $query = LkpsTable::query();

            if ($tableCode) {
                $query->where('kode', $tableCode);
            }

            $tables = $query->get(['_id', 'kode', 'judul', 'rumus']);

            $result = [];
            $totalWithRumus = 0;

            foreach ($tables as $table) {
                // ✅ MongoDB array check
                $rumus = $table->rumus; // Langsung array dari MongoDB
                $hasRumus = !empty($rumus) && is_array($rumus);

                if ($hasRumus) {
                    $totalWithRumus++;
                }

                $result[] = [
                    'id' => (string) $table->_id,
                    'kode' => $table->kode,
                    'judul' => $table->judul,
                    'has_rumus' => $hasRumus,
                    'rumus_count' => $hasRumus ? count($rumus) : 0,
                    'rumus_type' => gettype($rumus), // ✅ Should be 'array'
                    'rumus_data' => $hasRumus ? $rumus : null, // ✅ Full clean array
                    'rumus_sample' => $hasRumus ? array_slice($rumus, 0, 2) : null,
                    'mongodb_native' => true // ✅ Indicator that this is native MongoDB array
                ];
            }

            return response()->json([
                'success' => true,
                'total_tables' => count($tables),
                'tables_with_rumus' => $totalWithRumus,
                'tables_without_rumus' => count($tables) - $totalWithRumus,
                'storage_type' => 'MongoDB native array (no JSON casting)',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Create columns from header data - menggunakan lkpsTableId
     */
    private function createColumnsFromHeaderData($table, $columns, $parentId = null, $parentOrder = 0, $yellowColumns = [])
    {
        $columnCount = 0;
        $order = 0;

        foreach ($columns as $column) {
            try {
                $dataType = $this->determineColumnType($column['name']);
                $dataIndex = $this->createDataIndex($column['name']);
                $hasChildren = !empty($column['children']);

                $isFillable = in_array($column['column'], $yellowColumns);

                $newColumn = LkpsColumn::create([
                    'lkpsTableId' => (string) $table->_id, // Convert ObjectId to string
                    'indeksData' => $dataIndex,
                    'judul' => $column['name'],
                    'type' => $hasChildren ? 'group' : $dataType,
                    'lebar' => 150,
                    'indeksExcel' => $this->columnLetterToIndex($column['column']) - 1,
                    'order' => $parentId ? $order : $parentOrder + $order,
                    'align' => 'left',
                    'isGroup' => $hasChildren,
                    'parentId' => $parentId,
                    'fillable' => $isFillable
                ]);

                $columnCount++;

                // Handle children recursively
                if ($hasChildren) {
                    $childCount = $this->createColumnsFromHeaderData(
                        $table,
                        $column['children'],
                        $newColumn->_id,
                        $order,
                        $yellowColumns
                    );
                    $columnCount += $childCount;
                }

                $order++;

            } catch (\Exception $e) {
                $this->addLog('error', "    ❌ Gagal membuat kolom '{$column['name']}': {$e->getMessage()}");

                if ($this->debug) {
                    $this->addLog('debug', "Column data: " . json_encode($column));
                    $this->addLog('debug', "Error trace: " . substr($e->getTraceAsString(), 0, 200) . '...');
                }
            }
        }

        return $columnCount;
    }

    /**
     * Check if table is special case (8c or 8d1)
     */
    private function isSpecialTable($tableRef)
    {
        if (!$tableRef)
            return false;

        $tableRef = strtolower(trim($tableRef));
        return in_array($tableRef, ['8c', '8d1']);
    }

    /**
     * Helper methods
     */
    private function clearExistingStructure()
    {
        $this->addLog('warning', '🗑️  Menghapus struktur LKPS yang ada...');

        $deletedColumns = LkpsColumn::count();
        LkpsColumn::query()->delete();
        $this->addLog('info', "   - Kolom dihapus: {$deletedColumns}");

        $deletedTables = LkpsTable::count();
        LkpsTable::query()->delete();
        $this->addLog('info', "   - Tabel dihapus: {$deletedTables}");

        $this->addLog('success', '✅ Struktur lama berhasil dihapus');
    }

    private function updateColumnDataIndicesWithParent()
    {
        $this->addLog('info', '🔄 Memperbarui indeksData kolom berdasarkan relasi parent-child...');

        try {
            $request = new Request();
            $response = $this->lkpsImportController->updateDataIndicesWithParent($request);

            if (isset($response->original['success']) && $response->original['success']) {
                $updatedCount = $response->original['total_updated'] ?? 0;
                $this->addLog('success', "✅ Berhasil memperbarui {$updatedCount} indeks data kolom");
            } else {
                $this->addLog('warning', '⚠️  Gagal memperbarui indeks data kolom');
            }
        } catch (\Exception $e) {
            $this->addLog('error', "❌ Error updating column indices: {$e->getMessage()}");
        }
    }

    /**
     * Get target strata for program (menggunakan strata yang sudah ada di DB)
     */
    private function getProgramStrata($program)
    {
        switch (strtoupper($program)) {
            case 'D-IV':
                return ['D-IV']; // Strata name yang sudah ada di DB
            case 'D-III':
                return ['D-III']; // Strata name yang sudah ada di DB
            default:
                return [];
        }
    }

    /**
     * Update performFinalVerification method
     */
    private function performFinalVerification($program = null)
    {
        $query = LkpsTable::query();

        if ($program) {
            $dbStrataNames = $this->getProgramStrata($program); // ['D-IV'] atau ['D-III']
            if (!empty($dbStrataNames)) {
                // Filter berdasarkan nama strata yang ada di DB melalui relasi
                $query->whereHas('strata', function ($q) use ($dbStrataNames) {
                    $q->whereIn('name', $dbStrataNames);
                });
            }
        } else {
            // Jika tidak ada program filter, hanya include tabel yang memiliki strata
            $query->whereNotNull('strataId');
        }

        $allTablesWithStrata = LkpsTable::whereNotNull('strataId')->with('strata')->get();
        $filteredTables = $query->with('strata')->get();

        // Count duplicate codes (same kode, different strata)
        $allTables = LkpsTable::whereNotNull('strataId')->with('strata')->get();
        $kodeGroups = $allTables->groupBy('kode');
        $duplicateKodes = $kodeGroups->filter(function ($group) {
            return $group->count() > 1;
        });

        $verification = [
            'program_filter' => $program,
            'force_strata_mode' => $program ? true : false,
            'separate_entries_per_strata' => true, // NEW: indicates separate entries
            'total_tables_with_strata' => $allTablesWithStrata->count(),
            'filtered_tables' => $filteredTables->count(),
            'total_columns_in_db' => LkpsColumn::count(),
            'duplicate_code_analysis' => [
                'total_unique_codes' => $kodeGroups->count(),
                'codes_with_multiple_strata' => $duplicateKodes->count(),
                'sample_duplicates' => $duplicateKodes->take(5)->map(function ($group, $kode) {
                    return [
                        'kode' => $kode,
                        'entries' => $group->map(function ($table) {
                            return [
                                'id' => (string) $table->_id,
                                'strata' => $table->strata ? $table->strata->name : 'null',
                                'title' => $table->judul,
                            ];
                        })->values()
                    ];
                })->values()
            ],
            'strata_summary' => [
                'd_iv' => $allTablesWithStrata->filter(function ($table) {
                    return $table->strata && $table->strata->name === 'D-IV';
                })->count(),
                'd_iii' => $allTablesWithStrata->filter(function ($table) {
                    return $table->strata && $table->strata->name === 'D-III';
                })->count(),
                'null_strata_excluded' => LkpsTable::whereNull('strataId')->count()
            ],
            'strata_assignment_flow' => [
                'filtering' => $program ?
                    "Filter tables with " . ($program === 'D-IV' ? 'STr' : 'D3') . " checkmarks only" :
                    'Tables filtered by detected strata from Daftar Tabel',
                'assignment' => $program ?
                    "CREATE separate entries: Same kode with {$program} strata" :
                    'Individual mapping based on detected strata',
                'result' => $program ?
                    "New entries created with {$program} strata (original codes)" :
                    'Mixed strata based on detection'
            ],
            'detection_method' => 'checkmark_based_filtering_separate_entries',
            'entry_logic' => [
                'same_kode_different_strata' => 'Multiple entries allowed',
                'uniqueness_key' => 'Combination of kode + strataId',
                'no_override' => 'Existing entries preserved, new entries created',
                'table_codes' => 'Original codes used (no program suffix)',
                'null_strata_handling' => 'EXCLUDED from database'
            ]
        ];

        return $verification;
    }

    /**
     * Update getSyncStatus method
     */
    public function getSyncStatus(Request $request)
    {
        try {
            $validated = $request->validate([
                'program' => ['nullable', 'string', Rule::in(['D-IV', 'D-III'])],
            ]);

            $program = $validated['program'] ?? null;

            $query = LkpsTable::whereNotNull('strataId');

            if ($program) {
                $strataNames = $this->getProgramStrata($program);
                if (!empty($strataNames)) {
                    $query->whereHas('strata', function ($q) use ($strataNames) {
                        $q->whereIn('name', $strataNames);
                    });
                }
            }

            $tables = $query->with('strata')->get();

            // Count columns menggunakan lkpsTableId
            $tableIds = $tables->pluck('_id')->map(function ($id) {
                return (string) $id;
            });
            $totalColumns = LkpsColumn::whereIn('lkpsTableId', $tableIds)->count();

            // Get all tables for analysis
            $allTables = LkpsTable::whereNotNull('strataId')->with('strata')->get();
            $nullStrataCount = LkpsTable::whereNull('strataId')->count();

            // Analyze duplicate codes
            $kodeGroups = $allTables->groupBy('kode');
            $duplicateKodes = $kodeGroups->filter(function ($group) {
                return $group->count() > 1;
            });

            $statistics = [
                'total_tables' => $tables->count(),
                'total_columns' => $totalColumns,
                'program_filter' => $program,
                'duplicate_code_analysis' => [
                    'total_unique_codes' => $kodeGroups->count(),
                    'total_table_entries' => $allTables->count(),
                    'codes_with_multiple_strata' => $duplicateKodes->count(),
                    'average_entries_per_code' => $kodeGroups->count() > 0 ? round($allTables->count() / $kodeGroups->count(), 2) : 0
                ],
                'strata_breakdown' => [
                    'd_iv' => $tables->filter(function ($table) {
                        return $table->strata && $table->strata->name === 'D-IV';
                    })->count(),
                    'd_iii' => $tables->filter(function ($table) {
                        return $table->strata && $table->strata->name === 'D-III';
                    })->count(),
                    'null_strata_excluded' => $nullStrataCount
                ],
                'relation_info' => [
                    'table_column_relation' => 'LkpsColumn.lkpsTableId → LkpsTable._id',
                    'stored_as' => 'String (not ObjectId)',
                    'table_codes' => 'Original codes (multiple entries per code allowed)',
                    'uniqueness_constraint' => 'kode + strataId combination',
                    'STr_checkmark' => 'Creates entries with D-IV strata',
                    'D3_checkmark' => 'Creates entries with D-III strata'
                ]
            ];

            return response()->json([
                'success' => true,
                'current_status' => $statistics,
                'available_programs' => ['D-IV', 'D-III'],
                'program_mapping' => [
                    'D-IV' => 'STr checkmark → New entry with D-IV strata (original codes)',
                    'D-III' => 'D3 checkmark → New entry with D-III strata (original codes)'
                ],
                'entry_policy' => 'Separate entries per program - same kode with different strata allowed'
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting sync status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil status sync',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add log entry to syncLogs
     */
    private function addLog($level, $message)
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $this->syncLogs[] = "[$timestamp] [$level] $message";
    }

    /**
     * Determine column type based on name (simple heuristic)
     */
    private function determineColumnType($columnName)
    {
        $columnName = trim($columnName);

        if (empty($columnName)) {
            return 'string';
        }

        // Cek jika ada angka di nama kolom
        if (preg_match('/\d/', $columnName)) {
            return 'numeric';
        }

        // Default ke string
        return 'string';
    }

    /**
     * Create data index string from column name
     */
    private function createDataIndex($columnName)
    {
        $columnName = trim($columnName);

        // Convert to lowercase first
        $columnName = strtolower($columnName);

        // Replace forward slash with underscore
        $columnName = str_replace('/', '_', $columnName);

        // Mengganti semua spasi di dalam nama kolom dengan underscore
        $columnName = str_replace(' ', '_', $columnName);

        // Mengganti karakter khusus lainnya dengan underscore (kecuali huruf, angka, dan underscore)
        $columnName = preg_replace('/[^a-z0-9_]/', '_', $columnName);

        // Remove multiple consecutive underscores
        $columnName = preg_replace('/_+/', '_', $columnName);

        // Remove leading/trailing underscores
        $columnName = trim($columnName, '_');

        return $columnName;
    }

    /**
     * Convert column letter to index (A=1, B=2, ..., Z=26, AA=27, AB=28, ...)
     */
    private function columnLetterToIndex($letter)
    {
        $letter = strtoupper(trim($letter));
        $index = 0;
        $length = strlen($letter);

        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord($letter[$i]) - ord('A') + 1);
        }

        return $index;
    }
}
