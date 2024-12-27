import { useState } from "react"
import Button from "../Elements/Button"
import InputForm from "../Elements/Input"
import { handleLogin } from "../Auth/auth.action"
import { useNavigate } from "react-router-dom"

const FormLogin = () => {
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLoginSubmit = (e) => {
    handleLogin(e, rememberMe, setError, navigate)
  }

  return (
    <form onSubmit={handleLoginSubmit}>
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
        <label
          htmlFor="rememberMe"
          className="inline-flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            id="rememberMe"
            className="sr-only peer"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-white dark:peer-focus:ring-white dark:bg-gray peer-checked:after:translate-x-full peer-checked:after:bg-white after:content-[''] after:absolute after:top-0.5 after:left-1 after:bg-white after:border-black after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-black peer-checked:bg-primary"></div>
          <span className="ml-3 text-sm text-black dark:text-graytext">
            Remember me
          </span>
        </label>
      </div>
      <Button className="bg-primary w-full text-white" type="submit">
        Sign In
      </Button>
    </form>
  )
}

export default FormLogin
