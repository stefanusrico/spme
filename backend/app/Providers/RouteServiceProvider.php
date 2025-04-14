<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
  public function boot(): void
  {
    // Configure rate limiting
    RateLimiter::for('api', function (Request $request) {
      return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    // Register routes
    $this->routes(function () {
      // API routes (with prefix siaps/api)
      Route::prefix('siaps/api')
        ->middleware('api')
        ->group(base_path('routes/api.php'));

      // Web routes (with prefix siaps)
      Route::prefix('siaps')
        ->middleware('web')
        ->group(base_path('routes/web.php'));
    });
  }
}