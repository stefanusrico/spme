<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Rumus;

class RumusController extends Controller
{
    // Menampilkan semua data
    public function index()
    {
        return response()->json(Rumus::all());
    }

    // Menyimpan data baru
    public function store(Request $request)
    {
        $request->validate([
            'nomor' => 'required|string',
            'sub' => 'nullable|string',
            'formula_type' => 'required|string',
            'reference_type' => 'nullable|string',
            'reference_table' => 'nullable|string',
            'conditions' => 'nullable|array',
            'main_formula' => 'nullable|string',
            'parameters' => 'nullable|array',
            'description' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $rumus = Rumus::create($request->all());

        return response()->json($rumus, 201);
    }

    // Menampilkan data berdasarkan ID
    public function show($id)
    {
        $rumus = Rumus::find($id);
        if (!$rumus) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json($rumus);
    }

    // Menampilkan data berdasarkan nomor dan sub (opsional)
    public function showByNomor($nomor, $sub = null)
    {
        $query = Rumus::where('nomor', $nomor);

        if ($sub !== null) {
            $query->where('sub', $sub);
        }

        $rumus = $query->get();

        if ($rumus->isEmpty()) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        // Jika sub ditentukan, biasanya hanya ada satu hasil
        return response()->json($sub !== null ? $rumus->first() : $rumus);
    }

    // Menghitung skor berdasarkan rumus
    public function calculate(Request $request, $nomor, $sub = null)
    {
        $rumus = Rumus::getByIndicator($nomor, $sub);

        if (!$rumus) {
            return response()->json(['message' => 'Rumus tidak ditemukan'], 404);
        }

        $values = $request->all();
        $result = $rumus->calculateScore($values);

        if ($result === null) {
            return response()->json(['message' => 'Gagal menghitung skor. Periksa nilai input.'], 400);
        }

        return response()->json([
            'rumus' => $rumus,
            'input' => $values,
            'result' => $result
        ]);
    }

    // Memperbarui data
    public function update(Request $request, $id)
    {
        $rumus = Rumus::find($id);
        if (!$rumus) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'nomor' => 'string',
            'sub' => 'nullable|string',
            'formula_type' => 'string',
            'reference_type' => 'nullable|string',
            'reference_table' => 'nullable|string',
            'conditions' => 'nullable|array',
            'main_formula' => 'nullable|string',
            'parameters' => 'nullable|array',
            'description' => 'string',
            'notes' => 'nullable|string',
        ]);

        $rumus->update($validated);

        return response()->json($rumus);
    }

    // Menghapus data
    public function destroy($id)
    {
        $rumus = Rumus::find($id);
        if (!$rumus) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $rumus->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }

    // Mendapatkan rumus berdasarkan jenis referensi
    public function getByReferenceType($referenceType)
    {
        $rumus = Rumus::where('reference_type', $referenceType)->get();

        if ($rumus->isEmpty()) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json($rumus);
    }

    // Mendapatkan rumus berdasarkan tabel referensi
    public function getByReferenceTable($referenceTable)
    {
        $rumus = Rumus::where('reference_table', 'like', '%' . $referenceTable . '%')->get();

        if ($rumus->isEmpty()) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json($rumus);
    }
}