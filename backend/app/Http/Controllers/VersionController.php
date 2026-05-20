<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Version;
use App\Models\User;
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
            'ProdiId' => 'required|string'
            // 'user_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        $validatedData = $validator->validated();

        try {
            if($validatedData['Type'] === "latest"){
                $version = Version::where('no', $validatedData['No'])
                    ->where('sub', $validatedData['Sub'])
                    ->where('prodiId', $validateData['ProdiId'])
                    // ->where('user_id', $validatedData['user_id'])
                    ->orderBy('created_at', 'desc')
                    ->first();

                $user = User::findOrFail($version->user_id);
                $version->user_name = $user->name;
            } else{
                $version = Version::where('no', $validatedData['No'])
                    ->where('sub', $validatedData['Sub'])
                    ->where('prodiId', $validateData['ProdiId'])
                    // ->where('user_id', $validatedData['user_id'])
                    ->orderBy('created_at', 'desc')
                    ->get();
                
                    foreach ($version as $v) {
                        $user = User::findOrFail($v->user_id);
                        $v->user_name = $user->name;
                    }
            }
            
            if (!$version) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
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

    public function getVersionByProdi($prodiId)
    {
        try {
            $version = Version::where('prodiId', $prodiId)
                ->with(['task'])
                ->orderBy('created_at', 'desc')
                ->get();
            
                foreach ($version as $v) {
                    $user = User::findOrFail($v->user_id);
                    $v->user_name = $user->name;
                }
            
            if (!$version) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
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

    public function getScorePerNoSubByProdi($prodiId)
    {
        try {
            $versions = Version::where('prodiId', $prodiId)
                ->with(['task'])
                ->orderBy('created_at', 'desc')
                ->get();

            if ($versions->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No data found',
                ], 404);
            }

            $filteredVersions = $versions->groupBy('taskId')->map(function ($group) {
                $firstEntry = $group->first();
    
                $details = collect($firstEntry->details);
                $totalScore = $details->sum(function ($detail) {
                    return is_numeric($detail['nilai']) ? (float) $detail['nilai'] : 0;
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
                'data' => $filteredVersions,
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
            'user_id' => 'required|string',
            'komentar' => 'nullable|string',
            'commit' => 'required|string',
            'c' => 'required|string',
            'taskId' => 'required|string',
            // 'lamId' => 'required|string',
            'prodiId' => 'required|string',
            'Details' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        $validatedData = $validator->validated();

        // $filteredDetails = array_filter($validatedData['Details'], function ($detail) {
        //     return $detail['Type'] === 'K';
        // });

        // $detailsArray = array_values(array_map(function ($detail) {
        //     return [
        //         'seq' => $detail['Seq'],
        //         'reference' => $detail['Reference'],
        //         'isian_asesi' => $detail['Isian Asesi'] ?? null,
        //         'data_pendukung' => $detail['Data Pendukung'] ?? null,
        //         'nilai' => $detail['Nilai'] ?? null,
        //         'masukan' => $detail['Masukan'] ?? null,
        //     ];
        // }, $filteredDetails));

        try {
            Version::create([
                'user_id' => $validatedData['user_id'],
                'commit' => $validatedData['commit'] ?? null,
                'komentar' => $validatedData['komentar'] ?? null,
                'c' => $validatedData['c'],
                'taskId' => $validatedData['taskId'],
                // 'lamId' => $validatedData['lamId'],
                'prodiId' => $validatedData['prodiId'],
                'details' => $validatedData['Details'], 
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
