<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Color extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'colors';
    protected $fillable = [
        'label', 
        'value', 
        'rangeStart', 
        'rangeEnd'
    ];
}
