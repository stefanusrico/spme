<?php
namespace App\Data\Gemini;

class ChatSessionData
{
  public function __construct(
    public readonly array $history = [],
    public readonly ?string $model = null,
  ) {
  }
}