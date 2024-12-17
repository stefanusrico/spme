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