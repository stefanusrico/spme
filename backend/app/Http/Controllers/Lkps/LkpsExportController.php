<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use App\Models\Lkps\LkpsData;
use App\Models\Lkps\LkpsTable;
use App\Models\Project\Project;
use App\Models\Project\Task;
use App\Models\Project\TaskList;
use Illuminate\Support\Facades\Auth;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LkpsExportController extends Controller
{
    /**
     * Export data using uploaded template with all sheets
     * Uses EXACT SAME LOGIC as getTableData for consistency
     */
    public function exportData(Request $request)
    {
        try {
            // Set higher execution time and memory limits
            set_time_limit(900); // 15 minutes
            ini_set('memory_limit', '1G');

            // Log initial memory for debugging
            Log::info('Initial memory usage: ' . round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB');

            // Get parameters
            $projectId = $request->input('projectId');
            $debugMode = $request->input('debug_mode', false);

            // Log request info
            Log::info('Export data requested', [
                'project_id' => $projectId,
                'user_id' => Auth::id() ?? null,
                'table_code' => $request->input('table_code'),
                'debug_mode' => $debugMode
            ]);

            // Validate projectId is provided (unless in debug mode)
            if (empty($projectId) && !$debugMode) {
                Log::error('Project ID not provided');
                return response()->json(['message' => 'Project ID is required'], 400);
            }

            // Verify project exists (same as getTableData)
            if (!$debugMode) {
                $project = Project::find($projectId);
                if (!$project) {
                    return response()->json(['message' => 'Project not found'], 404);
                }
            }

            // Get array of table codes to export
            $tableCodes = [];

            if ($request->has('table_code')) {
                $tableCode = $request->input('table_code');
                $tableCodes = is_array($tableCode) ? $tableCode : [$tableCode];
                Log::info('Processing tables: ' . implode(', ', $tableCodes));
            } else if ($request->has('sections')) {
                $sections = $request->input('sections');
                $tableCodes = is_array($sections) ? $sections : [$sections];
                Log::info('Using sections parameter: ' . implode(', ', $tableCodes));
            } else {
                $tableCodes = ['1-1']; // Default
                Log::info('No table specified, defaulting to: 1-1');
            }

            // Load template
            $templatePath = storage_path('app/public/templates/LKPS_template.xlsx');
            if (!file_exists($templatePath)) {
                Log::error('Template file not found: ' . $templatePath);
                return response()->json(['message' => 'Template not found'], 404);
            }

            // Load spreadsheet with all sheets
            $reader = IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(false); // Preserve formatting and styles
            $spreadsheet = $reader->load($templatePath);

            // Log available sheets
            $availableSheets = $spreadsheet->getSheetNames();
            Log::info('Template loaded with ' . count($availableSheets) . ' sheets');

            // Process each requested section
            $processedSections = [];

            foreach ($tableCodes as $tableCode) {
                // ✅ EXACT SAME LOGIC AS getTableData

                // 1. Find the table (same validation as getTableData)
                $table = LkpsTable::where('kode', $tableCode)->first();
                if (!$table) {
                    Log::warning("Table not found: {$tableCode}, skipping");
                    continue;
                }

                // 2. Find the task (EXACT SAME LOGIC as getTableData)
                $taskId = null;
                $taskLists = TaskList::where('projectId', $projectId)->get();

                if (!$taskLists->isEmpty()) {
                    $taskListIds = $taskLists->pluck('_id')->toArray();

                    $task = Task::whereIn('taskListId', $taskListIds)
                        ->where('lkpsTableId', $table->_id)
                        ->first();

                    if ($task) {
                        $taskId = $task->_id;
                        Log::info("Found task {$taskId} for table {$tableCode} in project {$projectId}");
                    } else {
                        Log::warning("No task found for table {$tableCode} in any task list of project {$projectId}");
                    }
                }

                // 3. Get the LkpsData (EXACT SAME LOGIC as getTableData)
                if (!$taskId) {
                    Log::warning("No task found for table {$tableCode} in the project, skipping");
                    continue;
                }

                $lkpsData = LkpsData::where('lkpsTableId', $table->_id)
                    ->where('taskId', $taskId)
                    ->first();

                if (!$lkpsData) {
                    Log::info("No LkpsData found for table {$tableCode} and task {$taskId} in project {$projectId}");
                    Log::warning("No data found for table {$tableCode}, skipping");
                    continue;
                }

                // 4. Extract data (same as getTableData response)
                $data = $lkpsData->data ?? [];

                if (empty($data)) {
                    Log::warning("No valid data found for table {$tableCode}, skipping");
                    continue;
                }

                Log::info("Found " . count($data) . " rows for table {$tableCode}");

                // 5. Find the corresponding Excel sheet
                $sheet = null;

                // Try exact match first
                if ($spreadsheet->sheetNameExists($tableCode)) {
                    $sheet = $spreadsheet->getSheetByName($tableCode);
                    Log::info("Found exact sheet match for table {$tableCode}");
                } else {
                    // Try alternative naming patterns
                    foreach ($availableSheets as $sheetName) {
                        // Check for various formats like "Tabel 1 Bagian-1" that might match section code "1-1"
                        if (strpos(strtolower($sheetName), strtolower(str_replace('-', ' ', $tableCode))) !== false) {
                            $sheet = $spreadsheet->getSheetByName($sheetName);
                            Log::info("Found matching sheet: {$sheetName} for table: {$tableCode}");
                            break;
                        }
                    }
                }

                // If still no match, skip this section
                if (!$sheet) {
                    Log::warning("No matching sheet found for table {$tableCode}, skipping");
                    continue;
                }

                // Get sheet name for logging
                $sheetName = $sheet->getTitle();
                Log::info("Using sheet: {$sheetName} for data from table: {$tableCode}");

                // 6. Fill Excel data
                $startRow = $this->getStartRowForSection($tableCode);
                $columnMapping = $this->getColumnMappingForSection($tableCode);

                Log::info("Processing " . count($data) . " rows of data for sheet {$sheetName}");
                $rowCount = 0;

                foreach ($data as $rowIndex => $rowData) {
                    $currentRow = $startRow + $rowIndex;

                    try {
                        // Apply the appropriate column mapping for this section
                        $this->fillRowData($sheet, $currentRow, $rowData, $columnMapping);
                        $rowCount++;
                    } catch (\Exception $e) {
                        Log::error("Error processing row {$rowIndex} for table {$tableCode}: " . $e->getMessage());
                        // Continue to next row if there's an error
                    }
                }

                Log::info("Successfully filled {$rowCount} rows in sheet {$sheetName} for table {$tableCode}");
                $processedSections[] = $tableCode;
            }

            // Check if we processed any sections
            if (empty($processedSections)) {
                Log::warning("No data was processed for any requested tables");
                return response()->json(['message' => 'No data found for the requested tables'], 404);
            }

            // Log summary
            Log::info("Processed tables: " . implode(', ', $processedSections));

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
     * Get the starting row for a specific section from database
     */
    private function getStartRowForSection($tableCode)
    {
        try {
            // Use Eloquent instead of raw MongoDB
            $table = LkpsTable::where('kode', $tableCode)->first();

            if ($table && isset($table->barisAwalExcel)) {
                Log::info("Found start row for table {$tableCode}: {$table->barisAwalExcel}");
                return (int) $table->barisAwalExcel;
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
                '2b' => 7,
                '3a1' => 14,
                '3a2' => 9,
                '3a3' => 11,
                '3a4' => 14,
                '3a5' => 7,
                '3b1' => 11,
                '3b2' => 9,
                '3b3' => 10,
                '3b4' => 7,
                '3b5' => 7,
                '3b6' => 6,
                '3b7' => 6,
                '3b8-1' => 6,
                '3b8-2' => 6,
                '3b8-3' => 15,
                '3b8-4' => 6,
                '3c' => 8,
                '4a' => 6,
                '4b' => 9,
                '4c' => 9,
                '5a-1' => 10,
                '5a-2' => 10,
                '5a-3' => 9,
                '5a-4' => 9,
                '5b-1' => 15,
                '5b-2' => 16,
                '5b-3' => 14,
                '5c' => 13,
                '5d' => 6,
                '6a' => 11,
                '6b' => 6,
                '7' => 6,
                '8a' => 6,
                '8b1' => 10,
                '8b2' => 11,
                '8c' => 7,
                '8d1' => 7,
                '8d2' => 7,
                '8e1' => 7,
                '8e2' => 7,
                '8f1' => 7,
                '8f2' => 7,
                '8f3' => 6,
                '8f4' => 6,
                '8f5-1' => 11,
                '8f5-2' => 7,
                '8f5-3' => 17,
                '8f5-4' => 7,
                '9a' => 7,
                '9b' => 5
            ];

            $startRow = $defaultStartRows[$tableCode] ?? 12;
            Log::info("Using default start row for table {$tableCode}: {$startRow}");

            return $startRow;

        } catch (\Exception $e) {
            Log::error("Error getting start row for table {$tableCode}: " . $e->getMessage());
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
     * Get column mapping for a specific section from database
     */
    private function getColumnMappingForSection($tableCode)
    {
        try {
            Log::info("Getting column mapping for table {$tableCode}");

            // Use Eloquent instead of raw MongoDB - assuming you have LkpsColumn model
            // If you don't have this model, you can create it or use raw queries as fallback

            // For now, let's use a simple approach - generate mapping from sample data
            $lkpsData = LkpsData::where('kodeTabel', $tableCode)->first();

            if ($lkpsData && !empty($lkpsData->data)) {
                $sampleData = $lkpsData->data[0] ?? [];
                if (!empty($sampleData)) {
                    return $this->generateMappingFromData($sampleData);
                }
            }

            Log::warning("No column mapping available for table {$tableCode}");
            return [];

        } catch (\Exception $e) {
            Log::error("Error getting column mapping for table {$tableCode}: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Generate column mapping from data structure
     */
    private function generateMappingFromData($sampleData)
    {
        Log::info("Generating dynamic column mapping from data structure");
        $columnMapping = [];
        $columnIndex = 0;

        foreach (array_keys($sampleData) as $field) {
            // Skip metadata fields
            if (in_array($field, ['key', 'selected', '_timestamp', 'rowIndex'])) {
                continue;
            }

            $columnMapping[$field] = $this->convertToColumnLetter($columnIndex);
            $columnIndex++;
            Log::debug("Auto-mapped field '{$field}' to column '{$columnMapping[$field]}'");
        }

        Log::info("Generated " . count($columnMapping) . " column mappings from data structure");
        return $columnMapping;
    }

    /**
     * Fill row data based on column mapping
     */
    private function fillRowData($sheet, $currentRow, $rowData, $columnMapping)
    {
        // Debug log struktur data
        Log::debug("Processing row at position {$currentRow}");

        // Jika column mapping kosong, coba buat otomatis
        if (empty($columnMapping) && !empty($rowData)) {
            Log::info("No mapping available, creating mapping from row data");
            $columnMapping = $this->generateMappingFromData($rowData);
        }

        if (empty($columnMapping)) {
            Log::warning("No column mapping available, data will not be written to Excel");
            return;
        }

        // Process each field according to mapping
        foreach ($columnMapping as $field => $column) {
            if (isset($rowData[$field])) {
                $value = $rowData[$field];

                // Handle different value types
                if (is_bool($value)) {
                    $value = $value ? 'V' : '';
                } else if ($value === true) {
                    $value = 'V';
                } else if ($value === false) {
                    $value = '';
                } else if (is_array($value) || is_object($value)) {
                    // Convert to string representation
                    $value = json_encode($value);
                }

                // Set cell value
                try {
                    $sheet->setCellValue("{$column}{$currentRow}", $value);
                    Log::debug("Set cell {$column}{$currentRow} = {$value}");
                } catch (\Exception $e) {
                    Log::error("Error setting cell {$column}{$currentRow}: " . $e->getMessage());
                }
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