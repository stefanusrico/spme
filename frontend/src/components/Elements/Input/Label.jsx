/* eslint-disable react/prop-types */
const Label = ({ htmlFor, children }) => {
  return (
    <label htmlFor={htmlFor} className="block text-sm mb-2 ml-2">
      {children}
    </label>
  )
}

export default Label
