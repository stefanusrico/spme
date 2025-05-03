<?php

namespace App\Observers;

use App\Models\Project\Task;
use App\Models\Led\Version;
use Illuminate\Support\Facades\Log;

class VersionObserver
{
    public function saved(Version $version)
    {
        Log::info('==================== VERSION OBSERVER STARTED ====================');
        Log::info('VersionObserver saved event triggered', [
            'version_id' => $version->_id ?? 'no-id',
            'taskId' => $version->taskId ?? 'no-task-id',
            'created_at' => $version->created_at ?? 'no-timestamp',
        ]);

        // Log version attributes
        Log::info('Version attributes:', [
            'c' => $version->c ?? 'not-set',
            'prodiId' => $version->prodiId ?? 'not-set',
            'commit' => $version->commit ?? 'not-set',
            'user_id' => $version->user_id ?? 'not-set',
            'details_exists' => isset($version->details),
            'details_type' => isset($version->details) ? gettype($version->details) : 'undefined',
        ]);

        // Validasi taskId
        if (empty($version->taskId)) {
            Log::warning('🚨 ERROR: Version tidak memiliki taskId yang valid - Keluar dari observer');
            return;
        }

        // Pastikan versi ini adalah versi terbaru
        Log::info('Memeriksa apakah versi ini adalah yang terbaru untuk task: ' . $version->taskId);
        $latestVersion = Version::where('taskId', $version->taskId)
            ->orderByDesc('created_at')
            ->first();

        if (!$latestVersion) {
            Log::warning('🚨 ERROR: Tidak dapat menemukan versi terbaru untuk task: ' . $version->taskId);
            return;
        }

        if ($version->_id !== $latestVersion->_id) {
            Log::info('⚠️ Version bukan yang terbaru, melewati proses update', [
                'current_version_id' => $version->_id,
                'latest_version_id' => $latestVersion->_id,
            ]);
            return;
        }

        Log::info('✅ Version confirmed as latest for task, proceeding to calculate progress');

        // Proses untuk menghitung progress
        $this->calculateAndUpdateProgress($latestVersion);

        Log::info('==================== VERSION OBSERVER COMPLETED ====================');
    }

    /**
     * Menghitung dan memperbarui progress task berdasarkan isian dalam versi
     * 
     * @param Version $version
     * @return void
     */
    protected function calculateAndUpdateProgress(Version $version)
    {
        Log::info('🔄 Starting progress calculation for task: ' . $version->taskId);

        // Inisialisasi penghitung
        $totalK = 0;
        $filledK = 0;

        // Ambil details dari version
        Log::info('Mendapatkan dan menormalisasi details');
        $details = $this->getNormalizedDetails($version);

        Log::info('Details setelah normalisasi', [
            'count' => count($details),
            'is_array' => is_array($details),
        ]);

        // Log semua detail items untuk debugging
        Log::debug('🔍 Full normalized details structure:', [
            'details' => json_encode($details)
        ]);

        // Hitung total K dan filled K
        Log::info('Mulai menghitung elemen tipe K dan yang sudah terisi');

        foreach ($details as $index => $detail) {
            $type = $detail['type'] ?? null;

            Log::debug('Memeriksa detail #' . $index, [
                'reference' => $detail['reference'] ?? 'undefined',
                'seq' => $detail['seq'] ?? 'undefined',
                'type' => $type ?? 'undefined',
                'has_isian_asesi' => isset($detail['isian_asesi']),
                'isian_asesi_type' => isset($detail['isian_asesi']) ? gettype($detail['isian_asesi']) : 'undefined',
            ]);

            // Skip jika bukan item kompetensi (K)
            if (!isset($type) || strtoupper($type) !== 'K') {
                Log::debug('Detail #' . $index . ' bukan tipe K, dilewati');
                continue;
            }

            $totalK++;
            Log::debug('Item tipe K ditemukan, totalK = ' . $totalK);

            // Periksa apakah isian_asesi terisi
            $isianAsesi = $detail['isian_asesi'] ?? null;
            $isFilled = $this->isFilledContent($isianAsesi);

            if ($isFilled) {
                $filledK++;
                Log::debug('✅ Item terisi, filledK = ' . $filledK, [
                    'detail_ref' => $detail['reference'] ?? 'unknown',
                    'seq' => $detail['seq'] ?? 'unknown',
                    'isian_asesi_preview' => is_string($isianAsesi) ?
                        (strlen($isianAsesi) > 50 ? substr($isianAsesi, 0, 50) . '...' : $isianAsesi) :
                        gettype($isianAsesi)
                ]);
            } else {
                Log::debug('❌ Item belum terisi', [
                    'detail_ref' => $detail['reference'] ?? 'unknown',
                    'seq' => $detail['seq'] ?? 'unknown',
                ]);
            }
        }

        Log::info('📊 Hasil perhitungan kompetensi', [
            'totalK' => $totalK,
            'filledK' => $filledK,
        ]);

        // Jika tidak ada item type K, jangan lakukan update
        if ($totalK === 0) {
            Log::warning('⚠️ Tidak ada item tipe K ditemukan, melewati update progress');
            return;
        }

        // Ambil task dari database
        Log::info('Mencari task dengan ID: ' . $version->taskId);
        $task = Task::where('_id', $version->taskId)->first();

        if (!$task) {
            Log::warning('🚨 ERROR: Task dengan ID ' . $version->taskId . ' tidak ditemukan');
            return;
        }

        Log::info('Task ditemukan', [
            'task_id' => $task->_id,
            'current_progress' => $task->progress ?? 0,
            'current_status' => $task->status ?? 'unknown',
        ]);

        // Hitung progress
        $progress = (int) (($filledK / $totalK) * 100);
        $newStatus = ($progress === 100) ? 'COMPLETED' : $task->status;

        Log::info('💯 Progress baru dihitung: ' . $progress . '%');

        // Update task
        Log::info('Memperbarui task dengan progress baru');
        $task->update([
            'progress' => $progress,
            'status' => $newStatus
        ]);

        Log::info('✅ Task berhasil diperbarui', [
            'task_id' => $version->taskId,
            'new_progress' => $progress,
            'old_status' => $task->status,
            'new_status' => $newStatus,
        ]);
    }

