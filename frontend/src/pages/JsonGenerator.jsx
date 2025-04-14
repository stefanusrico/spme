import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import axiosInstance from "../utils/axiosConfig"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"

const JsonGenerator = () => {
  const [urlSpreadsheet, setUrlSpreadsheet] = useState("")
  const [selectedStrata, setSelectedStrata] = useState("")
  const [selectedLAM, setSelectedLAM] = useState("")
  const [title, setTitle] = useState("")
  const [sheets, setSheets] = useState([""])
  const [lamOptions, setLamOptions] = useState([])
  const [strataOptions, setStrataOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    console.log("spreadsheet : ", urlSpreadsheet)
    console.log("lam : ", selectedLAM)
    console.log("strata : ", selectedStrata)
    console.log("sheets : ", sheets)
  }, [selectedLAM, selectedStrata, urlSpreadsheet, sheets])

  const fetchData = async () => {
    try {
      // const responseSpreadsheet_info = await axiosInstance.get("/spreadsheet-info/67cbcdaec9b2a57b2e019192");
      const responseLam = await axiosInstance.get("/lam")
      const responseStrata = await axiosInstance.get("/strata")

      // const spreadsheet_info = responseSpreadsheet_info.data
      // if (spreadsheet_info) {
      //   setTitle(spreadsheet_info.name || "");
      //   setUrlSpreadsheet(spreadsheet_info.spreadsheetId || "");
      //   setSelectedLAM(spreadsheet_info.lamId || "");
      //   setSelectedStrata(spreadsheet_info.strataId || "");
      //   setSheets(spreadsheet_info.sheets && spreadsheet_info.sheets.length > 0 ? spreadsheet_info.sheets : [""]);
      // }

      setLamOptions(responseLam.data || [])
      setStrataOptions(responseStrata.data?.data || [])
      console.log(responseStrata.data.data)
    } catch (error) {
      console.error("Error fetching data from database", error)
    }
  }

  const saveToFile = async () => {
    try {
      const lamName =
        lamOptions.find((lam) => lam.id === selectedLAM)?.name || "Unknown LAM"
      const strataName =
        strataOptions.find((strata) => strata.id === selectedStrata)?.name ||
        "Unknown Strata"

      const responsePost = await axiosInstance.post("/spreadsheet-info", {
        name: `${lamName} ${strataName}`, // Gabungkan nama LAM dan Strata
        strataId: selectedStrata,
        lamId: selectedLAM,
        spreadsheetId: urlSpreadsheet,
        sheets: sheets,
      })

      alert("Data berhasil disimpan: " + JSON.stringify(responsePost.data))
    } catch (error) {
      console.error("Error saving file:", error)
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

  return (
    <div className="pr-4 mx-auto mt-32">
      <h1 className="text-3xl font-bold mb-4 sm:mb-6">{title}</h1>
      <div className="bg-white rounded-xl shadow-xl p-8 w-full mt-8">
        <div className="space-y-8">
          <div>
            <Label htmlFor="spreadsheet" className="text-lg mb-3">
              Link Spreadsheet
            </Label>
            <Input
              id="spreadsheet"
              value={urlSpreadsheet}
              onChange={(e) => setUrlSpreadsheet(e.target.value)}
              className="mt-2 h-12 text-lg"
            />
          </div>

          <div>
            <Label className="text-lg mb-3">Strata</Label>
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
                  <Label htmlFor={strata.id} className="text-lg">
                    {strata.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-lg mb-3">LAM/BAN-PT</Label>
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
                  <Label htmlFor={`lam-${lam.id}`} className="text-lg">
                    {lam.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            {sheets.map((sheet, index) => (
              <div key={index} className="mb-3">
                <label
                  htmlFor={`sheet-${index}`}
                  className="text-lg mb-1 block"
                >
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

          <div className="flex justify-end pt-8">
            <Button
              className="bg-base h-12 px-6 text-lg"
              onClick={() => saveToFile()}
              disable={isLoading}
            >
              Generate Matriks
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonGenerator
