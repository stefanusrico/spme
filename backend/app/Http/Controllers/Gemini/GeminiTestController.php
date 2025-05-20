<?php
namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;

class GeminiTestController extends Controller
{
  public function testPrompt()
  {
    try {
      // Test basic text generation
      $textResult = Gemini::generativeModel(model: 'gemini-2.0-flash')
        ->generateContent('Berikan resep nasi goreng dalam 3 langkah sederhana.');

      // Test with different parameters
      $creativeResult = Gemini::generativeModel(model: 'gemini-2.0-flash')
        ->generateContent('Ceritakan dongeng pendek tentang kancil');

      // Test chat functionality
      $chat = Gemini::chat(model: 'gemini-2.0-flash')->startChat();
      $chatResult = $chat->sendMessage('Siapa kamu?');

      return response()->json([
        'success' => true,
        'basic_result' => $textResult->text(),
        'creative_result' => $creativeResult->text(),
        'chat_result' => $chatResult->text(),
      ]);
    } catch (\Exception $e) {
      return response()->json([
        'success' => false,
        'error' => $e->getMessage(),
      ], 500);
    }
  }
}