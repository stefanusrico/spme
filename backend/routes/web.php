<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    try {
        return response()->json([
            'status' => 'success',
            'message' => 'Laravel is running!',
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'environment' => app()->environment(),
            'app_debug' => config('app.debug'),
            'db_connection' => config('database.default')
        ]);
    } catch (Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ], 500);
    }
});

Route::get('/debug', function () {
    return response()->json([
        'env_vars' => [
            'APP_ENV' => env('APP_ENV'),
            'APP_DEBUG' => env('APP_DEBUG'),
            'APP_KEY' => env('APP_KEY') ? 'SET' : 'NOT SET',
            'DB_CONNECTION' => env('DB_CONNECTION'),
            'MONGODB_URI' => env('MONGODB_URI') ? 'SET' : 'NOT SET',
        ]
    ]);
});

Route::get('/test-mongo', function () {
    try {
        $mongo = DB::connection('mongodb')->getMongoClient();
        return 'MongoDB Connection Successful!';
    } catch (\Exception $e) {
        return 'Failed to connect to MongoDB: ' . $e->getMessage();
    }
});