<?php

namespace App\Models\Project;

use App\Models\User\User;
use MongoDB\Laravel\Eloquent\Model;

class ProjectMember extends Model
{
  protected $connection = 'mongodb';
  protected $collection = 'project_members';

  protected $fillable = [
    'projectId',
    'userId',
    'role',
    'joinedAt'
  ];

  protected $casts = [
    'joinedAt' => 'datetime'
  ];

  protected $indexes = [
    ['key' => ['projectId' => 1]],
    ['key' => ['userId' => 1]],
    ['key' => ['projectId' => 1, 'userId' => 1], 'unique' => true],
    ['key' => ['role' => 1]]
  ];

  public function project()
  {
    return $this->belongsTo(Project::class, 'projectId', '_id');
  }

  public function user()
  {
    return $this->belongsTo(User::class, 'userId', '_id');
  }

  /**
   * Check if the user is the owner of the project
   *
   * @return bool
   */
  public function isOwner()
  {
    return $this->role === 'owner';
  }

  /**
   * Check if the user is an admin of the project
   *
   * @return bool
   */
  public function isAdmin()
  {
    return $this->role === 'admin';
  }

  /**
   * Check if the user can manage the project
   *
   * @return bool
   */
  public function canManageProject()
  {
    return in_array($this->role, ['owner', 'admin']);
  }
}