<?php

namespace App\Services;

use App\Models\Lkps\LkpsColumn;
use App\Models\Lkps\LkpsTable;
use App\Models\Lkps\LkpsData;
use Exception;
use Log;
use Throwable;

class ExcelFormulaParser
{
    private $table;
    private $columnMapping = [];
    private $lastCalculationDetails = [];
    private $externalVariables = [];

    private static $recursionDepth = 0;
    private static $maxRecursionDepth = 3;

    private $supportedFunctions = [
        'SUM',
        'AVERAGE',
        'COUNT',
        'COUNTA',
        'COUNTIF',
        'COUNTIFS',
        'MAX',
        'MIN',
        'IF',
        'IFERROR',
        'SUMIF',
        'SUMIFS',
        'AVERAGEIF',
        'AVERAGEIFS',
        "SUMPRODUCT",
        "COUNTUNIQUE",
        'MULTIIF',
        'CONDITIONALVALUE',
    ];

    public function __construct(LkpsTable $table)
    {
        $this->table = $table;
        $this->buildColumnMapping();
    }

    private function buildColumnMapping()
    {
        $dbColumns = LkpsColumn::where('lkpsTableId', (string) $this->table->_id)->orderBy('order')->get();
        if ($dbColumns->isEmpty()) {
            Log::warning("BUILD_MAPPING: No columns found for table", ['table_code' => $this->table->kode]);
            return;
        }

        foreach ($dbColumns as $column) {
            if ($column->indeksExcel !== null && !$column->isGroup) {
                $excelColumn = $this->numberToExcelColumn($column->indeksExcel + 1);
                $this->columnMapping[$excelColumn] = $column->indeksData;
            }
        }
        Log::info("BUILD_MAPPING: Mapping built for table {$this->table->kode}", ['mapping' => $this->columnMapping]);
    }

    private function numberToExcelColumn($number)
    {
        $column = '';
        while ($number > 0) {
            $number--;
            $column = chr(65 + ($number % 26)) . $column;
            $number = intval($number / 26);
        }
        return $column;
    }

    private function excelColumnToNumber($column)
    {
        $number = 0;
        $length = strlen($column);
        for ($i = 0; $i < $length; $i++) {
            $number = $number * 26 + (ord($column[$i]) - 64);
        }
        return $number;
    }

    public function evaluateFormula($formula, $data)
    {
        try {
            Log::info("Formula evaluation started", ['table' => $this->table->kode, 'formula' => $formula, 'data_count' => count($data)]);
            $this->lastCalculationDetails = ['original_formula' => $formula, 'steps' => [], 'final_result' => 0, 'success' => false];
            $expression = ltrim($formula, '=');
            $result = $this->evaluateExpression($expression, $data);
            $this->lastCalculationDetails['final_result'] = $result;
            $this->lastCalculationDetails['success'] = true;
            return $result;
        } catch (Exception $e) {
            Log::error("Formula evaluation error: {$e->getMessage()}", ['formula' => $formula, 'table' => $this->table->kode, 'trace' => substr($e->getTraceAsString(), 0, 1000)]);
            $this->lastCalculationDetails['error'] = $e->getMessage();
            return 0;
        }
    }

    private function evaluateExpression($expression, $data)
    {
        Log::info("START: evaluateExpression", ['e' => $expression]);

        $maxResolveIterations = 3;
        for ($resolveIteration = 0; $resolveIteration < $maxResolveIterations; $resolveIteration++) {
            $beforeResolve = $expression;
            $expression = $this->resolveActualVariables($expression, $data);

            Log::info("Smart variable resolution pass {$resolveIteration}", [
                'before' => $beforeResolve,
                'after' => $expression
            ]);

            if ($expression === $beforeResolve) {
                break;
            }
        }

        Log::info("After all variable resolution passes", ['e' => $expression]);

        if (preg_match('/^IF\s*\(/i', $expression)) {
            return $this->handleIfFunction($expression, $data);
        }

        $maxIterations = 5;
        $iteration = 0;

        while ($iteration < $maxIterations) {
            $beforeIteration = $expression;

            $expression = preg_replace_callback('/\b([A-Z]+)\s*\(([^()]*)\)/', function ($matches) use ($data) {
                $functionName = strtoupper($matches[1]);

                if (in_array($functionName, $this->supportedFunctions)) {
                    Log::info("Processing function: {$functionName}", ['params' => $matches[2]]);
                    return $this->executeFunction($functionName, $matches[2], $data);
                }

                return $matches[0];
            }, $expression);

            if ($expression === $beforeIteration) {
                break;
            }

            $iteration++;
            Log::info("Expression after iteration {$iteration}", ['expr' => $expression]);
        }

        Log::info("Final expression to evaluate", ['e' => $expression]);

        try {
            $result = $this->evaluateMath($expression);
            Log::info("END: Result", ['r' => $result]);
            return $result;
        } catch (Exception $e) {
            Log::error("Error in final evaluation", ['error' => $e->getMessage(), 'expr' => $expression]);
            return 0;
        }
    }

    private function handleIfFunction($expression, $data)
    {
        try {
            Log::info("Handling IF function", ['expr' => $expression]);

            if (!preg_match('/^IF\s*\((.*)\)$/i', $expression, $matches)) {
                Log::error("Invalid IF format");
                return 0;
            }

            $content = $matches[1];
            $params = $this->parseIfParams($content);

            if (count($params) < 2) {
                Log::error("IF requires at least 2 parameters", ['params' => $params]);
                return 0;
            }

            $condition = trim($params[0]);
            $trueValue = trim($params[1]);
            $falseValue = isset($params[2]) ? trim($params[2]) : '0';

            Log::info("IF components", [
                'condition' => $condition,
                'true_value' => $trueValue,
                'false_value' => $falseValue
            ]);

            $conditionResult = $this->evaluateConditionSafely($condition);

            Log::info("Condition result", ['result' => $conditionResult]);

            if ($conditionResult) {
                return $this->evaluateValue($trueValue, $data);
            } else {
                return $this->evaluateValue($falseValue, $data);
            }

        } catch (Exception $e) {
            Log::error("Error in IF function", ['error' => $e->getMessage()]);
            return 0;
        }
    }

    private function parseIfParams($content)
    {
        $params = [];
        $current = '';
        $depth = 0;
        $inQuotes = false;

        for ($i = 0; $i < strlen($content); $i++) {
            $char = $content[$i];

            if ($char === '"' && ($i === 0 || $content[$i - 1] !== '\\')) {
                $inQuotes = !$inQuotes;
                $current .= $char;
            } elseif (!$inQuotes) {
                if ($char === '(') {
                    $depth++;
                    $current .= $char;
                } elseif ($char === ')') {
                    $depth--;
                    $current .= $char;
                } elseif ($char === ',' && $depth === 0) {
                    $params[] = trim($current);
                    $current = '';
                } else {
                    $current .= $char;
                }
            } else {
                $current .= $char;
            }
        }

        if (!empty($current)) {
            $params[] = trim($current);
        }

        return $params;
    }

