<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\GoogleSheetController;
use App\Models\LkpsSection;
use App\Models\LkpsTable;
use App\Models\LkpsColumn;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;
use Illuminate\Support\Str;

class LkpsSyncCommand extends Command
{
    /**
     * Nama command untuk dijalankan lewat terminal
     *
     * @var string
     */

     //php artisan lkps:sync --spreadsheet_id=1eTiQOVI5Ac1cHEzkBL1kkUA9uSP2aoM7ntukkLRxND8 --clear
    protected $signature = 'lkps:sync 
                            {--spreadsheet_id= : ID Google Spreadsheet}
                            {--clear : Hapus struktur yang sudah ada sebelum sinkronisasi}
                            {--debug : Tampilkan output debugging lengkap}';

    /**
     * Deskripsi command
     *
     * @var string
     */
    protected $description = 'Sinkronisasi struktur LKPS dari Google Sheets (section, table, column) dalam satu command';

    /**
     * GoogleSheetController yang digunakan
     */
    private $googleSheetController;

    /**
     * Spreadsheet ID
     */
    private $spreadsheetId;

    /**
     * Hasil struktur yang dibuat
     */
    private $generatedStructure = [
        'sections' => 0,
        'tables' => 0,
        'columns' => 0
    ];

    private $attemptedTables = 0;
    private $successTables = 0;
    private $failedTables = 0;
    private $debug = false;

    /**
     * Konstruktor
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memulai sinkronisasi struktur LKPS dari Google Sheets...');

        // Set debug mode
        $this->debug = $this->option('debug');

        // Validasi spreadsheet_id
        $this->spreadsheetId = $this->option('spreadsheet_id');
        if (!$this->spreadsheetId) {
            $this->spreadsheetId = $this->ask('Masukkan ID Google Spreadsheet');
        }

        // Inisialisasi GoogleSheetController
        $this->googleSheetController = new GoogleSheetController(new Request(['spreadsheet_id' => $this->spreadsheetId]));

        // Cek apakah perlu hapus struktur lama
        if ($this->option('clear')) {
            if ($this->confirm('Yakin ingin menghapus semua struktur LKPS yang ada?', true)) {
                $this->clearExistingStructure();
            }
        }

        try {
            // Step 1: Ambil data dari Google Sheet Controller
            $response = $this->fetchTablesFromGoogleSheet();

            if (!$response) {
                $this->error('Gagal mendapatkan data dari Google Sheets.');
                return 1;
            }

            // Log response untuk debugging
            if ($this->debug) {
                $this->info('Data dari Google Sheets:');
                $this->info('Title Mappings: ' . json_encode($response['title_mappings'] ?? []));
                $this->info('Mapping: ' . json_encode($response['mapping'] ?? []));
            }

            // Step 2: Buat struktur section dan table
            $this->createSectionsAndTables($response);

            // Step 3: Update data indices untuk kolom dengan menggunakan pendekatan parent-child
            $this->updateColumnDataIndicesWithParent();

            // Tampilkan ringkasan
            $this->info('Sinkronisasi selesai!');
            $this->info('Total struktur yang dibuat:');
            $this->info('- Sections: ' . $this->generatedStructure['sections']);
            $this->info('- Tables: ' . $this->generatedStructure['tables'] . " (Attempted: {$this->attemptedTables}, Success: {$this->successTables}, Failed: {$this->failedTables})");
            $this->info('- Columns: ' . $this->generatedStructure['columns']);

            return 0;
        } catch (\Exception $e) {
            $this->error('Terjadi kesalahan: ' . $e->getMessage());
            $this->error($e->getTraceAsString());

            Log::error('Error syncing LKPS structure: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return 1;
        }
    }

    /**
     * Hapus struktur LKPS yang sudah ada
     */
    private function clearExistingStructure()
    {
        $this->info('Menghapus struktur LKPS yang sudah ada...');

        // Hapus LkpsColumn terlebih dahulu untuk menghindari constraint error
        $columnCount = LkpsColumn::count();
        LkpsColumn::query()->delete();

        // Hapus LkpsTable
        $tableCount = LkpsTable::count();
        LkpsTable::query()->delete();

        // Hapus LkpsSection
        $sectionCount = LkpsSection::count();
        LkpsSection::query()->delete();

        $this->info("Berhasil menghapus $sectionCount section, $tableCount tabel, dan $columnCount kolom.");
    }