    /**
     * Normalize details to ensure consistent array format
     * 
     * @param Version $version
     * @return array
     */
    protected function getNormalizedDetails(Version $version)
    {
        Log::info('🔍 Normalizing details');
        $details = $version->details;

        // Log details untuk debugging
        Log::debug('Raw details:', [
            'details_type' => gettype($details),
            'details_empty' => empty($details),
            'details_sample' => is_string($details) ?
                (strlen($details) > 100 ? substr($details, 0, 100) . '...' : $details) :
                'not a string'
        ]);

        // Konversi details ke array jika diperlukan
        if (is_string($details)) {
            Log::debug('Details is a string, attempting to decode as JSON');
            try {
                $details = json_decode($details, true);
                Log::info('✅ Successfully converted details from JSON string to array');
            } catch (\Exception $e) {
                Log::error('🚨 Failed to parse details as JSON: ' . $e->getMessage());
                return [];
            }
        } elseif (is_object($details)) {
            Log::debug('Details is an object, converting to array');
            $details = (array) $details;
            Log::info('✅ Successfully converted details from object to array');
        }

        // Jika details adalah array tetapi tidak nested sesuai ekspektasi
        if (is_array($details) && !empty($details) && !is_array(reset($details)) && !is_object(reset($details))) {
            Log::debug('Details appears to be a single item, not an array of items - wrapping in array');
            return [$details]; // Wrap dalam array agar konsisten
        }

        $result = is_array($details) ? $details : [];
        Log::debug('Normalized details result', [
            'is_array' => is_array($result),
            'count' => count($result)
        ]);

        return $result;
    }

    /**
     * Check if content is considered filled
     * 
     * @param mixed $content
     * @return bool
     */
    protected function isFilledContent($content)
    {
        // Return false jika content null atau empty string
        if ($content === null || $content === '') {
            Log::debug('Content is null or empty');
            return false;
        }

        // Handle rich text content (JSON string dari editor)
        if (
            is_string($content) &&
            (strpos($content, 'blocks') !== false || strpos($content, 'entityMap') !== false)
        ) {
            Log::debug('Detected rich text content, checking for actual content in blocks');

            try {
                $jsonData = json_decode($content, true);
                if (isset($jsonData['blocks']) && is_array($jsonData['blocks'])) {
                    foreach ($jsonData['blocks'] as $blockIndex => $block) {
                        if (isset($block['text']) && trim($block['text']) !== '') {
                            Log::debug('Found non-empty text in block #' . $blockIndex);
                            return true;
                        }
                    }
                }
                Log::debug('Rich text content has no actual text');
                return false;
            } catch (\Exception $e) {
                Log::debug('Failed to parse as JSON, falling back to string check: ' . $e->getMessage());
                return trim($content) !== '';
            }
        }

        // For string content
        if (is_string($content)) {
            $result = trim($content) !== '';
            Log::debug('String content check: ' . ($result ? 'filled' : 'empty'));
            return $result;
        }

        // For non-string content (arrays, objects, etc.)
        Log::debug('Non-string content detected, treating as filled');
        return true;
    }
}