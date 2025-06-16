import { useCallback } from "react"
import generateColumns from "../components/Lkps/ColumnsGenerator"

export const useColumnsGenerator = (
  handleToggleSelection,
  debouncedHandleDataChange,
  editingKey,
  setEditingKey,
  handleDeleteRow // Add this parameter
) => {
  const columnsGenerator = useCallback(
    (tableConfig, isSelectionTable = false, tableCode) => {
      if (!tableConfig) {
        console.warn("No table config provided to columnsGenerator")
        return []
      }

      return generateColumns(
        tableConfig,
        isSelectionTable,
        handleToggleSelection,
        debouncedHandleDataChange,
        editingKey,
        setEditingKey,
        null, // plugin
        tableCode,
        handleDeleteRow // Pass handleDeleteRow
      )
    },
    [
      handleToggleSelection,
      debouncedHandleDataChange,
      editingKey,
      setEditingKey,
      handleDeleteRow,
    ]
  )

  return columnsGenerator
}
