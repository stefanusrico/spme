<?php

namespace App\Http\Controllers;

use App\Models\Led\LedItem;
use App\Models\Data\SpreadsheetInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

class JsonController extends Controller
{
    /**
     * Menyimpan data JSON ke file.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveJson(Request $request)
    {
        \Log::info("Fetching SpreadsheetInfo with ID: 67cd639116aa75ca300971e9");

        // $spreadsheet_infos = SpreadsheetInfo::get(); 
        $lamId = $request->input('lamId');
        $strataId = $request->input('strataId');
        $sheets = $request->input('sheets');
        $spreadsheetId = $request->input('spreadsheetId');

        \Log::info("Received payload", $request->all());

        if (!$lamId || !$strataId || !$sheets || !$spreadsheetId) {
            return response()->json(['error' => 'Missing required fields in payload'], 400);
        }

         // Bungkus jadi array agar tetap bisa pakai foreach seperti sebelumnya
        $spreadsheet_infos = collect([[
            'lamId' => $lamId,
            'strataId' => $strataId,
            'sheets' => $sheets,
            'spreadsheetId' => $spreadsheetId,
        ]]);
        
        if ($spreadsheet_infos->isEmpty()) {
            return response()->json(['error' => 'SpreadsheetInfo not found'], 404);
        }

        \Log::info("SpreadsheetInfo found: ", $spreadsheet_infos->toArray());
        foreach ($spreadsheet_infos as $spreadsheet_info) {
            $SPREADSHEET_ID = $this->extractSpreadsheetId($spreadsheet_info['spreadsheetId']);
            $RANGETOTAL = $spreadsheet_info['sheets'];

            if (!$SPREADSHEET_ID || empty($RANGETOTAL)) {
                return response()->json(['error' => "Missing required parameters for spreadsheet ID {$SPREADSHEET_ID}"], 400);
            }

            foreach ($RANGETOTAL as $RANGE) {
                if (!$RANGE) {
                    continue; // Lewati jika range kosong
                }

                $RANGETOPARAM = "{$RANGE}!A1:Z1000"; 

                $data = $this->fetchGoogleSheetData($SPREADSHEET_ID, $RANGETOPARAM);

                if (!$data) {
                    return response()->json(['error' => "Failed to fetch data from Google Sheets - ID: {$SPREADSHEET_ID}, Range: {$RANGE}"], 500);
                }

                $groupedData = $this->transformData($data);

                try {
                    foreach ($groupedData as $data) {
                        // Ambil hanya key yang diinginkan dari masing-masing item details
                        $filteredDetails = collect($data['Details'] ?? [])->map(function ($detail) {
                            return [
                                'seq' => $detail['Seq'] ?? null,
                                'type' => $detail['Type'] ?? null,
                                'reference' => $detail['Reference'] ?? null,
                            ];
                        })->toArray();

                        $existingLedItem = LedItem::where('no', $data['No.'])
                            ->where('sub', $data['Sub'])
                            ->where('lamId', $spreadsheet_info['lamId'])
                            ->where('strataId', $spreadsheet_info['strataId'])
                            ->first();

                        if ($existingLedItem) {
                            $existingLedItem->update([
                                'kriteria' => $data['C'],
                                'details' => $filteredDetails
                            ]);
                        } else {
                            LedItem::create([
                                'strataId' => $spreadsheet_info['strataId'],
                                'lamId' => $spreadsheet_info['lamId'],
                                'kriteria' => $data['C'],
                                'no' => $data['No.'],
                                'sub' => $data['Sub'],
                                'details' => $filteredDetails
                            ]);
                        }
                    }
                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to save DB',
                        'message' => $e->getMessage(),
                        'trace' => $e->getTrace()
                    ], 500);
                }
            }
        }

        return response()->json([
            'status' => 'success',
        ], 200);
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
    private function transformData(array $rows): Collection
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
     * Mengambil data JSON dengan parameter file.
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
}