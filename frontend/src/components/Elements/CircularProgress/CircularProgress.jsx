/* eslint-disable react/prop-types */
const CircularProgress = ({
  currentStatus,
  totalStatus,
  size,
  strokeColor,
}) => {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const percentage = (currentStatus / totalStatus) * 100
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div
      className="relative"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <svg
        className="size-full -rotate-90"
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          className="stroke-current text-gray dark:text-gray"
          strokeWidth="2"
        ></circle>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          className={strokeColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        ></circle>
      </svg>
      <div className="absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-center text-xs font-light text-primary dark:text-primary">
          Status
        </span>
        <span className="text-center text-sm font-medium text-primary dark:text-primary">
          {currentStatus} of {totalStatus}
        </span>
      </div>
    </div>
  )
}

export default CircularProgress
