<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Rumus extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'rumus';
    
    protected $guarded = [];
    
    // Define default structure
    protected $attributes = [
        'is_active' => true,
    ];
    
    /**
     * Get formula by indicator number and optional sub-indicator
     * 
     * @param string $nomor Nomor indikator (e.g., "15", "25")
     * @param string|null $sub Optional sub-indicator identifier
     * @return Rumus|null
     */
    public static function getByIndicator($nomor, $sub = null)
    {
        $query = self::where('nomor', $nomor);
        
        if ($sub !== null) {
            $query->where('sub', $sub);
        }
        
        return $query->first();
    }
    
    /**
     * Calculate score based on provided values
     * 
     * @param array $values Input values for calculation
     * @return float|null Calculated score or null if calculation fails
     */
    public function calculateScore(array $values)
    {
        $formula_type = $this->formula_type ?? 'simple';
        
        switch ($formula_type) {
            case 'simple':
                return $this->calculateSimpleFormula($values);
                
            case 'conditional':
                return $this->calculateConditionalFormula($values);
                
            case 'range':
                return $this->calculateRangeFormula($values);
                
            case 'complex':
                return $this->calculateComplexFormula($values);
                
            default:
                return null;
        }
    }
    
    /**
     * Calculate score for simple formula
     */
    protected function calculateSimpleFormula(array $values)
    {
        $formula = $this->main_formula;
        
        // If no main formula provided, use the first condition's formula
        if (empty($formula) && isset($this->conditions[0]['formula'])) {
            $formula = $this->conditions[0]['formula'];
        }
        
        // Replace variables in formula with actual values
        foreach ($values as $key => $value) {
            $formula = str_replace('{' . $key . '}', (float)$value, $formula);
            $formula = str_replace($key, (float)$value, $formula);
        }
        
        try {
            // Use eval with caution - consider a math parser library for production
            return eval('return ' . $formula . ';');
        } catch (\Exception $e) {
            return null;
        }
    }
    
    /**
     * Calculate score based on conditions
     */
    protected function calculateConditionalFormula(array $values)
    {
        $conditions = $this->conditions ?? [];
        
        foreach ($conditions as $condition) {
            $expression = $this->prepareConditionExpression($condition['condition'], $values);
            
            try {
                $result = eval('return ' . $expression . ';');
                if ($result) {
                    // Evaluate the formula for this condition
                    $formula = $condition['formula'];
                    
                    // Replace variables in formula
                    foreach ($values as $key => $value) {
                        $formula = str_replace('{' . $key . '}', (float)$value, $formula);
                        $formula = str_replace($key, (float)$value, $formula);
                    }
                    
                    // Replace parameter variables
                    if (isset($this->parameters)) {
                        foreach ($this->parameters as $key => $value) {
                            $formula = str_replace('{' . $key . '}', (float)$value, $formula);
                            $formula = str_replace($key, (float)$value, $formula);
                        }
                    }
                    
                    return eval('return ' . $formula . ';');
                }
            } catch (\Exception $e) {
                continue;
            }
        }
        
        // Default formula or return null if no conditions match
        return null;
    }
    
    /**
     * Calculate score based on value ranges
     */
    protected function calculateRangeFormula(array $values)
    {
        $ranges = $this->ranges ?? [];
        
        // First, evaluate the main formula if it exists
        if (!empty($this->main_formula)) {
            // Extract range field from main formula (simplified approach)
            $parts = explode('=', $this->main_formula);
            $rangeField = trim($parts[0]);
            
            // Evaluate the formula
            $formula = $this->main_formula;
            foreach ($values as $key => $value) {
                $formula = str_replace($key, (float)$value, $formula);
            }
            
            try {
                eval('$values["' . $rangeField . '"] = ' . $parts[1] . ';');
            } catch (\Exception $e) {
                // Failed to evaluate formula
            }
        }
        
        $valueToCheck = $values[$this->range_field] ?? null;
        
        if ($valueToCheck === null) {
            return null;
        }
        
        foreach ($ranges as $range) {
            $min = $range['min'] ?? null;
            $max = $range['max'] ?? null;
            
            // Check if value falls within range
            if (
                ($min === null || $valueToCheck >= $min) && 
                ($max === null || $valueToCheck <= $max)
            ) {
                if (isset($range['score'])) {
                    return $range['score'];
                } elseif (isset($range['formula'])) {
                    $formula = $range['formula'];
                    foreach ($values as $key => $value) {
                        $formula = str_replace($key, (float)$value, $formula);
                    }
                    return eval('return ' . $formula . ';');
                }
            }
        }
        
        return null;
    }
    
    /**
     * Calculate score for complex formula types
     */
    protected function calculateComplexFormula(array $values)
    {
        // For complex formulas, first evaluate the conditions
        $conditionalResult = $this->calculateConditionalFormula($values);
        
        if ($conditionalResult !== null) {
            return $conditionalResult;
        }
        
        // If no conditions matched, try to evaluate the main formula
        if (!empty($this->main_formula)) {
            $formula = $this->main_formula;
            
            // Replace variables in formula
            foreach ($values as $key => $value) {
                $formula = str_replace('{' . $key . '}', (float)$value, $formula);
                $formula = str_replace($key, (float)$value, $formula);
            }
            
            // Replace parameter variables
            if (isset($this->parameters)) {
                foreach ($this->parameters as $key => $value) {
                    $formula = str_replace('{' . $key . '}', (float)$value, $formula);
                    $formula = str_replace($key, (float)$value, $formula);
                }
            }
            
            try {
                return eval('return ' . $formula . ';');
            } catch (\Exception $e) {
                return null;
            }
        }
        
        return null;
    }
    
    /**
     * Prepare condition expression by replacing variables
     */
    protected function prepareConditionExpression($condition, array $values)
    {
        foreach ($values as $key => $value) {
            // For numeric values, insert directly
            if (is_numeric($value)) {
                $condition = str_replace('{' . $key . '}', (float)$value, $condition);
                $condition = str_replace($key, (float)$value, $condition);
            } 
            // For string values, wrap in quotes
            else {
                $condition = str_replace('{' . $key . '}', "'" . addslashes($value) . "'", $condition);
                $condition = str_replace($key, "'" . addslashes($value) . "'", $condition);
            }
        }
        
        // Replace parameter variables
        if (isset($this->parameters)) {
            foreach ($this->parameters as $key => $value) {
                if (is_numeric($value)) {
                    $condition = str_replace('{' . $key . '}', (float)$value, $condition);
                    $condition = str_replace($key, (float)$value, $condition);
                } else {
                    $condition = str_replace('{' . $key . '}', "'" . addslashes($value) . "'", $condition);
                    $condition = str_replace($key, "'" . addslashes($value) . "'", $condition);
                }
            }
        }
        
        return $condition;
    }
}