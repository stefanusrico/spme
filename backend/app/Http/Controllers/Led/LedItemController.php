<?php

namespace App\Http\Controllers\Led;

use App\Http\Controllers\Controller;
use App\Models\Led\LedItem;
use App\Models\Prodi\Prodi;
use App\Models\Lam\Lam;
use App\Traits\ObjectIdConversion;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;

class LedItemController extends Controller
{
    use ObjectIdConversion;
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

        $lamIdString = $this->convertObjectIdToString($lamId);
        $strataIdString = $this->convertObjectIdToString($strataId);

        \Log::info('Original IDs from Prodi:', [
            'lamId' => $lamId,
            'strataId' => $strataId,
            'lamIdType' => gettype($lamId),
            'strataIdType' => gettype($strataId)
        ]);

        \Log::info('Converted IDs for LedItem query:', [
            'lamIdString' => $lamIdString,
            'strataIdString' => $strataIdString,
            'lamIdStringType' => gettype($lamIdString),
            'strataIdStringType' => gettype($strataIdString)
        ]);

        // First attempt: search with both lamId and strataId as strings
        $ledItem = LedItem::where('lamId', $lamIdString)
            ->where('strataId', $strataIdString)
            ->get();

        \Log::info('First query result count:', [$ledItem->count()]);

        // If empty, try different approaches
        if ($ledItem->isEmpty()) {
            \Log::info('First query empty, trying alternative approaches...');

            // Try with only strataId
            $ledItem = LedItem::where('strataId', $strataIdString)->get();
            \Log::info('Query with strataId only result count:', [$ledItem->count()]);

            if ($ledItem->isEmpty()) {
                // Try to find BAN-PT LAM and search with it
                $lamBanpt = Lam::where('name', 'BAN-PT')->first();

                if ($lamBanpt) {
                    $lamBanptIdString = $this->convertObjectIdToString($lamBanpt->id);

                    \Log::info('Searching with BAN-PT LAM:', [
                        'lamBanptId' => $lamBanpt->id,
                        'lamBanptIdString' => $lamBanptIdString
                    ]);

                    // Check if current lamId is same as BAN-PT lamId
                    if ($lamIdString === $lamBanptIdString) {
                        // Same LAM, try with strataId only (already tried above)
                        \Log::info('LAM is already BAN-PT, strataId-only search already performed');
                    } else {
                        // Different LAM, try with BAN-PT LAM and strataId
                        $ledItem = LedItem::where('lamId', $lamBanptIdString)
                            ->where('strataId', $strataIdString)
                            ->get();

                        \Log::info('Query with BAN-PT LAM and strataId result count:', [$ledItem->count()]);
                    }
                }
            }

            // If still empty, try more flexible approaches
            if ($ledItem->isEmpty()) {
                \Log::info('All specific queries failed, trying flexible approaches...');

                // Debug: Show all available lamIds and strataIds in LedItem
                $allLamIds = LedItem::distinct('lamId')->pluck('lamId')->toArray();
                $allStrataIds = LedItem::distinct('strataId')->pluck('strataId')->toArray();

                \Log::info('All available lamIds in LedItem:', $allLamIds);
                \Log::info('All available strataIds in LedItem:', $allStrataIds);

                // Try case-insensitive search for strataId
                $ledItemCaseInsensitive = LedItem::whereRaw("LOWER(strataId) = ?", [strtolower($strataIdString)])->get();
                \Log::info('Case insensitive strataId search result count:', [$ledItemCaseInsensitive->count()]);

                if ($ledItemCaseInsensitive->isNotEmpty()) {
                    $ledItem = $ledItemCaseInsensitive;
                }
            }
        }

        if ($ledItem->isEmpty()) {
            // Get debug info for the error message
            $allLamIds = LedItem::distinct('lamId')->pluck('lamId')->take(5)->toArray();
            $allStrataIds = LedItem::distinct('strataId')->pluck('strataId')->take(5)->toArray();

            return response()->json([
                'status' => 'error',
                'message' => "Tidak ada data LED Item yang ditemukan",
                'debug_info' => [
                    'searched_lamId' => $lamIdString,
                    'searched_strataId' => $strataIdString,
                    'sample_available_lamIds' => $allLamIds,
                    'sample_available_strataIds' => $allStrataIds,
                    'total_ledItems' => LedItem::count()
                ]
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'total_data' => $ledItem->count(),
            'search_info' => [
                'lamId_used' => $lamIdString,
                'strataId_used' => $strataIdString
            ],
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