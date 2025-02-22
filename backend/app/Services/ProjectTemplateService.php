<?php

namespace App\Services;
use App\Http\Controllers\TaskListController;
use App\Http\Controllers\TaskController;

class ProjectTemplateService
{
  protected $taskListController;
  protected $taskController;

  public function __construct()
  {
    $this->taskListController = new TaskListController();
    $this->taskController = new TaskController();
  }

  public static function createDefaultStructure($projectId)
  {
    $service = new self();

    $taskLists = $service->createTaskLists($projectId);

    $service->createTasks($projectId);

    return $taskLists;
  }

  private function createTaskLists($projectId)
  {
    try {
      $allData = [];
      $sheets = config('google.sheets.spreadsheets.sheets');

      foreach ($sheets as $key => $gid) {
        $jsonPath = storage_path("app/public/led_{$key}.json");
        if (file_exists($jsonPath)) {
          $ledData = json_decode(file_get_contents($jsonPath), true);
          $allData = array_merge($allData, $ledData);
        }
      }

      $uniqueTasklists = collect($allData)
        ->unique('c')
        ->values()
        ->sortBy('c');

      $order = 1;
      $createdTaskLists = [];

      foreach ($uniqueTasklists as $data) {
        $taskList = \App\Models\TaskList::create([
          'projectId' => $projectId,
          'c' => $data['c'],
          'order' => $order++
        ]);

        $createdTaskLists[] = $taskList;
      }

      return $createdTaskLists;

    } catch (\Exception $e) {
      throw new \Exception("Error creating task lists: " . $e->getMessage());
    }
  }

  private function generateTaskId($projectId)
  {
    $lastTask = \App\Models\Task::where('projectId', $projectId)
      ->orderBy('created_at', 'desc')
      ->first();

    if (!$lastTask) {
      return 'TSK-001';
    }

    $lastId = $lastTask->taskId;
    $number = intval(substr($lastId, 4)) + 1;

    return 'TSK-' . str_pad($number, 3, '0', STR_PAD_LEFT);
  }

  private function createTasks($projectId)
  {
    try {
      $allData = [];
      $sheets = config('google.sheets.spreadsheets.sheets');

      foreach ($sheets as $key => $gid) {
        $jsonPath = storage_path("app/public/led_{$key}.json");
        if (file_exists($jsonPath)) {
          $ledData = json_decode(file_get_contents($jsonPath), true);
          $allData = array_merge($allData, $ledData);
        }
      }

      $groupedData = collect($allData)->groupBy('c');

      foreach ($groupedData as $c => $tasks) {
        $taskList = \App\Models\TaskList::where('projectId', $projectId)
          ->where('c', $c)
          ->first();

        if ($taskList) {
          $order = 1;
          $uniqueTasks = $tasks->unique(function ($item) {
            return $item['no'] . $item['sub'];
          });

          foreach ($uniqueTasks as $taskData) {
            \App\Models\Task::create([
              'taskId' => $this->generateTaskId($projectId),
              'projectId' => $projectId,
              'taskListId' => $taskList->_id,
              'no' => $taskData['no'],
              'sub' => $taskData['sub'],
              'progress' => false,
              'status' => 'UNASSIGNED',
              'order' => $order++
            ]);
          }
        }
      }

    } catch (\Exception $e) {
      throw new \Exception("Error creating tasks: " . $e->getMessage());
    }
  }
}