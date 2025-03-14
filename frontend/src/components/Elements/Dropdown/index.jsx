import React from "react";

const Dropdown = ({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select an option",
  error = "",
  className = "",
  classNameLabel,
  sizeSelect = "w-80"
}) => {
  return (
    <div className={`${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2 ml-2">{label}</label>}
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className={`${sizeSelect} p-2 rounded-md text-sm bg-gray focus:outline-none focus:ring focus:ring-gray-400 p-3`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
};

export default Dropdown;
