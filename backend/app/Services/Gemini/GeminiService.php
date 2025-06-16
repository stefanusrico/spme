<?php
namespace App\Services\Gemini;

use App\Data\Gemini\ChatSessionData;
use App\Data\Gemini\GenerationConfigData;
use App\Exceptions\GeminiException;
use Gemini\Data\Blob;
use Gemini\Data\GenerationConfig;
use Gemini\Enums\MimeType;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Support\Facades\Log;

class GeminiService
{
  protected GeminiConfig $config;

  public function __construct()
  {
    $this->config = new GeminiConfig();
  }

  /**
   * Generate text content using Gemini API
   */
  public function generateText(string $prompt, ?GenerationConfigData $config = null): string
  {
    try {
      $model = $config?->model ?? $this->config->getDefaultModel();
      $temperature = $config?->temperature ?? $this->config->getDefaultTemperature();

      $result = Gemini::generativeModel(model: $model)
        ->withTemperature($temperature)
        ->generateContent($prompt);

      return $result->text();
    } catch (\Exception $e) {
      Log::error('Gemini text generation error: ' . $e->getMessage());
      throw new GeminiException('Failed to generate AI text: ' . $e->getMessage());
    }
  }

  /**
   * Analyze image with text prompt
   */
  public function analyzeImage(string $prompt, string $imagePath, ?string $model = null): string
  {
    try {
      $model = $model ?? $this->config->getDefaultVisionModel();

      $result = Gemini::generativeModel(model: $model)
        ->generateContent([
          $prompt,
          new Blob(
            mimeType: MimeType::IMAGE_JPEG,
            data: base64_encode(file_get_contents($imagePath))
          )
        ]);

      return $result->text();
    } catch (\Exception $e) {
      Log::error('Gemini image analysis error: ' . $e->getMessage());
      throw new GeminiException('Failed to analyze image: ' . $e->getMessage());
    }
  }

  /**
   * Start a new chat session
   */
  public function startChatSession(array $history = [], ?string $model = null): object
  {
    $model = $model ?? $this->config->getDefaultChatModel();

    return Gemini::chat(model: $model)
      ->startChat(history: $history);
  }

  /**
   * Generate structured JSON output
   */
  public function generateStructuredOutput(string $prompt, array $schema, ?string $model = null): array
  {
    try {
      $model = $model ?? $this->config->getDefaultModel();

      // Implementasi schema untuk structured output
// Details to be added based on your specific schema requirements

      $result = Gemini::generativeModel(model: $model)
        ->withGenerationConfig(
          generationConfig: $this->createJsonGenerationConfig($schema)
        )
        ->generateContent($prompt);

      return $result->json();
    } catch (\Exception $e) {
      Log::error('Gemini structured output error: ' . $e->getMessage());
      throw new GeminiException('Failed to generate structured output: ' . $e->getMessage());
    }
  }

  /**
   * Create generation config for JSON output
   */
  private function createJsonGenerationConfig(array $schema): GenerationConfig
  {
    // Implementation details for your schema
// This is a placeholder
    return new GenerationConfig(/* details */);
  }
}