    private function evaluateConditionSafely($condition)
    {
        try {
            $normalized = $this->normalizeCondition($condition);

            if (!$normalized) {
                return false;
            }

            if (!$this->isConditionSafe($normalized)) {
                Log::warning("Condition deemed unsafe", ['condition' => $normalized]);
                return false;
            }

            Log::info("Evaluating safe condition", ['condition' => $normalized]);

            error_clear_last();
            $result = @eval ("return {$normalized};");

            if ($result === false && error_get_last()) {
                Log::error("Eval error", ['error' => error_get_last()]);
                return false;
            }

            return (bool) $result;

        } catch (Exception $e) {
            Log::error("Error evaluating condition", ['error' => $e->getMessage()]);
            return false;
        }
    }

    private function normalizeCondition($condition)
    {
        try {
            if (substr_count($condition, '(') !== substr_count($condition, ')')) {
                Log::error("Unbalanced parentheses", ['condition' => $condition]);
                return false;
            }

            // ✅✅✅ TAMBAHAN: Handle OR dan AND ✅✅✅
            $normalized = preg_replace('/\s*\*\s*/', ' && ', $condition);
            $normalized = preg_replace('/\bAND\b/i', ' && ', $normalized);
            $normalized = preg_replace('/\bOR\b/i', ' || ', $normalized);
            $normalized = str_replace(['≤', '≥'], ['<=', '>='], $normalized);
            $normalized = preg_replace('/(?<![<>!])\s*=\s*(?![=])/', ' == ', $normalized);
            $normalized = preg_replace('/\s+/', ' ', trim($normalized));

            Log::info("Condition normalized", ['original' => $condition, 'normalized' => $normalized]);

            return $normalized;

        } catch (Exception $e) {
            Log::error("Error normalizing condition", ['error' => $e->getMessage()]);
            return false;
        }
    }

