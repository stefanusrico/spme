<?php

namespace App\Models\Lkps;

use App\Models\Prodi\Strata;
use MongoDB\Laravel\Eloquent\Model;
use App\Traits\ObjectIdConversion;
use App\Services\ExcelFormulaParser;
use Illuminate\Support\Facades\Log;

class LkpsTable extends Model
{
    use ObjectIdConversion;

    protected $connection = 'mongodb';
    protected $collection = 'lkps_tables';

    private static $tableDefinitionCache = [];
    private static $variableLocationCache = [];

    protected $fillable = [
        'kode',
        'judul',
        'strataId',
        'barisAwalExcel',
        'rumus',
        'kondisi'
    ];

    public function strata()
    {
        return $this->belongsTo(Strata::class, 'strataId', '_id');
    }

    public function kolom()
    {
        return $this->hasMany(LkpsColumn::class, 'lkpsTableId', '_id')
            ->whereNull('parentId')
            ->orderBy('order');
    }

    public function semuaKolom()
    {
        return $this->hasMany(LkpsColumn::class, 'lkpsTableId', '_id')
            ->orderBy('order');
    }

    public function data()
    {
        return $this->hasMany(LkpsData::class, 'kodeTabel', 'kode');
    }

    public function getData()
    {
        return $this->data()->orderBy('created_at', 'desc');
    }

    public function getKonfigurasi()
    {
        return $this->kolom()->with('children')->get();
    }

    public function scopeByStrata($query, $strataName)
    {
        return $query->whereHas('strata', function ($q) use ($strataName) {
            $q->where('name', $strataName);
        });
    }

    public function scopeByStrataId($query, $strataId)
    {
        return $query->where('strataId', $this->convertToObjectId($strataId));
    }

    public static function getAvailableStrata()
    {
        return Strata::whereHas('lkpsTables')->pluck('name', '_id');
    }

    public function isSarjanaTerapan()
    {
        return $this->strata && $this->strata->name === 'Sarjana Terapan';
    }

    public function isDiplomaTiga()
    {
        return $this->strata && $this->strata->name === 'Diploma Tiga';
    }

    public function getStrataNameAttribute()
    {
        return $this->strata ? $this->strata->name : null;
    }

    public function setStrataByName($strataName)
    {
        if (!$strataName) {
            $this->strataId = null;
            return;
        }

        $strata = Strata::where('name', $strataName)->first();
        if ($strata) {
            $this->strataId = $this->convertToObjectId($strata->_id);
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($table) {
            if (isset($table->attributes['strata']) && !isset($table->attributes['strataId'])) {
                $table->setStrataByName($table->attributes['strata']);
                unset($table->attributes['strata']);
            }
        });

        static::updating(function ($table) {
            if (isset($table->attributes['strata']) && $table->isDirty('strata')) {
                $table->setStrataByName($table->attributes['strata']);
                unset($table->attributes['strata']);
            }
        });
    }

    public function getRumusAttribute($value)
    {
        return $value ?: [];
    }

    public function setRumusAttribute($value)
    {
        $this->attributes['rumus'] = is_array($value) ? $value : [];
    }

    public function getRumusByVariabel($variabel)
    {
        return collect($this->rumus)->firstWhere('variabel', $variabel);
    }

    public function hasRumus()
    {
        return !empty($this->rumus) && is_array($this->rumus);
    }

    public function hitungRumus($data, $variabel = null)
    {
        if (!$this->hasRumus())
            return [];
        $projectId = request()->input('projectId');
        if (!$projectId)
            throw new \Exception("Project ID context is required for cross-table calculations.");

        $results = [];
        $calculationCache = [];
        $debugLog = [];

        $rumusToProcess = $variabel ?
            [collect($this->rumus)->firstWhere('variabel', $variabel)] :
            $this->rumus;

        foreach ($rumusToProcess as $rumus) {
            if (!$rumus)
                continue;
            $varName = $rumus['variabel'];

            $value = $this->resolveVariable($varName, $projectId, $debugLog, $calculationCache, $this);

            $results[$varName] = ['variabel' => $varName, 'value' => $value, 'formula' => $rumus['formula']];
        }
        return $variabel ? ($results[$variabel] ?? null) : $results;
    }

    public function queueCalculation($projectId, $priority = 'normal')
    {
        dispatch(new CalculateTableFormulasJob($this->kode, $projectId))
            ->onQueue($priority === 'high' ? 'calculations-high' : 'calculations');

        return ['queued' => true, 'estimated_time' => $this->estimateCalculationTime()];
    }

