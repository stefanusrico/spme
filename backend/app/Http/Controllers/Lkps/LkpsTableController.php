<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use App\Models\Lkps\LkpsSection;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsColumn;
use App\Models\Lkps\LkpsData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LkpsTableController extends Controller
{
    /**
     * Get all tables for a section
     * 
     * @param string $sectionCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTables($sectionCode)
    {
        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $tables = LkpsTable::where('section_code', $sectionCode)
            ->orderBy('order')
            ->get();

        return response()->json($tables);
    }

    /**
     * Get a specific table with columns
     * 
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableWithColumns($sectionCode, $tableCode)
    {
        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Get all columns for this table
        $allColumns = LkpsColumn::where('table_code', $tableCode)->get();

        // Organize columns by parent/child relationship
        $parentColumns = $allColumns->where('parent_id', null)->sortBy('order');

        $columns = $parentColumns->map(function ($column) use ($allColumns) {
            $result = $column->toArray();

            if ($column->is_group) {
                $result['children'] = $allColumns->where('parent_id', $column->_id)
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
     * Add a new table to a section
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $sectionCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function addTable(Request $request, $sectionCode)
    {
        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'code' => 'required|string',
            'title' => 'required|string',
            'excel_start_row' => 'nullable|integer',
            'pagination' => 'nullable|array',
            'order' => 'required|integer',
            'used_in_formula' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if table code already exists
        $existingTable = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $request->code)
            ->exists();

        if ($existingTable) {
            return response()->json([
                'message' => 'Table code already exists for this section'
            ], 422);
        }

        $tableData = $request->all();
        $tableData['section_code'] = $sectionCode;

        $table = LkpsTable::create($tableData);

        return response()->json([
            'message' => 'Table added successfully',
            'table' => $table
        ]);
    }

    /**
     * Update a table
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTable(Request $request, $sectionCode, $tableCode)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'title' => 'sometimes|string',
            'excel_start_row' => 'nullable|integer',
            'pagination' => 'nullable|array',
            'order' => 'sometimes|integer',
            'used_in_formula' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $table->update($request->all());

        return response()->json([
            'message' => 'Table updated successfully',
            'table' => $table
        ]);
    }

    /**
     * Delete a table
     * 
     * @param string $sectionCode
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTable($sectionCode, $tableCode)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $table = LkpsTable::where('section_code', $sectionCode)
            ->where('code', $tableCode)
            ->first();

        if (!$table) {
            return response()->json(['message' => 'Table not found'], 404);
        }

        // Delete all columns for this table
        LkpsColumn::where('table_code', $tableCode)->delete();

        // Delete all data for this table
        LkpsData::where('section_code', $sectionCode)
            ->where('table_code', $tableCode)
            ->delete();

        // Delete the table
        $table->delete();

        return response()->json(['message' => 'Table deleted successfully']);
    }
}