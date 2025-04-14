<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use MongoDB\Client as MongoClient;
use MongoDB\BSON\ObjectId;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LkpsExportController extends Controller
{
    protected $collection;
    protected $db;
    protected $lkpsColumnCollection;
    protected $lkpsTableCollection;

    public function __construct()
    {
        // Connect to MongoDB
        $client = new MongoClient(env('MONGODB_URI'));
        $this->db = $client->selectDatabase(env('MONGODB_DATABASE'));
        $this->collection = $this->db->selectCollection('lkps_data');

        // Add collections for lkps_column and lkps_table
        $this->lkpsColumnCollection = $this->db->selectCollection('lkps_columns');
        $this->lkpsTableCollection = $this->db->selectCollection('lkps_tables');
    }

    /**
     * Get Excel template file
     */
    public function getTemplate()
    {
        Log::info('Template download requested');

        $filePath = 'templates/LKPS_template.xlsx';
        $fullPath = storage_path('app/public/' . $filePath);

        if (!file_exists($fullPath)) {
            Log::error('Template file not found: ' . $fullPath);
            return response()->json(['message' => 'Template not found'], 404);
        }

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename=LKPS_template.xlsx',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ];

        // Tambahkan CORS headers
        foreach (['Access-Control-Allow-Origin' => '*', 'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers' => 'Content-Type, Authorization'] as $key => $value) {
            $headers[$key] = $value;
        }

        return response()->download($fullPath, 'LKPS_template.xlsx', $headers);
    }

    /**
     * Export data using uploaded template with all sheets
     * Now supports multiple sections based on request
     */
    public function exportData(Request $request)
    {
        try {
            // Tingkatkan batas waktu eksekusi dan memori
            set_time_limit(900); // 15 minutes
            ini_set('memory_limit', '1G');

            // Log memori awal untuk debugging
            Log::info('Initial memory usage: ' . round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB');

            $prodiId = $request->input('prodiId');

            // Get array of section codes to export
            $sectionCodes = $request->input('sections', ['1-1']); // Default to 1-1 if not provided

            if (!is_array($sectionCodes)) {
                $sectionCodes = [$sectionCodes]; // Convert to array if single value
            }

            Log::info('Export data requested', [
                'prodi_id' => $prodiId,
                'section_codes' => $sectionCodes
            ]);

            // Path to template
            $templatePath = storage_path('app/public/templates/LKPS_template.xlsx');
            if (!file_exists($templatePath)) {
                Log::error('Template file not found: ' . $templatePath);
                return response()->json(['message' => 'Template not found'], 404);
            }

            // PENTING: Load template dengan SEMUA sheet (tidak menggunakan setLoadSheetsOnly)
            $reader = IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(false); // Pastikan format dan styling dipertahankan

            Log::info('Loading template with ALL sheets');
            $spreadsheet = $reader->load($templatePath);

            // Log info tentang sheets yang ada
            $availableSheets = $spreadsheet->getSheetNames();
            Log::info('Template loaded with ' . count($availableSheets) . ' sheets: ' . implode(', ', $availableSheets));

            // Process each requested section
            $processedSections = [];

            foreach ($sectionCodes as $sectionCode) {
                // Query MongoDB for this section
                $query = ['section_code' => $sectionCode];
                $documents = $this->collection->find($query)->toArray();

                Log::info("Found " . count($documents) . " documents for section {$sectionCode}");

                if (empty($documents)) {
                    Log::warning("No data found for section {$sectionCode}, skipping");
                    continue;
                }

                // Process the first document for this section
                $doc = $documents[0];

                // Convert MongoDB document to PHP array
                $docArray = json_decode(json_encode($doc), true);

                // Debug: Log the document structure
                Log::info("Document keys for section {$sectionCode}: " . implode(', ', array_keys($docArray)));

                // Check if data exists and is valid
                if (!isset($docArray['data']) || !is_array($docArray['data']) || empty($docArray['data'])) {
                    Log::warning("No valid data found for section {$sectionCode}, skipping");
                    continue;
                }

                $data = $docArray['data'];

                // Debug: Log the first data item structure
                if (count($data) > 0) {
                    Log::info("First data item keys for section {$sectionCode}: " . implode(', ', array_keys($data[0])));
                }

                // Find the corresponding sheet
                $sheet = null;

                // Try exact match first
                if ($spreadsheet->sheetNameExists($sectionCode)) {
                    $sheet = $spreadsheet->getSheetByName($sectionCode);
                    Log::info("Found exact sheet match for section {$sectionCode}");
                } else {
                    // Try alternative naming patterns
                    foreach ($availableSheets as $sheetName) {
                        // Check for various formats like "Tabel 1 Bagian-1" that might match section code "1-1"
                        if (strpos(strtolower($sheetName), strtolower(str_replace('-', ' ', $sectionCode))) !== false) {
                            $sheet = $spreadsheet->getSheetByName($sheetName);
                            Log::info("Found matching sheet: {$sheetName} for section: {$sectionCode}");
                            break;
                        }
                    }
                }

                // If still no match, skip this section
                if (!$sheet) {
                    Log::warning("No matching sheet found for section {$sectionCode}, skipping");
                    continue;
                }

                // Get sheet name for logging
                $sheetName = $sheet->getTitle();
                Log::info("Using sheet: {$sheetName} for data from section: {$sectionCode}");

                // Determine start row from database
                $startRow = $this->getStartRowForSection($sectionCode);

                // Fill the data
                Log::info("Processing " . count($data) . " rows of data for sheet {$sheetName}");
                $rowCount = 0;

                // Get column mappings for this section from database
                $columnMapping = $this->getColumnMappingForSection($sectionCode);

                foreach ($data as $rowIndex => $rowData) {
                    $currentRow = $startRow + $rowIndex;

                    try {
                        // Apply the appropriate column mapping for this section
                        $this->fillRowData($sheet, $currentRow, $rowData, $columnMapping);
                        $rowCount++;
                    } catch (\Exception $e) {
                        Log::error("Error processing row {$rowIndex} for section {$sectionCode}: " . $e->getMessage());
                        // Continue to next row if there's an error
                    }
                }

                Log::info("Successfully filled {$rowCount} rows in sheet {$sheetName} for section {$sectionCode}");
                $processedSections[] = $sectionCode;
            }

            // Log summary
            Log::info("Processed sections: " . implode(', ', $processedSections));

            // Save to temporary file
            $tempFileName = 'LKPS_Export_' . uniqid() . '.xlsx';
            $tempFile = storage_path('app/temp/' . $tempFileName);
            $tempDir = dirname($tempFile);
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            // Write with optimizations
            $writer = new Xlsx($spreadsheet);
            $writer->setPreCalculateFormulas(false); // Performance optimization

            Log::info('Writing file to disk');
            $writer->save($tempFile);

            // Free memory
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
            gc_collect_cycles(); // Force garbage collection

            // Set headers
            $headers = [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename=LKPS_Data_Export.xlsx',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ];

            // Add CORS headers
            foreach (['Access-Control-Allow-Origin' => '*', 'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers' => 'Content-Type, Authorization'] as $key => $value) {
                $headers[$key] = $value;
            }

            Log::info('Sending file to client');
            return response()->download($tempFile, 'LKPS_Data_Export.xlsx', $headers)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            Log::error('Error exporting data: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'message' => 'Error exporting data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the starting row for a specific section from lkps_tables collection
     */
    private function getStartRowForSection($sectionCode)
    {
        try {
            // Find the table associated with this section code
            $table = $this->lkpsTableCollection->findOne(['section_code' => $sectionCode]);

            if ($table) {
                // Convert MongoDB document to PHP array
                $tableArray = json_decode(json_encode($table), true);

                // Use excel_start_row value if available
                if (isset($tableArray['excel_start_row'])) {
                    Log::info("Found start row for section {$sectionCode}: {$tableArray['excel_start_row']}");
                    return (int) $tableArray['excel_start_row'];
                }
            }

            // Default fallback values if not found in database
            $defaultStartRows = [
                '1-1' => 12,
                '1-2' => 12,
                '1-3' => 12,
                '2a1' => 7,
                '2a2' => 7,
                '2a3' => 7,
                '2a4' => 7,
                '2b' => 12,
            ];

            $startRow = $defaultStartRows[$sectionCode] ?? 12;
            Log::info("Using default start row for section {$sectionCode}: {$startRow}");

            return $startRow;

        } catch (\Exception $e) {
            Log::error("Error getting start row for section {$sectionCode}: " . $e->getMessage());
            return 12; // Default fallback value
        }
    }

    /**
     * Convert a numeric index (0, 1, 2, ...) to Excel column letter (A, B, C, ...)
     */
    private function convertToColumnLetter($index)
    {
        $baseChar = ord('A');

        if ($index < 26) {
            return chr($baseChar + $index);
        } else {
            $firstChar = chr($baseChar + (int) ($index / 26) - 1);
            $secondChar = chr($baseChar + ($index % 26));
            return $firstChar . $secondChar;
        }
    }

    /**
     * Get column mapping for a specific section from lkps_columns collection
     */
    private function getColumnMappingForSection($sectionCode)
    {
        try {
            // First, find the table code associated with this section code
            $table = $this->lkpsTableCollection->findOne(['section_code' => $sectionCode]);

            if (!$table) {
                Log::warning("No table found for section {$sectionCode}");
                return [];
            }

            // Convert MongoDB document to PHP array
            $tableArray = json_decode(json_encode($table), true);
            $tableCode = $tableArray['code'];

            Log::info("Found table code for section {$sectionCode}: {$tableCode}");

            // Now find all columns for this table code
            $columns = $this->lkpsColumnCollection->find(['table_code' => $tableCode])->toArray();

            $columnMapping = [];

            foreach ($columns as $column) {
                // Convert MongoDB document to PHP array
                $columnArray = json_decode(json_encode($column), true);

                if (isset($columnArray['data_index']) && isset($columnArray['excel_index'])) {
                    // Convert numeric excel_index to letter (0 -> A, 1 -> B, etc)
                    $excelColumn = $this->convertToColumnLetter($columnArray['excel_index']);
                    $columnMapping[$columnArray['data_index']] = $excelColumn;
                }
            }

            Log::info("Found " . count($columnMapping) . " column mappings for section {$sectionCode}");

            return $columnMapping;

        } catch (\Exception $e) {
            Log::error("Error getting column mapping for section {$sectionCode}: " . $e->getMessage());

            // Default fallback mappings
            $fallbackMappings = [
                // '1-1' => [
                //     'no' => 'A',
                //     'lembaga_mitra' => 'B',
                //     'internasional' => 'C',
                //     'nasional' => 'D',
                //     'lokal_wilayah' => 'E',
                //     'judul_kegiatan_kerjasama' => 'F',
                //     'manfaat_bagi_ps_yang_diakreditasi' => 'G',
                //     'tanggal_awal_kerjasama_hh_bb_tttt' => 'H',
                //     'tanggal_akhir_kerjasama_hh_bb_tttt' => 'I',
                //     'bukti_kerjasama' => 'L',
                // ],
                // Add more fallback mappings as needed
            ];

            return $fallbackMappings[$sectionCode] ?? [];
        }
    }

    /**
     * Fill row data based on column mapping
     */
    private function fillRowData($sheet, $currentRow, $rowData, $columnMapping)
    {
        // Process each field according to mapping
        foreach ($columnMapping as $field => $column) {
            if (isset($rowData[$field])) {
                $value = $rowData[$field];

                // Handle boolean values
                if (is_bool($value)) {
                    $value = $value ? 'V' : '';
                } else if ($value === true) {
                    $value = 'V';
                } else if ($value === false) {
                    $value = '';
                }

                $sheet->setCellValue("{$column}{$currentRow}", $value);
            }
        }
    }

    /**
     * Get template information
     */
    public function getTemplateInfo()
    {
        try {
            $filePath = 'templates/LKPS_template.xlsx';
            $fullPath = storage_path('app/public/' . $filePath);

            // Check if template exists
            if (!File::exists($fullPath)) {
                Log::info('No template available at: ' . $fullPath);

                return response()->json([
                    'message' => 'No template available',
                    'exists' => false
                ]);
            }

            // Get template metadata
            $lastUpdated = date('Y-m-d H:i:s', File::lastModified($fullPath));
            $fileSize = $this->formatFileSize(File::size($fullPath));

            // Get sheet information
            $sheets = [];
            try {
                $zip = new \ZipArchive();
                if ($zip->open($fullPath) === TRUE) {
                    if (($index = $zip->locateName('xl/workbook.xml')) !== false) {
                        $data = $zip->getFromIndex($index);
                        $xml = simplexml_load_string($data);
                        $xml->registerXPathNamespace('ns', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
                        $sheetNodes = $xml->xpath('//ns:sheet');
                        foreach ($sheetNodes as $sheet) {
                            $sheets[] = (string) $sheet['name'];
                        }
                    }
                    $zip->close();
                }
            } catch (\Exception $e) {
                Log::warning('Error extracting sheet information: ' . $e->getMessage());
            }

            Log::info('Template info requested', [
                'exists' => true,
                'path' => $fullPath,
                'lastModified' => $lastUpdated,
                'size' => $fileSize,
                'sheet_count' => count($sheets)
            ]);

            return response()->json([
                'exists' => true,
                'lastUpdated' => $lastUpdated,
                'fileSize' => $fileSize,
                'uploadedBy' => 'System',
                'sheets' => $sheets
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting template information: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error getting template information',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload template Excel file
     */
    public function uploadTemplate(Request $request)
    {
        try {
            Log::info('Template upload requested', [
                'has_file' => $request->hasFile('template') ? 'yes' : 'no',
                'files_count' => count($request->allFiles())
            ]);

            if (!$request->hasFile('template')) {
                Log::warning('No file in upload request', [
                    'content_length' => $request->header('Content-Length'),
                    'content_type' => $request->header('Content-Type'),
                    'post_keys' => array_keys($request->all())
                ]);

                return response()->json([
                    'message' => 'Error uploading template',
                    'error' => 'No file found in request'
                ], 400);
            }

            $file = $request->file('template');
            Log::info('File received', [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType()
            ]);

            // Validate Excel file
            if (!$file->isValid()) {
                Log::error('Invalid file: ' . $file->getErrorMessage());
                return response()->json([
                    'message' => 'Error uploading template',
                    'error' => 'Invalid file: ' . $file->getErrorMessage()
                ], 400);
            }

            // Ensure storage directory exists
            $storageDir = storage_path('app/public/templates');
            if (!File::exists($storageDir)) {
                File::makeDirectory($storageDir, 0755, true);
                Log::info('Created directory: ' . $storageDir);
            }

            // Move file to storage
            $destinationPath = $storageDir . '/LKPS_template.xlsx';
            Log::info('Moving file to: ' . $destinationPath);

            // First try Laravel's move method
            $success = false;
            try {
                $success = $file->move($storageDir, 'LKPS_template.xlsx');
                Log::info('Move result: ' . ($success ? 'success' : 'failed'));
            } catch (\Exception $e) {
                Log::warning('Laravel move failed: ' . $e->getMessage());
                // Fallback to direct copy
                $success = copy($file->getRealPath(), $destinationPath);
                Log::info('Fallback copy result: ' . ($success ? 'success' : 'failed'));
            }

            if (!$success) {
                Log::error('Failed to move/copy file');
                return response()->json([
                    'message' => 'Error uploading template',
                    'error' => 'Failed to save file. Check server permissions.'
                ], 500);
            }

            // Check that the file exists after copy
            if (!File::exists($destinationPath)) {
                Log::error('File not found after copy operation', [
                    'destination' => $destinationPath,
                    'source_exists' => File::exists($file->getRealPath()) ? 'yes' : 'no'
                ]);

                return response()->json([
                    'message' => 'Error uploading template',
                    'error' => 'File was not saved correctly'
                ], 500);
            }

            // File permission check and fix
            if (!is_readable($destinationPath)) {
                $perms = fileperms($destinationPath) & 0777;
                Log::warning('Fixing file permissions', [
                    'before' => sprintf('%04o', $perms)
                ]);
                chmod($destinationPath, 0644);
                Log::info('Permissions after fix: ' . sprintf('%04o', fileperms($destinationPath) & 0777));
            }

            Log::info('Template uploaded successfully', [
                'path' => $destinationPath,
                'size' => File::size($destinationPath)
            ]);

            return response()->json([
                'message' => 'Template uploaded successfully',
                'path' => 'templates/LKPS_template.xlsx'
            ]);
        } catch (\Exception $e) {
            Log::error('Exception in uploadTemplate: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Error uploading template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper function to format file size
     */
    private function formatFileSize($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}