    private function isConditionSafe($condition)
    {
        if (!preg_match('/^[0-9\.\s\(\)<>=&|!\-\+\*\/]+$/', $condition)) {
            return false;
        }

        $dangerousPatterns = [
            '/\$/',
            '/function/',
            '/eval/',
            '/exec/',
            '/system/',
            '/include/',
            '/require/',
            '/;/',
            '/file_/',
            '/shell_/'
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $condition)) {
                return false;
            }
        }

        return true;
    }

    private function executeFunction($functionName, $paramString, $data)
    {
        try {
            $params = $this->parseParams($paramString);

            return match (strtoupper($functionName)) {
                'SUM' => $this->_handle_sum($params, $data),
                'COUNTA' => $this->_handle_counta($params, $data),
                'COUNTIF' => $this->_handle_countif($params, $data),
                'COUNTIFS' => $this->_handle_countifs($params, $data),
                'AVERAGE' => $this->_handle_average($params, $data),
                'IF' => $this->_handle_if($params, $data),
                'COUNTUNIQUE' => $this->_handle_countunique($params, $data),
                'AVERAGEIFS' => $this->_handle_averageifs($params, $data),
                'IFERROR' => $this->_handle_iferror($params, $data),
                'SUMIF' => $this->_handle_sumif($params, $data),
                'SUMIFS' => $this->_handle_sumifs($params, $data),
                'SUMPRODUCT' => $this->_handle_sumproduct($params, $data),
                'MULTIIF' => $this->_handle_multiif($params, $data),
                'CONDITIONALVALUE' => $this->_handle_conditionalvalue($params, $data),
                default => 0,
            };
        } catch (Exception $e) {
            Log::error("Error executing function", ['function' => $functionName, 'error' => $e->getMessage()]);
            return 0;
        }
    }

    private function resolveVariableValue($variableName, $data)
    {
        $externalValue = $this->findExternalVariableValue($variableName);
        if ($externalValue !== null) {
            return $externalValue;
        }

        return $this->calculateCurrentTableVariable($variableName, $data);
    }

    private function parseParams($paramString)
    {
        if (empty($paramString)) {
            return [];
        }

        Log::info("PARSING PARAMS", ['input' => $paramString]);

        $params = [];
        $current = '';
        $depth = 0;
        $inQuotes = false;

        for ($i = 0; $i < strlen($paramString); $i++) {
            $char = $paramString[$i];

            if ($char === '"') {
                $inQuotes = !$inQuotes;
                $current .= $char;
            } elseif (!$inQuotes) {
                if ($char === '(') {
                    $depth++;
                    $current .= $char;
                } elseif ($char === ')') {
                    $depth--;
                    $current .= $char;
                } elseif (($char === ';' || $char === ',') && $depth === 0) {
                    // ✅✅✅ PERBAIKAN: Jangan skip parameter kosong, tapi trim dan cek ✅✅✅
                    $trimmed = trim($current);
                    if ($trimmed !== '') {
                        $params[] = $trimmed;
                    }
                    $current = '';
                } else {
                    $current .= $char;
                }
            } else {
                $current .= $char;
            }
        }

        // ✅✅✅ PERBAIKAN: Selalu tambahkan bagian terakhir jika tidak kosong ✅✅✅
        $trimmed = trim($current);
        if ($trimmed !== '') {
            $params[] = $trimmed;
        }

        Log::info("PARSED PARAMS", [
            'input' => $paramString,
            'result' => $params,
            'count' => count($params)
        ]);

        return $params;
    }

    private function evaluateValue($value, $data)
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (preg_match('/^[A-Z][A-Z0-9_]*$/i', $value)) {
            $resolved = $this->resolveActualVariables($value, $data);
            return is_numeric($resolved) ? (float) $resolved : 0;
        }

        return $this->evaluateMath($value);
    }

    public function evaluateMath($expression)
    {
        try {
            // ✅✅✅ RECURSION GUARD ✅✅✅
            if (self::$recursionDepth >= self::$maxRecursionDepth) {
                Log::warning("RECURSION LIMIT REACHED - Treating as simple math", [
                    'expression' => substr($expression, 0, 100),
                    'depth' => self::$recursionDepth
                ]);

                return $this->evaluateSimpleMath($expression);
            }

            if (empty($expression)) {
                return 0;
            }

            if (is_numeric($expression)) {
                return (float) $expression;
            }

            $cleanExpression = trim($expression);
            Log::info("EVALUATING MATH - BEFORE CLEAN", ['expr' => $cleanExpression, 'depth' => self::$recursionDepth]);

            // ✅✅✅ ONLY BYPASS IF NOT IN RECURSION ✅✅✅
            if (self::$recursionDepth === 0 && preg_match('/^(CONDITIONALVALUE|MULTIIF|IF|SUM|AVERAGE|COUNT|COUNTA|COUNTIFS|SUMIFS|IFERROR|SUMIF|SUMPRODUCT|COUNTUNIQUE|AVERAGEIFS)\s*\(/i', $cleanExpression)) {
                Log::info("BYPASSING MATH VALIDATION - Function call detected", [
                    'expr' => substr($cleanExpression, 0, 50) . '...',
                    'depth' => self::$recursionDepth
                ]);

                self::$recursionDepth++;

                try {
                    $result = $this->evaluateExpression($cleanExpression, []);
                    return $result;
                } finally {
                    self::$recursionDepth--;
                }
            }

            return $this->evaluateSimpleMath($cleanExpression);

        } catch (Throwable $e) {
            self::$recursionDepth = 0;

            Log::error("Math evaluation exception", [
                'expression' => $expression,
                'error' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 500)
            ]);
            return 0;
        }
    }

    private function evaluateSimpleMath($expression)
    {
        $cleanExpression = str_ireplace('x', '*', $expression);
        $cleanExpression = str_replace('–', '-', $cleanExpression);
        $cleanExpression = str_replace('−', '-', $cleanExpression);
        $cleanExpression = preg_replace('/\s+/', ' ', $cleanExpression);

        Log::info("EVALUATING SIMPLE MATH", ['expr' => $cleanExpression]);

        // ✅✅✅ NEW: Check if this is still a function call even in simple math ✅✅✅
        if (preg_match('/^(CONDITIONALVALUE|MULTIIF|IF|SUM|AVERAGE|COUNT|COUNTA|COUNTIFS|SUMIFS|IFERROR|SUMIF|SUMPRODUCT|COUNTUNIQUE|AVERAGEIFS)\s*\(/i', $cleanExpression)) {
            Log::info("SIMPLE MATH: Detected function call, processing as function", [
                'expr' => substr($cleanExpression, 0, 50) . '...'
            ]);

            if (preg_match('/^([A-Z]+)\s*\((.+)\)$/i', $cleanExpression, $matches)) {
                $functionName = strtoupper($matches[1]);
                $paramString = $matches[2];

                Log::info("SIMPLE MATH: Processing function", [
                    'function' => $functionName,
                    'params' => substr($paramString, 0, 100) . '...'
                ]);

                return $this->executeFunction($functionName, $paramString, []);
            }
        }

        if (substr_count($cleanExpression, '(') !== substr_count($cleanExpression, ')')) {
            Log::error("Unbalanced parentheses in simple math expression", ['expr' => $cleanExpression]);
            return 0;
        }

        $iterations = 0;
        $maxIterations = 5;

        while ($iterations < $maxIterations && preg_match('/^\s*\((.*)\)\s*$/', $cleanExpression, $matches)) {
            $inner = trim($matches[1]);

            if (substr_count($inner, '(') === substr_count($inner, ')')) {
                $cleanExpression = $inner;
                Log::info("REMOVED OUTER PARENTHESES", ['iteration' => $iterations + 1, 'expr' => $cleanExpression]);
            } else {
                Log::info("STOPPED REMOVING - inner content unbalanced", ['inner' => $inner]);
                break;
            }
            $iterations++;
        }

        if (preg_match('/(>=|<=|>|<|==|!=)/', $cleanExpression)) {
            Log::info("EVALUATING COMPARISON", ['expr' => $cleanExpression]);

            if (!$this->isSafeMathExpression($cleanExpression)) {
                Log::error("Unsafe comparison expression", ['expr' => $cleanExpression]);
                return 0;
            }

            error_clear_last();
            $result = @eval ("return {$cleanExpression};");

            if ($result === false && error_get_last()) {
                Log::error("Comparison eval error", ['expr' => $cleanExpression, 'error' => error_get_last()]);
                return 0;
            }

            return $result ? 1 : 0;
        }

        if (!$this->isSafeMathExpression($cleanExpression)) {
            Log::error("Unsafe arithmetic expression", ['expr' => $cleanExpression]);
            return 0;
        }

        if (preg_match('/\/\s*0(?!\d|\.|\d+)/', $cleanExpression)) {
            Log::warning("Division by zero detected", ['expr' => $cleanExpression]);
            return 0;
        }

        Log::info("FINAL SIMPLE MATH EVALUATION", ['expression' => $cleanExpression]);

        error_clear_last();
        $result = @eval ("return {$cleanExpression};");

        $error = error_get_last();
        if ($result === false || $error) {
            Log::error("Simple math evaluation failed", [
                'expr' => $cleanExpression,
                'result' => $result,
                'error' => $error
            ]);
            return 0;
        }

        if (!is_numeric($result) || !is_finite($result)) {
            Log::error("Simple math result is not finite", [
                'expr' => $cleanExpression,
                'result' => $result,
                'is_numeric' => is_numeric($result),
                'is_finite' => is_finite($result)
            ]);
            return 0;
        }

        $finalResult = round((float) $result, 4);
        Log::info("SIMPLE MATH EVALUATION SUCCESS", ['result' => $finalResult]);

        return $finalResult;
    }

    private function isSafeMathExpression($expression)
    {
        if (empty(trim($expression))) {
            return false;
        }

        // ✅✅✅ PERBAIKAN: Allow function names for CONDITIONALVALUE, MULTIIF, etc ✅✅✅
        if (preg_match('/^(CONDITIONALVALUE|MULTIIF|IF|SUM|AVERAGE|COUNT|COUNTA|COUNTIFS|SUMIFS|IFERROR|SUMIF|SUMPRODUCT|COUNTUNIQUE|AVERAGEIFS)\s*\(/i', $expression)) {
            Log::info("Expression is a function call, allowing through", ['expr' => substr($expression, 0, 50) . '...']);
            return $this->isSafeFunctionExpression($expression);
        }

        if (!preg_match('/^[0-9\.\+\-\*\/\(\)\s<>=!&|]+$/', $expression)) {
            Log::warning("Math expression contains unsafe characters", [
                'expression' => $expression,
                'chars' => str_split($expression)
            ]);
            return false;
        }

        $dangerousPatterns = [
            '/\$/',
            '/function/',
            '/eval/',
            '/exec/',
            '/system/',
            '/`/',
            '/include/',
            '/require/',
            '/;/',
            '/echo/',
            '/print/',
            '/die/',
            '/exit/',
            '/file_/',
            '/fopen/',
            '/shell_/',
            '/\bphp\b/',
            '/\<\?/',
            '/\?\>/'
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $expression)) {
                Log::warning("Math expression contains dangerous pattern", [
                    'expression' => $expression,
                    'pattern' => $pattern
                ]);
                return false;
            }
        }

        return true;
    }

    private function isSafeFunctionExpression($expression)
    {
        if (!preg_match('/^[A-Za-z0-9\.\+\-\*\/\(\)\s<>=!&|,;"_]+$/', $expression)) {
            Log::warning("Function expression contains unsafe characters", [
                'expression' => substr($expression, 0, 100) . '...',
                'rejected_chars' => array_unique(str_split(preg_replace('/[A-Za-z0-9\.\+\-\*\/\(\)\s<>=!&|,;"_]/', '', $expression)))
            ]);
            return false;
        }

        $dangerousPatterns = [
            '/\$[a-zA-Z]/',
            '/function\s*\(/',
            '/eval\s*\(/',
            '/exec\s*\(/',
            '/system\s*\(/',
            '/`/',
            '/include\s*\(/',
            '/require\s*\(/',
            '/;[^"]/',
            '/\becho\s*\(/',
            '/\bprint\s*\(/',
            '/\bdie\s*\(/',
            '/\bexit\s*\(/',
            '/file_[a-z]+\s*\(/',
            '/shell_[a-z]+\s*\(/',
            '/\<\?php/',
            '/\?\>/',
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $expression)) {
                Log::warning("Function expression contains dangerous pattern", [
                    'expression' => substr($expression, 0, 100) . '...',
                    'pattern' => $pattern
                ]);
                return false;
            }
        }

        Log::info("Function expression passed safety validation", [
            'function' => preg_match('/^([A-Z]+)/i', $expression, $m) ? $m[1] : 'unknown'
        ]);

        return true;
    }

    private function _handle_multiif($params, $data)
    {
        try {
            Log::info("MULTIIF called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 3) {
                Log::error('MULTIIF: Requires at least 3 parameters (condition1, value1, default)');
                return 0;
            }

            $conditions = [];
            $values = [];
            $defaultValue = 0;

            for ($i = 0; $i < count($params) - 1; $i += 2) {
                if ($i + 1 < count($params) - 1) {
                    $conditions[] = trim($params[$i]);
                    $values[] = trim($params[$i + 1]);
                }
            }

            if (count($params) % 2 === 1) {
                $defaultValue = $this->evaluateValue(trim($params[count($params) - 1]), $data);
            }

            Log::info("MULTIIF parsed", [
                'conditions_count' => count($conditions),
                'conditions' => $conditions,
                'values' => $values,
                'default_value' => $defaultValue
            ]);

            for ($i = 0; $i < count($conditions); $i++) {
                $condition = $conditions[$i];
                $value = $values[$i];

                if ($this->evaluateConditionSafely($condition)) {
                    $result = $this->evaluateValue($value, $data);
                    Log::info("MULTIIF: Condition met", [
                        'condition_index' => $i,
                        'condition' => $condition,
                        'result' => $result
                    ]);
                    return $result;
                }
            }

            Log::info("MULTIIF: No conditions met, using default", ['default' => $defaultValue]);
            return $defaultValue;

        } catch (Exception $e) {
            Log::error("Error in MULTIIF function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    /**
     * ✅✅✅ NEW: CONDITIONALVALUE Function - Handle complex conditional logic ✅✅✅
     */
    private function _handle_conditionalvalue($params, $data)
    {
        try {
            Log::info("CONDITIONALVALUE called", ['params' => $params]);

            if (count($params) < 4) {
                Log::error('CONDITIONALVALUE: Requires at least 4 parameters (variable, condition1, value1, default)');
                return 0;
            }

            $variableInput = trim($params[0]);

            // ✅✅✅ PERBAIKAN: Check if first parameter is numeric or variable ✅✅✅
            if (is_numeric($variableInput)) {
                $variableValue = (float) $variableInput;
                $variableName = 'VALUE';

                Log::info("CONDITIONALVALUE using direct numeric value", [
                    'input' => $variableInput,
                    'value' => $variableValue
                ]);
            } else {
                $variableName = $variableInput;
                $variableValue = $this->resolveVariableValue($variableName, $data);

                if ($variableValue === null) {
                    Log::warning("CONDITIONALVALUE: Variable '{$variableName}' not found");
                    return 0;
                }

                Log::info("CONDITIONALVALUE variable resolved", [
                    'variable' => $variableName,
                    'value' => $variableValue
                ]);
            }

            for ($i = 1; $i < count($params) - 1; $i += 2) {
                if ($i + 1 < count($params)) {
                    $condition = trim($params[$i], '"');
                    $valueFormula = trim($params[$i + 1], '"');

                    // ✅✅✅ IMPROVED: Replace variable/value in condition ✅✅✅
                    if (is_numeric($variableInput)) {
                        $evaluatedCondition = str_replace($variableInput, (string) $variableValue, $condition);
                    } else {
                        $evaluatedCondition = str_replace($variableName, (string) $variableValue, $condition);
                    }

                    Log::info("CONDITIONALVALUE evaluating condition", [
                        'original_condition' => $condition,
                        'evaluated_condition' => $evaluatedCondition
                    ]);

                    if ($this->evaluateConditionSafely($evaluatedCondition)) {
                        // ✅✅✅ IMPROVED: Replace variable/value in formula too ✅✅✅
                        if (is_numeric($variableInput)) {
                            $evaluatedValueFormula = str_replace($variableInput, (string) $variableValue, $valueFormula);
                        } else {
                            $evaluatedValueFormula = str_replace($variableName, (string) $variableValue, $valueFormula);
                        }

                        $result = $this->evaluateValue($evaluatedValueFormula, $data);

                        Log::info("CONDITIONALVALUE: Condition met", [
                            'original_condition' => $condition,
                            'evaluated_condition' => $evaluatedCondition,
                            'value_formula' => $valueFormula,
                            'evaluated_formula' => $evaluatedValueFormula,
                            'result' => $result
                        ]);

                        return $result;
                    }
                }
            }

            $defaultValue = $this->evaluateValue(trim($params[count($params) - 1], '"'), $data);
            Log::info("CONDITIONALVALUE: No conditions met, using default", ['default' => $defaultValue]);
            return $defaultValue;

        } catch (Exception $e) {
            Log::error("Error in CONDITIONALVALUE function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    private function _handle_countifs($params, $data)
    {
        try {
            Log::info("COUNTIFS called with correct params", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 2 || count($params) % 2 !== 0) {
                Log::error('COUNTIFS: Invalid number of parameters', ['count' => count($params), 'params' => $params]);
                return 0;
            }

            $criteriaRanges = [];
            $criteriaValues = [];

            for ($i = 0; $i < count($params); $i += 2) {
                $rangeParam = trim($params[$i]);
                $criteriaParam = trim($params[$i + 1], '"');

                $criteriaRanges[] = $rangeParam;
                $criteriaValues[] = $criteriaParam;
            }

            Log::info("COUNTIFS criteria parsed", [
                'ranges' => $criteriaRanges,
                'criteria' => $criteriaValues
            ]);

            $allRangeData = [];
            foreach ($criteriaRanges as $range) {
                $rangeData = $this->getOptimizedDataForRange($range, $data);
                $allRangeData[] = $rangeData;

                Log::info("Range data extracted", [
                    'range' => $range,
                    'data_count' => count($rangeData),
                    'sample' => array_slice($rangeData, 0, 3)
                ]);
            }

            if (empty($allRangeData)) {
                return 0;
            }

            $firstRangeLength = count($allRangeData[0]);
            foreach ($allRangeData as $index => $rangeData) {
                if (count($rangeData) !== $firstRangeLength) {
                    Log::warning("COUNTIFS: Range length mismatch", [
                        'expected' => $firstRangeLength,
                        'actual' => count($rangeData),
                        'range_index' => $index
                    ]);
                    return 0;
                }
            }

            $matchCount = 0;
            $debugMatches = [];

            for ($rowIndex = 0; $rowIndex < $firstRangeLength; $rowIndex++) {
                $allCriteriaMet = true;
                $rowDebug = ['row_index' => $rowIndex, 'criteria_results' => []];

                for ($criteriaIndex = 0; $criteriaIndex < count($criteriaValues); $criteriaIndex++) {
                    $value = $allRangeData[$criteriaIndex][$rowIndex] ?? null;
                    $criteria = $criteriaValues[$criteriaIndex];
                    $meetsCriteria = $this->evaluateCriteria($value, $criteria);

                    $rowDebug['criteria_results'][] = [
                        'range' => $criteriaRanges[$criteriaIndex],
                        'value' => $value,
                        'criteria' => $criteria,
                        'meets_criteria' => $meetsCriteria
                    ];

                    if (!$meetsCriteria) {
                        $allCriteriaMet = false;
                        break;
                    }
                }

                if ($allCriteriaMet) {
                    $matchCount++;
                    Log::debug("COUNTIFS: Row {$rowIndex} matches all criteria", $rowDebug);
                } else {
                    if ($rowIndex < 5) {
                        Log::debug("COUNTIFS: Row {$rowIndex} does NOT match", $rowDebug);
                    }
                }

                $debugMatches[] = $rowDebug;
            }

            Log::info("COUNTIFS final result", [
                'total_rows_checked' => $firstRangeLength,
                'matches_found' => $matchCount,
                'ranges' => $criteriaRanges,
                'criteria' => $criteriaValues,
                'first_5_rows_debug' => array_slice($debugMatches, 0, 5)
            ]);

            return $matchCount;

        } catch (Exception $e) {
            Log::error("Error in COUNTIFS function", [
                'error' => $e->getMessage(),
                'params' => $params
            ]);
            return 0;
        }
    }

    private function getOptimizedDataForRange($rangeString, $data)
    {
        Log::info("Getting optimized data for range", ['range' => $rangeString, 'data_count' => count($data)]);

        if (!preg_match('/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/', $rangeString, $matches)) {
            Log::info("Not a range/cell, treating as literal", ['value' => $rangeString]);
            return is_numeric($rangeString) ? [(float) $rangeString] : [];
        }

        $startColStr = $matches[1];
        $startRow = (int) $matches[2];
        $endColStr = $matches[3] ?? $startColStr;
        $endRow = isset($matches[4]) ? (int) $matches[4] : $startRow;

        $startColNum = $this->excelColumnToNumber($startColStr);
        $endColNum = $this->excelColumnToNumber($endColStr);

        $barisAwalExcel = $this->table->barisAwalExcel ?? 9;
        $actualDataEndRow = $barisAwalExcel + count($data) - 1;
        $effectiveEndRow = min($endRow, $actualDataEndRow);

        Log::info("Optimized range processing", [
            'original_range' => "{$startColStr}{$startRow}:{$endColStr}{$endRow}",
            'baris_awal_excel' => $barisAwalExcel,
            'data_count' => count($data),
            'actual_data_end_row' => $actualDataEndRow,
            'effective_end_row' => $effectiveEndRow
        ]);

        $values = [];

        for ($currentRow = $startRow; $currentRow <= $effectiveEndRow; $currentRow++) {
            $dataIndex = $currentRow - $barisAwalExcel;

            if ($dataIndex < 0 || $dataIndex >= count($data)) {
                continue;
            }

            $rowData = $data[$dataIndex];

            for ($currentCol = $startColNum; $currentCol <= $endColNum; $currentCol++) {
                $colStr = $this->numberToExcelColumn($currentCol);
                $fieldName = $this->columnMapping[$colStr] ?? null;

                if ($fieldName && is_array($rowData) && array_key_exists($fieldName, $rowData)) {
                    $values[] = $rowData[$fieldName];
                } else {
                    $values[] = null;
                }
            }
        }

        Log::info("Optimized range result", [
            'values_count' => count($values),
            'non_null_count' => count(array_filter($values, fn($v) => $v !== null)),
            'sample' => array_slice($values, 0, 5)
        ]);

        return $values;
    }

    private function _handle_countunique($params, $data)
    {
        try {
            Log::info("COUNTUNIQUE called", ['params' => $params, 'data_count' => count($data)]);

            if (empty($params[0])) {
                return 0;
            }

            $rangeData = $this->getOptimizedDataForRange($params[0], $data);

            $uniqueValues = [];
            foreach ($rangeData as $value) {
                if ($value !== null && $value !== '' && $value !== '-') {
                    $uniqueValues[$value] = true;
                }
            }

            $count = count($uniqueValues);
            Log::info("COUNTUNIQUE result", [
                'range' => $params[0],
                'total_values' => count($rangeData),
                'unique_count' => $count,
                'unique_values' => array_keys($uniqueValues)
            ]);

            return $count;

        } catch (Exception $e) {
            Log::error("Error in COUNTUNIQUE function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    /**
     * ✅✅✅ AVERAGEIFS: Average values with multiple criteria ✅✅✅
     */
    private function _handle_averageifs($params, $data)
    {
        try {
            Log::info("AVERAGEIFS called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 3 || (count($params) - 1) % 2 !== 0) {
                Log::error('AVERAGEIFS: Invalid number of parameters', ['count' => count($params)]);
                return 0;
            }

            $averageRange = trim($params[0]);
            $criteriaRanges = [];
            $criteriaValues = [];

            for ($i = 1; $i < count($params); $i += 2) {
                $criteriaRanges[] = trim($params[$i]);
                $criteriaValues[] = trim($params[$i + 1], '"');
            }

            Log::info("AVERAGEIFS criteria parsed", [
                'average_range' => $averageRange,
                'criteria_ranges' => $criteriaRanges,
                'criteria_values' => $criteriaValues
            ]);

            $averageData = $this->getOptimizedDataForRange($averageRange, $data);
            $allCriteriaData = [];

            foreach ($criteriaRanges as $range) {
                $allCriteriaData[] = $this->getOptimizedDataForRange($range, $data);
            }

            $expectedLength = count($averageData);
            foreach ($allCriteriaData as $index => $criteriaData) {
                if (count($criteriaData) !== $expectedLength) {
                    Log::warning("AVERAGEIFS: Range length mismatch", [
                        'expected' => $expectedLength,
                        'actual' => count($criteriaData),
                        'range_index' => $index
                    ]);
                    return 0;
                }
            }

            $sum = 0;
            $count = 0;

            for ($rowIndex = 0; $rowIndex < $expectedLength; $rowIndex++) {
                $allCriteriaMet = true;

                for ($criteriaIndex = 0; $criteriaIndex < count($criteriaValues); $criteriaIndex++) {
                    $value = $allCriteriaData[$criteriaIndex][$rowIndex] ?? null;
                    $criteria = $criteriaValues[$criteriaIndex];

                    if (!$this->evaluateCriteria($value, $criteria)) {
                        $allCriteriaMet = false;
                        break;
                    }
                }

                if ($allCriteriaMet) {
                    $avgValue = $averageData[$rowIndex] ?? null;
                    if (is_numeric($avgValue)) {
                        $sum += (float) $avgValue;
                        $count++;
                    }
                }
            }

            $result = $count > 0 ? $sum / $count : 0;
            Log::info("AVERAGEIFS result", [
                'matching_rows' => $count,
                'sum' => $sum,
                'average' => $result
            ]);

            return $result;

        } catch (Exception $e) {
            Log::error("Error in AVERAGEIFS function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    /**
     * ✅✅✅ IFERROR: Return alternative value if expression results in error ✅✅✅
     */
    private function _handle_iferror($params, $data)
    {
        try {
            Log::info("IFERROR called", ['params' => $params]);

            if (count($params) < 2) {
                Log::error('IFERROR: Requires at least 2 parameters');
                return 0;
            }

            $expression = trim($params[0]);
            $errorValue = trim($params[1]);

            Log::info("IFERROR components", [
                'expression' => $expression,
                'error_value' => $errorValue
            ]);

            try {
                $result = $this->evaluateValue($expression, $data);

                if (is_numeric($result) && is_finite($result)) {
                    Log::info("IFERROR: Expression succeeded", ['result' => $result]);
                    return $result;
                } else {
                    Log::info("IFERROR: Expression returned non-numeric/infinite result, using error value");
                    return $this->evaluateValue($errorValue, $data);
                }

            } catch (Exception $e) {
                Log::info("IFERROR: Expression failed, using error value", ['error' => $e->getMessage()]);
                return $this->evaluateValue($errorValue, $data);
            }

        } catch (Exception $e) {
            Log::error("Error in IFERROR function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    /**
     * ✅✅✅ SUMIF: Sum values with single criteria ✅✅✅
     */
    private function _handle_sumif($params, $data)
    {
        try {
            Log::info("SUMIF called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 2) {
                Log::error('SUMIF: Requires at least 2 parameters');
                return 0;
            }

            $criteriaRange = trim($params[0]);
            $criteria = trim($params[1], '"');
            $sumRange = isset($params[2]) ? trim($params[2]) : $criteriaRange;

            Log::info("SUMIF parameters", [
                'criteria_range' => $criteriaRange,
                'criteria' => $criteria,
                'sum_range' => $sumRange
            ]);

            $criteriaData = $this->getOptimizedDataForRange($criteriaRange, $data);
            $sumData = $this->getOptimizedDataForRange($sumRange, $data);

            if (count($criteriaData) !== count($sumData)) {
                Log::warning("SUMIF: Range length mismatch", [
                    'criteria_length' => count($criteriaData),
                    'sum_length' => count($sumData)
                ]);
                return 0;
            }

            $sum = 0;
            $matchCount = 0;

            for ($i = 0; $i < count($criteriaData); $i++) {
                $criteriaValue = $criteriaData[$i] ?? null;

                if ($this->evaluateCriteria($criteriaValue, $criteria)) {
                    $sumValue = $sumData[$i] ?? null;
                    if (is_numeric($sumValue)) {
                        $sum += (float) $sumValue;
                        $matchCount++;
                    }
                }
            }

            Log::info("SUMIF result", [
                'matching_rows' => $matchCount,
                'sum' => $sum
            ]);

            return $sum;

        } catch (Exception $e) {
            Log::error("Error in SUMIF function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    /**
     * ✅✅✅ SUMIFS: Sum values with multiple criteria ✅✅✅
     */
    private function _handle_sumifs($params, $data)
    {
        try {
            Log::info("SUMIFS called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 3 || (count($params) - 1) % 2 !== 0) {
                Log::error('SUMIFS: Invalid number of parameters', ['count' => count($params)]);
                return 0;
            }

            $sumRange = trim($params[0]);
            $criteriaRanges = [];
            $criteriaValues = [];

            for ($i = 1; $i < count($params); $i += 2) {
                $criteriaRanges[] = trim($params[$i]);
                $criteriaValues[] = trim($params[$i + 1], '"');
            }

            Log::info("SUMIFS criteria parsed", [
                'sum_range' => $sumRange,
                'criteria_ranges' => $criteriaRanges,
                'criteria_values' => $criteriaValues
            ]);

            $sumData = $this->getOptimizedDataForRange($sumRange, $data);
            $allCriteriaData = [];

            foreach ($criteriaRanges as $range) {
                $allCriteriaData[] = $this->getOptimizedDataForRange($range, $data);
            }

            $expectedLength = count($sumData);
            foreach ($allCriteriaData as $index => $criteriaData) {
                if (count($criteriaData) !== $expectedLength) {
                    Log::warning("SUMIFS: Range length mismatch", [
                        'expected' => $expectedLength,
                        'actual' => count($criteriaData),
                        'range_index' => $index
                    ]);
                    return 0;
                }
            }

            $sum = 0;
            $matchCount = 0;

            for ($rowIndex = 0; $rowIndex < $expectedLength; $rowIndex++) {
                $allCriteriaMet = true;

                for ($criteriaIndex = 0; $criteriaIndex < count($criteriaValues); $criteriaIndex++) {
                    $value = $allCriteriaData[$criteriaIndex][$rowIndex] ?? null;
                    $criteria = $criteriaValues[$criteriaIndex];

                    if (!$this->evaluateCriteria($value, $criteria)) {
                        $allCriteriaMet = false;
                        break;
                    }
                }

                if ($allCriteriaMet) {
                    $sumValue = $sumData[$rowIndex] ?? null;
                    if (is_numeric($sumValue)) {
                        $sum += (float) $sumValue;
                        $matchCount++;
                    }
                }
            }

            Log::info("SUMIFS result", [
                'matching_rows' => $matchCount,
                'sum' => $sum
            ]);

            return $sum;

        } catch (Exception $e) {
            Log::error("Error in SUMIFS function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    private function _handle_sumproduct($params, $data)
    {
        try {
            Log::info("SUMPRODUCT called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) < 1) {
                Log::error('SUMPRODUCT: Requires at least 1 parameter');
                return 0;
            }

            // ✅ PERBAIKAN: Handle single complex expression
            if (count($params) === 1) {
                $expression = trim($params[0]);

                if (preg_match('/\((.*?)\)\s*\/\s*(.+)/', $expression, $matches)) {
                    $numeratorExpr = trim($matches[1]);
                    $denominatorExpr = trim($matches[2]);

                    Log::info("SUMPRODUCT: Complex division expression", [
                        'numerator' => $numeratorExpr,
                        'denominator' => $denominatorExpr
                    ]);

                    $numerator = $this->evaluateConditionExpression($numeratorExpr, $data);
                    $denominator = $this->evaluateExpression($denominatorExpr, $data);

                    Log::info("SUMPRODUCT: Division components", [
                        'numerator_result' => $numerator,
                        'denominator_result' => $denominator
                    ]);

                    if ($denominator == 0) {
                        Log::warning("SUMPRODUCT: Division by zero");
                        return 0;
                    }

                    return $numerator / $denominator;
                }
            }

            $allRangeData = [];
            foreach ($params as $param) {
                $rangeData = $this->getOptimizedDataForRange(trim($param), $data);
                $allRangeData[] = $rangeData;
            }

            if (empty($allRangeData)) {
                return 0;
            }

            $expectedLength = count($allRangeData[0]);
            foreach ($allRangeData as $index => $rangeData) {
                if (count($rangeData) !== $expectedLength) {
                    Log::warning("SUMPRODUCT: Range length mismatch", [
                        'expected' => $expectedLength,
                        'actual' => count($rangeData),
                        'range_index' => $index
                    ]);
                    return 0;
                }
            }

            $sumProduct = 0;
            for ($rowIndex = 0; $rowIndex < $expectedLength; $rowIndex++) {
                $product = 1;
                $hasNumericValue = false;

                foreach ($allRangeData as $rangeData) {
                    $value = $rangeData[$rowIndex] ?? null;

                    if (is_numeric($value)) {
                        $product *= (float) $value;
                        $hasNumericValue = true;
                    } else {
                        $product = 0;
                        break;
                    }
                }

                if ($hasNumericValue) {
                    $sumProduct += $product;
                }
            }

            Log::info("SUMPRODUCT result", [
                'ranges_count' => count($allRangeData),
                'rows_processed' => $expectedLength,
                'sum_product' => $sumProduct
            ]);

            return $sumProduct;

        } catch (Exception $e) {
            Log::error("Error in SUMPRODUCT function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    private function evaluateConditionExpression($expression, $data)
    {
        try {
            Log::info("Evaluating condition expression", ['expr' => $expression]);

            if (preg_match('/^([A-Z]+\d+:[A-Z]+\d+)\s*(<>|!=)\s*["\']?([^"\']*)["\']?$/', $expression, $matches)) {
                $range = $matches[1];
                $operator = $matches[2];
                $compareValue = $matches[3];

                Log::info("Range condition detected", [
                    'range' => $range,
                    'operator' => $operator,
                    'compare_value' => $compareValue
                ]);

                $rangeData = $this->getOptimizedDataForRange($range, $data);
                $count = 0;

                foreach ($rangeData as $value) {
                    if ($operator === '<>' || $operator === '!=') {
                        if ($compareValue === '') {
                            if ($value !== null && $value !== '' && $value !== '-') {
                                $count++;
                            }
                        } else {
                            if ($value != $compareValue) {
                                $count++;
                            }
                        }
                    }
                }

                Log::info("Condition expression result", [
                    'matching_count' => $count,
                    'total_values' => count($rangeData)
                ]);

                return $count;
            }

            return 0;

        } catch (Exception $e) {
            Log::error("Error evaluating condition expression", ['error' => $e->getMessage()]);
            return 0;
        }
    }

    private function _handle_sum($params, $data)
    {
        try {
            $totalSum = 0;
            foreach ($params as $param) {
                if (is_numeric($param)) {
                    $totalSum += (float) $param;
                } else {
                    $rangeData = $this->getOptimizedDataForRange($param, $data);
                    if (is_array($rangeData)) {
                        foreach ($rangeData as $value) {
                            if (is_numeric($value)) {
                                $totalSum += (float) $value;
                            }
                        }
                    } elseif (is_numeric($rangeData)) {
                        $totalSum += (float) $rangeData;
                    }
                }
            }
            return $totalSum;
        } catch (Exception $e) {
            Log::error("Error in SUM function", ['error' => $e->getMessage()]);
            return 0;
        }
    }

    private function _handle_counta($params, $data)
    {
        if (empty($params[0]))
            return 0;

        $rangeData = $this->getOptimizedDataForRange($params[0], $data);
        $count = 0;

        foreach ($rangeData as $value) {
            if ($value !== null && $value !== '' && $value !== '-') {
                $count++;
            }
        }

        return $count;
    }

    private function _handle_countif($params, $data)
    {
        try {
            Log::info("COUNTIF called", ['params' => $params, 'data_count' => count($data)]);

            if (count($params) !== 2) {
                Log::error('COUNTIF: Invalid parameters count', ['count' => count($params)]);
                return 0;
            }

            $rangeParam = trim($params[0]);
            $criteriaParam = trim($params[1], '"');

            Log::info("COUNTIF parameters", [
                'range' => $rangeParam,
                'criteria' => $criteriaParam
            ]);

            $rangeData = $this->getOptimizedDataForRange($rangeParam, $data);

            // ✅ PERBAIKAN UTAMA: Handle criteria yang menggunakan concatenation
            if (preg_match('/^(.+)&(.*)$/', $criteriaParam, $matches)) {
                $baseRange = trim($matches[1]);
                $suffix = trim($matches[2], '"');

                Log::info("COUNTIF: Detected concatenation criteria", [
                    'base_range' => $baseRange,
                    'suffix' => $suffix,
                    'original_criteria' => $criteriaParam
                ]);

                if ($suffix === '') {
                    $count = 0;
                    foreach ($rangeData as $value) {
                        if ($value !== null && $value !== '' && $value !== '-') {
                            $count++;
                        }
                    }

                    Log::info("COUNTIF concatenation result (non-empty)", [
                        'total_values' => count($rangeData),
                        'non_empty_count' => $count,
                        'sample_values' => array_slice($rangeData, 0, 5)
                    ]);

                    return $count;
                }
            }

            // ✅ PERBAIKAN: Handle criteria "<>" untuk non-empty
            if ($criteriaParam === '<>' || $criteriaParam === '!=""' || $criteriaParam === '<>""') {
                $count = 0;
                foreach ($rangeData as $value) {
                    if ($value !== null && $value !== '' && $value !== '-') {
                        $count++;
                    }
                }

                Log::info("COUNTIF non-empty criteria result", [
                    'criteria' => $criteriaParam,
                    'total_values' => count($rangeData),
                    'non_empty_count' => $count
                ]);

                return $count;
            }

            $count = 0;
            foreach ($rangeData as $value) {
                if ($this->evaluateCriteria($value, $criteriaParam)) {
                    $count++;
                }
            }

            Log::info("COUNTIF standard result", [
                'criteria' => $criteriaParam,
                'match_count' => $count,
                'total_values' => count($rangeData)
            ]);

            return $count;

        } catch (Exception $e) {
            Log::error("Error in COUNTIF function", ['error' => $e->getMessage(), 'params' => $params]);
            return 0;
        }
    }

    private function _handle_average($params, $data)
    {
        $values = [];
        foreach ($params as $param) {
            if (is_numeric($param)) {
                $values[] = (float) $param;
            } else {
                $rangeData = $this->getOptimizedDataForRange($param, $data);
                foreach ($rangeData as $value) {
                    if (is_numeric($value)) {
                        $values[] = (float) $value;
                    }
                }
            }
        }
        return count($values) > 0 ? array_sum($values) / count($values) : 0;
    }

    private function _handle_if($params, $data)
    {
        if (count($params) < 2) {
            return 0;
        }

        $condition = trim($params[0]);
        $trueValue = trim($params[1]);
        $falseValue = isset($params[2]) ? trim($params[2]) : '0';

        $conditionResult = $this->evaluateConditionSafely($condition);

        if ($conditionResult) {
            return $this->evaluateValue($trueValue, $data);
        } else {
            return $this->evaluateValue($falseValue, $data);
        }
    }

    private function getDataForRange($rangeString, $data)
    {
        return $this->getOptimizedDataForRange($rangeString, $data);
    }

    private function evaluateCriteria($value, $criteria)
    {
        Log::debug("EVALUATING CRITERIA", [
            'value' => $value,
            'value_type' => gettype($value),
            'criteria' => $criteria,
            'value_string' => (string) $value,
            'value_length' => strlen((string) $value)
        ]);

        // ✅ PERBAIKAN 1: Handle "<>" criteria (not empty/not equal)
        if ($criteria === '<>' || $criteria === '!=') {
            $result = $value !== null && $value !== '' && $value !== '-';
            Log::debug("NOT_EMPTY_CRITERIA", [
                'value' => $value,
                'result' => $result,
                'is_null' => $value === null,
                'is_empty_string' => $value === '',
                'is_dash' => $value === '-',
                'is_zero' => $value === 0
            ]);
            return $result;
        }

        // ✅ PERBAIKAN 2: Handle "<>0" criteria (not equal to zero)
        if ($criteria === '<>0' || $criteria === '!=0') {
            if (is_numeric($value)) {
                $numValue = (float) $value;
                $result = $numValue != 0;
                Log::debug("NOT_ZERO_CRITERIA", [
                    'original_value' => $value,
                    'numeric_value' => $numValue,
                    'result' => $result
                ]);
                return $result;
            } else {
                $result = $value !== null && $value !== '' && $value !== '-';
                Log::debug("NOT_ZERO_CRITERIA_NON_NUMERIC", [
                    'value' => $value,
                    'result' => $result
                ]);
                return $result;
            }
        }

        // ✅ PERBAIKAN 3: Enhanced operator parsing
        if (preg_match('/^(>=|<=|>|<|=|<>|!=)(.*)$/', $criteria, $matches)) {
            $operator = $matches[1];
            $criteriaValue = trim($matches[2], '"');

            Log::debug("OPERATOR_CRITERIA", [
                'operator' => $operator,
                'criteria_value' => $criteriaValue,
                'value' => $value
            ]);

            if (is_numeric($value) && is_numeric($criteriaValue)) {
                $numValue = (float) $value;
                $numCriteria = (float) $criteriaValue;

                $result = match ($operator) {
                    '>=' => $numValue >= $numCriteria,
                    '<=' => $numValue <= $numCriteria,
                    '>' => $numValue > $numCriteria,
                    '<' => $numValue < $numCriteria,
                    '=' => abs($numValue - $numCriteria) < 0.0001,
                    '<>' => abs($numValue - $numCriteria) >= 0.0001,
                    '!=' => abs($numValue - $numCriteria) >= 0.0001,
                    default => false,
                };

                Log::debug("NUMERIC_COMPARISON", [
                    'num_value' => $numValue,
                    'num_criteria' => $numCriteria,
                    'operator' => $operator,
                    'result' => $result
                ]);

                return $result;
            }

            $stringValue = trim((string) $value, '"');
            $stringCriteria = trim($criteriaValue, '"');

            $result = match ($operator) {
                '=' => $stringValue === $stringCriteria,
                '<>' => $stringValue !== $stringCriteria,
                '!=' => $stringValue !== $stringCriteria,
                default => false,
            };

            Log::debug("STRING_COMPARISON", [
                'string_value' => $stringValue,
                'string_criteria' => $stringCriteria,
                'operator' => $operator,
                'result' => $result
            ]);

            return $result;
        }

        // ✅ PERBAIKAN 4: Exact match (fallback)
        $result = trim((string) $value, '"') === trim($criteria, '"');
        Log::debug("EXACT_MATCH", [
            'value' => trim((string) $value, '"'),
            'criteria' => trim($criteria, '"'),
            'result' => $result
        ]);

        return $result;
    }

    private function resolveActualVariables($expression, $data)
    {
        preg_match_all('/\b([A-Za-z][A-Za-z0-9_]*)\b/', $expression, $matches);
        $allVariables = array_unique($matches[1]);

        $variablesToResolve = array_filter($allVariables, function ($var) {
            return !in_array($var, $this->supportedFunctions)
                && strlen($var) > 1
                && !in_array(strtolower($var), ['valid', 'invalid', 'true', 'false']);
        });

        if (empty($variablesToResolve)) {
            return $expression;
        }

        $externalValues = $this->batchFindExternalVariableValues($variablesToResolve);

        foreach ($variablesToResolve as $var) {
            if (isset($externalValues[$var])) {
                $expression = preg_replace('/\b' . preg_quote($var, '/') . '\b/', (string) $externalValues[$var], $expression);
            }
        }

        return $expression;
    }

    private function batchFindExternalVariableValues($variables)
    {
        $projectId = request()->input('projectId');
        if (!$projectId)
            return [];

        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
        $taskListIds = $taskLists->pluck('_id')->toArray();
        $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
        $allTaskIds = $tasks->pluck('_id')->map(fn($id) => (string) $id)->toArray();

        $results = [];

        $lkpsDataCollection = LkpsData::whereIn('taskId', $allTaskIds)
            ->whereNotNull('detailNilai')
            ->get(['detailNilai']);

        foreach ($lkpsDataCollection as $lkpsData) {
            $detailNilai = $lkpsData->detailNilai ?? [];
            foreach ($variables as $variable) {
                if (isset($detailNilai[$variable]) && !isset($results[$variable])) {
                    $results[$variable] = $detailNilai[$variable];
                }
            }
        }

        return $results;
    }


    // ✅✅✅ NEW: Calculate variable from current table if needed ✅✅✅
    private function calculateCurrentTableVariable($variable, $data)
    {
        $rumusDef = collect($this->table->rumus)->firstWhere('variabel', $variable);
        if (!$rumusDef) {
            return null;
        }

        Log::info("CALCULATING CURRENT TABLE VARIABLE", [
            'variable' => $variable,
            'formula' => $rumusDef['formula']
        ]);

        try {
            $tempParser = new self($this->table);
            return $tempParser->evaluateFormula($rumusDef['formula'], $data);
        } catch (Exception $e) {
            Log::error("Error calculating current table variable", [
                'variable' => $variable,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    private function findExternalVariableValue($variable)
    {
        $projectId = request()->input('projectId');
        if (!$projectId)
            return null;

        $taskLists = \App\Models\Project\TaskList::where('projectId', $projectId)->get();
        $taskListIds = $taskLists->pluck('_id')->toArray();
        $tasks = \App\Models\Project\Task::whereIn('taskListId', $taskListIds)->get();
        $allTaskIds = $tasks->pluck('_id')->map(fn($id) => (string) $id)->toArray();

        $lkpsData = LkpsData::whereIn('taskId', $allTaskIds)
            ->where("detailNilai.{$variable}", 'exists', true)
            ->first(['detailNilai']);

        if ($lkpsData && isset($lkpsData->detailNilai[$variable])) {
            return $lkpsData->detailNilai[$variable];
        }

        $upperVariable = strtoupper($variable);
        $lkpsData = LkpsData::whereIn('taskId', $allTaskIds)
            ->where("detailNilai.{$upperVariable}", 'exists', true)
            ->first(['detailNilai']);

        if ($lkpsData && isset($lkpsData->detailNilai[$upperVariable])) {
            return $lkpsData->detailNilai[$upperVariable];
        }

        return null;
    }

    public function getColumnMapping()
    {
        return $this->columnMapping;
    }

    public function getLastCalculationDetails()
    {
        return $this->lastCalculationDetails;
    }

    private static $dependencyGraph = [];

    private function buildDependencyGraph($variables)
    {
        // ✅ Pre-calculate dependency order untuk menghindari circular resolution
        $graph = [];
        foreach ($variables as $var) {
            $dependencies = $this->extractVariableDependencies($var);
            $graph[$var] = $dependencies;
        }

        return $this->topologicalSort($graph);
    }

    private function resolveInOptimalOrder($variables, $data)
    {
        $orderedVars = $this->buildDependencyGraph($variables);
        $results = [];

        foreach ($orderedVars as $var) {
            $results[$var] = $this->resolveVariableValue($var, $data);
        }

        return $results;
    }
}