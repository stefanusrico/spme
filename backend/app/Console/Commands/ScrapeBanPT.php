<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\ScraperController;

class ScrapeBanPT extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'scrape:banpt';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Untuk scrape data banpt setiap dua minggu';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $scraper = new ScraperController();

        $this->info('Starting D-III scraping...');
        $scraper->scrape('Politeknik Negeri Bandung', 'D-III');

        $this->info('Starting D-IV scraping...');
        $scraper->scrape('Politeknik Negeri Bandung', 'D-IV');
    }
}