import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { ChevronDown, Lock } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useProjectDetails } from "../../../hooks/useProjectDetails"

const LoadingBar = () => (
  <div className="relative mt-2 h-1 bg-gray overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ columnLength }) => {
  const skeletonData = [1, 2, 3]

  return (
    <>
      {skeletonData.map((_, index) => (
        <tr key={index} className="animate-pulse">
          {Array.from({ length: columnLength }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-2">
              <div className="h-8 bg-gray rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

const OwnerCell = ({ owners, projectMembers, task, onUpdate, canEdit }) => {
  if (!projectMembers || projectMembers.length === 0) {
    return (
      <div className="flex w-full items-center gap-2 py-1">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/default-avatar.png" alt="Loading..." />
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
        <span>Loading members...</span>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="flex w-full items-center gap-3 py-1">
        {owners && owners.length > 0 ? (
          <div className="flex -space-x-3">
            {owners.slice(0, 3).map((owner) => (
              <Avatar key={owner.id} className="h-8 w-8 border-2 border-white">
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
            {owners.length > 3 && (
              <div className="h-8 w-8 flex items-center justify-center text-xs">
                +{owners.length - 3}
              </div>
            )}
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarImage src="/default-avatar.png" alt="Unassigned" />
            <AvatarFallback>UN</AvatarFallback>
          </Avatar>
        )}
        <span className="flex-1 text-left text-sm">
          {owners && owners.length > 0
            ? owners.map((owner) => owner.name).join(", ")
            : "Unassigned"}
        </span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="flex w-full items-center gap-3 cursor-pointer rounded-full hover:bg-gray py-1">
          {owners && owners.length > 0 ? (
            <div className="flex -space-x-3">
              {owners.slice(0, 3).map((owner) => (
                <Avatar
                  key={owner.id}
                  className="h-8 w-8 border-2 border-white"
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
              {owners.length > 3 && (
                <div className="h-8 w-8 flex items-center justify-center text-xs">
                  +{owners.length - 3}
                </div>
              )}
            </div>
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarImage src="/default-avatar.png" alt="Unassigned" />
              <AvatarFallback>UN</AvatarFallback>
            </Avatar>
          )}
          <span className="flex-1 text-left text-sm">
            {owners && owners.length > 0
              ? owners.map((owner) => owner.name).join(", ")
              : "Unassigned"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {projectMembers.map((member) => (
          <DropdownMenuItem
            key={member.userId}
            onClick={() => {
              const currentOwners = owners?.map((o) => o.id) || []
              const newOwners = currentOwners.includes(member.userId)
                ? currentOwners.filter((id) => id !== member.userId)
                : [...currentOwners, member.userId]
              onUpdate(task.id, { owners: newOwners })
            }}
            className={cn(
              "cursor-pointer flex items-center gap-2 px-2 py-1",
              owners?.some((o) => o.id === member.userId) && "bg-gray"
            )}
          >
            <Avatar className="h-8 w-8">
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
            <span className="text-sm">{member.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DateCell = ({ date, onUpdate, taskId, field, canEdit }) => {
  const [open, setOpen] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!canEdit) {
    return <div className="text-center">{format(new Date(date), "PPP")}</div>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-center text-center font-normal"
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

const Tasks = ({ projectId, userRole }) => {
  const {
    taskLists,
    projectMembers,
    isLoadingTasks,
    isLoadingMembers,
    updateTask,
  } = useProjectDetails(projectId)

  console.log("Current userRole:", userRole)

  const navigate = useNavigate()
  const columnHelper = createColumnHelper()

  const canEdit = useMemo(() => {
    console.log(`Checking canEdit with userRole: ${userRole}`)

    if (!userRole) {
      console.log("userRole is undefined/null")
      return false
    }

    const role = userRole.toLowerCase()
    const hasEditPermission = role === "owner" || role === "admin"

    console.log(
      `Role lowercase: ${role}, hasEditPermission: ${hasEditPermission}`
    )

    return hasEditPermission
  }, [userRole])

  const getTaskStatus = useCallback((status) => {
    switch (status) {
      case "ACTIVE":
        return "IN PROGRESS"
      default:
        return status
    }
  }, [])

  const getStatusStyle = useCallback((status) => {
    const styles = {
      "IN PROGRESS": "bg-orange_badge text-orange",
      COMPLETED: "bg-green_badge text-green",
      DEFAULT: "bg-red_badge text-red",
    }
    return styles[status] || styles.DEFAULT
  }, [])

  const handleUpdateRow = async (taskId, updates) => {
    if (!canEdit) {
      console.warn("User does not have permission to update tasks")
      return
    }

    try {
      await updateTask(taskId, updates)
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => {
          if (row.isGroupHeader) return row.criteria
          return row.taskId
        },
        {
          id: "taskId",
          header: "TASK ID",
          size: 100,
          cell: ({ row, getValue }) => {
            if (row.original.isGroupHeader) {
              return getValue()
            }
            return getValue()
          },
        }
      ),
      columnHelper.accessor("name", {
        header: "TASK NAME",
        size: 200,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          return getValue()
        },
      }),
      columnHelper.accessor("owners", {
        header: () => (
          <div className="text-center flex items-center justify-center gap-1">
            OWNER {!canEdit && <Lock size={14} className="text-gray-400" />}
          </div>
        ),
        size: 200,
        cell: ({ row }) => {
          if (row.original.isGroupHeader) return null
          return (
            <OwnerCell
              owners={row.original.owners}
              projectMembers={projectMembers}
              task={row.original}
              onUpdate={handleUpdateRow}
              canEdit={canEdit}
            />
          )
        },
      }),
      columnHelper.accessor("status", {
        header: () => <div className="text-center">STATUS</div>,
        size: 120,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          const status = getTaskStatus(getValue())
          return (
            <div className="flex justify-center">
              <span
                className={`text-sm text-center font-semibold rounded-lg px-2 py-1 ${getStatusStyle(
                  status
                )}`}
              >
                {status}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor("progress", {
        header: () => <div className="text-center">PROGRESS</div>,
        size: 150,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          return (
            <div className="flex items-center justify-center text-center">
              <div className="w-full max-w-[100px] bg-gray rounded-full h-2.5">
                <div
                  className="bg-blue h-2.5 rounded-full"
                  style={{ width: `${getValue() || 0}%` }}
                />
              </div>
              <span className="ml-2 text-sm text-centertext-gray-600">
                {getValue() || 0}%
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor("startDate", {
        header: () => (
          <div className="text-center flex items-center justify-center gap-1">
            START DATE{" "}
            {!canEdit && <Lock size={14} className="text-gray-400" />}
          </div>
        ),
        size: 150,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          return (
            <div className="flex justify-center items-center">
              <DateCell
                date={getValue()}
                taskId={row.original.id}
                field="startDate"
                onUpdate={handleUpdateRow}
                canEdit={canEdit}
              />
            </div>
          )
        },
      }),
      columnHelper.accessor("endDate", {
        header: () => (
          <div className="text-center flex items-center justify-center gap-1">
            END DATE {!canEdit && <Lock size={14} className="text-gray-400" />}
          </div>
        ),
        size: 150,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          return (
            <div className="flex justify-center items-center">
              <DateCell
                date={getValue()}
                taskId={row.original.id}
                field="endDate"
                onUpdate={handleUpdateRow}
                canEdit={canEdit}
              />
            </div>
          )
        },
      }),
      columnHelper.accessor("duration", {
        header: () => <div className="text-center">DURATION</div>,
        size: 100,
        cell: ({ row, getValue }) => {
          if (row.original.isGroupHeader) return null
          return (
            <div className="mx-auto w-full flex justify-center">
              {getValue()} days
            </div>
          )
        },
      }),
      columnHelper.accessor("actions", {
        header: () => <div className="text-center">ACTIONS</div>,
        size: 100,
        cell: ({ row }) => {
          if (row.original.isGroupHeader) return null
          const isLkpsTask =
            row.original.name && row.original.name.startsWith("Tabel")

          let link
          if (isLkpsTask) {
            const sectionCodeMatch = row.original.name.match(/Tabel\s+(\S+)/)
            const sectionCode = sectionCodeMatch ? sectionCodeMatch[1] : ""
            link = `/lkps/${sectionCode}`
          } else {
            // Task biasa (Butir)
            link = `/pengisian-matriks-led/${row.original.no}/${row.original.sub}`
          }

          return (
            <div className="flex justify-center">
              <button
                onClick={() => navigate(link)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue rounded hover:bg-blue-700 rounded-lg"
              >
                View Task
              </button>
            </div>
          )
        },
      }),
    ],
    [
      projectMembers,
      getTaskStatus,
      getStatusStyle,
      navigate,
      canEdit,
      handleUpdateRow,
    ]
  )

  const table = useReactTable({
    data: taskLists || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const isLoading = isLoadingTasks || isLoadingMembers

  return (
    <div className="w-full mx-auto">
      <div className="mt-2 w-full">
        {!canEdit && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <Lock size={16} className="text-amber-500" />
            <span className="text-amber-700">
              You are in view-only mode. Only project owners and admins can
              modify tasks.
            </span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`px-6 py-3 text-left text-normal font-bold text-black uppercase tracking-wider bg-gray ${
                          index === 0 ? "rounded-l-lg" : ""
                        } ${
                          index === headerGroup.headers.length - 1
                            ? "rounded-r-lg"
                            : ""
                        }`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              {isLoading && (
                <thead>
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <LoadingBar />
                    </td>
                  </tr>
                </thead>
              )}
              <tbody>
                {isLoading ? (
                  <LoadingRow columnLength={columns.length} />
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        row.original.isGroupHeader
                          ? "bg-gray font-semibold"
                          : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        if (row.original.isGroupHeader) {
                          if (cell.column.id === "taskId") {
                            return (
                              <td
                                key={cell.id}
                                colSpan={columns.length}
                                className="font-bold text-black bg-gray px-4 py-2 text-left rounded-lg"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            )
                          }
                          return null
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`px-4 py-2 ${
                              [
                                "status",
                                "progress",
                                "startDate",
                                "endDate",
                                "duration",
                                "owners",
                              ].includes(cell.column.id)
                                ? "text-center"
                                : ""
                            }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks
