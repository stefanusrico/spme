/* eslint-disable react/prop-types */
import { useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import $ from "jquery"
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css"
import "datatables.net-bs5"
import "datatables.net-rowgroup-bs5"
import "datatables.net-rowgroup-bs5/css/rowGroup.bootstrap5.min.css"

const TaskTable = ({ data, columns, rowGroup }) => {
  const tableRef = useRef(null)
  const dataTableRef = useRef(null)
  const initialized = useRef(false)
  const navigate = useNavigate()

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

        const enhancedColumns = [
          ...columns,
          {
            title: "ACTIONS",
            data: null,
            width: "10%",
            render: function (data, type, row) {
              return `<button class="view-task-btn px-3 py-1.5 text-sm font-medium text-white bg-blue rounded hover:bg-blue-700 rounded-lg" 
    data-no="${row.no}" 
    data-sub="${row.sub}">
    View Task
    </button>`
            },
          },
        ]

        dataTableRef.current = $(tableRef.current).DataTable({
          data,
          columns: enhancedColumns,
          rowGroup,
          paging: false,
          searching: true,
          responsive: true,
          scrollX: true,
          dom: '<"top"f>rt<"clear">',
          ordering: false,
          info: false,
          destroy: true,
          language: {
            search: "Search tasks:",
          },
        })

        $(tableRef.current).on("click", ".view-task-btn", function (e) {
          const rowData = dataTableRef.current.row($(this).closest("tr")).data()
          navigate(`/pengisian-matriks-led/${rowData.no}/${rowData.sub}`)
        })

        initialized.current = true
      } catch (error) {
        console.error("Error initializing table:", error)
      }
    }

    initTable()
  }, [data, columns, rowGroup, navigate])

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden">
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
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody />
      </table>
    </div>
  )
}

export default TaskTable
