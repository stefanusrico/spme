<?php

namespace App\Providers;

use Illuminate\Events\Dispatcher;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
  protected $listen = [
    'project.updated' => [
      \App\Listeners\ProjectStatusUpdater::class,
    ],
    'project.end.date.passed' => [
      \App\Listeners\ProjectStatusUpdater::class,
    ],
  ];
}