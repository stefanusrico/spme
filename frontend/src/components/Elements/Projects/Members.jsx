import { useEffect, useRef, useState, useCallback } from "react"
import $ from "jquery"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import axiosInstance from "../../../utils/axiosConfig"
import { useParams } from "react-router-dom"
import AddMemberModal from "../Modals/AddMember"

const Members = () => {
  const { projectId } = useParams()
  const tableRef = useRef(null)
  const dataTableRef = useRef(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const initializeDataTable = useCallback(() => {
    if (!tableRef.current || !members.length) return

    if (dataTableRef.current) {
      dataTableRef.current.destroy()
    }

    dataTableRef.current = $(tableRef.current).DataTable({
      data: members,
      columns: [
        {
          data: "name",
          title: "Name",
        },
        {
          data: "email",
          title: "Email",
        },
        {
          data: "role",
          title: "Role",
        },
        {
          data: "joinedAt",
          title: "Joined At",
          render: (data) => new Date(data).toLocaleDateString(),
        },
      ],
      searching: false,
      ordering: false,
      paging: false,
      lengthChange: false,
      info: false,
    })
  }, [members])

  const fetchMembers = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      if (response.data.status === "success") {
        setMembers(response.data.data.members)
      } else {
        setError(response.data.message || "Failed to load project members")
      }
    } catch (err) {
      console.error("Error fetching members:", err.response || err)
      setError(err.response?.data?.message || "Failed to load project members")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (memberData) => {
    try {
      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )

      if (response.data.status === "success") {
        setShowModal(false)
        await fetchMembers()
      }
    } catch (err) {
      console.error("Error adding member:", err)
      setError(err.response?.data?.message || "Failed to add member")
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchMembers()
    }
    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy()
      }
    }
  }, [projectId])

  useEffect(() => {
    if (members.length > 0 && tableRef.current) {
      initializeDataTable()
    }
  }, [members, initializeDataTable])

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="mt-2 w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="min-h-[200px] flex items-center justify-center">
              Loading members...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div className="mt-2 w-full">
        <div className="flex justify-end mb-4">
          <button
            className="bg-base hover:bg-base text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
            onClick={() => setShowModal(true)}
          >
            Add member
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No members found in this project.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                ref={tableRef}
                className="display table table-striped table-bordered dataTable no-footer w-full"
              >
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined At</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          )}
        </div>

        <AddMemberModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAdd={handleAddMember}
        />
      </div>
    </div>
  )
}

export default Members
