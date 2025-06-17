<?php
// filepath: c:\Users\ACER\Desktop\post-seminar3\backend\app\Http\Controllers\Lkps\GoogleSheetController.php

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

class LkpsImportController extends Controller
{
    private $spreadsheetId;
    private $client;
    private $service;
    private $sheetNamesMap = [];
    private $titleMap = [];
    private $strataMap = [];

    private $targetColorRGB = [
        'red' => 0.55,
        'green' => 0.7,
        'blue' => 0.88
    ];

    private $yellowColorRGB = [
        'red' => 0.97,
        'green' => 0.90,
        'blue' => 0.07
    ];

    private $greenColorRGB = [
        'red' => 0.76,
        'green' => 0.84,
        'blue' => 0.61
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
     * Load sheet names and strata mapping from "Daftar Tabel" sheet ONLY
     */
    private function loadSheetNames($debug = false)
    {
        $cacheKey = "sheet_names_map_{$this->spreadsheetId}";

        if (!$debug) {
            $sheetMapCacheKey = $cacheKey . "_sheetmap";
            $strataMapCacheKey = $cacheKey . "_stratamap";

            if (Cache::has($sheetMapCacheKey) && Cache::has($strataMapCacheKey)) {
                $this->sheetNamesMap = Cache::get($sheetMapCacheKey);
                $this->strataMap = Cache::get($strataMapCacheKey);
                return;
            }
        }

        try {
            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
            $sheets = $spreadsheet->getSheets();

            $masterSheetTitle = $this->findMasterSheetTitle($sheets);
            if (!$masterSheetTitle) {
                return;
            }

            $range = "{$masterSheetTitle}";
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();

            if (empty($values)) {
                return;
            }

            // Cari header row
            $headerRowIndex = $this->findHeaderRowIndex($values);
            if ($headerRowIndex === -1) {
                return;
            }

            // Parse header untuk menemukan kolom strata
            $headerRow = $values[$headerRowIndex];
            $strataColumns = $this->findStrataColumns($headerRow);

            $startRow = $headerRowIndex + 1;
            $map = [];
            $titleToCodeMap = [];
            $strataMapping = [];

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

                // Get table title
                $title = '';
                if (isset($values[$i][1]) && !empty($values[$i][1])) {
                    $title = (string) $values[$i][1];
                }

                if (empty($title)) {
                    $title = "Tabel " . $code;
                }

                $titleToCodeMap[$title] = $code;

                // Parse strata information dari kolom program di Daftar Tabel
                $tableStrata = $this->parseTableStrata($values[$i], $strataColumns);
                $strataMapping[$code] = $tableStrata;
            }

            $this->sheetNamesMap = $map;
            $this->titleMap = $titleToCodeMap;
            $this->strataMap = $strataMapping;

            // Cache results
            if (!$debug && !empty($this->sheetNamesMap)) {
                Cache::put("sheet_names_map_{$this->spreadsheetId}_sheetmap", $this->sheetNamesMap, now()->addDay());
                Cache::put("sheet_names_map_{$this->spreadsheetId}_titlemap", $this->titleMap, now()->addDay());
                Cache::put("sheet_names_map_{$this->spreadsheetId}_stratamap", $this->strataMap, now()->addDay());
            }

        } catch (\Exception $e) {
            Log::error('Error loading sheet names and strata: ' . $e->getMessage());
        }
    }

    /**
     * Find master sheet title (Daftar Tabel prioritas utama)
     */
    private function findMasterSheetTitle($sheets)
    {
        $priorityNames = [
            "Daftar Tabel",
            "daftar tabel",
            "PS",
            "Menu",
            "Index"
        ];

        foreach ($priorityNames as $searchName) {
            foreach ($sheets as $sheet) {
                $title = $sheet->getProperties()->getTitle();
                if (strcasecmp($title, $searchName) === 0) {
                    return $title;
                }
            }
        }

        return null;
    }

    /**
     * Find header row index in values array
     */
    private function findHeaderRowIndex($values)
    {
        for ($i = 0; $i < min(10, count($values)); $i++) {
            if (isset($values[$i][0]) && isset($values[$i][2])) {
                $colA = (string) $values[$i][0];
                $colC = (string) $values[$i][2];

                if (
                    ($colA === "No" || stripos($colA, "Nomor") !== false) &&
                    (stripos($colC, "Nama") !== false && stripos($colC, "Sheet") !== false)
                ) {
                    return $i;
                }
            }
        }

        return -1;
    }

