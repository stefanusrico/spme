<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\User;
use App\Models\Prodi\Prodi;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with(['prodi'])->get();
        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string',
            'profile_picture' => 'nullable|string|max:255',
            'phone_number' => 'required|unique:users,phone_number|string',
            'prodiId' => 'required|exists:prodis,_id',
            'projects' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $profilePicturePath = null;

            if ($request->hasFile('profile_picture')) {
                $profilePicturePath = $request->file('profile_picture')->store('profile_pictures', 'public');
            } elseif ($request->input('profile_picture')) {
                $profilePicturePath = $request->input('profile_picture');
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password,
                'status' => $request->status ?? 'active',
                'role' => $request->role,
                'profile_picture' => $profilePicturePath,
                'phone_number' => $request->phone_number,
                'prodiId' => $request->prodiId,
                'projects' => $request->projects ?? null,
            ]);

            // Reload with relationships
            $user->load('prodi');

            return response()->json([
                'status' => 'success',
                'message' => 'User berhasil dibuat',
                'data' => $user
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat user: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAuthenticatedUserData(Request $request)
    {
        $user = Auth::user()->load('prodi');
        return response()->json($user);
    }

    public function show($id)
    {
        try {
            $user = User::with(['prodi'])->findOrFail($id);

            if ($user->profile_picture) {
                $user->profile_picture = asset('storage/' . $user->profile_picture);
            }

            return response()->json([
                'status' => 'success',
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'User tidak ditemukan'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
                'phone_number' => 'sometimes|string|unique:users,phone_number,' . $id,
                'profile_picture' => 'sometimes|nullable|string',
                'role' => 'sometimes|string',
                'prodiId' => 'sometimes|exists:prodis,_id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors()
                ], 400);
            }

            $user->fill($request->only([
                'name',
                'email',
                'phone_number',
                'profile_picture',
                'role',
                'prodiId'
            ]));

            $user->save();

            $user->refresh()->load('prodi');

            return response()->json([
                'status' => 'success',
                'message' => 'User updated successfully',
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update user: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updatePassword(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'current_password' => 'required|string',
                'password' => 'required|string|min:8|confirmed',
                'password_confirmation' => 'required'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors()
                ], 400);
            }

            if (!password_verify($request->current_password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Current password tidak sesuai'
                ], 400);
            }

            $user->password = $request->password;
            $user->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Password berhasil diupdate'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal update password: ' . $e->getMessage()
            ], 500);
        }
    }

    public function uploadFile(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:jpg,jpeg,png,pdf,doc,docx|max:2048',
                'directory' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors()
                ], 400);
            }

            $filePath = $request->file('file')->store($request->directory, 'public');

            return response()->json([
                'status' => 'success',
                'message' => 'File uploaded successfully',
                'file_path' => $filePath
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload file: ' . $e->getMessage()
            ], 500);
        }
    }

    public function removeProfilePicture($id)
    {
        try {
            $user = User::findOrFail($id);

            if (!$user->profile_picture) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User tidak memiliki foto profil'
                ], 400);
            }

            if (\Storage::disk('public')->exists($user->profile_picture)) {
                \Storage::disk('public')->delete($user->profile_picture);
            }

            $user->profile_picture = null;
            $user->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Foto profil berhasil dihapus',
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus foto profil: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $user->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'User berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus user: ' . $e->getMessage()
            ], 500);
        }
    }
}