    private function estimateCalculationTime()
    {
        $rumusCount = count($this->rumus ?? []);
        $kondisiCount = count($this->kondisi ?? []);

        // Rough estimation based on complexity
        return ($rumusCount * 2) + ($kondisiCount * 1); // seconds
    }

    private function resolveVariable(string $variableName, string $projectId, array &$debugLog, array &$cache, LkpsTable $currentContextTable)
    {
        if (isset($cache[$variableName])) {
            return $cache[$variableName];
        }

        $cacheKey = "{$variableName}_D-IV";
        if (!isset(self::$tableDefinitionCache[$cacheKey])) {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            self::$tableDefinitionCache[$cacheKey] = \App\Models\Lkps\LkpsTable::where('rumus.variabel', $variableName)
                ->where('strataId', $divStrata->_id)
                ->first();
        }
        $tableDefinisi = self::$tableDefinitionCache[$cacheKey];

        if (!isset(self::$variableLocationCache[$projectId])) {
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
            self::$variableLocationCache[$projectId] = [
                'taskIds' => $tasks->pluck('_id')->map(fn($id) => (string) $id)->toArray(),
                'tasks' => $tasks->keyBy('_id')
            ];
        }

        $projectCache = self::$variableLocationCache[$projectId];

        $debugLog[] = "--- Resolving [{$variableName}] in context of table [{$currentContextTable->kode}] ---";
        if (isset($cache[$variableName])) {
            return $cache[$variableName];
        }

        $rumusDef = collect($currentContextTable->rumus)->firstWhere('variabel', $variableName);
        if ($rumusDef) {
            Log::info("Found '{$variableName}' definition in CURRENT table '{$currentContextTable->kode}'. Calculating locally.");
            $task = $this->findTaskForTable($currentContextTable, $projectId);
            $localData = $task ? ($this->findDataForTask($task) ?? []) : [];
            return $this->calculateFormula($rumusDef['formula'], $currentContextTable, $localData, $projectId, $debugLog, $cache);
        }

        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
        $taskListIds = $taskLists->pluck('_id')->toArray();
        $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
        $taskIds = $tasks->pluck('_id')->map(fn($id) => (string) $id)->toArray();
        $lkpsDataRecord = \App\Models\Lkps\LkpsData::whereIn('taskId', $taskIds)
            ->where("detailNilai.{$variableName}", 'exists', true)
            ->first();

        if ($lkpsDataRecord) {
            $value = $lkpsDataRecord->detailNilai[$variableName];
            $sourceTable = \App\Models\Lkps\LkpsTable::find($lkpsDataRecord->lkpsTableId);
            Log::info("Found pre-calculated '{$variableName}' in DB (from table: " . ($sourceTable->kode ?? 'N/A') . ")");
            $cache[$variableName] = $value;
            return $value;
        }

        Log::info("'{$variableName}' not found locally or in DB cache. Searching for definition in other tables.");
        $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
        $tableDefinisi = \App\Models\Lkps\LkpsTable::where('rumus.variabel', $variableName)
            ->where('strataId', $divStrata->_id)
            ->first();

        if ($tableDefinisi) {
            $rumusObj = collect($tableDefinisi->rumus)->firstWhere('variabel', $variableName);
            if ($rumusObj && !empty($rumusObj['formula'])) {
                $task = $this->findTaskForTable($tableDefinisi, $projectId);
                $externalData = $task ? ($this->findDataForTask($task) ?? []) : [];
                return $this->calculateFormula($rumusObj['formula'], $tableDefinisi, $externalData, $projectId, $debugLog, $cache);
            }
        }

        Log::warning("Could not resolve '{$variableName}' from any source. Defaulting to 0.");
        $cache[$variableName] = 0;
        return 0;
    }

    private function findTaskForTable(LkpsTable $table, string $projectId)
    {
        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
        if ($taskLists->isEmpty())
            return null;

        $taskListIds = $taskLists->pluck('_id')->toArray();
        $tableIdString = (string) $table->_id;

        return \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
            ->where('lkpsTableId', $tableIdString)
            ->first();
    }

    private function findDataForTask(\App\Models\Project\Task $task)
    {
        $lkpsData = \App\Models\Lkps\LkpsData::where('taskId', (string) $task->_id)->first();
        return $lkpsData ? $lkpsData->data : null;
    }

    private function calculateFormula(string $formula, LkpsTable $definingTable, array $data, string $projectId, array &$debugLog, array &$cache)
    {
        $dependentVariables = [];
        preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $formula, $matches);
        $allPotentialVars = array_unique($matches[1]);

