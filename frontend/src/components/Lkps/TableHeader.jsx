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
  // Fixed parent tables
  const parentTables = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

  // Track the currently expanded parent table
  const [expandedParent, setExpandedParent] = useState(null)

  // Get the parent code of the current table (extract the first digit)
  const getCurrentParentCode = (code) => {
    if (!code) return null

    // Extract the first digit
    const match = code.match(/^(\d)/)
    return match ? match[1] : null
  }

  const currentParentCode = getCurrentParentCode(tableCode)

  // Set the current parent as expanded on initial load and when changing tables
  useEffect(() => {
    if (currentParentCode) {
      setExpandedParent(currentParentCode)
    }
  }, [currentParentCode])

  // Create flattened list of all tables for the dropdown
  const getAllFlattenedTables = () => {
    const flattenedTables = []
    if (tableStructure && tableStructure.length > 0) {
      tableStructure.forEach((mainTable) => {
        // Check for both subTables and children properties
        const subTables = mainTable.subTables || mainTable.children || []

        if (subTables && subTables.length > 0) {
          subTables.forEach((subTable) => {
            flattenedTables.push({
              code: subTable.code,
              title: `${subTable.code} - ${subTable.title}`,
            })
          })
        }
      })
    }
    return flattenedTables
  }

  // Handle click on parent table
  const handleParentClick = (parentCode) => {
    setExpandedParent(expandedParent === parentCode ? null : parentCode)
  }

  // Get subtables for a parent - filter all subtables to match the first digit
  const getSubtablesForParent = (parentCode) => {
    const allSubtables = []

    // Collect all subtables from all main tables
    if (tableStructure && Array.isArray(tableStructure)) {
      tableStructure.forEach((table) => {
        // Support both subTables and children properties
        const subTables = table.subTables || table.children || []

        if (subTables && subTables.length) {
          allSubtables.push(...subTables)
        }
      })
    }

    // Filter to include subtables where the first digit is the parent code
    // This handles all formats: "1-1", "3a1", "2b", etc.
    return allSubtables.filter((sub) => {
      if (!sub || !sub.code) return false

      // Extract the first digit from the subtable code
      const match = sub.code.match(/^(\d)/)
      if (!match) return false

      // Check if the first digit matches the parent code
      return match[1] === parentCode
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
              <Breadcrumb.Item href={`/lkps/${currentTable.parentCode}`}>
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

      {/* Fixed parent table buttons (1-9) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {parentTables.map((parentCode) => (
          <Button
            key={parentCode}
            type={expandedParent === parentCode ? "primary" : "default"}
            onClick={() => handleParentClick(parentCode)}
          >
            {parentCode}
          </Button>
        ))}
      </div>

      {/* Show subtables only for the expanded parent */}
      {expandedParent && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "8px",
            borderRadius: "4px",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          {getSubtablesForParent(expandedParent).map((subTable) => (
            <Button
              key={subTable.code}
              type={tableCode === subTable.code ? "primary" : "default"}
              size="small"
              onClick={() => navigate(`/lkps/${subTable.code}`)}
            >
              {subTable.code}
              {savedTables.includes(subTable.code) && " ✓"}
            </Button>
          ))}
        </div>
      )}

      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Card>
  )
}

export default TableHeader
