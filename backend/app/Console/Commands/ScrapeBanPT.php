<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\Prodi\ScraperController;

class ScrapeBanpt extends Command
{
    protected $signature = 'scrape:banpt';
    protected $description = 'Scrape data from BAN-PT website';

    public function handle()
    {
        try {
            $scraper = new ScraperController();
            $this->info('Starting D-III scraping...');
            $result = $scraper->scrape('Politeknik Negeri Bandung', 'D-III');
            $this->info('D-III scraping completed.');
            $this->info('Starting D-IV scraping...');
            $result = $scraper->scrape('Politeknik Negeri Bandung', 'D-IV');
            $this->info('D-IV scraping completed.');

        } catch (\Exception $e) {
            $this->error('Scraping failed: ' . $e->getMessage());
            \Log::error('Scraping command failed: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
        }
    }
}