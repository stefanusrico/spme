<?php

namespace App\Events;

use App\Models\Project\Project;

class ProjectEndDatePassed
{
  public $project;

  public function __construct(Project $project)
  {
    $this->project = $project;
  }
}