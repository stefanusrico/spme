<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Color;

class ColorController extends Controller
{
    public function index()
    {
        $colors = Color::all();

        return response()->json([
            'status' => 'success',
            'message' => 'Colors retrieved successfully',
            'data' => $colors
        ], 200);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                // 'label' => 'required|unique:colors|string',
                'value' => 'required|string|regex:/^#([0-9A-Fa-f]{3}){1,2}$/',
                'rangeStart' => 'required|numeric',
                'rangeEnd' => 'required|numeric|gte:rangeStart'
            ]);

            // Cek apakah rangeStart atau rangeEnd berada dalam jangkauan range yang sudah ada
            $exists = Color::where(function ($query) use ($request) {
                $query->whereBetween('rangeStart', [$request->rangeStart, $request->rangeEnd])
                      ->orWhereBetween('rangeEnd', [$request->rangeStart, $request->rangeEnd])
                      ->orWhere(function ($query) use ($request) {
                          $query->where('rangeStart', '<=', $request->rangeStart)
                                ->where('rangeEnd', '>=', $request->rangeEnd);
                      });
            })->exists();

            if ($exists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'RangeStart dan RangeEnd tidak boleh berada dalam jangkauan yang sudah ada',
                    'data' => null
                ], 422);
            }

            // Simpan data jika tidak ada konflik
            $color = Color::create($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Color created successfully',
                'data' => $color
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function show($id)
    {
        $color = Color::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Color retrieved successfully',
            'data' => $color
        ], 200);
    }

    public function update(Request $request, $id)
    {
        try {
            $color = Color::findOrFail($id);

            $request->validate([
                // 'label' => 'sometimes|required|unique:colors|string',
                'value' => 'sometimes|required|string|regex:/^#([0-9A-Fa-f]{3}){1,2}$/',
                'rangeStart' => 'sometimes|required|numeric',
                'rangeEnd' => 'sometimes|required|numeric|gte:rangeStart'
            ]);

            $color->update($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Color updated successfully',
                'data' => $color
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $color = Color::findOrFail($id);
            $color->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Color deleted successfully',
                'data' => null
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}
