<?php

namespace App\Http\Controllers\Lkps;

use App\Http\Controllers\Controller;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsColumn;
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
        $table = LkpsTable::where('kode', $tableCode)->first();

        if (!$table) {
            return response()->json([
                'message' => 'Table not found',
                'details' => ['table_code' => $tableCode]
            ], 404);
        }

        $validator = \Validator::make($request->all(), [
            'indeksData' => [
                'required',
                'string',
                'regex:/^[a-zA-Z0-9_]+$/' // Ensure only alphanumeric and underscore
            ],
            'judul' => 'required|string|max:255',
            'type' => 'required|string|in:text,number,boolean,date,url,group',
            'lebar' => 'nullable|integer|min:50|max:500', // Optional reasonable width constraints
            'indeksExcel' => 'nullable|integer|min:1',
            'order' => 'required|integer|min:1',
            'align' => 'nullable|string|in:left,center,right',
            'isGroup' => 'required|boolean',
            'parentId' => 'nullable|string'
        ], [
            'indeksData.regex' => 'Data index must contain only letters, numbers, and underscores',
            'lebar.min' => 'Minimum column width is 50',
            'lebar.max' => 'Maximum column width is 500',
            'order.min' => 'Minimum order is 1',
            'indeksExcel.min' => 'Minimum Excel index is 1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        // Check if column indeksData already exists in this table
        $existingColumn = LkpsColumn::where('kodeTabel', $tableCode)
            ->where('indeksData', $request->indeksData)
            ->first();

        if ($existingColumn) {
            return response()->json([
                'message' => 'Column with this indeksData already exists in the table',
                'existing_column' => $existingColumn
            ], 422);
        }

        // If parentId is provided, do thorough checks
        if ($request->filled('parentId')) {
            $parentColumn = LkpsColumn::find($request->parentId);

            if (!$parentColumn) {
                return response()->json([
                    'message' => 'Parent column not found',
                    'details' => ['parentId' => $request->parentId]
                ], 404);
            }

            if (!$parentColumn->isGroup) {
                return response()->json([
                    'message' => 'Selected parent column is not a group column',
                    'details' => ['parentId' => $request->parentId]
                ], 422);
            }

            if ($parentColumn->kodeTabel !== $tableCode) {
                return response()->json([
                    'message' => 'Parent column belongs to a different table',
                    'details' => [
                        'parent_table_code' => $parentColumn->kodeTabel,
                        'current_table_code' => $tableCode
                    ]
                ], 422);
            }
        }

        try {
            $columnData = $request->only([
                'indeksData',
                'judul',
                'type',
                'lebar',
                'indeksExcel',
                'order',
                'align',
                'isGroup',
                'parentId'
            ]);
            $columnData['kodeTabel'] = $tableCode;

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
            'judul' => 'sometimes|string',
            'type' => 'sometimes|string|in:text,number,boolean,date,url,group',
            'lebar' => 'nullable|integer',
            'indeksExcel' => 'nullable|integer',
            'order' => 'sometimes|integer',
            'align' => 'nullable|string|in:left,center,right',
            'isGroup' => 'sometimes|boolean',
            'parentId' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // If changing parentId, check if new parent exists and is a group
        if ($request->has('parentId') && $request->parentId !== $column->parentId) {
            // If parentId is null, that's okay (making it a top-level column)
            if ($request->parentId) {
                $parentColumn = LkpsColumn::find($request->parentId);

                if (!$parentColumn) {
                    return response()->json(['message' => 'Parent column not found'], 404);
                }

                if (!$parentColumn->isGroup) {
                    return response()->json(['message' => 'Parent column is not a group'], 422);
                }

                if ($parentColumn->kodeTabel !== $column->kodeTabel) {
                    return response()->json(['message' => 'Parent column belongs to a different table'], 422);
                }

                // Check for circular reference
                if ($parentColumn->parentId === $column->_id) {
                    return response()->json(['message' => 'Circular reference detected'], 422);
                }
            }
        }

        // Check if making a group column into a non-group would orphan children
        if ($column->isGroup && $request->has('isGroup') && !$request->isGroup) {
            $childCount = LkpsColumn::where('parentId', $column->_id)->count();

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
        $childCount = LkpsColumn::where('parentId', $column->_id)->count();

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

            if ($column && $column->kodeTabel === $tableCode) {
                $column->order = $columnData['order'];
                $column->save();
            }
        }

        return response()->json(['message' => 'Column order updated successfully']);
    }
}