        $excelFunctions = ['SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'COUNTIF', 'COUNTIFS', 'MAX', 'MIN', 'IF', 'IFERROR', 'SUMIF', 'SUMIFS', 'AVERAGEIF', 'SUMPRODUCT', 'AVERAGEIFS', 'COUNTUNIQUE', 'OR', 'AND', 'NOT', 'CONDITIONALVALUE', 'COUNTIF'];

        foreach ($allPotentialVars as $var) {

            if (in_array(strtoupper($var), $excelFunctions) || strlen($var) === 1) {
                continue;
            }

            if (preg_match('/^(?!(N1|N2|N3|AND|NA[1-3]|NB[1-3]|NC[1-3]|TKM[1-5]|NA[1-4]|NB[1-3]|NC[1-3])$)[A-Z]{1,3}\d+$/i', $var)) {
                Log::debug("calculateFormula: Ignoring '{$var}' as it matches a cell reference pattern and is not an exception like N1–N3 or NA1–NC3.");
                continue;
            }

            $dependentVariables[] = $var;
        }

        foreach ($dependentVariables as $depVar) {
            $resolvedValue = $this->resolveVariable($depVar, $projectId, $debugLog, $cache, $definingTable);
            $formula = preg_replace('/\b' . preg_quote($depVar, '/') . '\b/i', (string) $resolvedValue, $formula);
        }

        $parser = new ExcelFormulaParser($definingTable);
        return $parser->evaluateFormula($formula, $data);
    }

    private function calculateConditionalVariable($varName, $rumusGroup, $data, $parser, $existingResults)
    {
        \Log::info("Calculating conditional variable: {$varName}", [
            'conditions_count' => $rumusGroup->count(),
            'conditions' => $rumusGroup->pluck('kondisi')->toArray()
        ]);

        foreach ($rumusGroup as $rumus) {
            $kondisi = $rumus['kondisi'] ?? null;

            if ($kondisi) {
                if ($this->evaluateVariableKondisi($kondisi, $existingResults)) {
                    \Log::info("Condition met for {$varName}: {$kondisi}");
                    return $this->calculateSingleVariable($rumus, $data, $parser, true);
                }
            } else {
                \Log::info("Using fallback formula for {$varName} (no condition)");
                return $this->calculateSingleVariable($rumus, $data, $parser, true);
            }
        }

        \Log::warning("No condition met for {$varName}, using first formula as default");
        return $this->calculateSingleVariable($rumusGroup->first(), $data, $parser, true);
    }

    private function calculateSingleVariable($rumus, $data, $parser, $isConditional = false)
    {
        $value = $parser->evaluateFormula($rumus['formula'], $data);

        return [
            'variabel' => $rumus['variabel'],
            'formula' => $rumus['formula'],
            'kondisi' => $rumus['kondisi'] ?? null,
            'value' => $value,
            'formatted_value' => is_numeric($value) ? round($value, 4) : $value,
            'data_rows_count' => count($data),
            'calculated_at' => now()->toISOString(),
            'calculation_details' => $parser->getLastCalculationDetails() ?? [],
            'data_sample' => array_slice($data, 0, 2),
            'conditional_variable' => $isConditional,
            'formula_interpretation' => $this->interpretFormula($rumus['formula']),
        ];
    }

    private function evaluateVariableKondisi($kondisiText, $existingResults)
    {
        try {
            $evaluatedKondisi = $kondisiText;

            foreach ($existingResults as $varName => $result) {
                $value = $result['value'] ?? 0;
                $evaluatedKondisi = str_replace($varName, (string) $value, $evaluatedKondisi);
            }

            $evaluatedKondisi = $this->normalizePercentageComparisons($evaluatedKondisi);

            $evaluatedKondisi = str_replace(['≤', '≥'], ['<=', '>='], $evaluatedKondisi);
            $evaluatedKondisi = preg_replace('/(?<!<|>)\s*=\s*(?!=)/', ' == ', $evaluatedKondisi);

            \Log::info("Evaluating variable kondisi", [
                'original' => $kondisiText,
                'evaluated' => $evaluatedKondisi
            ]);

            if ($this->isSafeKondisiExpression($evaluatedKondisi)) {
                $result = @eval ("return {$evaluatedKondisi};");
                return (bool) $result;
            }

            return false;

        } catch (\Exception $e) {
            \Log::error("Error evaluating variable kondisi: {$e->getMessage()}", [
                'kondisi' => $kondisiText
            ]);
            return false;
        }
    }

    private function normalizePercentageComparisons($expression)
    {
        $expression = preg_replace_callback('/(\d+(?:\.\d+)?)%/', function ($matches) {
            return (float) $matches[1] / 100;
        }, $expression);

        return $expression;
    }


