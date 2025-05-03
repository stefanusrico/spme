<?php

namespace App\Traits;


use MongoDB\BSON\ObjectId;


trait ObjectIdConversion
{
  // app/Traits/ObjectIdConversion.php
  public function convertToObjectId($value)
  {
    // Skip jika null atau sudah ObjectId
    if ($value === null || $value instanceof ObjectId) {
      return $value;
    }

    // Handle Collection atau array
    if ($value instanceof \Illuminate\Support\Collection) {
      return $value->map(function ($item) {
        return $this->convertToObjectId($item);
      });
    }

    if (is_array($value)) {
      return array_map(function ($item) {
        return $this->convertToObjectId($item);
      }, $value);
    }

    // Validasi string ObjectId sebelum konversi
    if (is_string($value) && preg_match('/^[a-f\d]{24}$/i', $value)) {
      return new ObjectId($value);
    }

    throw new \InvalidArgumentException("Invalid ObjectId format: {$value}");
  }
  public function convertObjectIdToString($value)
  {
    if ($value instanceof \Illuminate\Support\Collection) {
      // Convert Collection to an array
      $value = $value->toArray();
    }

    // Check if the value is an array
    if (is_array($value)) {
      foreach ($value as $key => $item) {
        // Recursively call the function if the item is an array
        $value[$key] = (string) $item;
      }
      return $value;
    } else {
      // Convert the value to an ObjectId
      return (string) $value;
    }
  }

}