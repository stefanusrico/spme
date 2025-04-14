// src/components/FileViewerComponent.jsx
import React from "react"
import { Worker, Viewer } from "@react-pdf-viewer/core"
import "@react-pdf-viewer/core/lib/styles/index.css"
import { read, utils } from "xlsx"

const FilePreviewComponent = ({ file }) => {
  if (!file) return null

  const getGoogleDriveDirectLink = (fileUrl) => {
    const match = fileUrl.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]+)/)
    return match
      ? `https://drive.google.com/file/d/${match[1]}/preview`
      : fileUrl
  }

  const fileType = file.name.split(".").pop().toLowerCase()

  // Tampilkan Gambar
  if (["png", "jpg", "jpeg"].includes(fileType)) {
    const isLocalFile = !!file.originFileObj
    const fileUrl = file.originFileObj
      ? URL.createObjectURL(file.originFileObj)
      : getGoogleDriveDirectLink(file.url)

    console.log("Nama File:", file.name)
    console.log("Tipe File:", fileType)
    console.log("File URL:", fileUrl)

    return (
      <div className="flex justify-center">
        {isLocalFile ? (
          <img
            src={fileUrl}
            alt={file.name}
            style={{ width: "600px", margin: "10px" }}
          />
        ) : (
          <iframe
            src={fileUrl}
            title={file.name}
            style={{ width: "600px", height: "600px", border: "none" }}
          ></iframe>
        )}
      </div>
    )
  }

  // Tampilkan PDF
  if (fileType === "pdf") {
    console.log("Nama File pdf:", file.name)
    return (
      <div className="flex justify-center">
        <iframe
          src={
            file.originFileObj
              ? URL.createObjectURL(file.originFileObj)
              : getGoogleDriveDirectLink(file.url)
          }
          type="application/pdf"
          width="100%"
          height="600px"
        ></iframe>
      </div>
    )
  }

  // Tampilkan Data Excel
  if (["xlsx", "xls"].includes(fileType)) {
    return (
      <div>
        <ExcelViewer file={file} />
      </div>
    )
  }

  return <p>Format file tidak didukung</p>
}

// Komponen untuk menampilkan isi file Excel
const ExcelViewer = ({ file }) => {
  const [excelData, setExcelData] = React.useState(null)

  React.useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = utils.sheet_to_json(sheet)
      setExcelData(jsonData)
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {excelData ? JSON.stringify(excelData, null, 2) : "Memuat data..."}
    </pre>
  )
}

export default FilePreviewComponent
