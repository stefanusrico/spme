import { useState } from "react"
import Button from "../Elements/Button"
import InputForm from "../Elements/Input"
import axios from "axios"

const handleLogin = async (e, rememberMe, setError) => {
  e.preventDefault()

  const email = e.target.email.value
  const password = e.target.password.value

  try {
    const response = await axios.post("http://localhost:8000/api/login", {
      email,
      password,
    })
    const { token } = response.data

    localStorage.setItem("token", token)
    localStorage.setItem("email", email)

    if (rememberMe) {
      localStorage.setItem("rememberMe", true)
    } else {
      localStorage.removeItem("rememberMe")
    }

    window.location.href = "/dashboard"
  } catch (error) {
    console.error("Login failed:", error)
    setError("Invalid email or password")
  }
}

const FormLogin = () => {
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")

  return (
    <form
      onSubmit={(e) => handleLogin(e, rememberMe, setError)} // Tambahkan setError
    >
      {error && <p className="text-red-500 mb-2">{error}</p>} {/* Tampilkan pesan error */}

      <InputForm
        label="Email"
        type="email"
        placeholder="example@email.com"
        name="email"
      />
      <InputForm
        label="Password"
        type="password"
        placeholder="Enter password"
        name="password"
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