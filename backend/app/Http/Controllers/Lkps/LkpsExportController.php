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
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class LkpsExportController extends Controller
{

    public function exportData(Request $request)
    {
        try {
            set_time_limit(900);
            ini_set('memory_limit', '1G');

            Log::info('Initial memory usage: ' . round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB');

            $projectId = $request->input('projectId');
            $debugMode = $request->input('debug_mode', false);

            Log::info('Export data requested', [
                'project_id' => $projectId,
                'user_id' => Auth::id() ?? null,
                'table_code' => $request->input('table_code'),
                'debug_mode' => $debugMode
            ]);

            if (empty($projectId) && !$debugMode) {
                Log::error('Project ID not provided');
                return response()->json(['message' => 'Project ID is required'], 400);
            }

            if (!$debugMode) {
                $project = Project::find($projectId);
                if (!$project) {
                    return response()->json(['message' => 'Project not found'], 404);
                }
            }

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
                $tableCodes = ['1-1'];
                Log::info('No table specified, defaulting to: 1-1');
            }

            $templatePath = storage_path('app/public/templates/LKPS_template.xlsx');
            if (!file_exists($templatePath)) {
                Log::error('Template file not found: ' . $templatePath);
                return response()->json(['message' => 'Template not found'], 404);
            }

            $reader = IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(false);
            $spreadsheet = $reader->load($templatePath);

            $availableSheets = $spreadsheet->getSheetNames();
            Log::info('Template loaded with ' . count($availableSheets) . ' sheets');

            $processedSections = [];

            foreach ($tableCodes as $tableCode) {

                $table = LkpsTable::where('kode', $tableCode)->first();
                if (!$table) {
                    Log::warning("Table not found: {$tableCode}, skipping");
                    continue;
                }

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

                $data = $lkpsData->data ?? [];

                if (empty($data)) {
                    Log::warning("No valid data found for table {$tableCode}, skipping");
                    continue;
                }

                Log::info("Found " . count($data) . " rows for table {$tableCode}");

                $sheet = null;

                if ($spreadsheet->sheetNameExists($tableCode)) {
                    $sheet = $spreadsheet->getSheetByName($tableCode);
                    Log::info("Found exact sheet match for table {$tableCode}");
                } else {
                    foreach ($availableSheets as $sheetName) {
                        if (strpos(strtolower($sheetName), strtolower(str_replace('-', ' ', $tableCode))) !== false) {
                            $sheet = $spreadsheet->getSheetByName($sheetName);
                            Log::info("Found matching sheet: {$sheetName} for table: {$tableCode}");
                            break;
                        }
                    }
                }

                if (!$sheet) {
                    Log::warning("No matching sheet found for table {$tableCode}, skipping");
                    continue;
                }

                $sheetName = $sheet->getTitle();
                Log::info("Using sheet: {$sheetName} for data from table: {$tableCode}");

                $startRow = $this->getStartRowForSection($tableCode);
                $columnMapping = $this->getColumnMappingForSection($tableCode);

                Log::info("Processing " . count($data) . " rows of data for sheet {$sheetName}");
                $rowCount = 0;

                foreach ($data as $rowIndex => $rowData) {
                    $currentRow = $startRow + $rowIndex;

                    try {
                        $this->fillRowData($sheet, $currentRow, $rowData, $columnMapping);
                        $rowCount++;
                    } catch (\Exception $e) {
                        Log::error("Error processing row {$rowIndex} for table {$tableCode}: " . $e->getMessage());
                    }
                }

                if ($rowCount > 0) {
                    $this->applyConsistentFormatting($sheet, $startRow, $startRow + $rowCount - 1, $columnMapping);
                }

                Log::info("Successfully filled {$rowCount} rows in sheet {$sheetName} for table {$tableCode}");
                $processedSections[] = $tableCode;
            }

            if (empty($processedSections)) {
                Log::warning("No data was processed for any requested tables");
                return response()->json(['message' => 'No data found for the requested tables'], 404);
            }

            Log::info("Processed tables: " . implode(', ', $processedSections));

            $tempFileName = 'LKPS_Export_' . uniqid() . '.xlsx';
            $tempFile = storage_path('app/temp/' . $tempFileName);
            $tempDir = dirname($tempFile);
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $writer = new Xlsx($spreadsheet);
            $writer->setPreCalculateFormulas(false);

            Log::info('Writing file to disk');
            $writer->save($tempFile);

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
            gc_collect_cycles();

            $headers = [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename=LKPS_Data_Export.xlsx',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ];

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

    private function getStartRowForSection($tableCode)
    {
        try {
            $table = LkpsTable::where('kode', $tableCode)->first();

            if ($table && isset($table->barisAwalExcel)) {
                Log::info("Found start row for table {$tableCode}: {$table->barisAwalExcel}");
                return (int) $table->barisAwalExcel;
            }

            Log::warning("No start row defined for table {$tableCode}, using default 12");
            return 12;

        } catch (\Exception $e) {
            Log::error("Error getting start row for table {$tableCode}: " . $e->getMessage());
            return 12;
        }
    }

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

    private function getColumnMappingForSection($tableCode)
    {
        try {
            Log::info("Getting column mapping for table {$tableCode}");

            $table = LkpsTable::where('kode', $tableCode)->first();
            if (!$table) {
                Log::warning("Table not found for code: {$tableCode}");
                return [];
            }

            $columns = \App\Models\Lkps\LkpsColumn::where('lkpsTableId', (string) $table->_id)
                ->where('isGroup', false)
                ->orderBy('order')
                ->get();

            if ($columns->isEmpty()) {
                Log::warning("No columns found for table {$tableCode}, fallback to sample data");
                return $this->getColumnMappingFromSampleData($tableCode);
            }

            $columnMapping = [];
            foreach ($columns as $column) {
                if ($column->indeksExcel === null || $column->indeksData === null) {
                    continue;
                }

                $excelColumn = $this->convertIndexToColumnLetter($column->indeksExcel);
                $fieldName = $column->indeksData;

                $columnMapping[$fieldName] = $excelColumn;

                Log::debug("Mapped field '{$fieldName}' to column '{$excelColumn}' (index: {$column->indeksExcel})");
            }

            Log::info("Built column mapping for table {$tableCode} from LkpsColumn", [
                'columns_count' => count($columnMapping),
                'mapping' => $columnMapping
            ]);

            return $columnMapping;

        } catch (\Exception $e) {
            Log::error("Error getting column mapping for table {$tableCode}: " . $e->getMessage());
            return $this->getColumnMappingFromSampleData($tableCode);
        }
    }

    private function convertIndexToColumnLetter($index)
    {
        if ($index < 0) {
            return 'A';
        }

        $column = '';
        $index++;

        while ($index > 0) {
            $index--;
            $column = chr(65 + ($index % 26)) . $column;
            $index = intval($index / 26);
        }

        return $column;
    }

    private function getColumnMappingFromSampleData($tableCode)
    {
        try {
            Log::info("Using fallback method - generating mapping from sample data");

            $lkpsData = LkpsData::where('kodeTabel', $tableCode)->first();

            if ($lkpsData && !empty($lkpsData->data)) {
                $sampleData = $lkpsData->data[0] ?? [];
                if (!empty($sampleData)) {
                    return $this->generateMappingFromData($sampleData);
                }
            }

            Log::warning("No sample data available for table {$tableCode}");
            return [];

        } catch (\Exception $e) {
            Log::error("Error in fallback mapping for table {$tableCode}: " . $e->getMessage());
            return [];
        }
    }

    private function fillRowData($sheet, $currentRow, $rowData, $columnMapping)
    {
        Log::debug("Processing row at position {$currentRow}");

        if (empty($columnMapping)) {
            Log::warning("No column mapping available for this table");
            return;
        }

        foreach ($columnMapping as $fieldName => $excelColumn) {
            if (in_array($fieldName, ['key', 'selected', '_timestamp', 'rowIndex', 'no', '_id'])) {
                continue;
            }

            if (!isset($rowData[$fieldName])) {
                Log::debug("Field '{$fieldName}' not found in row data, skipping");
                continue;
            }

            $value = $rowData[$fieldName];

            $processedValue = $this->processValueForExcel($value, $fieldName);

            try {
                if ($this->isPotentiallyAnIdentifier($processedValue)) {
                    $sheet->setCellValueExplicit(
                        "{$excelColumn}{$currentRow}",
                        $processedValue,
                        \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING
                    );
                    Log::debug("Set cell {$excelColumn}{$currentRow} as STRING = {$processedValue}");
                } else {
                    $sheet->setCellValue("{$excelColumn}{$currentRow}", $processedValue);

                    if ($this->isPercentageField($fieldName)) {
                        $sheet->getStyle("{$excelColumn}{$currentRow}")
                            ->getNumberFormat()
                            ->setFormatCode('0.00%');
                    }
                    Log::debug("Set cell {$excelColumn}{$currentRow} = {$processedValue} (field: {$fieldName})");
                }

                $sheet->getStyle("{$excelColumn}{$currentRow}")
                    ->getFont()
                    ->setSize(10);

            } catch (\Exception $e) {
                Log::error("Error setting cell {$excelColumn}{$currentRow}: " . $e->getMessage());
            }
        }
    }

    private function processValueForExcel($value, $fieldName = '')
    {
        if (is_bool($value)) {
            return $value ? 'V' : '';
        }

        if ($value === true) {
            return 'V';
        }

        if ($value === false) {
            return '';
        }

        if (is_array($value) || is_object($value)) {
            return json_encode($value);
        }

        if (is_null($value)) {
            return '';
        }

        if ($this->isPercentageField($fieldName) && is_numeric($value)) {
            return floatval($value) / 100;
        }

        return $value;
    }

    private function isPercentageField($fieldName)
    {
        $percentageFields = [
            'tingkat_kepuasan_mahasiswa_sangat_baik',
            'tingkat_kepuasan_mahasiswa_baik',
            'tingkat_kepuasan_mahasiswa_cukup',
            'tingkat_kepuasan_mahasiswa_kurang',
        ];

        if (in_array($fieldName, $percentageFields)) {
            return true;
        }

        $percentagePatterns = [
            'persentase',
            'persen',
            'tingkat_kepuasan',
            '_pct',
            'percentage'
        ];

        foreach ($percentagePatterns as $pattern) {
            if (strpos(strtolower($fieldName), $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    private function isPotentiallyAnIdentifier($value)
    {
        if (is_string($value) && ctype_digit($value) && strlen($value) > 11) {
            return true;
        }

        if (is_numeric($value) && !str_contains((string) $value, '.') && strlen((string) $value) > 11) {
            return true;
        }

        return false;
    }

    private function getCurrentTableCode($sheet)
    {
        return $sheet->getTitle();
    }

    private function getValidFieldsForTable($tableCode)
    {
        try {
            $table = LkpsTable::where('kode', $tableCode)->first();
            if (!$table) {
                return [];
            }

            $columns = \App\Models\Lkps\LkpsColumn::where('lkpsTableId', (string) $table->_id)
                ->where('isGroup', false)
                ->whereNotNull('indeksData')
                ->pluck('indeksData')
                ->toArray();

            return $columns;

        } catch (\Exception $e) {
            Log::error("Error getting valid fields for table {$tableCode}: " . $e->getMessage());
            return [];
        }
    }

    private function generateMappingFromData($sampleData)
    {
        Log::info("Generating dynamic column mapping from data structure");
        $columnMapping = [];
        $columnIndex = 0;

        foreach (array_keys($sampleData) as $field) {
            if (in_array($field, ['key', 'selected', '_timestamp', 'rowIndex', 'no', '_id'])) {
                continue;
            }

            $columnMapping[$field] = $this->convertToColumnLetter($columnIndex);
            $columnIndex++;
            Log::debug("Auto-mapped field '{$field}' to column '{$columnMapping[$field]}'");
        }

        Log::info("Generated " . count($columnMapping) . " column mappings from data structure");
        return $columnMapping;
    }

    private function applyConsistentFormatting($sheet, $startRow, $endRow, $columnMapping)
    {
        try {
            $columns = array_values($columnMapping);

            if (empty($columns)) {
                return;
            }

            $firstColumn = min($columns);
            $lastColumn = max($columns);
            $range = "{$firstColumn}{$startRow}:{$lastColumn}{$endRow}";

            $sheet->getStyle($range)
                ->getFont()
                ->setSize(10);

            $sheet->getStyle($range)
                ->getFont()
                ->setName('Calibri');

            Log::info("Applied consistent formatting to range: {$range}");

        } catch (\Exception $e) {
            Log::error("Error applying formatting: " . $e->getMessage());
        }
    }
}