    private function interpretFormula($formula)
    {
        $interpretation = [
            'type' => 'unknown',
            'description' => 'Complex formula',
            'requires_columns' => [],
            'requires_rows' => []
        ];

        if (preg_match_all('/([A-Z]+)(\d+):([A-Z]+)(\d+)/', $formula, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $interpretation['requires_columns'][] = $match[1];
                $interpretation['requires_rows'][] = "Row {$match[2]} to {$match[4]}";
            }
            $interpretation['type'] = 'range_operation';
            $interpretation['description'] = 'Uses Excel cell ranges: ' . implode(', ', array_unique($interpretation['requires_columns']));
        }

        if (preg_match_all('/([A-Z]+)(\d+)/', $formula, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                if (!in_array($match[1], $interpretation['requires_columns'])) {
                    $interpretation['requires_columns'][] = $match[1];
                }
            }
        }

        if (strpos($formula, 'SUM') !== false) {
            $interpretation['type'] = 'sum_operation';
            $interpretation['description'] = 'Calculates sum of ranges';
        } elseif (strpos($formula, 'AVERAGE') !== false) {
            $interpretation['type'] = 'average_operation';
            $interpretation['description'] = 'Calculates average of ranges';
        } elseif (strpos($formula, '/') !== false) {
            $interpretation['type'] = 'division_operation';
            $interpretation['description'] = 'Performs division operation';
        }

        return $interpretation;
    }

    public function getCalculationDetails($data, $variabel = null)
    {
        if (!$this->hasRumus()) {
            return null;
        }

        $parser = new ExcelFormulaParser($this);
        $details = [];

        foreach ($this->rumus as $rumus) {
            if ($variabel && $rumus['variabel'] !== $variabel) {
                continue;
            }

            $details[$rumus['variabel']] = $parser->getCalculationDetails(
                $rumus['formula'],
                $data,
                $rumus['variabel']
            );
        }

        return $variabel ? ($details[$variabel] ?? null) : $details;
    }

    public function getColumnMapping()
    {
        $parser = new ExcelFormulaParser($this);
        return $parser->getColumnMapping();
    }

    public function saveRumusResults($data, $projectId, $taskId = null)
    {
        try {
            $tableIdString = (string) $this->_id;

            if ($taskId) {
                $taskIdString = (string) $taskId;
                $lkpsData = LkpsData::where('lkpsTableId', $tableIdString)
                    ->where('taskId', $taskIdString)
                    ->first();
            } else {
                $lkpsData = $this->findLkpsDataByProject($projectId);
            }

            if (!$lkpsData) {
                return ['success' => false, 'message' => 'LkpsData not found'];
            }

            $calculationResults = $this->hitungRumus($data);

            if (empty($calculationResults)) {
                return ['success' => false, 'message' => 'No calculation results to save'];
            }

            $existingDetailNilai = $lkpsData->detailNilai ?? [];
            if (is_object($existingDetailNilai)) {
                $existingDetailNilai = (array) $existingDetailNilai;
            }

            foreach ($calculationResults as $variabel => $result) {
                $existingDetailNilai[$variabel] = $result['value'] ?? 0;
                $existingDetailNilai[$variabel . '_calculated_at'] = now()->toISOString();
            }

            $lkpsData->detailNilai = $existingDetailNilai;
            $lkpsData->updated_at = now();
            $lkpsData->save();

            return [
                'success' => true,
                'variables_saved' => array_keys($calculationResults),
                'lkps_data_id' => (string) $lkpsData->_id
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Error saving rumus results: ' . $e->getMessage()];
        }
    }

    private function findLkpsDataByProject($projectId)
    {
        try {
            $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
            if ($taskLists->isEmpty()) {
                return null;
            }

            $taskListIds = $taskLists->pluck('_id')->toArray();
            $tableIdString = (string) $this->_id;

            $task = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)
                ->where('lkpsTableId', $tableIdString)
                ->first();

            if (!$task) {
                return null;
            }

            $taskIdString = (string) $task->_id;
            return LkpsData::where('lkpsTableId', $tableIdString)
                ->where('taskId', $taskIdString)
                ->first();
        } catch (\Exception $e) {
            Log::error("Error finding LkpsData by project: {$e->getMessage()}");
            return null;
        }
    }

    public function getKondisiAttribute($value)
    {
        return $value ?: [];
    }

    public function setKondisiAttribute($value)
    {
        $this->attributes['kondisi'] = is_array($value) ? $value : [];
    }

    public function getKondisiByText($kondisiText)
    {
        return collect($this->kondisi)->firstWhere('kondisi', $kondisiText);
    }

