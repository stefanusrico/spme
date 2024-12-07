/* eslint-disable react/prop-types */
import { useState } from "react"

const EyeOpenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const Input = (props) => {
  const { type, placeholder, name } = props
  const [showPassword, setShowPassword] = useState(false)

  const isPasswordType = type === "password"
  const inputType = isPasswordType && showPassword ? "text" : type

  return (
    <div className="relative w-full">
      <input
        type={inputType}
        className="text-sm w-full p-2 bg-gray rounded-md focus:outline-none focus:ring focus:ring-gray-400"
        placeholder={placeholder}
        name={name}
        id={name}
      />
      {isPasswordType && (
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      )}
    </div>
  )
}

export default Input
