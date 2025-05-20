<?php

namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;
use App\Actions\Gemini\AnalyzeImage;
use App\Actions\Gemini\GenerateText;
use App\Actions\Gemini\ManageChatSession;
use App\Data\Gemini\GenerationConfigData;
use App\Http\Requests\Gemini\AnalyzeImageRequest;
use App\Http\Requests\Gemini\GenerateTextRequest;
use Illuminate\Http\JsonResponse;

class GeminiController extends Controller
{
  public function generateText(GenerateTextRequest $request, GenerateText $action): JsonResponse
  {
    $config = new GenerationConfigData(
      model: $request->input('model'),
      temperature: $request->input('temperature'),
    );

    $result = $action->handle($request->input('prompt'), $config);

    return response()->json([
      'success' => true,
      'data' => [
        'text' => $result
      ]
    ]);
  }

  public function analyzeImage(AnalyzeImageRequest $request, AnalyzeImage $action): JsonResponse
  {
    $image = $request->file('image');

    $result = $action->handle(
      $request->input('prompt'),
      $image->getPathname(),
      $request->input('model')
    );

    return response()->json([
      'success' => true,
      'data' => [
        'analysis' => $result
      ]
    ]);
  }
}