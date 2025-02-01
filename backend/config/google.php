<?php

return [
  'sheets' => [
    'spreadsheets' => [
      'lembar_isian_led' => env('LEMBAR_ISIAN_LED_SPREADSHEET_ID'),
      'sheets' => [
        'WD1' => env('WD1_SHEET_ID'),
        'WD2' => env('WD2_SHEET_ID'),
        'WD3' => env('WD3_SHEET_ID'),
        'WD4' => env('WD4_SHEET_ID'),
        'P3M' => env('P3M_SHEET_ID'),
        'SPMI' => env('SPMI_SHEET_ID'),
        'PP' => env('PP_SHEET_ID'),
      ]
    ]
  ]
];