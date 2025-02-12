<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
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

        if (!$token = auth('api')->setTTL(60)->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $this->respondWithToken($token);
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

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL(),
            'role' => $user->role,
            'access' => $menuTree
        ]);
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