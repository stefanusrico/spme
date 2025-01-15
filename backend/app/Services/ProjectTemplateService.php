<?php

namespace App\Services;

use App\Models\TaskList;
use App\Models\Task;

class ProjectTemplateService
{
  private static function generateTaskId($projectId)
  {
    $lastTask = Task::where('projectId', $projectId)
      ->orderBy('created_at', 'desc')
      ->first();

    if (!$lastTask) {
      return 'TSK-001';
    }

    $lastId = $lastTask->taskId;
    $number = intval(substr($lastId, 4)) + 1;

    return 'TSK-' . str_pad($number, 3, '0', STR_PAD_LEFT);
  }

  public static function createDefaultStructure($projectId)
  {
    $taskLists = [
      [
        'name' => 'Kriteria A',
        'order' => 1,
        'tasks' => [
          [
            'name' => 'Butir 1',
            'order' => 1,
          ],
        ]
      ],
      [
        'name' => 'Kriteria B',
        'order' => 2,
        'tasks' => [
          [
            'name' => 'Butir 2',
            'order' => 1,
          ],
          [
            'name' => 'Butir 3',
            'order' => 2,
          ]
        ]
      ],
      [
        'name' => 'Kriteria C1',
        'order' => 3,
        'tasks' => [
          [
            'name' => 'Butir 3',
            'order' => 1,
          ],
          [
            'name' => 'Butir 4',
            'order' => 2,
          ],
          [
            'name' => 'Butir 5',
            'order' => 3,
          ],
          [
            'name' => 'Butir 6',
            'order' => 4,
          ]
        ]
      ],
      [
        'name' => 'Kriteria C2',
        'order' => 4,
        'tasks' => [
          [
            'name' => 'Butir 7',
            'order' => 1,
          ],
          [
            'name' => 'Butir 8',
            'order' => 2,
          ],
          [
            'name' => 'Butir 9',
            'order' => 3,
          ],
          [
            'name' => 'Butir 11',
            'order' => 4,
          ],
          [
            'name' => 'Butir 12',
            'order' => 5,
          ]
        ]
      ],
      [
        'name' => 'Kriteria C3',
        'order' => 5,
        'tasks' => [
          [
            'name' => 'Butir 13',
            'order' => 1,
          ],
          [
            'name' => 'Butir 15',
            'order' => 2,
          ],
          [
            'name' => 'Butir 16',
            'order' => 3,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C4',
        'order' => 6,
        'tasks' => [
          [
            'name' => 'Butir 32',
            'order' => 1,
          ],
          [
            'name' => 'Butir 33',
            'order' => 2,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C5',
        'order' => 7,
        'tasks' => [
          [
            'name' => 'Butir 38',
            'order' => 1,
          ],
          [
            'name' => 'Butir 39',
            'order' => 2,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C6',
        'order' => 8,
        'tasks' => [
          [
            'name' => 'Butir 40',
            'order' => 1,
          ],
          [
            'name' => 'Butir 41',
            'order' => 2,
          ],
          [
            'name' => 'Butir 42',
            'order' => 3,
          ],
          [
            'name' => 'Butir 43',
            'order' => 4,
          ],
          [
            'name' => 'Butir 45',
            'order' => 5,
          ],
          [
            'name' => 'Butir 46',
            'order' => 6,
          ],
          [
            'name' => 'Butir 48',
            'order' => 7,
          ],
          [
            'name' => 'Butir 51',
            'order' => 8,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C7',
        'order' => 9,
        'tasks' => [
          [
            'name' => 'Butir 53',
            'order' => 1,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C8',
        'order' => 10,
        'tasks' => [
          [
            'name' => 'Butir 55',
            'order' => 1,
          ],
        ]
      ],
      [
        'name' => 'Kriteria C9',
        'order' => 11,
        'tasks' => [
          [
            'name' => 'Butir 57',
            'order' => 1,
          ],
          [
            'name' => 'Butir 64',
            'order' => 2,
          ],
        ]
      ],
    ];

    foreach ($taskLists as $listData) {
      $taskList = TaskList::create([
        'projectId' => $projectId,
        'name' => $listData['name'],
        'order' => $listData['order']
      ]);

      foreach ($listData['tasks'] as $taskData) {
        Task::create([
          'taskId' => self::generateTaskId($projectId),
          'projectId' => $projectId,
          'taskListId' => $taskList->_id,
          'name' => $taskData['name'],
          'progress' => false,
          'status' => 'ACTIVE',
          'order' => $taskData['order']
        ]);
      }
    }
  }
}