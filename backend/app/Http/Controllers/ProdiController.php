<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache; 

class ProdiController extends Controller
{
    public function index()
    {
        $prodis = Prodi::all();
        return response()->json($prodis);
    }

    public function show($id)
    {
        $prodi = Prodi::with('jurusan')->find($id);

        if (!$prodi) {
            return response()->json(['message' => 'Prodi not found'], 404);
        }

        return response()->json($prodi);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'jurusanId' => 'required|exists:jurusans,_id',
                'name' => 'required|string|max:255',
                'nomorSK' => 'required|string|max:255',
                'tahunSK' => 'required|integer',
                'peringkat' => 'required|string|max:15',
                'tanggalKedaluwarsa' => 'required|date',
                'tanggalAkhirSubmit' => 'nullable|date',
            ]);

            $prodi = Prodi::create([
                'jurusanId' => $request->jurusanId,
                'name' => $request->name,
                'nomorSK' => $request->nomorSK,
                'tahunSK' => $request->tahunSK,
                'peringkat' => $request->peringkat,
                'tanggalKedaluwarsa' => $request->tanggalKedaluwarsa,
                'tanggalAkhirSubmit' => $request->tanggalAkhirSubmit ?? null,
            ]);

            return response()->json($prodi, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage(),
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
            'jurusanId',
            'name',
            'nomorSK',
            'tahunSK',
            'peringkat',
            'tanggalKedaluwarsa',
            'tanggalAkhirSubmit'
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
            $peringkatCount = Cache::get('peringkat_count');

            if (!$peringkatCount) {
                $prodis = Prodi::all();
                $peringkatCount = [];

                foreach ($prodis as $prodi) {
                    $peringkat = $prodi->peringkat;
                    if (!isset($peringkatCount[$peringkat])) {
                        $peringkatCount[$peringkat] = [
                            'peringkat' => $peringkat,
                            'count' => 0
                        ];
                    }
                    $peringkatCount[$peringkat]['count']++;
                }

                $peringkatCount = array_values($peringkatCount);

                Cache::put('peringkat_count', $peringkatCount, 60);
            }

            return response()->json($peringkatCount);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}