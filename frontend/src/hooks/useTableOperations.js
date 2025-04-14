import { useCallback } from "react"
import { message } from "antd"
import { isSelectionAllowedForSection } from "../constants/sectionStructure"

export const useTableOperations = (
  sectionCode,
  prodiName,
  configRef,
  tableData,
  setTableData,
  selectionData,
  setSelectionData,
  showSelectionMode,
  setShowSelectionMode,
  calculateScoreData,
  plugin,
  editingKey,
  setEditingKey
) => {
  const handleToggleSelection = useCallback(
    (row, isSelected, tableCode) => {
      if (!isSelectionAllowedForSection(sectionCode)) {
        message.info("Data selection feature is not available for this section")
        return
      }

      if (isSelected) {
        setSelectionData((prev) => {
          const newSelectionData = {
            ...prev,
            [tableCode]: (prev[tableCode] || []).filter(
              (item) => item.key !== row.key
            ),
          }
          return newSelectionData
        })

        setTableData((prev) => {
          const newTableData = {
            ...prev,
            [tableCode]: [
              ...(prev[tableCode] || []),
              { ...row, selected: true },
            ],
          }
          return newTableData
        })

        message.success(`Data berhasil ditambahkan ke tabel utama`)
      } else {
        setTableData((prev) => {
          const newTableData = {
            ...prev,
            [tableCode]: (prev[tableCode] || []).filter(
              (item) => item.key !== row.key
            ),
          }
          return newTableData
        })

        setSelectionData((prev) => ({
          ...prev,
          [tableCode]: [
            ...(prev[tableCode] || []),
            { ...row, selected: false },
          ],
        }))

        message.info(`Data telah dipindahkan kembali ke daftar pilihan`)
      }

      if (isSelected && sectionCode.startsWith("1-")) {
        const hasAnyPPP = row.pendidikan || row.penelitian || row.pkm

        if (!hasAnyPPP) {
          setTableData((prev) => {
            const newTableData = { ...prev }
            const index = newTableData[tableCode].findIndex(
              (item) => item.key === row.key
            )

            if (index !== -1) {
              if (sectionCode === "1-1") {
                newTableData[tableCode][index].pendidikan = true
              } else if (sectionCode === "1-2") {
                newTableData[tableCode][index].penelitian = true
              } else if (sectionCode === "1-3") {
                newTableData[tableCode][index].pkm = true
              }
            }

            return newTableData
          })
        }
      }
    },
    [sectionCode, setSelectionData, setTableData]
  )

  const toggleSelectionMode = useCallback(
    (tableCode) => {
      if (isSelectionAllowedForSection(sectionCode)) {
        setShowSelectionMode((prev) => ({
          ...prev,
          [tableCode]: !prev[tableCode],
        }))
      } else {
        message.info("Data selection feature is not available for this section")
      }
    },
    [sectionCode, setShowSelectionMode]
  )

  const handleDataChange = useCallback(
    (tableCode, key, field, value) => {
      if (!plugin) return

      let processedValue = value

      if (plugin.processFieldValue) {
        processedValue = plugin.processFieldValue(field, value, sectionCode)
      } else {
        if (
          typeof value === "string" &&
          (field.includes("is_") ||
            field.includes("tingkat_") ||
            field.includes("pendidikan") ||
            field.includes("penelitian") ||
            field.includes("pkm") ||
            field.includes("status_"))
        ) {
          processedValue = !!value && value !== ""
        }
      }

      setTableData((prev) => {
        const newData = { ...prev }
        if (newData[tableCode]) {
          const index = newData[tableCode].findIndex((item) => item.key === key)
          if (index >= 0) {
            newData[tableCode] = [...newData[tableCode]]
            newData[tableCode][index] = {
              ...newData[tableCode][index],
              [field]: processedValue,
            }
          }
        }
        return newData
      })

      setSelectionData((prev) => {
        const newData = { ...prev }
        if (newData[tableCode]) {
          const index = newData[tableCode].findIndex((item) => item.key === key)
          if (index >= 0) {
            newData[tableCode] = [...newData[tableCode]]
            newData[tableCode][index] = {
              ...newData[tableCode][index],
              [field]: processedValue,
            }
          }
        }
        return newData
      })
    },
    [sectionCode, plugin, setTableData, setSelectionData]
  )

  const debouncedHandleDataChange = useCallback(
    (tableCode, key, field, value) => {
      setTimeout(() => {
        handleDataChange(tableCode, key, field, value)
      }, 300)
    },
    [handleDataChange]
  )

  const handleAddRow = useCallback(
    (tableCode) => {
      if (!configRef.current || !plugin) return

      const config = configRef.current
      const tableConfig = config.tables.find(
        (t) =>
          (typeof t === "string" && t === tableCode) ||
          (t && t.code === tableCode)
      )
      if (!tableConfig) return

      const timestamp = new Date().getTime()
      const randomNum = Math.floor(Math.random() * 1000)
      const newKey = `new-${timestamp}-${randomNum}`

      let newRow = {
        key: newKey,
        no: (tableData[tableCode]?.length || 0) + 1,
        selected: true,
      }

      if (plugin.initializeRow) {
        Object.assign(newRow, plugin.initializeRow(sectionCode))
      } else if (plugin.createNewRow) {
        const pluginRow = plugin.createNewRow(
          tableCode,
          tableConfig,
          prodiName,
          sectionCode
        )

        newRow = { ...newRow, ...pluginRow }
      } else {
        const allColumns = extractColumnsFromConfig(tableConfig)

        allColumns.forEach((column) => {
          if (column.type === "boolean") {
            newRow[column.data_index] = false
          } else if (column.type === "number") {
            newRow[column.data_index] = 0
          } else {
            newRow[column.data_index] = ""
          }
        })
      }

      if (sectionCode.startsWith("1-")) {
        if (sectionCode === "1-1") newRow.pendidikan = true
        if (sectionCode === "1-2") newRow.penelitian = true
        if (sectionCode === "1-3") newRow.pkm = true
      }

      setTableData((prev) => ({
        ...prev,
        [tableCode]: [...(prev[tableCode] || []), newRow],
      }))

      setEditingKey(newKey)
      message.success("Baris baru ditambahkan")
    },
    [
      configRef,
      prodiName,
      sectionCode,
      setTableData,
      tableData,
      plugin,
      setEditingKey,
    ]
  )

  const extractColumnsFromConfig = useCallback((tableConfig) => {
    const allColumns = []

    if (!tableConfig || !tableConfig.columns) return allColumns

    const processColumns = (columns) => {
      if (Array.isArray(columns)) {
        columns.forEach((column) => {
          if (column.is_group && column.children) {
            processColumns(column.children)
          } else if (!column.is_group) {
            allColumns.push(column)
          }
        })
      } else if (typeof columns === "object") {
        Object.values(columns).forEach((column) => {
          if (column.is_group && column.children) {
            processColumns(column.children)
          } else if (!column.is_group) {
            allColumns.push(column)
          }
        })
      }
    }

    processColumns(tableConfig.columns)
    return allColumns
  }, [])

  return {
    handleToggleSelection,
    toggleSelectionMode,
    handleDataChange,
    debouncedHandleDataChange,
    handleAddRow,
  }
}
