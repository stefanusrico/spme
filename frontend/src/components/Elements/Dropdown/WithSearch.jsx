import { useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { blueGrey, red } from "@mui/material/colors";

const DropdownWithSearch = ({
  value,
  options,
  onChange,
  className = "",
  sizeSelect = "w-80 h-16",
  label = "Program Studi",
  placeholder = "Select an option",
  error = "",
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className={className}>
      {/* {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2 ml-2">
          {label}
        </label>
      )} */}
      <Autocomplete
        disablePortal
        value={options.find((option) => option.value === value) || null}
        onChange={(event, newValue) => {
          onChange(newValue);
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        options={options}
        getOptionLabel={(option) => option.label || ""}
        disabled={disabled}
        sx={{
          width: "260px", // Sesuaikan lebar
          "& .MuiInputBase-root": {
            fontSize: "0.875rem", // text-sm
            padding: "0.3rem", // Padding serupa Tailwind
            backgroundColor: "#E2E8F0", // bg-gray-200
            borderRadius: "0.375rem",
            color: "#000000"
          },
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#E2E8F0", // Border gray
            },
            "&:hover fieldset": {
              borderColor: "#E2E8F0", // Hover border gray
            },
            "&.Mui-focused fieldset": {
              borderColor: "#98BCF8", // Focused border gray
              border: "3px solid #98BCF8",
            },
          },
          "& .MuiPaper-root": {
            fontSize: "0.875rem",
            backgroundColor: "#E2E8F0",
            borderRadius: "0.375rem",
            border: "1px solid #98BCF8",
            boxShadow: "0px 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
          "& .MuiAutocomplete-option": {
            fontSize: "0.875rem",
            backgroundColor: "#d1d5db",// Sesuaikan padding opsi
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={!!error}
            helperText={error}
            sx={{
                "& .MuiInputBase-input": {
                  fontSize: "0.855rem", // text-sm
                  backgroundColor: "#E2E8F0", // bg-gray-200
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "0.375rem", // Tambahkan border radius
                  "& fieldset": {
                    borderColor: "#E2E8F0",
                  },
                  "&:hover fieldset": {
                    borderColor: "#E2E8F0",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#98BCF8",
                  },
                },
              }}
          />
        )}
      />
    </div>
  );
};

export default DropdownWithSearch;
