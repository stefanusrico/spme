<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class JsonController extends Controller
{
    /**
     * Menyimpan data JSON ke file.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    // public function saveJson(Request $request)
    // {
    //     // Ambil data JSON dari frontend
    //     $data = $request->input('data');
    //     $data = collect($data);

    //     // Tentukan path penyimpanan file
    //     $path = public_path('storage/Collect.json');

    //     //grouping
    //     $grouped = $data->groupby(function($item){
    //         return isset($item['No.']) && isset($item['Sub']) ? $item['No.'] . '|' . $item['Sub'] : "unknown";
    //     })->map(function ($items, $key){
    //         [$no, $sub] = explode('|', $key);
    //         return [
    //             'C' => $items->first()['C'], // Mengakses data dengan notasi array
    //             'No.' => $no,
    //             'Sub' => $sub,
    //             'Details' => $items->map(function ($item) {
    //                 return [
    //                     'Type' => $item['Type'],
    //                     'Seq' => $item['Seq'],
    //                     'Reference' => $item['Reference'],
    //                     'Isian Asesi' => $item['Isian Asesi'],
    //                     'Data Pendukung' => $item['Data Pendukung'],
    //                     'Nilai' => $item['Nilai'] ?? null,
    //                     'Masukan' => $item['Masukan'] ?? null,
    //                 ];
    //             })->values()->toArray(),
    //         ];
    //     })->values();

    //     // Simpan data JSON ke file
    //     try {
    //         file_put_contents($path, json_encode($grouped, JSON_PRETTY_PRINT));
    //         return response()->json([
    //             'status' => 'success',
    //             'data' => $grouped
    //         ], 200);
    //     } catch (\Exception $e) {
    //         return response()->json(['error' => 'Failed to save file: ' . $e->getMessage()], 500);
    //     }
    // }
    public function saveJson(Request $request)
    {
        // Ambil data JSON dari frontend
        $sheets = $request->input('data');

        if (!$sheets || !is_array($sheets)) {
            return response()->json(['error' => 'Invalid data format'], 400);
        }

        // Inisialisasi array untuk menyimpan hasil pengelompokan
        $groupedSheets = [];

        foreach ($sheets as $sheet) {
            // Ambil nama sheet dan data
            $sheetName = $sheet['sheetName'] ?? 'UnknownSheet';
            $data = collect($sheet['records'] ?? []);

            // Lakukan pengelompokan data seperti sebelumnya
            $grouped = $data->groupBy(function ($item) {
                return isset($item['No.']) && isset($item['Sub']) ? $item['No.'] . '|' . $item['Sub'] : "unknown";
            })->map(function ($items, $key) {
                [$no, $sub] = explode('|', $key);
                return [
                    'C' => $items->first()['C'] ?? null, // Tambahkan fallback jika C tidak ada
                    'No.' => $no,
                    'Sub' => $sub,
                    'Details' => $items->map(function ($item) {
                        return [
                            'Type' => $item['Type'] ?? null,
                            'Seq' => $item['Seq'] ?? null,
                            'Reference' => $item['Reference'] ?? null,
                            'Isian Asesi' => $item['Isian Asesi'] ?? null,
                            'Data Pendukung' => $item['Data Pendukung'] ?? null,
                            'Nilai' => $item['Nilai'] ?? null,
                            'Masukan' => $item['Masukan'] ?? null,
                        ];
                    })->values()->toArray(),
                ];
            })->values();

            // Simpan hasil ke dalam array utama dengan nama sheet sebagai kunci
            $groupedSheets[$sheetName] = $grouped;
        }

        // Tentukan path penyimpanan file
        $path = public_path('storage/Collect.json');

        // Simpan data JSON ke file
        try {
            file_put_contents($path, json_encode($groupedSheets, JSON_PRETTY_PRINT));
            return response()->json([
                'status' => 'success',
                'data' => $groupedSheets
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to save file: ' . $e->getMessage()], 500);
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
