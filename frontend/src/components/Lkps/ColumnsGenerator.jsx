import {
  Input,
  Checkbox,
  DatePicker,
  Tooltip,
  InputNumber,
  Button,
  Popconfirm,
} from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { extractColumns } from "../../utils/tableUtils"

/**
 * Generate columns for data tables - Updated for MongoDB
 */
export const generateColumns = (
  tableConfig,
  isSelectionTable = false,
  handleToggleSelection,
  debouncedHandleDataChange,
  editingKey,
  setEditingKey,
  plugin,
  tableCodeParam,
  handleDeleteRow // Add this parameter
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
    return tableCodeParam // Use the parameter as fallback
  }

  // Explicitly get table code using the helper
  const tableCode = getTableCode(tableConfig)

  // Get calculated fields if plugin exists, otherwise use empty array
  const calculatedFields = plugin?.getReadOnlyFields?.() || []

  // Add a custom row number column
  const rowNumberColumn = {
    title: "No.",
    dataIndex: "rowIndex",
    key: "rowIndex",
    width: 60,
    align: "center",
    fillable: false, // No. column is never fillable
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
  const handleCellClick = (record, isFillable = true) => {
    // Only allow editing if column is fillable
    if (!isFillable) return

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
    isFillable = true,
  }) => {
    const isClickable = editable && isFillable

    const cell = (
      <div
        onClick={isClickable ? onClick : undefined}
        style={{
          cursor: isClickable ? "pointer" : "default",
          width: "100%",
          padding: "4px 8px",
          border: isClickable ? "1px dashed #d9d9d9" : "none",
          borderRadius: "2px",
          transition: "all 0.3s",
          backgroundColor: !isFillable ? "#f5f5f5" : "transparent",
          color: !isFillable ? "#666" : undefined,
          ...style,
        }}
      >
        {children}
      </div>
    )

    // Modify tooltip based on fillable status
    const finalTooltip = !isFillable ? "Kolom ini tidak dapat diedit" : tooltip

    return finalTooltip ? <Tooltip title={finalTooltip}>{cell}</Tooltip> : cell
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

    // Get fillable status - default to true if not specified
    const isFillable = column.fillable !== false

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
      fillable: isFillable, // Pass fillable status to column
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

        return isEditing && isFillable ? (
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
            tooltip={isFillable ? "Klik untuk mengedit" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
          >
            {isChecked ? "✅" : "❌"}
          </EditableCell>
        )
      }
    }
    // Handle kesesuaian columns specifically (these should be boolean)
    else if (
      dataIndex.includes("kesesuaian") ||
      dataIndex === "kesesuaian_dengan_kompetensi_inti_ps_3" ||
      dataIndex ===
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7" ||
      columnType === "boolean"
    ) {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const isChecked = text === true || text === "true" || text === "V"

        return isEditing && isFillable ? (
          <Checkbox
            checked={isChecked}
            onChange={(e) =>
              debouncedHandleDataChange(
                tableCode,
                record.key,
                dataIndex,
                e.target.checked
              )
            }
          />
        ) : (
          <EditableCell
            editable={true}
            tooltip={isFillable ? "Klik untuk mengedit" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
          >
            {isChecked ? "✅" : "❌"}
          </EditableCell>
        )
      }
    } else if (
      columnType === "date" ||
      dataIndex.includes("tanggal") ||
      dataIndex.includes("hh_bb_tttt")
    ) {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey

        let formattedDate = "-"
        if (text) {
          // Deteksi apakah sudah dalam format DD/MM/YYYY
          if (
            typeof text === "string" &&
            /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)
          ) {
            // Pastikan format sudah benar (DD/MM/YYYY)
            const parts = text.split("/")
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10)

            if (day <= 31 && month <= 12) {
              // Sudah dalam format yang benar, gunakan langsung
              formattedDate = text
            } else {
              // Format salah (mungkin MM/DD/YYYY), konversi ke DD/MM/YYYY
              formattedDate = `${parts[1].padStart(2, "0")}/${parts[0].padStart(
                2,
                "0"
              )}/${parts[2]}`
            }
          } else {
            // Format lain (ISO, angka, dll) - gunakan dayjs
            const date = dayjs(text)
            formattedDate = date.isValid() ? date.format("DD/MM/YYYY") : text
          }
        }

        return isEditing && isFillable ? (
          <DatePicker
            defaultValue={text ? dayjs(text) : null}
            format="DD/MM/YYYY"
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
            tooltip={isFillable ? "Klik untuk mengedit tanggal" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
          >
            {formattedDate}
          </EditableCell>
        )
      }
    } else if (columnType === "url") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const isValidLink = text && isValidUrl(text)

        return isEditing && isFillable ? (
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
            tooltip={isFillable ? "Klik untuk menambahkan URL" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
            style={{ color: isFillable ? "#1890ff" : "#666" }}
          >
            {text || (isFillable ? "Masukkan Link" : "-")}
          </EditableCell>
        )
      }
    } else if (columnType === "number") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing && isFillable ? (
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
            tooltip={isFillable ? "Klik untuk mengedit" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
          >
            {text !== undefined && text !== null ? text : "-"}
          </EditableCell>
        )
      }
    } else if (columnType === "percentage") {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        const percentage = text !== undefined && text !== null ? text : 0

        return isEditing && isFillable ? (
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
            tooltip={isFillable ? "Klik untuk mengedit persentase" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
          >
            {`${percentage}%`}
          </EditableCell>
        )
      }
    } else {
      baseColumn.render = (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing && isFillable ? (
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
            tooltip={isFillable ? "Klik untuk mengedit" : undefined}
            onClick={() => handleCellClick(record, isFillable)}
            isFillable={isFillable}
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
          fillable: tableConfig.fillable !== false, // Add fillable field
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
    .map((col) => {
      const isCalculated = calculatedFields.includes(
        col.dataIndex || col.data_index || col.indeksData
      )
      const column = processColumn(col)

      // Skip if processColumn returned null
      if (!column) return null

      return {
        ...column,
        editable: !isCalculated,
        className: isCalculated ? "calculated-field" : "",
        render: (text, record) => {
          if (isCalculated) {
            // Special rendering for calculated fields
            return <span className="calculated-value">{text}</span>
          }

          // Use the original render function if it exists
          if (column.render) {
            return column.render(text, record)
          }

          // Default rendering for editable fields
          return text
        },
      }
    })
    .filter(Boolean) // This will remove any null entries

  // Add delete action column
  const actionColumn = {
    title: "Aksi",
    key: "actions",
    width: 80,
    align: "center",
    fillable: false,
    render: (_, record) => (
      <Popconfirm
        title="Hapus Baris"
        description="Apakah Anda yakin ingin menghapus baris ini?"
        onConfirm={() =>
          handleDeleteRow && handleDeleteRow(tableCodeParam, record.key)
        }
        okText="Ya"
        cancelText="Tidak"
        okType="danger"
        placement="topRight"
      >
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          title="Hapus baris"
          disabled={!handleDeleteRow}
        />
      </Popconfirm>
    ),
  }

  // Return columns with action column at the end (only if handleDeleteRow is provided)
  const finalColumns = [rowNumberColumn, ...processedColumns]

  if (handleDeleteRow) {
    finalColumns.push(actionColumn)
  }

  if (isSelectionTable) {
    return [
      rowNumberColumn,
      selectionColumn,
      ...processedColumns,
      ...(handleDeleteRow ? [actionColumn] : []),
    ]
  }

  return finalColumns
}

export default generateColumns
