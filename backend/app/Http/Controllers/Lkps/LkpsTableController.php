<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsColumn;
use App\Models\Lkps\LkpsData;
use App\Models\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class LkpsTableController extends Controller
{
    /**
     * Get all tables
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllTables()
    {
        try {
            $tables = LkpsTable::select('kode', 'judul')->orderBy('judul')->get();

            \Log::info('LKPS Tables count: ' . $tables->count());

            return response()->json([
                'message' => 'Success',
                'count' => $tables->count(),
                'data' => $tables
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getAllTables: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error retrieving LKPS tables',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add a new table
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function addTable(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'kode' => 'required|unique:lkps_tables,kode',
            'judul' => 'required|string',
            'barisAwalExcel' => 'nullable|integer'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $table = LkpsTable::create([
                'kode' => $request->input('kode'),
                'judul' => $request->input('judul'),
                'barisAwalExcel' => $request->input('barisAwalExcel', 2)
            ]);

            return response()->json([
                'message' => 'Table created successfully',
                'table' => $table
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create table',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific table with columns
     * 
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableWithColumns($tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Get all columns for this table
        $allColumns = LkpsColumn::where('kodeTabel', $tableCode)->get();

        // Organize columns by parent/child relationship
        $parentColumns = $allColumns->where('parentId', null)->sortBy('order');

        $columns = $parentColumns->map(function ($column) use ($allColumns) {
            $result = $column->toArray();

            if ($column->isGroup) {
                $result['children'] = $allColumns->where('parentId', $column->_id)
                    ->sortBy('order')
                    ->values()
                    ->toArray();
            }

            return $result;
        });

        return response()->json([
            'table' => $table,
            'columns' => $columns
        ]);
    }

    /**
     * Get table configuration
     * 
     * @param string $tableCode Table code
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableConfig($tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $config = [
            'kode' => $table->kode,
            'judul' => $table->judul,
            'barisAwalExcel' => $table->barisAwalExcel,
            'columns' => []
        ];

        // Get all columns for this table
        $allColumns = LkpsColumn::where('kodeTabel', $tableCode)->get();

        // Organize columns by parent/child relationship
        $parentColumns = $allColumns->where('parentId', null)->sortBy('order');

        $config['columns'] = $parentColumns->map(function ($column) use ($allColumns) {
            $result = [
                'id' => $column->_id,
                'indeksData' => $column->indeksData,
                'judul' => $column->judul,
                'type' => $column->type,
                'lebar' => $column->lebar,
                'align' => $column->align,
                'order' => $column->order,
                'isGroup' => $column->isGroup
            ];

            if ($column->isGroup) {
                // Get direct children of this column
                $children = $allColumns->where('parentId', $column->_id)->sortBy('order');

                // Process each child, checking if they also have children
                $processedChildren = [];
                foreach ($children as $child) {
                    $childData = [
                        'id' => $child->_id,
                        'indeksData' => $child->indeksData,
                        'judul' => $child->judul,
                        'type' => $child->type,
                        'lebar' => $child->lebar,
                        'align' => $child->align,
                        'order' => $child->order,
                        'isGroup' => $child->isGroup
                    ];

                    // Check if this child is also a group and has its own children
                    if ($child->isGroup) {
                        // Find grandchildren
                        $grandchildren = $allColumns->where('parentId', $child->_id)->sortBy('order');
                        $childData['children'] = $grandchildren->map(function ($grandchild) {
                            return [
                                'id' => $grandchild->_id,
                                'indeksData' => $grandchild->indeksData,
                                'judul' => $grandchild->judul,
                                'type' => $grandchild->type,
                                'lebar' => $grandchild->lebar,
                                'align' => $grandchild->align,
                                'order' => $grandchild->order,
                                'isGroup' => $grandchild->isGroup
                            ];
                        })->values()->toArray();
                    }

                    $processedChildren[] = $childData;
                }

                $result['children'] = array_values($processedChildren);
            }

            return $result;
        })->values()->toArray();

        return response()->json($config);
    }

    /**
     * Get table data for a specific prodi
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode Table code
     * @return \Illuminate\Http\JsonResponse
     */
    public function getData(Request $request, $tableCode)
    {
        $prodiId = $request->input('prodiId') ?? Auth::user()->prodiId;

        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $data = LkpsData::where('kodeTabel', $tableCode)->first();

        return response()->json([
            'tableCode' => $tableCode,
            'data' => $data ? $data->data : [],
            'nilai' => $data ? $data->nilai : null,
            'detailNilai' => $data ? $data->detailNilai : null
        ]);
    }

    /**
     * Save table data
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode Table code
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveData(Request $request, $tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'data' => 'required|array',
            'nilai' => 'nullable|numeric',
            'detailNilai' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->input('data');
        $nilai = $request->input('nilai');
        $detailNilai = $request->input('detailNilai', []);

        try {
            $lkpsData = LkpsData::saveData(
                $tableCode,
                $data,
                $nilai,
                $detailNilai
            );

            return response()->json([
                'message' => 'Data saved successfully',
                'nilai' => $nilai
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate score for a table based on provided data
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode Table code
     * @return \Illuminate\Http\JsonResponse
     */
    public function calculateScore(Request $request, $tableCode)
    {
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $data = $request->input('data', []);

        // Validate data format
        if (!is_array($data)) {
            return response()->json(['message' => 'Invalid data format'], 400);
        }

        // For now, we'll return a placeholder since the calculation logic
        // would need to be implemented based on your specific requirements
        $nilai = 0;
        $detailNilai = [
            'formula_used' => 'Default calculation',
            'max_score' => 4,
            'components' => []
        ];

        return response()->json([
            'nilai' => $nilai,
            'detailNilai' => $detailNilai,
            'tableCode' => $tableCode
        ]);
    }

    /**
     * Update a table
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTable(Request $request, $tableCode)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'judul' => 'sometimes|string',
            'barisAwalExcel' => 'nullable|integer'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $table->update($request->only(['judul', 'barisAwalExcel']));

        return response()->json([
            'message' => 'Table updated successfully',
            'table' => $table
        ]);
    }

    /**
     * Delete a table
     * 
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTable($tableCode)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Delete all columns for this table
        LkpsColumn::where('kodeTabel', $tableCode)->delete();

        // Delete all data for this table
        LkpsData::where('kodeTabel', $tableCode)->delete();

        // Delete the table
        $table->delete();

        return response()->json(['message' => 'Table deleted successfully']);
    }
}