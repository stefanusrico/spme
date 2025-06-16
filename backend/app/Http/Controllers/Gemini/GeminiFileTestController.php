<?php
namespace App\Http\Controllers\Gemini;

use App\Http\Controllers\Controller;

use Gemini\Data\Blob;
use Gemini\Enums\MimeType;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;

class GeminiFileTestController extends Controller
{
  public function testImageAnalysis(Request $request)
  {
    $request->validate([
      'image' => 'required|image|max:5120',
      'prompt' => 'required|string',
    ]);

    try {
      // Dapatkan file gambar dari request
      $image = $request->file('image');
      $imageData = file_get_contents($image->getPathname());

      // Tentukan MIME type berdasarkan tipe file
      $mimeType = match ($image->getClientOriginalExtension()) {
        'jpg', 'jpeg' => MimeType::IMAGE_JPEG,
        'png' => MimeType::IMAGE_PNG,
        'webp' => MimeType::IMAGE_WEBP,
        default => MimeType::IMAGE_JPEG,
      };

      // Generate analisis menggunakan Gemini API
      $result = Gemini::generativeModel(model: 'gemini-2.0-flash')
        ->generateContent([
          $request->input('prompt'),
          new Blob(
            mimeType: $mimeType,
            data: base64_encode($imageData)
          )
        ]);

      return response()->json([
        'success' => true,
        'analysis' => $result->text(),
        'image_info' => [
          'name' => $image->getClientOriginalName(),
          'size' => $image->getSize(),
          'mime' => $image->getMimeType(),
        ]
      ]);
    } catch (\Exception $e) {
      return response()->json([
        'success' => false,
        'error' => $e->getMessage(),
      ], 500);
    }
  }
}