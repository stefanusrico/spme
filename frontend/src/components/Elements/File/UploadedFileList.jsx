import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { Modal } from 'antd'
import { handleDownloadFile } from '../../../utils/fileHandlers'

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase()

  switch (ext) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ef4444', fontSize: 18 }} />
    case 'doc':
    case 'docx':
      return <FileWordOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined style={{ color: '#22c55e', fontSize: 18 }} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return <FileImageOutlined style={{ color: '#f97316', fontSize: 18 }} />
    default:
      return <FileOutlined style={{ color: '#6b7280', fontSize: 18 }} />
  }
}

const UploadedFileList = ({ files = [], onDelete = () => {}, onDownload = () => {}, userData }) => {
  if (!files.length) {
    return <p className="text-muted-foreground text-sm">Belum ada file yang diunggah.</p>
  }

  const handleDelete = (file) => {
    Modal.confirm({
      title: 'Hapus File',
      content: `Yakin ingin menghapus file "${file.name}"?`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => onDelete(file),
    })
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {files.map((file, index) => (
          <li
            key={index}
            className="flex justify-between items-center p-2 border rounded-md bg-muted hover:bg-muted/80 transition-all"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {getFileIcon(file.name)}
              <a
                href={file.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate max-w-xs"
              >
                {file.name}
              </a>
            </div>

            <div className="flex gap-3 text-lg">
              <span
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleDownloadFile(file)}
              >
                <DownloadOutlined />
              </span>
              {  
                userData?.role === "Admin" && (
                  <span
                    className="cursor-pointer hover:text-red-600 transition-colors"
                    onClick={() => handleDelete(file)}
                  >
                    <DeleteOutlined />
                  </span>
                )
              }
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default UploadedFileList
