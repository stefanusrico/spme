// components/JsonGeneratorModal.jsx
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import axiosInstance from "../../../utils/axiosConfig"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { message } from "antd"

const AddDataFromSpreadsheetModal = ({ isOpen, onClose, importType }) => {
  const [urlSpreadsheet, setUrlSpreadsheet] = useState("")
  const [selectedStrata, setSelectedStrata] = useState("")
  const [selectedLAM, setSelectedLAM] = useState("")
  const [title, setTitle] = useState("Generate Matriks")
  const [sheets, setSheets] = useState([""])
  const [lamOptions, setLamOptions] = useState([])
  const [strataOptions, setStrataOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let mounted = true
    setUrlSpreadsheet("")
    setSelectedStrata("")
    setSelectedLAM("")
    setTitle(`Generate Data Dari Sreadsheet`)
    setSheets([""])

    const fetchData = async () => {
      try {
        const responseLam = await axiosInstance.get("/lam")
        const responseStrata = await axiosInstance.get("/strata")

        if (mounted) {
          setLamOptions(responseLam.data || [])
          setStrataOptions(responseStrata.data?.data || [])
        }
      } catch (error) {
        console.error("Error fetching data", error)
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [isOpen])

  const saveToFile = async () => {
    try {
      setIsLoading(true)

      if (
        !urlSpreadsheet ||
        !selectedLAM ||
        !selectedStrata ||
        sheets.some((s) => s.trim() === "")
      ) {
        alert("Mohon lengkapi semua field sebelum melanjutkan.")
        setIsLoading(false)
        return
      }

      const lamName =
        lamOptions.find((l) => l.id === selectedLAM)?.name ?? "Unknown LAM"
      const strataName =
        strataOptions.find((s) => s.id === selectedStrata)?.name ??
        "Unknown Strata"

      const payload = {
        name: `${lamName} ${strataName}`,
        strataId: selectedStrata,
        lamId: selectedLAM,
        spreadsheetId: urlSpreadsheet,
        sheets: sheets,
      }

      let responsePost = null

      switch (importType) {
        case "bobot":
          responsePost = await axiosInstance.post("/save-bobot-butir", payload)
          break

        case "syaratPerluTerakreditasi":
          responsePost = await axiosInstance.post(
            "/save-syarat-perlu-terakreditasi",
            payload
          )
          break

        case "syaratPerluPeringkat":
          responsePost = await axiosInstance.post(
            "/save-syarat-perlu-peringkat",
            payload
          )
          break

        case "ledItem":
          responsePost = await axiosInstance.post("/save-json", payload)
          break
      }

      message.success("Data berhasil disimpan.")
      onClose()
    } catch (error) {
      console.error("Error saving file:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addInputField = () => {
    setSheets([...sheets, ""])
  }

  const handleInputChange = (index, value) => {
    const updatedSheets = [...sheets]
    updatedSheets[index] = value
    setSheets(updatedSheets)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-3xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="spreadsheet">Link Spreadsheet</Label>
            <Input
              id="spreadsheet"
              value={urlSpreadsheet}
              onChange={(e) => setUrlSpreadsheet(e.target.value)}
              className="mt-2 h-12 text-lg"
            />
          </div>

          <div>
            <Label>Strata</Label>
            <RadioGroup
              className="mt-3 flex gap-6"
              value={selectedStrata}
              onValueChange={setSelectedStrata}
            >
              {strataOptions.map((strata) => (
                <div key={strata.id} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={strata.id}
                    id={strata.id}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={strata.id}>{strata.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label>LAM/BAN-PT</Label>
            <RadioGroup
              className="mt-3 space-y-4"
              value={selectedLAM}
              onValueChange={setSelectedLAM}
            >
              {lamOptions.map((lam) => (
                <div key={lam.id} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={lam.id}
                    id={`lam-${lam.id}`}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`lam-${lam.id}`}>{lam.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            {sheets.map((sheet, index) => (
              <div key={index} className="mb-3">
                <label htmlFor={`sheet-${index}`} className="block">
                  Nama Sheet {index + 1}
                </label>
                <input
                  id={`sheet-${index}`}
                  value={sheet}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="mt-2 h-12 text-lg border rounded w-full p-2"
                  placeholder="Masukkan nama sheet"
                />
              </div>
            ))}
            <div className="flex justify-center">
              <button
                onClick={addInputField}
                className="bg-primary text-white mt-2 w-10 h-10 flex justify-center items-center rounded-full"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              className="bg-base h-12 px-6 text-lg"
              onClick={saveToFile}
              disabled={isLoading}
            >
              Generate Matriks
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddDataFromSpreadsheetModal
