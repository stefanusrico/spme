/* eslint-disable react/prop-types */
const Button = (props) => {
  const { children, className, onClick = () => {}, type } = props
  return (
    <button
      className={`h-10 px-3 font-semibold rounded-md ${className} text-white`}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
