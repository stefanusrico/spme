<?php

namespace App\Http\Controllers\Data;

use App\Models\Data\SyaratPerluPeringkat;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyaratPerluPeringkatController extends Controller
{
    public function getSyaratPerluPeringkat($lamId, $strataId)
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

            $data = SyaratPerluPeringkat::where('lamId', $lamId)
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

    public function updateSyaratPerluPeringkat(Request $request, $id)
    {
        try {
            $syaratPerluPeringkat = SyaratPerluPeringkat::findOrFail($id);

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

    public function deleteSyaratPerluPeringkat($id)
    {
        try {
            $syaratPerluPeringkat = SyaratPerluPeringkat::find($id);

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
