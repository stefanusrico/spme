import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import ReactDOM from "react-dom"
import { createRoot } from "react-dom/client"
import axiosInstance from "../../../utils/axiosConfig"
import { useParams } from "react-router-dom"
import $ from "jquery"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import "datatables.net-rowgroup-bs5"
import "datatables.net-rowgroup-bs5/css/rowGroup.bootstrap5.min.css"
import "../../../styles/TaskTable.css"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

const OwnerCell = ({ owner, projectMembers, task, onUpdate }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="flex w-full items-center gap-2 cursor-pointer hover:bg-gray-50 py-1">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={
                owner?.profile_picture
                  ? `http://localhost:8000/storage/${owner.profile_picture}`
                  : "/default-avatar.png"
              }
              alt={owner?.name || "Unassigned"}
            />
            <AvatarFallback>
              {owner?.name
                ? owner.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "UN"}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left">
            {owner?.name || "Unassigned"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {projectMembers.map((member) => (
          <DropdownMenuItem
            key={member.userId}
            onClick={() => onUpdate(task.id, { owner: member.userId })}
            className="cursor-pointer"
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
          fromDate={today} // Menambahkan batasan tanggal minimal
          initialFocus
          disabled={(date) => date < today} // Tambahan untuk memastikan tanggal sebelumnya tidak bisa dipilih
        />
      </PopoverContent>
    </Popover>
  )
}

const TaskTable = () => {
  const { projectId } = useParams()
  const mounted = useRef(false)
  const tableRef = useRef(null)
  const [taskLists, setTaskLists] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [statistics, setStatistics] = useState({
    totalTaskLists: 0,
    totalTasks: 0,
    completedTasks: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [tableInstance, setTableInstance] = useState(null)

  // Helper functions
  const getTaskStatus = useMemo(() => {
    return (task) => {
      switch (task.status) {
        case "ACTIVE":
          return "IN PROGRESS"
        case "COMPLETED":
          return "CLOSED"
        default:
          return task.status
      }
    }
  }, [])

  const getStatusStyle = useMemo(() => {
    return (status) => {
      const styles = {
        OPEN: "bg-green_badge text-green",
        "IN PROGRESS": "bg-orange_badge text-orange",
        CLOSED: "bg-red_badge text-red",
        DEFAULT: "bg-red-100 text-red-800",
      }
      return styles[status] || styles.DEFAULT
    }
  }, [])

  const fetchTaskLists = useCallback(async () => {
    if (!projectId || !mounted.current) return

    try {
      setIsLoading(true)
      const response = await axiosInstance.get(`/projects/${projectId}/lists`)

      if (mounted.current && response.data.status === "success") {
        const { taskLists, statistics } = response.data.data
        setTaskLists(taskLists)
        setStatistics(statistics)
      }
    } catch (error) {
      console.error("Error fetching task lists:", error)
    } finally {
      if (mounted.current) {
        setIsLoading(false)
      }
    }
  }, [projectId])

  const fetchProjectMembers = useCallback(async () => {
    if (!projectId || !mounted.current) return

    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      if (mounted.current && response.data.status === "success") {
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

  // DataTable initialization
  const initializeDataTable = useCallback(() => {
    if (!tableRef.current) return null

    // Destroy existing instance if any
    if ($.fn.DataTable.isDataTable(tableRef.current)) {
      $(tableRef.current).DataTable().destroy()
    }

    // Clear table contents
    $(tableRef.current).empty()

    // Add header
    $(tableRef.current).html(`
      <thead>
        <tr>
          <th>ID</th>
          <th>TASK NAME</th>
          <th>OWNER</th>
          <th>STATUS</th>
          <th>PROGRESS</th>
          <th>START DATE</th>
          <th>END DATE</th>
          <th>DURATION</th>
        </tr>
      </thead>
      <tbody></tbody>
    `)

    // Group tasks by taskList
    let groupedData = {}
    taskLists.forEach((list) => {
      const listName = list.name
      if (!groupedData[listName]) {
        groupedData[listName] = []
      }

      if (list.tasks && list.tasks.length > 0) {
        list.tasks.forEach((task) => {
          groupedData[listName].push({
            ...task,
            taskList: listName,
          })
        })
      } else {
        groupedData[listName].push({
          id: `empty-${list.id}`,
          taskId: `empty-${list.id}`,
          name: "",
          taskList: listName,
          isEmpty: true,
        })
      }
    })

    const processedData = Object.values(groupedData).flat()

    const table = $(tableRef.current).DataTable({
      data: processedData,
      columns: [
        {
          data: "taskId",
          title: "ID",
          render: (data, type, row) => (row.isEmpty ? "" : data),
        },
        {
          data: "name",
          title: "TASK NAME",
          render: (data, type, row) => (row.isEmpty ? "" : data),
        },
        {
          data: "owner",
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
                    owner={row.owner}
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
            const status = getTaskStatus({ status: data })
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
            return `
              <div class="flex items-center">
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${
                    data ? 100 : 0
                  }%"></div>
                </div>
                <span class="ml-2 text-sm text-gray-600">${
                  data ? "100" : "0"
                }%</span>
              </div>
            `
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
          title: "DURATION",
          render: (data, type, row) => (row.isEmpty ? "" : `${data} days`),
        },
      ],
      rowGroup: {
        dataSrc: "taskList",
        startRender: function (rows, group) {
          return `<div class="font-medium bg-gray-50 p-2">${group}</div>`
        },
      },
      order: [[0, "asc"]],
      paging: false,
      searching: true,
      responsive: true,
      dom: '<"top"f>rt<"clear">',
      ordering: false,
      info: false,
      language: {
        search: "Search tasks:",
      },
    })

    return table
  }, [
    taskLists,
    projectMembers,
    getTaskStatus,
    getStatusStyle,
    handleUpdateRow,
  ])

  useEffect(() => {
    mounted.current = true
    if (projectId) {
      fetchTaskLists()
      fetchProjectMembers()
    }
    return () => {
      mounted.current = false
      if (tableInstance) {
        tableInstance.destroy()
        // Cleanup React roots
        document.querySelectorAll('[id^="owner-cell-"]').forEach((element) => {
          const root = element._reactRootContainer
          if (root) {
            root.unmount()
          }
        })
      }
    }
  }, [projectId])

  useEffect(() => {
    if (taskLists.length > 0) {
      if (tableInstance) {
        tableInstance.destroy()
      }
      const newTable = initializeDataTable()
      setTableInstance(newTable)
    }
  }, [taskLists])

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto mt-32">
        <div className="ml-32 mt-2 w-full">
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
    <div className="w-full max-w-[1600px] mx-auto mt-32">
      <div className="ml-32 mt-2 w-full">
        {/* Statistics Cards */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {Object.entries(statistics).map(([key, value], index) => (
            <div
              key={`stat-${key}-${index}`}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="text-sm text-gray-500">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </div>
              <div className="text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {/* DataTable Container */}
        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="display table table-striped table-bordered dataTable no-footer w-full"
            >
              <thead>
                <tr>
                  <th>ID</th>
                  <th>TASK NAME</th>
                  <th>OWNER</th>
                  <th>STATUS</th>
                  <th>PROGRESS</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>DURATION</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskTable
