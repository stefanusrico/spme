<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Google_Client;
use Google_Service_Sheets;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Lkps\LkpsColumn;
use App\Models\Lkps\LkpsTable;

class GoogleSheetController extends Controller
{
    private $spreadsheetId;
    private $client;
    private $service;
    private $sheetNamesMap = [];
    private $titleMap = [];
    private $debug = [];

    private $targetColorRGB = [
        'red' => 0.55,
        'green' => 0.7,
        'blue' => 0.88
    ];

    private $colorTolerance = 0.1;

    public function __construct(Request $request = null)
    {
        if ($request && $request->has('spreadsheet_id')) {
            $this->spreadsheetId = $request->input('spreadsheet_id');
        } else {
            $this->spreadsheetId = '1eTiQOVI5Ac1cHEzkBL1kkUA9uSP2aoM7ntukkLRxND8';
        }

        $this->client = new Google_Client();
        $this->client->setAuthConfig(storage_path('app/google-service-account.json'));
        $this->client->setScopes([Google_Service_Sheets::SPREADSHEETS_READONLY]);

        $this->service = new Google_Service_Sheets($this->client);
        $this->loadSheetNames();
    }

    /**
     * Update indeksData for records with parentId by incorporating parent title
     * Example: If child indeksData = "reguler" and parent title = "Jumlah Mahasiswa Aktif"
     * Then new child indeksData = "reguler_jumlah_mahasiswa_aktif"
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateDataIndicesWithParent(Request $request)
    {
        try {
            // Get table code from request
            $tableCode = $request->input('table_code', null);

            // Get all records for a specific table if table_code is provided
            // Otherwise get all records across all tables
            if ($tableCode) {
                $records = LkpsColumn::where('kodeTabel', $tableCode)->get();
            } else {
                $records = LkpsColumn::all();
            }

            // Group records by ID to allow for easy lookup
            $recordsById = [];
            foreach ($records as $record) {
                $idString = (string) $record->_id;
                $recordsById[$idString] = $record;
            }

            // Track updated records
            $updatedRecords = [];

            // Process and update each record with a parent_id
            foreach ($records as $record) {
                if (!empty($record->parentId)) {
                    // Get parent ID as string
                    $parentId = null;
                    if (is_object($record->parentId) && property_exists($record->parentId, '$oid')) {
                        $parentId = $record->parentId->{'$oid'};
                    } elseif (is_string($record->parentId)) {
                        $parentId = $record->parentId;
                    } elseif (is_object($record->parentId) && method_exists($record->parentId, '__toString')) {
                        $parentId = (string) $record->parentId;
                    }

                    // Find the parent record
                    $parent = null;
                    foreach ($records as $possibleParent) {
                        $possibleParentId = null;
                        if (is_object($possibleParent->_id) && property_exists($possibleParent->_id, '$oid')) {
                            $possibleParentId = $possibleParent->_id->{'$oid'};
                        } elseif (is_string($possibleParent->_id)) {
                            $possibleParentId = $possibleParent->_id;
                        }

                        if ($possibleParentId && $possibleParentId === $parentId) {
                            $parent = $possibleParent;
                            break;
                        }
                    }

                    if ($parent) {
                        // Create new indeksData with parent title
                        $parentTitle = $this->formatTitleForIndex($parent->judul);
                        $originalIndex = $record->indeksData;

                        // Check if the indeksData already contains the parent's title
                        if (strpos(strtolower($originalIndex), strtolower($parentTitle)) === false) {
                            // Apply the new indeksData
                            $newDataIndex = $originalIndex . '_' . $parentTitle;

                            // Update the record
                            $record->indeksData = $newDataIndex;
                            $record->save();

                            $updatedRecords[] = [
                                'id' => is_object($record->_id) ? $record->_id->{'$oid'} : $record->_id,
                                'old_data_index' => $originalIndex,
                                'new_data_index' => $newDataIndex,
                                'parent_title' => $parent->judul
                            ];
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Data indices updated with parent titles',
                'total_updated' => count($updatedRecords),
                'updated_records' => $updatedRecords
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update data indices: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Direct method to update MongoDB documents
     * This can be used once to immediately update all records in the database
     */
    public function directUpdateDataIndices()
    {
        try {
            // Connect to MongoDB directly
            $mongo = new \MongoDB\Client(env('MONGODB_URI', 'mongodb://localhost:27017'));
            $database = $mongo->selectDatabase(env('MONGODB_DATABASE', 'your_database'));
            $collection = $database->selectCollection('lkps_columns'); // Use your actual collection name

            // Get all records
            $records = $collection->find([]);

            // Convert cursor to array for processing
            $recordsArray = [];
            foreach ($records as $record) {
                $recordsArray[(string) $record->_id] = $record;
            }

            // Track updated records
            $updatedRecords = [];

            // Process each record with a parent_id
            foreach ($recordsArray as $record) {
                if (!empty($record->parentId)) {
                    // Find the parent record
                    $parentId = (string) $record->parentId;
                    if (isset($recordsArray[$parentId])) {
                        $parent = $recordsArray[$parentId];

                        // Create new indeksData with parent title
                        $parentTitle = $this->formatTitleForIndex($parent->judul);
                        $originalIndex = $record->indeksData;

                        // Check if the indeksData already contains the parent's title
                        if (strpos(strtolower($originalIndex), strtolower($parentTitle)) === false) {
                            // Apply the new indeksData
                            $newDataIndex = $originalIndex . '_' . $parentTitle;

                            // Update the record in the database
                            $collection->updateOne(
                                ['_id' => $record->_id],
                                ['$set' => ['indeksData' => $newDataIndex]]
                            );

                            $updatedRecords[] = [
                                'id' => (string) $record->_id,
                                'old_data_index' => $originalIndex,
                                'new_data_index' => $newDataIndex,
                                'parent_title' => $parent->judul
                            ];
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Data indices updated with parent titles',
                'total_updated' => count($updatedRecords),
                'updated_records' => $updatedRecords
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update data indices: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Format a title into a snake_case string for use in a data_index
     * 
     * @param string $title
     * @return string
     */
    private function formatTitleForIndex($title)
    {
        // Convert to lowercase
        $formattedTitle = strtolower($title);

        // Replace spaces and special characters with underscores
        $formattedTitle = preg_replace('/[^a-z0-9]+/', '_', $formattedTitle);

        // Remove leading/trailing underscores
        $formattedTitle = trim($formattedTitle, '_');

        return $formattedTitle;
    }

    /**
     * Alternative implementation using direct data array
     * This can be used if you don't have models or need to process data directly
     *
     * @param array $data Array of records with parent-child relationships
     * @return array Updated data with new data_index values
     */
    public function processDataIndicesWithParentFromArray($data)
    {
        // Group data by ID for easy lookup
        $recordsById = [];
        foreach ($data as $record) {
            $id = $record['_id'];
            if (is_array($id) && isset($id['$oid'])) {
                $id = $id['$oid'];
            }
            $recordsById[$id] = $record;
        }

        // Process each record that has a parent_id
        foreach ($data as &$record) {
            if (!empty($record['parentId'])) {
                $parentId = $record['parentId'];
                if (is_array($parentId) && isset($parentId['$oid'])) {
                    $parentId = $parentId['$oid'];
                }

                if (isset($recordsById[$parentId])) {
                    $parent = $recordsById[$parentId];

                    // Format parent title for data_index
                    $parentTitle = $this->formatTitleForIndex($parent['judul']);

                    // Update data_index to include parent title
                    if (!strpos($record['indeksData'], $parentTitle)) {
                        $record['indeksData'] = $record['indeksData'] . '_' . $parentTitle;
                    }
                }
            }
        }

        return $data;
    }

    /**
     * Load sheet names from the "Daftar Tabel" sheet
     */
    private function loadSheetNames($debug = false)
    {
        $cacheKey = "sheet_names_map_{$this->spreadsheetId}";

        if (!$debug) {
            $sheetMapCacheKey = $cacheKey . "_sheetmap";

            if (Cache::has($sheetMapCacheKey)) {
                $this->sheetNamesMap = Cache::get($sheetMapCacheKey);
                return;
            }
        }

        try {
            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
            $sheets = $spreadsheet->getSheets();

            $masterSheetTitle = null;
            foreach ($sheets as $sheet) {
                $title = $sheet->getProperties()->getTitle();

                if ($title === "Daftar Tabel") {
                    $masterSheetTitle = $title;
                    break;
                }
            }

            if (!$masterSheetTitle) {
                foreach ($sheets as $sheet) {
                    $title = $sheet->getProperties()->getTitle();

                    if (strtolower($title) === "daftar tabel") {
                        $masterSheetTitle = $title;
                        break;
                    }
                }
            }

            if (!$masterSheetTitle) {
                $possibleNames = ['menu', 'ps', 'index', 'master'];

                foreach ($sheets as $sheet) {
                    $title = $sheet->getProperties()->getTitle();
                    $lowerTitle = strtolower($title);

                    if ($title === "PS") {
                        $masterSheetTitle = $title;
                        break;
                    }

                    foreach ($possibleNames as $name) {
                        if (strpos($lowerTitle, $name) !== false) {
                            $masterSheetTitle = $title;
                            break 2;
                        }
                    }
                }
            }

            if (!$masterSheetTitle) {
                return;
            }

            $range = "{$masterSheetTitle}";
            $response = $this->service->spreadsheets_values->get(
                $this->spreadsheetId,
                $range
            );

            $values = $response->getValues();

            if (empty($values)) {
                return;
            }

            $headerRowIndex = -1;

            for ($i = 0; $i < min(10, count($values)); $i++) {
                if (isset($values[$i][0]) && isset($values[$i][2])) {
                    $colA = (string) $values[$i][0];
                    $colC = (string) $values[$i][2];

                    if (
                        ($colA === "No" || stripos($colA, "Nomor") !== false) &&
                        (stripos($colC, "Nama") !== false && stripos($colC, "Sheet") !== false)
                    ) {
                        $headerRowIndex = $i;
                        break;
                    }
                }
            }

            if ($headerRowIndex === -1) {
                for ($i = 2; $i < min(15, count($values)); $i++) {
                    if (isset($values[$i][0]) && isset($values[$i][2])) {
                        if (is_numeric($values[$i][0]) && !empty($values[$i][2])) {
                            $headerRowIndex = $i - 1;
                            break;
                        }
                    }
                }
            }

            $startRow = $headerRowIndex + 1;

            $map = [];
            $titleToCodeMap = [];

            for ($i = $startRow; $i < count($values); $i++) {
                if (!isset($values[$i][0]) || !isset($values[$i][2])) {
                    continue;
                }

                $index = $values[$i][0];
                $sheet = $values[$i][2];

                if (empty($sheet)) {
                    continue;
                }

                $code = $sheet;
                $map[$code] = $sheet;

                $title = '';
                if (isset($values[$i][1]) && !empty($values[$i][1])) {
                    $title = (string) $values[$i][1];
                }

                if (empty($title)) {
                    for ($j = $i - 1; $j >= $startRow; $j--) {
                        if (
                            isset($values[$j][1]) && !empty($values[$j][1]) &&
                            stripos($values[$j][1], 'tabel') !== false
                        ) {
                            $title = $values[$j][1];
                            break;
                        }
                    }

                    if (empty($title)) {
                        $title = "Tabel " . $code;
                    }
                }

                $titleToCodeMap[$title] = $code;
            }

            if (count($titleToCodeMap) == 0) {
                foreach ($map as $code => $sheetName) {
                    $defaultTitle = "Tabel " . $code;
                    $titleToCodeMap[$defaultTitle] = $code;
                }
            }

            $this->sheetNamesMap = $map;
            $this->titleMap = $titleToCodeMap;

            if (!$debug && !empty($this->sheetNamesMap)) {
                Cache::put("sheet_names_map_{$this->spreadsheetId}_sheetmap", $this->sheetNamesMap, now()->addDay());
                Cache::put("sheet_names_map_{$this->spreadsheetId}_titlemap", $this->titleMap, now()->addDay());
            }

        } catch (\Exception $e) {
            Log::error('Error loading sheet names: ' . $e->getMessage());
        }
    }

    /**
     * Get a list of available tables and their sheet names
     */
    public function getAvailableTables(Request $request)
    {
        $forceRefresh = true;

        if ($request->has('spreadsheet_id')) {
            $this->spreadsheetId = $request->input('spreadsheet_id');
        }

        Cache::forget("sheet_names_map_{$this->spreadsheetId}_sheetmap");
        Cache::forget("sheet_names_map_{$this->spreadsheetId}_titlemap");

        $this->loadSheetNames($forceRefresh);

        $sheetCodes = array_keys($this->sheetNamesMap);
        $sheetNames = array_values($this->sheetNamesMap);

        $skipCount = 1;
        if (count($sheetCodes) > $skipCount) {
            $sheetCodes = array_slice($sheetCodes, $skipCount);
            $sheetNames = array_slice($sheetNames, $skipCount);
        }

        $filteredTitleMap = [];
        $firstSheetCode = reset($this->sheetNamesMap);
        foreach ($this->titleMap as $title => $code) {
            if ($code === $firstSheetCode) {
                continue;
            }
            $filteredTitleMap[$title] = $code;
        }

        $codeToTitleMap = [];
        foreach ($filteredTitleMap as $title => $code) {
            $codeToTitleMap[$code] = $title;
        }

        foreach ($sheetCodes as $code) {
            if (!isset($codeToTitleMap[$code])) {
                $codeToTitleMap[$code] = "Tabel " . $code;
            }
        }

        $response = [
            'success' => true,
            'spreadsheet_id' => $this->spreadsheetId,
            'sheet_names' => $sheetNames,
            'title_mappings' => $filteredTitleMap,
            'mapping' => $codeToTitleMap
        ];

        if ($request->has('debug')) {
            try {
                $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
                $sheets = $spreadsheet->getSheets();

                $allSheets = [];
                foreach ($sheets as $sheet) {
                    $allSheets[] = [
                        'title' => $sheet->getProperties()->getTitle(),
                        'sheet_id' => $sheet->getProperties()->getSheetId()
                    ];
                }

                $response['debug'] = [
                    'all_sheets' => $allSheets,
                    'total_sheets' => count($this->sheetNamesMap),
                    'filtered_sheets' => count($sheetNames),
                    'first_sheet_skipped' => $firstSheetCode
                ];
            } catch (\Exception $e) {
                $response['debug_error'] = $e->getMessage();
            }
        }

        return response()->json($response);
    }

    /**
     * Get colored cells data by table reference
     */
    public function getColoredCellsByTable(Request $request, $tableRef = null)
    {
        try {
            if ($request->has('spreadsheet_id')) {
                $this->spreadsheetId = $request->input('spreadsheet_id');
                $this->loadSheetNames();
            }

            if (!$tableRef) {
                $tableRef = $request->input('table_ref');
            }

            if (!$tableRef && $request->has('sheet_gid')) {
                return $this->getColoredCells($request);
            }

            if (!$tableRef || !isset($this->sheetNamesMap[$tableRef])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Referensi tabel tidak valid atau tidak ditemukan',
                    'table_ref' => $tableRef,
                    'available_tables' => array_keys($this->sheetNamesMap)
                ], 400);
            }

            $sheetName = $this->sheetNamesMap[$tableRef];
            $request->merge(['sheet_name' => $sheetName]);
            return $this->getColoredCellsBySheetName($request);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Legacy method for backward compatibility - uses sheet GID
     */
    public function getColoredCells(Request $request)
    {
        try {
            ini_set('memory_limit', '1024M');
            $sheetGid = $request->input('sheet_gid', 0);

            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
            $sheets = $spreadsheet->getSheets();
            $sheetTitle = null;

            foreach ($sheets as $sheet) {
                if ($sheet->getProperties()->getSheetId() == $sheetGid) {
                    $sheetTitle = $sheet->getProperties()->getTitle();
                    break;
                }
            }

            if (!$sheetTitle) {
                return response()->json(['error' => 'Sheet dengan GID tersebut tidak ditemukan'], 404);
            }

            $request->merge(['sheet_name' => $sheetTitle]);
            return $this->getColoredCellsBySheetName($request);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Get colored cells by sheet name
     */
    private function getColoredCellsBySheetName(Request $request)
    {
        try {
            ini_set('memory_limit', '1024M');

            $sheetName = $request->input('sheet_name');
            $tableRef = $request->input('table_ref');

            $rangeToCheck = $sheetName . '!A1:O100';

            $response = $this->service->spreadsheets->get($this->spreadsheetId, [
                'includeGridData' => true,
                'ranges' => $rangeToCheck
            ]);

            $sheets = $response->getSheets();

            if (!$sheets || empty($sheets[0]->getData())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data yang tersedia atau format tidak didukung'
                ]);
            }

            $data = $sheets[0]->getData()[0];
            $rowData = $data->getRowData();

            $coloredCells = [];
            $coloredColumns = [];
            $tableSections = [];
            $currentTableSection = null;
            $tableData = [];

            $isSimilarColor = function ($color1, $color2, $tolerance = 0.1) {
                foreach (['red', 'green', 'blue'] as $component) {
                    $val1 = $color1[$component] ?? 0;
                    $val2 = $color2[$component] ?? 0;
                    if (abs($val1 - $val2) > $tolerance) {
                        return false;
                    }
                }
                return true;
            };

            $toHex = function ($rgb) {
                return sprintf(
                    "#%02x%02x%02x",
                    (int) ($rgb['red'] * 255),
                    (int) ($rgb['green'] * 255),
                    (int) ($rgb['blue'] * 255)
                );
            };

            foreach ($rowData as $rowIndex => $row) {
                if (!$row->getValues()) {
                    continue;
                }

                $isTableHeader = false;
                $tableTitle = '';

                if ($row->getValues() && count($row->getValues()) > 0) {
                    $firstCell = $row->getValues()[0];
                    if ($firstCell && $firstCell->getFormattedValue()) {
                        $value = $firstCell->getFormattedValue();
                        if (strpos($value, 'Diisi oleh pengusul dari Program Studi pada Program') !== false) {
                            $isTableHeader = true;
                            $tableTitle = $value;

                            $currentTableSection = [
                                'title' => $tableTitle,
                                'start_row' => $rowIndex,
                                'end_row' => null,
                                'columns' => [],
                                'rows' => []
                            ];
                            $tableSections[] = &$currentTableSection;
                        }
                    }
                }

                foreach ($row->getValues() as $colIndex => $cell) {
                    if (!$cell) {
                        continue;
                    }

                    if ($currentTableSection !== null) {
                        $columnLetter = $this->columnIndexToLetter($colIndex + 1);
                        $value = $this->getCellValue($cell);

                        if (!isset($currentTableSection['rows'][$rowIndex])) {
                            $currentTableSection['rows'][$rowIndex] = [];
                        }

                        $currentTableSection['rows'][$rowIndex][$columnLetter] = [
                            'value' => $value,
                            'row' => $rowIndex + 1,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . ($rowIndex + 1)
                        ];
                    }

                    $effectiveFormat = $cell->getEffectiveFormat();
                    if (!$effectiveFormat) {
                        continue;
                    }

                    $backgroundColor = $effectiveFormat->getBackgroundColor();
                    if (!$backgroundColor) {
                        continue;
                    }

                    $cellColor = [
                        'red' => $backgroundColor->getRed() ?? 0,
                        'green' => $backgroundColor->getGreen() ?? 0,
                        'blue' => $backgroundColor->getBlue() ?? 0
                    ];

                    if ($isSimilarColor($cellColor, $this->targetColorRGB, $this->colorTolerance)) {
                        $value = $this->getCellValue($cell);
                        $columnLetter = $this->columnIndexToLetter($colIndex + 1);

                        $coloredColumns[$columnLetter] = true;

                        $coloredCells[] = [
                            'row' => $rowIndex + 1,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . ($rowIndex + 1),
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'table_index' => count($tableSections) - 1
                        ];

                        if ($currentTableSection !== null) {
                            if (isset($currentTableSection['rows'][$rowIndex][$columnLetter])) {
                                $currentTableSection['rows'][$rowIndex][$columnLetter]['color'] = $toHex($cellColor);
                            }

                            if (!in_array($columnLetter, $currentTableSection['columns'])) {
                                $currentTableSection['columns'][] = $columnLetter;
                            }
                        }
                    }
                }
            }

            if (empty($tableSections) && !empty($coloredCells)) {
                $tableSection = [
                    'title' => 'Full Sheet',
                    'start_row' => 0,
                    'end_row' => count($rowData) - 1,
                    'columns' => array_keys($coloredColumns),
                    'rows' => []
                ];

                $tableSections[] = $tableSection;

                foreach ($coloredCells as &$cell) {
                    $cell['table_index'] = 0;
                }

                $tableData[] = [
                    'title' => 'Full Sheet',
                    'start_row' => 1,
                    'end_row' => count($rowData),
                    'columns' => array_keys($coloredColumns)
                ];
            } else {
                for ($i = 0; $i < count($tableSections); $i++) {
                    if ($i < count($tableSections) - 1) {
                        $tableSections[$i]['end_row'] = $tableSections[$i + 1]['start_row'] - 1;
                    } else {
                        $lastRowIndex = 0;
                        foreach ($tableSections[$i]['rows'] as $rowIdx => $rowData) {
                            $lastRowIndex = max($lastRowIndex, $rowIdx);
                        }
                        $tableSections[$i]['end_row'] = $lastRowIndex;
                    }

                    $tableData[] = [
                        'title' => $tableSections[$i]['title'],
                        'start_row' => $tableSections[$i]['start_row'] + 1,
                        'end_row' => $tableSections[$i]['end_row'] + 1,
                        'columns' => $tableSections[$i]['columns'],
                    ];
                }
            }

            if (empty($coloredCells)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ditemukan sel dengan warna #8db3e1'
                ]);
            }

            $restructuredData = $this->restructureHierarchicalHeaders($coloredCells);

            $response = [
                'success' => true,
                'message' => 'Berhasil mendapatkan sel-sel dengan warna biru (#8db3e1/#8db3e2)',
                'spreadsheet_id' => $this->spreadsheetId,
                'sheet_name' => $sheetName,
                'table_ref' => $tableRef,
                'target_color' => '#8db3e1',
                'colored_cells' => $coloredCells,
                'restructured_data' => $restructuredData,
                'total_colored_cells_found' => count($coloredCells),
                'total_tables_found' => count($tableData)
            ];

            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Helper to get cell value
     */
    private function getCellValue($cell)
    {
        $value = null;

        if ($cell->getEffectiveValue()) {
            $effectiveValue = $cell->getEffectiveValue();

            if ($effectiveValue->getStringValue()) {
                $value = $effectiveValue->getStringValue();
            } elseif ($effectiveValue->getNumberValue()) {
                $value = $effectiveValue->getNumberValue();
            } elseif ($effectiveValue->getBoolValue() !== null) {
                $value = $effectiveValue->getBoolValue();
            }
        }

        if ($value === null && $cell->getFormattedValue()) {
            $value = $cell->getFormattedValue();
        }

        return $value;
    }

    /**
     * Restructure headers with hierarchical approach
     */
    private function restructureHierarchicalHeaders($coloredCells)
    {
        $tableGroups = [];

        foreach ($coloredCells as $cell) {
            $tableIndex = $cell['table_index'] ?? 0;

            if (!isset($tableGroups[$tableIndex])) {
                $tableGroups[$tableIndex] = [];
            }

            if (!isset($tableGroups[$tableIndex][$cell['row']])) {
                $tableGroups[$tableIndex][$cell['row']] = [];
            }

            $tableGroups[$tableIndex][$cell['row']][] = $cell;
        }

        $result = [];

        foreach ($tableGroups as $tableIndex => $rowGroups) {
            ksort($rowGroups);

            if (empty($rowGroups)) {
                continue;
            }

            $rowNumbers = array_keys($rowGroups);
            $hierarchyDepth = count($rowNumbers);

            $headerRows = [];
            for ($i = 0; $i < $hierarchyDepth; $i++) {
                $headerRows[$i] = [
                    'row_num' => $rowNumbers[$i],
                    'cells' => $rowGroups[$rowNumbers[$i]]
                ];
            }

            $mainHeaderCells = $headerRows[0]['cells'];
            $tableResult = [];

            foreach ($mainHeaderCells as $headerCell) {
                $colLetter = $headerCell['column'];
                $colIndex = $this->columnLetterToIndex($colLetter);

                $tableResult[$colIndex] = [
                    'name' => $headerCell['value'],
                    'column' => $headerCell['column'],
                    'cell' => $headerCell['cell'],
                    'children' => []
                ];
            }

            if ($hierarchyDepth === 1) {
                $result[$tableIndex] = [
                    'header_row' => $headerRows[0]['row_num'],
                    'subheader_row' => 0,
                    'sub_subheader_row' => 0,
                    'columns' => array_values($tableResult)
                ];
                continue;
            }

            if ($hierarchyDepth >= 2) {
                $this->processMultiheaderColumns($tableResult, $headerRows, $mainHeaderCells);
            }

            $this->cleanupHeaderStructure($tableResult);

            $result[$tableIndex] = [
                'header_row' => $hierarchyDepth >= 1 ? $headerRows[0]['row_num'] : 0,
                'subheader_row' => $hierarchyDepth >= 2 ? $headerRows[1]['row_num'] : 0,
                'sub_subheader_row' => $hierarchyDepth >= 3 ? $headerRows[2]['row_num'] : 0,
                'columns' => array_values($tableResult)
            ];
        }

        return array_values($result);
    }

    /**
     * Process multiheader columns (subheaders and sub-subheaders)
     */
    private function processMultiheaderColumns(&$tableResult, $headerRows, $mainHeaderCells)
    {
        $headerIndices = array_keys($tableResult);
        sort($headerIndices);

        $headerRanges = [];
        for ($i = 0; $i < count($headerIndices); $i++) {
            $startIndex = $headerIndices[$i];
            $endIndex = ($i < count($headerIndices) - 1) ? $headerIndices[$i + 1] - 1 : PHP_INT_MAX;

            $headerRanges[$startIndex] = [
                'start' => $startIndex,
                'end' => $endIndex
            ];
        }

        if (count($headerRows) >= 2) {
            $level1Headers = $headerRows[1]['cells'];

            foreach ($level1Headers as $subheaderCell) {
                $subheaderColIndex = $this->columnLetterToIndex($subheaderCell['column']);
                $assignedToHeader = false;

                foreach ($mainHeaderCells as $headerCell) {
                    $headerColIndex = $this->columnLetterToIndex($headerCell['column']);

                    if ($headerColIndex === $subheaderColIndex) {
                        $tableResult[$headerColIndex]['children'][] = [
                            'name' => $subheaderCell['value'],
                            'column' => $subheaderCell['column'],
                            'cell' => $subheaderCell['cell'],
                            'children' => [],
                            'parent_column' => $headerCell['column']
                        ];
                        $assignedToHeader = true;
                        break;
                    }
                }

                if (!$assignedToHeader) {
                    foreach ($headerRanges as $headerColIndex => $range) {
                        if ($subheaderColIndex >= $range['start'] && $subheaderColIndex <= $range['end']) {
                            $tableResult[$headerColIndex]['children'][] = [
                                'name' => $subheaderCell['value'],
                                'column' => $subheaderCell['column'],
                                'cell' => $subheaderCell['cell'],
                                'children' => [],
                                'parent_column' => $tableResult[$headerColIndex]['column']
                            ];
                            $assignedToHeader = true;
                            break;
                        }
                    }
                }

                if (!$assignedToHeader) {
                    $closestHeaderIndex = null;
                    $minDistance = PHP_INT_MAX;

                    foreach ($headerIndices as $headerColIndex) {
                        if ($headerColIndex <= $subheaderColIndex && ($subheaderColIndex - $headerColIndex) < $minDistance) {
                            $minDistance = $subheaderColIndex - $headerColIndex;
                            $closestHeaderIndex = $headerColIndex;
                        }
                    }

                    if ($closestHeaderIndex !== null) {
                        $tableResult[$closestHeaderIndex]['children'][] = [
                            'name' => $subheaderCell['value'],
                            'column' => $subheaderCell['column'],
                            'cell' => $subheaderCell['cell'],
                            'children' => [],
                            'parent_column' => $tableResult[$closestHeaderIndex]['column']
                        ];
                    }
                }
            }
        }

        if (count($headerRows) >= 3) {
            $level2Headers = $headerRows[2]['cells'];

            $subheaderParents = [];
            $subheaderRanges = [];

            foreach ($tableResult as $headerIndex => $header) {
                foreach ($header['children'] as $i => $subheader) {
                    $subheaderColIndex = $this->columnLetterToIndex($subheader['column']);
                    $subheaderParents[$subheaderColIndex] = [
                        'header_index' => $headerIndex,
                        'subheader_index' => $i,
                        'header_column' => $header['column'],
                        'subheader_column' => $subheader['column']
                    ];
                }
            }

            foreach ($tableResult as $headerIndex => $header) {
                if (empty($header['children'])) {
                    continue;
                }

                $subheaderIndices = [];
                foreach ($header['children'] as $i => $subheader) {
                    $subheaderIndices[$this->columnLetterToIndex($subheader['column'])] = $i;
                }

                ksort($subheaderIndices);
                $indices = array_keys($subheaderIndices);

                for ($i = 0; $i < count($indices); $i++) {
                    $start = $indices[$i];
                    $end = ($i < count($indices) - 1) ?
                        $indices[$i + 1] - 1 :
                        $headerRanges[$headerIndex]['end'];

                    $subheaderIndex = $subheaderIndices[$start];
                    $subheaderRanges[$start] = [
                        'start' => $start,
                        'end' => $end,
                        'header_index' => $headerIndex,
                        'subheader_index' => $subheaderIndex
                    ];
                }
            }

            foreach ($level2Headers as $subsubheaderCell) {
                $subsubheaderColIndex = $this->columnLetterToIndex($subsubheaderCell['column']);
                $assigned = false;

                if (isset($subheaderParents[$subsubheaderColIndex])) {
                    $info = $subheaderParents[$subsubheaderColIndex];
                    $headerIndex = $info['header_index'];
                    $subheaderIndex = $info['subheader_index'];

                    $tableResult[$headerIndex]['children'][$subheaderIndex]['children'][] = [
                        'name' => $subsubheaderCell['value'],
                        'column' => $subsubheaderCell['column'],
                        'cell' => $subsubheaderCell['cell']
                    ];
                    $assigned = true;
                }

                if (!$assigned) {
                    foreach ($subheaderRanges as $range) {
                        if ($subsubheaderColIndex >= $range['start'] && $subsubheaderColIndex <= $range['end']) {
                            $headerIndex = $range['header_index'];
                            $subheaderIndex = $range['subheader_index'];

                            $tableResult[$headerIndex]['children'][$subheaderIndex]['children'][] = [
                                'name' => $subsubheaderCell['value'],
                                'column' => $subsubheaderCell['column'],
                                'cell' => $subsubheaderCell['cell']
                            ];
                            $assigned = true;
                            break;
                        }
                    }
                }

                if (!$assigned) {
                    foreach ($mainHeaderCells as $headerCell) {
                        $headerColIndex = $this->columnLetterToIndex($headerCell['column']);

                        if ($headerColIndex === $subsubheaderColIndex) {
                            $tableResult[$headerColIndex]['children'][] = [
                                'name' => $subsubheaderCell['value'],
                                'column' => $subsubheaderCell['column'],
                                'cell' => $subsubheaderCell['cell']
                            ];
                            $assigned = true;
                            break;
                        }
                    }
                }

                if (!$assigned) {
                    foreach ($headerRanges as $headerColIndex => $range) {
                        if ($subsubheaderColIndex >= $range['start'] && $subsubheaderColIndex <= $range['end']) {
                            $tableResult[$headerColIndex]['children'][] = [
                                'name' => $subsubheaderCell['value'],
                                'column' => $subsubheaderCell['column'],
                                'cell' => $subsubheaderCell['cell']
                            ];
                            $assigned = true;
                            break;
                        }
                    }
                }

                if (!$assigned) {
                    $closestHeaderIndex = null;
                    $minDistance = PHP_INT_MAX;

                    foreach ($headerIndices as $headerColIndex) {
                        $distance = abs($subsubheaderColIndex - $headerColIndex);
                        if ($distance < $minDistance) {
                            $minDistance = $distance;
                            $closestHeaderIndex = $headerColIndex;
                        }
                    }

                    if ($closestHeaderIndex !== null) {
                        $tableResult[$closestHeaderIndex]['children'][] = [
                            'name' => $subsubheaderCell['value'],
                            'column' => $subsubheaderCell['column'],
                            'cell' => $subsubheaderCell['cell']
                        ];
                    }
                }
            }
        }
    }

    /**
     * Clean up and sort header structure
     */
    private function cleanupHeaderStructure(&$tableResult)
    {
        foreach ($tableResult as &$header) {
            if (isset($header['parent_column'])) {
                unset($header['parent_column']);
            }

            if (!empty($header['children'])) {
                usort($header['children'], function ($a, $b) {
                    $colA = $this->columnLetterToIndex($a['column']);
                    $colB = $this->columnLetterToIndex($b['column']);
                    return $colA - $colB;
                });

                foreach ($header['children'] as &$child) {
                    if (isset($child['parent_column'])) {
                        unset($child['parent_column']);
                    }

                    if (!empty($child['children'])) {
                        usort($child['children'], function ($a, $b) {
                            $colA = $this->columnLetterToIndex($a['column']);
                            $colB = $this->columnLetterToIndex($b['column']);
                            return $colA - $colB;
                        });
                    }
                }
            }
        }

        ksort($tableResult);
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

    /**
     * Convert column index to letter (1=A, 2=B, 26=Z, 27=AA, etc.)
     */
    private function columnIndexToLetter($index)
    {
        $result = '';

        while ($index > 0) {
            $remainder = ($index - 1) % 26;
            $result = chr(ord('A') + $remainder) . $result;
            $index = intdiv($index - $remainder - 1, 26);
        }

        return $result;
    }
}