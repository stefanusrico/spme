<?php

namespace App\Http\Controllers;

use App\Models\Matriks;
use App\Models\Prodi;
use Illuminate\Http\Request;

class MatriksController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Matriks::all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'lamId' => 'required|string',
                'strataId' => 'required|string',
                'c' => 'required|string',
                'no' => 'required|string',
                'sub' => 'required|string',
                'details' => 'nullable|array',
            ]);

            $matriks = Matriks::create($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Data berhasil disimpan.',
                'data' => $matriks
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal.',
                $request->input('data'),
                'errors' => $e->errors()
            ], 422);
        }
    }


    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $matriks = Matriks::find($id);
        if (!$matriks) {
            return response()->json(['message' => 'Data not found'], 404);
        }
        return response()->json($matriks);
    }

    public function showNoSub(string $no, string $sub)
    {
        $matriks = Matriks::where('no', $no)
            ->where('sub', $sub)
            ->first();
        if (!$matriks) {
            return response()->json([
                'status' => 'error',
                'message' => 'tidak ada data dengan no dan sub tersebut'
            ], 500);
        }
        return response()->json([
            'status' => 'success',
            'data' => $matriks
        ], 200);
    }

    public function getMatriksByProdi($prodiId)
    {
        $prodi = Prodi::where('id', $prodiId)->first();

        if (!$prodi) {
            return response()->json([
                'status' => 'error',
                'message' => 'Prodi tidak ditemukan'
            ], 404);
        }

        $lamId = $prodi->lamId;
        $strataId = $prodi->strataId;

        $matriks = Matriks::where('lamId', $lamId)
            ->where('strataId', $strataId)
            ->get();

        if ($matriks->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak ada data dengan lamId dan strataId tersebut'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'total_data' => $matriks->count(),
            'data' => $matriks
        ], 200);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $matriks = Matriks::find($id);
        if (!$matriks) {
            return response()->json(['message' => 'Data not found'], 404);
        }

        $matriks->update($request->all());
        return response()->json($matriks);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $matriks = Matriks::find($id);
        if (!$matriks) {
            return response()->json(['message' => 'Data not found'], 404);
        }

        $matriks->delete();
        return response()->json(['message' => 'Data deleted successfully']);
    }
}