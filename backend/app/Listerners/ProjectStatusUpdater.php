<?php

namespace App\Listeners;

use App\Models\Project;
use Illuminate\Events\Dispatcher;

class ProjectStatusUpdater
{
  public function handle(Project $project)
  {
    if ($project->endDate < now()) {
      $project->status = 'CLOSED';
      $project->save();
    }
  }
}