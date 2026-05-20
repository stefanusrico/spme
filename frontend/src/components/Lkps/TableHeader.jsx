import React, { useState, useEffect } from "react"
import {
  Card,
  Breadcrumb,
  Typography,
  Divider,
  Button,
  Space,
  Select,
  Spin,
} from "antd"
import { HomeOutlined } from "@ant-design/icons"
import { useParams } from "react-router-dom"

const { Title, Text } = Typography
const { Option } = Select

const TableHeader = ({
  tableCode,
  currentTable,
  savedTables,
  tableStructure,
  onTableChange,
  navigate,
  loading = false,
}) => {
  const { projectId } = useParams() // Get projectId from URL
  const [expandedParent, setExpandedParent] = useState(null)

  // Get parent code dari table code
  const getCurrentParentCode = (code) => {
    if (!code) return null
    const match = code.match(/^(\d)/)
    return match ? match[1] : null
  }

  const currentParentCode = getCurrentParentCode(tableCode)

  useEffect(() => {
    if (currentParentCode) {
      setExpandedParent(currentParentCode)
    }
  }, [currentParentCode])

  // Get parent tables dari tableStructure secara dinamis
  const getParentTables = () => {
    if (!tableStructure || !Array.isArray(tableStructure)) {
      return []
    }

    // Extract unique parent codes dari struktur yang ada
    const parentCodes = new Set()

    tableStructure.forEach((table) => {
      if (table.code) {
        parentCodes.add(table.code)
      }

      // Juga ambil dari children/subTables
      const subTables = table.subTables || table.children || []
      subTables.forEach((sub) => {
        if (sub.code) {
          const parentMatch = sub.code.match(/^(\d)/)
          if (parentMatch) {
            parentCodes.add(parentMatch[1])
          }
        }
      })
    })

    return Array.from(parentCodes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )
  }

  const parentTables = getParentTables()

  // Create flattened list untuk dropdown
  const getAllFlattenedTables = () => {
    const flattenedTables = []

    if (tableStructure && tableStructure.length > 0) {
      tableStructure.forEach((mainTable) => {
        const subTables = mainTable.subTables || mainTable.children || []

        if (subTables && subTables.length > 0) {
          // Jika ada subtables, tampilkan subtables
          subTables.forEach((subTable) => {
            flattenedTables.push({
              code: subTable.code,
              title: `${subTable.code} - ${subTable.title}`,
            })
          })
        } else if (mainTable.code && mainTable.title) {
          // Jika tidak ada subtables, tampilkan main table itu sendiri
          flattenedTables.push({
            code: mainTable.code,
            title: `${mainTable.code} - ${mainTable.title}`,
          })
        }
      })
    }

    return flattenedTables
  }

  // Handle parent button click
  const handleParentClick = (parentCode) => {
    // Cek apakah parent ini punya subtables atau tidak
    const hasSubtables = getSubtablesForParent(parentCode).length > 0
    const parentTable = tableStructure.find(
      (table) => table.code === parentCode
    )

    if (!hasSubtables && parentTable) {
      // Jika tidak ada subtables, langsung navigate ke parent table
      navigate(`/projects/${projectId}/lkps/${parentCode}`)
    } else {
      // Jika ada subtables, toggle expand/collapse
      setExpandedParent(expandedParent === parentCode ? null : parentCode)
    }
  }

  // Get subtables untuk parent tertentu
  const getSubtablesForParent = (parentCode) => {
    const allSubtables = []

    if (tableStructure && Array.isArray(tableStructure)) {
      tableStructure.forEach((table) => {
        const subTables = table.subTables || table.children || []

        if (subTables && subTables.length > 0) {
          allSubtables.push(...subTables)
        }
      })
    }

    // Filter berdasarkan parent code
    return allSubtables.filter((sub) => {
      if (!sub || !sub.code) return false
      const match = sub.code.match(/^(\d)/)
      return match && match[1] === parentCode
    })
  }

  if (loading) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "20px" }}
        >
          <Spin tip="Loading table structure..." />
        </div>
      </Card>
    )
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Breadcrumb>
            <Breadcrumb.Item href="/dashboard">
              <HomeOutlined /> Dashboard
            </Breadcrumb.Item>
            <Breadcrumb.Item>LKPS</Breadcrumb.Item>
            {currentTable?.parentCode && (
              <Breadcrumb.Item
                href={`/projects/${projectId}/lkps/${currentTable.parentCode}`}
              >
                {currentTable.parentTitle}
              </Breadcrumb.Item>
            )}
            <Breadcrumb.Item>
              {currentTable?.title || tableCode}
            </Breadcrumb.Item>
          </Breadcrumb>

          <Title level={4} style={{ marginTop: 16 }}>
            {currentTable
              ? `${tableCode} - ${currentTable.title}`
              : `Table ${tableCode}`}
          </Title>
        </div>

        <Space direction="vertical" align="end">
          <Text type="secondary">Pilih Tabel:</Text>
          <Select
            style={{ width: 350 }}
            value={tableCode}
            onChange={onTableChange}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {getAllFlattenedTables().map((table) => (
              <Option key={table.code} value={table.code}>
                {table.title}
                {savedTables.includes(table.code) && " ✓"}
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      <Divider />

      {/* Dynamic parent table buttons - sepenuhnya berdasarkan tableStructure */}
      {parentTables.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {parentTables.map((parentCode) => {
            const hasSubtables = getSubtablesForParent(parentCode).length > 0
            const isCurrentParent = currentParentCode === parentCode
            const isExpanded = expandedParent === parentCode

            return (
              <Button
                key={parentCode}
                type={isCurrentParent ? "primary" : "default"}
                onClick={() => handleParentClick(parentCode)}
              >
                {parentCode}
              </Button>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "#999" }}>
          No parent tables found in structure
        </div>
      )}

      {/* Show subtables hanya jika ada subtables dan parent di-expand */}
      {expandedParent && getSubtablesForParent(expandedParent).length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "8px",
            borderRadius: "4px",
            backgroundColor: "#f5f5f5",
          }}
        >
          {getSubtablesForParent(expandedParent).map((subTable) => (
            <Button
              key={subTable.code}
              type={tableCode === subTable.code ? "primary" : "default"}
              size="small"
              onClick={() =>
                navigate(`/projects/${projectId}/lkps/${subTable.code}`)
              }
            >
              {subTable.code}
              {savedTables.includes(subTable.code) && " ✓"}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}

export default TableHeader