    /**
     * Find columns that contain strata information (hanya D3 dan STr) - dengan lebih flexible detection
     */
    private function findStrataColumns($headerRow)
    {
        $strataColumns = [
            'D3' => [],
            'STr' => []
        ];

        foreach ($headerRow as $colIndex => $headerValue) {
            $headerValue = trim((string) $headerValue);
            $headerLower = strtolower($headerValue);

            // More flexible pattern matching untuk D3
            if (
                $headerValue === 'D3' ||
                $headerValue === 'D-III' ||
                $headerValue === 'DIII' ||
                $headerLower === 'd3' ||
                $headerLower === 'd-iii' ||
                $headerLower === 'diii' ||
                strpos($headerLower, 'd3') !== false ||
                strpos($headerLower, 'd-iii') !== false ||
                strpos($headerLower, 'diploma tiga') !== false ||
                strpos($headerLower, 'diploma 3') !== false
            ) {
                $strataColumns['D3'][] = $colIndex;
            }

            // More flexible pattern matching untuk STr
            elseif (
                $headerValue === 'STr' ||
                $headerValue === 'D-IV' ||
                $headerValue === 'DIV' ||
                $headerLower === 'str' ||
                $headerLower === 'd-iv' ||
                $headerLower === 'div' ||
                strpos($headerLower, 'str') !== false ||
                strpos($headerLower, 'd-iv') !== false ||
                strpos($headerLower, 'sarjana terapan') !== false ||
                strpos($headerLower, 'diploma 4') !== false
            ) {
                $strataColumns['STr'][] = $colIndex;
            }
        }

        return $strataColumns;
    }

    /**
     * Parse strata information from table row (D3 atau STr saja, tidak ada kombinasi)
     */
    private function parseTableStrata($row, $strataColumns)
    {
        $strata = [
            'D3' => false,
            'STr' => false,
            'detected_strata' => null,
            'debug_info' => [] // Add debug info
        ];

        // Check D3 column
        foreach ($strataColumns['D3'] as $colIndex) {
            if (isset($row[$colIndex])) {
                $cellValue = trim((string) $row[$colIndex]);

                $strata['debug_info']['D3'][] = [
                    'col_index' => $colIndex,
                    'raw_value' => $cellValue,
                    'is_empty' => empty($cellValue),
                    'length' => strlen($cellValue)
                ];

                // More flexible checkmark detection
                if (
                    !empty($cellValue) &&
                    $cellValue !== '-' &&
                    $cellValue !== 'x' &&
                    $cellValue !== 'X' &&
                    $cellValue !== '0' &&
                    strtolower($cellValue) !== 'false' &&
                    strtolower($cellValue) !== 'no'
                ) {
                    $strata['D3'] = true;
                    break; // Found checkmark, no need to check other D3 columns
                }
            }
        }

        // Check STr column
        foreach ($strataColumns['STr'] as $colIndex) {
            if (isset($row[$colIndex])) {
                $cellValue = trim((string) $row[$colIndex]);

                $strata['debug_info']['STr'][] = [
                    'col_index' => $colIndex,
                    'raw_value' => $cellValue,
                    'is_empty' => empty($cellValue),
                    'length' => strlen($cellValue)
                ];

                // More flexible checkmark detection
                if (
                    !empty($cellValue) &&
                    $cellValue !== '-' &&
                    $cellValue !== 'x' &&
                    $cellValue !== 'X' &&
                    $cellValue !== '0' &&
                    strtolower($cellValue) !== 'false' &&
                    strtolower($cellValue) !== 'no'
                ) {
                    $strata['STr'] = true;
                    break; // Found checkmark, no need to check other STr columns
                }
            }
        }

        // Determine final strata (D3 OR STr, tidak ada kombinasi)
        if ($strata['STr']) {
            $strata['detected_strata'] = 'Sarjana Terapan';
        } elseif ($strata['D3']) {
            $strata['detected_strata'] = 'Diploma Tiga';
        }
        // Jika kedua kolom ada checkmark, prioritas STr (Sarjana Terapan)

        return $strata;
    }

