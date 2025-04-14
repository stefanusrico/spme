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

const SectionHeader = ({
  sectionCode,
  currentSection,
  savedSections,
  sectionStructure,
  onSectionChange,
  navigate,
  loading = false,
}) => {
  // Fixed parent sections
  const parentSections = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

  // Track the currently expanded parent section
  const [expandedParent, setExpandedParent] = useState(null)

  // Get the parent code of the current section (extract the first digit)
  const getCurrentParentCode = (code) => {
    if (!code) return null

    // Extract the first digit
    const match = code.match(/^(\d)/)
    return match ? match[1] : null
  }

  const currentParentCode = getCurrentParentCode(sectionCode)

  // Set the current parent as expanded on initial load and when changing sections
  useEffect(() => {
    if (currentParentCode) {
      setExpandedParent(currentParentCode)
    }
  }, [currentParentCode])

  // Create flattened list of all sections for the dropdown
  const getAllFlattenedSections = () => {
    const flattenedSections = []
    if (sectionStructure && sectionStructure.length > 0) {
      sectionStructure.forEach((mainSection) => {
        if (mainSection.subSections && mainSection.subSections.length > 0) {
          mainSection.subSections.forEach((subSection) => {
            flattenedSections.push({
              code: subSection.code,
              title: `${subSection.code} - ${subSection.title}`,
            })
          })
        }
      })
    }
    return flattenedSections
  }

  // Handle click on parent section
  const handleParentClick = (parentCode) => {
    setExpandedParent(expandedParent === parentCode ? null : parentCode)
  }

  // Get subsections for a parent - filter all subsections to match the first digit
  const getSubsectionsForParent = (parentCode) => {
    const allSubsections = []

    // Collect all subsections from all main sections
    sectionStructure.forEach((section) => {
      if (section.subSections && section.subSections.length) {
        allSubsections.push(...section.subSections)
      }
    })

    // Filter to only include subsections where the first digit matches the parent code
    return allSubsections.filter((sub) => {
      const firstDigit = sub.code.match(/^(\d)/)
      return firstDigit && firstDigit[1] === parentCode
    })
  }

  if (loading) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "20px" }}
        >
          <Spin tip="Loading section structure..." />
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
            {currentSection?.parentCode && (
              <Breadcrumb.Item href={`/lkps/${currentSection.parentCode}`}>
                {currentSection.parentTitle}
              </Breadcrumb.Item>
            )}
            <Breadcrumb.Item>
              {currentSection?.title || sectionCode}
            </Breadcrumb.Item>
          </Breadcrumb>

          <Title level={4} style={{ marginTop: 16 }}>
            {currentSection
              ? `${sectionCode} - ${currentSection.title}`
              : `Section ${sectionCode}`}
          </Title>
        </div>

        <Space direction="vertical" align="end">
          <Text type="secondary">Pilih Section:</Text>
          <Select
            style={{ width: 350 }}
            value={sectionCode}
            onChange={onSectionChange}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {getAllFlattenedSections().map((section) => (
              <Option key={section.code} value={section.code}>
                {section.title}
                {savedSections.includes(section.code) && " ✓"}
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      <Divider />

      {/* Fixed parent section buttons (1-9) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {parentSections.map((parentCode) => (
          <Button
            key={parentCode}
            type={expandedParent === parentCode ? "primary" : "default"}
            onClick={() => handleParentClick(parentCode)}
          >
            {parentCode}
          </Button>
        ))}
      </div>

      {/* Show subsections only for the expanded parent */}
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
          {getSubsectionsForParent(expandedParent).map((subSection) => (
            <Button
              key={subSection.code}
              type={sectionCode === subSection.code ? "primary" : "default"}
              size="small"
              onClick={() => navigate(`/lkps/${subSection.code}`)}
            >
              {subSection.code}
              {savedSections.includes(subSection.code) && " ✓"}
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

export default SectionHeader
