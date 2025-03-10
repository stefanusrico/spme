<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Strata;

class StrataController extends Controller
{
    /**
     * Tampilkan daftar strata.
     */
    public function index()
    {
        $strata = Strata::get();
        return response()->json([
            'status' => 'success',
            'data' => $strata
        ], 200);
    }

    /**
     * Simpan data strata baru.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|unique:strata,name|max:255',
            ]);

            $existData = Strata::where('name', $request->name)->first();
            if($existData){
                return response()->json([
                    'message' => "Gagal Menambahkan strata {$request->name} karena duplikasi!",
                    'data' => $request->name
                ], 201);
            }
            
            $strata = Strata::create([
                'name' => $request->name,
            ]);

            return response()->json([
                'message' => 'Strata berhasil ditambahkan!',
                'data' => $strata
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal menambahkan strata!',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Tampilkan detail strata berdasarkan ID.
     */
    public function show($id)
    {
        $strata = Strata::findOrFail($id);
        return response()->json($strata);
    }

    /**
     * Perbarui data strata berdasarkan ID.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|unique:strata,name,' . $id . '|max:255',
        ]);

        $strata = Strata::findOrFail($id);
        $strata->update([
            'name' => $request->name,
        ]);

        return response()->json([
            'message' => 'Strata berhasil diperbarui!',
            'data' => $strata
        ]);
    }

    /**
     * Hapus strata berdasarkan ID.
     */
    public function destroy($id)
    {
        $strata = Strata::findOrFail($id);
        $strata->delete();

        return response()->json([
            'message' => 'Strata berhasil dihapus!',
        ]);
    }
}
