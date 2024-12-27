/* eslint-disable react/prop-types */
import Label from "./Label"
import Input from "./Input"

const InputForm = (props) => {
  const { name, label, type, placeholder, classname, disabled } = props

  return (
    <div className="mb-6">
      <Label htmlFor={name}>{label}</Label>
      <Input
        name={name}
        type={type}
        placeholder={placeholder}
        classname={classname}
        disabled={disabled}
      />
    </div>
  )
}

export default InputForm
