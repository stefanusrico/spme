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
            // 'UserId' => 'required|string',
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
                    // ->where('user_id', $validatedData['UserId'])
                    ->orderBy('created_at', 'desc')
                    ->first();

                $user = User::findOrFail($version->user_id);
                $version->user_name = $user->name;
            } else{
                $version = Version::where('no', $validatedData['No'])
                    ->where('sub', $validatedData['Sub'])
                    // ->where('user_id', $validatedData['UserId'])
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

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId' => 'required|string',
            'komentar' => 'nullable|string',
            'commit' => 'nullable|string',
            'C' => 'required|string',
            'No' => 'required|string',
            'Sub' => 'required|string',
            'Details' => 'required|array',
            'Details.*.Type' => 'required|string',
            'Details.*.Seq' => 'required|string',
            'Details.*.Reference' => 'required|string',
            'Details.*.Isian Asesi' => 'nullable|string',
            'Details.*.Data Pendukung' => 'nullable|string',
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
            ];
        }, $filteredDetails));

        try {
            Version::create([
                'user_id' => $validatedData['userId'],
                'commit' => $validatedData['commit'] ?? null,
                'komentar' => $validatedData['komentar'] ?? null,
                'c' => $validatedData['C'],
                'no' => $validatedData['No'],
                'sub' => $validatedData['Sub'],
                'details' => $detailsArray, 
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