    /**
     * Get available tables with enhanced debugging
     */
    public function getAvailableTables(Request $request)
    {
        $forceRefresh = $request->has('force_refresh') ? $request->input('force_refresh') : true;

        if ($request->has('spreadsheet_id')) {
            $this->spreadsheetId = $request->input('spreadsheet_id');
        }

        if ($forceRefresh) {
            Cache::forget("sheet_names_map_{$this->spreadsheetId}_sheetmap");
            Cache::forget("sheet_names_map_{$this->spreadsheetId}_titlemap");
            Cache::forget("sheet_names_map_{$this->spreadsheetId}_stratamap");
        }

        $this->loadSheetNames($forceRefresh);

        $sheetCodes = array_keys($this->sheetNamesMap);
        $sheetNames = array_values($this->sheetNamesMap);

        // Skip first sheet if it's the master sheet
        $skipCount = 1;
        if (count($sheetCodes) > $skipCount) {
            $sheetCodes = array_slice($sheetCodes, $skipCount);
            $sheetNames = array_slice($sheetNames, $skipCount);
        }

        // Filter title mappings (skip first)
        $filteredTitleMap = [];
        $firstSheetCode = reset($this->sheetNamesMap);
        foreach ($this->titleMap as $title => $code) {
            if ($code === $firstSheetCode) {
                continue;
            }
            $filteredTitleMap[$title] = $code;
        }

        // Create enhanced mapping with strata info dari Daftar Tabel
        $enhancedMapping = [];
        foreach ($filteredTitleMap as $title => $code) {
            $strataInfo = $this->strataMap[$code] ?? null;

            $enhancedMapping[$code] = [
                'title' => $title,
                'sheet_name' => $this->sheetNamesMap[$code] ?? $code,
                'strata_info' => $strataInfo,
                'detected_strata' => $strataInfo['detected_strata'] ?? null
            ];
        }

        $response = [
            'success' => true,
            'spreadsheet_id' => $this->spreadsheetId,
            'total_tables' => count($enhancedMapping),
            'sheet_names' => $sheetNames,
            'title_mappings' => $filteredTitleMap,
            'mapping' => $enhancedMapping,
            'strata_summary' => $this->getStrataSummary(),
            'strata_detection_method' => 'daftar_tabel_enhanced'
        ];

        if ($request->has('debug') || $request->input('debug') === true) {
            $response['debug'] = [
                'raw_strata_map' => $this->strataMap,
                'strata_columns_found' => $this->getStrataColumnsSummary(),
                'first_sheet_skipped' => $firstSheetCode,
                'detection_details' => $this->getDetectionDetails()
            ];
        }

        return response()->json($response);
    }

    /**
     * Get detailed detection information for debugging
     */
    private function getDetectionDetails()
    {
        $details = [
            'total_tables_processed' => count($this->strataMap),
            'strata_detected' => 0,
            'no_strata' => 0,
            'sample_detections' => []
        ];

        $sampleCount = 0;
        foreach ($this->strataMap as $code => $strataInfo) {
            if ($strataInfo['detected_strata']) {
                $details['strata_detected']++;

                // Add sample for debugging (first 5 items)
                if ($sampleCount < 5) {
                    $details['sample_detections'][] = [
                        'code' => $code,
                        'detected_strata' => $strataInfo['detected_strata'],
                        'D3' => $strataInfo['D3'],
                        'STr' => $strataInfo['STr'],
                        'debug_info' => $strataInfo['debug_info'] ?? null
                    ];
                    $sampleCount++;
                }
            } else {
                $details['no_strata']++;
            }
        }

        return $details;
    }

    /**
     * Get summary of strata distribution (hanya D3 dan STr)
     */
    private function getStrataSummary()
    {
        $summary = [
            'Diploma Tiga' => 0,
            'Sarjana Terapan' => 0,
            'No Strata' => 0
        ];

        foreach ($this->strataMap as $code => $strataInfo) {
            $detectedStrata = $strataInfo['detected_strata'] ?? null;

            if ($detectedStrata && isset($summary[$detectedStrata])) {
                $summary[$detectedStrata]++;
            } else {
                $summary['No Strata']++;
            }
        }

        return $summary;
    }

