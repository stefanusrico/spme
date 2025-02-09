<?php
namespace App\Http\Controllers;

use App\Models\Lam;
use App\Models\JadwalLam;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class JadwalLamController extends Controller
{
    public function index()
    {
        $jadwalLam = JadwalLam::all();
        return response()->json($jadwalLam);
    }

    public function store(Request $request)
    {
        $request->validate([
            'lamId' => 'required|exists:lam,_id',
            'tahun' => 'required|integer',
            'batch' => 'required|integer|between:1,3',
            'tanggalSubmit' => 'required|date',
            'tanggalPengumuman' => 'required|date|after:tanggalSubmit'
        ]);

        $jadwalLam = JadwalLam::create($request->all());
        return response()->json($jadwalLam, 201);
    }

    public function show($id)
    {
        $lam = Lam::find($id);
        if (!$lam) {
            return response()->json(['message' => 'LAM tidak ditemukan'], 404);
        }

        $jadwalLam = JadwalLam::where('lamId', $id)
            ->orderBy('tahun', 'asc')
            ->orderBy('batch', 'asc')
            ->get();

        if ($jadwalLam->isEmpty()) {
            return response()->json([
                'lam' => $lam,
                'schedules' => []
            ]);
        }

        return response()->json([
            'lam' => $lam,
            'schedules' => $jadwalLam
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $jadwalLam = JadwalLam::find($id);

            if (!$jadwalLam) {
                return response()->json(['message' => 'Jadwal LAM tidak ditemukan'], 404);
            }

            $request->validate([
                'tanggalSubmit' => 'required|date',
                'tanggalPengumuman' => [
                    'required',
                    'date',
                    'after:tanggalSubmit'
                ]
            ]);

            $jadwalLam->tanggalSubmit = new \MongoDB\BSON\UTCDateTime(strtotime($request->tanggalSubmit) * 1000);
            $jadwalLam->tanggalPengumuman = new \MongoDB\BSON\UTCDateTime(strtotime($request->tanggalPengumuman) * 1000);

            if ($jadwalLam->save()) {
                $updatedJadwal = $jadwalLam->fresh();
                return response()->json([
                    'message' => 'Jadwal berhasil diperbarui',
                    'data' => $updatedJadwal
                ]);
            }

            return response()->json([
                'message' => 'Gagal memperbarui jadwal',
                'error' => 'Unknown error'
            ], 500);

        } catch (\Exception $e) {
            \Log::error('Error updating jadwal: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return response()->json([
                'message' => 'Gagal memperbarui jadwal',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $jadwalLam = JadwalLam::find($id);

        if (!$jadwalLam) {
            return response()->json(['message' => 'Jadwal LAM tidak ditemukan'], 404);
        }

        $jadwalLam->delete();
        return response()->json(['message' => 'Jadwal LAM berhasil dihapus']);
    }

    public function generateYearlySchedule($year)
    {
        $lamWithBatch = Lam::where('hasBatch', true)->get();
        $lamWithoutBatch = Lam::where('hasBatch', false)->get();

        foreach ($lamWithBatch as $lam) {
            for ($batch = 1; $batch <= 3; $batch++) {
                JadwalLam::create([
                    'lamId' => $lam->_id,
                    'tahun' => $year,
                    'batch' => $batch,
                    'tanggalSubmit' => $this->getBatchSubmitDate($year, $batch),
                    'tanggalPengumuman' => $this->getBatchAnnouncementDate($year, $batch)
                ]);
            }
        }

        foreach ($lamWithoutBatch as $lam) {
            JadwalLam::create([
                'lamId' => $lam->_id,
                'tahun' => $year,
                'batch' => null,
                'tanggalSubmit' => Carbon::create($year, 1, 1, 7, 0, 0),
                'tanggalPengumuman' => Carbon::create($year, 3, 1, 7, 0, 0)
            ]);
        }

        return response()->json(['message' => "Jadwal tahun $year berhasil dibuat"]);
    }

    private function getBatchSubmitDate($year, $batch)
    {
        $dates = [
            1 => ['month' => 1, 'day' => 15],  // Batch 1: 15 Januari
            2 => ['month' => 5, 'day' => 15],  // Batch 2: 15 Mei 
            3 => ['month' => 9, 'day' => 15]   // Batch 3: 15 September
        ];

        $batchDate = $dates[$batch] ?? ['month' => 1, 'day' => 1];
        return Carbon::create($year, $batchDate['month'], $batchDate['day'], 7, 0, 0);
    }

    private function getBatchAnnouncementDate($year, $batch)
    {
        $dates = [
            1 => ['month' => 4, 'day' => 20],  // Batch 1: 20 April
            2 => ['month' => 8, 'day' => 20],  // Batch 2: 20 Agustus
            3 => ['month' => 12, 'day' => 20]  // Batch 3: 20 Desember
        ];

        $batchDate = $dates[$batch] ?? ['month' => 3, 'day' => 1];
        return Carbon::create($year, $batchDate['month'], $batchDate['day'], 7, 0, 0);
    }
}