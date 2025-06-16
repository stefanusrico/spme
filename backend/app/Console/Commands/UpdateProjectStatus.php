<?php

namespace App\Console\Commands;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Console\Command;

class UpdateProjectStatus extends Command
{
  protected $signature = 'projects:update-status';
  protected $description = 'Update project status based on end date';

  public function handle()
  {
    $this->info('Starting to update project statuses...');

    $updatedCount = Project::where('status', 'ACTIVE')
      ->where('endDate', '<', now())
      ->update(['status' => 'INACTIVE']);

    $this->info("Updated {$updatedCount} projects to INACTIVE status");
  }
}