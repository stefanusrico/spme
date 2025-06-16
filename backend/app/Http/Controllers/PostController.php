<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Post;

class PostController extends Controller
{

    public function store(Request $request)
    {
        $post = new Post;

        $post->setTable('lemao kang');

        $post->title = $request->title;
        $post->body = $request->body;
        $post->slug = $request->slug;

        $post->save();

        return response()->json(["result" => "ok"], 201);
    }
}