    private function getStrataColumnsSummary()
    {
        return [
            'info' => 'Strata detection: D3 column -> Diploma Tiga, STr column -> Sarjana Terapan (no combinations)'
        ];
    }

    /**
     * Get colored cells by sheet name (NO red text detection)
     */
    private function getColoredCellsBySheetName(Request $request)
    {
        try {
            ini_set('memory_limit', '1024M');

            $sheetName = $request->input('sheet_name');
            $tableRef = $request->input('table_ref');
            $program = $request->input('program'); // NEW: Get program from request

            $rangeToCheck = $sheetName . '!A1:Z150';

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

            // SPECIAL CASE: Check if this is table 8c or 8d1
            $isSpecialTable = $this->isSpecialTable($tableRef);
            $specialCaseInfo = null;

            if ($isSpecialTable && $program) {
                $specialCaseInfo = $this->findRedTextBoundaries($rowData, $program);
                // Remove addLog call - just store info
            }

            $coloredCells = [];
            $yellowCells = [];
            $yellowColumns = [];
            $firstYellowRow = null;
            $yellowRowsFound = [];
            $coloredColumns = [];

            // Get strata from Daftar Tabel mapping ONLY
            $tableStrata = null;
            if ($tableRef && isset($this->strataMap[$tableRef])) {
                $strataInfo = $this->strataMap[$tableRef];
                $tableStrata = $strataInfo['detected_strata'] ?? null;
            }

            $blueColorTolerance = $this->colorTolerance;
            $yellowColorTolerance = 0.1;

            $isSimilarColor = function ($color1, $color2, $tolerance) {
                if (!isset($color1['red']) || !isset($color2['red']))
                    return false;

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

            // Yellow color variants
            $yellowTargetRGB = [
                'red' => 0.97,
                'green' => 0.90,
                'blue' => 0.07
            ];

            $yellowAlternatives = [
                ['red' => 1.0, 'green' => 1.0, 'blue' => 0.0],
                ['red' => 1.0, 'green' => 0.92, 'blue' => 0.0],
                ['red' => 0.98, 'green' => 0.89, 'blue' => 0.05],
            ];

            foreach ($rowData as $rowIndex => $row) {
                if (!$row->getValues()) {
                    continue;
                }

                $currentRow = $rowIndex + 1;

                // SPECIAL CASE: Skip rows outside the boundary
                if ($specialCaseInfo) {
                    if (
                        $currentRow < $specialCaseInfo['detection_start'] ||
                        ($specialCaseInfo['detection_end'] && $currentRow > $specialCaseInfo['detection_end'])
                    ) {
                        continue; // Skip this row
                    }
                }

                $rowHasYellowCell = false;

                foreach ($row->getValues() as $colIndex => $cell) {
                    if (!$cell) {
                        continue;
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

                    // Check for blue cells (table headers)
                    if ($isSimilarColor($cellColor, $this->targetColorRGB, $blueColorTolerance)) {
                        $value = $this->getCellValue($cell);
                        $columnLetter = $this->columnIndexToLetter($colIndex + 1);

                        $coloredColumns[$columnLetter] = true;

                        $coloredCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'special_case' => $isSpecialTable ? ($specialCaseInfo['search_text'] ?? null) : null
                        ];
                    }

                    // Check for yellow cells (fillable columns)
                    $isYellow = false;

                    if ($isSimilarColor($cellColor, $yellowTargetRGB, $yellowColorTolerance)) {
                        $isYellow = true;
                    }

                    if (!$isYellow) {
                        foreach ($yellowAlternatives as $altYellow) {
                            if ($isSimilarColor($cellColor, $altYellow, $yellowColorTolerance)) {
                                $isYellow = true;
                                break;
                            }
                        }
                    }

                    if (
                        !$isYellow &&
                        $cellColor['red'] > 0.85 &&
                        $cellColor['green'] > 0.85 &&
                        $cellColor['blue'] < 0.2
                    ) {
                        $isYellow = true;
                    }

                    if ($isYellow) {
                        $value = $this->getCellValue($cell);
                        $columnLetter = $this->columnIndexToLetter($colIndex + 1);

                        $rowHasYellowCell = true;

                        $yellowCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'rgb_actual' => $cellColor,
                            'special_case' => $isSpecialTable ? ($specialCaseInfo['search_text'] ?? null) : null
                        ];

                        if (!isset($yellowColumns[$columnLetter])) {
                            $yellowColumns[$columnLetter] = [];
                        }
                        $yellowColumns[$columnLetter][] = $currentRow;
                    }
                }

                // Track yellow rows
                if ($rowHasYellowCell) {
                    $yellowRowsFound[] = $currentRow;

                    if ($firstYellowRow === null || $currentRow < $firstYellowRow) {
                        $firstYellowRow = $currentRow;
                    }
                }
            }

            if (empty($coloredCells)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ditemukan sel dengan warna #8db3e1' . ($isSpecialTable ? " dalam range special case" : "")
                ]);
            }

