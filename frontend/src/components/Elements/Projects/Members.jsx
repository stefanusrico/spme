import { useState, useMemo } from "react"
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
import { useProjectDetails } from "../../../hooks/useProjectDetails"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

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

const Members = ({ projectId, userRole, onMembersUpdate }) => {
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [showRoleDrawer, setShowRoleDrawer] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [error, setError] = useState(null)
  const { userData } = useUser()

  const {
    projectMembers,
    availableRoles,
    isLoadingMembers,
    addMember,
    updateMemberRole,
    removeMember,
    refetchMembers,
  } = useProjectDetails(projectId)

  const isLoading = isLoadingMembers

  const canManageMembers =
    userRole?.toLowerCase() === "owner" || userRole?.toLowerCase() === "admin"

  const canManageAdmins = userRole === "owner"

  const handleAddMember = async (memberData) => {
    try {
      setError(null)
      const response = await addMember(memberData)
      setShowAddDrawer(false)
      if (onMembersUpdate) onMembersUpdate()
      toast.success(response.message || "Member added successfully")
    } catch (err) {
      console.error("Error adding member:", err)
      setError(err.message || "Failed to add member")
      toast.error(
        err.response?.data?.message || err.message || "Failed to add member"
      )
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setError(null)
      await updateMemberRole(userId, newRole)
      setShowRoleDrawer(false)
      setSelectedMember(null)
      if (onMembersUpdate) onMembersUpdate()
    } catch (err) {
      console.error("Error updating role:", err)
      setError(err.message || "Failed to update role")
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) {
      return
    }

    try {
      setError(null)
      await removeMember(userId)
      if (onMembersUpdate) onMembersUpdate()
    } catch (err) {
      console.error("Error removing member:", err)
      setError(err.message || "Failed to remove member")
    }
  }

  const isCurrentUser = (userId) => {
    return userId === userData?._id
  }

  const columnHelper = createColumnHelper()

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "NAME",
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
        header: "EMAIL",
        size: 200,
      }),
      columnHelper.accessor("role", {
        header: "ROLE",
        size: 150,
        cell: ({ row }) => (
          <span className="px-1 py-1 rounded-full">{row.original.role}</span>
        ),
      }),
      columnHelper.accessor("joinedAt", {
        header: "JOINED AT",
        size: 150,
        cell: ({ getValue }) => format(new Date(getValue()), "PPP"),
      }),
      ...(canManageMembers
        ? [
            columnHelper.accessor("actions", {
              header: "ACTIONS",
              size: 150,
              cell: ({ row }) => {
                const member = row.original
                return (
                  <div className="flex gap-4 items-center justify-left">
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
                              className="text-gray-600 hover:text-base transition-colors"
                              title="Change Role"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="orange"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                          )}

                        {/* Cannot remove self, owner can remove admin, admin cannot remove admin */}
                        {(member.role !== "admin" || canManageAdmins) &&
                          !isCurrentUser(member.userId) && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-gray-600 hover:text-red-500 transition-colors"
                              title="Remove Member"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="red"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
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
    data: projectMembers || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="w-full mx-auto">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
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
          availableRoles={availableRoles || []}
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
          availableRoles={availableRoles || []}
          canManageAdmins={canManageAdmins}
          onUpdateRole={handleUpdateRole}
          loading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}

export default Members
