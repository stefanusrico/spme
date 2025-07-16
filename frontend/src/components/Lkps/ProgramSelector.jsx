import React from "react"
import { Modal, Radio, Space, Alert, Typography, Divider, message } from "antd"

const { Text } = Typography

const ProgramSelector = ({
  visible,
  availablePrograms,
  onSelect,
  onCancel,
  tableCode,
}) => {
  const [selectedProgram, setSelectedProgram] = React.useState(null)

  React.useEffect(() => {
    if (visible) {
      setSelectedProgram(null)
      console.log("🎨 ProgramSelector opened with programs:", availablePrograms)
    }
  }, [visible, availablePrograms])

  const handleOk = () => {
    if (selectedProgram) {
      console.log("🎯 User selected program:", selectedProgram)
      onSelect(selectedProgram)
      setSelectedProgram(null)
    } else {
      message.warning("Please select a program first")
    }
  }

  const handleCancel = () => {
    console.log("❌ User cancelled program selection")
    setSelectedProgram(null)
    onCancel()
  }

  // **FIX**: Add validation for availablePrograms
  if (!availablePrograms || availablePrograms.length === 0) {
    console.warn("⚠️ ProgramSelector: No available programs")
    return null
  }

  console.log("🎨 ProgramSelector render:", {
    visible,
    availablePrograms: availablePrograms?.length,
    programs: availablePrograms,
  })

  return (
    <Modal
      title="Multiple Programs Detected"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: !selectedProgram }}
      width={600}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Alert
          message="Multiple Tables Found"
          description={`The uploaded Excel file for table ${tableCode} contains data for multiple programs. Please select which one to import.`}
          type="info"
          showIcon
        />

        <Divider />

        <div style={{ marginTop: 16 }}>
          <Text strong>Available Programs:</Text>
          <div style={{ marginTop: 12 }}>
            <Radio.Group
              onChange={(e) => setSelectedProgram(e.target.value)}
              value={selectedProgram}
              style={{ width: "100%" }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {availablePrograms.map((program, index) => (
                  <Radio
                    key={index}
                    value={program.program}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "6px",
                      margin: "4px 0",
                      width: "100%",
                    }}
                  >
                    <div>
                      <Text strong>{program.program}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {program.description}
                      </Text>
                    </div>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>
        </div>

        <Divider />

        <Alert
          message="Note"
          description="After selection, only data for the chosen program will be imported. You can upload the file again to import data for other programs."
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  )
}

export default ProgramSelector
