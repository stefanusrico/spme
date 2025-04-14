<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Lkps;
use App\Models\Prodi;
use App\Models\LkpsData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class LkpsController extends Controller
{
    /**
     * Get all LKPS documents for a prodi
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProdiLkps(Request $request)
    {
        // Get prodi ID from request or user
        $prodiId = $request->input('prodiId') ?? Auth::user()->prodiId;

        $prodi = Prodi::find($prodiId);
        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        $lkps = Lkps::where('prodiId', $prodiId)
            ->orderBy('tanggalPembuatan', 'desc')
            ->get();

        return response()->json([
            'prodi' => [
                'id' => $prodi->_id,
                'name' => $prodi->name
            ],
            'lkps' => $lkps
        ]);
    }

    /**
     * Get an LKPS document by ID
     * 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLkps($id)
    {
        $lkps = Lkps::find($id);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Get prodi info
        $prodi = $lkps->prodi;

        // Get completion status
        $completionStatus = $this->calculateCompletionStatus($lkps);

        return response()->json([
            'lkps' => $lkps,
            'prodi' => $prodi ? [
                'id' => $prodi->_id,
                'name' => $prodi->name
            ] : null,
            'completion' => $completionStatus
        ]);
    }

    /**
     * Create a new LKPS document
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createLkps(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'tahunAkademik' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tahunAkademik = $request->input('tahunAkademik');
        $userId = Auth::id();
        $user = Auth::user();

        // Debug logging
        \Log::info('User Prodi Details:', [
            'user_id' => $user->_id,
            'prodiId' => $user->prodiId,
            'user_prodi_relation' => $user->prodi ? $user->prodi->_id : 'No Prodi Found'
        ]);

        // Attempt to get prodi using different methods
        $prodi = null;

        // Try relationship first
        if ($user->prodi) {
            $prodi = $user->prodi;
        }

        // If relationship fails, try direct find
        if (!$prodi && $user->prodiId) {
            $prodi = Prodi::find($user->prodiId);
        }

        if (!$prodi) {
            return response()->json([
                'message' => 'User is not associated with a Prodi',
                'user_details' => [
                    'prodiId' => $user->prodiId,
                    'prodi_relation' => $user->prodi ? 'Exists' : 'Not Found'
                ]
            ], 404);
        }

        try {
            $lkps = $prodi->getOrCreateLkps($tahunAkademik, $userId);

            return response()->json([
                'message' => 'LKPS created successfully',
                'lkps' => $lkps
            ]);
        } catch (\Exception $e) {
            \Log::error('LKPS Creation Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Error creating LKPS: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Submit an LKPS document for review
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function submitLkps(Request $request, $id)
    {
        $lkps = Lkps::find($id);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if any required sections are missing data
        $completionStatus = $this->calculateCompletionStatus($lkps);

        if ($completionStatus['percent'] < 100) {
            return response()->json([
                'message' => 'Cannot submit incomplete LKPS',
                'completion' => $completionStatus
            ], 400);
        }

        $lkps->submit();

        return response()->json([
            'message' => 'LKPS submitted successfully',
            'lkps' => $lkps
        ]);
    }

    /**
     * Update an LKPS document
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateLkps(Request $request, $id)
    {
        $lkps = Lkps::find($id);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Only allow updating draft LKPS
        if ($lkps->status !== 'draft') {
            return response()->json(['message' => 'Only draft LKPS can be updated'], 400);
        }

        $validator = \Validator::make($request->all(), [
            'tahunAkademik' => 'sometimes|string',
            'isActive' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Update fields
        if ($request->has('tahunAkademik')) {
            $lkps->tahunAkademik = $request->input('tahunAkademik');
        }

        if ($request->has('isActive')) {
            $lkps->isActive = $request->input('isActive');
        }

        $lkps->updatedBy = Auth::id();
        $lkps->lastUpdated = now();
        $lkps->save();

        return response()->json([
            'message' => 'LKPS updated successfully',
            'lkps' => $lkps
        ]);
    }

    /**
     * Calculate LKPS completion status
     * 
     * @param \App\Models\Lkps $lkps
     * @return array
     */
    private function calculateCompletionStatus(Lkps $lkps)
    {
        // Get all sections
        $sections = \App\Models\LkpsSection::all();
        $totalSections = $sections->count();

        if ($totalSections === 0) {
            return [
                'completed' => 0,
                'total' => 0,
                'percent' => 100
            ];
        }

        // Count sections with data
        $completedSections = 0;
        $sectionsWithData = [];
        $sectionsWithoutData = [];

        foreach ($sections as $section) {
            // Check if this section has data
            $hasData = LkpsData::where('lkpsId', $lkps->_id)
                ->where('section_code', $section->code)
                ->exists();

            if ($hasData) {
                $completedSections++;
                $sectionsWithData[] = [
                    'code' => $section->code,
                    'title' => $section->title
                ];
            } else {
                $sectionsWithoutData[] = [
                    'code' => $section->code,
                    'title' => $section->title
                ];
            }
        }

        $percentComplete = $totalSections > 0
            ? round(($completedSections / $totalSections) * 100)
            : 100;

        return [
            'completed' => $completedSections,
            'total' => $totalSections,
            'percent' => $percentComplete,
            'completedSections' => $sectionsWithData,
            'incompleteSections' => $sectionsWithoutData
        ];
    }

    /**
     * Delete an LKPS document (for admin use only)
     * 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteLkps($id)
    {
        $lkps = Lkps::find($id);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        // Check if user has permission (admin only)
        if (!Auth::user()->hasRole('Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete all associated data
        LkpsData::where('lkpsId', $id)->delete();

        // Delete LKPS
        $lkps->delete();

        return response()->json(['message' => 'LKPS deleted successfully']);
    }
}