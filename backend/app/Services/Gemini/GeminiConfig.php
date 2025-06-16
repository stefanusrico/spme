<?php
namespace App\Services\Gemini;

class GeminiConfig
{
  public function getDefaultModel(): string
  {
    return config('gemini.default_model', 'gemini-2.0-flash');
  }

  public function getDefaultVisionModel(): string
  {
    return config('gemini.default_vision_model', 'gemini-2.0-flash');
  }

  public function getDefaultChatModel(): string
  {
    return config('gemini.default_chat_model', 'gemini-2.0-flash');
  }

  public function getDefaultTemperature(): float
  {
    return (float) config('gemini.default_temperature', 0.7);
  }
}