    /**
     * Ambil data dari Google Sheet Controller
     */
    private function fetchTablesFromGoogleSheet()
    {
        $this->info('Mengambil data dari Google Sheets...');

        $request = new Request(['spreadsheet_id' => $this->spreadsheetId]);
        $response = $this->googleSheetController->getAvailableTables($request);

        if (!isset($response->original)) {
            $this->error('Response tidak memiliki property "original"');
            if ($this->debug) {
                $this->info('Response: ' . json_encode($response));
            }
            return null;
        }

        // WORKAROUND: Fix untuk masalah struktur response
        // Dalam log terlihat hanya 1 sheet name yang digunakan (Tabel 7 PkM DTPS yang Melibatkan Mahasiswa)
        // Pastikan sheet_names berisi mapping lengkap dari judul ke sheet name
        if (!isset($response->original['sheet_names']) || empty($response->original['sheet_names'])) {
            $this->info('PERBAIKAN: sheet_names tidak ditemukan atau kosong dalam response. Mencoba ekstrak dari data lain...');

            // Coba ekstrak sheet_names dari struktur lain
            if (isset($response->original['sheets']) && is_array($response->original['sheets'])) {
                $this->info('Membuat sheet_names dari sheets array...');
                $response->original['sheet_names'] = [];

                foreach ($response->original['sheets'] as $sheet) {
                    // Pastikan sheet memiliki properties dan title
                    if (isset($sheet['properties']) && isset($sheet['properties']['title'])) {
                        $sheetTitle = $sheet['properties']['title'];
                        $response->original['sheet_names'][$sheetTitle] = $sheetTitle;
                    }
                }

                // WORKAROUND: Jika kedua table menggunakan sheet name yang sama, 
                // coba fix dengan mencari nama sheet yang lebih sesuai
                if (
                    isset($nameSheet) && $nameSheet == "Tabel 7 PkM DTPS yang Melibatkan Mahasiswa" &&
                    isset($title) && strpos($title, "Tabel 3.b.7)") !== false
                ) {
                    $this->info("  PERBAIKAN: Mendeteksi penggunaan sheet name yang sama untuk tabel yang berbeda.");
                    $this->info("  Mencoba mencari sheet name yang lebih sesuai untuk '$title'...");

                    // Coba cari sheet name yang cocok dengan prefix table
                    foreach ($sheetNames as $sheetTitle => $sheetName) {
                        if (
                            strpos($sheetTitle, "3.b.7") !== false ||
                            strpos($sheetName, "3.b.7") !== false ||
                            strpos($sheetTitle, "Produk") !== false ||
                            strpos($sheetName, "Produk") !== false
                        ) {
                            $nameSheet = $sheetName;
                            $this->info("  Menemukan nama sheet yang lebih sesuai: '$sheetName'");
                            break;
                        }
                    }
                }
            }
        }

        // Tambahkan debug log untuk menampilkan struktur response
        if ($this->debug) {
            $this->info('Response struktur: ' . json_encode(array_keys($response->original)));
            $this->info('Sheet names count: ' . count($response->original['sheet_names'] ?? []));
            if (isset($response->original['sheet_names'])) {
                $this->info('Sample sheet names: ' . json_encode(array_slice($response->original['sheet_names'], 0, 5, true)));
            }
        }

        return $response->original;
    }

    /**
     * Buat struktur section dan table
     */
    private function createSectionsAndTables($response)
    {
        $this->info('Membuat struktur section dan table...');

        // Ambil data dari response
        $titleMappings = $response['title_mappings'] ?? [];
        $sheets = $response['sheets'] ?? [];

        $available_sheets = [];

        // Ambil semua sheet names yang tersedia dari response
        if (isset($response['sheets']) && is_array($response['sheets'])) {
            foreach ($response['sheets'] as $sheet) {
                if (isset($sheet['properties']['title'])) {
                    $available_sheets[] = $sheet['properties']['title'];
                }
            }
            $this->info('Sheets yang tersedia: ' . implode(', ', $available_sheets));
        }

        if (empty($titleMappings)) {
            $this->error('Tidak ada data title_mappings yang ditemukan.');
            return;
        }

        // Buat sections
        $createdSections = [];
        $sectionOrder = 1;

        foreach ($titleMappings as $title => $sectionCode) {
            // Ambil subtitle jika ada
            $subtitle = $this->extractSubtitle($title);

            // Buat section
            $section = LkpsSection::updateOrCreate(
                ['code' => $sectionCode],
                [
                    'title' => $title,
                    'subtitle' => $subtitle,
                    'order' => $sectionOrder++,
                    'has_formula' => false,
                    'formula_nomor' => null,
                    'formula_sub' => null
                ]
            );

            $createdSections[$sectionCode] = $section;
            $this->generatedStructure['sections']++;
            $this->info("- Section dibuat: {$section->code} - {$section->title}");
        }

        // Buat tables
        $tableOrder = 1;

        // Log semua title dalam titleMappings
        $this->info('--- Daftar semua tabel yang akan dibuat ---');
        foreach ($titleMappings as $title => $sectionCode) {
            $this->info("Tabel: '$title' (Section: $sectionCode)");
        }
        $this->info('----------------------------------------');

        // Counter untuk tracking tables
        $this->attemptedTables = 0;
        $this->successTables = 0;
        $this->failedTables = 0;

        foreach ($titleMappings as $title => $sectionCode) {
            $this->attemptedTables++;
            if (!isset($createdSections[$sectionCode])) {
                $this->warn("  Section $sectionCode tidak ditemukan, melewati tabel untuk $title");
                continue;
            }

            // Generate unique table code
            $tableCode = $this->generateTableCode($title);

            // Ambil nama tabel tanpa prefix "Tabel X"
            $cleanTableTitle = preg_replace('/^Tabel\s+[\d\.a-z\(\)]+\s*/i', '', $title);

            // SOLUSI SEDERHANA: Gunakan nama sheet yang langsung tersedia di response jika ada
            // Mencari sheet berdasarkan tabel title, clean title atau section code
            $nameSheet = null;

            // Coba match dengan nama sheet yang tersedia
            foreach ($available_sheets as $sheet) {
                if (
                    stripos($sheet, $cleanTableTitle) !== false ||
                    stripos($cleanTableTitle, $sheet) !== false ||
                    stripos($sheet, $sectionCode) !== false
                ) {
                    $nameSheet = $sheet;
                    $this->info("  Menemukan sheet name: $nameSheet untuk tabel $title");
                    break;
                }
            }

            // Fallback: jika tidak ketemu, gunakan section code
            if (!$nameSheet) {
                $nameSheet = $sectionCode;
                $this->info("  Menggunakan section code sebagai sheet name: $nameSheet");
            }

            // Buat tabel
            $table = LkpsTable::updateOrCreate(
                [
                    'section_code' => $sectionCode,
                    'code' => $tableCode
                ],
                [
                    'title' => $title,
                    'excel_start_row' => 2, // Default, akan diupdate saat analisis kolom
                    'pagination' => ['enabled' => true, 'size' => 10],
                    'order' => $tableOrder++,
                    'used_in_formula' => false
                ]
            );

            $this->generatedStructure['tables']++;
            $this->successTables++;
            $this->info("- Tabel dibuat: {$table->code} - {$table->title}");
            $this->info("  Sheet name yang digunakan: $nameSheet");

            // Buat kolom untuk tabel ini
            $this->createColumnsForTable($table, $nameSheet);
        }
    }

    /**
     * Ekstrak subtitle dari title
     */
    private function extractSubtitle($title)
    {
        // Coba ekstrak subtitle (bagian setelah "-" atau ":" jika ada)
        if (preg_match('/^.+[-:]\s*(.+)$/i', $title, $matches)) {
            return trim($matches[1]);
        }

        return '';
    }

