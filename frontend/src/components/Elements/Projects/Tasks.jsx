// Tasks.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { ChevronDown } from "lucide-react"
import { createRoot } from "react-dom/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import TaskTable from "./TaskTable"
import axiosInstance from "../../../utils/axiosConfig"

const OwnerCell = ({ owners, projectMembers, task, onUpdate }) => {
  console.log("OwnerCell rendered with:", { owners, projectMembers, task })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="flex w-full items-center gap-2 cursor-pointer hover:bg-gray-50 py-1">
          {owners && owners.length > 0 ? (
            <div className="flex -space-x-2">
              {owners.slice(0, 2).map((owner) => (
                <Avatar
                  key={owner.id}
                  className="h-6 w-6 border-2 border-white"
                >
                  <AvatarImage
                    src={
                      owner?.profile_picture
                        ? `http://localhost:8000/storage/${owner.profile_picture}`
                        : "/default-avatar.png"
                    }
                    alt={owner?.name}
                  />
                  <AvatarFallback>
                    {owner?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {owners.length > 2 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                  +{owners.length - 2}
                </div>
              )}
            </div>
          ) : (
            <Avatar className="h-6 w-6">
              <AvatarImage src="/default-avatar.png" alt="Unassigned" />
              <AvatarFallback>UN</AvatarFallback>
            </Avatar>
          )}
          <span className="flex-1 text-left">
            {owners && owners.length > 0
              ? owners.map((owner) => owner.name).join(", ")
              : "Unassigned"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {projectMembers.map((member) => (
          <DropdownMenuItem
            key={member.userId}
            onClick={() => {
              const currentOwners = owners?.map((o) => o.id) || []
              const newOwners = currentOwners.includes(member.userId)
                ? currentOwners.filter((id) => id !== member.userId)
                : [...currentOwners, member.userId]
              console.log("Updating owners:", { currentOwners, newOwners })
              onUpdate(task.id, { owners: newOwners })
            }}
            className={cn(
              "cursor-pointer",
              owners?.some((o) => o.id === member.userId) && "bg-gray-100"
            )}
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage
                src={
                  member.profile_picture
                    ? `http://localhost:8000/storage/${member.profile_picture}`
                    : "/default-avatar.png"
                }
                alt={member.name}
              />
              <AvatarFallback>
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span>{member.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DateCell = ({ date, onUpdate, taskId, field }) => {
  const [open, setOpen] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-left font-normal"
        >
          {format(new Date(date), "PPP")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={new Date(date)}
          onSelect={(newDate) => {
            if (!newDate) return
            const adjustedDate = new Date(newDate)
            adjustedDate.setHours(12, 0, 0, 0)
            onUpdate(taskId, { [field]: adjustedDate.toISOString() })
            setOpen(false)
          }}
          fromDate={today}
          initialFocus
          disabled={(date) => date < today}
        />
      </PopoverContent>
    </Popover>
  )
}

const Tasks = ({ projectId }) => {
  const [taskLists, setTaskLists] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const getTaskStatus = useCallback((status) => {
    switch (status) {
      case "ACTIVE":
        return "IN PROGRESS"
      case "COMPLETED":
        return "CLOSED"
      default:
        return status
    }
  }, [])

  const getStatusStyle = useCallback((status) => {
    const styles = {
      OPEN: "bg-green_badge text-green",
      "IN PROGRESS": "bg-orange_badge text-orange",
      CLOSED: "bg-red_badge text-red",
      DEFAULT: "bg-red-100 text-red-800",
    }
    return styles[status] || styles.DEFAULT
  }, [])

  const fetchTaskLists = useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      const response = await axiosInstance.get(`/projects/${projectId}/lists`)
      if (response.data.status === "success") {
        setTaskLists(response.data.data.taskLists)
      }
    } catch (error) {
      console.error("Error fetching task lists:", error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const fetchProjectMembers = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      console.log("Project members response:", response.data)
      if (response.data.status === "success") {
        setProjectMembers(response.data.data.members)
      }
    } catch (error) {
      console.error("Error fetching project members:", error)
    }
  }, [projectId])

  const handleUpdateRow = async (taskId, updates) => {
    try {
      const response = await axiosInstance.patch(
        `/projects/${projectId}/tasks/${taskId}/assign`,
        updates
      )

      if (response.data.status === "success") {
        await fetchTaskLists()
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchTaskLists()
      fetchProjectMembers()
    }
  }, [projectId, fetchTaskLists, fetchProjectMembers])

  useEffect(() => {
    console.log("Project members updated:", projectMembers)
  }, [projectMembers])

  const tableData = useMemo(() => {
    const data = []
    taskLists.forEach((list) => {
      if (list.tasks && list.tasks.length > 0) {
        list.tasks.forEach((task) => {
          data.push({
            ...task,
            taskList: list.name,
            formattedStartDate: format(new Date(task.startDate), "PP"),
            formattedEndDate: format(new Date(task.endDate), "PP"),
          })
        })
      } else {
        data.push({
          id: `empty-${list.id}`,
          taskList: list.name,
          isEmpty: true,
        })
      }
    })
    return data
  }, [taskLists])

  const columns = useMemo(
    () => [
      {
        data: "taskId",
        title: "TASK ID",
        render: (data, type, row) => (row.isEmpty ? "" : data),
      },
      {
        data: "name",
        title: "TASK NAME",
        render: (data, type, row) => (row.isEmpty ? "" : data),
      },
      {
        data: "owners",
        title: "OWNER",
        className: "min-w-[200px]",
        render: (data, type, row) => {
          if (row.isEmpty) return ""
          const containerId = `owner-cell-${row.id}`
          setTimeout(() => {
            const container = document.getElementById(containerId)
            if (container && !container.hasAttribute("data-initialized")) {
              const root = createRoot(container)
              root.render(
                <OwnerCell
                  owners={row.owners}
                  projectMembers={projectMembers}
                  task={row}
                  onUpdate={handleUpdateRow}
                />
              )
              container.setAttribute("data-initialized", "true")
            }
          }, 0)
          return `<div id="${containerId}"></div>`
        },
      },
      {
        data: "status",
        title: "STATUS",
        render: (data, type, row) => {
          if (row.isEmpty) return ""
          const status = getTaskStatus(data)
          return `<span class="px-2 py-1 rounded text-sm font-semibold ${getStatusStyle(
            status
          )}">${status}</span>`
        },
      },
      {
        data: "progress",
        title: "PROGRESS",
        render: (data, type, row) => {
          if (row.isEmpty) return ""
          return `<div class="flex items-center">
         <div class="w-full bg-gray-200 rounded-full h-2.5">
           <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${
             data ? 100 : 0
           }%"></div>
         </div>
         <span class="ml-2 text-sm text-gray-600">${data ? "100" : "0"}%</span>
       </div>`
        },
      },
      {
        data: "startDate",
        title: "START DATE",
        render: (data, type, row) => {
          if (row.isEmpty) return ""
          const containerId = `start-date-cell-${row.id}`
          setTimeout(() => {
            const container = document.getElementById(containerId)
            if (container && !container.hasAttribute("data-initialized")) {
              const root = createRoot(container)
              root.render(
                <DateCell
                  date={data}
                  taskId={row.id}
                  field="startDate"
                  onUpdate={handleUpdateRow}
                />
              )
              container.setAttribute("data-initialized", "true")
            }
          }, 0)
          return `<div id="${containerId}"></div>`
        },
      },
      {
        data: "endDate",
        title: "END DATE",
        render: (data, type, row) => {
          if (row.isEmpty) return ""
          const containerId = `end-date-cell-${row.id}`
          setTimeout(() => {
            const container = document.getElementById(containerId)
            if (container && !container.hasAttribute("data-initialized")) {
              const root = createRoot(container)
              root.render(
                <DateCell
                  date={data}
                  taskId={row.id}
                  field="endDate"
                  onUpdate={handleUpdateRow}
                />
              )
              container.setAttribute("data-initialized", "true")
            }
          }, 0)
          return `<div id="${containerId}"></div>`
        },
      },
      {
        data: "duration",
        render: (data, type, row) => (row.isEmpty ? "" : `${data} days`),
      },
    ],
    [projectMembers, getTaskStatus, getStatusStyle, handleUpdateRow]
  )

  const rowGroup = {
    dataSrc: "taskList",
    startRender: (rows, group) =>
      `<div class="font-medium bg-gray-50 p-2">${group}</div>`,
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="mt-2 w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="min-h-[200px] flex items-center justify-center">
              Loading tasks...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div className="mt-2 w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="overflow-x-auto">
            <TaskTable
              key={`table-${projectId}`}
              data={tableData}
              columns={columns}
              rowGroup={rowGroup}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks
