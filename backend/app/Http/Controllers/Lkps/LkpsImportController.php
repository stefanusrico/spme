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

    private $magentaColorRGB = [
        'red' => 1.0,
        'green' => 0.0,
        'blue' => 1.0
    ];

    private $orangeColorRGB = [
        'red' => 1.0,
        'green' => 0.6,
        'blue' => 0.0
    ];

    private $orangeColorRGB2 = [
        'red' => 0.965,
        'green' => 0.596,
        'blue' => 0.016
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

            $headerRowIndex = $this->findHeaderRowIndex($values);
            if ($headerRowIndex === -1) {
                return;
            }

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

                $title = '';
                if (isset($values[$i][1]) && !empty($values[$i][1])) {
                    $title = (string) $values[$i][1];
                }

                if (empty($title)) {
                    $title = "Tabel " . $code;
                }

                $titleToCodeMap[$title] = $code;
                $tableStrata = $this->parseTableStrata($values[$i], $strataColumns);
                $strataMapping[$code] = $tableStrata;
            }

            $this->sheetNamesMap = $map;
            $this->titleMap = $titleToCodeMap;
            $this->strataMap = $strataMapping;

            if (!$debug && !empty($this->sheetNamesMap)) {
                Cache::put("sheet_names_map_{$this->spreadsheetId}_sheetmap", $this->sheetNamesMap, now()->addDay());
                Cache::put("sheet_names_map_{$this->spreadsheetId}_titlemap", $this->titleMap, now()->addDay());
                Cache::put("sheet_names_map_{$this->spreadsheetId}_stratamap", $this->strataMap, now()->addDay());
            }

        } catch (\Exception $e) {
            Log::error('Error loading sheet names and strata: ' . $e->getMessage());
        }
    }

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

    private function findStrataColumns($headerRow)
    {
        $strataColumns = [
            'D3' => [],
            'STr' => []
        ];

        foreach ($headerRow as $colIndex => $headerValue) {
            $headerValue = trim((string) $headerValue);
            $headerLower = strtolower($headerValue);

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
            } elseif (
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

    private function parseTableStrata($row, $strataColumns)
    {
        $strata = [
            'D3' => false,
            'STr' => false,
            'detected_strata' => null,
            'debug_info' => []
        ];

        foreach ($strataColumns['D3'] as $colIndex) {
            if (isset($row[$colIndex])) {
                $cellValue = trim((string) $row[$colIndex]);

                $strata['debug_info']['D3'][] = [
                    'col_index' => $colIndex,
                    'raw_value' => $cellValue,
                    'is_empty' => empty($cellValue),
                    'length' => strlen($cellValue)
                ];

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
                    break;
                }
            }
        }

        foreach ($strataColumns['STr'] as $colIndex) {
            if (isset($row[$colIndex])) {
                $cellValue = trim((string) $row[$colIndex]);

                $strata['debug_info']['STr'][] = [
                    'col_index' => $colIndex,
                    'raw_value' => $cellValue,
                    'is_empty' => empty($cellValue),
                    'length' => strlen($cellValue)
                ];

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
                    break;
                }
            }
        }

        if ($strata['STr']) {
            $strata['detected_strata'] = 'Sarjana Terapan';
        } elseif ($strata['D3']) {
            $strata['detected_strata'] = 'Diploma Tiga';
        }

        return $strata;
    }

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

    private function getColoredCellsBySheetName(Request $request)
    {
        try {
            ini_set('memory_limit', '1024M');

            $sheetName = $request->input('sheet_name');
            $tableRef = $request->input('table_ref');
            $program = $request->input('program'); // Ini parameter krusial

            // Log informasi awal panggilan
            \Log::info("PARSING_START: Memulai parsing untuk sheet '{$sheetName}'", [
                'table_ref' => $tableRef,
                'program' => $program ?? 'Not Provided'
            ]);

            $rangeToCheck = $sheetName . '!A1:Z150';

            $response = $this->service->spreadsheets->get($this->spreadsheetId, [
                'includeGridData' => true,
                'ranges' => $rangeToCheck
            ]);

            $sheets = $response->getSheets();

            if (!$sheets || empty($sheets[0]->getData())) {
                \Log::error("PARSING_FAILED: Tidak ada data di sheet '{$sheetName}'.");
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data yang tersedia atau format tidak didukung'
                ]);
            }

            $data = $sheets[0]->getData()[0];
            $rowData = $data->getRowData();

            // ✅ DYNAMIC DETECTION: Cek apakah sheet ini memiliki beberapa tabel
            $hasMultipleTables = $this->hasMultipleTablesInSheet($rowData);
            $specialCaseInfo = null;

            // ✅ FIX: Initialize $isSpecialTable berdasarkan deteksi dinamis
            $isSpecialTable = $hasMultipleTables;

            if ($hasMultipleTables) {
                \Log::info("MULTI_TABLE_DETECTED: Sheet '{$sheetName}' terdeteksi memiliki banyak tabel.", ['table_ref' => $tableRef]);
                if ($program) {
                    \Log::info("BOUNDARY_SEARCH_START: Mencari batas untuk program '{$program}'...");
                    $specialCaseInfo = $this->findRedTextBoundaries($rowData, $program);

                    // =================================================================
                    // ✅✅✅ TAMBAHAN LOGGING UTAMA UNTUK DEBUGGING ✅✅✅
                    // =================================================================
                    if ($specialCaseInfo) {
                        \Log::info("✅✅ BOUNDARY_FOUND: Batas program berhasil ditemukan!", [
                            'program' => $program,
                            'search_text' => $specialCaseInfo['search_text'],
                            'target_row' => $specialCaseInfo['target_row'],
                            'detection_start' => $specialCaseInfo['detection_start'],
                            'detection_end' => $specialCaseInfo['detection_end'] ?? 'End of Sheet'
                        ]);
                    } else {
                        \Log::warning("🔥🔥 BOUNDARY_NOT_FOUND: Gagal menemukan batas untuk program '{$program}'.", [
                            'sheet' => $sheetName,
                            'reason' => 'Tidak ada teks merah yang cocok. Sistem akan memproses seluruh sheet, yang dapat menyebabkan kontaminasi data dari tabel lain!'
                        ]);
                    }
                    // =================================================================

                } else {
                    \Log::warning("🔥🔥 MISSING_PROGRAM_PARAM: Sheet multi-tabel tetapi parameter 'program' tidak diberikan.", [
                        'sheet' => $sheetName,
                        'table_ref' => $tableRef,
                        'action' => 'Sistem akan memproses seluruh sheet, yang hampir pasti akan menyebabkan kontaminasi data.'
                    ]);
                }
            }

            // Initialize all color detection variables
            $coloredCells = [];
            $yellowCells = [];
            $greenCells = [];
            $greenColumns = [];
            $yellowColumns = [];
            $magentaCells = [];
            $infoSections = [];
            $infoCells = [];
            $orangeCells = [];
            $kondisiSections = [];
            $kondisiCells = [];
            $firstYellowRow = null;
            $yellowRowsFound = [];
            $tableStrata = null;

            if ($tableRef && isset($this->strataMap[$tableRef])) {
                $strataInfo = $this->strataMap[$tableRef];
                $tableStrata = $strataInfo['detected_strata'] ?? null;
            }

            // Color tolerances
            $blueColorTolerance = $this->colorTolerance;
            $yellowColorTolerance = 0.1;
            $magentaColorTolerance = 0.05;
            $orangeColorTolerance = 0.1;
            $greenColorTolerance = 0.1;

            $isSimilarColor = function ($color1, $color2, $tolerance) {
                if (!isset($color1['red']) || !isset($color2['red'])) {
                    return false;
                }

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
                    (int) (($rgb['red'] ?? 0) * 255),
                    (int) (($rgb['green'] ?? 0) * 255),
                    (int) (($rgb['blue'] ?? 0) * 255)
                );
            };

            $yellowTargetRGB = ['red' => 0.97, 'green' => 0.90, 'blue' => 0.07];
            $yellowAlternatives = [
                ['red' => 1.0, 'green' => 1.0, 'blue' => 0.0],
                ['red' => 1.0, 'green' => 0.92, 'blue' => 0.0],
                ['red' => 0.98, 'green' => 0.89, 'blue' => 0.05],
            ];

            $magentaColorRGB = ['red' => 1.0, 'green' => 0.0, 'blue' => 1.0];

            $orangeColorVariants = [
                ['red' => 1.0, 'green' => 0.6, 'blue' => 0.0],
                ['red' => 0.965, 'green' => 0.596, 'blue' => 0.016],
                ['red' => 1.0, 'green' => 0.65, 'blue' => 0.0],
                ['red' => 0.9, 'green' => 0.5, 'blue' => 0.0],
                ['red' => 1.0, 'green' => 0.55, 'blue' => 0.1],
                ['red' => 0.98, 'green' => 0.58, 'blue' => 0.02],
            ];

            foreach ($rowData as $rowIndex => $row) {
                if (!$row->getValues()) {
                    continue;
                }

                $currentRow = $rowIndex + 1;

                // APPLY DYNAMIC BOUNDARY FILTERING
                if ($specialCaseInfo) {
                    if (
                        $currentRow < $specialCaseInfo['detection_start'] ||
                        ($specialCaseInfo['detection_end'] && $currentRow > $specialCaseInfo['detection_end'])
                    ) {
                        continue; // Skip rows outside the program boundary
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

                    $value = $this->getCellValue($cell);
                    $columnLetter = $this->columnIndexToLetter($colIndex + 1);

                    // Orange color detection
                    $isOrangeColor = false;
                    foreach ($orangeColorVariants as $orangeVariant) {
                        if ($isSimilarColor($cellColor, $orangeVariant, $orangeColorTolerance)) {
                            $isOrangeColor = true;
                            break;
                        }
                    }
                    if (!$isOrangeColor && ($cellColor['red'] > 0.8 && $cellColor['green'] > 0.4 && $cellColor['green'] < 0.8 && $cellColor['blue'] < 0.3)) {
                        $isOrangeColor = true;
                    }
                    if (!$isOrangeColor && ($cellColor['red'] > $cellColor['green'] && $cellColor['green'] > $cellColor['blue'] && $cellColor['red'] > 0.7 && $cellColor['green'] > 0.3 && $cellColor['blue'] < 0.4)) {
                        $isOrangeColor = true;
                    }

                    if ($isOrangeColor) {
                        $orangeCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'color_match'
                        ];
                        if ($value && (strtoupper(trim($value)) === 'KONDISI' || stripos($value, 'kondisi') !== false)) {
                            $kondisiSections[] = [
                                'kondisi_row' => $currentRow,
                                'kondisi_column' => $columnLetter,
                                'kondisi_cell' => $columnLetter . $currentRow,
                                'data_below' => []
                            ];
                        }
                    }

                    // Green color detection
                    if ($isSimilarColor($cellColor, $this->greenColorRGB, $greenColorTolerance)) {
                        $greenCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'color_match'
                        ];
                        if (!isset($greenColumns[$columnLetter]))
                            $greenColumns[$columnLetter] = [];
                        $greenColumns[$columnLetter][] = $currentRow;
                    }

                    // Magenta color detection
                    if ($isSimilarColor($cellColor, $this->magentaColorRGB, $magentaColorTolerance)) {
                        $magentaCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'color_match'
                        ];
                        if ($value && strtoupper(trim($value)) === 'INFO') {
                            $infoSections[] = [
                                'info_row' => $currentRow,
                                'info_column' => $columnLetter,
                                'info_cell' => $columnLetter . $currentRow,
                                'data_below' => []
                            ];
                        }
                    }

                    // KONDISI and INFO text detection logic
                    if ($value && (strtoupper(trim($value)) === 'KONDISI' || stripos($value, 'kondisi') !== false || stripos($value, 'condition') !== false || stripos($value, 'syarat') !== false)) {
                        if ($isOrangeColor) {
                            $kondisiCells[] = ['row' => $currentRow, 'column' => $columnLetter, 'cell' => $columnLetter . $currentRow, 'value' => $value];
                            $alreadyInSections = false;
                            foreach ($kondisiSections as $section) {
                                if ($section['kondisi_cell'] === $columnLetter . $currentRow)
                                    $alreadyInSections = true;
                            }
                            if (!$alreadyInSections) {
                                $kondisiSections[] = [
                                    'kondisi_row' => $currentRow,
                                    'kondisi_column' => $columnLetter,
                                    'kondisi_cell' => $columnLetter . $currentRow,
                                    'data_below' => []
                                ];
                            }
                        }
                    }

                    if ($value && strtoupper(trim($value)) === 'INFO') {
                        $infoCells[] = ['row' => $currentRow, 'column' => $columnLetter, 'cell' => $columnLetter . $currentRow, 'value' => $value];
                        $isMagentaColor = $isSimilarColor($cellColor, $magentaColorRGB, $magentaColorTolerance);
                        if (!$isMagentaColor) {
                            $hexColor = $toHex($cellColor);
                            if ($hexColor !== '#8db3e1') { // Avoid adding blue header as magenta
                                $magentaCells[] = [
                                    'row' => $currentRow,
                                    'column' => $columnLetter,
                                    'cell' => $columnLetter . $currentRow,
                                    'value' => $value,
                                    'color' => $hexColor,
                                    'rgb_actual' => $cellColor,
                                    'detection_method' => 'text_fallback'
                                ];
                                $infoSections[] = [
                                    'info_row' => $currentRow,
                                    'info_column' => $columnLetter,
                                    'info_cell' => $columnLetter . $currentRow,
                                    'data_below' => []
                                ];
                            }
                        }
                    }

                    // Blue color detection
                    if ($isSimilarColor($cellColor, $this->targetColorRGB, $blueColorTolerance)) {
                        $coloredCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $toHex($cellColor),
                            'rgb_actual' => $cellColor,
                            'table_index' => 0
                        ];
                    }

                    // Yellow color detection
                    $isYellow = false;
                    if ($isSimilarColor($cellColor, $yellowTargetRGB, $yellowColorTolerance))
                        $isYellow = true;
                    if (!$isYellow) {
                        foreach ($yellowAlternatives as $altYellow) {
                            if ($isSimilarColor($cellColor, $altYellow, $yellowColorTolerance)) {
                                $isYellow = true;
                                break;
                            }
                        }
                    }
                    if (!$isYellow && ($cellColor['red'] > 0.85 && $cellColor['green'] > 0.85 && $cellColor['blue'] < 0.2)) {
                        $isYellow = true;
                    }
                    if ($isYellow) {
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
                        if (!isset($yellowColumns[$columnLetter]))
                            $yellowColumns[$columnLetter] = [];
                        $yellowColumns[$columnLetter][] = $currentRow;
                    }
                } // End loop kolom

                if ($rowHasYellowCell) {
                    $yellowRowsFound[] = $currentRow;
                    if ($firstYellowRow === null || $currentRow < $firstYellowRow) {
                        $firstYellowRow = $currentRow;
                    }
                }
            } // End loop baris

            $infoSections = $this->processInfoSections($infoSections, $rowData);
            $kondisiSections = $this->processKondisiSections($kondisiSections, $rowData);
            $restructuredData = $this->restructureHierarchicalHeaders($coloredCells);

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
                        $dataStartRow = $yellowRow; // Data starts at the first yellow row after header
                        break;
                    }
                }
            }

            if ($dataStartRow === null && $headerLastRow > 0) {
                $dataStartRow = $headerLastRow + 1;
            }

            \Log::info("PARSING_END: Selesai parsing sheet '{$sheetName}'.", [
                'blue_cells' => count($coloredCells),
                'yellow_cells' => count($yellowCells),
                'green_cells' => count($greenCells),
                'info_sections' => count($infoSections),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Berhasil mendapatkan struktur tabel' . ($hasMultipleTables ? " (Dynamic multi-table detection)" : ""),
                'spreadsheet_id' => $this->spreadsheetId,
                'sheet_name' => $sheetName,
                'table_ref' => $tableRef,
                'has_multiple_tables' => $hasMultipleTables,
                'dynamic_detection' => true,
                'special_case_info' => $specialCaseInfo,
                'is_special_table' => $isSpecialTable,
                'target_color' => '#8db3e1',
                'colored_cells' => $coloredCells,
                'yellow_cells' => $yellowCells,
                'yellow_cells_count' => count($yellowCells),
                'yellow_rows_found' => $yellowRowsFound,
                'yellow_columns' => $yellowColumns,
                'yellow_columns_list' => array_keys($yellowColumns),
                'green_cells' => $greenCells,
                'green_cells_count' => count($greenCells),
                'green_columns' => $greenColumns,
                'green_columns_list' => array_keys($greenColumns),
                'first_yellow_row' => $firstYellowRow,
                'header_last_row' => $headerLastRow,
                'data_start_row' => $dataStartRow,
                'restructured_data' => $restructuredData,
                'total_colored_cells_found' => count($coloredCells),
                'magenta_cells' => $magentaCells,
                'magenta_cells_count' => count($magentaCells),
                'info_sections' => $infoSections,
                'info_sections_count' => count($infoSections),
                'info_cells' => $infoCells,
                'info_cells_count' => count($infoCells),
                'orange_cells' => $orangeCells,
                'orange_cells_count' => count($orangeCells),
                'kondisi_sections' => $kondisiSections,
                'kondisi_sections_count' => count($kondisiSections),
                'kondisi_cells' => $kondisiCells,
                'kondisi_cells_count' => count($kondisiCells),
                'detected_strata' => $tableStrata,
                'strata_source' => 'daftar_tabel_only',
                'strata_info' => $this->strataMap[$tableRef] ?? null,
                'strata_detection_method' => 'daftar_tabel_only',
                'strict_color_validation' => [
                    'kondisi_requires_orange' => true,
                    'info_prefers_magenta' => true,
                    'blue_cells_excluded_from_info_kondisi' => true,
                    'orange_detection_methods' => ['color_variants', 'rgb_analysis', 'hsv_detection']
                ],
                'fillable_logic' => [
                    'yellow_cells' => 'fillable = true (can be filled)',
                    'green_cells' => 'fillable = false (cannot be filled)',
                    'other_colors' => 'fillable = false (default)',
                    'priority' => 'Green overrides yellow (green = non-fillable)'
                ],
                'debug_fallback_info' => [
                    'has_restructured_data' => !empty($restructuredData),
                    'has_colored_cells' => !empty($coloredCells),
                    'has_yellow_cells' => !empty($yellowCells),
                    'has_green_cells' => !empty($greenCells),
                    'has_magenta_cells' => !empty($magentaCells),
                    'has_orange_cells' => !empty($orangeCells),
                    'total_cells_analyzed' => count($coloredCells) + count($yellowCells) + count($greenCells) + count($magentaCells) + count($orangeCells),
                    'fallback_options_available' => [
                        'blue_cells' => count($coloredCells),
                        'yellow_cells' => count($yellowCells),
                        'green_cells' => count($greenCells),
                        'yellow_columns' => count(array_keys($yellowColumns)),
                        'green_columns' => count(array_keys($greenColumns)),
                        'any_colored_cells' => count($coloredCells) + count($yellowCells) + count($greenCells) + count($magentaCells) + count($orangeCells)
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error("PARSING_EXCEPTION: Terjadi exception saat parsing sheet '{$sheetName}'.", [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : 'Trace disabled'
            ], 500);
        }
    }

    private function isSpecialTable($tableRef)
    {
        return false;
    }

    private function findRedTextBoundaries($rowData, $program)
    {
        $searchTexts = $this->getProgramSearchTexts($program);
        if (empty($searchTexts))
            return null;

        $programIndicators = [];
        $potentialIndicators = []; // Untuk debugging

        $redColorThreshold = ['red' => 0.7, 'green' => 0.3, 'blue' => 0.3];

        foreach ($rowData as $rowIndex => $row) {
            if (!$row->getValues())
                continue;

            foreach ($row->getValues() as $colIndex => $cell) {
                if (!$cell)
                    continue;

                $effectiveFormat = $cell->getEffectiveFormat();
                if (!$effectiveFormat || !$effectiveFormat->getTextFormat())
                    continue;

                $textFormat = $effectiveFormat->getTextFormat();
                $foregroundColor = $textFormat->getForegroundColor();
                $isBold = $textFormat->getBold();
                $cellValue = $this->getCellValue($cell);

                // Lewati jika tidak ada teks
                if (!$cellValue || trim($cellValue) === '')
                    continue;

                $textColor = [
                    'red' => $foregroundColor ? ($foregroundColor->getRed() ?? 0) : 0,
                    'green' => $foregroundColor ? ($foregroundColor->getGreen() ?? 0) : 0,
                    'blue' => $foregroundColor ? ($foregroundColor->getBlue() ?? 0) : 0
                ];

                $isRedText = ($textColor['red'] >= $redColorThreshold['red'] && $textColor['green'] <= $redColorThreshold['green'] && $textColor['blue'] <= $redColorThreshold['blue']);

                // ✅ DEBUGGING: Catat semua teks tebal yang ditemukan
                if ($isBold) {
                    $potentialIndicators[] = "Row " . ($rowIndex + 1) . ": '" . $cellValue . "' (Bold)";
                }
                if ($isRedText) {
                    $potentialIndicators[] = "Row " . ($rowIndex + 1) . ": '" . $cellValue . "' (Red Text)";
                }

                if ($isRedText || $isBold) {
                    // Cek apakah teks ini cocok dengan salah satu program
                    foreach ($this->getProgramSearchTexts('D-IV') as $text) {
                        if ($this->matchesProgramText($cellValue, $text)) {
                            $programIndicators[] = ['row' => $rowIndex + 1, 'program' => 'D-IV', 'text' => $cellValue];
                            continue 2;
                        }
                    }
                    foreach ($this->getProgramSearchTexts('D-III') as $text) {
                        if ($this->matchesProgramText($cellValue, $text)) {
                            $programIndicators[] = ['row' => $rowIndex + 1, 'program' => 'D-III', 'text' => $cellValue];
                            continue 2;
                        }
                    }
                }
            }
        }

        if (empty($programIndicators)) {
            \Log::warning("BOUNDARY_SEARCH_DETAIL: Tidak ditemukan indikator program yang cocok.", [
                'potentials_found' => $potentialIndicators // Laporkan semua kandidat yang ditemukan
            ]);
            return null;
        }

        // --- Tahap 2: Temukan batas untuk program yang diminta ---
        $targetIndicator = null;
        foreach ($programIndicators as $indicator) {
            if ($indicator['program'] === $program) {
                $targetIndicator = $indicator;
                break;
            }
        }

        if ($targetIndicator === null) {
            \Log::warning("BOUNDARY_SEARCH_DETAIL: Indikator program ditemukan, tapi tidak ada yang cocok untuk '{$program}'.", ['found' => $programIndicators]);
            return null;
        }

        $nextIndicatorRow = null;
        foreach ($programIndicators as $indicator) {
            if ($indicator['row'] > $targetIndicator['row']) {
                $nextIndicatorRow = $indicator['row'];
                break;
            }
        }

        return [
            'search_text' => $targetIndicator['text'],
            'target_row' => $targetIndicator['row'],
            'detection_start' => $targetIndicator['row'], // Mulai dari baris indikator itu sendiri
            'detection_end' => $nextIndicatorRow ? $nextIndicatorRow - 1 : null,
            'all_indicators_found' => $programIndicators,
            'program' => $program,
            'boundary_logic' => 'dynamic_red_or_bold_text_detection'
        ];
    }

    private function matchesProgramText($cellText, $searchText)
    {
        if (!$cellText || !$searchText) {
            return false;
        }

        // Normalisasi teks: lowercase, trim spasi berlebih
        $cellText = strtolower(trim(preg_replace('/\s+/', ' ', $cellText)));
        $searchText = strtolower(trim($searchText));

        // Cek apakah searchText terkandung di dalam cellText
        if (str_contains($cellText, $searchText)) {
            return true;
        }

        return false;
    }

    private function getProgramSearchTexts($program)
    {
        $programTexts = [
            'D-III' => [
                'Diploma Tiga',
                'Program Diploma Tiga',
                'Program Studi pada Program Diploma Tiga',
                'D-III',
                'DIII',
                'D3'
            ],
            'D-IV' => [
                'Sarjana Terapan',
                'Program Sarjana Terapan',
                'Program Studi pada Program Sarjana Terapan',
                'Diploma Empat',
                'D-IV',
                'DIV',
                'D4'
            ]
        ];

        return $programTexts[strtoupper($program)] ?? [];
    }

    private function processKondisiSections($kondisiSections, $rowData)
    {
        foreach ($kondisiSections as &$section) {
            $kondisiRow = $section['kondisi_row'];
            // Asumsi baseColumnIndex adalah kolom pertama dari section KONDISI, yaitu kolom BUTIR
            $baseColumnIndex = $this->columnLetterToIndex($section['kondisi_column']) - 1;

            \Log::info("🔍 Processing KONDISI section with STABLE adaptive logic", [
                'kondisi_header_cell' => $section['kondisi_column'] . $kondisiRow,
                'base_column_index' => $baseColumnIndex,
            ]);

            $dataBelow = [];
            $lastButirValue = null;

            for ($rowIndex = $kondisiRow; $rowIndex < min($kondisiRow + 20, count($rowData)); $rowIndex++) {
                if (!isset($rowData[$rowIndex]) || !$rowData[$rowIndex]->getValues())
                    continue;

                $row = $rowData[$rowIndex];
                $values = $row->getValues();
                $currentRowNum = $rowIndex + 1;

                // Selalu baca butir dari kolom pertama (base)
                $currentButirValue = $lastButirValue;
                if (isset($values[$baseColumnIndex])) {
                    $butirValue = $this->getCellValue($values[$baseColumnIndex]);
                    if (is_numeric($butirValue)) {
                        $currentButirValue = (int) $butirValue;
                        $lastButirValue = $currentButirValue;
                    }
                }

                // ================== LOGIKA ADAPTIF BARU (STABIL) ==================

                // Baca nilai dari 3 kolom potensial di sebelah butir
                $col2_val = isset($values[$baseColumnIndex + 1]) ? trim((string) $this->getCellValue($values[$baseColumnIndex + 1])) : '';
                $col3_val = isset($values[$baseColumnIndex + 2]) ? trim((string) $this->getCellValue($values[$baseColumnIndex + 2])) : '';
                $col4_val = isset($values[$baseColumnIndex + 3]) ? trim((string) $this->getCellValue($values[$baseColumnIndex + 3])) : '';

                $subText = null;
                $kondisiText = null;
                $formulaText = '0';

                // Cek apakah ini layout 4 kolom (kolom ke-3, yaitu $col3_val, berisi teks kondisi yang panjang)
                // Layout 4-kolom: butir | sub | kondisi | formula
                // Kita anggap jika kolom ke-3 punya isi, ini adalah layout 4 kolom
                if (!empty($col3_val)) {
                    $subText = $col2_val;
                    $kondisiText = $col3_val;
                    if (isset($values[$baseColumnIndex + 3])) {
                        $formula = $this->getCellFormula($values[$baseColumnIndex + 3]);
                        $formulaText = $formula ?: $col4_val ?: '0';
                    }
                }
                // Jika tidak, ini pasti layout 3 kolom
                // Layout 3-kolom: butir | kondisi | formula
                elseif (!empty($col2_val)) {
                    $subText = null; // Tidak ada sub
                    $kondisiText = $col2_val;
                    if (isset($values[$baseColumnIndex + 2])) {
                        $formula = $this->getCellFormula($values[$baseColumnIndex + 2]);
                        $formulaText = $formula ?: $col3_val ?: '0';
                    }
                }

                // =====================================================================

                // Jika setelah semua logika, tidak ada teks kondisi, lewati baris ini.
                if (empty($kondisiText)) {
                    \Log::info("⚠️ Skipping row - No valid KONDISI text found.", ['row' => $currentRowNum]);
                    continue;
                }

                $dataItem = [
                    'butir' => $currentButirValue,
                    'sub' => !empty($subText) ? $subText : null,
                    'kondisi' => $kondisiText,
                    'formula' => $formulaText,
                ];

                $dataBelow[] = $dataItem;
            }

            $section['data_below'] = $dataBelow;
            $section['data_count'] = count($dataBelow);
        }

        return $kondisiSections;
    }

    public function updateDataIndicesWithParent(Request $request)
    {
        try {
            $tableId = $request->input('table_id', null);

            if ($tableId) {
                $records = LkpsColumn::where('lkpsTableId', (string) $tableId)->get();
            } else {
                $records = LkpsColumn::all();
            }

            $recordsById = [];
            foreach ($records as $record) {
                $idString = (string) $record->_id;
                $recordsById[$idString] = $record;
            }

            $updatedRecords = [];

            foreach ($records as $record) {
                if (!empty($record->parentId)) {
                    $parentId = null;
                    if (is_object($record->parentId) && property_exists($record->parentId, '$oid')) {
                        $parentId = $record->parentId->{'$oid'};
                    } elseif (is_string($record->parentId)) {
                        $parentId = $record->parentId;
                    } elseif (is_object($record->parentId) && method_exists($record->parentId, '__toString')) {
                        $parentId = (string) $record->parentId;
                    }

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
                        $parentDataIndex = $this->formatTitleForIndex($parent->judul);
                        $childDataIndex = $this->formatTitleForIndex($record->judul);

                        $newDataIndex = $parentDataIndex . '_' . $childDataIndex;

                        if ($record->indeksData !== $newDataIndex) {
                            $originalIndex = $record->indeksData;

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
        $formattedTitle = strtolower(trim($title));
        $formattedTitle = str_replace('/', '_', $formattedTitle);
        $formattedTitle = preg_replace('/[^a-z0-9_]/', '_', $formattedTitle);
        $formattedTitle = preg_replace('/_+/', '_', $formattedTitle);
        $formattedTitle = trim($formattedTitle, '_');

        return $formattedTitle;
    }

    public function debugKondisiColumns(Request $request)
    {
        try {
            $tableRef = $request->input('table_ref', '3a2');
            $maxRows = $request->input('max_rows', 20);

            if (!isset($this->sheetNamesMap[$tableRef])) {
                return response()->json(['error' => 'Table reference not found']);
            }

            $sheetName = $this->sheetNamesMap[$tableRef];
            $rangeToCheck = $sheetName . '!A1:Z' . $maxRows;

            $response = $this->service->spreadsheets->get($this->spreadsheetId, [
                'includeGridData' => true,
                'ranges' => $rangeToCheck
            ]);

            $sheets = $response->getSheets();
            if (!$sheets || empty($sheets[0]->getData())) {
                return response()->json(['error' => 'No data found']);
            }

            $data = $sheets[0]->getData()[0];
            $rowData = $data->getRowData();

            $kondisiSections = [];
            $allCells = [];

            foreach ($rowData as $rowIndex => $row) {
                if (!$row->getValues())
                    continue;

                $currentRow = $rowIndex + 1;

                foreach ($row->getValues() as $colIndex => $cell) {
                    if (!$cell)
                        continue;

                    $value = $this->getCellValue($cell);
                    $columnLetter = $this->columnIndexToLetter($colIndex + 1);

                    $allCells[] = [
                        'cell' => $columnLetter . $currentRow,
                        'row' => $currentRow,
                        'column' => $columnLetter,
                        'column_index' => $colIndex,
                        'value' => $value
                    ];

                    if ($value && strtoupper(trim($value)) === 'KONDISI') {
                        $kondisiSections[] = [
                            'kondisi_row' => $currentRow,
                            'kondisi_column' => $columnLetter,
                            'kondisi_cell' => $columnLetter . $currentRow,
                        ];
                    }
                }
            }

            $processedSections = [];
            foreach ($kondisiSections as $section) {
                $kondisiRow = $section['kondisi_row'];
                $kondisiColumnLetter = $section['kondisi_column'];
                $kondisiColumnIndex = $this->columnLetterToIndex($kondisiColumnLetter) - 1;

                $butirColumnIndex = $kondisiColumnIndex - 1;
                $formulaColumnIndex = $kondisiColumnIndex + 1;

                $columnAnalysis = [
                    'kondisi_info' => [
                        'row' => $kondisiRow,
                        'column' => $kondisiColumnLetter,
                        'column_index_0_based' => $kondisiColumnIndex,
                        'column_index_1_based' => $kondisiColumnIndex + 1
                    ],
                    'calculated_columns' => [
                        'butir' => [
                            'column_index_0_based' => $butirColumnIndex,
                            'column_letter' => $butirColumnIndex >= 0 ? $this->columnIndexToLetter($butirColumnIndex + 1) : 'none',
                            'position' => 'LEFT of KONDISI'
                        ],
                        'kondisi_data' => [
                            'column_index_0_based' => $kondisiColumnIndex,
                            'column_letter' => $this->columnIndexToLetter($kondisiColumnIndex + 1),
                            'position' => 'KONDISI column (middle)'
                        ],
                        'formula' => [
                            'column_index_0_based' => $formulaColumnIndex,
                            'column_letter' => $this->columnIndexToLetter($formulaColumnIndex + 1),
                            'position' => 'RIGHT of KONDISI'
                        ]
                    ],
                    'data_rows' => []
                ];

                for ($rowIndex = $kondisiRow; $rowIndex < min($kondisiRow + 5, count($rowData)); $rowIndex++) {
                    if (!isset($rowData[$rowIndex]) || !$rowData[$rowIndex]->getValues()) {
                        continue;
                    }

                    $row = $rowData[$rowIndex];
                    $values = $row->getValues();
                    $currentRowNum = $rowIndex + 1;

                    $rowAnalysis = [
                        'row' => $currentRowNum,
                        'total_columns' => count($values),
                        'butir_data' => [
                            'column_index' => $butirColumnIndex,
                            'column_letter' => $butirColumnIndex >= 0 ? $this->columnIndexToLetter($butirColumnIndex + 1) : 'none',
                            'cell_exists' => $butirColumnIndex >= 0 && isset($values[$butirColumnIndex]),
                            'raw_value' => $butirColumnIndex >= 0 && isset($values[$butirColumnIndex]) ?
                                $this->getCellValue($values[$butirColumnIndex]) : null,
                            'is_numeric' => $butirColumnIndex >= 0 && isset($values[$butirColumnIndex]) ?
                                is_numeric($this->getCellValue($values[$butirColumnIndex])) : false
                        ],
                        'kondisi_data' => [
                            'column_index' => $kondisiColumnIndex,
                            'column_letter' => $this->columnIndexToLetter($kondisiColumnIndex + 1),
                            'cell_exists' => isset($values[$kondisiColumnIndex]),
                            'raw_value' => isset($values[$kondisiColumnIndex]) ?
                                $this->getCellValue($values[$kondisiColumnIndex]) : null,
                            'is_kondisi_header' => isset($values[$kondisiColumnIndex]) ?
                                strtoupper(trim($this->getCellValue($values[$kondisiColumnIndex]) ?? '')) === 'KONDISI' : false
                        ],
                        'formula_data' => [
                            'column_index' => $formulaColumnIndex,
                            'column_letter' => $this->columnIndexToLetter($formulaColumnIndex + 1),
                            'cell_exists' => isset($values[$formulaColumnIndex]),
                            'raw_value' => isset($values[$formulaColumnIndex]) ?
                                $this->getCellValue($values[$formulaColumnIndex]) : null
                        ]
                    ];

                    $columnAnalysis['data_rows'][] = $rowAnalysis;
                }

                $processedSections[] = $columnAnalysis;
            }

            return response()->json([
                'debug_info' => [
                    'table_ref' => $tableRef,
                    'sheet_name' => $sheetName,
                    'range_checked' => $rangeToCheck,
                    'kondisi_sections_found' => count($kondisiSections)
                ],
                'kondisi_sections' => $kondisiSections,
                'detailed_analysis' => $processedSections,
                'all_cells_sample' => array_slice($allCells, 0, 20),
                'expected_structure' => [
                    'if_kondisi_at_S9' => [
                        'butir_column' => 'R (left of S)',
                        'kondisi_column' => 'S (contains "RDPU > 10", etc.)',
                        'formula_column' => 'T (right of S, contains "0", etc.)'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
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

    private function hasMultipleTablesInSheet($rowData)
    {
        $redTextCount = 0;
        $programIndicators = ['diploma', 'sarjana', 'program studi'];

        foreach ($rowData as $rowIndex => $row) {
            if (!$row->getValues()) {
                continue;
            }

            foreach ($row->getValues() as $colIndex => $cell) {
                if (!$cell) {
                    continue;
                }

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

                $isRedText = (
                    $textColor['red'] >= 0.7 &&
                    $textColor['green'] <= 0.3 &&
                    $textColor['blue'] <= 0.3
                );

                if ($isRedText) {
                    $cellValue = strtolower($this->getCellValue($cell) ?? '');

                    foreach ($programIndicators as $indicator) {
                        if (stripos($cellValue, $indicator) !== false) {
                            $redTextCount++;
                            break;
                        }
                    }
                }
            }
        }

        return $redTextCount > 1; // More than 1 program indicator = multiple tables
    }

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

    private function processInfoSections($infoSections, $rowData)
    {
        foreach ($infoSections as &$section) {
            $infoRow = $section['info_row'];
            $infoColumnLetter = $section['info_column'];
            $infoColumnIndex = $this->columnLetterToIndex($infoColumnLetter) - 1;

            $dataBelow = [];

            // ✅ 2-column layout: VARIABEL | FORMULA (skip kondisi column)
            $variabelColumnIndex = $infoColumnIndex;      // P (same as INFO header)
            $formulaColumnIndex = $infoColumnIndex + 1;   // Q (next column - formula, skip kondisi)

            $variabelColumnLetter = $this->columnIndexToLetter($variabelColumnIndex + 1);
            $formulaColumnLetter = $this->columnIndexToLetter($formulaColumnIndex + 1);

            // Look for data in rows below the INFO cell
            for ($rowIndex = $infoRow; $rowIndex < min($infoRow + 20, count($rowData)); $rowIndex++) {
                if (!isset($rowData[$rowIndex]) || !$rowData[$rowIndex]->getValues()) {
                    continue;
                }

                $row = $rowData[$rowIndex];
                $values = $row->getValues();
                $currentRowNum = $rowIndex + 1;

                // ✅ Get variabel from column P (same as INFO)
                $variabelText = null;
                if (isset($values[$variabelColumnIndex])) {
                    $variabelCell = $values[$variabelColumnIndex];
                    $variabelValue = $this->getCellValue($variabelCell);

                    // Skip header atau empty cells
                    if (!$variabelValue || trim($variabelValue) === '' || strtoupper(trim($variabelValue)) === 'INFO') {
                        continue;
                    }

                    $variabelText = trim($variabelValue);
                } else {
                    continue;
                }

                // ✅ UPDATED: Get formula from column Q (skip kondisi column)
                $formulaText = '0';
                if (isset($values[$formulaColumnIndex])) {
                    $formulaCell = $values[$formulaColumnIndex];
                    $formulaCellValue = $this->getCellValue($formulaCell);

                    // ✅ PRIORITAS: Coba ambil formula Excel dulu
                    $actualFormula = $this->getCellFormula($formulaCell);

                    if ($actualFormula && trim($actualFormula) !== '') {
                        // Ada formula Excel yang sebenarnya
                        $formulaText = trim($actualFormula);
                    } elseif (
                        $formulaCellValue &&
                        trim($formulaCellValue) !== '' &&
                        strpos($formulaCellValue, '#') !== 0
                    ) {
                        // Jika tidak ada formula tapi ada value yang bukan error
                        $formulaText = trim($formulaCellValue);
                    } else {
                        // Default atau error value
                        $formulaText = '0';
                    }
                }

                if (!$variabelText) {
                    continue;
                }

                // ✅ Build data item dengan 2-column structure (no kondisi field)
                $dataItem = [
                    'row' => $currentRowNum,
                    'variabel' => $variabelText,
                    'formula' => $formulaText,
                    'type' => 'variabel_data'
                ];

                $dataBelow[] = $dataItem;
            }

            $section['data_below'] = $dataBelow;
            $section['data_count'] = count($dataBelow);
            $section['column_structure'] = [
                'variabel_column' => $variabelColumnLetter,
                'formula_column' => $formulaColumnLetter,
                'two_column_structure' => true
            ];
        }

        return $infoSections;
    }

    private function getCellFormula($cell)
    {
        try {
            if ($cell->getUserEnteredValue()) {
                $userValue = $cell->getUserEnteredValue();

                if ($userValue->getFormulaValue()) {
                    return $userValue->getFormulaValue();
                }
            }

            $formattedValue = $cell->getFormattedValue();
            if ($formattedValue && strpos($formattedValue, '=') === 0) {
                return $formattedValue;
            }

            return null;

        } catch (\Exception $e) {
            return null;
        }
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

    public function debugMagentaDetection(Request $request)
    {
        try {
            $tableRef = $request->input('table_ref', '1-1');
            $sheetName = $this->sheetNamesMap[$tableRef] ?? $tableRef;
            $maxRows = $request->input('max_rows', 50);
            $showAllColored = $request->input('show_all_colored', false);

            $rangeToCheck = $sheetName . '!A1:Z' . $maxRows;
            $response = $this->service->spreadsheets->get($this->spreadsheetId, [
                'includeGridData' => true,
                'ranges' => $rangeToCheck
            ]);

            $sheets = $response->getSheets();
            if (!$sheets || empty($sheets[0]->getData())) {
                return response()->json(['error' => 'No data found']);
            }

            $data = $sheets[0]->getData()[0];
            $rowData = $data->getRowData();

            $magentaCells = [];
            $infoCells = [];
            $orangeCells = [];
            $kondisiCells = [];
            $allColoredCells = [];
            $colorDistribution = [];

            $magentaColorTolerance = 0.05;
            $orangeColorTolerance = 0.1;

            $isSimilarColor = function ($color1, $color2, $tolerance) {
                if (!isset($color1['red']) || !isset($color2['red'])) {
                    \Log::info("debugMagentaDetection - isSimilarColor - Missing color components", ['color1' => $color1, 'color2' => $color2]);
                    return false;
                }

                $differences = [];
                $isMatch = true;

                foreach (['red', 'green', 'blue'] as $component) {
                    $val1 = $color1[$component] ?? 0;
                    $val2 = $color2[$component] ?? 0;
                    $diff = abs($val1 - $val2);
                    $differences[$component] = $diff;

                    if ($diff > $tolerance) {
                        $isMatch = false;
                    }
                }

                if ($color1['red'] > 0.9 && $color1['blue'] > 0.9 && $color1['green'] < 0.1) {
                    \Log::info("debugMagentaDetection - Magenta color comparison", ['color1' => $color1, 'color2' => $color2, 'target_magenta' => $this->magentaColorRGB, 'tolerance' => $tolerance, 'differences' => $differences, 'is_match' => $isMatch]);
                }

                if ($color1['red'] > 0.8 && $color1['green'] > 0.4 && $color1['green'] < 0.8 && $color1['blue'] < 0.2) {
                    \Log::info("debugMagentaDetection - Orange color comparison", ['color1' => $color1, 'color2_orange1' => $this->orangeColorRGB, 'color2_orange2' => $this->orangeColorRGB2, 'tolerance' => $tolerance, 'differences' => $differences, 'is_match' => $isMatch]);
                }

                return $isMatch;
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
                if (!$row->getValues())
                    continue;

                $currentRow = $rowIndex + 1;

                foreach ($row->getValues() as $colIndex => $cell) {
                    if (!$cell)
                        continue;

                    $effectiveFormat = $cell->getEffectiveFormat();
                    if (!$effectiveFormat)
                        continue;

                    $backgroundColor = $effectiveFormat->getBackgroundColor();
                    if (!$backgroundColor)
                        continue;

                    $cellColor = [
                        'red' => $backgroundColor->getRed() ?? 0,
                        'green' => $backgroundColor->getGreen() ?? 0,
                        'blue' => $backgroundColor->getBlue() ?? 0
                    ];

                    $value = $this->getCellValue($cell);
                    $columnLetter = $this->columnIndexToLetter($colIndex + 1);
                    $colorHex = $toHex($cellColor);

                    if (!isset($colorDistribution[$colorHex])) {
                        $colorDistribution[$colorHex] = [
                            'count' => 0,
                            'color_rgb' => $cellColor,
                            'sample_cells' => []
                        ];
                    }
                    $colorDistribution[$colorHex]['count']++;

                    if (count($colorDistribution[$colorHex]['sample_cells']) < 3) {
                        $colorDistribution[$colorHex]['sample_cells'][] = [
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value
                        ];
                    }

                    $isMagentaColor = $isSimilarColor($cellColor, $this->magentaColorRGB, $magentaColorTolerance);

                    if ($isMagentaColor) {
                        \Log::info("debugMagentaDetection - ✅ MAGENTA DETECTED", ['cell' => $columnLetter . $currentRow, 'value' => $value, 'color' => $colorHex, 'color_rgb' => $cellColor, 'target_rgb' => $this->magentaColorRGB]);

                        $magentaCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $colorHex,
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'color_match'
                        ];
                    }

                    $isOrangeColor1 = $isSimilarColor($cellColor, $this->orangeColorRGB, $orangeColorTolerance);
                    $isOrangeColor2 = $isSimilarColor($cellColor, $this->orangeColorRGB2, $orangeColorTolerance);
                    $isOrangeColor = $isOrangeColor1 || $isOrangeColor2;

                    if ($isOrangeColor) {
                        \Log::info("debugMagentaDetection - ✅ ORANGE DETECTED", ['cell' => $columnLetter . $currentRow, 'value' => $value, 'color' => $colorHex, 'color_rgb' => $cellColor, 'target_rgb1' => $this->orangeColorRGB, 'target_rgb2' => $this->orangeColorRGB2]);

                        $orangeCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $colorHex,
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'color_match'
                        ];
                    }

                    if ($value && strtoupper(trim($value)) === 'INFO') {
                        $infoCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $colorHex,
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'text_only'
                        ];

                        if (!$isMagentaColor) {
                            \Log::info("debugMagentaDetection - Force adding INFO cell to magenta cells (text detection)", ['cell' => $columnLetter . $currentRow, 'value' => $value, 'color' => $colorHex]);

                            $magentaCells[] = [
                                'row' => $currentRow,
                                'column' => $columnLetter,
                                'cell' => $columnLetter . $currentRow,
                                'value' => $value,
                                'color' => $colorHex,
                                'rgb_actual' => $cellColor,
                                'detection_method' => 'text_fallback'
                            ];
                        }
                    }

                    if ($value && strtoupper(trim($value)) === 'KONDISI') {
                        $kondisiCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color' => $colorHex,
                            'rgb_actual' => $cellColor,
                            'detection_method' => 'text_only'
                        ];

                        if (!$isOrangeColor) {
                            \Log::info("debugMagentaDetection - Force adding KONDISI cell to orange cells (text detection)", ['cell' => $columnLetter . $currentRow, 'value' => $value, 'color' => $colorHex]);

                            $orangeCells[] = [
                                'row' => $currentRow,
                                'column' => $columnLetter,
                                'cell' => $columnLetter . $currentRow,
                                'value' => $value,
                                'color' => $colorHex,
                                'rgb_actual' => $cellColor,
                                'detection_method' => 'text_fallback'
                            ];
                        }
                    }

                    if ($cellColor['red'] < 0.95 || $cellColor['green'] < 0.95 || $cellColor['blue'] < 0.95) {
                        $allColoredCells[] = [
                            'row' => $currentRow,
                            'column' => $columnLetter,
                            'cell' => $columnLetter . $currentRow,
                            'value' => $value,
                            'color_hex' => $colorHex,
                            'color_rgb' => $cellColor,
                            'is_magenta' => $isMagentaColor,
                            'is_orange' => $isOrangeColor,
                            'is_info_text' => ($value && strtoupper(trim($value)) === 'INFO'),
                            'is_kondisi_text' => ($value && strtoupper(trim($value)) === 'KONDISI')
                        ];
                    }
                }
            }

            uasort($colorDistribution, function ($a, $b) {
                return $b['count'] - $a['count'];
            });

            $potentialMagentaColors = [];
            $potentialOrangeColors = [];

            foreach ($colorDistribution as $hex => $colorInfo) {
                $rgb = $colorInfo['color_rgb'];

                if ($rgb['red'] > 0.5 && $rgb['blue'] > 0.5 && $rgb['green'] < $rgb['red'] && $rgb['green'] < $rgb['blue']) {
                    $potentialMagentaColors[$hex] = $colorInfo;
                }

                if ($rgb['red'] > 0.7 && $rgb['green'] > 0.3 && $rgb['green'] < 0.8 && $rgb['blue'] < 0.3) {
                    $potentialOrangeColors[$hex] = $colorInfo;
                }
            }

            return response()->json([
                'sheet_name' => $sheetName,
                'table_ref' => $tableRef,
                'rows_scanned' => count($rowData),
                'target_magenta_color' => $this->magentaColorRGB,
                'target_magenta_hex' => $toHex($this->magentaColorRGB),
                'target_orange_color1' => $this->orangeColorRGB,
                'target_orange_color2' => $this->orangeColorRGB2,
                'target_orange_hex1' => $toHex($this->orangeColorRGB),
                'target_orange_hex2' => $toHex($this->orangeColorRGB2),
                'tolerance' => $magentaColorTolerance,
                'total_colored_cells' => count($allColoredCells),
                'unique_colors_found' => count($colorDistribution),
                'color_distribution' => array_slice($colorDistribution, 0, 10),
                'potential_magenta_colors' => $potentialMagentaColors,
                'potential_orange_colors' => $potentialOrangeColors,
                'magenta_cells_count' => count($magentaCells),
                'magenta_cells' => $magentaCells,
                'info_cells_count' => count($infoCells),
                'info_cells' => $infoCells,
                'orange_cells_count' => count($orangeCells),
                'orange_cells' => $orangeCells,
                'kondisi_cells_count' => count($kondisiCells),
                'kondisi_cells' => $kondisiCells,
                'all_colored_cells' => $showAllColored ? $allColoredCells : array_slice($allColoredCells, 0, 50),
                'debug_notes' => [
                    'target_magenta_color' => $toHex($this->magentaColorRGB) . ' (magenta)',
                    'target_orange_colors' => $toHex($this->orangeColorRGB) . ' and ' . $toHex($this->orangeColorRGB2) . ' (orange variants)',
                    'tolerance_used' => $magentaColorTolerance,
                    'looking_for' => 'Cells with exact text "INFO" in magenta color and "KONDISI" in orange color',
                    'rows_scanned' => "Scanned rows 1-{$maxRows}",
                    'potential_magenta_found' => count($potentialMagentaColors) . ' colors with magenta characteristics',
                    'potential_orange_found' => count($potentialOrangeColors) . ' colors with orange characteristics',
                    'exact_magenta_match_found' => array_key_exists('#ff00ff', $colorDistribution) ? 'YES' : 'NO',
                    'exact_orange_match_found' => (array_key_exists('#ff9900', $colorDistribution) || array_key_exists('#f69804', $colorDistribution)) ? 'YES' : 'NO',
                    'detection_logic' => 'Using SAME logic as getColoredCellsBySheetName for both INFO and KONDISI detection'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

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
        if (empty($coloredCells)) {
            return [];
        }

        // Kelompokkan semua sel berdasarkan nomor baris
        $cellsByRow = [];
        foreach ($coloredCells as $cell) {
            $cellsByRow[$cell['row']][] = $cell;
        }
        ksort($cellsByRow);

        // --- LOGIKA BARU: DETEKSI DAN PEMISAHAN TABEL ---
        $tables = [];
        $currentTableRows = [];
        $lastRow = -1;

        foreach ($cellsByRow as $rowNum => $cells) {
            // Jika nomor baris saat ini tidak berurutan (ada lompatan, misal dari 32 ke 45),
            // anggap itu sebagai tabel baru.
            if ($lastRow !== -1 && $rowNum > $lastRow + 2) { // Toleransi 2 baris kosong
                if (!empty($currentTableRows)) {
                    $tables[] = $currentTableRows; // Simpan tabel sebelumnya
                }
                $currentTableRows = []; // Mulai tabel baru
            }
            $currentTableRows[$rowNum] = $cells;
            $lastRow = $rowNum;
        }
        // Simpan tabel terakhir yang sedang diproses
        if (!empty($currentTableRows)) {
            $tables[] = $currentTableRows;
        }
        // -----------------------------------------------

        $result = [];
        // Pilih hanya tabel pertama yang ditemukan dalam rentang yang valid.
        // Ini adalah asumsi paling aman untuk sheet multi-tabel: kita hanya ingin satu tabel.
        $targetTableRows = $tables[0] ?? [];

        if (empty($targetTableRows)) {
            return [];
        }

        // Proses hanya tabel yang relevan (tabel pertama)
        $rowNumbers = array_keys($targetTableRows);
        $hierarchyDepth = count($rowNumbers);

        $headerRows = [];
        for ($i = 0; $i < $hierarchyDepth; $i++) {
            $headerRows[$i] = [
                'row_num' => $rowNumbers[$i],
                'cells' => $targetTableRows[$rowNumbers[$i]]
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

        if ($hierarchyDepth > 1) {
            $this->processMultiheaderColumns($tableResult, $headerRows, $mainHeaderCells);
        }

        $this->cleanupHeaderStructure($tableResult);

        // Sekarang, $result hanya akan berisi satu struktur tabel yang bersih
        $result[] = [
            'header_row' => $hierarchyDepth >= 1 ? $headerRows[0]['row_num'] : 0,
            'subheader_row' => $hierarchyDepth >= 2 ? $headerRows[1]['row_num'] : 0,
            'sub_subheader_row' => $hierarchyDepth >= 3 ? $headerRows[2]['row_num'] : 0,
            'columns' => array_values($tableResult)
        ];

        return $result;
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