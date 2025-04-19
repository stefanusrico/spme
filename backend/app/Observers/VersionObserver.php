<?php

namespace App\Observers;

use App\Models\Task;
use App\Models\Version;
use Illuminate\Support\Facades\Log;

class VersionObserver
{
    public function saved(Version $version)
    {
        Log::debug('VersionObserver saved triggered', [
            'version_id' => $version->_id,
            'taskId' => $version->taskId,
        ]);

        // Debug: log struktur version
        Log::debug('Version structure:', [
            'has_details' => isset($version->details),
            'details_type' => isset($version->details) ? gettype($version->details) : 'undefined',
            'c' => $version->c ?? null,
            'prodiId' => $version->prodiId ?? null,
        ]);

        $taskId = $version->taskId;

        // Validasi taskId
        if (empty($taskId)) {
            Log::warning('Version tidak memiliki taskId yang valid');
            return;
        }

        // Pastikan versi ini adalah versi terbaru
        $latestVersion = Version::where('taskId', $taskId)
            ->orderByDesc('created_at')
            ->first();

        if (!$latestVersion || $version->_id !== $latestVersion->_id) {
            Log::debug('Skipping update as version is not the latest.');
            return;
        }

        // Inisialisasi penghitung
        $totalK = 0;
        $filledK = 0;

        // Ambil details dari version
        $details = $latestVersion->details;

        // Log details untuk debugging
        Log::debug('Raw details:', [
            'details_type' => gettype($details),
            'details_empty' => empty($details)
        ]);

        // Konversi details ke array jika perlu
        if (is_string($details)) {
            try {
                $details = json_decode($details, true);
                Log::debug('Converted details from JSON string to array');
            } catch (\Exception $e) {
                Log::error('Failed to parse details as JSON: ' . $e->getMessage());
                $details = [];
            }
        } elseif (is_object($details)) {
            $details = (array) $details;
            Log::debug('Converted details from object to array');
        } elseif (!is_array($details)) {
            Log::warning('Details is neither an array, object, nor a JSON string');
            $details = [];
        }

        // Validasi details
        if (empty($details)) {
            Log::warning('No valid details found in version');
            // Tetap lanjutkan untuk menghindari edge case
            $details = [];
        }

        // Log sample dari details untuk debugging
        if (!empty($details)) {
            $sample = array_slice($details, 0, 1);
            Log::debug('Sample detail item:', ['sample' => json_encode($sample)]);
        }

        // Hitung total K dan filled K
        foreach ($details as $detail) {
            // Pastikan detail adalah array atau object
            if (!is_array($detail) && !is_object($detail)) {
                continue;
            }

            // Convert to array if object
            if (is_object($detail)) {
                $detail = (array) $detail;
            }

            // Cek jika type adalah 'K', case-insensitive
            $type = null;
            if (isset($detail['type'])) {
                $type = $detail['type'];
            } elseif (isset($detail['Type'])) {
                $type = $detail['Type'];
            }

            if (strtoupper($type) === 'K') {
                $totalK++;

                // Ambil isian_asesi, dukungan berbagai format
                $isianAsesi = null;
                if (isset($detail['isian_asesi'])) {
                    $isianAsesi = $detail['isian_asesi'];
                } elseif (isset($detail['Isian Asesi'])) {
                    $isianAsesi = $detail['Isian Asesi'];
                } elseif (isset($detail['isian asesi'])) {
                    $isianAsesi = $detail['isian asesi'];
                }

                // Periksa apakah isian_asesi terisi
                if (!empty($isianAsesi)) {
                    // Cek apakah isian_asesi adalah JSON string dari rich text editor
                    if (is_string($isianAsesi) && (strpos($isianAsesi, 'blocks') !== false || strpos($isianAsesi, 'entityMap') !== false)) {
                        try {
                            $jsonData = json_decode($isianAsesi, true);
                            $hasContent = false;
                            if (isset($jsonData['blocks']) && is_array($jsonData['blocks'])) {
                                foreach ($jsonData['blocks'] as $block) {
                                    if (isset($block['text']) && trim($block['text']) !== '') {
                                        $hasContent = true;
                                        break;
                                    }
                                }
                            }

                            if ($hasContent) {
                                $filledK++;
                                Log::debug('Rich text isian_asesi has content', [
                                    'detail_ref' => $detail['reference'] ?? 'unknown',
                                    'seq' => $detail['seq'] ?? 'unknown'
                                ]);
                            }
                        } catch (\Exception $e) {
                            // Jika gagal parse sebagai JSON, anggap sebagai string biasa
                            if (trim($isianAsesi) !== '') {
                                $filledK++;
                                Log::debug('Failed to parse as JSON but has content');
                            }
                        }
                    } elseif (is_string($isianAsesi)) {
                        // String biasa, cek apakah tidak kosong
                        if (trim($isianAsesi) !== '') {
                            $filledK++;
                            Log::debug('Plain text isian_asesi has content', [
                                'detail_ref' => $detail['reference'] ?? 'unknown',
                                'seq' => $detail['seq'] ?? 'unknown'
                            ]);
                        }
                    } else {
                        // Bukan string (mungkin objek, array, dll.), anggap terisi
                        $filledK++;
                        Log::debug('Non-string isian_asesi, treated as filled');
                    }
                }
            }
        }

        Log::debug('Calculated totalK and filledK', [
            'totalK' => $totalK,
            'filledK' => $filledK,
        ]);

        // Jika tidak ada item type K, jangan lakukan update
        if ($totalK === 0) {
            Log::info('No items of type K found, skipping progress update');
            return;
        }

        // Ambil task dari database
        $task = Task::where('_id', $taskId)->first();

        if (!$task) {
            Log::warning('Task dengan ID ' . $taskId . ' tidak ditemukan');
            return;
        }

        // Hitung progress
        $progress = (int) (($filledK / $totalK) * 100);

        // Update task
        $task->update([
            'progress' => $progress,
            'status' => ($progress === 100) ? 'COMPLETED' : $task->status
        ]);

        Log::debug('Task updated', [
            'task_id' => $taskId,
            'progress' => $progress,
            'status' => $task->status,
        ]);
    }
}