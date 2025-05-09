<?php

namespace App\Models\Lkps;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\BSON\ObjectId;

class LkpsColumn extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_columns';

    protected $fillable = [
        'kodeTabel',    // Reference to the table this column belongs to
        'indeksData',   // Field name in the data object (e.g., 'lembagamitra')
        'judul',        // Display title for the column
        'type',         // Data type: 'text', 'number', 'boolean', 'date', 'url', 'group'
        'lebar',        // Column width (for UI display)
        'indeksExcel',  // Column index in Excel file (0-based)
        'order',        // Display order within the table or parent group
        'align',        // Text alignment: 'left', 'center', 'right'
        'isGroup',      // Whether this is a group column with child columns
        'parentId'      // Reference to parent column if this is a child column
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
     * Get the table this column belongs to
     */
    public function tabel()
    {
        return $this->belongsTo(LkpsTable::class, 'kodeTabel', 'kode');
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

    /**
     * Get child columns if this is a group column
     */
    public function children()
    {
        if (!$this->isGroup) {
            return collect([]);
        }

        return $this->hasMany(self::class, 'parentId', '_id')->orderBy('order');
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

            if ($parentColumn->kodeTabel !== $attributes['kodeTabel']) {
                throw new \Exception('Parent column belongs to a different table');
            }
        }

        return self::create($attributes);
    }
}