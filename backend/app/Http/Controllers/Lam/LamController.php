<?php

namespace App\Http\Controllers\Lam;

use App\Http\Controllers\Controller;
use App\Models\Lam\Lam;
use Illuminate\Http\Request;

class LamController extends Controller
{
    public function index()
    {
        return response()->json(Lam::with(['jadwals'])->get());
    }

    public function show($id)
    {
        $lam = Lam::with(['jadwals', 'jurusans'])->find($id);

        if (!$lam) {
            return response()->json(['message' => 'LAM not found'], 404);
        }

        return response()->json($lam);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:lam,name',
            'hasBatch' => 'required|boolean'
        ]);

        $lam = Lam::create([
            'name' => $request->name,
            'hasBatch' => $request->hasBatch
        ]);

        return response()->json($lam, 201);
    }
    public function update(Request $request, $id)
    {
        $lam = Lam::find($id);

        if (!$lam) {
            return response()->json(['message' => 'LAM not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|unique:lam,name,' . $id,
            'hasBatch' => 'required|boolean'
        ]);

        $lam->update($request->all());
        return response()->json($lam);
    }

    public function destroy($id)
    {
        $lam = Lam::find($id);

        if (!$lam) {
            return response()->json(['message' => 'LAM not found'], 404);
        }

        $lam->delete();
        return response()->json(['message' => 'LAM deleted successfully']);
    }
}