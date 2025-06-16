<?php

namespace App\Console\Commands;

use App\Http\Controllers\JadwalLamController;
use Illuminate\Console\Command;

class GenerateJadwalLam extends Command
{
  protected $signature = 'jadwal-lam:generate {startYear} {endYear}';
  protected $description = 'Generate jadwal LAM untuk rentang tahun tertentu';

  public function handle()
  {
    $startYear = $this->argument('startYear');
    $endYear = $this->argument('endYear');
    $controller = new JadwalLamController();

    for ($year = $startYear; $year <= $endYear; $year++) {
      $controller->generateYearlySchedule($year);
      $this->info("Jadwal tahun $year berhasil dibuat");
    }
  }
}