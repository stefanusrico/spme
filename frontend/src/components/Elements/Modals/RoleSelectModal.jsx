import { useState } from "react"
import { X } from "lucide-react"

const RoleSelectModal = ({
  isOpen,
  onClose,
  member,
  availableRoles = [],
  canManageAdmins,
  onUpdateRole,
  loading,
  error,
}) => {
  const [selectedRole, setSelectedRole] = useState(member?.role || "user")

  if (!member) return null

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
          onClick={onClose}
        ></div>
      )}

      <div
        className={`fixed inset-y-0 right-0 max-w-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } z-[10000]`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Change Member Role</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3">
                {member.profile_picture ? (
                  <img
                    src={`http://localhost:8000/storage/${member.profile_picture}`}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium">
                    {member.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {availableRoles.length > 0 ? (
                  availableRoles.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                      disabled={role.id === "admin" && !canManageAdmins}
                    >
                      {role.name} - {role.description}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="user">User</option>
                    {canManageAdmins && <option value="admin">Admin</option>}
                  </>
                )}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => onUpdateRole(member.userId, selectedRole)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-base rounded-lg hover:bg-base/90 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Role"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default RoleSelectModal