            $restructuredData = $this->restructureHierarchicalHeaders($coloredCells);

            // Determine data start row
            $dataStartRow = null;
            $headerLastRow = 0;

            if (!empty($restructuredData) && isset($restructuredData[0]['header_row'])) {
                $headerLastRow = $restructuredData[0]['header_row'];

                if (isset($restructuredData[0]['subheader_row']) && $restructuredData[0]['subheader_row'] > $headerLastRow) {
                    $headerLastRow = $restructuredData[0]['subheader_row'];
                }

                if (isset($restructuredData[0]['sub_subheader_row']) && $restructuredData[0]['sub_subheader_row'] > $headerLastRow) {
                    $headerLastRow = $restructuredData[0]['sub_subheader_row'];
                }
            }

            if (!empty($yellowRowsFound)) {
                sort($yellowRowsFound);
                foreach ($yellowRowsFound as $yellowRow) {
                    if ($yellowRow > $headerLastRow) {
                        $dataStartRow = $yellowRow + 1;
                        break;
                    }
                }
            }

            if ($dataStartRow === null && $headerLastRow > 0) {
                $dataStartRow = $headerLastRow + 1;
            }

            $response = [
                'success' => true,
                'message' => 'Berhasil mendapatkan sel-sel dengan warna biru dan struktur tabel' . ($isSpecialTable ? " (Special case detected)" : ""),
                'spreadsheet_id' => $this->spreadsheetId,
                'sheet_name' => $sheetName,
                'table_ref' => $tableRef,
                'target_color' => '#8db3e1',
                'colored_cells' => $coloredCells,
                'yellow_cells_count' => count($yellowCells),
                'yellow_rows_found' => $yellowRowsFound,
                'yellow_columns' => $yellowColumns,
                'yellow_columns_list' => array_keys($yellowColumns),
                'first_yellow_row' => $firstYellowRow,
                'header_last_row' => $headerLastRow,
                'data_start_row' => $dataStartRow,
                'restructured_data' => $restructuredData,
                'total_colored_cells_found' => count($coloredCells),

                // Special case info
                'is_special_table' => $isSpecialTable,
                'special_case_info' => $specialCaseInfo,

                // Strata info dari Daftar Tabel ONLY - NO red text detection
                'detected_strata' => $tableStrata,
                'strata_source' => 'daftar_tabel_only',
                'strata_info' => $this->strataMap[$tableRef] ?? null,
                'strata_detection_method' => 'daftar_tabel_only'
            ];

            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
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
     * Find red text boundaries for special tables
     */
    private function findRedTextBoundaries($rowData, $program)
    {
        $searchText = '';
        switch (strtoupper($program)) {
            case 'D-III':
                $searchText = 'Diploma Tiga';
                break;
            case 'D-IV':
                $searchText = 'Sarjana Terapan';
                break;
            default:
                return null;
        }

        $redTextRows = [];
        $targetTextRow = null;

        // Red color detection parameters
        $redColorThreshold = [
            'red' => 0.7,    // At least 70% red
            'green' => 0.3,  // Less than 30% green
            'blue' => 0.3    // Less than 30% blue
        ];

        foreach ($rowData as $rowIndex => $row) {
            if (!$row->getValues()) {
                continue;
            }

            foreach ($row->getValues() as $colIndex => $cell) {
                if (!$cell) {
                    continue;
                }

                // Check text color (not background color)
                $effectiveFormat = $cell->getEffectiveFormat();
                if (!$effectiveFormat || !$effectiveFormat->getTextFormat()) {
                    continue;
                }

                $textFormat = $effectiveFormat->getTextFormat();
                $foregroundColor = $textFormat->getForegroundColor();

                if (!$foregroundColor) {
                    continue;
                }

                $textColor = [
                    'red' => $foregroundColor->getRed() ?? 0,
                    'green' => $foregroundColor->getGreen() ?? 0,
                    'blue' => $foregroundColor->getBlue() ?? 0
                ];

                // Check if text is red
                $isRedText = (
                    $textColor['red'] >= $redColorThreshold['red'] &&
                    $textColor['green'] <= $redColorThreshold['green'] &&
                    $textColor['blue'] <= $redColorThreshold['blue']
                );

                if ($isRedText) {
                    $cellValue = $this->getCellValue($cell);
                    $currentRow = $rowIndex + 1;

                    $redTextRows[] = [
                        'row' => $currentRow,
                        'text' => $cellValue,
                        'column' => $this->columnIndexToLetter($colIndex + 1)
                    ];

                    // Check if this is our target text
                    if ($cellValue && stripos($cellValue, $searchText) !== false) {
                        $targetTextRow = $currentRow;
                    }
                }
            }
        }

        if ($targetTextRow === null) {
            return null;
        }

        // Find next red text after target text
        $nextRedTextRow = null;
        foreach ($redTextRows as $redText) {
            if ($redText['row'] > $targetTextRow) {
                $nextRedTextRow = $redText['row'];
                break;
            }
        }

        return [
            'search_text' => $searchText,
            'target_row' => $targetTextRow,
            'detection_start' => $targetTextRow + 1, // Start from next row after red text
            'detection_end' => $nextRedTextRow ? $nextRedTextRow - 1 : null, // End before next red text
            'all_red_texts' => $redTextRows,
            'program' => $program
        ];
    }

