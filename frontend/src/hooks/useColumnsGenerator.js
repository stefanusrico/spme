import { useCallback } from "react"
import generateColumns from "../components/Lkps/ColumnsGenerator"

export const useColumnsGenerator = (
  handleToggleSelection,
  debouncedHandleDataChange,
  editingKey,
  setEditingKey
) => {
  const columnsGenerator = useCallback(
    (tableConfig, isSelectionTable = false) => {
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
        setEditingKey
      )
    },
    [
      handleToggleSelection,
      debouncedHandleDataChange,
      editingKey,
      setEditingKey,
    ]
  )

  return columnsGenerator
}
