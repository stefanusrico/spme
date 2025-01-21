// TaskTable.jsx
import React, { useEffect, useRef, useCallback } from "react"
import $ from "jquery"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import "datatables.net-rowgroup-bs5"
import "datatables.net-rowgroup-bs5/css/rowGroup.bootstrap5.min.css"

const TaskTable = ({ data, columns, rowGroup }) => {
  const tableRef = useRef(null)
  const dataTableRef = useRef(null)
  const initialized = useRef(false)

  const destroyTable = useCallback(() => {
    try {
      if (dataTableRef.current) {
        dataTableRef.current.destroy()
        dataTableRef.current = null
      }
      if (tableRef.current) {
        $(tableRef.current).find("*").off()
        $(tableRef.current).empty()
      }
      initialized.current = false
    } catch (error) {
      console.error("Error destroying table:", error)
    }
  }, [])

  useEffect(() => {
    return () => {
      destroyTable()
    }
  }, [])

  useEffect(() => {
    const initTable = async () => {
      if (!tableRef.current || initialized.current) return

      try {
        destroyTable()
        await new Promise((resolve) => setTimeout(resolve, 0))

        dataTableRef.current = $(tableRef.current).DataTable({
          data,
          columns,
          rowGroup,
          paging: false,
          searching: true,
          responsive: true,
          dom: '<"top"f>rt<"clear">',
          ordering: false,
          info: false,
          destroy: true,
          language: {
            search: "Search tasks:",
          },
        })

        initialized.current = true
      } catch (error) {
        console.error("Error initializing table:", error)
      }
    }

    initTable()
  }, [data, columns, rowGroup])

  return (
    <div className="w-full">
      <table
        ref={tableRef}
        className="display table table-striped table-bordered w-full"
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>TASK NAME</th>
            <th>OWNER</th>
            <th>STATUS</th>
            <th>PROGRESS</th>
            <th>START DATE</th>
            <th>END DATE</th>
            <th>DURATION</th>
          </tr>
        </thead>
        <tbody />
      </table>
    </div>
  )
}

export default TaskTable