    // Keep all existing helper methods
    public function updateDataIndicesWithParent(Request $request)
    {
        try {
            // Get table ID from request
            $tableId = $request->input('table_id', null);

            // Get all records for a specific table if table_id is provided
            // Otherwise get all records across all tables
            if ($tableId) {
                $records = LkpsColumn::where('lkpsTableId', (string) $tableId)->get();
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
                        } else {
                            $possibleParentId = (string) $possibleParent->_id;
                        }

                        if ($possibleParentId && $possibleParentId === $parentId) {
                            $parent = $possibleParent;
                            break;
                        }
                    }

                    if ($parent) {
                        // PERUBAHAN UTAMA: Format parent_children untuk indeksData
                        $parentDataIndex = $this->formatTitleForIndex($parent->judul);
                        $childDataIndex = $this->formatTitleForIndex($record->judul);

                        // Format: parent_children (bukan children_parent)
                        $newDataIndex = $parentDataIndex . '_' . $childDataIndex;

                        // Only update if it's different from current indeksData
                        if ($record->indeksData !== $newDataIndex) {
                            $originalIndex = $record->indeksData;

                            // Update the record
                            $record->indeksData = $newDataIndex;
                            $record->save();

                            $updatedRecords[] = [
                                'id' => is_object($record->_id) ? (string) $record->_id : $record->_id,
                                'table_id' => $record->lkpsTableId,
                                'old_data_index' => $originalIndex,
                                'new_data_index' => $newDataIndex,
                                'parent_title' => $parent->judul,
                                'child_title' => $record->judul,
                                'pattern' => 'parent_children'
                            ];
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Data indices updated with parent_children pattern using lkpsTableId relation',
                'total_updated' => count($updatedRecords),
                'updated_records' => $updatedRecords,
                'relation_used' => 'lkpsTableId (string) → LkpsTable._id',
                'pattern_used' => 'parent_children (e.g., tingkat_internasional)'
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

    private function formatTitleForIndex($title)
    {
        // Convert to lowercase first
        $formattedTitle = strtolower(trim($title));

        // Replace forward slash with underscore
        $formattedTitle = str_replace('/', '_', $formattedTitle);

        // Replace spaces and other special characters with underscores
        $formattedTitle = preg_replace('/[^a-z0-9_]/', '_', $formattedTitle);

        // Remove multiple consecutive underscores
        $formattedTitle = preg_replace('/_+/', '_', $formattedTitle);

        // Remove leading/trailing underscores
        $formattedTitle = trim($formattedTitle, '_');

        return $formattedTitle;
    }

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
}
