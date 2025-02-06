<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('scrape:banpt')->cron('0 0 1,15 * *'); //jalan tiap tanggal 1 dan 15

Artisan::command('logs:clear', function () {

    foreach (glob(storage_path('logs/*.log')) as $file) {
        file_put_contents($file, '');
    }

    foreach (glob(base_path('*.log')) as $file) {
        file_put_contents($file, '');
    }

    $this->comment('Logs have been cleared!');

})->describe('Clear log files');