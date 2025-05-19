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
        'kodeTabel',
        'taskId',
        'data',
        'nilai',
        'detailNilai',
    ];

    /**
     * Get the table this data belongs to
     */
    public function tabel()
    {
        return $this->belongsTo(LkpsTable::class, 'kodeTabel', 'kode');
    }

    /**
     * Get the tasks associated with this LKPS data
     */
    public function tasks()
    {
        return $this->hasMany(Task::class, 'lkpsDataId', '_id');
    }

    /**
     * Get the task for this specific LKPS data
     */
    public function task()
    {
        return $this->belongsTo(Task::class, 'taskId', '_id');
    }

    /**
     * Find task ID for a table in active project
     * 
     * @param string $kodeTabel Table code
     * @param string|null $prodiId Prodi ID (optional)
     * @return string|null Task ID if found
     */
    public static function findTaskIdForTable($kodeTabel, $prodiId = null)
    {
        try {
            // Find the table
            $table = LkpsTable::where('kode', $kodeTabel)->first();
            if (!$table) {
                Log::warning("LkpsTable not found with kode: {$kodeTabel}");
                return null;
            }

            // If prodiId is not provided, try to get it from the current user
            if (!$prodiId) {
                $user = auth()->user();
                if ($user && $user->prodiId) {
                    $prodiId = $user->prodiId;
                } else {
                    Log::warning("No prodiId provided and couldn't find from auth user");
                    return null;
                }
            }

            // Find active project for this prodi
            $project = Project::where('prodiId', $prodiId)
                ->where('status', 'ACTIVE')
                ->where('endDate', '>', now())
                ->first();

            if (!$project) {
                Log::warning("No active project found for prodiId: {$prodiId}");
                return null;
            }

            // Find LKPS task list in the project
            $taskList = TaskList::where('projectId', $project->_id)
                ->where('kriteria', 'LKPS')
                ->first();

            if (!$taskList) {
                Log::warning("No LKPS task list found in project: {$project->_id}");
                return null;
            }

            // Find the task for this table
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

    /**
     * Save data for a specific table
     * 
     * @param string $kodeTabel Table code
     * @param array $data The data to save
     * @param float|null $nilai Score
     * @param array $detailNilai Score details
     * @param string|null $taskId Task ID (optional)
     * @param string|null $prodiId Prodi ID (optional)
     * @return LkpsData
     */
    public static function saveData($kodeTabel, $data, $nilai = null, $detailNilai = [], $taskId = null, $prodiId = null)
    {
        $updateData = [
            'data' => $data,
            'nilai' => $nilai,
            'detailNilai' => $detailNilai
        ];

        // If taskId is not provided, try to find it from the active project
        if (!$taskId) {
            $taskId = self::findTaskIdForTable($kodeTabel, $prodiId);
        }

        if ($taskId) {
            $updateData['taskId'] = $taskId;
        }

        $lkpsData = self::updateOrCreate(
            [
                'kodeTabel' => $kodeTabel,
            ],
            $updateData
        );

        // If we have a taskId and the record has an _id, update the task with the lkpsDataId
        if ($taskId && $lkpsData->_id) {
            Task::where('_id', $taskId)->update(['lkpsDataId' => $lkpsData->_id]);
        }

        return $lkpsData;
    }

    /**
     * Get data for a specific table
     * 
     * @param string $kodeTabel Table code
     * @return array|null
     */
    public static function getData($kodeTabel)
    {
        $record = self::where('kodeTabel', $kodeTabel)->first();
        return $record ? $record->data : null;
    }

    /**
     * Get all data with table information
     * 
     * @return \Illuminate\Support\Collection
     */
    public static function getAllWithTableInfo()
    {
        $records = self::all();

        return $records->map(function ($record) {
            $tabel = LkpsTable::where('kode', $record->kodeTabel)->first();
            $record->tableTitle = $tabel ? $tabel->judul : null;
            return $record;
        });
    }

    /**
     * Check if this data has valid score
     * 
     * @return bool
     */
    public function hasValidScore()
    {
        return $this->nilai !== null && is_numeric($this->nilai);
    }
}