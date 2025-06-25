<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsData;
use App\Models\Lkps\LkpsColumn;
use App\Models\Prodi\Prodi;
use App\Models\Prodi\Strata;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\ExcelFormulaParser;
use Illuminate\Support\Facades\Validator;


class LkpsDataController extends Controller
{
    /**
     * Get data for all tables
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllData()
    {
        $tables = LkpsTable::orderBy('judul')->get();

        $result = [
            'tables' => []
        ];

        foreach ($tables as $table) {
            $data = LkpsData::where('kodeTabel', $table->kode)->first();

            $result['tables'][$table->kode] = [
                'tableInfo' => $table,
                'data' => $data ? $data->data : [],
                'nilai' => $data ? $data->nilai : null,
                'detailNilai' => $data ? $data->detailNilai : null
            ];
        }

        return response()->json($result);
    }

    /**
     * Get data for a specific table
     *
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableData(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $projectId = $request->input('projectId');

        $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();

        if (!$divStrata) {
            return response()->json(['message' => 'D-IV strata not found'], 404);
        }

        $table = LkpsTable::where('kode', $tableCode)
            ->where('strataId', $divStrata->_id)
            ->first();

        if (!$table) {
            return response()->json([
                'message' => 'Table not found for D-IV strata',
                'tableCode' => $tableCode,
                'strata' => 'D-IV'
            ], 404);
        }

        $project = \App\Models\Project\Project::find($projectId);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $taskId = null;
        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

        if (!$taskLists->isEmpty()) {
            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tableIdString = (string) $table->_id;

            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('lkpsTableId', $tableIdString)
                ->first();

            if ($task) {
                $taskId = $task->_id;
            }
        }

        if (!$taskId) {
            return response()->json([
                'message' => 'No task found for this D-IV table in the project',
                'tableCode' => $tableCode,
                'strata' => 'D-IV'
            ], 404);
        }

        $tableIdString = (string) $table->_id;
        $taskIdString = (string) $taskId;

        $lkpsData = LkpsData::where('lkpsTableId', $tableIdString)
            ->where('taskId', $taskIdString)
            ->first();

        if (!$lkpsData) {
            $allTaskDataCount = LkpsData::where('taskId', $taskIdString)->count();
            $allTableDataCount = LkpsData::where('lkpsTableId', $tableIdString)->count();
            Log::info("No LkpsData found for D-IV table {$tableCode} (ID: {$tableIdString}) and task {$taskIdString} in project {$projectId}. TaskDataCount: {$allTaskDataCount}, TableDataCount: {$allTableDataCount}");

            return response()->json([
                'message' => 'No data found for this D-IV table in the project',
                'tableCode' => $tableCode,
                'strata' => 'D-IV',
                'debug' => [
                    'tableId' => $tableIdString,
                    'taskId' => $taskIdString,
                    'taskDataCount' => $allTaskDataCount,
                    'tableDataCount' => $allTableDataCount
                ]
            ], 404);
        }

        return response()->json([
            'tableCode' => $tableCode,
            'strataId' => (string) $table->strataId,
            'strata' => 'D-IV',
            'taskId' => $taskIdString,
            'data' => $lkpsData->data ?? [],
            'nilai' => $lkpsData->nilai ?? [],
            'detailNilai' => $lkpsData->detailNilai ?? []
        ]);
    }

    /**
     * Save data for a specific table, with auto-calculation for formulas and scores.
     *
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveTableData(Request $request, $tableCode)
    {
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        $projectId = $request->input('projectId');
        $data = $request->input('data');
        $autoCalculateRumus = $request->input('auto_calculate_rumus', true);
        $autoCalculateSkor = $request->input('auto_calculate_skor', true);

        $quickValidation = $this->quickValidateTableAccess($tableCode, $projectId);
        if ($quickValidation['error']) {
            return response()->json($quickValidation['error'], $quickValidation['status']);
        }

        $table = $quickValidation['table'];

        $currentDataHash = md5(json_encode($data));
        $existingData = $quickValidation['lkpsData'] ?? null;

        if ($existingData && isset($existingData->dataHash) && $existingData->dataHash === $currentDataHash) {
            return response()->json([
                'message' => 'Data unchanged, skipping calculation',
                'cached_results' => true,
                'nilai' => $existingData->nilai,
                'detailNilai' => $existingData->detailNilai
            ]);
        }

        if ($autoCalculateRumus && $autoCalculateSkor) {
            return $this->calculateInParallel($table, $data, $projectId);
        }

        $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
        if (!$divStrata) {
            return response()->json(['message' => 'D-IV strata not found'], 404);
        }

        if (!isset($table)) {
            $table = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();
        }

        if (!$table) {
            return response()->json([
                'message' => 'Table not found for D-IV strata',
                'tableCode' => $tableCode,
                'strata' => 'D-IV'
            ], 404);
        }

        $validator = \Validator::make($request->all(), [
            'data' => 'required|array',
            'nilai' => 'nullable|array',
            'detailNilai' => 'nullable|array',
            'projectId' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $nilai = $request->input('nilai');
        $detailNilai = $request->input('detailNilai', []);
        $taskId = $request->input('taskId');

        $project = \App\Models\Project\Project::find($projectId);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        if ($project->status === 'INACTIVE') {
            return response()->json([
                'message' => 'Tidak dapat menyimpan data untuk project yang berstatus INACTIVE',
                'currentStatus' => $project->status
            ], 403);
        }

        if (!$taskId) {
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            if (!$taskLists->isEmpty()) {
                $taskListIds = $taskLists->pluck('_id')->toArray();
                $tableIdString = (string) $table->_id;

                $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                    ->where('lkpsTableId', $tableIdString)
                    ->first();

                if ($task) {
                    $taskId = $task->_id;
                }
            }
        }

        try {
            $lkpsData = LkpsData::updateOrCreate(
                [
                    'lkpsTableId' => (string) $table->_id,
                    'taskId' => (string) $taskId
                ],
                [
                    'kodeTabel' => $tableCode,
                    'data' => $data,
                    'nilai' => $nilai,
                    'detailNilai' => $detailNilai,
                    'dataHash' => $currentDataHash,
                ]
            );

            $rumusCalculated = false;
            $skorCalculated = false;
            $skorResults = [];
            $rumusResults = [];
            $debugInfo = [];

            $hasRumus = $table->hasRumus();
            $hasKondisi = $table->hasKondisi();

            $debugInfo['table_info'] = [
                'tableCode' => $tableCode,
                'has_rumus' => $hasRumus,
                'has_kondisi' => $hasKondisi,
                'rumus_count' => $hasRumus ? count($table->rumus) : 0,
                'kondisi_count' => $hasKondisi ? count($table->kondisi) : 0
            ];

            if ($autoCalculateRumus && $hasRumus) {
                try {
                    $calculationResults = $table->hitungRumus($data);
                    $rumusResults = $calculationResults ?? [];

                    $debugInfo['rumus_calculation'] = [
                        'attempted' => true,
                        'results_count' => count($calculationResults ?? []),
                        'variables' => array_keys($calculationResults ?? []),
                        'detailed_results' => $calculationResults ?? []
                    ];

                    if (!empty($calculationResults)) {
                        $currentDetailNilai = $lkpsData->detailNilai ?? [];
                        if (is_object($currentDetailNilai)) {
                            $currentDetailNilai = (array) $currentDetailNilai;
                        }

                        foreach ($calculationResults as $variabel => $result) {
                            $currentDetailNilai[$variabel] = $result['value'] ?? 0;
                        }

                        $lkpsData->detailNilai = $currentDetailNilai;
                        $lkpsData->save();
                        $rumusCalculated = true;
                    } else {
                        $debugInfo['rumus_calculation']['results_empty'] = true;
                    }
                } catch (\Exception $e) {
                    Log::error("Error auto-calculating rumus: {$e->getMessage()}", ['trace' => $e->getTraceAsString()]);
                    $debugInfo['rumus_error'] = $e->getMessage();
                    $debugInfo['rumus_calculation'] = ['attempted' => true, 'error' => $e->getMessage()];
                }
            } else {
                $debugInfo['rumus_calculation'] = ['attempted' => false, 'reason' => !$autoCalculateRumus ? 'auto_calculate_rumus=false' : 'no rumus available'];
            }

            if ($autoCalculateSkor && $hasKondisi) {
                try {
                    $skorResults = $table->hitungSkor($data);

                    $debugInfo['skor_calculation'] = [
                        'attempted' => true,
                        'kondisi_available' => $hasKondisi,
                        'skor_results_count' => count($skorResults ?? []),
                        'skor_results' => $skorResults
                    ];

                    if (!empty($skorResults)) {
                        $lkpsData->nilai = $skorResults;
                        $lkpsData->save();
                        $skorCalculated = true;
                    }
                } catch (\Exception $e) {
                    Log::error("Error auto-calculating skor: {$e->getMessage()}", [
                        'trace' => $e->getTraceAsString(),
                        'table_kondisi' => $table->kondisi ?? []
                    ]);
                    $debugInfo['skor_error'] = $e->getMessage();
                }
            } else {
                $debugInfo['skor_calculation'] = ['attempted' => false, 'reason' => !$autoCalculateSkor ? 'auto_calculate_skor=false' : 'no kondisi available'];
            }

            $task = null;
            if ($lkpsData->taskId) {
                $task = \App\Models\Project\Task::find($lkpsData->taskId);
                if ($task) {
                    $task->progress = 100;
                    $task->status = 'COMPLETED';
                    $task->save();
                    $this->updateProjectProgress($projectId);
                }
            }

            $lkpsData->refresh();

            return response()->json([
                'message' => 'Data saved successfully for D-IV table',
                'tableCode' => $tableCode,
                'strataId' => (string) $table->strataId,
                'strata' => 'D-IV',
                'nilai' => $lkpsData->nilai,
                'taskId' => $lkpsData->taskId,
                'taskName' => $task ? $task->nama : null,
                'taskProgress' => $task ? $task->progress : null,
                'taskStatus' => $task ? $task->status : null,
                'projectStatus' => $project->status,
                'auto_calculated_rumus' => $rumusCalculated,
                'auto_calculated_skor' => $skorCalculated,
                'has_rumus' => $hasRumus,
                'has_kondisi' => $hasKondisi,
                'rumus_count' => $hasRumus ? count($table->rumus) : 0,
                'kondisi_count' => $hasKondisi ? count($table->kondisi) : 0,
                'rumus_results' => $rumusResults,
                'skor_results' => $skorResults,
                'detail_nilai' => $lkpsData->detailNilai ?? [],
                'calculation_debug' => [
                    'input_data_count' => count($data),
                    'input_data_sample' => array_slice($data, 0, 2),
                    'input_data_columns' => !empty($data) ? array_keys($data[0] ?? []) : [],
                    'table_rumus_definitions' => $table->rumus ?? [],
                    'table_kondisi_definitions' => $table->kondisi ?? [],
                    'column_mapping' => $hasRumus ? $table->getColumnMapping() : null
                ],
                'debug_info' => $debugInfo
            ]);

        } catch (\Exception $e) {
            Log::error("Error saving D-IV LKPS data: {$e->getMessage()}", [
                'tableCode' => $tableCode,
                'projectId' => $projectId,
                'strataId' => (string) $table->strataId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['message' => 'Error saving data: ' . $e->getMessage()], 500);
        }
    }

    private function calculateInParallel($table, $data, $projectId)
    {
        try {
            $results = [];

            if ($table->hasRumus()) {
                $rumusResults = $table->hitungRumus($data);
                $results['rumus_results'] = $rumusResults;

                $currentDetailNilai = [];
                foreach ($rumusResults as $variabel => $result) {
                    $currentDetailNilai[$variabel] = $result['value'] ?? 0;
                }
                $results['detail_nilai'] = $currentDetailNilai;
            }

            if ($table->hasKondisi()) {
                $skorResults = $table->hitungSkor($data);
                $results['skor_results'] = $skorResults;
            }

            return response()->json([
                'message' => 'Data saved and calculated in parallel',
                'parallel_processing' => true,
                'results' => $results
            ]);

        } catch (\Exception $e) {
            Log::error("Error in parallel calculation: {$e->getMessage()}");
            return response()->json([
                'message' => 'Error in parallel calculation: ' . $e->getMessage()
            ], 500);
        }
    }


    private function quickValidateTableAccess($tableCode, $projectId)
    {
        static $strataCache = null;
        if (!$strataCache) {
            $strataCache = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
        }

        if (!$strataCache) {
            return ['error' => ['message' => 'D-IV strata not found'], 'status' => 404];
        }

        $table = LkpsTable::where('kode', $tableCode)
            ->where('strataId', $strataCache->_id)
            ->first();

        if (!$table) {
            return ['error' => ['message' => 'Table not found'], 'status' => 404];
        }

        $lkpsData = null;
        try {
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

            if (!$taskLists->isEmpty()) {
                $taskListIds = $taskLists->pluck('_id')->toArray();
                $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                    ->where('lkpsTableId', (string) $table->_id)
                    ->first();

                if ($task) {
                    $lkpsData = LkpsData::where('lkpsTableId', (string) $table->_id)
                        ->where('taskId', (string) $task->_id)
                        ->first();
                }
            }
        } catch (\Exception $e) {
            Log::warning("Error getting existing LkpsData: {$e->getMessage()}");
        }

        return [
            'table' => $table,
            'strata' => $strataCache,
            'lkpsData' => $lkpsData,
            'error' => null
        ];
    }

    /**
     * Update project progress based on task completion
     */
    private function updateProjectProgress($projectId)
    {
        try {
            $project = \App\Models\Project\Project::find($projectId);
            if (!$project) {
                Log::error("Project not found for progress update: {$projectId}");
                return 0;
            }

            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            if ($taskLists->isEmpty()) {
                return 0;
            }

            $taskListIds = $taskLists->pluck('_id')->toArray();
            $totalTasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->count();
            if ($totalTasks === 0) {
                return 0;
            }

            $completedTasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('status', 'COMPLETED')
                ->count();

            $progress = round(($completedTasks / $totalTasks) * 100, 2);

            \App\Models\Project\Project::where('_id', $projectId)
                ->update([
                    'progress' => $progress,
                    'status' => 'IN PROGRESS',
                    'updated_at' => now()
                ]);

            if ($completedTasks === $totalTasks) {
                \App\Models\Project\Project::where('_id', $projectId)
                    ->update([
                        'status' => 'COMPLETED',
                        'updated_at' => now()
                    ]);
            }

            return $progress;
        } catch (\Exception $e) {
            Log::error('Error updating project progress', [
                'projectId' => $projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 0;
        }
    }

    /**
     * Delete data for a specific table
     *
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTableData($tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();
        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $deleted = LkpsData::where('kodeTabel', $tableCode)->delete();
        if ($deleted) {
            return response()->json(['message' => 'Data deleted successfully']);
        }

        return response()->json(['message' => 'No data found to delete']);
    }

    /**
     * Export data as Excel
     *
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function exportData(Request $request, $tableCode = null)
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

        if ($tableCode) {
            $table = LkpsTable::where('kode', $tableCode)->first();
            if (!$table) {
                return response()->json(['message' => 'Table not found'], 404);
            }

            $data = LkpsData::where('kodeTabel', $tableCode)->first();
            if (!$data || empty($data->data)) {
                return response()->json(['message' => 'No data found'], 404);
            }

            $this->createTableSheet($spreadsheet->getActiveSheet(), $table, $data->data);
        } else {
            $tables = LkpsTable::all();
            $spreadsheet->removeSheetByIndex(0);

            foreach ($tables as $index => $table) {
                $data = LkpsData::where('kodeTabel', $table->kode)->first();
                if (!$data || empty($data->data)) {
                    continue;
                }

                $sheet = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($spreadsheet, $table->judul);
                $spreadsheet->addSheet($sheet);
                $this->createTableSheet($sheet, $table, $data->data);
            }

            if ($spreadsheet->getSheetCount() === 0) {
                return response()->json(['message' => 'No data found'], 404);
            }
        }

        $filename = "LKPS";
        if ($tableCode) {
            $filename .= "_{$tableCode}";
        }
        $filename .= '_' . date('Y-m-d') . '.xlsx';

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
     * @param \App\Models\Lkps\LkpsTable $table
     * @param array $data
     */
    private function createTableSheet($sheet, $table, $data)
    {
        $columns = LkpsColumn::where('kodeTabel', $table->kode)->get();
        $headerColumns = [];
        $columnMap = [];

        foreach ($columns as $column) {
            if (!$column->parentId) {
                if ($column->isGroup) {
                    $children = $columns->where('parentId', $column->_id);
                    if ($children->count() > 0) {
                        $childHeaders = [];
                        foreach ($children as $child) {
                            $childHeaders[] = $child->judul;
                            $columnMap[] = ['indeksData' => $child->indeksData, 'type' => $child->type];
                        }
                        $headerColumns[] = ['judul' => $column->judul, 'children' => $childHeaders, 'width' => count($childHeaders)];
                    }
                } else {
                    $headerColumns[] = ['judul' => $column->judul, 'width' => 1];
                    $columnMap[] = ['indeksData' => $column->indeksData, 'type' => $column->type];
                }
            }
        }

        $hasGroupHeaders = collect($headerColumns)->contains(fn($col) => isset($col['children']));
        $row = 1;

        $sheet->setCellValueByColumnAndRow(1, $row, $table->judul);
        $sheet->mergeCellsByColumnAndRow(1, $row, count($columnMap), $row);
        $sheet->getStyleByColumnAndRow(1, $row, count($columnMap), $row)->getFont()->setBold(true);
        $row++;

        if ($hasGroupHeaders) {
            $col = 1;
            foreach ($headerColumns as $column) {
                if (isset($column['children'])) {
                    $sheet->setCellValueByColumnAndRow($col, $row, $column['judul']);
                    $sheet->mergeCellsByColumnAndRow($col, $row, $col + $column['width'] - 1, $row);
                    $col += $column['width'];
                } else {
                    $sheet->setCellValueByColumnAndRow($col, $row, $column['judul']);
                    $sheet->mergeCellsByColumnAndRow($col, $row, $col, $row + 1);
                    $col++;
                }
            }
            $row++;
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
            foreach ($columnMap as $index => $column) {
                $sheet->setCellValueByColumnAndRow($index + 1, $row, $headerColumns[$index]['judul']);
            }
            $row++;
        }

        foreach ($data as $rowData) {
            $col = 1;
            foreach ($columnMap as $column) {
                $value = $rowData[$column['indeksData']] ?? '';
                if ($column['type'] === 'boolean') {
                    $value = $value ? 'Ya' : 'Tidak';
                }
                $sheet->setCellValueByColumnAndRow($col, $row, $value);
                $col++;
            }
            $row++;
        }

        foreach (range(1, count($columnMap)) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
    }

    public function getScoreDetail(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $projectId = $request->input('projectId');

        $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
        if (!$divStrata) {
            return response()->json(['message' => 'D-IV strata not found'], 404);
        }

        $table = LkpsTable::where('kode', $tableCode)
            ->where('strataId', $divStrata->_id)
            ->first();
        if (!$table) {
            return response()->json(['message' => 'Table not found for D-IV strata', 'tableCode' => $tableCode, 'strata' => 'D-IV'], 404);
        }

        $project = \App\Models\Project\Project::find($projectId);
        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        $taskId = null;
        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

        if (!$taskLists->isEmpty()) {
            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tableIdString = (string) $table->_id;
            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->where('lkpsTableId', $tableIdString)->first();
            if ($task) {
                $taskId = $task->_id;
            }
        }

        if (!$taskId) {
            return response()->json(['message' => 'No task found for this D-IV table in the project', 'tableCode' => $tableCode, 'strata' => 'D-IV'], 404);
        }

        $tableIdString = (string) $table->_id;
        $taskIdString = (string) $taskId;
        $lkpsData = LkpsData::where('lkpsTableId', $tableIdString)->where('taskId', $taskIdString)->first();
        if (!$lkpsData) {
            return response()->json(['message' => 'No score details found for this D-IV table in the project', 'tableCode' => $tableCode, 'strata' => 'D-IV'], 404);
        }

        return response()->json([
            'tableCode' => $tableCode,
            'taskId' => $taskIdString,
            'detailNilai' => $lkpsData->detailNilai ?? []
        ]);
    }

    /**
     * Calculate formulas and save the result to the LkpsData detailNilai field.
     */
    public function calculateRumus(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'tableCode' => 'required|string',
            'projectId' => 'required|string',
            'variabel' => 'nullable|string',
            'save_to_database' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $projectId = $request->input('projectId');
        $variabel = $request->input('variabel');
        $saveToDatabase = $request->input('save_to_database', true);

        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            if (!$divStrata) {
                return response()->json(['message' => 'D-IV strata not found'], 404);
            }

            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();
            if (!$table) {
                return response()->json(['message' => 'Table not found for D-IV strata', 'tableCode' => $tableCode], 404);
            }

            if (!$table->hasRumus()) {
                return response()->json(['message' => 'No calculation formulas found for this table', 'tableCode' => $tableCode, 'available_rumus' => []], 404);
            }

            $taskId = $this->getTaskIdForTable($tableCode, $projectId);

            request()->merge([
                'taskId' => $taskId,
                'projectId' => $projectId
            ]);

            $getDataRequest = new Request(['tableCode' => $tableCode, 'projectId' => $projectId]);
            $dataResponse = $this->getTableData($getDataRequest);
            if ($dataResponse->getStatusCode() !== 200) {
                return response()->json(['message' => 'Failed to get table data for calculation', 'tableCode' => $tableCode], 404);
            }

            $responseData = $dataResponse->getData(true);
            $tableData = $responseData['data'] ?? [];

            $calculationResults = $table->hitungRumus($tableData, $variabel);
            $calculationDetails = $table->getCalculationDetails($tableData, $variabel);

            return response()->json([
                'success' => true,
                'tableCode' => $tableCode,
                'projectId' => $projectId,
                'taskId' => $taskId,
                'variabel_filter' => $variabel,
                'available_rumus' => collect($table->rumus)->pluck('variabel'),
                'calculation_results' => $calculationResults,
                'calculation_details' => $calculationDetails,
                'external_variables_resolved' => $this->getExternalVariablesInfo($table, $projectId),
                'data_count' => count($tableData),
                'calculated_at' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            Log::error("Error calculating rumus for table {$tableCode}: {$e->getMessage()}");
            return response()->json(['success' => false, 'message' => 'Error calculating formulas: ' . $e->getMessage(), 'tableCode' => $tableCode], 500);
        }
    }

    private function getTaskIdForTable($tableCode, $projectId)
    {
        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();

            if (!$table) {
                return null;
            }

            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            if ($taskLists->isEmpty()) {
                return null;
            }

            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tableIdString = (string) $table->_id;

            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('lkpsTableId', $tableIdString)
                ->first();

            return $task ? (string) $task->_id : null;
        } catch (\Exception $e) {
            Log::error("Error getting task ID: {$e->getMessage()}");
            return null;
        }
    }

    private function getExternalVariablesInfo($table, $projectId)
    {
        try {
            $allFormulas = collect($table->rumus)->pluck('formula')->implode(' ');
            preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $allFormulas, $matches);
            $allVariables = array_unique($matches[1]);

            $excludeList = ['COUNTA', 'COUNTIFS', 'SUM', 'AVERAGE', 'IFERROR', 'OR', 'AND', 'NOT'];
            $allVariables = array_diff($allVariables, $excludeList);

            $currentTableVariables = collect($table->rumus)->pluck('variabel')->toArray();
            $externalVariables = array_diff($allVariables, $currentTableVariables);

            $externalInfo = [];
            foreach ($externalVariables as $variable) {
                $found = $this->findVariableSource($variable, $projectId);
                $externalInfo[$variable] = $found;
            }

            return [
                'current_table_variables' => $currentTableVariables,
                'external_variables_needed' => array_values($externalVariables),
                'external_variables_sources' => $externalInfo
            ];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function findVariableSource($variableName, $projectId)
    {
        try {
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
            $taskIds = $tasks->pluck('_id')->map(function ($id) {
                return (string) $id;
            })->toArray();

            $lkpsDataRecords = \App\Models\Lkps\LkpsData::whereIn('taskId', $taskIds)->get();

            foreach ($lkpsDataRecords as $lkpsData) {
                $detailNilai = $lkpsData->detailNilai ?? [];
                if (is_object($detailNilai)) {
                    $detailNilai = (array) $detailNilai;
                }

                if (isset($detailNilai[$variableName])) {
                    $table = \App\Models\Lkps\LkpsTable::find($lkpsData->lkpsTableId);
                    return [
                        'found' => true,
                        'value' => $detailNilai[$variableName],
                        'source_table' => $table ? $table->kode : 'unknown',
                        'source_table_title' => $table ? $table->judul : 'unknown',
                        'lkps_data_id' => (string) $lkpsData->_id,
                        'scope' => 'project'
                    ];
                }
            }

            return ['found' => false, 'searched_in' => 'project_scope'];
        } catch (\Exception $e) {
            return ['found' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Save calculation results to the detailNilai field in LkpsData.
     */
    private function saveCalculationResults($tableCode, $projectId, $calculationResults, $responseData)
    {
        try {
            $taskId = $responseData['taskId'] ?? null;
            if (!$taskId) {
                return ['success' => false, 'message' => 'No taskId found in response data'];
            }

            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();
            if (!$table) {
                return ['success' => false, 'message' => 'Table not found'];
            }

            $tableIdString = (string) $table->_id;
            $taskIdString = (string) $taskId;
            $lkpsData = LkpsData::where('lkpsTableId', $tableIdString)->where('taskId', $taskIdString)->first();
            if (!$lkpsData) {
                return ['success' => false, 'message' => 'LkpsData not found for this table and task'];
            }

            $existingDetailNilai = $lkpsData->detailNilai ?? [];
            if (is_object($existingDetailNilai)) {
                $existingDetailNilai = (array) $existingDetailNilai;
            }

            foreach ($calculationResults as $variabel => $result) {
                $existingDetailNilai[$variabel] = $result['value'] ?? 0;
            }

            $lkpsData->detailNilai = $existingDetailNilai;
            $lkpsData->save();

            return [
                'success' => true,
                'lkps_data_info' => ['tableCode' => $tableCode, 'projectId' => $projectId, 'taskId' => $taskId, 'detailNilai' => $existingDetailNilai]
            ];
        } catch (\Exception $e) {
            Log::error("Error saving calculation results to LkpsData: {$e->getMessage()}", ['tableCode' => $tableCode, 'projectId' => $projectId, 'taskId' => $taskId ?? 'N/A', 'trace' => $e->getTraceAsString()]);
            return ['success' => false, 'message' => 'Error saving calculation results: ' . $e->getMessage()];
        }
    }

    /**
     * Get saved calculation results from the detailNilai field.
     */
    public function getSavedCalculationResults(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'tableCode' => 'required|string',
            'projectId' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $tableCode = $request->input('tableCode');
            $projectId = $request->input('projectId');
            $getDataRequest = new Request(['tableCode' => $tableCode, 'projectId' => $projectId]);
            $dataResponse = $this->getTableData($getDataRequest);

            if ($dataResponse->getStatusCode() !== 200) {
                return response()->json(['message' => 'No data found for this table', 'tableCode' => $tableCode], 404);
            }

            $responseData = $dataResponse->getData(true);
            $detailNilai = $responseData['detailNilai'] ?? [];
            $calculationResults = [];
            $metadata = [];

            foreach ($detailNilai as $key => $value) {
                if (strpos($key, '_calculated_at') !== false || strpos($key, '_formula') !== false) {
                    $metadata[$key] = $value;
                } else {
                    if (is_numeric($value)) {
                        $calculationResults[$key] = ['variabel' => $key, 'value' => (float) $value, 'calculated_at' => $detailNilai[$key . '_calculated_at'] ?? null, 'formula' => $detailNilai[$key . '_formula'] ?? null, 'auto_calculated_at' => $detailNilai[$key . '_auto_calculated_at'] ?? null];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'tableCode' => $tableCode,
                'projectId' => $projectId,
                'taskId' => $responseData['taskId'] ?? null,
                'saved_calculation_results' => $calculationResults,
                'calculation_metadata' => $metadata,
                'total_detail_nilai' => count($detailNilai),
                'calculation_results_count' => count($calculationResults),
                'retrieved_at' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error retrieving saved calculation results: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Calculate score based on formulas and conditions.
     */
    public function calculateSkor(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'tableCode' => 'required|string',
            'projectId' => 'required|string',
            'save_to_database' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $projectId = $request->input('projectId');
        $saveToDatabase = $request->input('save_to_database', true);

        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            if (!$divStrata) {
                return response()->json(['message' => 'D-IV strata not found'], 404);
            }

            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();
            if (!$table) {
                return response()->json(['message' => 'Table not found for D-IV strata', 'tableCode' => $tableCode], 404);
            }

            if (!$table->hasRumus()) {
                return response()->json(['message' => 'No calculation formulas found for this table', 'tableCode' => $tableCode], 404);
            }
            if (!$table->hasKondisi()) {
                return response()->json(['message' => 'No score conditions found for this table', 'tableCode' => $tableCode], 404);
            }

            $getDataRequest = new Request(['tableCode' => $tableCode, 'projectId' => $projectId]);
            $dataResponse = $this->getTableData($getDataRequest);
            if ($dataResponse->getStatusCode() !== 200) {
                return response()->json(['message' => 'Failed to get table data for score calculation', 'tableCode' => $tableCode], 404);
            }

            $responseData = $dataResponse->getData(true);
            $tableData = $responseData['data'] ?? [];

            $skorResults = $table->hitungSkor($tableData);
            $skorDetails = $table->getSkorCalculationDetails($tableData);

            $savedToDatabase = false;
            $lkpsDataInfo = null;

            if ($saveToDatabase && !empty($skorResults)) {
                $saveResult = $this->saveSkorResults($tableCode, $projectId, $skorResults, $responseData);
                if ($saveResult['success']) {
                    $savedToDatabase = true;
                    $lkpsDataInfo = $saveResult['lkps_data_info'];
                } else {
                    Log::warning("Failed to save score results: " . $saveResult['message']);
                }
            }

            return response()->json([
                'success' => true,
                'tableCode' => $tableCode,
                'score_results' => $skorResults,
                'calculation_details' => $skorDetails,
                'data_count' => count($tableData),
                'calculated_at' => now()->toISOString(),
                'saved_to_database' => $savedToDatabase,
                'lkps_data_info' => $lkpsDataInfo,
                'save_location' => 'nilai field in LkpsData'
            ]);
        } catch (\Exception $e) {
            Log::error("Error calculating skor for table {$tableCode}: {$e->getMessage()}");
            return response()->json(['success' => false, 'message' => 'Error calculating score: ' . $e->getMessage(), 'tableCode' => $tableCode], 500);
        }
    }


    /**
     * Save score results to the 'nilai' field in LkpsData.
     */
    private function saveSkorResults($tableCode, $projectId, $skorResults, $responseData)
    {
        try {
            $taskId = $responseData['taskId'] ?? null;
            if (!$taskId) {
                return ['success' => false, 'message' => 'No taskId found in response data'];
            }

            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();
            if (!$table) {
                return ['success' => false, 'message' => 'Table not found'];
            }

            $tableIdString = (string) $table->_id;
            $taskIdString = (string) $taskId;
            $lkpsData = LkpsData::where('lkpsTableId', $tableIdString)->where('taskId', $taskIdString)->first();
            if (!$lkpsData) {
                return ['success' => false, 'message' => 'LkpsData not found for this table and task'];
            }

            $nilaiArray = [];
            foreach ($skorResults as $skor) {
                $nilaiArray[] = ['butir' => $skor['butir'], 'nilai' => $skor['nilai']];
            }

            $lkpsData->nilai = $nilaiArray;
            $lkpsData->save();

            return [
                'success' => true,
                'lkps_data_info' => ['tableCode' => $tableCode, 'projectId' => $projectId, 'taskId' => $taskId, 'nilai' => $nilaiArray, 'skor_count' => count($skorResults), 'butir_list' => collect($skorResults)->pluck('butir')]
            ];
        } catch (\Exception $e) {
            Log::error("Error saving score results to LkpsData: {$e->getMessage()}", ['tableCode' => $tableCode, 'projectId' => $projectId, 'taskId' => $taskId ?? 'N/A', 'trace' => $e->getTraceAsString()]);
            return ['success' => false, 'message' => 'Error saving score results: ' . $e->getMessage()];
        }
    }

    public function debugKondisiEvaluation(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'tableCode' => 'required|string',
            'test_value' => 'numeric'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $testValue = $request->input('test_value', 2.93);

        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            if (!$divStrata) {
                return response()->json(['message' => 'D-IV strata not found'], 404);
            }

            $table = LkpsTable::where('kode', $tableCode)->where('strataId', $divStrata->_id)->first();
            if (!$table) {
                return response()->json(['message' => 'Table not found for D-IV strata', 'tableCode' => $tableCode], 404);
            }

            $kondisiData = $table->kondisi;
            $testResults = $table->testKondisiEvaluation($testValue);
            $manualDebug = $this->manualKondisiDebug($table, $testValue);

            return response()->json([
                'success' => true,
                'tableCode' => $tableCode,
                'test_value' => $testValue,
                'kondisi_raw_data' => $kondisiData,
                'test_results' => $testResults,
                'manual_debug' => $manualDebug,
                'table_capabilities' => [
                    'has_rumus' => $table->hasRumus(),
                    'has_kondisi' => $table->hasKondisi(),
                    'rumus_count' => count($table->rumus ?? []),
                    'kondisi_count' => count($table->kondisi ?? [])
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Error in debug kondisi evaluation: {$e->getMessage()}");
            return response()->json(['success' => false, 'message' => 'Error in debug: ' . $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }

    private function validateKondisiRange($kondisiText)
    {
        try {
            if (preg_match('/(\d+(?:\.\d+)?)\s*[≤<=]\s*[A-Z_]+\s*<\s*(\d+(?:\.\d+)?)/', $kondisiText, $matches)) {
                $min = (float) $matches[1];
                $max = (float) $matches[2];

                if ($min >= $max) {
                    \Log::warning("Invalid range detected in kondisi", ['kondisi' => $kondisiText, 'min' => $min, 'max' => $max, 'issue' => 'min >= max']);
                    return false;
                }
            }
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function extractVariablesFromKondisi($kondisiText)
    {
        $variables = [];
        if (preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $kondisiText, $matches)) {
            $variables = array_unique($matches[1]);
        }
        return $variables;
    }

    /**
     * Helper for manual, step-by-step debugging of a table's condition evaluation.
     */
    private function manualKondisiDebug($table, $testValue = 2.93)
    {
        $debug = [];
        $debug['step1_kondisi_structure'] = ['kondisi_count' => count($table->kondisi ?? []), 'kondisi_data' => $table->kondisi ?? []];

        $variablesUsed = [];
        foreach ($table->kondisi as $kondisiItem) {
            $kondisiText = $kondisiItem['kondisi'] ?? '';
            if (preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $kondisiText, $matches)) {
                $variablesUsed = array_merge($variablesUsed, $matches[1]);
            }
        }
        $variablesUsed = array_unique($variablesUsed);
        $debug['step1_5_detected_variables'] = $variablesUsed;

        $mockRumusResults = [];
        $rumusVariables = [];
        if (!empty($table->rumus)) {
            foreach ($table->rumus as $rumus) {
                $rumusVariables[] = $rumus['variabel'] ?? '';
            }
        }
        $targetVariables = !empty($rumusVariables) ? $rumusVariables : $variablesUsed;
        foreach ($targetVariables as $variable) {
            if (!empty($variable)) {
                $mockRumusResults[$variable] = ['value' => $testValue, 'variabel' => $variable];
            }
        }
        $debug['step2_mock_rumus'] = ['rumus_variables' => $rumusVariables, 'detected_kondisi_variables' => $variablesUsed, 'final_mock_results' => $mockRumusResults];

        $debug['step3_individual_kondisi_tests'] = [];
        foreach ($table->kondisi as $index => $kondisiItem) {
            $butir = $kondisiItem['butir'] ?? 'NO_BUTIR';
            $kondisiText = $kondisiItem['kondisi'] ?? 'NO_KONDISI';
            $formulaText = $kondisiItem['formula'] ?? 'NO_FORMULA';
            $isValidRange = $this->validateKondisiRange($kondisiText);

            $debug['step3_individual_kondisi_tests'][] = ['index' => $index, 'butir' => $butir, 'kondisi_text' => $kondisiText, 'formula_text' => $formulaText, 'has_butir' => !empty($butir), 'has_kondisi' => !empty($kondisiText), 'has_formula' => !empty($formulaText), 'is_valid_item' => !empty($butir) && !empty($kondisiText), 'is_valid_range' => $isValidRange, 'variables_in_kondisi' => $this->extractVariablesFromKondisi($kondisiText)];
        }

        $debug['step4_hitung_skor_requirements'] = ['has_rumus' => $table->hasRumus(), 'has_kondisi' => $table->hasKondisi(), 'rumus_data' => $table->rumus ?? [], 'would_pass_initial_check' => $table->hasRumus() && $table->hasKondisi(), 'variable_mismatch_detected' => !empty(array_diff($variablesUsed, $rumusVariables))];

        return $debug;
    }

    public function debugCalculateTableFormulas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $projectId = $request->input('projectId');
        $tableCode = $request->input('tableCode');

        $debugLog = [];
        $calculationCache = [];
        $finalResults = [];

        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            if (!$divStrata)
                throw new \Exception("Strata 'D-IV' not found.");

            $targetTable = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();

            if (!$targetTable) {
                return response()->json([
                    'success' => false,
                    'message' => "Table with code '{$tableCode}' for D-IV strata not found.",
                ], 404);
            }

            $debugLog[] = "==== STARTING CALCULATION FOR TABLE: [{$tableCode}] FOR PROJECT [{$projectId}] ====";

            if (empty($targetTable->rumus)) {
                return response()->json([
                    'success' => true,
                    'message' => "Table '{$tableCode}' has no formulas to calculate.",
                    'results' => [],
                ]);
            }

            foreach ($targetTable->rumus as $rumus) {
                $variableToCalculate = $rumus['variabel'];
                $debugLog[] = "---------------------------------------------";
                $debugLog[] = ">>> Processing variable '{$variableToCalculate}' from table '{$tableCode}'";

                $result = $this->resolveVariable(
                    $variableToCalculate,
                    $projectId,
                    $debugLog,
                    $calculationCache
                );

                $finalResults[$variableToCalculate] = $result;
            }

            $debugLog[] = "==== CALCULATION FINISHED FOR TABLE: [{$tableCode}] ====";

            return response()->json([
                'success' => true,
                'message' => "All formulas for table '{$tableCode}' calculated successfully.",
                'table_code' => $tableCode,
                'project_id' => $projectId,
                'final_results' => $finalResults,
                'calculation_cache' => $calculationCache,
                'debug_log' => $debugLog,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during calculation.',
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'debug_log' => $debugLog,
            ], 500);
        }
    }

    private function resolveVariable(string $variableName, string $projectId, array &$debugLog, array &$cache, bool $forceRecalculate = false)
    {
        $debugLog[] = "--- Resolving variable: [{$variableName}]" . ($forceRecalculate ? " (FORCED)" : "") . " ---";

        if (!$forceRecalculate) {
            if (isset($cache[$variableName])) {
                $debugLog[] = "SUCCESS: Found '{$variableName}' in cache. Value: " . $cache[$variableName];
                return $cache[$variableName];
            }

            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
            $taskIds = $tasks->pluck('_id')->map(fn($id) => (string) $id)->toArray();
            $lkpsDataRecord = \App\Models\Lkps\LkpsData::whereIn('taskId', $taskIds)
                ->where("detailNilai.{$variableName}", 'exists', true)->first();

            if ($lkpsDataRecord && isset($lkpsDataRecord->detailNilai[$variableName])) {
                $value = $lkpsDataRecord->detailNilai[$variableName];
                $sourceTable = \App\Models\Lkps\LkpsTable::find($lkpsDataRecord->lkpsTableId);
                $debugLog[] = "SUCCESS: Found pre-calculated '{$variableName}' in DB (Table: " . ($sourceTable->kode ?? 'N/A') . "). Value: {$value}";
                $cache[$variableName] = $value;
                return $value;
            }
        }

        if ($forceRecalculate) {
            $debugLog[] = "INFO: Force recalculate is ON. Skipping cache and DB checks.";
        }
        $debugLog[] = "INFO: '{$variableName}' not found or skipped. Searching for its formula.";

        $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
        $tableDefinisi = \App\Models\Lkps\LkpsTable::where('rumus.variabel', $variableName)->where('strataId', $divStrata->_id)->first();

        if (!$tableDefinisi) {
            $debugLog[] = "WARNING: Definition for variable '{$variableName}' not found. Defaulting to 0.";
            $cache[$variableName] = 0;
            return 0;
        }

        $rumusObj = collect($tableDefinisi->rumus)->firstWhere('variabel', $variableName);
        if (!$rumusObj || empty($rumusObj['formula'])) {
            $debugLog[] = "WARNING: Formula for '{$variableName}' in table '{$tableDefinisi->kode}' is empty. Defaulting to 0.";
            $cache[$variableName] = 0;
            return 0;
        }
        $formula = $rumusObj['formula'];
        $debugLog[] = "INFO: Found formula for '{$variableName}' in table '{$tableDefinisi->kode}': {$formula}";

        preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $formula, $matches);
        $allPotentialVars = array_unique($matches[1]);

        $excelFunctions = ['SUM', 'COUNTA', 'COUNTIFS', 'IF', 'AND', 'OR', 'AVERAGE', 'IFERROR', 'MAX', 'MIN'];
        $dependentVariables = [];

        foreach ($allPotentialVars as $var) {
            if (in_array($var, $excelFunctions)) {
                continue;
            }
            if (preg_match('/^[A-Z]{1,3}\d+$/', $var)) {
                continue;
            }
            if (strlen($var) === 1) {
                continue;
            }
            $dependentVariables[] = $var;
        }

        if (empty($dependentVariables)) {
            $debugLog[] = "INFO: Formula '{$formula}' has no other *abstract* variable dependencies. Ready to calculate.";
        } else {
            $debugLog[] = "INFO: Formula '{$formula}' depends on abstract variables: " . implode(', ', $dependentVariables);
        }

        foreach ($dependentVariables as $depVar) {
            $resolvedValue = $this->resolveVariable($depVar, $projectId, $debugLog, $cache, false);
            $formula = preg_replace('/\b' . preg_quote($depVar) . '\b/', (string) $resolvedValue, $formula);
            $debugLog[] = "INFO: Substituted '{$depVar}' with '{$resolvedValue}'. New formula: {$formula}";
        }

        $parser = new ExcelFormulaParser($tableDefinisi);

        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
        $taskListIds = $taskLists->pluck('_id')->toArray();
        $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->where('lkpsTableId', (string) $tableDefinisi->_id)->first();

        $dataUntukParser = [];
        if ($task) {
            $lkpsData = \App\Models\Lkps\LkpsData::where('taskId', (string) $task->_id)->first();
            $dataUntukParser = $lkpsData ? $lkpsData->data : [];
        }

        if (empty($dataUntukParser)) {
            $debugLog[] = "WARNING: No data found for table '{$tableDefinisi->kode}'. Calculations involving cell ranges will be inaccurate.";
        }

        $finalValue = $parser->evaluateFormula($formula, $dataUntukParser);
        $debugLog[] = "SUCCESS: Calculated '{$formula}'. Final value for '{$variableName}' is: {$finalValue}";

        $cache[$variableName] = $finalValue;
        return $finalValue;
    }
    /**
     * Force recalculate all formulas for a given table, ignoring cache.
     *
     * This is useful for debugging purposes, or when you want to make sure that all formulas are recalculated from scratch.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function forceRecalculateTableFormulas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $projectId = $request->input('projectId');
        $tableCode = $request->input('tableCode');

        $debugLog = [];
        $calculationCache = [];
        $finalResults = [];

        try {
            $divStrata = Strata::where('name', 'D-IV')->first();
            if (!$divStrata)
                throw new \Exception("Strata 'D-IV' not found.");

            $targetTable = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();

            if (!$targetTable) {
                return response()->json(['success' => false, 'message' => "Table '{$tableCode}' not found."], 404);
            }

            $debugLog[] = "==== STARTING FORCED RECALCULATION FOR TABLE: [{$tableCode}] ====";
            if (empty($targetTable->rumus)) {
                return response()->json(['success' => true, 'message' => "Table '{$tableCode}' has no formulas."]);
            }

            foreach ($targetTable->rumus as $rumus) {
                $variableToCalculate = $rumus['variabel'];
                $debugLog[] = "---------------------------------------------";
                $debugLog[] = ">>> FORCE Processing variable '{$variableToCalculate}'";

                $result = $this->resolveVariable(
                    $variableToCalculate,
                    $projectId,
                    $debugLog,
                    $calculationCache,
                    true
                );
                $finalResults[$variableToCalculate] = $result;
            }

            $debugLog[] = "==== FORCED RECALCULATION FINISHED ====";

            return response()->json([
                'success' => true,
                'message' => "All formulas for table '{$tableCode}' were forcibly recalculated.",
                'final_results' => $finalResults,
                'calculation_cache' => $calculationCache,
                'debug_log' => $debugLog,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during calculation.',
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'debug_log' => $debugLog,
            ], 500);
        }
    }

    public function calculateTableFormulas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
            'force' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $projectId = $request->input('projectId');
        $tableCode = $request->input('tableCode');
        $forceRecalculate = $request->input('force', false);

        try {
            $divStrata = Strata::where('name', 'D-IV')->first();
            if (!$divStrata) {
                throw new \Exception("Strata 'D-IV' not found.");
            }

            $targetTable = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();

            if (!$targetTable) {
                return response()->json(['success' => false, 'message' => "Table '{$tableCode}' not found for D-IV strata."], 404);
            }

            $calculation = $targetTable->calculateAllFormulas($projectId, $forceRecalculate);

            return response()->json([
                'success' => true,
                'message' => "All formulas for table '{$tableCode}' calculated. (Forced: " . ($forceRecalculate ? 'Yes' : 'No') . ")",
                'final_results' => $calculation['results'],
                'calculation_cache' => $calculation['cache'],
                'debug_log' => $calculation['log'],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    public function calculateScore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $projectId = $request->input('projectId');
        $tableCode = $request->input('tableCode');

        try {
            $divStrata = Strata::where('name', 'D-IV')->first();
            if (!$divStrata)
                throw new \Exception("Strata 'D-IV' not found.");

            $targetTable = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();

            if (!$targetTable) {
                return response()->json(['success' => false, 'message' => "Table '{$tableCode}' not found."], 404);
            }

            if (!$targetTable->hasKondisi()) {
                return response()->json(['success' => true, 'message' => "Table '{$tableCode}' has no score conditions (kondisi).", 'scores' => []]);
            }

            $skorResults = $targetTable->hitungSkor($projectId);

            return response()->json([
                'success' => true,
                'message' => "Score calculation completed for table '{$tableCode}'.",
                'score_results' => $skorResults
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during score calculation: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }
}