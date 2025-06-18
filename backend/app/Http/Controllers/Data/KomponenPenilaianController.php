<?php

namespace App\Http\Controllers\Data;

use App\Http\Controllers\Controller;
use App\Models\Led\LedItem;
use App\Models\Data\Butir;
use App\Models\Data\SyaratPerluPeringkat;
use App\Models\Data\SyaratPerluTerakreditasi;
// use App\Models\Data\SpreadsheetInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use App\Traits\ObjectIdConversion;

class KomponenPenilaianController extends Controller
{
    /**
     * Menyimpan data LED item dari spreadsheet ke database.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function importLedItem(Request $request)
    {
        try {
            $spreadsheet_infos = $this->validateAndBuildSpreadsheetInfos($request);
            if ($spreadsheet_infos instanceof \Illuminate\Http\JsonResponse) return $spreadsheet_infos;
    
            return $this->processSpreadsheetData(
                $spreadsheet_infos,
                fn($data) => $this->transformDataLedItem($data),
                function ($data, $info) {
                    $filteredDetails = collect($data['Details'] ?? [])->map(fn($detail) => [
                        'seq' => $detail['Seq'] ?? null,
                        'type' => $detail['Type'] ?? null,
                        'reference' => $detail['Reference'] ?? null,
                    ])->toArray();
    
                    $existing = LedItem::where('no', $data['No.'])
                        ->where('sub', $data['Sub'])
                        ->where('lamId', $info['lamId'])
                        ->where('strataId', $info['strataId'])
                        ->first();
    
                    if ($existing) {
                        $existing->update([
                            'kriteria' => $data['C'],
                            'details' => $filteredDetails
                        ]);
                    } else {
                        LedItem::create([
                            'strataId' => $info['strataId'],
                            'lamId' => $info['lamId'],
                            'kriteria' => $data['C'],
                            'no' => $data['No.'],
                            'sub' => $data['Sub'],
                            'details' => $filteredDetails
                        ]);
                    }
                }
            );
        } catch (\Throwable $th) {
            return response()->json([
                'error' => 'Unexpected error in importLedItem',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function importBobotButir(Request $request)
    {
        try {
            $spreadsheet_infos = $this->validateAndBuildSpreadsheetInfos($request);
            if ($spreadsheet_infos instanceof \Illuminate\Http\JsonResponse) return $spreadsheet_infos;
    
            return $this->processSpreadsheetData(
                $spreadsheet_infos,
                fn($data) => $this->transformDataBobotButir($data),
                function ($data, $info) {
                    $existing = Butir::where('butir', $data['butir'])
                        ->where('lamId', $info['lamId'])
                        ->where('strataId', $info['strataId'])
                        ->first();
    
                    if ($existing) {
                        $existing->update([
                            'elemen' => $data['elemen'] ?? null,
                            'indikator' => $data['indikator'] ?? null,
                            'bobot' => $data['bobot'] ?? null,
                            'rumus' => $data['rumus'] ?? null,
                        ]);
                    } else {
                        Butir::create([
                            'strataId' => $info['strataId'],
                            'lamId' => $info['lamId'],
                            'butir' => $data['butir'] ?? null,
                            'elemen' => $data['elemen'] ?? null,
                            'indikator' => $data['indikator'] ?? null,
                            'bobot' => $data['bobot'] ?? null,
                            'rumus' => $data['rumus'] ?? null,
                        ]);
                    }
                }
            );
        } catch (\Throwable $th) {
            return response()->json([
                'error' => 'Unexpected error in importLedItem',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function importSyaratPerluPeringkat(Request $request)
    {
        try {
            $spreadsheet_infos = $this->validateAndBuildSpreadsheetInfos($request);
            if ($spreadsheet_infos instanceof \Illuminate\Http\JsonResponse) return $spreadsheet_infos;
    
            return $this->processSpreadsheetData(
                $spreadsheet_infos,
                fn($data) => $this->transformDataSyaratPerluPeringkat($data),
                function ($data, $info) {
                    $existing = SyaratPerluPeringkat::where('butir', $data['butir'])
                        ->where('lamId', $info['lamId'])
                        ->where('strataId', $info['strataId'])
                        ->first();
    
                    if ($existing) {
                        $existing->update([
                            'no' => $data['no'] ?? null,
                            'minimal_syarat_unggul' => $data['minimal_syarat_unggul'] ?? null,
                            'minimal_syarat_baik_sekali' => $data['minimal_syarat_baik_sekali'] ?? null,
                            'aspek_penilaian' => $data['aspek_penilaian'] ?? null,
                        ]);
                    } else {
                        SyaratPerluPeringkat::create([
                            'strataId' => $info['strataId'],
                            'lamId' => $info['lamId'],
                            'butir' => $data['butir'] ?? null,
                            'no' => $data['no'] ?? null,
                            'aspek_penilaian' => $data['aspek_penilaian'] ?? null,
                            'minimal_syarat_unggul' => $data['minimal_syarat_unggul'] ?? null,
                            'minimal_syarat_baik_sekali' => $data['minimal_syarat_baik_sekali'] ?? null,
                        ]);
                    }
                }
            );
        } catch (\Throwable $th) {
            return response()->json([
                'error' => 'Unexpected error in importLedItem',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function importSyaratPerluTerakreditasi(Request $request)
    {
        try {
            $spreadsheet_infos = $this->validateAndBuildSpreadsheetInfos($request);
            if ($spreadsheet_infos instanceof \Illuminate\Http\JsonResponse) return $spreadsheet_infos;
    
            return $this->processSpreadsheetData(
                $spreadsheet_infos,
                fn($data) => $this->transformDataSyaratPerluTerakreditasi($data),
                function ($data, $info) {
                    $existing = SyaratPerluTerakreditasi::where('butir', $data['butir'])
                        ->where('lamId', $info['lamId'])
                        ->where('strataId', $info['strataId'])
                        ->first();
    
                    if ($existing) {
                        $existing->update([
                            'no' => $data['no'] ?? null,
                            'aspek_penilaian' => $data['aspek_penilaian'] ?? null,
                            'keterangan' => $data['keterangan'] ?? null,
                            'skor_minimal' => $data['skor_minimal'] ?? null,
                        ]);
                    } else {
                        SyaratPerluTerakreditasi::create([
                            'strataId' => $info['strataId'],
                            'lamId' => $info['lamId'],
                            'butir' => $data['butir'] ?? null,
                            'no' => $data['no'] ?? null,
                            'aspek_penilaian' => $data['aspek_penilaian'] ?? null,
                            'keterangan' => $data['keterangan'] ?? null,
                            'skor_minimal' => $data['skor_minimal'] ?? null,
                        ]);
                    }
                }
            );
        } catch (\Throwable $th) {
            return response()->json([
                'error' => 'Unexpected error in importLedItem',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function processSpreadsheetData($spreadsheet_infos, callable $transformFn, callable $saveFn)
    {
        try {
            foreach ($spreadsheet_infos as $spreadsheet_info) {
                $SPREADSHEET_ID = $this->extractSpreadsheetId($spreadsheet_info['spreadsheetId']);
                $RANGETOTAL = $spreadsheet_info['sheets'];

                foreach ($RANGETOTAL as $RANGE) {
                    if (!$RANGE) continue;

                    $RANGETOPARAM = "{$RANGE}!A1:Z1000";
                    $data = $this->fetchGoogleSheetData($SPREADSHEET_ID, $RANGETOPARAM);

                    if (!$data) {
                        return response()->json([
                            'error' => "Failed to fetch data from Google Sheets",
                            'spreadsheet_id' => $SPREADSHEET_ID,
                            'range' => $RANGE,
                        ], 500);
                    }

                    $groupedData = $transformFn($data);

                    foreach ($groupedData as $row) {
                        $saveFn($row, $spreadsheet_info);
                    }
                }
            }

            return response()->json(['status' => 'success'], 200);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'An unexpected error occurred during spreadsheet processing',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : [],
            ], 500);
        }
    }


    private function validateAndBuildSpreadsheetInfos(Request $request)
    {
        $lamId = $request->input('lamId');
        $strataId = $request->input('strataId');
        $sheets = $request->input('sheets');
        $spreadsheetId = $request->input('spreadsheetId');

        if (!$lamId || !$strataId || !$sheets || !$spreadsheetId) {
            return response()->json(['error' => 'Missing required fields in payload'], 400);
        }

        return collect([[
            'lamId' => $lamId,
            'strataId' => $strataId,
            'sheets' => $sheets,
            'spreadsheetId' => $spreadsheetId,
        ]]);
    }

    /**
     * Mengambil data dari Google Sheets.
     */
    private function fetchGoogleSheetData(string $spreadsheetId, string $range): ?array
    {
        $API_SPREADSHEET = env('API_SPREADSHEET');
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$range}?key={$API_SPREADSHEET}";

