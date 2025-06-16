<?php

namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Controller for handling data mapping operations with Gemini AI.
 */
class GeminiDataMappingController extends Controller
{

    public function mappingData(Request $request): JsonResponse
    {
        try {
            // Validate request input
            $request->validate([
                'database_columns' => 'required|array',
                'excel_headers' => 'required|array',
                'semantic_threshold' => 'nullable|numeric|min:0|max:1',
            ]);

            // Extract request data
            $dbColumns = $request->input('database_columns');
            $excelHeaders = $request->input('excel_headers');
            $semanticThreshold = $request->input('semantic_threshold', 0.6); // Default 0.6

            // Filter out empty Excel headers
            $excelHeaders = array_filter($excelHeaders, fn($header) => !empty(trim($header)));

            // Build the Gemini prompt with threshold
            $prompt = $this->buildPrompt($dbColumns, $excelHeaders, $semanticThreshold);

            // Generate mapping using Gemini AI
            $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
                ->generateContent($prompt);

            // Process the Gemini response
            $responseText = $result->text();
            $jsonResult = $this->extractJsonFromText($responseText);

            // Check if valid JSON was extracted
            if (!$jsonResult) {
                return $this->errorResponse(
                    'Failed to extract valid JSON mapping from Gemini response',
                    ['rawResponse' => $responseText]
                );
            }

            // Return successful response with mapping
            return response()->json([
                'success' => true,
                'mapping' => $jsonResult,
                'threshold_used' => $semanticThreshold
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Build the prompt for Gemini AI with semantic threshold.
     *
     * @param array $dbColumns Database column definitions
     * @param array $excelHeaders Excel column headers
     * @param float $semanticThreshold Minimum confidence threshold (0.0 - 1.0)
     * @return string The formatted prompt
     */
    private function buildPrompt(array $dbColumns, array $excelHeaders, float $semanticThreshold): string
    {
        $thresholdPercentage = round($semanticThreshold * 100);

        return "You are a data mapping assistant with semantic understanding capabilities. I need you to match Excel column headers to database column names based on meaning and context.

## Task
Match each database column (indeksData) to the most appropriate Excel column header based on semantic understanding. You must evaluate the confidence/similarity level for each potential match.

## Confidence Threshold
- Only create mappings where your confidence level is >= {$thresholdPercentage}% ({$semanticThreshold})
- If no Excel header meets the confidence threshold for a database column, DO NOT include it in the mapping
- Consider semantic meaning, not just text similarity

## Evaluation Criteria
1. **Exact semantic match** (100% confidence): The Excel header means exactly the same thing
2. **Strong semantic match** (80-99% confidence): Very similar meaning with minor differences
3. **Moderate semantic match** (60-79% confidence): Related concepts but with some differences
4. **Weak semantic match** (40-59% confidence): Some relation but significant differences
5. **Poor/No match** (0-39% confidence): Different concepts entirely

## Input Data
1. DATABASE_COLUMNS: " . json_encode($dbColumns) . "
2. EXCEL_HEADERS: " . json_encode($excelHeaders) . "

## Expected Output Format
Return a JSON object where:
- Keys are the database column indeksData values (only for mappings that meet the threshold)
- Values are objects containing:
  - excelIndex: The index of the matched Excel header (0-based)
  - excelHeader: The matched Excel header text
  - confidence: Your confidence score (0.0 - 1.0)
  - reasoning: Brief explanation of why this mapping was chosen

## Important Notes
- Only include mappings where confidence >= {$semanticThreshold}
- Each Excel header should only be mapped to ONE database column (choose the best match)
- If multiple database columns could match the same Excel header, choose the one with highest confidence
- Consider context clues like numbering, parenthetical notes, and hierarchical structure

## Example Output Format
{
  \"column1\": {
    \"excelIndex\": 0,
    \"excelHeader\": \"Student Name\",
    \"confidence\": 0.95,
    \"reasoning\": \"Direct semantic match for student identification\"
  },
  \"column2\": {
    \"excelIndex\": 3,
    \"excelHeader\": \"Academic Year 2023/2024\",
    \"confidence\": 0.85,
    \"reasoning\": \"Academic year matches temporal academic context\"
  }
}

Format your response as ONLY the JSON without any additional text, code blocks, or markdown.";
    }

    private function extractJsonFromText(string $text): ?array
    {
        // Try to extract JSON between backticks if present
        preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $matches);

        if (!empty($matches[1])) {
            $jsonText = trim($matches[1]);
        } else {
            // If no backticks, take the whole text
            $jsonText = trim($text);
        }

        // Try to decode the JSON
        $decoded = json_decode($jsonText, true);

        // Return the decoded JSON or null if decoding failed
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
    }

    private function errorResponse(string $message, array $additionalData = []): JsonResponse
    {
        $response = [
            'success' => false,
            'error' => $message,
        ];

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response, 500);
    }
}