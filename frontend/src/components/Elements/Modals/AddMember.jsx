import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "User",
  })

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await onAdd(formData)
      onClose()
      setFormData({ email: "", role: "User" })
    } catch (error) {
      console.error("Error adding member:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Add User</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div>
              <Label htmlFor="email">Email ID</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter user email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup
                defaultValue="user"
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                className="flex items-center gap-4 text-black"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="user" />
                  <Label htmlFor="user">User</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="read-only user" id="readonly" />
                  <Label htmlFor="readonly">Read-only user</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="submit"
                className="bg-base hover:bg-base text-white"
              >
                Add
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddMemberModal
