import { useState, useEffect, useMemo } from "react"
import axiosInstance from "../../../utils/axiosConfig"
import { useUser } from "../../../context/userContext"
import AddMemberModal from "../Modals/AddMemberModal"
import RoleSelectModal from "../Modals/RoleSelectModal"
import { format } from "date-fns"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"

const LoadingBar = () => (
  <div className="relative mt-2 h-1 bg-gray overflow-hidden">
    <div className="absolute top-0 h-1 bg-blue loading-bar"></div>
  </div>
)

const LoadingRow = ({ columnLength }) => {
  const skeletonData = [
    {
      userId: "USR-001",
      name: "Loading user...",
      email: "loading@example.com",
      role: "user",
      joinedAt: new Date(),
      profile_picture: null,
    },
    {
      userId: "USR-002",
      name: "Please wait...",
      email: "wait@example.com",
      role: "user",
      joinedAt: new Date(),
      profile_picture: null,
    },
    {
      userId: "USR-003",
      name: "Fetching data...",
      email: "fetching@example.com",
      role: "user",
      joinedAt: new Date(),
      profile_picture: null,
    },
  ]

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

const Members = ({ projectId, userRole, members = [], onMembersUpdate }) => {
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [showRoleDrawer, setShowRoleDrawer] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [availableRoles, setAvailableRoles] = useState([])
  const { userData } = useUser()

  const canManageMembers =
    userRole?.toLowerCase() === "owner" || userRole?.toLowerCase() === "admin"

  const canManageAdmins = userRole === "owner"

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get("/projects/available-roles")
        if (response.data.status === "success") {
          setAvailableRoles(response.data.data.roles)
        }
      } catch (error) {
        console.error("Error fetching roles:", error)
        setAvailableRoles([
          {
            id: "admin",
            name: "Admin",
            description: "Can manage project members and tasks",
          },
          {
            id: "user",
            name: "User",
            description: "Can work on assigned tasks",
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  const handleAddMember = async (memberData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )

      if (response.data.status === "success") {
        setShowAddDrawer(false)
        if (onMembersUpdate) onMembersUpdate()
      }
    } catch (err) {
      console.error("Error adding member:", err)
      setError(err.response?.data?.message || "Failed to add member")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setLoading(true)
      setError(null)

      const response = await axiosInstance.put(
        `/projects/${projectId}/member-role`,
        {
          userId,
          role: newRole,
        }
      )

      if (response.data.status === "success") {
        setShowRoleDrawer(false)
        setSelectedMember(null)
        if (onMembersUpdate) onMembersUpdate()
      }
    } catch (err) {
      console.error("Error updating role:", err)
      setError(err.response?.data?.message || "Failed to update role")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await axiosInstance.post(`/removemember/${projectId}`, {
        userId,
      })

      if (response.data.status === "success") {
        if (onMembersUpdate) onMembersUpdate()
      }
    } catch (err) {
      console.error("Error removing member:", err)
      setError(err.response?.data?.message || "Failed to remove member")
    } finally {
      setLoading(false)
    }
  }

  const isCurrentUser = (userId) => {
    return userId === userData?._id
  }

  const columnHelper = createColumnHelper()

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        size: 200,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {row.original.profile_picture ? (
                <img
                  src={`http://localhost:8000/storage/${row.original.profile_picture}`}
                  alt={row.original.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{row.original.name.charAt(0)}</span>
              )}
            </div>
            <span>{row.original.name}</span>
            {isCurrentUser(row.original.userId) && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        size: 200,
      }),
      columnHelper.accessor("role", {
        header: "Role",
        size: 150,
        cell: ({ row }) => (
          <span className="px-1 py-1 rounded-full">{row.original.role}</span>
        ),
      }),
      columnHelper.accessor("joinedAt", {
        header: "Joined At",
        size: 150,
        cell: ({ getValue }) => format(new Date(getValue()), "PPP"),
      }),
      ...(canManageMembers
        ? [
            columnHelper.accessor("actions", {
              header: "Actions",
              size: 150,
              cell: ({ row }) => {
                const member = row.original
                return (
                  <div className="flex gap-2">
                    {/* Cannot edit owner role */}
                    {member.role !== "owner" && (
                      <>
                        {/* Only owner can edit admin role */}
                        {(member.role !== "admin" || canManageAdmins) &&
                          !isCurrentUser(member.userId) && (
                            <button
                              onClick={() => {
                                setSelectedMember(member)
                                setShowRoleDrawer(true)
                              }}
                              className="px-2 py-1 text-sm bg-base text-white rounded-sm"
                            >
                              Change Role
                            </button>
                          )}

                        {/* Cannot remove self, owner can remove admin, admin cannot remove admin */}
                        {(member.role !== "admin" || canManageAdmins) &&
                          !isCurrentUser(member.userId) && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-700"
                            >
                              Remove
                            </button>
                          )}
                      </>
                    )}
                  </div>
                )
              },
            }),
          ]
        : []),
    ],
    [canManageMembers, canManageAdmins, userData?._id]
  )

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="w-full mx-auto">
      <div className="mt-4 w-full">
        {canManageMembers && (
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Project Members</h2>
            <button
              className="bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
              onClick={() => setShowAddDrawer(true)}
            >
              Add member
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 w-full mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`px-4 py-2 text-left bg-gray ${
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
              {loading && (
                <thead>
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <LoadingBar />
                    </td>
                  </tr>
                </thead>
              )}
              <tbody>
                {loading ? (
                  <LoadingRow columnLength={columns.length} />
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Member Drawer */}
        <AddMemberModal
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          onAdd={handleAddMember}
          availableRoles={availableRoles}
          canAddAdmin={canManageAdmins}
        />

        {/* Role Select Drawer */}
        <RoleSelectModal
          isOpen={showRoleDrawer}
          onClose={() => {
            setShowRoleDrawer(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          availableRoles={availableRoles}
          canManageAdmins={canManageAdmins}
          onUpdateRole={handleUpdateRole}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}

export default Members
