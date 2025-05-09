import { Input, Checkbox, DatePicker, Tooltip, InputNumber } from "antd"
import dayjs from "dayjs"
import { extractColumns } from "../../utils/tableUtils"

/**
 * Generate columns for data tables - Updated for MongoDB
 */
const generateColumns = (
  tableConfig,
  isSelectionTable = false,
  handleToggleSelection,
  debouncedHandleDataChange,
  editingKey,
  setEditingKey
) => {
  if (!tableConfig) {
    console.error("No tableConfig provided to generateColumns")
    return []
  }

  console.log("Generating columns for table config:", tableConfig)

  // Helper function to get table code from different formats
  const getTableCode = (config) => {
    if (typeof config === "string") return config
    if (config && config.code) return config.code
    if (config && config.kode) return config.kode
    return "unknown"
  }

  const tableCode = getTableCode(tableConfig)
  console.log("Table code extracted:", tableCode)

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
    // Adapt to MongoDB column structure
    const columnTitle = column.title || column.judul || ""
    const columnDataIndex = column.data_index || column.indeksData || ""
    const columnType = column.type || "text"
    const columnWidth = column.width || column.lebar || 150
    const columnAlign = column.align || "center"
    const isGroup = column.is_group || column.isGroup || false
    const childColumns = column.children || []

    // Skip if it's a No. column - we'll add our own
    if (
      columnTitle === "No." ||
      columnDataIndex === "no" ||
      columnDataIndex === "rowIndex"
    ) {
      return null
    }

    // Skip source field
    if (columnDataIndex === "source") {
      return null
    }

    // Map student section fields if needed
    let dataIndex = columnDataIndex
    let key = columnDataIndex

    // Check if this is part of a student section table by looking at the table code
    const isStudentSection =
      tableCode &&
      (tableCode.includes("seleksi_mahasiswa") ||
        tableCode.includes("mahasiswa"))

    if (isStudentSection) {
      dataIndex = mapStudentFieldName(columnTitle, columnDataIndex)
      key = dataIndex
    }

    const baseColumn = {
      title: columnTitle,
      dataIndex: dataIndex,
      key: key,
      width: columnWidth,
      align: columnAlign,
    }

    if (isGroup && childColumns && childColumns.length > 0) {
      // Process children for group columns
      const children = Array.isArray(childColumns)
        ? childColumns
        : typeof childColumns === "object"
        ? Object.values(childColumns)
        : []

      const filteredChildren = children
        .filter((child) => {
          const childDataIndex = child.data_index || child.indeksData || ""
          return childDataIndex !== "source"
        })
        .map((child) => processColumn(child))
        .filter(Boolean)

      if (filteredChildren.length === 0) return null

      return {
        ...baseColumn,
        children: filteredChildren,
      }
    }

    // Handle tingkat columns (which are now boolean type)
    if (dataIndex.startsWith("tingkat_") && columnType === "boolean") {
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
                  if (colName !== dataIndex && record[colName] !== undefined) {
                    debouncedHandleDataChange(
                      tableCode,
                      record.key,
                      colName,
                      false
                    )
                  }
                })

                debouncedHandleDataChange(
                  tableCode,
                  record.key,
                  dataIndex,
                  true
                )
              } else {
                debouncedHandleDataChange(
                  tableCode,
                  record.key,
                  dataIndex,
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
    } else if (columnType === "boolean") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Checkbox
            checked={Boolean(text)}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableCode,
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
    } else if (columnType === "date") {
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
                tableCode,
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
    } else if (columnType === "url") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const isValidLink = text && isValidUrl(text)

        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableCode,
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
    } else if (columnType === "number") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <InputNumber
            defaultValue={text !== null && text !== undefined ? text : 0}
            onChange={(value) => {
              // Use null instead of NaN for empty values
              const numValue = value !== null && !isNaN(value) ? value : 0
              debouncedHandleDataChange(
                tableCode,
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
    } else if (columnType === "percentage") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const percentage = text !== undefined && text !== null ? text : 0

        return isEditing ? (
          <InputNumber
            defaultValue={percentage}
            onChange={(value) => {
              const numValue = value !== null && !isNaN(value) ? value : 0
              debouncedHandleDataChange(
                tableCode,
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
                tableCode,
                record.key,
                baseColumn.dataIndex,
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
            placeholder={`Masukkan ${columnTitle}`}
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
          handleToggleSelection(record, e.target.checked, tableCode)
        }}
      />
    ),
  }

  // Extract and process columns based on MongoDB structure
  const getColumnsFromConfig = (tableConfig) => {
    try {
      // If columns are in the expected format, use extractColumns
      if (tableConfig.columns) {
        return extractColumns(tableConfig)
      }

      // Otherwise, try to get them directly from the tableConfig
      const columnsArray = []

      // Handle MongoDB LkpsColumn format
      if (tableConfig.kolom) {
        return Array.isArray(tableConfig.kolom)
          ? tableConfig.kolom
          : Object.values(tableConfig.kolom)
      }

      // If we have standard column properties, create a simple column
      if (tableConfig.indeksData || tableConfig.judul) {
        columnsArray.push({
          data_index: tableConfig.indeksData,
          title: tableConfig.judul,
          type: tableConfig.type || "text",
          width: tableConfig.lebar || 150,
          align: tableConfig.align || "center",
          is_group: tableConfig.isGroup || false,
        })
      }

      return columnsArray
    } catch (error) {
      console.error("Error extracting columns:", error)
      return []
    }
  }

  // Extract columns from config
  const columns = getColumnsFromConfig(tableConfig)
  console.log(`Generated ${columns.length} columns for table`)

  // Process and filter out source field
  const processedColumns = columns
    .filter((col) => {
      const dataIndex = col.data_index || col.indeksData
      return dataIndex !== "source"
    })
    .map(processColumn)
    .filter(Boolean)

  if (isSelectionTable) {
    return [rowNumberColumn, selectionColumn, ...processedColumns]
  }

  return [rowNumberColumn, ...processedColumns]
}

export default generateColumns
