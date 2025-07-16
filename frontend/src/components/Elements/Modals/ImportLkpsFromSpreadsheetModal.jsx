import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import axiosInstance from "../../../utils/axiosConfig"
import { useEffect, useState } from "react"
import { message } from "antd"
import { Loader2 } from "lucide-react"

const ImportLkpsFromSpreadsheetModal = ({ isOpen, onClose, onSuccess }) => {
  const [spreadsheetId, setSpreadsheetId] = useState("")
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedLAM, setSelectedLAM] = useState("")
  const [lamOptions, setLamOptions] = useState([])
  const [programOptions, setProgramOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Program options yang bisa dipilih
  const availablePrograms = [
    { id: "S1", name: "Sarjana (S1)" },
    { id: "S2", name: "Magister (S2)" },
    { id: "S3", name: "Doktor (S3)" },
    { id: "D-III", name: "Diploma III (D-III)" },
    { id: "D-IV", name: "Diploma IV (D-IV)" },
    { id: "Profesi", name: "Profesi" },
    { id: "Sp-1", name: "Spesialis 1 (Sp-1)" },
    { id: "Sp-2", name: "Spesialis 2 (Sp-2)" },
  ]

  useEffect(() => {
    if (!isOpen) return

    let mounted = true

    // Reset form
    setSpreadsheetId("")
    setSelectedProgram("")
    setSelectedLAM("")

    const fetchLamData = async () => {
      try {
        const responseLam = await axiosInstance.get("/lam")

        if (mounted) {
          setLamOptions(responseLam.data || [])
          setProgramOptions(availablePrograms)
        }
      } catch (error) {
        console.error("Error fetching LAM data", error)
        message.error("Gagal memuat data LAM")
      }
    }

    fetchLamData()

    return () => {
      mounted = false
    }
  }, [isOpen])

  const handleImport = async () => {
    try {
      setIsLoading(true)

      // Validasi input
      if (!spreadsheetId.trim()) {
        message.error("Spreadsheet ID tidak boleh kosong")
        return
      }

      if (!selectedProgram) {
        message.error("Mohon pilih program studi")
        return
      }

      if (!selectedLAM) {
        message.error("Mohon pilih LAM")
        return
      }

      // Extract spreadsheet ID from URL if needed
      let cleanSpreadsheetId = spreadsheetId.trim()

      // Jika user paste full URL, extract ID-nya
      const urlMatch = cleanSpreadsheetId.match(
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
      )
      if (urlMatch) {
        cleanSpreadsheetId = urlMatch[1]
      }

      // Get LAM name
      const selectedLamData = lamOptions.find((lam) => lam.id === selectedLAM)
      const lamName = selectedLamData?.name || selectedLAM

      const payload = {
        spreadsheet_id: cleanSpreadsheetId,
        program: selectedProgram,
        lam: lamName,
      }

      console.log("Importing LKPS with payload:", payload)

      // Add await to properly wait for response
      const response = await axiosInstance.post("lkps/sync", payload)

      message.success("Data LKPS berhasil diimport dari spreadsheet")

      if (onSuccess) {
        onSuccess(response.data)
      }

      // Only close after successful completion
      onClose()
    } catch (error) {
      console.error("Error importing LKPS:", error)

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Terjadi kesalahan saat mengimport data LKPS"

      message.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpreadsheetIdChange = (e) => {
    setSpreadsheetId(e.target.value)
  }

  // Prevent closing modal when loading
  const handleModalClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  // Handle escape key and overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl relative">
        {/* Close button - disabled when loading */}
        <button
          onClick={handleModalClose}
          className={`absolute top-4 right-4 text-xl transition-colors ${
            isLoading
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:text-gray-800 cursor-pointer"
          }`}
          disabled={isLoading}
          title={
            isLoading
              ? "Please wait for import to complete"
              : "Close"
          }
        >
          ✖
        </button>

        <h1 className="text-2xl font-bold mb-6">
          Import LKPS dari Spreadsheet
        </h1>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium text-gray-700">
                Mengimport data LKPS...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Mohon tunggu, proses ini mungkin memakan waktu beberapa menit
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Spreadsheet ID */}
          <div>
            <Label htmlFor="spreadsheet-id">Spreadsheet ID atau URL</Label>
            <Input
              id="spreadsheet-id"
              value={spreadsheetId}
              onChange={handleSpreadsheetIdChange}
              placeholder="Masukkan ID spreadsheet atau paste URL lengkap"
              className="mt-2 h-12 text-lg"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Contoh: 1eTiQOVI5Ac1cHEzkBL1kkUA9uSP2aoM7ntukkLRxND8
            </p>
          </div>

          {/* Program Selection */}
          <div>
            <Label>Program Studi</Label>
            <RadioGroup
              className="mt-3 grid grid-cols-2 gap-4"
              value={selectedProgram}
              onValueChange={setSelectedProgram}
              disabled={isLoading}
            >
              {programOptions.map((program) => (
                <div key={program.id} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={program.id}
                    id={`program-${program.id}`}
                    className="h-5 w-5"
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={`program-${program.id}`}
                    className={`text-sm ${
                      isLoading ? "text-gray-400" : ""
                    }`}
                  >
                    {program.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* LAM Selection */}
          <div>
            <Label>LAM (Lembaga Akreditasi Mandiri)</Label>
            <RadioGroup
              className="mt-3 space-y-3"
              value={selectedLAM}
              onValueChange={setSelectedLAM}
              disabled={isLoading}
            >
              {lamOptions.map((lam) => (
                <div key={lam.id} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={lam.id}
                    id={`lam-${lam.id}`}
                    className="h-5 w-5"
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={`lam-${lam.id}`}
                    className={isLoading ? "text-gray-400" : ""}
                  >
                    {lam.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isLoading}
              className={`h-12 px-6 ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              {isLoading ? "Processing..." : "Batal"}
            </Button>

            <Button
              onClick={handleImport}
              disabled={
                isLoading ||
                !spreadsheetId.trim() ||
                !selectedProgram ||
                !selectedLAM
              }
              className={`h-12 px-6 text-lg relative ${
                isLoading
                  ? "bg-primary/70 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isLoading && (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              )}
              {isLoading ? "Mengimport..." : "Import Data LKPS"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportLkpsFromSpreadsheetModal
