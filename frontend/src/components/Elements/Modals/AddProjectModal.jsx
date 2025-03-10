import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

const AddProjectModal = ({
  showModal,
  onClose,
  formData,
  onInputChange,
  onSubmit,
}) => {
  const handleDateSelect = (field, date) => {
    onInputChange({
      target: {
        name: field,
        value: format(date, "yyyy-MM-dd"),
      },
    })
  }

  return (
    <>
      {/* Overlay - positioned first with high z-index */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
          onClick={onClose}
        ></div>
      )}

      {/* Modal - higher z-index to appear above the overlay */}
      <div
        className={`fixed inset-y-0 right-0 w-96 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          showModal ? "translate-x-0" : "translate-x-full"
        } z-[10000]`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Add New Project</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !formData.startDate && "text-gray-500"
                    }`}
                  >
                    {formData.startDate ? (
                      format(new Date(formData.startDate), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-2 h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[11000]"
                  align="start"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={
                      formData.startDate
                        ? new Date(formData.startDate)
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        handleDateSelect("startDate", date)
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !formData.endDate && "text-gray-500"
                    }`}
                  >
                    {formData.endDate ? (
                      format(new Date(formData.endDate), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-2 h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[11000]"
                  align="start"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={
                      formData.endDate ? new Date(formData.endDate) : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        handleDateSelect("endDate", date)
                      }
                    }}
                    disabled={(date) =>
                      date < new Date() ||
                      (formData.startDate &&
                        date < new Date(formData.startDate))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-base rounded-lg hover:bg-base/90"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default AddProjectModal
