<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use MongoDB\Client as MongoClient;
use MongoDB\BSON\ObjectId;
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
     * Get task IDs directly from a specific project
     * 
     * @param string $projectId Project ID
     * @return array Array of task IDs
     */
    private function getTaskIdsFromProject($projectId)
    {
        try {
            Log::info('Finding tasks for projectId', [
                'projectId' => $projectId
            ]);

            $taskIds = [];

            $project = Project::find($projectId);
            if (!$project) {
                Log::warning("Project not found: {$projectId}");
                return [];
            }

            $taskList = TaskList::where('projectId', $project->_id)
                ->where('kriteria', 'LKPS')
                ->first();

            if (!$taskList) {
                Log::warning("No LKPS task list found in project {$projectId}");
                return [];
            }

            $tasks = Task::where('taskListId', $taskList->_id)->get();

            foreach ($tasks as $task) {
                $taskIds[] = (string) $task->_id;
            }

            Log::info("Found " . count($taskIds) . " task IDs in project {$projectId}");
            return $taskIds;
        } catch (\Exception $e) {
            Log::error("Error getting task IDs from project: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [];
        }
    }

    /**
     * Get task IDs from projects associated with a prodi
     * This allows exporting data from any project, not just active ones
     * 
     * @param string $prodiId Prodi ID
     * @param string|null $projectId Optional specific project ID
     * @return array Array of task IDs
     */
    private function getTaskIdsFromProdi($prodiId, $projectId = null)
    {
        try {
            Log::info('Finding tasks for prodiId', [
                'prodiId' => $prodiId,
                'projectId' => $projectId ?: 'all'
            ]);

            $taskIds = [];

            // If projectId is specified, only get tasks from that project
            if ($projectId) {
                $project = Project::find($projectId);
                if (!$project) {
                    Log::warning("Project not found: {$projectId}");
                    return [];
                }

                // Confirm this project belongs to the specified prodi
                if ($project->prodiId != $prodiId) {
                    Log::warning("Project {$projectId} does not belong to prodiId {$prodiId}");
                    return [];
                }

                $taskList = TaskList::where('projectId', $project->_id)
                    ->where('kriteria', 'LKPS')
                    ->first();

                if (!$taskList) {
                    Log::warning("No LKPS task list found in project {$projectId}");
                    return [];
                }

                $tasks = Task::where('taskListId', $taskList->_id)->get();

                foreach ($tasks as $task) {
                    $taskIds[] = (string) $task->_id;
                }

                Log::info("Found " . count($taskIds) . " task IDs in project {$projectId}");
            }
            // Otherwise get tasks from all projects for this prodi
            else {
                // Get all projects for this prodi, ordered by created_at desc
                $projects = Project::where('prodiId', $prodiId)
                    ->orderByDesc('created_at')
                    ->get();

                Log::info("Found " . $projects->count() . " projects for prodiId {$prodiId}");

                foreach ($projects as $project) {
                    $taskList = TaskList::where('projectId', $project->_id)
                        ->where('kriteria', 'LKPS')
                        ->first();

                    if (!$taskList) {
                        Log::info("No LKPS task list found in project {$project->_id}");
                        continue;
                    }

                    $tasks = Task::where('taskListId', $taskList->_id)->get();

                    foreach ($tasks as $task) {
                        $taskIds[] = (string) $task->_id;
                    }
                }

                Log::info("Found " . count($taskIds) . " task IDs across all projects for prodiId {$prodiId}");
            }

            return $taskIds;
        } catch (\Exception $e) {
            Log::error("Error getting task IDs from prodi: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [];
        }
    }

    /**
     * Get LKPS data IDs from task IDs
     * 
     * @param array $taskIds Array of task IDs
     * @return array Array of LkpsData IDs
     */
    private function getLkpsDataIdsFromTasks($taskIds)
    {
        try {
            $lkpsDataIds = [];

            if (empty($taskIds)) {
                return $lkpsDataIds;
            }

            // Get LkpsData records for these tasks
            $lkpsDataRecords = LkpsData::whereIn('taskId', $taskIds)->get();

            foreach ($lkpsDataRecords as $record) {
                $lkpsDataIds[] = (string) $record->_id;
            }

            Log::info("Found " . count($lkpsDataIds) . " LkpsData IDs from " . count($taskIds) . " tasks");

            return $lkpsDataIds;
        } catch (\Exception $e) {
            Log::error("Error getting LkpsData IDs from tasks: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Export data using uploaded template with all sheets
     * Now supports multiple sections based on request and finding data through task IDs
     */
    public function exportData(Request $request)
    {
        try {
            // Tingkatkan batas waktu eksekusi dan memori
            set_time_limit(900); // 15 minutes
            ini_set('memory_limit', '1G');

            // Log memori awal untuk debugging
            Log::info('Initial memory usage: ' . round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB');

            // Get parameters
            $projectId = $request->input('projectId');
            $prodiId = Auth::user()->prodiId ?? $request->input('prodiId');
            $debugMode = $request->input('debug_mode', false);

            // Log all parameters with auth info
            Log::info('Export data requested', [
                'project_id' => $projectId,
                'prodi_id' => $prodiId,
                'user_id' => Auth::id() ?? null,
                'table_code' => $request->input('table_code'),
                'debug_mode' => $debugMode
            ]);

            // Pastikan prodiId tersedia
            if (empty($projectId) && empty($prodiId) && !$debugMode) {
                Log::error('Required parameters not provided and no prodiId in auth user');
                return response()->json(['message' => 'ProdiId is required and not found in authenticated user'], 400);
            }

            // Jika hanya projectId yang diberikan, ambil prodiId dari project
            if (!empty($projectId) && empty($prodiId) && !$debugMode) {
                $project = Project::find($projectId);
                if (!$project) {
                    Log::error("Project not found: {$projectId}");
                    return response()->json(['message' => 'Project not found'], 404);
                }
                $prodiId = $project->prodiId;
                Log::info("Retrieved prodiId {$prodiId} from project {$projectId}");
            }

            // Get array of table codes to export, support both 'sections' and 'table_code' parameters
            $tableCodes = [];

            if ($request->has('table_code')) {
                // Bisa string tunggal atau array
                $tableCode = $request->input('table_code');

                if (is_array($tableCode)) {
                    // Jika sudah berupa array, gunakan langsung
                    $tableCodes = $tableCode;
                    Log::info('Processing multiple tables: ' . implode(', ', $tableCodes));
                } else {
                    // Jika string tunggal
                    $tableCodes = [$tableCode];
                    Log::info('Processing single table: ' . $tableCode);
                }
            } else if ($request->has('sections')) {
                // Backward compatibility
                $sections = $request->input('sections');
                $tableCodes = is_array($sections) ? $sections : [$sections];
                Log::info('Using sections parameter: ' . implode(', ', $tableCodes));
            } else {
                // Default jika tidak ada parameter yang diberikan
                $tableCodes = ['1-1']; // Default ke tabel 1-1
                Log::info('No table specified, defaulting to: 1-1');
            }

            // Get task IDs and LkpsData IDs
            $taskIds = [];
            $lkpsDataIds = [];

            if (!$debugMode) {
                if (!empty($projectId)) {
                    // Jika projectId diberikan, gunakan metode getTaskIdsFromProject
                    $taskIds = $this->getTaskIdsFromProject($projectId);

                    if (empty($taskIds)) {
                        Log::warning("No task IDs found for project {$projectId}");
                    }
                } else {
                    // Jika hanya prodiId yang diberikan, gunakan metode getTaskIdsFromProdi
                    $taskIds = $this->getTaskIdsFromProdi($prodiId);

                    if (empty($taskIds)) {
                        Log::warning("No task IDs found for prodi {$prodiId}");
                    }
                }

                // Get LkpsData IDs from tasks
                $lkpsDataIds = $this->getLkpsDataIdsFromTasks($taskIds);

                if (empty($lkpsDataIds)) {
                    Log::warning("No LkpsData IDs found for the tasks");
                }
            }

            // Path to template
            $templatePath = storage_path('app/public/templates/LKPS_template.xlsx');
            if (!file_exists($templatePath)) {
                Log::error('Template file not found: ' . $templatePath);
                return response()->json(['message' => 'Template not found'], 404);
            }

            // PENTING: Load template dengan SEMUA sheet
            $reader = IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(false); // Pastikan format dan styling dipertahankan

            Log::info('Loading template with ALL sheets');
            $spreadsheet = $reader->load($templatePath);

            // Log info tentang sheets yang ada
            $availableSheets = $spreadsheet->getSheetNames();
            Log::info('Template loaded with ' . count($availableSheets) . ' sheets: ' . implode(', ', $availableSheets));

            // Process each requested section
            $processedSections = [];

            foreach ($tableCodes as $tableCode) {
                // Build query based on mode and available IDs
                if ($debugMode) {
                    // Debug mode: just filter by section code
                    $query = ['kodeTabel' => $tableCode];
                    Log::info("Running in debug mode for table {$tableCode}");
                } else if (!empty($taskIds)) {
                    // Filter by taskIds for most precise results
                    $query = [
                        'kodeTabel' => $tableCode,
                        'taskId' => ['$in' => $taskIds]
                    ];
                    Log::info("Using taskId filter for table {$tableCode}");
                } else {
                    // Fallback to basic section filter
                    $query = ['kodeTabel' => $tableCode];
                    Log::info("Using basic filter for table {$tableCode}");
                }

                // Debug: Log the final query
                Log::info("Query for table {$tableCode}:", ['query' => json_encode($query)]);

                // Execute the query
                $documents = $this->collection->find($query)->toArray();

                Log::info("Found " . count($documents) . " documents for table {$tableCode}");

                if (empty($documents)) {
                    // Debug: try to find documents with just section_code
                    $simpleQuery = ['kodeTabel' => $tableCode];
                    $allDocs = $this->collection->find($simpleQuery)->toArray();
                    Log::info("Total documents with kodeTabel {$tableCode} (without filters):", ['count' => count($allDocs)]);

                    Log::warning("No data found for table {$tableCode}, skipping");
                    continue;
                }

                // Process the first document for this section
                $doc = $documents[0];

                // Convert MongoDB document to PHP array
                $docArray = json_decode(json_encode($doc), true);

                // Debug: Log the document structure
                Log::info("Document keys for table {$tableCode}: " . implode(', ', array_keys($docArray)));

                // Check if data exists and is valid
                if (!isset($docArray['data']) || !is_array($docArray['data']) || empty($docArray['data'])) {
                    Log::warning("No valid data found for table {$tableCode}, skipping");
                    continue;
                }

                $data = $docArray['data'];

                // Debug: Log data structure sample
                Log::debug("Data structure for table {$tableCode}:", [
                    'sample_row' => isset($data[0]) ? json_encode($data[0]) : 'No data',
                    'total_rows' => count($data)
                ]);

                // Find the corresponding sheet
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

                // Determine start row from database
                $startRow = $this->getStartRowForSection($tableCode);

                // Fill the data
                Log::info("Processing " . count($data) . " rows of data for sheet {$sheetName}");
                $rowCount = 0;

                // Get column mappings for this section from database
                $columnMapping = $this->getColumnMappingForSection($tableCode);

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
     * Get the starting row for a specific section from lkps_tables collection
     */
    private function getStartRowForSection($tableCode)
    {
        try {
            // Find the table associated with this section code
            $table = $this->lkpsTableCollection->findOne(['kode' => $tableCode]);

            if ($table) {
                // Convert MongoDB document to PHP array
                $tableArray = json_decode(json_encode($table), true);

                // Use excel_start_row value if available
                if (isset($tableArray['barisAwalExcel'])) {
                    Log::info("Found start row for table {$tableCode}: {$tableArray['barisAwalExcel']}");
                    return (int) $tableArray['barisAwalExcel'];
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
                '3a1' => 7,
                '3a2' => 7,
                '3a3' => 7,
                '3a4' => 7,
                '3a5' => 7,
                '3b1' => 7,
                '3b2' => 7
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
     * Get column mapping for a specific section from lkps_columns collection
     */
    private function getColumnMappingForSection($tableCode)
    {
        try {
            Log::info("Getting column mapping for table {$tableCode}");

            // Find all columns for this table code directly
            $columns = $this->lkpsColumnCollection->find(['kodeTabel' => $tableCode])->toArray();

            if (empty($columns)) {
                Log::warning("No columns found in database for kodeTabel {$tableCode}");

                // Get data to analyze structure
                $document = $this->collection->findOne(['kodeTabel' => $tableCode]);
                if ($document && isset($document['data']) && is_array($document['data']) && !empty($document['data'])) {
                    $sampleData = $document['data'][0] ?? [];

                    if (!empty($sampleData)) {
                        return $this->generateMappingFromData($sampleData);
                    }
                }

                return [];
            }

            $columnMapping = [];

            foreach ($columns as $column) {
                // Convert MongoDB document to PHP array
                $columnArray = json_decode(json_encode($column), true);

                if (isset($columnArray['indeksData']) && isset($columnArray['indeksExcel'])) {
                    // Convert numeric indeksExcel to letter (0 -> A, 1 -> B, etc)
                    $excelColumn = $this->convertToColumnLetter($columnArray['indeksExcel']);
                    $columnMapping[$columnArray['indeksData']] = $excelColumn;
                    Log::debug("Mapped column {$columnArray['indeksData']} to Excel column {$excelColumn}");
                }
            }

            Log::info("Found " . count($columnMapping) . " column mappings for table {$tableCode}");
            return $columnMapping;

        } catch (\Exception $e) {
            Log::error("Error getting column mapping for table {$tableCode}: " . $e->getMessage());
            return [];
        }
    }

    private function generateMappingFromData($sampleData)
    {
        Log::info("Generating dynamic column mapping from data structure");
        $columnMapping = [];
        $column = 'A'; // Start from column A

        // Check if data is an array with numeric indexes
        $isNumericArray = array_keys($sampleData) === range(0, count($sampleData) - 1);

        foreach (array_keys($sampleData) as $field) {
            $columnMapping[$field] = $column++;
            Log::info("Auto-mapped field '{$field}' to column '{$columnMapping[$field]}'");
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
                    Log::debug("Set cell {$column}{$currentRow}");
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