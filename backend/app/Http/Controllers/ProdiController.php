<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use App\Models\Jurusan;
use App\Models\Lam;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProdiController extends Controller
{
    public function index()
    {
        return response()->json(
            Prodi::with('lam')
                ->with('strata')
                ->orderBy('tanggalSubmit', 'asc')
                ->get()
        );
    }

    public function show($id)
    {
        $prodi = $prodi = Prodi::where('jurusanId', '=', $id)->get();
        return $prodi ? response()->json($prodi) : response()->json(['message' => 'Prodi not found'], 404);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'jurusanId' => 'required',
                'akreditasi' => 'required|array',
                'akreditasi.nomorSK' => 'required|string',
                'akreditasi.tahun' => 'required|integer',
                'akreditasi.peringkat' => 'required|string',
                'akreditasi.tanggalKedaluwarsa' => 'required|date',
                'akreditasi.lembagaAkreditasi' => 'required|string'
            ]);

            $jurusan = Jurusan::find($request->jurusanId);
            if (!$jurusan) {
                throw new \Exception('Invalid jurusanId');
            }

            $lam = Lam::where('name', $request->input('akreditasi.lembagaAkreditasi'))->first();
            if (!$lam) {
                throw new \Exception('Invalid lembagaAkreditasi');
            }

            $prodi = Prodi::create($request->all());
            return response()->json($prodi, 201);

        } catch (\Exception $e) {
            \Log::error("Error in store: " . $e->getMessage());
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $prodi = Prodi::find($id);
        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        $prodi->update($request->only([
            'name',
            'akreditasi',
            'jadwalLamId',
            'tanggalSubmit',
            'tanggalPengumuman'
        ]));

        return response()->json($prodi);
    }

    public function destroy($id)
    {
        $prodi = Prodi::find($id);
        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        $prodi->delete();
        return response()->json(['message' => 'Prodi deleted successfully']);
    }

    public function countByPeringkat()
    {
        try {
            $peringkatCount = Cache::remember('peringkat_count', 60, function () {
                return array_values(Prodi::all()->groupBy('akreditasi.peringkat')
                    ->map(function ($group, $peringkat) {
                        return [
                            'peringkat' => $peringkat,
                            'count' => $group->count()
                        ];
                    })->toArray());
            });

            return response()->json($peringkatCount);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}