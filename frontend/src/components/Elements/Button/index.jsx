/* eslint-disable react/prop-types */
const Button = (props) => {
  const { children, className, onClick = () => {}, type, disabled } = props
  return (
    <button
<<<<<<< HEAD
    className={`h-10 px-3 font-semibold rounded-md ${className} text-white 
=======
      className={`h-10 px-3 font-semibold rounded-md ${className} text-white 
>>>>>>> dbv2
    ${disabled ? "pointer-events-none" : ""}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
