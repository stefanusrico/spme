<?php

namespace App\Models\Lkps;

use App\Models\Project\Task;
use App\Models\Project\Project;
use App\Models\Project\TaskList;
use App\Models\Prodi\Prodi;
use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class LkpsData extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'lkps_data';

    protected $fillable = [
        'lkpsTableId',
        'taskId',
        'data',
        'nilai',
        'detailNilai',
    ];

    public function tabel()
    {
        return $this->belongsTo(LkpsTable::class, 'lkpsTableId', '_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'lkpsDataId', '_id');
    }

    public function task()
    {
        return $this->belongsTo(Task::class, 'taskId', '_id');
    }

    public static function findTaskIdForTable($kodeTabel, $prodiId = null)
    {
        try {
            $table = LkpsTable::where('kode', $kodeTabel)->first();
            if (!$table) {
                Log::warning("LkpsTable not found with kode: {$kodeTabel}");
                return null;
            }

            if (!$prodiId) {
                $user = auth()->user();
                if ($user && $user->prodiId) {
                    $prodiId = $user->prodiId;
                } else {
                    Log::warning("No prodiId provided and couldn't find from auth user");
                    return null;
                }
            }

            $project = Project::where('prodiId', $prodiId)
                ->where('status', 'ACTIVE')
                ->where('endDate', '>', now())
                ->first();

            if (!$project) {
                Log::warning("No active project found for prodiId: {$prodiId}");
                return null;
            }

            $taskList = TaskList::where('projectId', $project->_id)
                ->where('kriteria', 'LKPS')
                ->first();

            if (!$taskList) {
                Log::warning("No LKPS task list found in project: {$project->_id}");
                return null;
            }

            $task = Task::where('taskListId', $taskList->_id)
                ->where('lkpsTableId', $table->_id)
                ->first();

            if (!$task) {
                Log::warning("No task found for table {$kodeTabel} in project {$project->_id}");
                return null;
            }

            return $task->_id;

        } catch (\Exception $e) {
            Log::error("Error finding taskId for table: {$e->getMessage()}");
            return null;
        }
    }

    public static function saveData($tableCode, $data, $nilai = null, $detailNilai = [], $taskId = null)
    {
        try {
            $divStrata = \App\Models\Prodi\Strata::where('name', 'D-IV')->first();
            if (!$divStrata) {
                throw new \Exception('D-IV strata not found');
            }

            $table = LkpsTable::where('kode', $tableCode)
                ->where('strataId', $divStrata->_id)
                ->first();

            if (!$table) {
                throw new \Exception("Table {$tableCode} not found for D-IV strata");
            }

            $tableIdString = (string) $table->_id;
            $taskIdString = (string) $taskId;

            \Log::info("Saving LkpsData for table {$tableCode} (D-IV) with tableId: {$tableIdString} and taskId: {$taskIdString}");

            if ($taskId) {
                $task = \App\Models\Project\Task::find($taskId);
                if ($task && $task->lkpsTableId) {
                    $taskTableId = $task->lkpsTableId;
                    \Log::info("Task {$taskIdString} has lkpsTableId: {$taskTableId}, our table _id: {$tableIdString}");

                    if ($taskTableId !== $tableIdString) {
                        \Log::warning("Mismatch: Task lkpsTableId ({$taskTableId}) != Table _id ({$tableIdString})");
                        $lkpsTableIdToUse = $taskTableId;
                    } else {
                        $lkpsTableIdToUse = $tableIdString;
                    }
                } else {
                    $lkpsTableIdToUse = $tableIdString;
                }
            } else {
                $lkpsTableIdToUse = $tableIdString;
            }

            \Log::info("Using lkpsTableId: {$lkpsTableIdToUse} for save operation");

            $existingData = null;
            if ($taskId) {
                $existingData = self::where('lkpsTableId', $lkpsTableIdToUse)
                    ->where('taskId', $taskIdString)
                    ->first();
            } else {
                $existingData = self::where('lkpsTableId', $lkpsTableIdToUse)
                    ->whereNull('taskId')
                    ->first();
            }

            if ($existingData) {
                \Log::info("Updating existing LkpsData record: {$existingData->_id}");

                $existingData->data = $data;
                if ($nilai !== null) {
                    $existingData->nilai = $nilai;
                }
                if (!empty($detailNilai)) {
                    $existingData->detailNilai = $detailNilai;
                }
                $existingData->save();

                return $existingData;
            } else {
                \Log::info("Creating new LkpsData record");

                $lkpsData = new self();
                $lkpsData->lkpsTableId = $lkpsTableIdToUse;
                $lkpsData->data = $data;
                $lkpsData->nilai = $nilai;
                $lkpsData->detailNilai = $detailNilai;

                if ($taskId) {
                    $lkpsData->taskId = $taskIdString;
                }

                $lkpsData->save();

                return $lkpsData;
            }
        } catch (\Exception $e) {
            \Log::error("Error in LkpsData::saveData: " . $e->getMessage());
            throw $e;
        }
    }

    public static function getData($kodeTabel)
    {
        $table = LkpsTable::where('kode', $kodeTabel)->first();
        if (!$table) {
            return null;
        }

        $record = self::where('lkpsTableId', $table->_id)->first();
        return $record ? $record->data : null;
    }

    public static function getAllWithTableInfo()
    {
        $records = self::all();

        return $records->map(function ($record) {
            $tabel = $record->tabel;
            $record->tableTitle = $tabel ? $tabel->judul : null;
            return $record;
        });
    }

    public function hasValidScore()
    {
        return $this->nilai !== null && is_numeric($this->nilai);
    }
}