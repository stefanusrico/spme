<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Version;
use App\Models\User;
use App\Models\Task;
use App\Models\Prodi;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class VersionController extends Controller
{
    public function get(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'No' => 'required|string',
            'Sub' => 'required|string',
            'Type' => 'required|string',
            'Prodi' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        $validatedData = $validator->validated();
        $task = Task::where('no', $validatedData['No'])
            ->where('sub', $validatedData['Sub'])
            ->first();

        // $prodi = Prodi::where('name', $validatedData['Prodi'])
        //     ->first();

        if(!$task){
            return response()->json([
                'status' => 'error',
                'message' => 'Task not found'
            ], 404);
        }

        $taskId = $task->id;
        $prodiId = $validatedData['Prodi'];

        try {
            $query = Version::where('taskId', $taskId)
                    ->where('prodiId', $prodiId)
                    ->orderBy('created_at', 'desc');

            if($validatedData['Type'] === "latest"){
                $version = $query->first();

                if (!$version) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No version data found',
                    ], 404);
                }

                $user = User::find($version->user_id);
                $version->user_name = $user ? $user->name : 'Unknown';
            } else{
                $version = $query->get();

                if ($version->isEmpty()) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No version data found',
                    ], 404);
                }
                
                $userIds = $version->pluck('user_id')->unique();
                $users = User::whereIn('id', $userIds)->pluck('name', 'id');

                foreach ($version as $v) {
                    $v->user_name = $users[$v->user_id] ?? 'Unknown';
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => $version,
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
            'userId' => 'required|string',
            'komentar' => 'nullable|string',
            'commit' => 'nullable|string',
            'C' => 'required|string',
            'No' => 'required|string',
            'Sub' => 'required|string',
            'Prodi' => 'required|string',
            'Details' => 'required|array',
            'Details.*.Type' => 'required|string',
            'Details.*.Seq' => 'required|string',
            'Details.*.Reference' => 'required|string',
            'Details.*.Isian Asesi' => 'nullable|string',
            'Details.*.Data Pendukung' => 'nullable|array',
            'Details.*.Nilai' => 'nullable|string',
            'Details.*.Masukan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        $validatedData = $validator->validated();

        $filteredDetails = array_filter($validatedData['Details'], function ($detail) {
            return $detail['Type'] === 'K';
        });

        $detailsArray = array_values(array_map(function ($detail) {
            return [
                'seq' => $detail['Seq'],
                'reference' => $detail['Reference'],
                'isian_asesi' => $detail['Isian Asesi'] ?? null,
                'data_pendukung' => $detail['Data Pendukung'] ?? null,
                'nilai' => $detail['Nilai'] ?? null,
                'masukan' => $detail['Masukan'] ?? null,
                'type' => "K"
            ];
        }, $filteredDetails));

        try {
            $task = Task::where('no', $validatedData['No'])
                ->where('sub', $validatedData['Sub'])
                ->first();

            // $prodi = Prodi::where('name', $validatedData['Prodi'])
            //     ->first();

            Version::create([
                'user_id' => $validatedData['userId'],
                'commit' => $validatedData['commit'] ?? null,
                'komentar' => $validatedData['komentar'] ?? null,
                'c' => $validatedData['C'],
                'taskId' => $task ? $task->id : null,
                'prodiId' => $validatedData['Prodi'],
                // 'no' => $validatedData['No'],
                // 'sub' => $validatedData['Sub'],
                'details' => $detailsArray, 
                // 'details' => json_encode($detailsArray)
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
