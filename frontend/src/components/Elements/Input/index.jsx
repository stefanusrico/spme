/* eslint-disable react/prop-types */
import Label from "./Label"
import Input from "./Input"

const InputForm = (props) => {
  const {
    name,
    label,
    type,
    placeholder,
    classname,
    disabled,
    value,
    onChange,
  } = props

  return (
    <div className="mb-6">
      <Label htmlFor={name}>{label}</Label>
      <Input
        name={name}
        type={type}
        placeholder={placeholder}
        classname={classname}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

export default InputForm
