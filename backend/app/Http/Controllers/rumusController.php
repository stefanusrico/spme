<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\rumus;

class rumusController extends Controller
{
     // Menampilkan semua data
     public function index()
     {
         return response()->json(Rumus::all());
     }
 
     // Menyimpan data baru
     public function store(Request $request)
     {
         $request->validate([
             'nomor' => 'required|integer',
             'sub' => 'required|string',
             'rumus' => 'required|string',
         ]);
 
         $rumus = Rumus::create($request->all());
 
         return response()->json($rumus, 201);
     }
 
     // Menampilkan data berdasarkan ID
     public function show($id)
     {
         $rumus = Rumus::find($id);
         if (!$rumus) {
             return response()->json(['message' => 'Data tidak ditemukan'], 404);
         }
 
         return response()->json($rumus);
     }
 
     // Memperbarui data
     public function update(Request $request, $id)
     {
         $rumus = Rumus::find($id);
         if (!$rumus) {
             return response()->json(['message' => 'Data tidak ditemukan'], 404);
         }
 
         $rumus->update($request->all());
 
         return response()->json($rumus);
     }
 
     // Menghapus data
     public function destroy($id)
     {
         $rumus = Rumus::find($id);
         if (!$rumus) {
             return response()->json(['message' => 'Data tidak ditemukan'], 404);
         }
 
         $rumus->delete();
 
         return response()->json(['message' => 'Data berhasil dihapus']);
     }
}
