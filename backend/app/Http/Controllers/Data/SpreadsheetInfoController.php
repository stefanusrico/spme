<?php

namespace App\Http\Controllers\Data;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SpreadsheetInfo;

class SpreadsheetInfoController extends Controller
{
    /**
     * Menampilkan semua data SpreadsheetInfo.
     */
    public function index()
    {
        $spreadsheetInfo = SpreadsheetInfo::with(['lam', 'strata'])->get();
        return response()->json([
            'status' => 'success',
            'data' => $spreadsheetInfo
        ], 200);
    }

    /**
     * Menyimpan data baru ke dalam koleksi strata.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string',
                'lamId' => 'required|string',
                'strataId' => 'required|string',
                'spreadsheetId' => 'required|string',
                'sheets' => 'required|array',
            ]);

            $existingData = SpreadsheetInfo::where('name', $request->name)
                ->where('lamId', $request->lamId)
                ->where('strataId', $request->strataId)
                ->first();
            if ($existingData) {
                return response()->json([
                    'status' => 'Gagal menambahkan spreadsheet info karena sudah ada',
                    'data' => $request->name
                ], 400);
            }

            $spreadsheetInfo = SpreadsheetInfo::create($request->all());

            return response()->json([
                'status' => 'berhasil disimpan',
                'data' => $spreadsheetInfo
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal menambahkan spreadsheet info!',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Menampilkan data berdasarkan ID.
     */
    public function show($id)
    {
        $spreadsheetInfo = SpreadsheetInfo::with(['lam', 'strata'])->find($id);

        if (!$spreadsheetInfo) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json($spreadsheetInfo);
    }

    /**
     * Mengupdate data berdasarkan ID.
     */
    public function update(Request $request, $id)
    {
        $spreadsheetInfo = SpreadsheetInfo::find($id);

        if (!$spreadsheetInfo) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $spreadsheetInfo->update($request->all());

        return response()->json(['message' => 'Data berhasil diperbarui', 'data' => $spreadsheetInfo]);
    }

    /**
     * Menghapus data berdasarkan ID.
     */
    public function destroy($id)
    {
        $spreadsheetInfo = SpreadsheetInfo::find($id);

        if (!$spreadsheetInfo) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $spreadsheetInfo->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}