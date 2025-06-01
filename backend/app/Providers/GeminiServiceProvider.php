<?php
namespace App\Providers;

use App\Services\Gemini\GeminiService;
use Illuminate\Support\ServiceProvider;

class GeminiServiceProvider extends ServiceProvider
{
  public function register(): void
  {
    $this->app->singleton(GeminiService::class, function ($app) {
      return new GeminiService();
    });

    $this->app->bind('gemini-service', function ($app) {
      return $app->make(GeminiService::class);
    });
  }

  public function boot(): void
  {
    //
  }
}