<?php

namespace App\Http\Controllers\Data;

use App\Models\Data\SyaratPerluTerakreditasi;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyaratPerluTerakreditasiController extends Controller
{
    public function getSyaratPerluTerakreditasi($lamId, $strataId)
    {
        try {
            // Validasi request
            if (!$lamId || !$strataId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'lamId dan strataId wajib diisi'
                ], 400);
            }

            // $lamIdString = $this->convertObjectIdToString($lamId);
            // $strataIdString = $this->convertObjectIdToString($strataId);

            $data = SyaratPerluTerakreditasi::where('lamId', $lamId)
                ->where('strataId', $strataId)
                ->get()
                ->sortBy(fn ($item) => (int) $item->no)
                ->values();

            return response()->json([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : []
            ], 500);
        }
    }
    
    public function updateSyaratPerluTerakreditasi(Request $request, $id)
    {
        try {
            $syaratPerluPeringkat = SyaratPerluTerakreditasi::findOrFail($id);

            if (!$syaratPerluPeringkat) {
                return response()->json([
                    'status' => false,
                    'message' => 'Data tidak ditemukan.',
                ], 404);
            }
            $syaratPerluPeringkat->update($request->all());

            return response()->json([
                'message' => 'Data berhasil diupdate',
                'data' => $syaratPerluPeringkat,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Terjadi kesalahan saat memperbarui data.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteSyaratPerluTerakreditasi($id)
    {
        try {
            $syaratPerluPeringkat = SyaratPerluTerakreditasi::find($id);

            if (!$syaratPerluPeringkat) {
                return response()->json([
                    'status' => false,
                    'message' => 'Data tidak ditemukan.',
                ], 404);
            }

            $syaratPerluPeringkat->delete();

            return response()->json([
                'status' => true,
                'message' => 'Data berhasil dihapus.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Terjadi kesalahan saat menghapus data.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
