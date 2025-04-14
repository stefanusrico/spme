<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LkpsTable;
use App\Models\LkpsColumn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LkpsColumnController extends Controller
{
    /**
     * Get all columns for a table
     * 
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function getColumns($tableCode)
    {
        $table = LkpsTable::where('code', $tableCode)->first();

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

        return response()->json($columns);
    }

    /**
     * Add a new column to a table
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function addColumn(Request $request, $tableCode)
    {
        // Validate table existence first
        $table = LkpsTable::where('code', $tableCode)->first();

        if (!$table) {
            return response()->json([
                'message' => 'Table not found',
                'details' => ['table_code' => $tableCode]
            ], 404);
        }

        $validator = \Validator::make($request->all(), [
            'data_index' => [
                'required',
                'string',
                'regex:/^[a-zA-Z0-9_]+$/' // Ensure only alphanumeric and underscore
            ],
            'title' => 'required|string|max:255',
            'type' => 'required|string|in:text,number,boolean,date,url,group',
            'width' => 'nullable|integer|min:50|max:500', // Optional reasonable width constraints
            'excel_index' => 'nullable|integer|min:1',
            'order' => 'required|integer|min:1',
            'align' => 'nullable|string|in:left,center,right',
            'is_group' => 'required|boolean',
            'parent_id' => 'nullable|string'
        ], [
            'data_index.regex' => 'Data index must contain only letters, numbers, and underscores',
            'width.min' => 'Minimum column width is 50',
            'width.max' => 'Maximum column width is 500',
            'order.min' => 'Minimum order is 1',
            'excel_index.min' => 'Minimum Excel index is 1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        // Check if column data_index already exists in this table
        $existingColumn = LkpsColumn::where('table_code', $tableCode)
            ->where('data_index', $request->data_index)
            ->first();

        if ($existingColumn) {
            return response()->json([
                'message' => 'Column with this data_index already exists in the table',
                'existing_column' => $existingColumn
            ], 422);
        }

        // If parent_id is provided, do thorough checks
        if ($request->filled('parent_id')) {
            $parentColumn = LkpsColumn::find($request->parent_id);

            if (!$parentColumn) {
                return response()->json([
                    'message' => 'Parent column not found',
                    'details' => ['parent_id' => $request->parent_id]
                ], 404);
            }

            if (!$parentColumn->is_group) {
                return response()->json([
                    'message' => 'Selected parent column is not a group column',
                    'details' => ['parent_id' => $request->parent_id]
                ], 422);
            }

            if ($parentColumn->table_code !== $tableCode) {
                return response()->json([
                    'message' => 'Parent column belongs to a different table',
                    'details' => [
                        'parent_table_code' => $parentColumn->table_code,
                        'current_table_code' => $tableCode
                    ]
                ], 422);
            }
        }

        try {
            $columnData = $request->only([
                'data_index',
                'title',
                'type',
                'width',
                'excel_index',
                'order',
                'align',
                'is_group',
                'parent_id'
            ]);
            $columnData['table_code'] = $tableCode;

            $column = LkpsColumn::create($columnData);

            return response()->json([
                'message' => 'Column added successfully',
                'column' => $column
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Column creation error', [
                'message' => $e->getMessage(),
                'data' => $columnData
            ]);

            return response()->json([
                'message' => 'Failed to create column',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a column
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateColumn(Request $request, $id)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $column = LkpsColumn::find($id);

        if (!$column) {
            return response()->json(['message' => 'Column not found'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'title' => 'sometimes|string',
            'type' => 'sometimes|string|in:text,number,boolean,date,url,group',
            'width' => 'nullable|integer',
            'excel_index' => 'nullable|integer',
            'order' => 'sometimes|integer',
            'align' => 'nullable|string|in:left,center,right',
            'is_group' => 'sometimes|boolean',
            'parent_id' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // If changing parent_id, check if new parent exists and is a group
        if ($request->has('parent_id') && $request->parent_id !== $column->parent_id) {
            // If parent_id is null, that's okay (making it a top-level column)
            if ($request->parent_id) {
                $parentColumn = LkpsColumn::find($request->parent_id);

                if (!$parentColumn) {
                    return response()->json(['message' => 'Parent column not found'], 404);
                }

                if (!$parentColumn->is_group) {
                    return response()->json(['message' => 'Parent column is not a group'], 422);
                }

                if ($parentColumn->table_code !== $column->table_code) {
                    return response()->json(['message' => 'Parent column belongs to a different table'], 422);
                }

                // Check for circular reference
                if ($parentColumn->parent_id === $column->_id) {
                    return response()->json(['message' => 'Circular reference detected'], 422);
                }
            }
        }

        // Check if making a group column into a non-group would orphan children
        if ($column->is_group && $request->has('is_group') && !$request->is_group) {
            $childCount = LkpsColumn::where('parent_id', $column->_id)->count();

            if ($childCount > 0) {
                return response()->json([
                    'message' => 'Cannot change a group column with children to a non-group'
                ], 422);
            }
        }

        $column->update($request->all());

        return response()->json([
            'message' => 'Column updated successfully',
            'column' => $column
        ]);
    }

    /**
     * Delete a column
     * 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteColumn($id)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $column = LkpsColumn::find($id);

        if (!$column) {
            return response()->json(['message' => 'Column not found'], 404);
        }

        // Check if this is a group column with children
        $childCount = LkpsColumn::where('parent_id', $column->_id)->count();

        if ($childCount > 0) {
            return response()->json([
                'message' => 'Cannot delete a group column with children'
            ], 422);
        }

        $column->delete();

        return response()->json(['message' => 'Column deleted successfully']);
    }

    /**
     * Batch update column order
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $tableCode
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateColumnOrder(Request $request, $tableCode)
    {
        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = \Validator::make($request->all(), [
            'columns' => 'required|array',
            'columns.*.id' => 'required|string',
            'columns.*.order' => 'required|integer'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $columns = $request->input('columns');

        foreach ($columns as $columnData) {
            $column = LkpsColumn::find($columnData['id']);

            if ($column && $column->table_code === $tableCode) {
                $column->order = $columnData['order'];
                $column->save();
            }
        }

        return response()->json(['message' => 'Column order updated successfully']);
    }
}