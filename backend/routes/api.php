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
    NotificationController,
    DataController,
    ScraperController,
    LamController,
    JadwalLamController,
    MenuController,
    RumusController,
    SectionController
};
use App\Http\Middleware\JwtMiddleware;

Route::get('/led/{sheet}', [DataController::class, 'getLembarIsianLed']);
Route::get('/stortasklist/{projectId}', [TaskListController::class, 'storeFromLed']);
Route::post('/projects/{projectId}/tasks/led', [TaskController::class, 'storeFromLed']);
Route::post('/removemember/{projectId}', [ProjectController::class, 'removeMember']);

Route::get('/scrape/{perguruan_tinggi}/{strata}', [ScraperController::class, 'scrape']);
Route::post('/jurusan', [JurusanController::class, 'store']);

Route::post('login', [AuthController::class, 'login']);
Route::post('refresh', [AuthController::class, 'refresh']);
Route::post('/sendmsg/{phone}/{message}', [NotificationController::class, 'sendWhatsAppNotification']);

Route::controller(LamController::class)->group(function () {
    Route::get('lam', 'index');
    Route::post('lam', 'store');
    Route::get('lam/{id}', 'show');
    Route::put('lam/{id}', 'update');
    Route::delete('lam/{id}', 'destroy');
});

Route::controller(JadwalLamController::class)->group(function () {
    Route::get('jadwal', 'index');
    Route::post('jadwal', 'store');
    Route::get('jadwal/{id}', 'show');
    Route::put('jadwal/{id}', 'update');
    Route::delete('jadwal/{id}', 'destroy');
    Route::get('jadwal/year/{year}', 'getByYear');
    Route::get('jadwal/name/{name}', 'getByName');
    Route::get('jadwal/year/{year}/name/{name}', 'getByYearAndName');
});



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

        Route::controller(MenuController::class)->group(function () {
            Route::get('/menus', 'index');
            Route::post('/menus', 'store');
            Route::get('menus/{id}', 'show');
            Route::put('menus/{id}', 'update');
            Route::delete('menus/{id}', 'destroy');
        });

        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::post('/{id}/accept-project', [NotificationController::class, 'markProjectInviteAsAccepted']);
            Route::post('/send', [NotificationController::class, 'sendNotification']);
        });

        Route::prefix('rumus')->group(function () {
            Route::get('/', [RumusController::class, 'index']);                   // GET - Menampilkan semua data
            Route::post('/', [RumusController::class, 'store']);                  // POST - Menyimpan data baru
            Route::get('/{id}', [RumusController::class, 'show']);                // GET - Menampilkan data berdasarkan ID
            Route::put('/{id}', [RumusController::class, 'update']);              // PUT - Memperbarui data
            Route::delete('/{id}', [RumusController::class, 'destroy']);           // DELETE - Menghapus data
            Route::get('/{nomor}/{sub}', [RumusController::class, 'showByNomorAndSub']);
        });
    });
});

Route::prefix('section')->group(function () {
    Route::post('1/{prodiId}', [SectionController::class, 'store']);
    Route::get('1/{prodiId}', [SectionController::class, 'index']);

    Route::post('2/{prodiId}', [SectionController::class, 'storeSection2']);
    Route::get('2/{prodiId}', [SectionController::class, 'getSection2']);

    Route::post('3a/{prodiId}', [SectionController::class, 'storeSection3']);
    Route::get('3a/{prodiId}', [SectionController::class, 'getSection3']);
    // ... (dan seterusnya untuk 3a2, 3a3, ..., 3b42)

    // Route untuk section 4, 5a, 5b, 5c, 6a, 6b, 7, 8
    Route::post('4/{prodiId}', [SectionController::class, 'storeSection4']);
    Route::get('4/{prodiId}', [SectionController::class, 'getSection4']);

    Route::post('5a/{prodiId}', [SectionController::class, 'storeSection5']);
    Route::get('5a/{prodiId}', [SectionController::class, 'getSection5']);

    Route::post('5b/{prodiId}', [SectionController::class, 'storeSection5']);
    Route::get('5b/{prodiId}', [SectionController::class, 'getSection5']);

    Route::post('5c/{prodiId}', [SectionController::class, 'storeSection5']);
    Route::get('5c/{prodiId}', [SectionController::class, 'getSection5']);

    Route::post('6a/{prodiId}', [SectionController::class, 'storeSection6']);
    Route::get('6a/{prodiId}', [SectionController::class, 'getSection6']);

    Route::post('6b/{prodiId}', [SectionController::class, 'storeSection6']);
    Route::get('6b/{prodiId}', [SectionController::class, 'getSection6']);

    Route::post('7/{prodiId}', [SectionController::class, 'storeSection7']);
    Route::get('7/{prodiId}', [SectionController::class, 'getSection7']);

    Route::post('8/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8/{prodiId}', [SectionController::class, 'getSection8']);

    // Route untuk section 8b1, 8b2, 8c1-8c4, 8d1-8d4, 8e1, 8e2, 8f1-8f5
    Route::post('8b1/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8b1/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8b2/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8b2/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8c1/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8c1/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8c2/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8c2/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8c3/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8c3/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8c4/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8c4/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8d1/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8d1/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8d2/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8d2/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8d3/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8d3/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8d4/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8d4/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8e1/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8e1/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8e2/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8e2/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8f1/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8f1/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8f2/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8f2/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8f3/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8f3/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8f4/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8f4/{prodiId}', [SectionController::class, 'getSection8']);

    Route::post('8f5/{prodiId}', [SectionController::class, 'storeSection8']);
    Route::get('8f5/{prodiId}', [SectionController::class, 'getSection8']);
});