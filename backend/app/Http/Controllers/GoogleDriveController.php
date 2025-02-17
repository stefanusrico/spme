<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Storage;

class GoogleDriveController extends Controller
{
    private function getDriveService()
    {
        $client = new Client();
        $client->setAuthConfig(storage_path('app/google-drive.json'));
        $client->addScope(Drive::DRIVE_FILE);
        return new Drive($client);
    }

    private function getOrCreateFolder($folderName, $parentFolderId, $service)
    {
        $query = sprintf(
            "name='%s' and '%s' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            $folderName,
            $parentFolderId
        );

        $folders = $service->files->listFiles(['q' => $query, 'fields' => 'files(id)'])->getFiles();
        return count($folders) > 0 ? $folders[0]->getId() : $this->createFolder($folderName, $parentFolderId, $service);
    }

    private function createFolder($folderName, $parentFolderId, $service)
    {
        $fileMetadata = new DriveFile([
            'name' => $folderName,
            'mimeType' => 'application/vnd.google-apps.folder',
            'parents' => [$parentFolderId],
        ]);

        return $service->files->create($fileMetadata, ['fields' => 'id'])->id;
    }

    public function uploadFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5000',
            'subFolder' => 'required|string',
            'noSub' => 'required|string',
        ]);

        $file = $request->file('file');
        $subFolderName = $request->input('subFolder');
        $noSub = $request->input('noSub');
        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        $service = $this->getDriveService();

        // Pastikan subfolder dan noSub folder tersedia
        $subFolderId = $this->getOrCreateFolder($subFolderName, $parentFolderId, $service);
        $noSubId = $this->getOrCreateFolder($noSub, $subFolderId, $service);

        // Upload file ke Google Drive
        $fileMetadata = new DriveFile([
            'name' => $file->getClientOriginalName(),
            'parents' => [$noSubId],
        ]);

        $uploadedFile = $service->files->create($fileMetadata, [
            'data' => file_get_contents($file->path()),
            'mimeType' => $file->getClientMimeType(),
            'uploadType' => 'multipart',
        ]);

        return response()->json([
            'message' => 'File berhasil diunggah ke Google Drive',
            'file_id' => $uploadedFile->id,
            'folder_id' => $noSubId,
        ]);
    }

    public function getFiles(Request $request)
    {
        $subFolder = $request->query('subFolder');
        $noSub = $request->query('noSub');
        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        if (!$subFolder || !$noSub) {
            return response()->json(['error' => 'Parameter subFolder dan noSub diperlukan'], 400);
        }

        $service = $this->getDriveService();

        // Ambil folder ID
        $subFolderId = $this->getOrCreateFolder($subFolder, $parentFolderId, $service);
        $noSubId = $this->getOrCreateFolder($noSub, $subFolderId, $service);

        // Query untuk mendapatkan file dalam folder
        $query = sprintf("'%s' in parents and trashed=false", $noSubId);
        $files = $service->files->listFiles(['q' => $query, 'fields' => 'files(id, name, webViewLink)'])->getFiles();

        if (empty($files)) {
            return response()->json(['message' => 'Tidak ada file dalam folder ini']);
        }

        $fileList = array_map(function ($file) {
            return [
                'id' => $file->getId(),
                'name' => $file->getName(),
                'url' => $file->getWebViewLink(),
            ];
        }, $files);

        return response()->json(['files' => $fileList]);
    }

    public function deleteFile(Request $request)
    {
        $request->validate([
            'fileId' => 'required|string',
            'subFolder' => 'required|string',
            'noSub' => 'required|string',
        ]);

        $fileId = $request->input('fileId');
        $subFolderName = $request->input('subFolder');
        $noSub = $request->input('noSub');
        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        $service = $this->getDriveService();

        // Ambil folder ID
        $subFolderId = $this->getOrCreateFolder($subFolderName, $parentFolderId, $service);
        $noSubId = $this->getOrCreateFolder($noSub, $subFolderId, $service);

        try {
            $service->files->delete($fileId);
            return response()->json(['message' => "File di folder '$subFolderName/$noSub' berhasil dihapus"]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Gagal menghapus file', 'details' => $e->getMessage()], 500);
        }
    }
}
