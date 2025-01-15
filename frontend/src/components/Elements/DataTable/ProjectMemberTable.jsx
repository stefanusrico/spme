import { useEffect, useRef, useState } from "react"
import { DataTable } from "simple-datatables"
import "simple-datatables/dist/style.css"
import axiosInstance from "../../../utils/axiosConfig"
import { useParams } from "react-router-dom"
import AddMemberModal from "../Modals/AddMember"

const ProjectMemberTable = () => {
  const { projectId } = useParams()
  const tableRef = useRef(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axiosInstance.get(
          `/projects/${projectId}/members`
        )

        if (response.data.status === "success") {
          setMembers(response.data.data.members)
        } else {
          setError(response.data.message || "Failed to load project members")
        }
      } catch (err) {
        console.error("Error fetching members:", err.response || err)
        const errorMessage =
          err.response?.data?.message || "Failed to load project members"
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchMembers()
    } else {
      setError("Project ID is required")
      setLoading(false)
    }
  }, [projectId])

  const handleAddMember = async (memberData) => {
    try {
      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )

      if (response.data.status === "success") {
        const membersResponse = await axiosInstance.get(
          `/projects/${projectId}/members`
        )
        setMembers(membersResponse.data.data.members)
      }
    } catch (err) {
      console.error("Error adding member:", err)
      setError(err.response?.data?.message || "Failed to add member")
    }
  }

  useEffect(() => {
    let dataTable
    if (tableRef.current && members.length > 0) {
      if (dataTable) {
        dataTable.destroy()
      }

      dataTable = new DataTable(tableRef.current, {
        data: {
          headings: ["Name", "Email", "Role", "Joined At"],
          data: members.map((member) => [
            member.name,
            member.email,
            member.role,
            new Date(member.joinedAt).toLocaleDateString(),
          ]),
        },
        searchable: false,
        perPageSelect: false,
        sortable: false,
        perPage: 5,
      })
    }

    return () => {
      if (dataTable) {
        dataTable.destroy()
      }
    }
  }, [members])

  if (loading)
    return (
      <div className="w-full max-w-[1600px] mx-auto mt-32">
        <div className="ml-32 mt-2 w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-center">
                Loading projects...
              </div>
            </div>
          </div>
        </div>
      </div>
    )

  return (
    <div className="w-full max-w-[1600px] mx-auto mt-32">
      <div className="ml-32 mt-2 w-full">
        <h1 className="text-2xl font-bold mb-6">Project Members</h1>
        <div className="flex justify-end">
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
              <div className="max-h-[600px] overflow-y-auto">
                <table
                  id="default-table"
                  ref={tableRef}
                  className="w-full relative"
                >
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="bg-gray-50 shadow-sm">
                      <th className="text-normal font-semibold p-4 text-left">
                        Name
                      </th>
                      <th className="text-normal font-semibold p-4 text-left">
                        Email
                      </th>
                      <th className="text-normal font-semibold p-4 text-left">
                        Role
                      </th>
                      <th className="text-normal font-semibold p-4 text-left">
                        Joined At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.userId} className="border-b">
                        <td className="p-4">{member.name}</td>
                        <td className="p-4">{member.email}</td>
                        <td className="p-4">{member.role}</td>
                        <td className="p-4">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

export default ProjectMemberTable
