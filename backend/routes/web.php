<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-mongo', function () {
    try {
        $mongo = DB::connection('mongodb')->getMongoClient();
        return 'MongoDB Connection Successful!';
    } catch (\Exception $e) {
        return 'Failed to connect to MongoDB: ' . $e->getMessage();
    }
});

Route::get('/check-sections', function () {
    $count = \App\Models\LkpsSection::count();
    $firstSection = \App\Models\LkpsSection::first();

    return response()->json([
        'count' => $count,
        'first_section' => $firstSection,
        'connection_name' => config('database.default')
    ]);
});