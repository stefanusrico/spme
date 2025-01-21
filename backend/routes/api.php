<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController,
    JurusanController,
    PostController,
    ProdiController,
    ProjectController,
    RoleController,
    TaskController,
    TaskListController,
    UserController,
    NotificationController
};
use App\Http\Middleware\JwtMiddleware;

Route::post('login', [AuthController::class, 'login']);
Route::post('refresh', [AuthController::class, 'refresh']);

Route::middleware([JwtMiddleware::class])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('user', [UserController::class, 'getAuthenticatedUserData']);

    Route::get('projects', [ProjectController::class, 'myProjects']);
    Route::get('projects/{projectId}', [ProjectController::class, 'getProjectDetails']);
    Route::get('projects/{projectId}/members', [ProjectController::class, 'getMembers']);
    Route::get('projects/{projectId}/lists', [ProjectController::class, 'getProjectTaskLists']);
    Route::get('projects/{projectId}/tasklists/{taskListId}/tasks', [ProjectController::class, 'index']);
    Route::post('projects/{projectId}/tasklists', [TaskListController::class, 'store']);
    Route::post('projects/{projectId}/tasklists/{taskListId}/tasks', [TaskController::class, 'store']);
    Route::patch('projects/{projectId}/tasks/{taskId}/assign', [TaskController::class, 'updateRow']);
    Route::get('tasks', [TaskController::class, 'myTasks']);

    Route::controller(JurusanController::class)->group(function () {
        Route::get('jurusan', 'index');
        Route::post('jurusan', 'store');
        Route::get('jurusan/{id}', 'show');
        Route::put('jurusan/{id}', 'update');
        Route::delete('jurusan/{id}', 'destroy');
    });

    Route::controller(ProdiController::class)->group(function () {
        Route::get('prodi', 'index');
        Route::post('prodi', 'store');
        Route::get('prodi/{id}', 'show');
        Route::put('prodi/{id}', 'update');
        Route::delete('prodi/{id}', 'destroy');
        Route::get('count', 'countByPeringkat');
    });

    Route::middleware(['role:Admin|Ketua Program Studi'])->group(function () {
        Route::get('test-mongo', [AuthController::class, 'testMongoConnection']);
        Route::post('upload', [UserController::class, 'uploadFile']);
        Route::post('project', [ProjectController::class, 'store']);
        Route::post('projects/{projectId}/members', [ProjectController::class, 'addMember']);

        Route::controller(UserController::class)->group(function () {
            Route::get('users', 'index');
            Route::get('auth/user', 'getAuthenticatedUserData');
            Route::post('users', 'store');
            Route::get('users/{id}', 'show');
            Route::put('users/{id}', 'update');
            Route::put('users/password/{id}', 'updatePassword');
            Route::delete('users/{id}', 'destroy');
        });

        Route::controller(RoleController::class)->group(function () {
            Route::get('roles', 'index');
            Route::post('roles', 'store');
            Route::get('roles/{id}', 'show');
            Route::put('roles/{id}', 'update');
            Route::delete('roles/{id}', 'destroy');
        });

        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::post('/{id}/accept-project', [NotificationController::class, 'markProjectInviteAsAccepted']);
            Route::post('/send', [NotificationController::class, 'sendNotification']);
        });
    });
});