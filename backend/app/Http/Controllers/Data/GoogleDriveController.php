<?php

namespace App\Http\Controllers\Data;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Exception;
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

            // Upload juga ke storage lokal
            $localUrl = $this->uploadToLocalStorage($file, $subFolderName, $noSub, $noKriteria);

            // Simpan informasi file yang diunggah
            $uploadedFiles[] = [
                'file_id' => $fileDetails->id,
                'file_name' => $fileDetails->name,
                'file_url' => $fileDetails->webViewLink,
                'local_url' => $localUrl,
                // 'folder_id' => $noKriteriaId,
            ];
        }

        return response()->json([
            'message' => 'File berhasil diunggah ke Google Drive',
            'files' => $uploadedFiles,
        ]);
    }

    public function uploadFileSupporting(Request $request)
    {
        $request->validate([
            'file.*' => 'required|file',
            'folder' => 'required|string'
        ]);

        $files = $request->file('file');
        $subFolderName = $request->input('folder');

        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        $service = $this->getDriveService();

        // Pastikan subfolder dan noSub folder tersedia
        $folderId = $this->getOrCreateFolder($subFolderName, $parentFolderId, $service);

        $uploadedFiles = [];

        foreach ($files as $index => $file) {
             // Upload juga ke storage lokal
            $noSub = "";
            $noKriteria = "";
            $localUrl = $this->uploadToLocalStorage($file, $subFolderName, $noSub, $noKriteria);

            $fileMetadata = new DriveFile([
                'name' => $file->getClientOriginalName(),
                'parents' => [$folderId],
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
                'local_url' => $localUrl,
            ];
        }

        return response()->json([
            'message' => 'File berhasil diunggah ke Google Drive',
            'files' => $uploadedFiles,
        ]);
    }

    private function uploadToLocalStorage($file, $subFolderName, $noSub, $noKriteria)
    {
        try {
            // Buat nama file unik
            

            // Buat path penyimpanan
            if ($subFolderName && $noSub && $noKriteria){
                $fileName = time() . '-' . $file->getClientOriginalName();
                $path = "uploads/{$subFolderName}/{$noSub}/{$noKriteria}";
            }else{
                $fileName = $file->getClientOriginalName();
                $path = "uploads/{$subFolderName}/";
            }

            // Simpan file ke storage publik
            $storedPath = $file->storeAs($path, $fileName, 'public');

            if (!$storedPath) {
                throw new \Exception("Gagal menyimpan file ke storage lokal.");
            }

            // Return full URL
            return asset('storage/' . $storedPath);
        } catch (\Exception $e) {
            // Log error untuk debugging
            \Log::error('Upload ke local storage gagal: ' . $e->getMessage());

            // Lempar kembali error untuk ditangani oleh pemanggil
            throw new \Exception("Upload ke local storage gagal: " . $e->getMessage());
        }
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

    public function getSupportingFiles(Request $request)
    {
        $folderName = $request->query('folder') ?? 'file Pendukung';

        if (!$folderName) {
            \Log::warning('getSupportingFiles: Parameter folder tidak diberikan');
            return response()->json(['error' => 'Parameter folder diperlukan'], 400);
        }

        \Log::info("getSupportingFiles: Memulai pencarian file untuk folder: {$folderName}");

        try {
            $service = $this->getDriveService();
            $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

            $folderId = $this->getOrCreateFolder($folderName, $parentFolderId, $service);
            \Log::info("getSupportingFiles: Folder ID ditemukan/terbuat: {$folderId}");

            $query = sprintf("'%s' in parents and trashed=false and name != 'Folder Sampah'", $folderId);
            $files = $service->files->listFiles(['q' => $query, 'fields' => 'files(id, name, webViewLink)'])->getFiles();

            if (empty($files)) {
                \Log::info("getSupportingFiles: Tidak ada file ditemukan di folder {$folderName}");
                return response()->json(['message' => 'Tidak ada file dalam folder ini']);
            }

            $fileList = array_map(function ($file) use ($folderName) {
                $localPath = "uploads/{$folderName}/" . $file->getName();
                $localUrl = asset('storage/' . $localPath);

                return [
                    'id' => $file->getId(),
                    'name' => $file->getName(),
                    'url' => $file->getWebViewLink(),
                    'local_url' => $localUrl,
                ];
            }, $files);

            \Log::info("getSupportingFiles: Jumlah file ditemukan: " . count($fileList));

            return response()->json(['files' => $fileList]);
        } catch (\Exception $e) {
            \Log::error('getSupportingFiles: Gagal mengambil file', [
                'folder' => $folderName,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Gagal mengambil file', 'details' => $e->getMessage()], 500);
        }
    }


    public function deleteSupportingFile(Request $request, $fileId)
    {
        $request->validate([
            'localUrl' => 'nullable|string',
        ]);

        $folderName = $request->query('folder') ?? 'file Pendukung';
        $localUrl = $request->input('localUrl');

        $service = $this->getDriveService();
        $parentFolderId = env('GOOGLE_DRIVE_FOLDER_ID');

        $folderId = $this->getOrCreateFolder($folderName, $parentFolderId, $service);
        $trashId = $this->getOrCreateFolder("Folder Sampah", $folderId, $service);

        try {
            // Pindahkan ke folder sampah di Google Drive
            $file = $service->files->get($fileId, ['fields' => 'parents']);
            $previousParents = join(',', $file->getParents());

            $service->files->update($fileId, new DriveFile(), [
                'addParents' => $trashId,
                'removeParents' => $previousParents,
                'fields' => 'id, parents'
            ]);

            // Hapus file dari local storage
            if ($localUrl) {
                $relativePath = str_replace(asset('storage/') . '/', '', $localUrl);
                if (Storage::disk('public')->exists($relativePath)) {
                    Storage::disk('public')->delete($relativePath);
                }
            }

            return response()->json(['message' => "File berhasil dihapus dari Google Drive dan local storage"]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal menghapus file', 'details' => $e->getMessage()], 500);
        }
    }

    public function download(Request $request)
    {
        $filename = $request->input('filename');

        // Validasi tambahan bisa ditambahkan di sini
        $path = storage_path("app/public/uploads/file Pendukung/{$filename}");

        if (!file_exists($path)) {
            return response()->json([
                'message' => "File tidak ditemukan di path: {$path}"
            ], 404);
        }

        return response()->download($path);
    }
}