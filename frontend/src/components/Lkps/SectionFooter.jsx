import React from "react"
import { Button } from "antd"
import { SaveOutlined } from "@ant-design/icons"
import { ArrowRightIcon, ArrowLeftIcon } from "../common/Icon"

// Navigation footer component
const SectionFooter = ({
  saving,
  onSave,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: 16,
      padding: "16px 0",
      borderTop: "1px solid #f0f0f0",
    }}
  >
    <Button onClick={onPrev} disabled={!hasPrev} icon={<ArrowLeftIcon />}>
      Section Sebelumnya
    </Button>

    <Button
      type="primary"
      icon={<SaveOutlined />}
      onClick={onSave}
      loading={saving}
    >
      {saving ? "Menyimpan..." : "Simpan Data"}
    </Button>

    <Button type="primary" onClick={onNext} disabled={!hasNext}>
      Section Selanjutnya <ArrowRightIcon />
    </Button>
  </div>
)

export default SectionFooter
