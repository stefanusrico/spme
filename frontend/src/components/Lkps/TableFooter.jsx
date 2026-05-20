import React from "react"
import { Button } from "antd"
import { SaveOutlined } from "@ant-design/icons"
import { ArrowRightIcon, ArrowLeftIcon } from "../common/Icon"
import { useParams } from "react-router-dom"

// Navigation footer component
const TableFooter = ({
  saving,
  onSave,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  navigate,
  prevTableCode,
  nextTableCode,
}) => {
  const { projectId } = useParams() // Get projectId from URL

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 16,
        padding: "16px 0",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <Button
        onClick={() => navigate(`/projects/${projectId}/lkps/${prevTableCode}`)}
        disabled={!hasPrev}
        icon={<ArrowLeftIcon />}
      >
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

      <Button
        type="primary"
        onClick={() => navigate(`/projects/${projectId}/lkps/${nextTableCode}`)}
        disabled={!hasNext}
      >
        Section Selanjutnya <ArrowRightIcon />
      </Button>
    </div>
  )
}

export default TableFooter
