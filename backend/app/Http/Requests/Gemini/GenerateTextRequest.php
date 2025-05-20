<?php
namespace App\Http\Requests\Gemini;

use Illuminate\Foundation\Http\FormRequest;

class GenerateTextRequest extends FormRequest
{
  public function rules(): array
  {
    return [
      'prompt' => 'required|string|max:10000',
      'temperature' => 'nullable|numeric|min:0|max:1',
      'model' => 'nullable|string',
    ];
  }
}