    /**
     * Generate kode tabel dari judul
     */
    private function generateTableCode($title)
    {
        // Contoh: "Tabel 1 Kerjasama Tridharma Perguruan Tinggi - Pendidikan" -> "kerjasama_pendidikan"

        // Hapus "Tabel X" dari awal judul
        $cleanTitle = preg_replace('/^Tabel\s+[\d\.a-z\(\)]+\s*/i', '', $title);

        // Jika ada subtitel (setelah "-" atau ":"), ambil bagian setelahnya
        if (preg_match('/[-:]\s*(.+)$/i', $cleanTitle, $matches)) {
            $mainTitle = trim($matches[1]);
        } else {
            $mainTitle = $cleanTitle;
        }

        // Bersihkan dan konversi ke snake_case
        $tableCode = Str::snake(preg_replace('/[^a-z0-9\s]/i', ' ', $mainTitle));

        return $tableCode;
    }

    /**
     * Membersihkan judul tabel untuk perbandingan
     */
    private function cleanTableTitle($title)
    {
        // Hapus semua spasi berlebih
        $clean = trim(preg_replace('/\s+/', ' ', $title));

        // Hapus tanda baca dan karakter khusus
        $clean = preg_replace('/[^\p{L}\p{N}\s]/u', '', $clean);

        // Lowercase
        $clean = strtolower($clean);

        // Hapus "tabel X" prefix jika ada
        $clean = preg_replace('/^tabel\s+[\d\.a-z\(\)]+\s*/i', '', $clean);

        return trim($clean);
    }

    /**
     * Buat kolom untuk tabel
     */
    private function createColumnsForTable($table, $nameSheet)
    {
        $this->info("  Menganalisis dan membuat kolom untuk tabel {$table->code}...");

        try {
            // Ambil struktur kolom dari Google Sheets
            $request = new Request([
                'spreadsheet_id' => $this->spreadsheetId,
                'table_ref' => $nameSheet
            ]);

            $response = $this->googleSheetController->getColoredCellsByTable($request, $nameSheet);

            if ($this->debug) {
                $this->info("  Response getColoredCellsByTable untuk {$nameSheet}: " . json_encode($response->original ?? 'No original data'));
            }

            if (!isset($response->original) || !isset($response->original['restructured_data']) || empty($response->original['restructured_data'])) {
                $this->warn("  Tidak ditemukan struktur kolom untuk tabel {$table->code}");
                return;
            }

            $restructuredData = $response->original['restructured_data'];
            $headerData = $restructuredData[0] ?? null;

            if (!$headerData || empty($headerData['columns'])) {
                $this->warn("  Tidak ditemukan header untuk tabel {$table->code}");
                if ($this->debug) {
                    $this->info("  Header data: " . json_encode($headerData));
                }
                return;
            }

            // Update excel_start_row jika ditemukan
            if (isset($headerData['header_row']) && $headerData['header_row'] > 0) {
                $table->excel_start_row = $headerData['header_row'] + 1;
                $table->save();
                $this->info("  Excel start row diupdate menjadi {$table->excel_start_row}");
            }

            // Hapus kolom yang sudah ada untuk tabel ini
            $deletedColumns = LkpsColumn::where('table_code', $table->code)->delete();
            $this->info("  Menghapus {$deletedColumns} kolom lama untuk tabel {$table->code}");

            // Buat kolom baru
            $columnCount = $this->createColumnsFromHeaderData($table, $headerData['columns']);
            $this->info("  Berhasil membuat {$columnCount} kolom untuk tabel {$table->code}");

        } catch (\Exception $e) {
            $this->error("  Gagal membuat kolom untuk tabel {$table->code}: {$e->getMessage()}");
            Log::error("Error creating columns for table {$table->code}: {$e->getMessage()}");
            Log::error($e->getTraceAsString());

            if ($this->debug) {
                $this->error($e->getTraceAsString());
            }
        }
    }