        $response = Http::timeout(60)->get($url);

        if ($response->failed()) {
            \Log::error("Google Sheets API call failed", [
                'url' => $url,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $rows = $response->json()['values'] ?? [];
        return empty($rows) ? null : $rows;
    }

    /**
     * Mengambil Spreadsheet Id dari link url spreadsheet.
     */
    private function extractSpreadsheetId($urlOrId)
    {
        if (preg_match('/\/d\/([a-zA-Z0-9-_]+)/', $urlOrId, $matches)) {
            return $matches[1]; // Jika berupa URL, ambil ID-nya
        }

        return $urlOrId; // Jika sudah berupa ID, langsung return
    }

    /**
     * Mengubah data Google Sheets menjadi format JSON yang dikelompokkan.
     */
    private function transformDataLedItem(array $rows): Collection
    {
        $header = array_shift($rows);

        $data = collect($rows)->map(function ($row, $index) use ($header) {
            if (count($row) > count($header)) {
                \Log::warning("Row {$index} has more columns than header. Skipping.", ['row' => $row]);
                return null;
            }

            return array_combine($header, array_pad($row, count($header), null));
        })->filter();

        return $data->groupBy(fn($item) => isset($item['No.']) && isset($item['Sub']) 
            ? "{$item['No.']}|{$item['Sub']}" 
            : "unknown")
            ->map(function ($items, $key) {
                [$no, $sub] = explode('|', $key);
                return [
                    'C' => $items->first()['C'] ?? null,
                    'No.' => $no,
                    'Sub' => $sub,
                    'Details' => $items->map(fn($item) => [
                        'Type' => $item['Type'] ?? null,
                        'Seq' => $item['Seq'] ?? null,
                        'Reference' => $item['Reference'] ?? null,
                        'Isian Asesi' => $item['Isian Asesi'] ?? null,
                        'Data Pendukung' => $item['Data Pendukung'] ?? null,
                        'Nilai' => $item['Nilai'] ?? null,
                        'Masukan' => $item['Masukan'] ?? null,
                    ])->values()->toArray(),
                ];
            })->filter()->values(); 
    }

    /**
     * Mengubah data Google Sheets menjadi format JSON yang dikelompokkan.
     */
    private function transformDataBobotButir(array $rows): Collection
    {
        $header = ['Butir', 'Elemen', 'Indikator', 'Bobot', 'Rumus']; // tulis manual
        \Log::info('Using manual header:', $header);

        $data = collect($rows)->map(function ($row, $index) use ($header) {
            if (count($row) > count($header)) {
                \Log::warning("Row {$index} has more columns than header. Skipping.", ['row' => $row]);
                return null;
            }

            return array_combine($header, array_pad($row, count($header), null));
        })->filter();

        return $data->groupBy(fn($item) => $item['Butir'] ?? 'unknown')
            ->map(function ($items) {
                $item = $items->first();
                return [
                    'butir' => $item['Butir'] ?? null,
                    'elemen' => $item['Elemen'] ?? null,
                    'indikator' => $item['Indikator'] ?? null,
                    'bobot' => $item['Bobot'] ?? null,
                    'rumus' => $item['Rumus'] ?? null,
                ];
            })->filter()->values();
    }


    /**
     * Mengubah data Google Sheets menjadi format JSON yang dikelompokkan.
     */
    private function transformDataSyaratPerluPeringkat(array $rows): Collection
    {
        $header = array_shift($rows);

        $data = collect($rows)->map(function ($row, $index) use ($header) {
            if (count($row) > count($header)) {
                \Log::warning("Row {$index} has more columns than header. Skipping.", ['row' => $row]);
                return null;
            }

            return array_combine($header, array_pad($row, count($header), null));
        })->filter();

        return $data->groupBy(fn($item) => isset($item['Butir']) 
            ? "{$item['Butir']}" 
            : "unknown")
            ->map(function ($items, $key) {
                $item = $items->first(); // <-- ini penting!
                return [
                    'no' => $item['No'] ?? null,
                    'aspek_penilaian' => $item['Aspek Penilaian'] ?? null,
                    'butir' => $item['Butir'] ?? null,
                    'minimal_syarat_unggul' => $item['Minimal Syarat Unggul'] ?? null,
                    'minimal_syarat_baik_sekali' => $item['Minimal Syarat Baik Sekali'] ?? null,
                ];
            })->filter()->values(); 
    }

    /**
     * Mengubah data Google Sheets menjadi format JSON yang dikelompokkan.
     */
    private function transformDataSyaratPerluTerakreditasi(array $rows): Collection
    {
        $header = array_shift($rows);

        $data = collect($rows)->map(function ($row, $index) use ($header) {
            if (count($row) > count($header)) {
                \Log::warning("Row {$index} has more columns than header. Skipping.", ['row' => $row]);
                return null;
            }

            return array_combine($header, array_pad($row, count($header), null));
        })->filter();

        return $data->groupBy(fn($item) => isset($item['Butir']) 
            ? "{$item['Butir']}" 
            : "unknown")
            ->map(function ($items, $key) {
                $item = $items->first(); // <-- ini penting!
                return [
                    'butir' => $item['Butir'] ?? null,
                    'no' => $item['No'] ?? null,
                    'aspek_penilaian' => $item['Aspek Penilaian'] ?? null,
                    'keterangan' => $item['Keterangan'] ?? null,
                    'skor_minimal' => $item['Skor Minimal'] ?? null,
                ];
            })->filter()->values(); 
    }

    /**
     * Menyimpan data ke file JSON.
     */
    private function saveToFile(Collection $data, string $fileName): bool
    {
        try {
            $path = public_path("storage/{$fileName}");
            file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Mengambil data JSON led item dengan parameter file.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function readJson($fileName) {
        $path = public_path("storage/$fileName.json");
        try {
            if (File::exists($path)) {
                $data = json_decode(File::get($path), true); // Membaca dan mengubah JSON ke array
                return response()->json([
                    'status' => 'success',
                    'data' => $data
                ], 200);
            }
    
            return response()->json(['error' => 'File not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to read file: ' . $e->getMessage()], 500);
        }
        
    }

    public function getBobotButir($lamId, $strataId)
    {
        try {
            // Validasi request
            if (!$lamId || !$strataId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'lamId dan strataId wajib diisi'
                ], 400);
            }

            \Log::info('Get Bobot Butir', [
                'lamId' => $lamId,
                'strataId' => $strataId
            ]);
            // $lamIdString = $this->convertObjectIdToString($lamId);
            // $strataIdString = $this->convertObjectIdToString($strataId);

            $data = Butir::get();

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
                ->get();

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
                ->get();

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

}