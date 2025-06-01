<?php
namespace App\Actions\Gemini;

use App\Data\Gemini\GenerationConfigData;
use App\Services\Gemini\GeminiService;

class GenerateText
{
  public function __construct(
    protected GeminiService $geminiService
  ) {
  }

  public function handle(string $prompt, ?GenerationConfigData $config = null): string
  {
    return $this->geminiService->generateText($prompt, $config);
  }
}