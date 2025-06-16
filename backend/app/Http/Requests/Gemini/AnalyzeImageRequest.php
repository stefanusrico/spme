<?php
namespace App\Http\Requests\Gemini;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeImageRequest extends FormRequest
{
  public function rules(): array
  {
    return [
      'prompt' => 'required|string|max:1000',
      'image' => 'required|image|max:10240',
      'model' => 'nullable|string',
    ];
  }
}