    /**
     * Buat kolom dari data header yang sudah distrukturisasi
     * Implementasi dasar untuk membuat kolom, tanpa mengatur data_index berdasarkan parent
     */
    private function createColumnsFromHeaderData($table, $columns, $parentId = null, $parentOrder = 0)
    {
        $columnCount = 0;
        $order = 0;

        foreach ($columns as $column) {
            try {
                // Tentukan tipe data dan index
                $dataType = $this->determineColumnType($column['name']);
                $dataIndex = $this->createDataIndex($column['name']);
                $hasChildren = !empty($column['children']);

                // Buat kolom
                $newColumn = LkpsColumn::create([
                    'table_code' => $table->code,
                    'data_index' => $dataIndex,
                    'title' => $column['name'],
                    'type' => $hasChildren ? 'group' : $dataType,
                    'width' => 150, // Default
                    'excel_index' => $this->columnLetterToIndex($column['column']) - 1, // Konversi ke 0-based
                    'order' => $parentId ? $order : $parentOrder + $order,
                    'align' => 'left',
                    'is_group' => $hasChildren,
                    'parent_id' => $parentId
                ]);

                $columnCount++;
                $this->generatedStructure['columns']++;

                if ($this->debug) {
                    $this->info("    Kolom dibuat: {$column['name']} (type: " . ($hasChildren ? 'group' : $dataType) . ")");
                }

                // Rekursif untuk child columns
                if ($hasChildren) {
                    $childCount = $this->createColumnsFromHeaderData(
                        $table,
                        $column['children'],
                        $newColumn->_id,
                        $order
                    );
                    $columnCount += $childCount;
                }

                $order++;
            } catch (\Exception $e) {
                $this->error("    Gagal membuat kolom '{$column['name']}': {$e->getMessage()}");
                Log::error("Error creating column '{$column['name']}': {$e->getMessage()}");
            }
        }

        return $columnCount;
    }

    /**
     * Update data_index untuk semua kolom dengan menggunakan pendekatan parent-child
     * Metode ini akan dijalankan setelah semua kolom dibuat
     */
    private function updateColumnDataIndicesWithParent()
    {
        $this->info('Memperbarui data_index kolom berdasarkan relasi parent-child...');
        
        // Ambil semua kolom
        $allColumns = LkpsColumn::all();
        
        // Kelompokkan berdasarkan ID untuk pencarian cepat
        $columnsById = [];
        foreach ($allColumns as $column) {
            $columnsById[(string)$column->_id] = $column;
        }
        
        // Track jumlah kolom yang diupdate
        $updatedCount = 0;
        
        // Proses setiap kolom yang memiliki parent_id
        foreach ($allColumns as $column) {
            if (!empty($column->parent_id)) {
                // Konversi parent_id ke string jika berupa ObjectId
                $parentId = $column->parent_id;
                if (is_object($parentId)) {
                    if (method_exists($parentId, '__toString')) {
                        $parentId = (string)$parentId;
                    } elseif (property_exists($parentId, '$oid')) {
                        $parentId = $parentId->{'$oid'};
                    }
                }
                
                // Cari parent column
                $parent = null;
                foreach ($allColumns as $possibleParent) {
                    $possibleParentId = (string)$possibleParent->_id;
                    if (is_object($possibleParent->_id)) {
                        if (method_exists($possibleParent->_id, '__toString')) {
                            $possibleParentId = (string)$possibleParent->_id;
                        } elseif (property_exists($possibleParent->_id, '$oid')) {
                            $possibleParentId = $possibleParent->_id->{'$oid'};
                        }
                    }
                    
                    if ($possibleParentId === $parentId) {
                        $parent = $possibleParent;
                        break;
                    }
                }
                
                if ($parent) {
                    // Format parent title untuk data_index
                    $parentTitle = $this->formatTitleForDataIndex($parent->title);
                    $originalIndex = $column->data_index;
                    $newDataIndex = '';
                    
                    // Kasus khusus untuk kolom tingkat (internasional, nasional, lokal)
                    if (
                        strtolower($parent->title) === 'tingkat' || 
                        strpos(strtolower($parent->title), 'tingkat') !== false
                    ) {
                        // Format tingkat_[child] untuk kompatibilitas dengan front-end
                        // Contoh: "internasional" menjadi "tingkat_internasional"
                        $newDataIndex = 'tingkat_' . $originalIndex;
                        
                        $this->info("    Special case: {$column->title} with parent '{$parent->title}' - using '{$newDataIndex}'");
                    } else {
                        // Format standar [child]_[parent]
                        // Cek apakah data_index sudah mengandung parent title
                        if (strpos(strtolower($originalIndex), strtolower($parentTitle)) === false) {
                            $newDataIndex = $originalIndex . '_' . $parentTitle;
                        } else {
                            $newDataIndex = $originalIndex; // Tidak perlu diupdate
                        }
                    }
                    
                    // Update record jika data_index berubah
                    if ($newDataIndex && $newDataIndex !== $originalIndex) {
                        $column->data_index = $newDataIndex;
                        $column->save();
                        
                        $updatedCount++;
                        
                        if ($this->debug) {
                            $this->info("    Updated: {$column->title} data_index dari '{$originalIndex}' menjadi '{$newDataIndex}'");
                        }
                    }
                }
            }
        }
        
        $this->info("Total {$updatedCount} kolom diupdate dengan data_index yang mengandung parent title.");
    }

