<?php
namespace App\Http\Controllers;

use App\Models\Jurusan;
use Illuminate\Http\Request;

class JurusanController extends Controller
{
    public function index()
    {
        $jurusans = Jurusan::with('prodis')->get();
        return response()->json($jurusans);
    }

    public function show($id)
    {
        $jurusan = Jurusan::with(['lam', 'prodis'])->find($id);

        if (!$jurusan) {
            return response()->json(['message' => 'Jurusan not found'], 404);
        }

        return response()->json($jurusan);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $jurusan = Jurusan::create($request->only(['name']));
        return response()->json($jurusan, 201);
    }

    public function update(Request $request, $id)
    {
        $jurusan = Jurusan::find($id);

        if (!$jurusan) {
            return response()->json(['message' => 'Jurusan not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'lamId' => 'required|exists:lam,_id'
        ]);

        $jurusan->update($request->only(['name', 'lamId']));

        return response()->json($jurusan);
    }

    public function destroy($id)
    {
        $jurusan = Jurusan::find($id);

        if (!$jurusan) {
            return response()->json(['message' => 'Jurusan not found'], 404);
        }

        $jurusan->delete();

        return response()->json(['message' => 'Jurusan deleted successfully']);
    }
}