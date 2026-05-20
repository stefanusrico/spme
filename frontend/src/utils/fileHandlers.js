// src/utils/fileHandlers.js
import axiosInstance from "./axiosConfig"

/**
 * Menghapus file dari backend dan memperbarui state fileList
 * @param {Object} file - File yang ingin dihapus
 * @param {Function} setFileList - Setter state untuk file list
 */
export const handleDeleteFile = async (file, setFileList) => {
  try {
    console.log("file id", file.id)
    await axiosInstance.delete(`/files/${file.id}`, {
      params: {
        folder: "Supporting File", // Pastikan parameter folder juga terkirim
        localUrl: file.local_url, // Pastikan localUrl dikirim
      }
    });

    // Hapus file dari state frontend
    setFileList((prev) => prev.filter((f) => f.id !== file.id));
  } catch (error) {
    console.error("Gagal menghapus file:", error);
  }
}

/**
 * Download file (membuka URL file di tab baru)
 * @param {Object} file - File yang ingin di-download
 */
export const handleDownloadFile = async (file) => {
  try {
    const response = await axiosInstance({
        url: `/download-supporting-file/`,
        method: "POST",
        data: { filename: file.name }, // Hanya kirim nama file!
        responseType: "blob",
    })

    // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url

      // Format current date for filename
      const date = new Date()
      const formattedDate = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

      const extension = "docx"
      link.setAttribute(
        "download",
        `${file.name.toUpperCase()}`
      )
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download error:', err)
  }
}

/**
 * Mengambil daftar file dari storage backend berdasarkan folder
 * @param {string} folderName - Nama folder untuk diambil filenya
 * @param {Function} setFileList - Setter untuk memperbarui state daftar file
 */
export const fetchFilesFromStorage = async (setFileList) => {
  try {
    const response = await axiosInstance.get("/files", {
      params: {
        folder: 'Supporting File',
      },
    })

    const files = response.data?.files || []
    setFileList(files)
  } catch (error) {
    console.error("Gagal mengambil file dari storage:", error)
  }
}
