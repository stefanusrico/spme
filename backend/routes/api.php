<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PostController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\JwtMiddleware;

Route::post('login', [AuthController::class, 'login']);
Route::post('/users', [UserController::class, 'store']);

Route::middleware([JwtMiddleware::class])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [UserController::class, 'getAuthenticatedUserData']);

    Route::middleware(['role:admin'])->group(function () {
        Route::get('/test-mongo', [AuthController::class, 'testMongoConnection']);
        Route::post('/upload', [UserController::class, 'uploadFile']);
        Route::controller(UserController::class)->group(function () {
            Route::get('/users', 'index');
            // Route::post('/users', 'store');
            Route::get('/users/{id}', 'show');
            Route::put('/users/{id}', 'update');
            Route::put('/users/password/{id}', 'updatePassword');
            Route::delete('/users/{id}', 'destroy');
        });
    });
});


Route::post('refresh', [AuthController::class, 'refresh']);