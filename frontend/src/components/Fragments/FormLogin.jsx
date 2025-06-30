import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../../context/userContext"
import { handleLogin } from "../Auth/auth.action"
import Button from "../Elements/Button"
import InputForm from "../Elements/Input"

const FormLogin = () => {
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const userContext = useUser()

  const onSubmit = async (e) => {
    e.preventDefault()

    try {
      if (!userContext || !userContext.loadUserData) {
        console.error("User context not properly initialized:", userContext)
        setError("System error: User context not properly initialized")
        return
      }

      await handleLogin(
        e,
        rememberMe,
        setError,
        navigate,
        userContext.loadUserData
      )
    } catch (err) {
      console.error("Login error:", err)
      setError(err.message || "An error occurred during login")
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <InputForm
        label="Email"
        type="email"
        placeholder="example@email.com"
        name="email"
        classname="w-full"
      />
      <InputForm
        label="Password"
        type="password"
        placeholder="Enter password"
        name="password"
        classname="w-full"
      />
      <div className="flex items-center mb-4">
        <label className="flex items-center cursor-pointer gap-3">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
              rememberMe ? "bg-base" : "bg-gray-200"
            }`}
            onClick={() => setRememberMe(!rememberMe)}
          >
            <div
              className="absolute top-0.5 bg-white border border-black rounded-full h-5 w-5 transition-transform duration-200 ease-in-out"
              style={{
                transform: rememberMe ? "translateX(20px)" : "translateX(2px)",
                left: 0,
              }}
            ></div>
          </div>
          <span className="text-sm text-black dark:text-graytext">
            Remember me
          </span>
        </label>
      </div>
      <Button className="bg-base w-full text-white" type="submit">
        Sign In
      </Button>
    </form>
  )
}

export default FormLogin
