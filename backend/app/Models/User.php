<?php
namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Notifications\Notifiable;
use MongoDB\Laravel\Eloquent\Model;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Support\Facades\Hash;

class User extends Model implements JWTSubject, AuthenticatableContract
{
    use Authenticatable, Notifiable;

    protected $connection = 'mongodb';
    protected $collection = 'users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'username',
        'profile_picture',
        'role',
        'phone_number',
        'jurusanId', // Changed from 'jurusan'
        'prodiId',   // Changed from 'prodi'
        'projects',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class, 'jurusanId', '_id');
    }

    public function prodi()
    {
        return $this->belongsTo(Prodi::class, 'prodiId', '_id');
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = Hash::make($value);
    }

    public function createdProjects()
    {
        return $this->hasMany(Project::class, 'createdBy', '_id');
    }

    public function memberProjects()
    {
        return Project::where('members', $this->_id);
    }

    public static function findByEmail($email)
    {
        return self::where('email', $email)->first();
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    public function notifications()
    {
        return $this->morphMany(DatabaseNotification::class, 'notifiable')->orderBy('created_at', 'desc');
    }
}