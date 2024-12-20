import CircularProgress from "./CircularProgress"

// eslint-disable-next-line react/prop-types
const CardProgress = ({ currentStatus, totalStatus, status, statusText }) => {
  const getStrokeColor = () => {
    switch (status) {
      case "submitted":
        return "stroke-blue"
      case "inprogress":
        return "stroke-yellow"
      case "notsubmitted":
        return "stroke-red"
      default:
        return "stroke-gray"
    }
  }
  const getTextColor = () => {
    switch (status) {
      case "submitted":
        return "text-blue"
      case "inprogress":
        return "text-yellow"
      case "notsubmitted":
        return "text-red"
      default:
        return "text-gray"
    }
  }
  return (
    <div className="bg-white shadow-md rounded-lg p-2 flex items-center gap-3 w-64 h-20">
      <CircularProgress
        currentStatus={currentStatus}
        totalStatus={totalStatus}
        size={80}
        strokeColor={getStrokeColor()}
      />
      <p
        className={`text-lg font-semibold ${getTextColor()} text-gray-700 dark:text-gray-300`}
      >
        {statusText}
      </p>
    </div>
  )
}

export default CardProgress
