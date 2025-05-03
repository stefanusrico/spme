<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Models\Lkps\Lkps;
use App\Models\Lkps\LkpsSection;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsData;
use App\Models\Prodi\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LkpsDataController extends Controller
{
    /**
     * Get data for all sections in an LKPS
     * 
     * @param string $lkpsId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllData($lkpsId)
    {
        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has access to this LKPS
        $user = Auth::user();
        if (!$user->hasRole('Admin') && $lkps->prodiId != $user->prodiId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get all sections
        $sections = LkpsSection::orderBy('order')->get();

        $result = [
            'lkpsId' => $lkpsId,
            'lkpsInfo' => [
                'prodiId' => $lkps->prodiId,
                'periode' => $lkps->periode,
                'tahunAkademik' => $lkps->tahunAkademik,
                'status' => $lkps->status,
                'tanggalPembuatan' => $lkps->tanggalPembuatan,
                'lastUpdated' => $lkps->lastUpdated
            ],
            'sections' => []
        ];

        foreach ($sections as $section) {
            $sectionData = [
                'section_code' => $section->code,
                'title' => $section->title,
                'subtitle' => $section->subtitle,
                'tables' => [],
                'score' => null
            ];

            // Get tables for this section
            $tables = LkpsTable::where('section_code', $section->code)->get();

            foreach ($tables as $table) {
                $data = LkpsData::getData($lkpsId, $section->code, $table->code);
                $sectionData['tables'][$table->code] = $data ?? [];
            }

            $sectionData['score'] = LkpsData::getScore($lkpsId, $section->code);

            $result['sections'][] = $sectionData;
        }

        return response()->json($result);
    }

    /**
     * Get data for a specific section and table
     * 
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableData($lkpsId, $sectionCode, $tableCode)
    {
        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has access to this LKPS
        $user = Auth::user();
        if (!$user->hasRole('Admin') && $lkps->prodiId != $user->prodiId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $data = LkpsData::getData($lkpsId, $sectionCode, $tableCode);

        return response()->json([
            'lkpsId' => $lkpsId,
            'section_code' => $sectionCode,
            'table_code' => $tableCode,
            'data' => $data ?? []
        ]);
    }

    /**
     * Save data for a specific section and table
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveTableData(Request $request, $lkpsId, $sectionCode, $tableCode)
    {
        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has access to this LKPS
        $user = Auth::user();
        if (!$user->hasRole('Admin') && $lkps->prodiId != $user->prodiId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow saving data to draft LKPS
        if ($lkps->status !== 'draft') {
            return response()->json(['message' => 'Cannot save data to a submitted LKPS'], 400);
        }

        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'data' => 'required|array',
            'score' => 'nullable|numeric'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->input('data');
        $score = $request->input('score');
        $scoreDetail = $request->input('scoreDetail');
        $userId = Auth::id();

        // If the table is used in formula, calculate the score
        if ($table->used_in_formula && $score === null) {
            $section = LkpsSection::where('code', $sectionCode)->first();

            if ($section && $section->has_formula) {
                $score = $section->calculateScore($data);
            }
        }

        LkpsData::saveData($lkpsId, $sectionCode, $tableCode, $data, $score, $scoreDetail, $userId);

        // Update the LKPS lastUpdated timestamp
        $lkps->lastUpdated = now();
        $lkps->updatedBy = $userId;
        $lkps->save();

        return response()->json([
            'message' => 'Data saved successfully',
            'score' => $score
        ]);
    }

    /**
     * Delete data for a specific section and table
     * 
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTableData($lkpsId, $sectionCode, $tableCode)
    {
        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has access to this LKPS
        $user = Auth::user();
        if (!$user->hasRole('Admin') && $lkps->prodiId != $user->prodiId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow deleting data from draft LKPS
        if ($lkps->status !== 'draft') {
            return response()->json(['message' => 'Cannot delete data from a submitted LKPS'], 400);
        }

        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $deleted = LkpsData::where('lkpsId', $lkpsId)
            ->where('section_code', $sectionCode)
            ->where('table_code', $tableCode)
            ->delete();

        if ($deleted) {
            // Update the LKPS lastUpdated timestamp
            $lkps->lastUpdated = now();
            $lkps->updatedBy = Auth::id();
            $lkps->save();

            return response()->json(['message' => 'Data deleted successfully']);
        }

        return response()->json(['message' => 'No data found to delete']);
    }

    /**
     * Export data as Excel
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $lkpsId
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function exportData(Request $request, $lkpsId, $sectionCode, $tableCode = null)
    {
        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has access to this LKPS
        $user = Auth::user();
        if (!$user->hasRole('Admin') && $lkps->prodiId != $user->prodiId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get the section
        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        // Initialize Excel
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

        if ($tableCode) {
            // Export a specific table
            $table = LkpsTable::where('section_code', $sectionCode)
                ->where('code', $tableCode)
                ->first();

            if (!$table) {
                return response()->json(['message' => 'Table not found'], 404);
            }

            $data = LkpsData::getData($lkpsId, $sectionCode, $tableCode);

            if (!$data) {
                return response()->json(['message' => 'No data found'], 404);
            }

            $this->createTableSheet($spreadsheet->getActiveSheet(), $table, $data);
        } else {
            // Export all tables in the section
            $tables = LkpsTable::where('section_code', $sectionCode)->get();

            $spreadsheet->removeSheetByIndex(0);

            foreach ($tables as $index => $table) {
                $data = LkpsData::getData($lkpsId, $sectionCode, $table->code);

                if (!$data) {
                    continue;
                }

                $sheet = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($spreadsheet, $table->title);
                $spreadsheet->addSheet($sheet);

                $this->createTableSheet($sheet, $table, $data);
            }

            if ($spreadsheet->getSheetCount() === 0) {
                return response()->json(['message' => 'No data found'], 404);
            }
        }

        // Generate filename
        $filename = "LKPS_Section_{$sectionCode}";
        if ($tableCode) {
            $filename .= "_{$tableCode}";
        }
        $filename .= '_' . date('Y-m-d') . '.xlsx';

        // Create Excel file
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'lkps_export');
        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Create a sheet for a table in the Excel export
     * 
     * @param \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet
     * @param \App\Models\LkpsTable $table
     * @param array $data
     */
    private function createTableSheet($sheet, $table, $data)
    {
        // Get columns for this table
        $columns = LkpsColumn::where('table_code', $table->code)->get();

        // Organize columns for export
        $headerColumns = [];
        $columnMap = [];

        foreach ($columns as $column) {
            if (!$column->parent_id) {
                if ($column->is_group) {
                    // Find children
                    $children = $columns->where('parent_id', $column->_id);

                    if ($children->count() > 0) {
                        $childHeaders = [];

                        foreach ($children as $child) {
                            $childHeaders[] = $child->title;
                            $columnMap[] = [
                                'data_index' => $child->data_index,
                                'type' => $child->type
                            ];
                        }

                        $headerColumns[] = [
                            'title' => $column->title,
                            'children' => $childHeaders,
                            'width' => count($childHeaders)
                        ];
                    }
                } else {
                    $headerColumns[] = [
                        'title' => $column->title,
                        'width' => 1
                    ];
                    $columnMap[] = [
                        'data_index' => $column->data_index,
                        'type' => $column->type
                    ];
                }
            }
        }

        // Set up header rows
        $hasGroupHeaders = false;
        foreach ($headerColumns as $column) {
            if (isset($column['children'])) {
                $hasGroupHeaders = true;
                break;
            }
        }

        $row = 1;
        $col = 1;

        // Add title
        $sheet->setCellValueByColumnAndRow(1, $row, $table->title);
        $sheet->mergeCellsByColumnAndRow(1, $row, count($columnMap), $row);
        $sheet->getStyleByColumnAndRow(1, $row, count($columnMap), $row)
            ->getFont()->setBold(true);
        $row++;

        if ($hasGroupHeaders) {
            // Add group headers
            foreach ($headerColumns as $column) {
                if (isset($column['children'])) {
                    $sheet->setCellValueByColumnAndRow($col, $row, $column['title']);
                    $sheet->mergeCellsByColumnAndRow($col, $row, $col + $column['width'] - 1, $row);
                    $col += $column['width'];
                } else {
                    $sheet->setCellValueByColumnAndRow($col, $row, $column['title']);
                    $sheet->mergeCellsByColumnAndRow($col, $row, $col, $row + 1);
                    $col++;
                }
            }
            $row++;

            // Add column headers
            $col = 1;
            foreach ($headerColumns as $column) {
                if (isset($column['children'])) {
                    foreach ($column['children'] as $childTitle) {
                        $sheet->setCellValueByColumnAndRow($col, $row, $childTitle);
                        $col++;
                    }
                } else {
                    $col++;
                }
            }
            $row++;
        } else {
            // Just add column headers
            foreach ($columnMap as $index => $column) {
                $sheet->setCellValueByColumnAndRow($index + 1, $row, $headerColumns[$index]['title']);
            }
            $row++;
        }

        // Add data rows
        foreach ($data as $rowData) {
            $col = 1;
            foreach ($columnMap as $column) {
                $value = $rowData[$column['data_index']] ?? '';

                // Format based on column type
                if ($column['type'] === 'boolean') {
                    $value = $value ? 'Ya' : 'Tidak';
                }

                $sheet->setCellValueByColumnAndRow($col, $row, $value);
                $col++;
            }
            $row++;
        }

        // Auto-size columns
        foreach (range(1, count($columnMap)) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
    }

    public function getScoreDetail(Request $request)
    {
        $validated = $request->validate([
            'prodiId' => 'required|string',
            'section_code' => 'required|string',
        ]);

        $prodiId = $validated['prodiId'];
        $sectionCode = $validated['section_code'];

        $prodi = Prodi::find($prodiId);

        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found for the given prodiId'], 404);
        }

        $lkps = $prodi->lkpsDocuments()
            ->where('isActive', true)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found for the given Prodi'], 404);
        }

        $pipeline = [
            [
                '$match' => [
                    'lkpsId' => $lkps->_id,
                    'section_code' => $sectionCode,
                ]
            ],
            [
                '$project' => [
                    'scoreDetail' => 1,
                ]
            ],
        ];

        Log::info('Pipeline: ', $pipeline);

        $result = LkpsData::raw(function ($collection) use ($pipeline) {
            return $collection->aggregate($pipeline);
        });

        $data = iterator_to_array($result);

        Log::info('Mongo Result: ', $data);

        if (empty($data)) {
            return response()->json(['message' => 'Score Detail not found'], 404);
        }

        return response()->json($data[0]['scoreDetail']);
    }
}