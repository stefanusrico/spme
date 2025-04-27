import { Input, Checkbox, DatePicker, Tooltip, InputNumber } from "antd"
import dayjs from "dayjs"
import { extractColumns } from "../../utils/tableUtils"

/**
 * Generate columns for data tables - Enhanced Version
 * Properly handles row selection, input validation, and improved UX
 */
const generateColumns = (
  tableConfig,
  isSelectionTable = false,
  handleToggleSelection,
  debouncedHandleDataChange,
  editingKey,
  setEditingKey
) => {
  if (!tableConfig) return []

  console.log("Generating columns for table config:", tableConfig)

  // Add a custom row number column
  const rowNumberColumn = {
    title: "No.",
    dataIndex: "rowIndex",
    key: "rowIndex",
    width: 60,
    align: "center",
    render: (text, record, index) => index + 1,
  }

  // Function to map field names for student sections
  const mapStudentFieldName = (title, dataIndex) => {
    // If already using compound name format, keep it
    if (dataIndex.includes("_jumlah_")) {
      return dataIndex
    }

    // Map simple names to compound names
    const titleMap = {
      Pendaftar: "pendaftar_jumlah_calon_mahasiswa",
      "Lulus Seleksi": "lulus_seleksi_jumlah_calon_mahasiswa",
      Reguler: "reguler_jumlah_mahasiswa_aktif",
      Transfer: "transfer_jumlah_mahasiswa_aktif",
      "Daya Tampung": "daya_tampung",
    }

    // First try to match by title
    if (titleMap[title]) {
      return titleMap[title]
    }

    // Otherwise use the original dataIndex
    return dataIndex
  }

  // Function to validate URL format
  const isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  // Function to handle cell click for editing
  const handleCellClick = (record) => {
    if (record.key === editingKey) {
      setEditingKey(null)
    } else {
      setEditingKey(record.key)
    }
  }

  // Editable cell wrapper with tooltip and styling
  const EditableCell = ({
    children,
    editable,
    tooltip,
    onClick,
    style = {},
  }) => {
    const cell = (
      <div
        onClick={onClick}
        style={{
          cursor: editable ? "pointer" : "default",
          width: "100%",
          padding: "4px 8px",
          border: editable ? "1px dashed #d9d9d9" : "none",
          borderRadius: "2px",
          transition: "all 0.3s",
          ...style,
        }}
      >
        {children}
      </div>
    )

    return tooltip ? <Tooltip title={tooltip}>{cell}</Tooltip> : cell
  }

  const processColumn = (column) => {
    // Skip if it's a No. column - we'll add our own
    if (
      column.title === "No." ||
      column.data_index === "no" ||
      column.data_index === "rowIndex"
    ) {
      return null
    }

    // Skip source field
    if (column.data_index === "source") {
      return null
    }

    // Map student section fields if needed
    let dataIndex = column.data_index
    let key = column.data_index

    // Check if this is part of a student section table by looking at the table code
    const isStudentSection =
      tableConfig.code &&
      (tableConfig.code.includes("seleksi_mahasiswa") ||
        tableConfig.code.includes("mahasiswa"))

    if (isStudentSection) {
      dataIndex = mapStudentFieldName(column.title, column.data_index)
      key = dataIndex
    }

    const baseColumn = {
      title: column.title,
      dataIndex: dataIndex,
      key: key,
      width: column.width,
      align: column.align || "center",
    }

    if (column.is_group && column.children) {
      const children = Array.isArray(column.children)
        ? column.children
        : typeof column.children === "object"
        ? Object.values(column.children)
        : []

      // Filter out source from children too
      const filteredChildren = children
        .filter((child) => child.data_index !== "source")
        .map((child) => processColumn(child))
        .filter(Boolean)

      if (filteredChildren.length === 0) return null

      return {
        ...baseColumn,
        children: filteredChildren,
      }
    }

    // Handle tingkat columns (which are now boolean type)
    if (column.data_index.startsWith("tingkat_") && column.type === "boolean") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const isChecked = text === true

        return isEditing ? (
          <Checkbox
            checked={isChecked}
            onChange={(e) => {
              if (e.target.checked) {
                // When checking, set other tingkat fields to false
                const tingkatColumns = [
                  "tingkat_internasional",
                  "tingkat_nasional",
                  "tingkat_lokal_wilayah",
                ]

                tingkatColumns.forEach((colName) => {
                  if (
                    colName !== column.data_index &&
                    record[colName] !== undefined
                  ) {
                    debouncedHandleDataChange(
                      tableConfig.code,
                      record.key,
                      colName,
                      false
                    )
                  }
                })

                debouncedHandleDataChange(
                  tableConfig.code,
                  record.key,
                  column.data_index,
                  true
                )
              } else {
                debouncedHandleDataChange(
                  tableConfig.code,
                  record.key,
                  column.data_index,
                  false
                )
              }
            }}
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit"
            onClick={() => handleCellClick(record)}
          >
            {isChecked ? "✅" : "❌"}
          </EditableCell>
        )
      }
    } else if (column.type === "boolean") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Checkbox
            checked={Boolean(text)}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                e.target.checked
              )
            }
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit"
            onClick={() => handleCellClick(record)}
          >
            {text === true ? "✅" : text === false ? "❌" : "-"}
          </EditableCell>
        )
      }
    } else if (column.type === "date") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const formattedDate = text ? dayjs(text).format("D/M/YYYY") : "-"

        return isEditing ? (
          <DatePicker
            defaultValue={text ? dayjs(text) : null}
            format="D/M/YYYY"
            onChange={(date) => {
              // Store as ISO string for consistency
              const dateValue = date ? date.toISOString() : null
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                dateValue
              )
            }}
            style={{ width: "100%" }}
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit tanggal"
            onClick={() => handleCellClick(record)}
          >
            {formattedDate}
          </EditableCell>
        )
      }
    } else if (column.type === "url") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const isValidLink = text && isValidUrl(text)

        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
            status={text && !isValidUrl(text) ? "error" : ""}
            placeholder="https://example.com"
          />
        ) : isValidLink ? (
          <a href={text} target="_blank" rel="noopener noreferrer">
            Buka Link
          </a>
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk menambahkan URL"
            onClick={() => handleCellClick(record)}
            style={{ color: "#1890ff" }}
          >
            {text || "Masukkan Link"}
          </EditableCell>
        )
      }
    } else if (column.type === "number") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <InputNumber
            defaultValue={text !== null && text !== undefined ? text : 0}
            onChange={(value) => {
              // Use null instead of NaN for empty values
              const numValue = value !== null && !isNaN(value) ? value : 0
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                numValue
              )
            }}
            onBlur={() => setEditingKey(null)}
            style={{ width: "100%" }}
            min={column.min !== undefined ? column.min : undefined}
            max={column.max !== undefined ? column.max : undefined}
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit"
            onClick={() => handleCellClick(record)}
          >
            {text !== undefined && text !== null ? text : "-"}
          </EditableCell>
        )
      }
    } else if (column.type === "percentage") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const percentage = text !== undefined && text !== null ? text : 0

        return isEditing ? (
          <InputNumber
            defaultValue={percentage}
            onChange={(value) => {
              const numValue = value !== null && !isNaN(value) ? value : 0
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                numValue
              )
            }}
            onBlur={() => setEditingKey(null)}
            style={{ width: "100%" }}
            min={0}
            max={100}
            formatter={(value) => `${value}%`}
            parser={(value) => value.replace("%", "")}
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit persentase"
            onClick={() => handleCellClick(record)}
          >
            {`${percentage}%`}
          </EditableCell>
        )
      }
    } else {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
            placeholder={`Masukkan ${column.title}`}
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip="Klik untuk mengedit"
            onClick={() => handleCellClick(record)}
          >
            {text !== undefined && text !== null && text !== "" ? text : "-"}
          </EditableCell>
        )
      }
    }

    return baseColumn
  }

  // Create selection column with fixed parameters for handleToggleSelection
  const selectionColumn = {
    title: "Pilih",
    key: "selection",
    width: 80,
    align: "center",
    render: (_, record) => (
      <Checkbox
        checked={record.selected}
        onChange={(e) => {
          // Call handleToggleSelection with row, isChecked, and tableCode
          handleToggleSelection(record, e.target.checked, tableConfig.code)
        }}
      />
    ),
  }

  // Extract and filter columns
  const columns = extractColumns(tableConfig)
  console.log(`Generated ${columns.length} columns for table`)

  // Process and filter out source field
  const processedColumns = columns
    .filter((col) => col.data_index !== "source")
    .map(processColumn)
    .filter(Boolean)

  if (isSelectionTable) {
    return [rowNumberColumn, selectionColumn, ...processedColumns]
  }

  return [rowNumberColumn, ...processedColumns]
}

export default generateColumns
