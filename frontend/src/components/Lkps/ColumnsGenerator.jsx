import { Input, Checkbox, DatePicker } from "antd"
import dayjs from "dayjs"
import { extractColumns } from "../../utils/tableUtils"

/**
 * Generate columns for data tables - Simplified Version
 * Properly handles row selection without source field filtering
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

    // Special handling for tingkat columns (which are now boolean type)
    if (column.data_index.startsWith("tingkat_") && column.type === "boolean") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        // Check directly if the value is true, don't check for non-empty content
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
                      false // Set to false (boolean), not empty string
                    )
                  }
                })

                // Set this field to true (boolean), not "Ya" string
                debouncedHandleDataChange(
                  tableConfig.code,
                  record.key,
                  column.data_index,
                  true
                )
              } else {
                // When unchecking, set to false (boolean), not empty string
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
          <div
            onClick={() => setEditingKey(record.key)}
            style={{
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
            }}
          >
            {isChecked ? "✅" : "❌"}
          </div>
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
          <div
            onClick={() => setEditingKey(record.key)}
            style={{
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
            }}
          >
            {text === true ? "✅" : text === false ? "❌" : "-"}
          </div>
        )
      }
    } else if (column.type === "date") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <DatePicker
            defaultValue={text ? dayjs(text) : null}
            format="D/M/YYYY"
            onChange={(date, dateString) =>
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                dateString
              )
            }
            style={{ width: "100%" }}
          />
        ) : (
          <div
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            {text || "Pilih tanggal"}
          </div>
        )
      }
    } else if (column.type === "url") {
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
          />
        ) : text ? (
          <a href={text} target="_blank" rel="noopener noreferrer">
            Buka Link
          </a>
        ) : (
          <div
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            {text || "Masukkan Link"}
          </div>
        )
      }
    } else if (column.type === "number") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            type="number"
            defaultValue={text}
            onChange={(e) => {
              // Convert to number before saving
              const numValue = parseFloat(e.target.value) || 0
              debouncedHandleDataChange(
                tableConfig.code,
                record.key,
                baseColumn.dataIndex,
                numValue
              )
            }}
            onBlur={() => setEditingKey(null)}
          />
        ) : (
          <div
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            {text !== undefined && text !== null ? text : "-"}
          </div>
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
          />
        ) : (
          <div
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            {text !== undefined && text !== null && text !== "" ? text : "-"}
          </div>
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
