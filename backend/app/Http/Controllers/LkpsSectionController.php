<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Lkps;
use App\Models\LkpsSection;
use App\Models\LkpsData;
use App\Models\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class LkpsSectionController extends Controller
{

    public function getAllSections()
    {
        try {
            $sections = LkpsSection::select('code', 'title')->get();

            \Log::info('LKPS Sections count: ' . $sections->count());

            return response()->json([
                'message' => 'Success',
                'count' => $sections->count(),
                'data' => $sections
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in cegetAllSections: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error retrieving LKPS sections',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function addSection(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|unique:lkps_sections,code',
            'title' => 'required|string',
            'subtitle' => 'nullable|string',
            'order' => 'nullable|integer',
            'has_formula' => 'boolean',
            'formula_nomor' => 'nullable|string',
            'formula_sub' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $section = LkpsSection::create([
                'code' => $request->input('code'),
                'title' => $request->input('title'),
                'subtitle' => $request->input('subtitle', null),
                'order' => $request->input('order', 0),
                'has_formula' => $request->input('has_formula', false),
                'formula_nomor' => $request->input('formula_nomor'),
                'formula_sub' => $request->input('formula_sub')
            ]);

            return response()->json([
                'message' => 'Section created successfully',
                'section' => $section
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create section',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get section configuration
     * 
     * @param string $sectionCode Section code (e.g., "1", "2a", "3b2")
     * @return \Illuminate\Http\JsonResponse
     */
    public function getConfig($sectionCode)
    {
        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $config = $section->getConfig();

        return response()->json($config);
    }

    /**
     * Get section data for the current LKPS of a prodi
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $sectionCode Section code
     * @return \Illuminate\Http\JsonResponse
     */
    public function getData(Request $request, $sectionCode)
    {
        // Get prodi ID from request or user
        $prodiId = $request->input('prodiId') ?? Auth::user()->prodiId;

        // Get active LKPS for this prodi
        $lkps = Lkps::getActiveForProdi($prodiId);

        if (!$lkps) {
            return response()->json([
                'message' => 'No active LKPS found for this prodi',
                'create_new' => true
            ], 404);
        }

        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $tables = $section->tables();
        $result = [
            'section_code' => $sectionCode,
            'lkpsId' => $lkps->_id,
            'tables' => [],
            'score' => null
        ];

        foreach ($tables as $table) {
            $data = LkpsData::getData($lkps->_id, $sectionCode, $table->code);
            $result['tables'][$table->code] = $data ?? [];
        }

        $result['score'] = LkpsData::getScore($lkps->_id, $sectionCode);

        return response()->json($result);
    }

    /**
     * Save section data for the current LKPS of a prodi
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $sectionCode Section code
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveData(Request $request, $sectionCode)
    {
        // Get user ID for tracking changes
        $userId = Auth::id();

        // Get prodi ID from request or user
        $prodiId = $request->input('prodiId') ?? Auth::user()->prodiId;

        // Get prodi
        $prodi = Prodi::find($prodiId);

        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        // Get active LKPS or create if not exists
        try {
            $tahunAkademik = $request->input('tahunAkademik', date('Y') . '/' . (date('Y') + 1));
            $lkps = $prodi->getOrCreateLkps($tahunAkademik, $userId);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }

        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $tables = $section->tables();
        $score = $request->input('score');
        $scoreDetail = $request->input('scoreDetail');

        // Validate that the tables in the request exist
        $tableData = $request->except(['score', 'scoreDetail', 'prodiId', 'tahunAkademik']);


        foreach ($tableData as $tableCode => $data) {
            $table = $tables->where('code', $tableCode)->first();

            if (!$table) {
                return response()->json([
                    'message' => "Table {$tableCode} does not exist in section {$sectionCode}"
                ], 400);
            }

            // Save the data
            LkpsData::saveData(
                $lkps->_id,
                $sectionCode,
                $tableCode,
                $data,
                $score,
                $scoreDetail,
                $userId
            );
        }

        // Update the LKPS lastUpdated timestamp
        $lkps->lastUpdated = now();
        $lkps->updatedBy = $userId;
        $lkps->save();

        return response()->json([
            'message' => 'Data saved successfully',
            'lkpsId' => $lkps->_id
        ]);
    }

    /**
     * Calculate score for a section based on provided data
     * 
     * @param \Illuminate\Http\Request $request
     * @param string $sectionCode Section code
     * @return \Illuminate\Http\JsonResponse
     */
    public function calculateScore(Request $request, $sectionCode)
    {
        $section = LkpsSection::where('code', $sectionCode)->first();

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        $data = $request->input('data', []);

        // Validate data format
        if (!is_array($data)) {
            return response()->json(['message' => 'Invalid data format'], 400);
        }

        $score = $section->calculateScore($data);

        return response()->json([
            'score' => $score,
            'section_code' => $sectionCode
        ]);
    }

    /**
     * Create a new LKPS for a prodi
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createLkps(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'prodiId' => 'required',
            'tahunAkademik' => 'required'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $prodiId = $request->input('prodiId');
        $tahunAkademik = $request->input('tahunAkademik');
        $userId = Auth::id();

        $prodi = Prodi::find($prodiId);

        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        try {
            $lkps = $prodi->getOrCreateLkps($tahunAkademik, $userId);

            return response()->json([
                'message' => 'LKPS created successfully',
                'lkps' => $lkps
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Submit LKPS for review
     * 
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function submitLkps(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'lkpsId' => 'required'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $lkpsId = $request->input('lkpsId');

        $lkps = Lkps::find($lkpsId);

        if (!$lkps) {
            return response()->json(['message' => 'LKPS not found'], 404);
        }

        $lkps->submit();

        return response()->json([
            'message' => 'LKPS submitted successfully',
            'lkps' => $lkps
        ]);
    }
}