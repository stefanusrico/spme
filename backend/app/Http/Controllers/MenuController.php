<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MenuController extends Controller
{
    /**
     * Menampilkan daftar semua menu.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        try {
            $menus = Menu::all(); 

            $menuTree = $this->buildMenuTree($menus);

            return response()->json([
                'status' => 'success',
                'data' => $menuTree
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch menus'], 500);
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
                    'children' => $children,
                    'id' => $menu->id
                ];

                // Jika menu tidak memiliki anak, tambahkan properti `url`
                if (empty($children)) {
                    $menuData['url'] = $menu->url;
                }

                $tree[] = $menuData;
            }
        }

        return $tree;
    }

    /**
     * Menyimpan menu baru.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            $validatedData = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'order' => 'required|integer', 
                'parent_id' => 'nullable|string|max:255',
                'url' => 'required|string|max:255',
                'icon' => 'required|string|max:255',
            ]);

            if ($validatedData->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validatedData->errors()
                ], 400);
            }

            $menu = Menu::create([
                'name' => $request->name,
                'order' => $request->order,
                'parent_id' => $request->parent_id,
                'url' => $request->url,
                'icon' => $request->icon,
            ]);

            return response()->json([
                'status' => 'success',
                'data' => $menu
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Menampilkan menu berdasarkan ID.
     *
     * @param  \App\Models\Menu  $menu
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        try {
            $menu = Menu::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $menu
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'menu tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Mengupdate data menu berdasarkan ID.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Menu  $menu
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        try {
            $menu = Menu::findOrFail($id);

            $validatedData = Validator::make($request->all(), [
                'name' => 'required|string|max:255'
            ]);

            if ($validatedData->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validatedData->errors()
                ], 400);
            }

            $menu->fill($request->only([
                'name',
            ]));

            $menu->save();
            
            $menu->refresh();

            return response()->json([
                'status' => 'success',
                'data' => $menu
            ]);
        } catch (\Throwable $th) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update menu: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Menghapus menu berdasarkan ID.
     *
     * @param  \App\Models\Menu  $menu
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            $menu = Menu::findOrFail($id);
            $menu->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'menu berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus user: ' . $e->getMessage()
            ], 500);
        }
    }
}
