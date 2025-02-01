<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CronTes extends Command
{
  protected $signature = 'cron:log';
  protected $description = 'Memastikan command jalan dengan pembuatan log';

  public function __construct()
  {
    parent::__construct();
  }

  public function handle()
  {
    $this->info('Jalan ni kocak');
  }
}