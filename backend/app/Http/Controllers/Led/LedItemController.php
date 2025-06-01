<?php

namespace App\Http\Controllers\Led;

use App\Http\Controllers\Controller;
use App\Models\Led\LedItem;
use App\Models\Prodi\Prodi;
use App\Models\Lam\Lam;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;

class LedItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(LedItem::all());
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
                'kriteria' => 'required|string',
                'no' => 'required|string',
                'sub' => 'required|string',

                'details' => 'nullable|array',
                'type' => 'nullable|array',
                'seq' => 'nullable|string',
                'reference' => 'nullable|string',
            ]);

            $ledItem = LedItem::create($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Data berhasil disimpan.',
                'data' => $ledItem
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
        $ledItem = LedItem::find($id);
        if (!$ledItem) {
            return response()->json(['message' => 'Data not found'], 404);
        }
        return response()->json($ledItem);
    }

    public function showNoSub(string $no, string $sub)
    {
        $ledItem = LedItem::where('no', $no)
            ->where('sub', $sub)
            ->first();
        if (!$ledItem) {
            return response()->json([
                'status' => 'error',
                'message' => 'tidak ada data dengan no dan sub tersebut'
            ], 500);
        }
        return response()->json([
            'status' => 'success',
            'data' => $ledItem
        ], 200);
    }

    public function getLedItemByProdi($prodiId)
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

        \Log::info('lamId:', [$lamId]);
        \Log::info('strataId:', [$strataId]);

        $ledItem = LedItem::where('lamId',$lamId)
                  ->where('strataId', $strataId)
                  ->get();
        
        if ($ledItem->isEmpty()) {
            $lamBanpt = Lam::where('name', 'BAN-PT')->first();
            
            if ($lamBanpt) {
                \Log::info('Pencarian ulang dengan lamId BAN-PT:', [$lamBanpt->id]);

                // Cek apakah lamId saat ini memang sama dengan lamBanpt->id
                if ((string) $lamId === (string) $lamBanpt->id) {
                    // Jika sama, cari berdasarkan strataId saja
                    $ledItem = LedItem::where('strataId', $strataId)->get();
                } else {
                    // Jika berbeda, cari berdasarkan lamBanpt dan strataId
                    $ledItem = LedItem::where('lamId', new ObjectId($lamBanpt->id))
                        ->where('strataId', $strataId)
                        ->get();
                }
            }
        }

        if ($ledItem->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => "Tidak ada data dengan lamId : {$lamId} dan strataId : {$strataId} tersebut"
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'total_data' => $ledItem->count(),
            'data' => $ledItem
        ], 200);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $ledItem = LedItem::find($id);
        if (!$ledItem) {
            return response()->json(['message' => 'Data not found'], 404);
        }

        $ledItem->update($request->all());
        return response()->json($ledItem);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $ledItem = LedItem::find($id);
        if (!$ledItem) {
            return response()->json(['message' => 'Data not found'], 404);
        }

        $ledItem->delete();
        return response()->json(['message' => 'Data deleted successfully']);
    }
}