    public function getKondisiByTextAndButir($kondisiText, $butir = null)
    {
        $kondisiCollection = collect($this->kondisi);

        if ($butir !== null) {
            return $kondisiCollection->where('kondisi', $kondisiText)
                ->where('butir', $butir)
                ->first();
        }

        return $kondisiCollection->firstWhere('kondisi', $kondisiText);
    }

    public function getKondisiByButir($butir)
    {
        return collect($this->kondisi)->where('butir', $butir)->values()->toArray();
    }

    public function getAvailableButir()
    {
        return collect($this->kondisi)
            ->pluck('butir')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->toArray();
    }

    public function hasKondisi()
    {
        return !empty($this->kondisi) && is_array($this->kondisi);
    }

    public function hitungSkor($data)
    {
        try {
            if (!$this->hasKondisi())
                return [];

            $projectId = request()->input('projectId');
            if (!$projectId)
                throw new \Exception("Project ID context is required for score calculations.");

            Log::info("🚀 SIMPLE SKOR CALCULATION START", ['table' => $this->kode]);

            $allVarsNeeded = [];
            foreach ($this->kondisi as $kondisiItem) {
                preg_match_all('/\b([A-Z][a-zA-Z0-9_]*)\b/', $kondisiItem['kondisi'], $matches);
                $allVarsNeeded = array_merge($allVarsNeeded, $matches[1]);
                preg_match_all('/\b([A-Z][a-zA-Z0-9_]*)\b/', $kondisiItem['formula'], $matches);
                $allVarsNeeded = array_merge($allVarsNeeded, $matches[1]);
            }
            $allVarsNeeded = array_unique($allVarsNeeded);

            $resolvedValues = [];
            $calculationCache = [];
            $debugLog = [];
            foreach ($allVarsNeeded as $varName) {
                $resolvedValues[$varName] = $this->resolveVariable($varName, $projectId, $debugLog, $calculationCache, $this);
            }

            Log::info("🔢 ALL VARIABLES RESOLVED", ['values' => $resolvedValues]);

            $kondisiGrouped = [];
            foreach ($this->kondisi as $kondisiItem) {
                $butir = $kondisiItem['butir'] ?? null;
                $sub = $kondisiItem['sub'] ?? null;
                if (!$butir)
                    continue;

                $key = $butir . ($sub ? "_{$sub}" : '');
                if (!isset($kondisiGrouped[$key])) {
                    $kondisiGrouped[$key] = [];
                }
                $kondisiGrouped[$key][] = $kondisiItem;
            }

            $skorResults = [];

            foreach ($kondisiGrouped as $uniqueKey => $kondisiGroup) {
                Log::info("🎯 PROCESSING GROUP: {$uniqueKey}", [
                    'conditions' => array_column($kondisiGroup, 'kondisi')
                ]);

                $conditionMet = false;

                foreach ($kondisiGroup as $kondisiItem) {
                    $kondisiText = $kondisiItem['kondisi'];

                    if (stripos($kondisiText, ' AND ') !== false) {
                        Log::info("🔍 CHECKING AND CONDITION: {$kondisiText}");

                        if ($this->evaluateKondisi($kondisiText, $resolvedValues)) {
                            $skorValue = $this->calculateKondisiFormula($kondisiItem['formula'], $resolvedValues);

                            $resultItem = ['butir' => (int) $kondisiItem['butir']];
                            if (!empty($kondisiItem['sub'])) {
                                $resultItem['sub'] = $kondisiItem['sub'];
                            }
                            $resultItem['nilai'] = round($skorValue, 2);

                            $skorResults[] = $resultItem;
                            Log::info("✅ AND CONDITION MET!", [
                                'kondisi' => $kondisiText,
                                'skor' => $skorValue
                            ]);

                            $conditionMet = true;
                            break;
                        }
                    }
                }

                if (!$conditionMet) {
                    foreach ($kondisiGroup as $kondisiItem) {
                        $kondisiText = $kondisiItem['kondisi'];

                        if (stripos($kondisiText, ' OR ') !== false) {
                            Log::info("🔍 CHECKING OR CONDITION: {$kondisiText}");

                            if ($this->evaluateKondisi($kondisiText, $resolvedValues)) {
                                $skorValue = $this->calculateKondisiFormula($kondisiItem['formula'], $resolvedValues);

                                $resultItem = ['butir' => (int) $kondisiItem['butir']];
                                if (!empty($kondisiItem['sub'])) {
                                    $resultItem['sub'] = $kondisiItem['sub'];
                                }
                                $resultItem['nilai'] = round($skorValue, 2);

                                $skorResults[] = $resultItem;
                                Log::info("✅ OR CONDITION MET!", [
                                    'kondisi' => $kondisiText,
                                    'skor' => $skorValue
                                ]);

                                $conditionMet = true;
                                break;
                            }
                        }
                    }
                }

                if (!$conditionMet) {
                    foreach ($kondisiGroup as $kondisiItem) {
                        $kondisiText = $kondisiItem['kondisi'];

                        if (stripos($kondisiText, ' AND ') === false && stripos($kondisiText, ' OR ') === false) {
                            Log::info("🔍 CHECKING SIMPLE CONDITION: {$kondisiText}");

                            if ($this->evaluateKondisi($kondisiText, $resolvedValues)) {
                                $skorValue = $this->calculateKondisiFormula($kondisiItem['formula'], $resolvedValues);

                                $resultItem = ['butir' => (int) $kondisiItem['butir']];
                                if (!empty($kondisiItem['sub'])) {
                                    $resultItem['sub'] = $kondisiItem['sub'];
                                }
                                $resultItem['nilai'] = round($skorValue, 2);

                                $skorResults[] = $resultItem;
                                Log::info("✅ SIMPLE CONDITION MET!", [
                                    'kondisi' => $kondisiText,
                                    'skor' => $skorValue
                                ]);

                                $conditionMet = true;
                                break;
                            }
                        }
                    }
                }

                if (!$conditionMet) {
                    Log::warning("❌ NO CONDITION MET FOR: {$uniqueKey}");
                }
            }

            Log::info("🏁 SKOR CALCULATION COMPLETE", ['results' => $skorResults]);
            return $skorResults;

        } catch (\Exception $e) {
            Log::error("💥 SKOR CALCULATION ERROR", [
                'table' => $this->kode,
                'error' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 500)
            ]);
            return [];
        }
    }

    private function evaluateKondisi($kondisiText, $resolvedValues)
    {
        try {
            if (empty($kondisiText)) {
                return false;
            }

            $evaluatedKondisi = $kondisiText;

            $variables = array_keys($resolvedValues);
            usort($variables, fn($a, $b) => strlen($b) - strlen($a));

            foreach ($variables as $varName) {
                if (isset($resolvedValues[$varName]) && !in_array(strtoupper($varName), ['AND', 'OR', 'NOT'])) {
                    $value = $resolvedValues[$varName];

                    $evaluatedKondisi = preg_replace(
                        '/\b' . preg_quote($varName, '/') . '\b/i',
                        (string) $value,
                        $evaluatedKondisi
                    );
                }
            }

            $normalizedKondisi = $this->normalizeComplexKondisiExpression($evaluatedKondisi);

            if ($normalizedKondisi === "(false)" || !$this->isSafeKondisiExpression($normalizedKondisi)) {
                Log::warning("Unsafe or invalid kondisi", [
                    'original' => $kondisiText,
                    'normalized' => $normalizedKondisi,
                    'evaluated' => $evaluatedKondisi
                ]);
                return false;
            }

            $result = @eval ("return {$normalizedKondisi};");

            if ($result === false && error_get_last()) {
                Log::error("PHP error during eval", ['error' => error_get_last(), 'expression' => $normalizedKondisi]);
                return false;
            }

            return (bool) $result;

        } catch (\Throwable $e) {
            Log::error("Error evaluating kondisi: {$e->getMessage()}", [
                'kondisi' => $kondisiText,
                'trace' => substr($e->getTraceAsString(), 0, 200)
            ]);
            return false;
        }
    }

    public function validateKondisiData()
    {
        if (!$this->hasKondisi()) {
            return ['valid' => true, 'message' => 'No kondisi to validate'];
        }

        $issues = [];
        foreach ($this->kondisi as $index => $kondisiItem) {
            if (empty($kondisiItem['butir']))
                $issues[] = "Kondisi #{$index}: Missing butir";
            if (empty($kondisiItem['kondisi']))
                $issues[] = "Kondisi #{$index}: Missing kondisi text";
            if (empty($kondisiItem['formula']))
                $issues[] = "Kondisi #{$index}: Missing formula";

            if (!empty($kondisiItem['kondisi']) && preg_match('/(\d+(?:\.\d+)?)\s*[<≤]\s*[^<>=\s]+\s*[<≤]\s*(\d+(?:\.\d+)?)/', $kondisiItem['kondisi'], $matches)) {
                if ((float) $matches[1] >= (float) $matches[2]) {
                    $issues[] = "Kondisi #{$index}: Invalid range '{$kondisiItem['kondisi']}'";
                }
            }
        }

        return ['valid' => empty($issues), 'issues' => $issues];
    }

    private function normalizeComplexKondisiExpression($expression)
    {
        Log::info("🔧 NORMALIZING KONDISI", ['original' => $expression, 'hex_dump' => bin2hex($expression)]);

        $replacements = [
            '≤' => '<=',
            '≥' => '>=',
            '≠' => '!=',
            ' AND ' => ' && ',
            ' OR ' => ' || ',
        ];

        $expression = str_ireplace(array_keys($replacements), array_values($replacements), " {$expression} ");
        $expression = trim($expression);

        Log::info("🔧 AFTER BASIC NORMALIZATION", ['expression' => $expression]);

        // ✅ PERBAIKI PATTERN UNTUK CHAINED COMPARISONS

        // Pattern 1: a <= b < c
        $expression = preg_replace_callback(
            '/(\S+)\s*(<=)\s*(\S+)\s*(<)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        // Pattern 2: a < b <= c
        $expression = preg_replace_callback(
            '/(\S+)\s*(<)\s*(\S+)\s*(<=)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        // Pattern 3: a <= b <= c
        $expression = preg_replace_callback(
            '/(\S+)\s*(<=)\s*(\S+)\s*(<=)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        // Pattern 4: a < b < c
        $expression = preg_replace_callback(
            '/(\S+)\s*(<)\s*(\S+)\s*(<)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        // ✅ HANDLE REVERSE PATTERNS (b BETWEEN a AND c)

        // Pattern 5: a <= b > c (edge case)
        $expression = preg_replace_callback(
            '/(\S+)\s*(<=)\s*(\S+)\s*(>)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        // Pattern 6: a < b >= c (edge case)
        $expression = preg_replace_callback(
            '/(\S+)\s*(<)\s*(\S+)\s*(>=)\s*(\S+)/',
            function ($matches) {
                $left = $matches[1];
                $op1 = $matches[2];
                $middle = $matches[3];
                $op2 = $matches[4];
                $right = $matches[5];

                return "({$left} {$op1} {$middle}) && ({$middle} {$op2} {$right})";
            },
            $expression
        );

        Log::info("🔧 AFTER RANGE NORMALIZATION", ['expression' => $expression]);

        // Convert single = to ==
        $expression = preg_replace('/(?<![<>!=])\s*=\s*(?![=<>])/', ' == ', $expression);

        // Convert percentages
        $expression = preg_replace_callback('/(\d+(?:\.\d+)?)%/', fn($m) => (float) $m[1] / 100, $expression);

        // Wrap in parentheses if needed
        if ((strpos($expression, '&&') !== false || strpos($expression, '||') !== false) && substr(trim($expression), 0, 1) !== '(') {
            $expression = "({$expression})";
        }

        Log::info("🔧 FINAL NORMALIZED EXPRESSION", ['expression' => $expression]);
        return empty(trim($expression)) ? "(false)" : $expression;
    }

    private function isSafeFormulaExpression($expression)
    {
        if (empty(trim($expression))) {
            return false;
        }

        if (!preg_match('/^[0-9\.\+\-\–\*\/\(\)\s]+$/u', $expression)) {
            Log::warning("Formula contains unsafe characters", ['expression' => $expression]);
            return false;
        }

        $unsafePatterns = [
            '/\$/',
            '/function/',
            '/eval/',
            '/exec/',
            '/system/',
            '/`/',
            '/include/',
            '/require/',
            '/;/',
            '/\becho\b/',
            '/\bprint\b/',
            '/\bdie\b/',
            '/\bexit\b/',
            '/file_/',
            '/fopen/',
            '/shell_/',
        ];

        foreach ($unsafePatterns as $pattern) {
            if (preg_match($pattern, $expression)) {
                Log::warning("Formula contains unsafe pattern", ['expression' => $expression, 'pattern' => $pattern]);
                return false;
            }
        }

        return true;
    }

    private function isSafeKondisiExpression($expression)
    {
        if (empty(trim($expression))) {
            return false;
        }

        if (!preg_match('/^[0-9\.\s\(\)<>=&|!\-\+\*\/]+$/', $expression)) {
            Log::warning("Kondisi contains unsafe characters", ['expression' => $expression]);
            return false;
        }

        $unsafePatterns = [
            '/\$/',
            '/function/',
            '/eval/',
            '/exec/',
            '/system/',
            '/`/',
            '/include/',
            '/require/',
            '/;/',
            '/\becho\b/',
            '/\bprint\b/',
            '/\bdie\b/',
            '/\bexit\b/',
            '/file_/',
            '/fopen/',
            '/shell_/',
        ];

        foreach ($unsafePatterns as $pattern) {
            if (preg_match($pattern, $expression)) {
                Log::warning("Kondisi contains unsafe pattern", ['expression' => $expression, 'pattern' => $pattern]);
                return false;
            }
        }

        if (substr_count($expression, '(') !== substr_count($expression, ')')) {
            Log::warning("Unbalanced parentheses in kondisi", ['expression' => $expression]);
            return false;
        }

        return true;
    }

    private function calculateKondisiFormula($formulaText, $resolvedValues)
    {
        try {
            if (is_numeric($formulaText)) {
                return (float) $formulaText;
            }

            $evaluatedFormula = ltrim($formulaText, '=');

            $variables = array_keys($resolvedValues);
            usort($variables, fn($a, $b) => strlen($b) - strlen($a));

            foreach ($variables as $varName) {
                if (isset($resolvedValues[$varName]) && !in_array(strtoupper($varName), ['AND', 'OR', 'NOT'])) {
                    $value = $resolvedValues[$varName];
                    $evaluatedFormula = preg_replace('/\b' . preg_quote($varName, '/') . '\b/', (string) $value, $evaluatedFormula);
                }
            }

            $evaluatedFormula = str_replace('–', '-', $evaluatedFormula);

            $evaluatedFormula = str_ireplace('x', '*', $evaluatedFormula);

            if (!$this->isSafeFormulaExpression($evaluatedFormula)) {
                Log::error("Unsafe formula expression after normalization", ['formula' => $evaluatedFormula]);
                return 0;
            }

            $parser = new ExcelFormulaParser($this);
            return $parser->evaluateMath($evaluatedFormula);

        } catch (\Throwable $e) {
            Log::error("Error calculating kondisi formula", ['formula' => $formulaText, 'error' => $e->getMessage()]);
            return 0;
        }
    }

    private function evaluateMathExpression($expression)
    {
        try {
            $cleanExpression = preg_replace('/[^0-9\.\+\-\*\/\(\)\s]/', '', $expression);

            if (empty(trim($cleanExpression))) {
                return 0;
            }

            if (strpos($cleanExpression, '/0') !== false && !preg_match('/\/0\./', $cleanExpression)) {
                Log::warning("Division by zero detected", ['expr' => $cleanExpression]);
                return 0;
            }

            Log::info("Evaluating math expression", ['expression' => $cleanExpression]);

            $result = @eval ("return {$cleanExpression};");

            if ($result === false || !is_finite($result)) {
                Log::error("Math evaluation failed or infinite result", ['expr' => $cleanExpression]);
                return 0;
            }

            return round((float) $result, 4);

        } catch (\Throwable $e) {
            Log::error("Math expression evaluation error", [
                'expression' => $expression,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    public function testKondisiEvaluation($testValue = 2.93)
    {
        if (!$this->hasKondisi()) {
            return ['error' => 'No kondisi available for testing'];
        }

        $mockRumusResults = [];
        $variables = $this->hasRumus() ? collect($this->rumus)->pluck('variabel') : $this->extractVariablesFromAllKondisi();
        foreach (array_unique($variables->all()) as $variable) {
            if (!empty($variable)) {
                $mockRumusResults[$variable] = ['value' => $testValue, 'variabel' => $variable];
            }
        }

        $testResults = [];
        foreach ($this->kondisi as $index => $kondisiItem) {
            $kondisiText = $kondisiItem['kondisi'] ?? null;
            $evaluationResult = null;
            $evaluationError = null;

            try {
                if ($kondisiText) {
                    $evaluationResult = $this->evaluateKondisi($kondisiText, $mockRumusResults);
                }
            } catch (\Exception $e) {
                $evaluationError = $e->getMessage();
            }

            $testResults[] = [
                'index' => $index,
                'butir' => $kondisiItem['butir'] ?? null,
                'kondisi_text' => $kondisiText,
                'formula_text' => $kondisiItem['formula'] ?? null,
                'evaluation_result' => $evaluationResult,
                'evaluation_error' => $evaluationError,
            ];
        }

        return [
            'test_value' => $testValue,
            'mock_rumus_results' => $mockRumusResults,
            'test_results' => $testResults,
        ];
    }

    private function extractVariablesFromAllKondisi()
    {
        $allText = collect($this->kondisi)->pluck('kondisi')->implode(' ');
        $variables = [];
        if (preg_match_all('/\b([A-Z][A-Z0-9_]*)\b/', $allText, $matches)) {
            $exclude = ['OR', 'AND', 'NOT'];
            $variables = collect($matches[1])->unique()->diff($exclude)->values();
        }
        return $variables;
    }
}
