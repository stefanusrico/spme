import React, { useState } from "react"
import { Modal, Button, Input, Typography, Space, message } from "antd"
import { InfoCircleOutlined, CalendarOutlined } from "@ant-design/icons"
import { useUser } from "../../context/userContext"
import axiosInstance from "../../utils/axiosConfig"

const { Text, Paragraph } = Typography

const CreateLkpsModal = ({ visible, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [tahunAkademik, setTahunAkademik] = useState(
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
  )
  const { userData } = useUser()

  const handleCreate = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.post("/lkps/create", {
        prodiId: userData?.prodiId,
        tahunAkademik,
      })

      setLoading(false)
      message.success("LKPS berhasil dibuat")
      onSuccess(response.data.lkps)
    } catch (error) {
      setLoading(false)
      message.error(error.response?.data?.message || "Gagal membuat LKPS")
    }
  }

  return (
    <Modal
      title="Buat LKPS Baru"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Batal
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={loading}
          onClick={handleCreate}
        >
          Buat LKPS
        </Button>,
      ]}
    >
      <Paragraph>
        <InfoCircleOutlined style={{ marginRight: 8 }} />
        LKPS untuk prodi ini belum dibuat. Buat LKPS baru untuk periode
        akreditasi saat ini?
      </Paragraph>
      <div style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Tahun Akademik:</Text>
          <Input
            prefix={<CalendarOutlined />}
            value={tahunAkademik}
            onChange={(e) => setTahunAkademik(e.target.value)}
            placeholder="2023/2024"
          />
        </Space>
      </div>
    </Modal>
  )
}

export default CreateLkpsModal
