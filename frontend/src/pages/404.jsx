import { useRouteError } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

const NotFound = () => {
  const error = useRouteError()
  const navigate = useNavigate()

  const statusText = error?.statusText || "Page Not Found"
  const message =
    error?.message || "The page you are looking for does not exist."

  const goToHome = () => {
    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold mt-4">{statusText}</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <Button
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={goToHome}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}

export default NotFound
