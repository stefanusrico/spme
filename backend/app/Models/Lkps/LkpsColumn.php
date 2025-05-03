<?php

namespace App\Models\Lkps;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\BSON\ObjectId;

class LkpsColumn extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_columns';

    protected $fillable = [
        'table_code',   // Reference to the table this column belongs to
        'data_index',   // Field name in the data object (e.g., 'lembagamitra')
        'title',        // Display title for the column
        'type',         // Data type: 'text', 'number', 'boolean', 'date', 'url', 'group'
        'width',        // Column width (for UI display)
        'excel_index',  // Column index in Excel file (0-based)
        'order',        // Display order within the table or parent group
        'align',        // Text alignment: 'left', 'center', 'right'
        'is_group',     // Whether this is a group column with child columns
        'parent_id'     // Reference to parent column if this is a child column
    ];

    // Jangan gunakan casting object untuk parent_id
    // protected $casts = [
    //     'parent_id' => 'object'
    // ];

    /**
     * Mutator untuk parent_id
     * Memastikan parent_id disimpan sebagai ObjectId
     */
    public function setParentIdAttribute($value)
    {
        if ($value && !($value instanceof ObjectId)) {
            // Jika valuenya string, konversi ke ObjectId
            if (is_string($value)) {
                // Hapus tanda kutip jika ada
                $value = trim($value, '"');

                // Coba buat ObjectId
                if (strlen($value) === 24) {
                    $this->attributes['parent_id'] = new ObjectId($value);
                    return;
                }
            }
        }

        $this->attributes['parent_id'] = $value;
    }

    /**
     * Get the table this column belongs to
     */
    public function table()
    {
        return $this->belongsTo(LkpsTable::class, 'table_code', 'code');
    }

    /**
     * Get parent column if this is a child column
     */
    public function parent()
    {
        if (!$this->parent_id) {
            return null;
        }

        return $this->belongsTo(self::class, 'parent_id', '_id');
    }

    /**
     * Get child columns if this is a group column
     */
    public function children()
    {
        if (!$this->is_group) {
            return collect([]);
        }

        return $this->hasMany(self::class, 'parent_id', '_id')->orderBy('order');
    }

    /**
     * Get section code through table
     */
    public function getSectionCodeAttribute()
    {
        $table = $this->table;
        return $table ? $table->section_code : null;
    }

    /**
     * Create a column with proper parent-child validation
     * 
     * @param array $attributes
     * @return static
     * @throws \Exception If parent_id is invalid
     */
    public static function createWithValidation(array $attributes)
    {
        // If parent_id is provided, validate it
        if (isset($attributes['parent_id']) && $attributes['parent_id']) {
            $parentColumn = self::find($attributes['parent_id']);

            if (!$parentColumn) {
                throw new \Exception('Parent column not found');
            }

            if (!$parentColumn->is_group) {
                throw new \Exception('Parent column is not a group column');
            }

            if ($parentColumn->table_code !== $attributes['table_code']) {
                throw new \Exception('Parent column belongs to a different table');
            }
        }

        return self::create($attributes);
    }
}