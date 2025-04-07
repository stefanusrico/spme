import { useState, useEffect } from "react"
import { Upload, Tooltip, Button } from "antd";
import { UploadOutlined, SaveOutlined } from "@ant-design/icons";
import ClickableAndDeletableChips from "../Chip/clickableDeleteable";
import FilePreviewComponent from "../../Fragments/FilePreviewComponent";

const AddFileModal = ({
  isOpen,
  onClose,
  onAdd,
  availableRoles = [],
  selectedDetails,
  dataIsian,
  updateDataIsian
}) => {
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [openViewer, setOpenViewer] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedFiles, setSelectedFiles] = useState([]); //sudah tidak terpakai, nanti dihapus
  const [selectedFilesMap, setSelectedFilesMap] = useState({});
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleClosePreview = () => {
    setOpenViewer(!openViewer)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleFileChange = ({ fileList }) => {
    console.log("file yang mau disimpan : ", fileList)
    const key = selectedDetails[0].Seq; // Gunakan Seq sebagai kategori unik
    const existingFiles = new Set((selectedFilesMap[key] || []).map(file => file.name)); // File dari state
    const storedFiles = new Set((dataIsian.details.find(item => item.seq === key)?.data_pendukung || []).map(file => file.name)); // File dari dataIsian yang sudah tersimpan

    const uniqueFiles = fileList.filter(file => 
        !existingFiles.has(file.name) && !storedFiles.has(file.name) // Hindari duplikasi
    );

    setSelectedFilesMap(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), ...uniqueFiles] // Tambah file unik
    }));
  };

  useEffect(() => {
    if (!selectedDetails.length || !dataIsian?.details) return; // Error handling
    const key = selectedDetails[0].Seq;
    const currentFiles = selectedFilesMap[key] || [];
    const storedFiles = dataIsian.details.find(item => item.seq === key)?.data_pendukung || [];

    const mergedFiles = [...storedFiles, ...currentFiles].reduce((acc, file) => {
        if (!acc.some(f => f.name === file.name)) acc.push(file);
        return acc;
    }, []);

    // Cek apakah ada perubahan sebelum update
    if (JSON.stringify(mergedFiles) !== JSON.stringify(storedFiles)) {
        const updatedDataIsian = {
            ...dataIsian,
            details: dataIsian.details.map((item) =>
                item.seq === key ? { ...item, data_pendukung: mergedFiles } : item
            ),
        };

        console.log("sebelum ke parent :", updatedDataIsian);
        updateDataIsian(updatedDataIsian);
    }
  }, [selectedFilesMap, selectedDetails]);

  useEffect(() => {
      setSelectedFilesMap(prev => ({
          ...prev,
          [selectedDetails[0].Seq]: [] // Reset file untuk kategori baru
      }));
  }, [selectedDetails]);

  const handleClick = (index) => {
    console.log("helo", selectedDetails[0]?.['Data Pendukung'][index])
    setFiles([selectedDetails[0]?.['Data Pendukung'][index]]);
  };
  
  const handleDelete = async ({fileId}) => {
      try {
          const foundInSelectedFiles = selectedFiles.some(file => file.uid === fileId);
          
          if (foundInSelectedFiles) {
              setSelectedFiles(prevFiles => prevFiles.filter(file => file.uid !== fileId));
              setUploadedFiles(prevFiles => prevFiles.filter(file => file.uid !== fileId));
          } else{
              const response = await axiosIstance.delete('/delete-files', {
                  data: { 
                      fileId, 
                      subFolder: prodi, 
                      noSub 
                  }
              });
  
              fetchUploadedFiles();
          }
      } catch (error) {
          console.error('Gagal menghapus file:', error.response.data);
      }
  };


  if (!isOpen && !isAnimating) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay with animation */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-50" : "opacity-0"
        }`}
        onClick={handleClose}
      ></div>

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md pointer-events-auto transform transition-all duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full bg-white shadow-xl">
            {/* Header */}
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Data Pendukung
                </h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={handleClose}
                >
                  <span className="sr-only">Close panel</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="mt-4">
                <h4>
                    Kriteria Indikator : {selectedDetails[0].Reference}
                </h4>
              </div>
            </div>

            {/* Form content */}
            <div className="relative flex-1 px-6 py-6 overflow-auto">
                <div>
                    <Upload 
                        fileList={fileList}
                        beforeUpload={() => false} 
                        onChange={handleFileChange} 
                        showUploadList={false} 
                        accept=".xlsx, .xls, .png, .jpg, .pdf" 
                        multiple={true} 
                        // disabled={type === "readOnly" || isLoadingCheck}
                    >
                        <Tooltip title="Unggah file sebagai data pendukung">
                            <Button icon={<UploadOutlined />} style={{ marginBottom: "16px" }}>
                                {isUploaded ? "File Diupload!" : "Upload"}
                            </Button>
                        </Tooltip>
                    </Upload>
                    <ClickableAndDeletableChips 
                        // disabled={type === "readOnly" || isLoadingCheck}
                        no={dataIsian.task.no}
                        sub={dataIsian.task.sub}
                        kriteria={selectedDetails[0].Seq}
                        // uploadedFiles={selectedDetails?.Details?.[currentPage - 1]?.['Data Pendukung'] ?? []}
                        dataPendukung={selectedDetails[0]?.['Data Pendukung'] ?? []}
                        handleClick={handleClick}
                        handleDelete={handleDelete}
                    />

                    {/* Diterapkan dibawab ini untuk viewwer nya */}
                    {openViewer &&
                      <div className="mt-5 bg-gray">
                        <div>
                          {files.name}
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={handleClosePreview}
                          >
                            <span className="sr-only">Close panel</span>
                            <svg
                              className="h-6 w-6"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        {files.map((file, index) => (
                          <FilePreviewComponent key={index} file={file} />
                        ))}
                      </div>
                    } 
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-md">
                    {error}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddFileModal
