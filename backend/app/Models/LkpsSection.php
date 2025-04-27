<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class LkpsSection extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_sections';

    protected $fillable = [
        'code',
        'title',
        'subtitle',
        'order',
        'has_formula',
        'formula_nomor',
        'formula_sub'
    ];

    /**
     * Get all tables associated with this section
     */
    public function tables()
    {
        return LkpsTable::where('section_code', $this->code)->orderBy('order')->get();
    }

    /**
     * Get the formula associated with this section
     */
    public function formula()
    {
        if (!$this->has_formula || !$this->formula_nomor) {
            return null;
        }

        return Rumus::getByIndicator($this->formula_nomor, $this->formula_sub);
    }

    /**
     * Get complete section configuration including tables and columns
     */
    public function getConfig()
    {
        $tables = $this->tables();

        $tablesWithColumns = $tables->map(function ($table) {
            // Get all columns for this table
            $allColumns = LkpsColumn::where('table_code', $table->code)->get();

            // Get parent columns (those without parent_id)
            $parentColumns = $allColumns->where('parent_id', null)->sortBy('order');

            // Process columns and add children where applicable
            $processedColumns = $parentColumns->map(function ($column) use ($allColumns) {
                $columnData = $column->toArray();

                if ($column->is_group) {
                    // If it's a group column, find its children
                    $children = $allColumns->where('parent_id', $column->_id)->sortBy('order');

                    // Process each child and check if they have their own children
                    $processedChildren = [];
                    foreach ($children as $child) {
                        $childData = $child->toArray();

                        if ($child->is_group) {
                            // If child is also a group, find its children
                            $grandchildren = $allColumns->where('parent_id', $child->_id)->sortBy('order');
                            $childData['children'] = $grandchildren->values()->toArray();
                        }

                        $processedChildren[] = $childData;
                    }

                    $columnData['children'] = array_values($processedChildren);
                }

                return $columnData;
            });

            $tableData = $table->toArray();
            $tableData['columns'] = $processedColumns->values()->toArray();
            return $tableData;
        });

        $config = [
            'id' => $this->code,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'tables' => $tablesWithColumns->toArray(),
        ];

        if ($this->has_formula) {
            $formula = $this->formula();

            if ($formula) {
                $config['formula'] = [
                    'id' => $formula->_id,
                    'description' => $formula->description,
                    'main_formula' => $formula->main_formula,
                    'formula_type' => $formula->formula_type,
                    'conditions' => $formula->conditions,
                    'parameters' => $formula->parameters,
                    'notes' => $formula->notes,
                    'reference_table' => $formula->reference_table
                ];
            }
        }

        return $config;
    }

    /**
     * Calculate score for a set of data using the associated Rumus
     */
    public function calculateScore(array $data)
    {
        if (!$this->has_formula) {
            return null;
        }

        $formula = $this->formula();

        if (!$formula) {
            return null;
        }

        // Process data to extract variables needed for formula
        $variables = $this->extractVariablesFromData($data, $formula);

        // Use the existing Rumus model to calculate the score
        return $formula->calculateScore($variables);
    }

    /**
     * Extract variables from data based on formula requirements
     */
    private function extractVariablesFromData(array $data, Rumus $formula)
    {
        $variables = [];

        // Make formula parameters available as variables
        if (isset($formula->parameters) && is_array($formula->parameters)) {
            foreach ($formula->parameters as $key => $value) {
                $variables[$key] = $value;
            }
        }

        // Extract variables based on formula type and formula structure
        switch ($formula->formula_type) {
            case 'simple':
            case 'conditional':
                // For example, extract N1, N2, N3 for formula 10.A
                if ($formula->nomor === '10' && $formula->sub === 'A') {
                    $variables['N1'] = collect($data)->where('pendidikan', true)->count();
                    $variables['N2'] = collect($data)->where('penelitian', true)->count();
                    $variables['N3'] = collect($data)->where('pkm', true)->count();
                    $variables['NDTPS'] = $variables['NDTPS'] ?? 87; // Default if not in parameters
                }
                break;

            case 'range':
                // Extract the range field value
                if ($formula->range_field && isset($data[0][$formula->range_field])) {
                    $variables[$formula->range_field] = $data[0][$formula->range_field];
                }
                break;
        }

        return $variables;
    }
}