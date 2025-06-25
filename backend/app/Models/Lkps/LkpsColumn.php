<?php

namespace App\Models\Lkps;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\BSON\ObjectId;

class LkpsColumn extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_columns';

    protected $fillable = [
        'lkpsTableId',
        'indeksData',
        'judul',
        'type',
        'lebar',
        'indeksExcel',
        'order',
        'fillable',
        'align',
        'isGroup',
        'parentId'
    ];

    /**
     * Mutator for parentId
     * Ensures parentId is saved as ObjectId
     */
    public function setParentIdAttribute($value)
    {
        if ($value && !($value instanceof ObjectId)) {
            // If value is a string, convert to ObjectId
            if (is_string($value)) {
                // Remove quotes if present
                $value = trim($value, '"');

                // Try to create ObjectId
                if (strlen($value) === 24) {
                    $this->attributes['parentId'] = new ObjectId($value);
                    return;
                }
            }
        }

        $this->attributes['parentId'] = $value;
    }

    /**
     * Get the table this column belongs to (menggunakan lkpsTableId)
     */
    public function table()
    {
        return $this->belongsTo(LkpsTable::class, 'lkpsTableId', '_id');
    }

    /**
     * Legacy method untuk backward compatibility
     */
    public function tabel()
    {
        return $this->table();
    }

    /**
     * Get parent column if this is a child column
     */
    public function parent()
    {
        if (!$this->parentId) {
            return null;
        }

        return $this->belongsTo(self::class, 'parentId', '_id');
    }

    public function children()
    {
        // ✅ CRITICAL FIX: Always return relationship instance
        // Laravel Eloquent requires relationship instance, not collection
        return $this->hasMany(self::class, 'parentId', '_id')->orderBy('order');
    }

    /**
     * ✅ ADD: Helper method untuk check if has children
     */
    public function hasChildren()
    {
        return $this->isGroup && $this->children()->count() > 0;
    }

    /**
     * ✅ ADD: Get children as collection (untuk non-relationship usage)
     */
    public function getChildrenCollection()
    {
        if (!$this->isGroup) {
            return collect([]);
        }

        return $this->children()->get();
    }

    /**
     * ✅ ADD: Get children as array (untuk JSON serialization)
     */
    public function getChildrenAttribute()
    {
        if (!$this->isGroup) {
            return [];
        }

        // ✅ IMPORTANT: Use get() to execute query and return collection
        return $this->children()->get()->toArray();
    }

    /**
     * Create a column with proper parent-child validation
     *
     * @param array $attributes
     * @return static
     * @throws \Exception If parentId is invalid
     */
    public static function createWithValidation(array $attributes)
    {
        // If parentId is provided, validate it
        if (isset($attributes['parentId']) && $attributes['parentId']) {
            $parentColumn = self::find($attributes['parentId']);

            if (!$parentColumn) {
                throw new \Exception('Parent column not found');
            }

            if (!$parentColumn->isGroup) {
                throw new \Exception('Parent column is not a group column');
            }

            if ($parentColumn->lkpsTableId !== $attributes['lkpsTableId']) {
                throw new \Exception('Parent column belongs to a different table');
            }
        }

        return self::create($attributes);
    }

    /**
     * Scope to filter by table ID
     */
    public function scopeByTableId($query, $tableId)
    {
        return $query->where('lkpsTableId', (string) $tableId);
    }

    /**
     * Get table ID as string (helper method)
     */
    public function getTableIdAttribute()
    {
        return (string) $this->lkpsTableId;
    }
}
