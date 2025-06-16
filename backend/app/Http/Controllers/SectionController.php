<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lkps;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SectionController extends Controller
{
    private function storeSectionData(Request $request, $prodiId, $sectionId, $sectionName)
    {
        $data = $request->input('data');

        $validator = Validator::make($request->all(), [
            'data' => 'required|array', // Validasi data harus berupa array
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 400);
        }

        try {
            $lkps = Lkps::where('prodiId', $prodiId)->first();

            if ($lkps) {
                $sectionIndex = null;
                foreach ($lkps->sections as $index => $section) {
                    if ($section['sectionId'] == $sectionId) {
                        $sectionIndex = $index;
                        break;
                    }
                }

                if ($sectionIndex !== null) {
                    $lkps->sections[$sectionIndex]['data'] = $data;
                } else {
                    $lkps->sections[] = [
                        'sectionId' => $sectionId,
                        'data' => $data,
                    ];
                }
                $lkps->save();
            } else {
                $lkps = new Lkps();
                $lkps->prodiId = $prodiId;
                $lkps->sections = [
                    ['sectionId' => $sectionId, 'data' => $data],
                ];
                $lkps->save();
            }

            Log::info("Menyimpan data Section {$sectionName} untuk prodi {$prodiId}:", $data);
            return response()->json(['message' => "Data Section {$sectionName} berhasil disimpan"], 200);
        } catch (\Exception $e) {
            Log::error("Gagal menyimpan data Section {$sectionName} untuk prodi {$prodiId}:", ['error' => $e->getMessage()]);
            return response()->json(['error' => "Gagal menyimpan data Section {$sectionName}", 'details' => $e->getMessage()], 500);
        }
    }

    // Fungsi-fungsi spesifik untuk setiap section/sub-section
    public function storeSection1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '1', '1');
    }

    public function storeSection2a(Request $request, $prodiId) //Contoh sub section
    {
        return $this->storeSectionData($request, $prodiId, '2a', '2a');
    }

    public function storeSection2b(Request $request, $prodiId) //Contoh sub section
    {
        return $this->storeSectionData($request, $prodiId, '2b', '2b');
    }

    // ... fungsi untuk section lainnya (hingga Section 8 dan sub-sectionnya)

    public function storeSection3a1 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3a1', '3a1');
    }

    public function storeSection3a2 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3a2', '3a2');
    }

    public function storeSection3a3 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3a3', '3a3');
    }

    public function storeSection3a4 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3a4', '3a4');
    }

    public function storeSection3a5 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3a5', '3a5');
    }

    public function storeSection3b1 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b1', '3b1');
    }

    public function storeSection3b2 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b2', '3b2');
    }

    public function storeSection3b3 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b3', '3b3');
    }

    public function storeSection3b4 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b4', '3b4');
    }

    public function storeSection3b5 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b5', '3b5');
    }

    public function storeSection3b6 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b6', '3b6');
    }

    public function storeSection3b7 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b7', '3b7');
    }

    public function storeSection3b42 (Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '3b42', '3b42');
    }

    public function storeSection4(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '4', '4');
    }
    
    public function storeSection5a(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '5a', '5a');
    }
    
    public function storeSection5b(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '5b', '5b');
    }
    
    public function storeSection5c(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '5c', '5c');
    }
    
    public function storeSection6a(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '6a', '6a');
    }
    
    public function storeSection6b(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '6b', '6b');
    }
    
    public function storeSection7(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '7', '7');
    }
    
    public function storeSection8(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8', '8');
    }
    
    public function storeSection8b1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8b1', '8b1');
    }
    
    public function storeSection8b2(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8b2', '8b2');
    }
    
    public function storeSection8c1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8c1', '8c1');
    }
    
    public function storeSection8c2(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8c2', '8c2');
    }
    
    public function storeSection8c3(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8c3', '8c3');
    }
    
    public function storeSection8c4(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8c4', '8c4');
    }
    
    public function storeSection8d1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8d1', '8d1');
    }
    
    public function storeSection8d2(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8d2', '8d2');
    }
    
    public function storeSection8d3(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8d3', '8d3');
    }
    
    public function storeSection8d4(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8d4', '8d4');
    }
    
    public function storeSection8e1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8e1', '8e1');
    }
    
    public function storeSection8e2(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8e2', '8e2');
    }
    
    public function storeSection8f1(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8f1', '8f1');
    }
    
    public function storeSection8f2(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8f2', '8f2');
    }
    
    public function storeSection8f3(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8f3', '8f3');
    }
    
    public function storeSection8f4(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8f4', '8f4');
    }
    
    public function storeSection8f5(Request $request, $prodiId)
    {
        return $this->storeSectionData($request, $prodiId, '8f5', '8f5');
    }
    


    public function index(Request $request, $prodiId)
    {
       // ... (kode index sama seperti sebelumnya)
    }
}