<?php

namespace App\Models;

// use Illuminate\Database\Eloquent\Model;
use MongoDB\Laravel\Eloquent\Model;


class Menu extends Model
{
    // Tentukan koneksi MongoDB
    protected $connection = 'mongodb';

    // Nama collection di MongoDB
    protected $collection = 'menus';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',          
        'order',         
        'parent_id',     
        'url',           
        'icon',          
    ];

    /**
     * Cast attributes to native types.
     *
     * @var array
     */
    protected $casts = [
        'order' => 'integer',
        'parent_id' => 'string', // Relasi ID ke menu induk
    ];

    /**
     * Relasi ke menu induk.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Relasi ke sub-menu.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function children()
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('order');
    }

    /**
     * Scope untuk mendapatkan menu utama (tanpa parent).
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeMainMenu($query)
    {
        return $query->whereNull('parent_id');
    }
}
