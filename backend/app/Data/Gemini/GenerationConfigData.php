<?php

namespace App\Data\Gemini;
class GenerationConfigData
{
  public function __construct(
    public readonly ?string
    $model = null,
    public readonly ?float $temperature = null,
    public readonly ?int $maxOutputTokens = null,
    public readonly
    ?float $topP = null,
    public readonly ?int $topK = null,
  ) {
  }
}