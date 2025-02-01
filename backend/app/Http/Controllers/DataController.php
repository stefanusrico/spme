<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\GoogleSheetService;

class DataController extends Controller
{
    protected $sheetService;
    protected $sheets;

    public function __construct(GoogleSheetService $sheetService)
    {
        $this->sheetService = $sheetService;
        $this->sheets = config('google.sheets.spreadsheets.sheets');
    }

    public function getLembarIsianLed($sheet)
    {
        try {
            if (!isset($this->sheets[$sheet])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Sheet not found'
                ], 404);
            }

            $data = $this->sheetService->readSheet($sheet, $this->sheets[$sheet]);

            return response()->json([
                'status' => 'success',
                'data' => $data,
                'json_file' => "led_{$sheet}.json"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}