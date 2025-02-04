<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProdiController extends Controller
{

    public function index()
    {
        return response()->json(Prodi::with('jadwalLam')->get());
    }

    public function show($id)
    {
        $prodi = Prodi::find($id);
        return $prodi ? response()->json($prodi) : response()->json(['message' => 'Prodi not found'], 404);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'nomorSK' => 'required|string|max:255',
                'tahunSK' => 'required|integer',
                'peringkat' => 'required|string|max:15',
                'tanggalKedaluwarsa' => 'required|date',
                'tanggalAkhirSubmit' => 'nullable|date'
            ]);

            return response()->json(Prodi::create($request->validated()), 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e instanceof ValidationException ? 'Validation Error' : 'Server Error',
                'message' => $e instanceof ValidationException ? $e->errors() : $e->getMessage()
            ], $e instanceof ValidationException ? 422 : 500);
        }
    }

    public function update(Request $request, $id)
    {
        $prodi = Prodi::find($id);
        if (!$prodi)
            return response()->json(['message' => 'Prodi not found'], 404);

        $prodi->update($request->only([
            'name',
            'nomorSK',
            'tahunSK',
            'peringkat',
            'tanggalKedaluwarsa',
            'tanggalAkhirSubmit'
        ]));

        return response()->json($prodi);
    }

    public function destroy($id)
    {
        $prodi = Prodi::find($id);
        if (!$prodi)
            return response()->json(['message' => 'Prodi not found'], 404);

        $prodi->delete();
        return response()->json(['message' => 'Prodi deleted successfully']);
    }

    public function countByPeringkat()
    {
        try {
            $peringkatCount = Cache::remember('peringkat_count', 60, function () {
                return array_values(Prodi::all()->groupBy('peringkat')
                    ->map(function ($group, $peringkat) {
                        return [
                            'peringkat' => $peringkat,
                            'count' => $group->count()
                        ];
                    })->toArray());
            });

            return response()->json($peringkatCount);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}