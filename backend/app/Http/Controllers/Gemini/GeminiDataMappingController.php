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
  /**
   * Map Excel headers to database columns using Gemini AI.
   *
   * @param Request $request The HTTP request containing database columns and Excel headers
   * @return JsonResponse The mapping results or error response
   */
  public function mappingData(Request $request): JsonResponse
  {
    try {
      // Validate request input
      $request->validate([
        'database_columns' => 'required|array',
        'excel_headers' => 'required|array',
      ]);

      // Extract request data
      $dbColumns = $request->input('database_columns');
      $excelHeaders = $request->input('excel_headers');

      // Filter out empty Excel headers
      $excelHeaders = array_filter($excelHeaders, fn($header) => !empty(trim($header)));

      // Build the Gemini prompt
      $prompt = $this->buildPrompt($dbColumns, $excelHeaders);

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
        'mapping' => $jsonResult
      ]);

    } catch (\Exception $e) {
      return $this->errorResponse($e->getMessage());
    }
  }

  /**
   * Build the prompt for Gemini AI.
   *
   * @param array $dbColumns Database column definitions
   * @param array $excelHeaders Excel column headers
   * @return string The formatted prompt
   */
  private function buildPrompt(array $dbColumns, array $excelHeaders): string
  {
    return "You are a data mapping assistant. I need you to match Excel column headers to database column names based on semantic understanding.

        ## Task
        Match each database column (indeksData) to the most appropriate Excel column header based on meaning and context. Don't just rely on text similarity - understand what each column represents.

        ## Input
        1. DATABASE_COLUMNS: " . json_encode($dbColumns) . "
        2. EXCEL_HEADERS: " . json_encode($excelHeaders) . "

        ## Expected Output Format
        Return a JSON object where:
        - Keys are the database column indeksData values
        - Values are objects containing:
          - excelIndex: The index of the matched Excel header (0-based)
          - excelHeader: The matched Excel header text

        Format your response as ONLY the JSON without any additional text, code blocks, or markdown.";
  }

  /**
   * Extract JSON from text that might be formatted with markdown.
   *
   * @param string $text The text potentially containing JSON
   * @return array|null The extracted JSON as an array, or null if extraction failed
   */
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

  /**
   * Create a standardized error response.
   *
   * @param string $message The error message
   * @param array $additionalData Additional data to include in the response
   * @return JsonResponse The formatted error response
   */
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