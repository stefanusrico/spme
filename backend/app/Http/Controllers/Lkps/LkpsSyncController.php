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

    /**
     * Sync LKPS structure from Google Sheets
     */
    public function syncLkpsStructure(Request $request)
    {
        set_time_limit(300);
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

    /**
     * Create columns for table dengan special case handling
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
                'program' => $program // NEW: Pass program to LkpsImportController
            ]);

            $response = $this->lkpsImportController->getColoredCellsByTable($request, $tableRef);

            if (!isset($response->original['restructured_data'][0]['columns'])) {
                $this->addLog('warning', "  ⚠️  Tidak ditemukan struktur kolom untuk tabel {$table->kode}");
                // Delete table without columns
                $table->delete();
                return false;
            }

            $originalData = $response->original;
            $headerData = $originalData['restructured_data'][0];

            // Log special case info if available
            if (isset($originalData['is_special_table']) && $originalData['is_special_table']) {
                $specialInfo = $originalData['special_case_info'];
                $this->addLog('info', "  🔴 Special case aktif: {$specialInfo['search_text']} di baris {$specialInfo['target_row']}");
                $this->addLog('info', "  📍 Range deteksi: baris {$specialInfo['detection_start']} - " . ($specialInfo['detection_end'] ?? 'akhir'));
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

            // Delete table on error
            $table->delete();
            return false;
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
