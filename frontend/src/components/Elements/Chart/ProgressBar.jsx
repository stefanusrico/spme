const ProgressBar = ({ progress }) => {
  return (
    <div className="w-56 bg-gray-200 rounded-full bg-gray relative">
      <div
        className="bg-blue text-sm font-bold text-blue-100 text-center p-1.5 leading-none rounded-full"
        style={{ width: `${progress}%` }}
      ></div>
      <div
        className="absolute w-full text-center mt-1 text-black font-normal text-sm"
        style={{ bottom: "-20px" }}
      >
        {progress}% Completed
      </div>
    </div>
  )
}

export default ProgressBar
