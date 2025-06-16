<?php
namespace App\Services;


use App\Http\Controllers\DataController;

class GoogleSheetService
{
  protected $config;

  public function __construct()
  {
    $this->config = config('google.sheets.spreadsheets');
  }

  public function readSheet($sheetKey, $sheetGid)
  {
    $url = "https://docs.google.com/spreadsheets/d/{$this->config['lembar_isian_led']}/export?format=csv&gid={$sheetGid}";

    try {
      $content = file_get_contents($url);
      $rows = array_map('str_getcsv', explode("\n", $content));

      array_shift($rows);

      $result = [];
      foreach ($rows as $row) {
        if (!empty($row[0]) && !empty($row[1]) && !empty($row[2])) {
          $kriteria = trim($row[0]);
          $nomor = trim($row[1]);
          $sub = trim($row[2]);

          if (preg_match('/^C\d+$/', $kriteria) && is_numeric($nomor) && preg_match('/^[A-Z]$/', $sub)) {
            $result[] = [
              'c' => $kriteria,
              'no' => $nomor,
              'sub' => $sub
            ];
          }
        }
      }

      $uniqueResult = collect($result)->unique(function ($item) {
        return $item['c'] . $item['no'] . $item['sub'];
      })->values()->all();

      $jsonContent = json_encode($uniqueResult, JSON_PRETTY_PRINT);
      $path = storage_path("app/public/led_{$sheetKey}.json");
      file_put_contents($path, $jsonContent);

      return $uniqueResult;

    } catch (\Exception $e) {
      throw new \Exception("Error reading sheet: " . $e->getMessage());
    }
  }
}