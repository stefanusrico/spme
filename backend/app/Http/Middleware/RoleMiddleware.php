<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized. User not authenticated.'
            ], 401);
        }

        $allowedRoles = [];
        foreach ($roles as $role) {
            $allowedRoles = array_merge(
                $allowedRoles,
                array_map('trim', explode('|', $role))
            );
        }

        $userRoles = is_array($user->role) ? $user->role : [$user->role];
        
        $hasRole = count(array_intersect($userRoles, $allowedRoles)) > 0;
        
        if (!$hasRole) {
            return response()->json([
                'message' => 'Unauthorized. Insufficient permissions.',
                'required_roles' => $allowedRoles,
                'user_roles' => $userRoles
            ], 403);
        }

        return $next($request);
    }
}