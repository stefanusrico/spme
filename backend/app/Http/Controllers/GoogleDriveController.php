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
            'file.*' => 'required|file',
            'subFolder' => 'required|string',
            'noSub' => 'required|string',
            'noKriteria' => 'required|array',
            'noKriteria.*' => 'required|string',
        ]);

        $files = $request->file('file');
        $subFolderName = $request->input('subFolder');
        $noSub = $request->input('noSub');
        $noKriteriaList = $request->input('noKriteria'); 

        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        $service = $this->getDriveService();

        // Pastikan subfolder dan noSub folder tersedia
        $subFolderId = $this->getOrCreateFolder($subFolderName, $parentFolderId, $service);
        $noSubId = $this->getOrCreateFolder($noSub, $subFolderId, $service);

        $uploadedFiles = [];

        foreach ($files as $index => $file) { 
            $noKriteria = $noKriteriaList[$index] ?? null;
            if (!$noKriteria) {
                continue; 
            }
    
            $noKriteriaId = $this->getOrCreateFolder($noKriteria, $noSubId, $service);
    
            $fileMetadata = new DriveFile([
                'name' => $file->getClientOriginalName(),
                'parents' => [$noKriteriaId],
            ]);
    
            $uploadedFile = $service->files->create($fileMetadata, [
                'data' => file_get_contents($file->path()),
                'mimeType' => $file->getClientMimeType(),
                'uploadType' => 'multipart',
                'fields' => 'id, name',
            ]);

            $fileDetails = $service->files->get($uploadedFile->id, [
                'fields' => 'id, name, webViewLink'
            ]);
    
            // Simpan informasi file yang diunggah
            $uploadedFiles[] = [
                'file_id' => $fileDetails->id,
                'file_name' => $fileDetails->name,
                'file_url' => $fileDetails->webViewLink, 
                // 'folder_id' => $noKriteriaId,
            ];
        }
    
        return response()->json([
            'message' => 'File berhasil diunggah ke Google Drive',
            'files' => $uploadedFiles,
        ]);
    }

    public function getFiles(Request $request)
    {
        $subFolder = $request->query('subFolder');
        $noSub = $request->query('noSub');
        $noKriteria = $request->input('noKriteria'); 

        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        if (!$subFolder || !$noSub || !$noKriteria) {
            return response()->json(['error' => 'Parameter subFolder, noSub, dan noKriteria diperlukan'], 400);
        }

        $service = $this->getDriveService();

        // Ambil folder ID
        $subFolderId = $this->getOrCreateFolder($subFolder, $parentFolderId, $service);
        $noSubId = $this->getOrCreateFolder($noSub, $subFolderId, $service);
        $noKriteriaId = $this->getOrCreateFolder($noKriteria, $noSubId, $service);

        // Query untuk mendapatkan file dalam folder
        $query = sprintf("'%s' in parents and trashed=false and name != 'Folder Sampah'", $noKriteriaId);
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
        $trashId = $this->getOrCreateFolder("Folder Sampah", $noSubId, $service);

        try {
            $file = $service->files->get($fileId, ['fields' => 'parents']);
            $previousParents = join(',', $file->getParents());

            // Pindahkan file ke Folder Sampah
            $service->files->update($fileId, new DriveFile(), [
                'addParents' => $trashId,
                'removeParents' => $previousParents,
                'fields' => 'id, parents'
            ]);

            return response()->json(['message' => "File di folder '$subFolderName/$noSub' berhasil dipindahkan ke folder sampah"]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Gagal menghapus file', 'details' => $e->getMessage()], 500);
        }
    }
}
