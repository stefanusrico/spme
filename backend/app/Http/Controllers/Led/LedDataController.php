<?php

namespace App\Http\Controllers\Led;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Led\LedData;
use App\Models\Project\Task;
use App\Models\User\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Exception;

class LedDataController extends Controller
{
    /**
     * Untuk mendapatkan 1 data dari LED data menggunakan taskId, 
     * ini untuk menampilkan LED yang dikerjakan sekarang
    **/
    public function getLatest($taskId)
    {
        $ledData = LedData::with('user')
            ->where('taskId', $taskId)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$ledData) {
            return response()->json([
                'status' => 'error', 
                'message' => 'No data found'
            ], 404);
        }

        $ledData->username = $ledData->user?->name ?? 'Unknown';

        return response()->json([
            'status' => 'success', 
            'data' => $ledData
        ], 200);
    }

    /**
     * untuk mendapatkan banyak data dari LED data menggunakan taskId dan prodiId
     * ini untuk menampilkan riwayat penyusunan LED
    **/
    public function getAll($taskId)
    {
        $ledData = LedData::with('user')
            ->where('taskId', $taskId)
            ->orderBy('created_at', 'desc')
            ->get();

        if ($ledData->isEmpty()) {
            return response()->json([
                'status' => 'error', 
                'message' => 'No data found'
            ], 404);
        }

        foreach ($ledData as $ld) {
            $ld->username = $ld->user?->name ?? 'Unknown';
        }

        return response()->json([
            'status' => 'success', 
            'data' => $ledData
        ], 200);
    }

    //Untuk mendapatkan data dari LED data berdasarkan prodiId dan taskId
    public function getLedDataByProdi($prodiId)
    {
        try {
            $ledData = LedData::with(['task.ledItem', 'task.tasklist.project'])
                ->orderBy('created_at', 'desc')
                ->get();

            $filteredLedData = $ledData->filter(function ($item) use ($prodiId) {
                return $item->task && $item->task->tasklist &&
                    $item->task->tasklist->project &&
                    $item->task->tasklist->project->prodiId === $prodiId &&
                    in_array($item->task->tasklist->project->status, ['ACTIVE', 'IN PROGRESS']);
            });


            if ($filteredLedData->isEmpty()) {
                Log::warning("LED not found :", [
                    'prodiId' => $prodiId,
                    'count' => $ledData->count(),
                    'project->prodiId' => $ledData
                    // 'led data 1' => $ledData->task->tasklist->project
                    // 'led data sebelum filter' => $ledData,
                ]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
            }

            $latestPerTask = $filteredLedData
                ->sortByDesc('created_at')
                ->unique('taskId');

            $result = $latestPerTask->map(function ($item) {
                $user = User::find($item->userId);
                return [
                    'id' => $item->id,
                    'userId' => $item->userId,
                    'username' => $user ? $user->name : null,
                    'commit' => $item->commit,
                    'taskId' => $item->taskId,
                    'nilai' => $item->nilai,
                    'masukan' => $item->masukan,
                    'details' => $item->details,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'task' => $item->task ? [
                        'id' => $item->id,
                        'nama' => $item->task->nama,
                        'progress' => $item->task->progress,
                        'led_item' => $item->task && $item->task->ledItem ? [
                            'no' => $item->task->ledItem->no,
                            'sub' => $item->task->ledItem->sub,
                        ] : null,
                    ] : null,
                    
                ];
            });

            return response()->json([
                'status' => 'success',
                'count data' => $result->count(),
                'data' => $result->values(),
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    public function getScorePerNoSubByProdi()
    {
        try {
            $user = auth()->user();

            if (!$user || !$user->prodiId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User tidak memiliki Program Studi yang valid',
                ], 400);
            }

            $prodiId = $user->prodiId;

            $ledData = LedData::whereHas('task.taskList.project', function ($query) use ($prodiId) {
                    $query->where('prodiId', $prodiId);
                })
                ->with(['task.taskList.project'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($ledData->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
            }

            $filteredLedData = $ledData->groupBy('taskId')->map(function ($group) {
                $firstEntry = $group->first();
                $details = collect($firstEntry->details ?? []);

                $totalScore = $details->sum(function ($detail) {
                    return is_numeric($detail['nilai'] ?? null) ? (float) $detail['nilai'] : 0;
                });

                $averageScore = $details->count() > 0 ? $totalScore / $details->count() : 0;

                return [
                    'taskId' => $firstEntry->taskId,
                    'commit' => $firstEntry->commit,
                    'prodiId' => $firstEntry->prodiId,
                    'updated_at' => $firstEntry->updated_at,
                    'created_at' => $firstEntry->created_at,
                    'nilai' => round($averageScore, 2),
                    'task' => $firstEntry->task,
                ];
            })->values();

            return response()->json([
                'status' => 'success',
                'data' => $filteredLedData,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'taskId' => 'required|string',
            'commit' => 'required|string',
            'nilai' => 'nullable|string',
            'masukan' => 'nullable|string',
            'details' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        $validatedData = $validator->validated();
        
        $totalDetails = count($validatedData['details']);
        $filledCount = 0;

        foreach ($validatedData['details'] as $index => $detail) {
            $isian = $detail['isianAsesi'] ?? null;

            // Coba decode JSON
            $decoded = json_decode($isian, true);

            // Cek apakah valid dan ada teks tidak kosong dalam salah satu block
            if (
                is_array($decoded) &&
                isset($decoded['blocks']) &&
                is_array($decoded['blocks'])
            ) {
                $hasText = false;
                foreach ($decoded['blocks'] as $block) {
                    if (!empty(trim($block['text'] ?? ''))) {
                        $hasText = true;
                        break;
                    }
                }

                if ($hasText) {
                    $filledCount++;
                }
            }
        }
        $progress = $totalDetails > 0 ? round(($filledCount / $totalDetails) * 100, 1) : 0;

        $task = Task::where('_id', $validatedData['taskId'])->first();
        if ($task) {
            $task->progress = $progress;
            if($progress > 0 && $progress < 100){
                $task->status = "IN PROGRESS";
            }else if($progress == 100){
                $task->status = "COMPLETED";
            }
            $task->save();
        }        
        
        Log::info("Task  :", [
            'Task' => $task,
            'totalDetails' => $totalDetails,
            'filled count' => $filledCount,
            'Progress ' => $progress,
        ]);
        
        try {
            LedData::create([
                'userId' => auth()->id(),
                'taskId' => $validatedData['taskId'],
                'commit' => $validatedData['commit'] ?? null,
                'nilai' => $validatedData['nilai'] ?? null,
                'masukan' => $validatedData['masukan'] ?? null,
                'details' => $validatedData['details'],
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Data successfully saved',
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

}