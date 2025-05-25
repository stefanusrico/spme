<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsData;
use App\Models\Prodi\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LkpsDataController extends Controller
{
    /**
     * Get data for all tables
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllData()
    {
        // Get all tables
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

        // Find the table
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Verify project exists
        $project = \App\Models\Project\Project::find($projectId);

        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        // Find the task
        $taskId = null;
        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

        if (!$taskLists->isEmpty()) {
            $taskListIds = $taskLists->pluck('_id')->toArray();

            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('lkpsTableId', $table->_id)
                ->first();

            if ($task) {
                $taskId = $task->_id;
                Log::info("Found task {$taskId} for table {$tableCode} in project {$projectId}");
            } else {
                Log::warning("No task found for table {$tableCode} in any task list of project {$projectId}");
            }
        }

        // Get the LkpsData - hanya jika ada taskId
        if (!$taskId) {
            return response()->json(['message' => 'No task found for this table in the project'], 404);
        }

        $lkpsData = LkpsData::where('lkpsTableId', $table->_id)
            ->where('taskId', $taskId)
            ->first();

        if (!$lkpsData) {
            Log::info("No LkpsData found for table {$tableCode} and task {$taskId} in project {$projectId}");
            return response()->json(['message' => 'No score details found for this table in the project'], 404);
        }

        return response()->json([
            'tableCode' => $tableCode,
            'taskId' => $taskId,
            'data' => $lkpsData->data ?? [],
            'nilai' => $lkpsData->nilai ?? [],
            'detailNilai' => $lkpsData->detailNilai ?? []
        ]);
    }

    /**
     * Save data for a specific table
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveTableData(Request $request, $tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
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

        $data = $request->input('data');
        $nilai = $request->input('nilai');
        $detailNilai = $request->input('detailNilai', []);
        $projectId = $request->input('projectId');

        // Optional taskId (will be looked up if not provided)
        $taskId = $request->input('taskId');

        // Cek apakah project ada
        $project = \App\Models\Project\Project::find($projectId);

        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        if (!in_array($project->status, ['ACTIVE', 'IN PROGRESS'])) {
            return response()->json(['message' => 'Tidak dapat menyimpan data untuk project yang tidak berstatus ACTIVE atau IN PROGRESS'], 403);
        }
        
        // If taskId is not provided, try to find it
        if (!$taskId) {
            // First, find all taskLists associated with this project
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

            if ($taskLists->isEmpty()) {
                Log::warning("No task lists found for project {$projectId}");
            } else {
                // Get all taskList IDs
                $taskListIds = $taskLists->pluck('_id')->toArray();

                // Now find a task that belongs to one of these task lists and has the correct lkpsTableId
                $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                    ->where('lkpsTableId', $table->_id)
                    ->first();

                if ($task) {
                    $taskId = $task->_id;
                    Log::info("Found task {$task->_id} for table {$tableCode} in project {$projectId}");
                } else {
                    Log::warning("No task found for table {$tableCode} in any task list of project {$projectId}");
                }
            }
        }

        try {
            $lkpsData = LkpsData::saveData(
                $tableCode,
                $data,
                $nilai,
                $detailNilai,
                $taskId
            );

            // Get task details if we have a taskId and update progress/status
            $task = null;
            if ($lkpsData->taskId) {
                $task = \App\Models\Project\Task::find($lkpsData->taskId);

                // Update task progress and status
                if ($task) {
                    $task->progress = 100;
                    $task->status = 'COMPLETED';
                    $task->save();

                    Log::info("Updated task {$task->_id} progress to 100% and status to COMPLETED");

                    // Update project progress
                    $this->updateProjectProgress($projectId);
                }
            }

            return response()->json([
                'message' => 'Data saved successfully',
                'nilai' => $nilai,
                'taskId' => $lkpsData->taskId,
                'taskName' => $task ? $task->nama : null,
                'taskProgress' => $task ? $task->progress : null,
                'taskStatus' => $task ? $task->status : null
            ]);
        } catch (\Exception $e) {
            Log::error("Error saving LKPS data: {$e->getMessage()}", [
                'tableCode' => $tableCode,
                'projectId' => $projectId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error saving data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update project progress based on task completion
     */
    private function updateProjectProgress($projectId)
    {
        try {
            // Find the project
            $project = \App\Models\Project\Project::find($projectId);

            if (!$project) {
                Log::error("Project not found for progress update: {$projectId}");
                return 0;
            }

            // Get all task lists for this project
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

            if ($taskLists->isEmpty()) {
                Log::warning("No task lists found for project: {$projectId}");
                return 0;
            }

            $taskListIds = $taskLists->pluck('_id')->toArray();

            // Count all tasks
            $totalTasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->count();

            if ($totalTasks === 0) {
                Log::warning("No tasks found for project: {$projectId}");
                return 0;
            }

            // Count completed tasks
            $completedTasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('status', 'COMPLETED')
                ->count();

            Log::info("Tasks: {$completedTasks} completed out of {$totalTasks} total");

            // Calculate progress percentage
            $progress = round(($completedTasks / $totalTasks) * 100, 2);

            // Use direct update query instead of model to avoid fillable issues
            $result = \App\Models\Project\Project::where('_id', $projectId)
                ->update([
                    'progress' => $progress,
                    'status' => 'IN PROGRESS',
                    'updated_at' => now()
                ]);

            // If all tasks completed, update project status to COMPLETED
            if ($completedTasks === $totalTasks) {
                \App\Models\Project\Project::where('_id', $projectId)
                    ->update([
                        'status' => 'COMPLETED',
                        'updated_at' => now()
                    ]);

                Log::info("All tasks completed - Project {$projectId} status set to COMPLETED");
            }

            Log::info("Updated project {$projectId} progress to {$progress}%, update result: {$result}");

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

    public function getTaskIdForTable(Request $request, $tableCode)
    {
        $prodiId = $request->input('prodiId');

        if (!$prodiId && auth()->check() && auth()->user()->prodiId) {
            $prodiId = auth()->user()->prodiId;
        }

        if (!$prodiId) {
            return response()->json([
                'message' => 'Prodi ID is required'
            ], 400);
        }

        $taskId = LkpsData::findTaskIdForTable($tableCode, $prodiId);

        if (!$taskId) {
            return response()->json([
                'message' => 'Task not found for this table'
            ], 404);
        }

        $task = \App\Models\Project\Task::find($taskId);

        return response()->json([
            'taskId' => $taskId,
            'taskName' => $task ? $task->nama : null
        ]);
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
        // Initialize Excel
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

        if ($tableCode) {
            // Export a specific table
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
            // Export all tables
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

        // Generate filename
        $filename = "LKPS";
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
     * @param \App\Models\Lkps\LkpsTable $table
     * @param array $data
     */
    private function createTableSheet($sheet, $table, $data)
    {
        // Get columns for this table
        $columns = LkpsColumn::where('kodeTabel', $table->kode)->get();

        // Organize columns for export
        $headerColumns = [];
        $columnMap = [];

        foreach ($columns as $column) {
            if (!$column->parentId) {
                if ($column->isGroup) {
                    // Find children
                    $children = $columns->where('parentId', $column->_id);

                    if ($children->count() > 0) {
                        $childHeaders = [];

                        foreach ($children as $child) {
                            $childHeaders[] = $child->judul;
                            $columnMap[] = [
                                'indeksData' => $child->indeksData,
                                'type' => $child->type
                            ];
                        }

                        $headerColumns[] = [
                            'judul' => $column->judul,
                            'children' => $childHeaders,
                            'width' => count($childHeaders)
                        ];
                    }
                } else {
                    $headerColumns[] = [
                        'judul' => $column->judul,
                        'width' => 1
                    ];
                    $columnMap[] = [
                        'indeksData' => $column->indeksData,
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
        $sheet->setCellValueByColumnAndRow(1, $row, $table->judul);
        $sheet->mergeCellsByColumnAndRow(1, $row, count($columnMap), $row);
        $sheet->getStyleByColumnAndRow(1, $row, count($columnMap), $row)
            ->getFont()->setBold(true);
        $row++;

        if ($hasGroupHeaders) {
            // Add group headers
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
                $sheet->setCellValueByColumnAndRow($index + 1, $row, $headerColumns[$index]['judul']);
            }
            $row++;
        }

        // Add data rows
        foreach ($data as $rowData) {
            $col = 1;
            foreach ($columnMap as $column) {
                $value = $rowData[$column['indeksData']] ?? '';

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
        $validator = \Validator::make($request->all(), [
            'projectId' => 'required|string',
            'tableCode' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tableCode = $request->input('tableCode');
        $projectId = $request->input('projectId');

        // Find the table
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Verify project exists
        $project = \App\Models\Project\Project::find($projectId);

        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        // Find the task
        $taskId = null;
        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();

        if (!$taskLists->isEmpty()) {
            $taskListIds = $taskLists->pluck('_id')->toArray();

            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('lkpsTableId', $table->_id)
                ->first();

            if ($task) {
                $taskId = $task->_id;
                Log::info("Found task {$taskId} for table {$tableCode} in project {$projectId}");
            } else {
                Log::warning("No task found for table {$tableCode} in any task list of project {$projectId}");
            }
        }

        // Get the LkpsData - hanya jika ada taskId
        if (!$taskId) {
            return response()->json(['message' => 'No task found for this table in the project'], 404);
        }

        $lkpsData = LkpsData::where('lkpsTableId', $table->_id)
            ->where('taskId', $taskId)
            ->first();

        if (!$lkpsData) {
            Log::info("No LkpsData found for table {$tableCode} and task {$taskId} in project {$projectId}");
            return response()->json(['message' => 'No score details found for this table in the project'], 404);
        }

        return response()->json([
            'tableCode' => $tableCode,
            'taskId' => $taskId,
            'detailNilai' => $lkpsData->detailNilai ?? []
        ]);
    }

    
}