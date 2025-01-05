<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Menampilkan daftar semua role.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        try {
            $roles = Role::all(); 
            return response()->json([
                'status' => 'success',
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch roles'], 500);
        }
    }

    /**
     * Menyimpan role baru.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            
            $validatedData = Validator::make($request->all(), [
                'name' => 'required|string|max:255'
            ]);
    
            if ($validatedData->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validatedData->errors()
                ], 400);
            }

            try {
                $role = Role::create([
                    'name' => $request->name
                ]);

                return response()->json([
                    'status' => 'success',
                    'data' => $role
                ], 200);
            } catch (\Throwable $th) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal membuat role: ' . $e->getMessage()
                ], 500);
            }

            return response()->json($role, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Menampilkan role berdasarkan ID.
     *
     * @param  \App\Models\Role  $role
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        try {
            $role = Role::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $role
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Role tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Mengupdate data role berdasarkan ID.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Role  $role
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        try {
            $role = Role::findOrFail($id);

            $validatedData = Validator::make($request->all(), [
                'name' => 'required|string|max:255'
            ]);

            if ($validatedData->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validatedData->errors()
                ], 400);
            }

            $role->fill($request->only([
                'name',
            ]));

            $role->save();
            
            $role->refresh();

            return response()->json([
                'status' => 'success',
                'data' => $role
            ]);
        } catch (\Throwable $th) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Menghapus role berdasarkan ID.
     *
     * @param  \App\Models\Role  $role
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            $role = Role::findOrFail($id);
            $role->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Role berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus user: ' . $e->getMessage()
            ], 500);
        }
    }
}
