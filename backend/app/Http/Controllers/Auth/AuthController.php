<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;

use App\Models\User\User;
use App\Models\User\Role;
use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Handle user login.
     */
    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        try {
            $ttl = (int) config('jwt.ttl', 1440);

            if (!$token = auth('api')->setTTL($ttl)->attempt($credentials)) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            return $this->respondWithToken($token);

        } catch (\Exception $e) {
            \Log::error('JWT Login Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Authentication error',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again'
            ], 500);
        }
    }

    /**
     * Handle user logout.
     */
    public function logout()
    {
        Auth::guard('api')->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh JWT Token.
     */
    public function refresh()
    {
        return $this->respondWithToken(auth('api')->refresh());
    }


    /**
     * Return JWT Token response.
     */
    protected function respondWithToken($token)
    {
        try {
            $user = Auth::user();

            $role = Role::where('name', $user->role)->first();

            if (!$role) {
                return response()->json(['error' => 'Role not found'], 404);
            }

            $menus = Menu::all();
            $accessibleMenus = $menus->filter(function ($menu) use ($role) {
                return in_array($menu->id, $role->access);
            });
            $menuTree = $this->buildMenuTree($accessibleMenus);

            // Multiple safety checks for TTL
            $ttlConfig = config('jwt.ttl');
            $ttlMinutes = is_numeric($ttlConfig) ? (int) $ttlConfig : 1440;

            return response()->json([
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => $ttlMinutes * 60,
                'expires_in_minutes' => $ttlMinutes,
                'role' => $user->role,
                'access' => $menuTree
            ]);

        } catch (\Exception $e) {
            \Log::error('JWT Token Response Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Token generation error',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again'
            ], 500);
        }
    }

    /**
     * Membuat tree dari koleksi menu
     */
    private function buildMenuTree($menus, $parentId = null)
    {
        $tree = [];

        foreach ($menus as $menu) {
            if ($menu->parent_id == $parentId) {
                $children = $this->buildMenuTree($menus, $menu->id);

                $menuData = [
                    'name' => $menu->name,
                    'order' => $menu->order,
                    'icon' => $menu->icon,
                    'children' => $children
                ];

                // Jika menu tidak memiliki anak, tambahkan properti `url`
                if (empty($children)) {
                    $menuData['url'] = $menu->url;
                }

                $tree[] = $menuData;
            }
        }

        usort($tree, function ($a, $b) {
            return $a['order'] <=> $b['order'];
        });

        return $tree;
    }

    public function testMongoConnection()
    {
        try {
            $users = User::all();
            return response()->json([
                'message' => 'Koneksi MongoDB berhasil',
                'user_count' => $users->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal terhubung ke MongoDB',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}