    /**
     * Format judul untuk digunakan dalam data_index
     */
    private function formatTitleForDataIndex($title)
    {
        // Konversi ke lowercase
        $formatted = strtolower($title);
        
        // Ganti spasi dan karakter khusus dengan underscore
        $formatted = preg_replace('/[^a-z0-9]+/', '_', $formatted);
        
        // Hapus underscore di awal dan akhir
        $formatted = trim($formatted, '_');
        
        return $formatted;
    }

    /**
     * Tentukan tipe data kolom berdasarkan nama
     */
    private function determineColumnType($columnName)
    {
        $columnName = strtolower($columnName);

        // Kolom dengan tipe numerik
        if (
            strpos($columnName, 'jumlah') !== false ||
            strpos($columnName, 'total') !== false ||
            strpos($columnName, 'nilai') !== false ||
            strpos($columnName, 'skor') !== false ||
            strpos($columnName, 'durasi') !== false ||
            strpos($columnName, 'no.') !== false ||
            preg_match('/ts[-\d]/i', $columnName)
        ) {
            return 'number';
        }

        // Kolom dengan tipe tanggal
        if (
            strpos($columnName, 'tanggal') !== false ||
            strpos($columnName, 'tgl') !== false
        ) {
            return 'date';
        }

        // Kolom dengan tipe boolean
        if (
            strpos($columnName, 'status') !== false ||
            strpos($columnName, 'aktif') !== false ||
            strpos($columnName, 'internasional') !== false ||
            strpos($columnName, 'nasional') !== false ||
            strpos($columnName, 'lokal') !== false
        ) {
            return 'boolean';
        }

        // Kolom dengan tipe URL
        if (
            strpos($columnName, 'link') !== false ||
            strpos($columnName, 'bukti') !== false
        ) {
            return 'url';
        }

        // Default: text
        return 'text';
    }

    /**
     * Buat index data berdasarkan nama kolom
     */
    private function createDataIndex($columnName)
    {
        // Ubah ke lowercase
        $dataIndex = strtolower($columnName);

        // Hapus karakter khusus dan ganti spasi dengan underscore
        $dataIndex = preg_replace('/[^\p{L}\p{N}]+/u', '_', $dataIndex);

        // Hapus underscore berlebih
        $dataIndex = preg_replace('/_+/', '_', $dataIndex);

        // Hapus underscore di awal dan akhir
        $dataIndex = trim($dataIndex, '_');

        return $dataIndex;
    }

    /**
     * Convert column letter to index (A=1, B=2, Z=26, AA=27, etc.)
     */
    private function columnLetterToIndex($column)
    {
        $column = strtoupper($column);
        $result = 0;

        for ($i = 0; $i < strlen($column); $i++) {
            $result = $result * 26 + (ord($column[$i]) - ord('A') + 1);
        }

        return $result;
    }
}